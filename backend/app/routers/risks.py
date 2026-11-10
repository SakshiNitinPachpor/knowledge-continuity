from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Risk, Claim, User, AuditEvent
from app.schemas import RiskCreate, RiskUpdate, RiskOut
from app.services.auth_service import get_current_user
from app.services.rbac import require_project_role
from app.services.risk_engine import calculate_departure_risk_score

router = APIRouter(prefix="/projects/{project_id}/risks", tags=["AI Risk Radar & Exposure"])

@router.get("", response_model=List[RiskOut])
def list_risks(project_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_project_role(project_id, current_user, "successor", db)
    risks = db.query(Risk).filter(Risk.project_id == project_id).order_by(Risk.created_at.desc()).all()
    results = []
    for r in risks:
        results.append(RiskOut(
            id=r.id,
            project_id=r.project_id,
            title=r.title,
            description=r.description,
            category=r.category,
            severity=r.severity,
            impact=r.impact or "",
            suggested_mitigation=r.suggested_mitigation or "",
            evidence_claim_id=r.evidence_claim_id,
            evidence_claim_title=r.evidence_claim.title if r.evidence_claim else None,
            status=r.status,
            created_at=r.created_at
        ))
    return results

@router.post("", response_model=RiskOut)
def create_risk(
    project_id: str,
    risk_in: RiskCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_project_role(project_id, current_user, "reviewer", db)
    r = Risk(
        project_id=project_id,
        title=risk_in.title,
        description=risk_in.description,
        category=risk_in.category,
        severity=risk_in.severity,
        impact=risk_in.impact or "",
        suggested_mitigation=risk_in.suggested_mitigation or "",
        evidence_claim_id=risk_in.evidence_claim_id,
        status="identified"
    )
    db.add(r)
    db.commit()
    db.refresh(r)

    calculate_departure_risk_score(project_id, db)

    db.add(AuditEvent(
        project_id=project_id,
        user_id=current_user.id,
        user_email=current_user.email,
        action="risk.created",
        entity_type="Risk",
        entity_id=r.id,
        details=f"Created risk '{r.title}' ({r.severity})."
    ))
    db.commit()

    return RiskOut(
        id=r.id,
        project_id=r.project_id,
        title=r.title,
        description=r.description,
        category=r.category,
        severity=r.severity,
        impact=r.impact,
        suggested_mitigation=r.suggested_mitigation,
        evidence_claim_id=r.evidence_claim_id,
        evidence_claim_title=r.evidence_claim.title if r.evidence_claim else None,
        status=r.status,
        created_at=r.created_at
    )

@router.put("/{risk_id}", response_model=RiskOut)
def update_risk(
    project_id: str,
    risk_id: str,
    risk_update: RiskUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_project_role(project_id, current_user, "reviewer", db)
    r = db.query(Risk).filter(Risk.id == risk_id, Risk.project_id == project_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Risk not found.")

    if risk_update.title is not None:
        r.title = risk_update.title
    if risk_update.description is not None:
        r.description = risk_update.description
    if risk_update.severity is not None:
        r.severity = risk_update.severity
    if risk_update.impact is not None:
        r.impact = risk_update.impact
    if risk_update.suggested_mitigation is not None:
        r.suggested_mitigation = risk_update.suggested_mitigation
    if risk_update.status is not None:
        r.status = risk_update.status

    db.commit()
    db.refresh(r)

    calculate_departure_risk_score(project_id, db)
    return RiskOut(
        id=r.id,
        project_id=r.project_id,
        title=r.title,
        description=r.description,
        category=r.category,
        severity=r.severity,
        impact=r.impact,
        suggested_mitigation=r.suggested_mitigation,
        evidence_claim_id=r.evidence_claim_id,
        evidence_claim_title=r.evidence_claim.title if r.evidence_claim else None,
        status=r.status,
        created_at=r.created_at
    )

@router.get("/departure-score")
def get_departure_score(project_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    require_project_role(project_id, current_user, "successor", db)
    return calculate_departure_risk_score(project_id, db)
