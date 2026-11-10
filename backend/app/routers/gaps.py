from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import KnowledgeGap, User, AuditEvent
from app.schemas import GapOut, GapResolve
from app.services.auth_service import get_current_user
from app.services.rbac import require_project_role
from app.services.risk_engine import calculate_departure_risk_score

router = APIRouter(prefix="/projects/{project_id}/gaps", tags=["Knowledge Gaps"])

@router.get("", response_model=List[GapOut])
def list_gaps(project_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_project_role(project_id, current_user, "successor", db)
    gaps = db.query(KnowledgeGap).filter(KnowledgeGap.project_id == project_id).order_by(KnowledgeGap.created_at.desc()).all()
    results = []
    for g in gaps:
        results.append(GapOut(
            id=g.id,
            project_id=g.project_id,
            title=g.title,
            description=g.description,
            gap_type=g.gap_type,
            related_claim_id=g.related_claim_id,
            related_claim_title=g.related_claim.title if g.related_claim else None,
            recommended_question=g.recommended_question,
            status=g.status,
            resolution=g.resolution,
            addressed_by_id=g.addressed_by_id,
            created_at=g.created_at
        ))
    return results

@router.post("/{gap_id}/resolve", response_model=GapOut)
def resolve_gap(
    project_id: str,
    gap_id: str,
    resolve_in: GapResolve,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_project_role(project_id, current_user, "reviewer", db)
    gap = db.query(KnowledgeGap).filter(KnowledgeGap.id == gap_id, KnowledgeGap.project_id == project_id).first()
    if not gap:
        raise HTTPException(status_code=404, detail="Knowledge gap not found.")

    gap.status = "addressed"
    gap.resolution = resolve_in.resolution
    gap.addressed_by_id = current_user.id
    db.commit()

    calculate_departure_risk_score(project_id, db)

    db.add(AuditEvent(
        project_id=project_id,
        user_id=current_user.id,
        user_email=current_user.email,
        action="gap.addressed",
        entity_type="KnowledgeGap",
        entity_id=gap.id,
        details=f"Addressed gap '{gap.title}': {resolve_in.resolution}"
    ))
    db.commit()

    return GapOut(
        id=gap.id,
        project_id=gap.project_id,
        title=gap.title,
        description=gap.description,
        gap_type=gap.gap_type,
        related_claim_id=gap.related_claim_id,
        related_claim_title=gap.related_claim.title if gap.related_claim else None,
        recommended_question=gap.recommended_question,
        status=gap.status,
        resolution=gap.resolution,
        addressed_by_id=gap.addressed_by_id,
        created_at=gap.created_at
    )
