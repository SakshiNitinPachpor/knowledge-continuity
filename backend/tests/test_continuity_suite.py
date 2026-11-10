import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.database import Base, get_db
from app.main import app

# StaticPool maintains the exact same in-memory SQLite database across all connections
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

@pytest.fixture(scope="session")
def setup_data():
    """Session fixture to create an admin user, workspace, and base project."""
    reg_payload = {
        "email": "lead.tester@continuity.internal",
        "full_name": "Lead Test Engineer",
        "title": "Principal QA",
        "password": "SecurePassword123!"
    }
    reg_res = client.post("/api/v1/auth/register", json=reg_payload)
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create workspace
    ws_res = client.post("/api/v1/workspaces", json={
        "name": "Quality Assurance Workspace",
        "description": "Automated verification workspace"
    }, headers=headers)
    ws_id = ws_res.json()["id"]

    # Create project
    proj_res = client.post("/api/v1/projects", json={
        "workspace_id": ws_id,
        "name": "Project Alpha Core Modernization",
        "code": "ALPHA-01",
        "description": "Critical banking payment bridge transition"
    }, headers=headers)
    project_id = proj_res.json()["id"]

    return {
        "headers": headers,
        "workspace_id": ws_id,
        "project_id": project_id
    }

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["product"] == "Knowledge Continuity"
    assert "SAKSHAM" not in data["team"]
    assert data["status"] == "operational"

def test_user_registration_and_login(setup_data):
    # Verify login with existing session user
    login_res = client.post("/api/v1/auth/login", data={
        "username": "lead.tester@continuity.internal",
        "password": "SecurePassword123!"
    })
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()

def test_workspace_and_project_creation(setup_data):
    headers = setup_data["headers"]
    proj_res = client.get("/api/v1/projects", headers=headers)
    assert proj_res.status_code == 200
    projects = proj_res.json()
    assert any(p["code"] == "ALPHA-01" for p in projects)

def test_document_upload_and_evidence_extraction(setup_data):
    headers = setup_data["headers"]
    project_id = setup_data["project_id"]

    sample_content = b"""# Project Architecture Log
Lead Architect: Sarah Jenkins.
Decided to implement OAuth2 mTLS gateway.
Target Go-Live Date: 2026-10-15.
Completed core tokenization microservice.
TODO: Multi-region disaster recovery drill is outstanding.
Risk: Database replica lag exceeds 400ms under peak load.
"""
    files = {"file": ("architecture_log.md", sample_content, "text/markdown")}
    upload_res = client.post(f"/api/v1/projects/{project_id}/documents/upload", files=files, headers=headers)
    assert upload_res.status_code == 200
    doc_data = upload_res.json()
    assert doc_data["status"] == "processed"
    assert doc_data["claims_count"] > 0

    # Fetch Claims
    claims_res = client.get(f"/api/v1/projects/{project_id}/claims", headers=headers)
    assert claims_res.status_code == 200
    claims = claims_res.json()
    assert len(claims) >= 3

    # Check evidence traceability
    for c in claims:
        assert c["document_name"] == "architecture_log.md"
        assert c["passage_id"] is not None
        assert c["passage_text"] is not None

def test_evidence_conflict_detection(setup_data):
    headers = setup_data["headers"]
    project_id = setup_data["project_id"]

    # Upload contradictory document with different target date
    contradictory_content = b"""# Steering Committee Minutes
Target Go-Live Date: 2026-11-20.
"""
    files = {"file": ("steering_minutes.txt", contradictory_content, "text/plain")}
    upload_res = client.post(f"/api/v1/projects/{project_id}/documents/upload", files=files, headers=headers)
    assert upload_res.status_code == 200

    # Check conflicts
    conflicts_res = client.get(f"/api/v1/projects/{project_id}/conflicts", headers=headers)
    assert conflicts_res.status_code == 200
    conflicts = conflicts_res.json()
    assert len(conflicts) > 0
    assert "Conflicting Target Date" in conflicts[0]["topic"]

def test_claim_review_and_conflict_resolution(setup_data):
    headers = setup_data["headers"]
    project_id = setup_data["project_id"]

    # Resolve conflict
    conflicts_res = client.get(f"/api/v1/projects/{project_id}/conflicts", headers=headers)
    conflict_id = conflicts_res.json()[0]["id"]

    resolve_res = client.post(
        f"/api/v1/projects/{project_id}/conflicts/{conflict_id}/resolve",
        json={"resolution_choice": "claim_a", "resolution_notes": "Oct 15 confirmed by engineering lead."},
        headers=headers
    )
    assert resolve_res.status_code == 200
    assert resolve_res.json()["status"] == "resolved"

def test_invitation_lifecycle(setup_data):
    admin_headers = setup_data["headers"]
    ws_id = setup_data["workspace_id"]
    project_id = setup_data["project_id"]

    # 1. Create invitation
    invite_res = client.post("/api/v1/invitations", json={
        "email": "invitee.engineer@continuity.internal",
        "role": "reviewer",
        "workspace_id": ws_id,
        "project_id": project_id
    }, headers=admin_headers)
    assert invite_res.status_code == 200
    invite_data = invite_res.json()
    token = invite_data["token"]
    assert "invite?token=" in invite_data["invite_url"]

    # 2. Verify token publicly
    verify_res = client.get(f"/api/v1/invitations/verify/{token}")
    assert verify_res.status_code == 200
    assert verify_res.json()["valid"] == True
    assert verify_res.json()["email"] == "invitee.engineer@continuity.internal"

    # 3. Register invitee
    user_res = client.post("/api/v1/auth/register", json={
        "email": "invitee.engineer@continuity.internal",
        "full_name": "Invited Engineer",
        "title": "Senior Reviewer",
        "password": "InviteePassword123!"
    })
    assert user_res.status_code == 200
    invitee_token = user_res.json()["access_token"]
    invitee_headers = {"Authorization": f"Bearer {invitee_token}"}

    # 4. Accept invitation
    accept_res = client.post("/api/v1/invitations/accept", json={"token": token}, headers=invitee_headers)
    assert accept_res.status_code == 200
    assert accept_res.json()["status"] == "success"

    # 5. Check invitee can now list the project
    proj_res = client.get("/api/v1/projects", headers=invitee_headers)
    assert proj_res.status_code == 200
    assert any(p["id"] == project_id for p in proj_res.json())

def test_successor_role_restrictions(setup_data):
    admin_headers = setup_data["headers"]
    project_id = setup_data["project_id"]

    # Register a successor user
    succ_res = client.post("/api/v1/auth/register", json={
        "email": "successor.user@continuity.internal",
        "full_name": "Incoming Successor",
        "title": "Successor Engineer",
        "password": "SuccessorPassword123!"
    })
    succ_token = succ_res.json()["access_token"]
    succ_headers = {"Authorization": f"Bearer {succ_token}"}

    # Admin adds successor to project with role 'successor'
    client.post(f"/api/v1/projects/{project_id}/members", json={
        "email": "successor.user@continuity.internal",
        "role": "successor"
    }, headers=admin_headers)

    # Successor tries to get unapproved handover
    handover_res = client.get(f"/api/v1/projects/{project_id}/handover", headers=succ_headers)
    # Must be 403 Forbidden because handover is in draft/unapproved!
    assert handover_res.status_code == 403
    assert "currently in review" in handover_res.json()["detail"]

    # Successor tries to edit a claim (should be 403 Forbidden)
    claims_res = client.get(f"/api/v1/projects/{project_id}/claims", headers=admin_headers)
    claim_id = claims_res.json()[0]["id"]

    edit_res = client.put(f"/api/v1/projects/{project_id}/claims/{claim_id}", json={
        "title": "Hacked Title"
    }, headers=succ_headers)
    assert edit_res.status_code == 403

def test_handover_workflow_both_sides(setup_data):
    admin_headers = setup_data["headers"]
    project_id = setup_data["project_id"]

    # 1. Outgoing member submits handover for review
    submit_res = client.post(f"/api/v1/projects/{project_id}/handover/submit", headers=admin_headers)
    assert submit_res.status_code == 200
    assert submit_res.json()["status"] == "submitted"

    # 2. Reviewer requests changes
    req_res = client.post(
        f"/api/v1/projects/{project_id}/handover/request-changes",
        json={"notes": "Please complete documentation checklist item."},
        headers=admin_headers
    )
    assert req_res.status_code == 200
    assert req_res.json()["status"] == "changes_requested"

    # 3. Mark all mandatory checklist items as complete
    handover_res = client.get(f"/api/v1/projects/{project_id}/handover", headers=admin_headers)
    items = handover_res.json()["checklist_items"]
    for item in items:
        client.put(f"/api/v1/projects/{project_id}/handover/checklist/{item['id']}", json={
            "status": "complete",
            "details": "Verified and signed off by lead engineer."
        }, headers=admin_headers)

    # 4. Verify candidate claims
    claims_res = client.get(f"/api/v1/projects/{project_id}/claims", headers=admin_headers)
    for c in claims_res.json():
        client.post(f"/api/v1/projects/{project_id}/claims/{c['id']}/review", json={
            "status": "verified",
            "reviewer_notes": "Passed verification."
        }, headers=admin_headers)

    # 5. Project Creator approves handover
    approve_res = client.post(f"/api/v1/projects/{project_id}/handover/approve", headers=admin_headers)
    assert approve_res.status_code == 200
    assert approve_res.json()["status"] == "approved"

    # 5b. Project Creator publishes handover to successor
    pub_res = client.post(f"/api/v1/projects/{project_id}/handover/publish", headers=admin_headers)
    assert pub_res.status_code == 200
    assert pub_res.json()["status"] == "published"

    # 6. Export PDF
    pdf_res = client.get(f"/api/v1/projects/{project_id}/handover/export-pdf", headers=admin_headers)
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert len(pdf_res.content) > 1000

    # 7. Successor logs in and accesses published handover
    succ_res = client.post("/api/v1/auth/login", data={
        "username": "successor.user@continuity.internal",
        "password": "SuccessorPassword123!"
    })
    succ_token = succ_res.json()["access_token"]
    succ_headers = {"Authorization": f"Bearer {succ_token}"}

    succ_handover = client.get(f"/api/v1/projects/{project_id}/handover", headers=succ_headers)
    assert succ_handover.status_code == 200
    assert succ_handover.json()["status"] == "published"

    # 8. Successor receives and acknowledges handover
    receive_res = client.post(f"/api/v1/projects/{project_id}/handover/receive", headers=succ_headers)
    assert receive_res.status_code == 200
    assert receive_res.json()["status"] == "received"
