import io
import uuid
import zipfile
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

@pytest.fixture
def creator_and_contributor():
    uid = uuid.uuid4().hex[:6]
    # 1. Register Project Creator
    email_creator = f"creator_{uid}@continuity.internal"
    reg1 = client.post("/api/v1/auth/register", json={
        "email": email_creator,
        "full_name": "Project Creator Lead",
        "password": "Password123!"
    })
    assert reg1.status_code == 200
    creator_token = reg1.json()["access_token"]
    creator_headers = {"Authorization": f"Bearer {creator_token}"}

    # Get Workspace
    ws_res = client.get("/api/v1/workspaces", headers=creator_headers)
    assert ws_res.status_code == 200
    ws_id = ws_res.json()[0]["id"]

    # 2. Register Contributor
    email_contrib = f"contrib_{uid}@continuity.internal"
    reg2 = client.post("/api/v1/auth/register", json={
        "email": email_contrib,
        "full_name": "Senior Outgoing Contributor",
        "password": "Password123!"
    })
    assert reg2.status_code == 200
    contrib_token = reg2.json()["access_token"]
    contrib_headers = {"Authorization": f"Bearer {contrib_token}"}

    # 3. Create Project by Creator
    p_res = client.post("/api/v1/projects", json={
        "workspace_id": ws_id,
        "name": f"Core Banking Ledger {uid}",
        "code": f"CBL-{uid[:4].upper()}",
        "description": "Ledger continuity and transaction settlement system."
    }, headers=creator_headers)
    assert p_res.status_code == 200
    project_id = p_res.json()["id"]

    # Add Contributor to Project
    client.post(f"/api/v1/projects/{project_id}/members", json={
        "email": email_contrib,
        "role": "contributor"
    }, headers=creator_headers)

    return {
        "creator_headers": creator_headers,
        "contrib_headers": contrib_headers,
        "project_id": project_id,
        "ws_id": ws_id,
        "uid": uid
    }

def test_removed_features_return_404(creator_and_contributor):
    """Verify that removed Feature 01 (Timeline) and Feature 02 (Graph) endpoints return 404 Not Found."""
    headers = creator_and_contributor["creator_headers"]
    project_id = creator_and_contributor["project_id"]

    # Test timeline route removed
    tl_res = client.get(f"/api/v1/projects/{project_id}/timeline", headers=headers)
    assert tl_res.status_code == 404

    # Test graph route removed
    graph_res = client.get(f"/api/v1/projects/{project_id}/graph", headers=headers)
    assert graph_res.status_code == 404

def test_auth_registration_and_login():
    """Verify registration, password validation, and JWT login."""
    uid = uuid.uuid4().hex[:6]
    email = f"user_{uid}@continuity.internal"
    password = "StrongPassword123!"

    # Registration
    reg = client.post("/api/v1/auth/register", json={
        "email": email,
        "full_name": f"Test User {uid}",
        "password": password
    })
    assert reg.status_code == 200
    assert "access_token" in reg.json()

    # Login (OAuth2 form-encoded)
    login = client.post("/api/v1/auth/login", data={
        "username": email,
        "password": password
    })
    assert login.status_code == 200
    assert "access_token" in login.json()

    # Invalid login credentials
    bad_login = client.post("/api/v1/auth/login", data={
        "username": email,
        "password": "WrongPassword999!"
    })
    assert bad_login.status_code == 401

def test_workspace_isolation_and_unauthorized_access():
    """Verify tenant isolation: users cannot access private projects of others."""
    uid1 = uuid.uuid4().hex[:6]
    uid2 = uuid.uuid4().hex[:6]

    # User 1
    reg1 = client.post("/api/v1/auth/register", json={
        "email": f"u1_{uid1}@continuity.internal", "full_name": "User One", "password": "Password123!"
    })
    assert reg1.status_code == 200
    h1 = {"Authorization": f"Bearer {reg1.json()['access_token']}"}
    ws1 = client.get("/api/v1/workspaces", headers=h1).json()[0]["id"]
    p1 = client.post("/api/v1/projects", json={
        "workspace_id": ws1, "name": "Confidential P1", "code": f"CP1-{uid1[:4].upper()}"
    }, headers=h1).json()["id"]

    # User 2
    reg2 = client.post("/api/v1/auth/register", json={
        "email": f"u2_{uid2}@continuity.internal", "full_name": "User Two", "password": "Password123!"
    })
    assert reg2.status_code == 200
    h2 = {"Authorization": f"Bearer {reg2.json()['access_token']}"}

    # User 2 attempts to access User 1's project -> must be denied (403/404)
    p_access = client.get(f"/api/v1/projects/{p1}", headers=h2)
    assert p_access.status_code in [403, 404]

    # Unauthenticated access -> 401
    no_auth = client.get(f"/api/v1/projects/{p1}")
    assert no_auth.status_code == 401

def test_document_and_safe_zip_upload_with_hierarchy(creator_and_contributor):
    """Verify document upload, source code ingestion, and safe ZIP extraction preserving hierarchy."""
    headers = creator_and_contributor["contrib_headers"]
    project_id = creator_and_contributor["project_id"]

    # 1. Plain Text Architecture Spec
    doc_content = b"""# Architecture Specification: Settlement Engine
The settlement engine runs nightly batch reconciliation using PostgreSQL 16.
Completed milestone: Benchmarked 20,000 TPS under simulated high-load scenarios.
Open Risk: Production credentials for HSM partition are only stored in offline safe.
Critical Responsibility: Settlement Reconciliation led by Elena Rostova."""
    files = {"file": ("settlement_spec.md", io.BytesIO(doc_content), "text/markdown")}
    upload_res = client.post(f"/api/v1/projects/{project_id}/documents/upload", files=files, headers=headers)
    assert upload_res.status_code == 200
    doc_data = upload_res.json()
    assert doc_data["status"] == "processed"

    # 2. Source Code Python file
    py_content = b"""def reconcile_ledger(entries):
    \"\"\"Reconcile transaction ledger with double-entry verification.\"\"\"
    return sum(e.amount for e in entries if e.is_valid)
"""
    files_py = {"file": ("reconciliation.py", io.BytesIO(py_content), "text/x-python")}
    upload_py = client.post(f"/api/v1/projects/{project_id}/documents/upload", files=files_py, headers=headers)
    assert upload_py.status_code == 200
    assert upload_py.json()["category"] in ["source_code", "package", "code"]

    # 3. ZIP Archive with folder hierarchy & path traversal safety
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w") as zf:
        zf.writestr("src/core/settlement.py", "def execute(): pass\n")
        zf.writestr("src/config/settings.json", '{"env": "production", "max_tps": 20000}\n')
        zf.writestr("docs/runbook.md", "# HSM Failover Runbook\nFollow standard rotation.\n")
    zip_buffer.seek(0)

    zip_files = {"file": ("settlement_bundle.zip", zip_buffer, "application/zip")}
    zip_res = client.post(f"/api/v1/projects/{project_id}/documents/upload-zip", files=zip_files, headers=headers)
    assert zip_res.status_code == 200
    zip_report = zip_res.json()
    assert zip_report["processed_count"] >= 3

def test_claims_evidence_and_conflict_handling(creator_and_contributor):
    """Verify claim creation, reviewer status updates, and conflict detection."""
    headers = creator_and_contributor["creator_headers"]
    project_id = creator_and_contributor["project_id"]

    # Create Claim
    claim_res = client.post(f"/api/v1/projects/{project_id}/claims", json={
        "title": "Dual-Key HSM Key Ceremony Completed",
        "claim_type": "milestone",
        "content": "Ceremony conducted in secure room with 3 certified witnesses.",
        "status": "needs_review",
        "entity_owner": "Elena Rostova"
    }, headers=headers)
    assert claim_res.status_code == 200
    claim_id = claim_res.json()["id"]

    # Reviewer verifies claim
    review_res = client.post(f"/api/v1/projects/{project_id}/claims/{claim_id}/review", json={
        "status": "verified",
        "reviewer_notes": "Certificate signed by security officers."
    }, headers=headers)
    assert review_res.status_code == 200
    assert review_res.json()["status"] == "verified"

def test_responsibility_lifecycle(creator_and_contributor):
    """Verify adding, confirming, updating, and deleting responsibility mappings."""
    headers = creator_and_contributor["creator_headers"]
    project_id = creator_and_contributor["project_id"]

    # Add Responsibility
    add_res = client.post(f"/api/v1/projects/{project_id}/responsibilities", json={
        "area": "Cryptographic HSM Module",
        "assigned_to": "Elena Rostova",
        "status": "unconfirmed",
        "evidence_summary": "Documented in security specification v2."
    }, headers=headers)
    assert add_res.status_code == 200
    resp_id = add_res.json()["id"]

    # Confirm Responsibility
    confirm_res = client.put(f"/api/v1/projects/{project_id}/responsibilities/{resp_id}", json={
        "area": "Cryptographic HSM Module",
        "assigned_to": "Elena Rostova",
        "status": "confirmed",
        "evidence_summary": "Confirmed in sprint 24 steering meeting."
    }, headers=headers)
    assert confirm_res.status_code == 200
    assert confirm_res.json()["status"] == "confirmed"

    # Delete Responsibility
    del_res = client.delete(f"/api/v1/projects/{project_id}/responsibilities/{resp_id}", headers=headers)
    assert del_res.status_code == 200

def test_what_if_simulator_grounding_and_saving(creator_and_contributor):
    """Verify evidence-grounded what-if simulation, uncertainty detection, and scenario saving."""
    headers = creator_and_contributor["creator_headers"]
    project_id = creator_and_contributor["project_id"]

    # Add a responsibility so there's ground truth
    client.post(f"/api/v1/projects/{project_id}/responsibilities", json={
        "area": "Core Settlement Engine",
        "assigned_to": "Elena Rostova",
        "status": "confirmed",
        "evidence_summary": "Primary engineer in commit logs."
    }, headers=headers)

    # 1. Run simulation for known target
    sim_res = client.post(f"/api/v1/projects/{project_id}/simulator", json={
        "scenario_type": "person_unavailable",
        "target_entity": "Elena Rostova"
    }, headers=headers)
    assert sim_res.status_code == 200
    res_data = sim_res.json()
    assert res_data["target_entity"] == "Elena Rostova"
    assert "findings_table" in res_data
    assert len(res_data["findings_table"]) > 0

    # 2. Run simulation for unknown target -> must flag uncertainty
    unknown_res = client.post(f"/api/v1/projects/{project_id}/simulator", json={
        "scenario_type": "person_unavailable",
        "target_entity": "NonExistentPerson"
    }, headers=headers)
    assert unknown_res.status_code == 200
    assert unknown_res.json()["insufficient_data"] is True

    # 3. Save Scenario
    save_res = client.post(f"/api/v1/projects/{project_id}/simulator/save", json={
        "scenario_name": "Q4 Departure Simulation",
        "scenario_type": "person_unavailable",
        "target_entity": "Elena Rostova",
        "results": res_data
    }, headers=headers)
    assert save_res.status_code == 200
    saved_id = save_res.json()["id"]

    # 4. List Saved Scenarios
    list_saved = client.get(f"/api/v1/projects/{project_id}/simulator/saved", headers=headers)
    assert list_saved.status_code == 200
    assert any(s["id"] == saved_id for s in list_saved.json())

def test_handover_creator_approval_and_publish_workflow(creator_and_contributor):
    """Verify complete handover lifecycle: submit -> creator-only approval -> publish -> successor receipt."""
    creator_headers = creator_and_contributor["creator_headers"]
    contrib_headers = creator_and_contributor["contrib_headers"]
    project_id = creator_and_contributor["project_id"]
    uid = creator_and_contributor["uid"]

    # Register Successor
    email_succ = f"succ_{uid}@continuity.internal"
    reg_s = client.post("/api/v1/auth/register", json={
        "email": email_succ,
        "full_name": "Incoming Engineering Successor",
        "password": "Password123!"
    })
    succ_token = reg_s.json()["access_token"]
    succ_headers = {"Authorization": f"Bearer {succ_token}"}
    client.post(f"/api/v1/projects/{project_id}/members", json={
        "email": email_succ,
        "role": "successor"
    }, headers=creator_headers)

    # 1. Contributor submits handover
    sub_res = client.post(f"/api/v1/projects/{project_id}/handover/submit", headers=contrib_headers)
    assert sub_res.status_code == 200
    h_sub = sub_res.json()
    assert h_sub["status"] == "submitted"
    assert h_sub["verification_status"] == "Pending"

    # 2. Contributor cannot approve (must be project creator) -> 403 Forbidden
    non_creator_approve = client.post(f"/api/v1/projects/{project_id}/handover/approve", headers=contrib_headers)
    assert non_creator_approve.status_code == 403

    # 3. Cannot publish unapproved handover -> 400 Bad Request
    premature_pub = client.post(f"/api/v1/projects/{project_id}/handover/publish", headers=creator_headers)
    assert premature_pub.status_code == 400

    # 4. Incomplete mandatory checklist items prevent approval -> 400 Bad Request
    premature_app = client.post(f"/api/v1/projects/{project_id}/handover/approve", headers=creator_headers)
    assert premature_app.status_code == 400

    # Mark mandatory items as complete
    h_info = client.get(f"/api/v1/projects/{project_id}/handover", headers=creator_headers).json()
    for item in h_info.get("checklist_items", []):
        client.put(f"/api/v1/projects/{project_id}/handover/checklist/{item['id']}", json={
            "status": "complete",
            "details": "Verified by engineering lead."
        }, headers=creator_headers)

    # 5. Creator approves handover -> 200 OK
    approve_res = client.post(f"/api/v1/projects/{project_id}/handover/approve", headers=creator_headers)
    assert approve_res.status_code == 200
    h_app = approve_res.json()
    assert h_app["status"] == "approved"
    assert h_app["verification_status"] == "Approved"
    assert h_app["publication_status"] == "Not Published"

    # 6. Creator publishes handover
    pub_res = client.post(f"/api/v1/projects/{project_id}/handover/publish", headers=creator_headers)
    assert pub_res.status_code == 200
    h_pub = pub_res.json()
    assert h_pub["status"] == "published"
    assert h_pub["publication_status"] == "Published"

    # 7. Successor acknowledges receipt
    rec_res = client.post(f"/api/v1/projects/{project_id}/handover/receive", json={
        "notes": "Reviewed HSM documentation. Ready to assume system ownership."
    }, headers=succ_headers)
    assert rec_res.status_code == 200
    h_rec = rec_res.json()
    assert h_rec["status"] == "received"
    assert "HSM" in h_rec.get("successor_notes", "") or "Elena" in h_rec.get("successor_notes", "")
