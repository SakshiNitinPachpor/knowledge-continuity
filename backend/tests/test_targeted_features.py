import os
import io
import zipfile
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

@pytest.fixture(scope="module")
def auth_context():
    # Register primary test user with unique email
    import uuid
    uid = uuid.uuid4().hex[:6]
    email = f"lead.{uid}@continuity.internal"
    res = client.post("/api/v1/auth/register", json={
        "email": email,
        "full_name": "Lead Architect",
        "title": "Principal Architect",
        "password": "SecurePassword123!"
    })
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Fetch default workspace
    ws_res = client.get("/api/v1/workspaces", headers=headers)
    workspace_id = ws_res.json()[0]["id"]

    # Create new project
    proj_res = client.post("/api/v1/projects", json={
        "workspace_id": workspace_id,
        "name": "Distributed Mesh Engine",
        "code": f"MSH-{uid}".upper(),
        "description": "High-resilience service mesh and circuit integration."
    }, headers=headers)
    project_id = proj_res.json()["id"]

    return {
        "headers": headers,
        "workspace_id": workspace_id,
        "project_id": project_id
    }

def test_source_code_and_ast_parsing(auth_context):
    project_id = auth_context["project_id"]
    headers = auth_context["headers"]

    py_content = b"""'''Module: Database Connection Pool'''
class DatabaseEngine:
    '''Manages connection pooling and transactions.'''
    def connect(self, host, port):
        '''Establish database socket.'''
        pass

def init_schema():
    '''Initialize core relational tables.'''
    pass
"""
    files = {"file": ("database.py", io.BytesIO(py_content), "text/x-python")}
    res = client.post(f"/api/v1/projects/{project_id}/documents/upload", files=files, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["category"] == "code"
    assert data["file_type"] == "py"
    assert data["status"] == "processed"
    assert data["claims_count"] > 0

def test_hardware_diagram_upload(auth_context):
    project_id = auth_context["project_id"]
    headers = auth_context["headers"]

    # Create a 10x10 dummy PNG image
    from PIL import Image
    img_byte_arr = io.BytesIO()
    image = Image.new("RGB", (100, 100), color="blue")
    image.save(img_byte_arr, format="PNG")
    img_byte_arr.seek(0)

    files = {"file": ("esp32_circuit_diagram.png", img_byte_arr, "image/png")}
    res = client.post(f"/api/v1/projects/{project_id}/documents/upload", files=files, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["category"] == "hardware"
    assert data["file_type"] == "png"

    # Verify HardwareAsset was automatically indexed
    hw_res = client.get(f"/api/v1/projects/{project_id}/hardware", headers=headers)
    assert hw_res.status_code == 200
    hw_list = hw_res.json()
    assert len(hw_list) >= 1
    assert any("esp32" in h["title"].lower() for h in hw_list)

def test_zip_upload_and_folder_structure_preservation(auth_context):
    project_id = auth_context["project_id"]
    headers = auth_context["headers"]

    # Build a simulated in-memory zip archive with subdirectories
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("Banking_System/Backend/server.py", "def start_server(): pass")
        zf.writestr("Banking_System/Documentation/spec.md", "# Banking Specification\nOwner: Sarah Jenkins\nDecided to use PostgreSQL 16.")
        zf.writestr("Banking_System/Hardware/sensor_layout.txt", "Sensor Pin 1 -> VCC 3.3V\nSensor Pin 2 -> GND")

    zip_buffer.seek(0)
    files = {"file": ("Banking_Project.zip", zip_buffer, "application/zip")}
    res = client.post(f"/api/v1/projects/{project_id}/documents/upload-zip", files=files, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["processed_count"] == 3
    assert data["failed_count"] == 0

    # Verify folder path preservation in documents list
    docs_res = client.get(f"/api/v1/projects/{project_id}/documents", headers=headers)
    docs = docs_res.json()
    folder_paths = [d["folder_path"] for d in docs]
    assert any("Banking_System/Backend" in fp for fp in folder_paths)
    assert any("Banking_System/Documentation" in fp for fp in folder_paths)

def test_responsibility_lifecycle(auth_context):
    project_id = auth_context["project_id"]
    headers = auth_context["headers"]

    # 1. Create responsibility
    create_res = client.post(f"/api/v1/projects/{project_id}/responsibilities", json={
        "area": "Payment Gateway Microservice",
        "assigned_to": "Elena Rostova",
        "evidence_summary": "Extracted from architecture spec v2.4",
        "status": "needs_confirmation",
        "successor_notes": "Needs API key rotation handover."
    }, headers=headers)
    assert create_res.status_code == 200
    resp_id = create_res.json()["id"]

    # 2. Confirm responsibility
    update_res = client.put(f"/api/v1/projects/{project_id}/responsibilities/{resp_id}", json={
        "status": "confirmed"
    }, headers=headers)
    assert update_res.status_code == 200
    assert update_res.json()["status"] == "confirmed"

    # 3. List responsibilities
    list_res = client.get(f"/api/v1/projects/{project_id}/responsibilities", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1

def test_data_isolation_between_tenants(auth_context):
    project_id = auth_context["project_id"]
    import uuid
    uid = uuid.uuid4().hex[:6]

    # Register an unauthorized outside user
    outsider_res = client.post("/api/v1/auth/register", json={
        "email": f"outsider.{uid}@othercorp.internal",
        "full_name": "Unauthorized Outsider",
        "title": "Attacker",
        "password": "AttackPassword123!"
    })
    outsider_token = outsider_res.json()["access_token"]
    outsider_headers = {"Authorization": f"Bearer {outsider_token}"}

    # Outsider attempts to access primary user's project documents
    docs_res = client.get(f"/api/v1/projects/{project_id}/documents", headers=outsider_headers)
    assert docs_res.status_code == 403

    # Outsider attempts to upload to primary user's project
    files = {"file": ("malicious.txt", io.BytesIO(b"hack"), "text/plain")}
    upload_res = client.post(f"/api/v1/projects/{project_id}/documents/upload", files=files, headers=outsider_headers)
    assert upload_res.status_code == 403

def test_handover_pdf_generation_with_matrix(auth_context):
    project_id = auth_context["project_id"]
    headers = auth_context["headers"]

    pdf_res = client.get(f"/api/v1/projects/{project_id}/handover/pdf", headers=headers)
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert len(pdf_res.content) > 1000
