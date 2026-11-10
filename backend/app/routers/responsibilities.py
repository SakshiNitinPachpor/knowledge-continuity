import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import ProjectResponsibility, HardwareAsset, User, AuditEvent
from app.schemas import (
    ProjectResponsibilityCreate, ProjectResponsibilityUpdate, ProjectResponsibilityOut,
    HardwareAssetCreate, HardwareAssetUpdate, HardwareAssetOut
)
from app.services.auth_service import get_current_user
from app.services.rbac import require_project_role
from app.services.reconstruction_engine import sync_project_responsibilities_from_evidence

router = APIRouter(prefix="/projects/{project_id}", tags=["Responsibilities & Hardware"])

# ==========================================
# Responsibilities & Ownership Management
# ==========================================
@router.get("/responsibilities", response_model=List[ProjectResponsibilityOut])
def list_responsibilities(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_project_role(project_id, current_user, "contributor", db)
    return db.query(ProjectResponsibility).filter(
        ProjectResponsibility.project_id == project_id
    ).order_by(ProjectResponsibility.created_at.desc()).all()

@router.post("/responsibilities", response_model=ProjectResponsibilityOut)
def create_responsibility(
    project_id: str,
    resp_in: ProjectResponsibilityCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_project_role(project_id, current_user, "contributor", db)
    resp = ProjectResponsibility(
        project_id=project_id,
        area=resp_in.area,
        assigned_to=resp_in.assigned_to,
        evidence_summary=resp_in.evidence_summary or "Manually assigned by team.",
        status=resp_in.status or "confirmed",
        successor_notes=resp_in.successor_notes or "",
        document_id=resp_in.document_id,
        claim_id=resp_in.claim_id
    )
    db.add(resp)
    db.commit()
    db.refresh(resp)

    db.add(AuditEvent(
        project_id=project_id,
        user_id=current_user.id,
        user_email=current_user.email,
        action="responsibility.created",
        entity_type="Responsibility",
        entity_id=resp.id,
        details=f"Assigned '{resp.area}' to '{resp.assigned_to}' (Status: {resp.status})."
    ))
    db.commit()

    return resp

@router.put("/responsibilities/{resp_id}", response_model=ProjectResponsibilityOut)
def update_responsibility(
    project_id: str,
    resp_id: str,
    resp_in: ProjectResponsibilityUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_project_role(project_id, current_user, "contributor", db)
    resp = db.query(ProjectResponsibility).filter(
        ProjectResponsibility.id == resp_id,
        ProjectResponsibility.project_id == project_id
    ).first()
    if not resp:
        raise HTTPException(status_code=404, detail="Responsibility record not found.")

    if resp_in.area is not None:
        resp.area = resp_in.area
    if resp_in.assigned_to is not None:
        resp.assigned_to = resp_in.assigned_to
    if resp_in.evidence_summary is not None:
        resp.evidence_summary = resp_in.evidence_summary
    if resp_in.status is not None:
        resp.status = resp_in.status
    if resp_in.successor_notes is not None:
        resp.successor_notes = resp_in.successor_notes

    db.commit()
    db.refresh(resp)

    db.add(AuditEvent(
        project_id=project_id,
        user_id=current_user.id,
        user_email=current_user.email,
        action="responsibility.updated",
        entity_type="Responsibility",
        entity_id=resp.id,
        details=f"Updated '{resp.area}' assigned to '{resp.assigned_to}' -> Status: {resp.status}."
    ))
    db.commit()

    return resp

@router.delete("/responsibilities/{resp_id}")
def delete_responsibility(
    project_id: str,
    resp_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_project_role(project_id, current_user, "contributor", db)
    resp = db.query(ProjectResponsibility).filter(
        ProjectResponsibility.id == resp_id,
        ProjectResponsibility.project_id == project_id
    ).first()
    if not resp:
        raise HTTPException(status_code=404, detail="Responsibility record not found.")

    area_name = resp.area
    assigned_name = resp.assigned_to
    db.delete(resp)
    db.commit()

    return {"status": "success", "message": "Responsibility deleted."}

@router.post("/responsibilities/extract")
def extract_responsibilities(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_project_role(project_id, current_user, "contributor", db)
    sync_project_responsibilities_from_evidence(project_id, db)
    resps = db.query(ProjectResponsibility).filter(ProjectResponsibility.project_id == project_id).all()
    return {
        "status": "success",
        "message": f"Synchronized {len(resps)} responsibility assignments with evidence.",
        "count": len(resps)
    }

# ==========================================
# Hardware Assets & Circuit Diagrams
# ==========================================
@router.get("/hardware", response_model=List[HardwareAssetOut])
def list_hardware_assets(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_project_role(project_id, current_user, "contributor", db)
    return db.query(HardwareAsset).filter(
        HardwareAsset.project_id == project_id
    ).order_by(HardwareAsset.created_at.desc()).all()

@router.post("/hardware", response_model=HardwareAssetOut)
def create_hardware_asset(
    project_id: str,
    hw_in: HardwareAssetCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_project_role(project_id, current_user, "contributor", db)
    asset = HardwareAsset(
        project_id=project_id,
        document_id=hw_in.document_id,
        title=hw_in.title,
        category=hw_in.category or "circuit_diagram",
        components_json=hw_in.components_json or "[]",
        status=hw_in.status or "needs_confirmation",
        notes=hw_in.notes or ""
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset

@router.put("/hardware/{asset_id}", response_model=HardwareAssetOut)
def update_hardware_asset(
    project_id: str,
    asset_id: str,
    hw_in: HardwareAssetUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_project_role(project_id, current_user, "contributor", db)
    asset = db.query(HardwareAsset).filter(
        HardwareAsset.id == asset_id,
        HardwareAsset.project_id == project_id
    ).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Hardware asset not found.")

    if hw_in.title is not None:
        asset.title = hw_in.title
    if hw_in.category is not None:
        asset.category = hw_in.category
    if hw_in.components_json is not None:
        asset.components_json = hw_in.components_json
    if hw_in.status is not None:
        asset.status = hw_in.status
    if hw_in.notes is not None:
        asset.notes = hw_in.notes

    db.commit()
    db.refresh(asset)
    return asset
