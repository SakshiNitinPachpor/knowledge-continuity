from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Claim, ExtractedPassage, Document, User, AuditEvent
from app.schemas import ClaimCreate, ClaimUpdate, ClaimReview, ClaimOut
from app.services.auth_service import get_current_user
from app.services.rbac import require_project_role, get_user_project_role
from app.services.conflict_engine import scan_project_conflicts
from app.services.gap_engine import scan_project_gaps
from app.services.risk_engine import calculate_departure_risk_score
from app.services.handover_service import get_or_create_handover

router = APIRouter(prefix="/projects/{project_id}/claims", tags=["Claims & Evidence"])

def serialize_claim(claim: Claim) -> ClaimOut:
    return ClaimOut(
        id=claim.id,
        project_id=claim.project_id,
        document_id=claim.document_id,
        document_name=claim.document.original_name if claim.document else None,
        passage_id=claim.passage_id,
        passage_text=claim.passage.text_content if claim.passage else None,
        page_number=claim.passage.page_number if claim.passage else None,
        section_heading=claim.passage.section_heading if claim.passage else None,
        claim_type=claim.claim_type,
        title=claim.title,
        content=claim.content,
        confidence_score=claim.confidence_score,
        status=claim.status,
        entity_name=claim.entity_name,
        entity_owner=claim.entity_owner,
        date_reference=claim.date_reference,
        reviewer_notes=claim.reviewer_notes or "",
        reviewed_by_id=claim.reviewed_by_id,
        reviewed_at=claim.reviewed_at,
        created_at=claim.created_at
    )

@router.get("", response_model=List[ClaimOut])
def list_claims(
    project_id: str,
    status_filter: Optional[str] = None,
    type_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_role = require_project_role(project_id, current_user, "successor", db)
    query = db.query(Claim).filter(Claim.project_id == project_id)

    # Successor restriction
    if user_role == "successor":
        query = query.filter(Claim.status == "verified")
    else:
        if status_filter:
            query = query.filter(Claim.status == status_filter)
        else:
            query = query.filter(Claim.status != "rejected")

    if type_filter:
        query = query.filter(Claim.claim_type == type_filter)

    claims = query.order_by(Claim.created_at.desc()).all()
    return [serialize_claim(c) for c in claims]

@router.post("", response_model=ClaimOut)
def create_manual_claim(
    project_id: str,
    claim_in: ClaimCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_project_role(project_id, current_user, "contributor", db)
    claim = Claim(
        project_id=project_id,
        claim_type=claim_in.claim_type,
        title=claim_in.title,
        content=claim_in.content,
        entity_name=claim_in.entity_name,
        entity_owner=claim_in.entity_owner,
        date_reference=claim_in.date_reference,
        status="needs_review",
        confidence_score=1.0
    )
    db.add(claim)
    db.commit()
    db.refresh(claim)

    # Re-evaluate gaps and risks
    scan_project_gaps(project_id, db)
    calculate_departure_risk_score(project_id, db)

    db.add(AuditEvent(
        project_id=project_id,
        user_id=current_user.id,
        user_email=current_user.email,
        action="claim.created_manually",
        entity_type="Claim",
        entity_id=claim.id,
        details=f"Manually created claim '{claim.title}' ({claim.claim_type})."
    ))
    db.commit()

    return serialize_claim(claim)

@router.put("/{claim_id}", response_model=ClaimOut)
def update_claim(
    project_id: str,
    claim_id: str,
    claim_update: ClaimUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_project_role(project_id, current_user, "reviewer", db)
    claim = db.query(Claim).filter(Claim.id == claim_id, Claim.project_id == project_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found.")

    if claim_update.title is not None:
        claim.title = claim_update.title
    if claim_update.content is not None:
        claim.content = claim_update.content
    if claim_update.claim_type is not None:
        claim.claim_type = claim_update.claim_type
    if claim_update.entity_name is not None:
        claim.entity_name = claim_update.entity_name
    if claim_update.entity_owner is not None:
        claim.entity_owner = claim_update.entity_owner
    if claim_update.date_reference is not None:
        claim.date_reference = claim_update.date_reference

    db.commit()
    db.refresh(claim)

    # Re-evaluate
    scan_project_conflicts(project_id, db)
    scan_project_gaps(project_id, db)
    calculate_departure_risk_score(project_id, db)

    return serialize_claim(claim)

@router.post("/{claim_id}/review", response_model=ClaimOut)
def review_claim(
    project_id: str,
    claim_id: str,
    review_in: ClaimReview,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_project_role(project_id, current_user, "reviewer", db)
    claim = db.query(Claim).filter(Claim.id == claim_id, Claim.project_id == project_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found.")

    allowed_statuses = ["verified", "needs_review", "conflicting_evidence", "missing_evidence", "rejected"]
    if review_in.status not in allowed_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Choose from: {allowed_statuses}")

    prev_status = claim.status
    claim.status = review_in.status
    claim.reviewer_notes = review_in.reviewer_notes or ""
    claim.reviewed_by_id = current_user.id
    claim.reviewed_at = datetime.utcnow()
    db.commit()

    # Recalculate exposure and sync handover
    calculate_departure_risk_score(project_id, db)
    get_or_create_handover(project_id, db)

    db.add(AuditEvent(
        project_id=project_id,
        user_id=current_user.id,
        user_email=current_user.email,
        action=f"claim.{claim.status}",
        entity_type="Claim",
        entity_id=claim.id,
        details=f"Status changed from '{prev_status}' to '{claim.status}'. Notes: {claim.reviewer_notes}"
    ))
    db.commit()

    return serialize_claim(claim)
