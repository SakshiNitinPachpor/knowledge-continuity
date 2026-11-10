from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import EvidenceConflict, Claim, User, AuditEvent
from app.schemas import ConflictOut, ConflictResolve
from app.services.auth_service import get_current_user
from app.services.rbac import require_project_role
from app.routers.claims import serialize_claim
from app.services.risk_engine import calculate_departure_risk_score
from app.services.handover_service import get_or_create_handover

router = APIRouter(prefix="/projects/{project_id}/conflicts", tags=["Evidence Conflicts"])

@router.get("", response_model=List[ConflictOut])
def list_conflicts(project_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_project_role(project_id, current_user, "successor", db)
    conflicts = db.query(EvidenceConflict).filter(EvidenceConflict.project_id == project_id).order_by(EvidenceConflict.created_at.desc()).all()
    results = []
    for c in conflicts:
        results.append(ConflictOut(
            id=c.id,
            project_id=c.project_id,
            claim_a_id=c.claim_a_id,
            claim_b_id=c.claim_b_id,
            claim_a=serialize_claim(c.claim_a),
            claim_b=serialize_claim(c.claim_b),
            topic=c.topic,
            description=c.description,
            status=c.status,
            resolution_choice=c.resolution_choice,
            resolution_notes=c.resolution_notes,
            resolved_by_id=c.resolved_by_id,
            resolved_at=c.resolved_at,
            created_at=c.created_at
        ))
    return results

@router.post("/{conflict_id}/resolve", response_model=ConflictOut)
def resolve_conflict(
    project_id: str,
    conflict_id: str,
    resolve_in: ConflictResolve,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_project_role(project_id, current_user, "reviewer", db)
    conflict = db.query(EvidenceConflict).filter(
        EvidenceConflict.id == conflict_id,
        EvidenceConflict.project_id == project_id
    ).first()
    if not conflict:
        raise HTTPException(status_code=404, detail="Conflict not found.")

    valid_choices = ["claim_a", "claim_b", "both_modified", "dismissed"]
    if resolve_in.resolution_choice not in valid_choices:
        raise HTTPException(status_code=400, detail=f"Invalid resolution choice. Choose from: {valid_choices}")

    conflict.status = "resolved"
    conflict.resolution_choice = resolve_in.resolution_choice
    conflict.resolution_notes = resolve_in.resolution_notes
    conflict.resolved_by_id = current_user.id
    conflict.resolved_at = datetime.utcnow()

    # Update claim statuses based on reviewer decision
    if resolve_in.resolution_choice == "claim_a":
        conflict.claim_a.status = "verified"
        conflict.claim_a.reviewer_notes = f"Verified over conflicting Claim B: {resolve_in.resolution_notes}"
        conflict.claim_b.status = "rejected"
        conflict.claim_b.reviewer_notes = f"Rejected in favor of Claim A: {resolve_in.resolution_notes}"
    elif resolve_in.resolution_choice == "claim_b":
        conflict.claim_b.status = "verified"
        conflict.claim_b.reviewer_notes = f"Verified over conflicting Claim A: {resolve_in.resolution_notes}"
        conflict.claim_a.status = "rejected"
        conflict.claim_a.reviewer_notes = f"Rejected in favor of Claim B: {resolve_in.resolution_notes}"
    elif resolve_in.resolution_choice == "both_modified":
        conflict.claim_a.status = "needs_review"
        conflict.claim_b.status = "needs_review"
    elif resolve_in.resolution_choice == "dismissed":
        conflict.claim_a.status = "needs_review"
        conflict.claim_b.status = "needs_review"

    db.commit()

    # Recalculate exposure and sync handover checklist
    calculate_departure_risk_score(project_id, db)
    get_or_create_handover(project_id, db)

    db.add(AuditEvent(
        project_id=project_id,
        user_id=current_user.id,
        user_email=current_user.email,
        action="conflict.resolved",
        entity_type="EvidenceConflict",
        entity_id=conflict.id,
        details=f"Conflict '{conflict.topic}' resolved with choice '{conflict.resolution_choice}': {conflict.resolution_notes}"
    ))
    db.commit()

    return ConflictOut(
        id=conflict.id,
        project_id=conflict.project_id,
        claim_a_id=conflict.claim_a_id,
        claim_b_id=conflict.claim_b_id,
        claim_a=serialize_claim(conflict.claim_a),
        claim_b=serialize_claim(conflict.claim_b),
        topic=conflict.topic,
        description=conflict.description,
        status=conflict.status,
        resolution_choice=conflict.resolution_choice,
        resolution_notes=conflict.resolution_notes,
        resolved_by_id=conflict.resolved_by_id,
        resolved_at=conflict.resolved_at,
        created_at=conflict.created_at
    )
