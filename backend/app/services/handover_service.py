from datetime import datetime
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.models import (
    Project, Handover, HandoverChecklistItem, Claim,
    EvidenceConflict, KnowledgeGap, Document, User, AuditEvent
)

DEFAULT_CHECKLIST_TEMPLATE = [
    ("Overview", "Executive Project Summary and Scope Definition", True),
    ("Decisions", "Architecture & Technology Decision Log with Rationale", True),
    ("Responsibilities", "Component Ownership Matrix & Key Liaison Contacts", True),
    ("Pending Tasks", "In-Flight Work Items & Transition Action Items", True),
    ("Dependencies", "Third-Party Services, Internal APIs & SLA Requirements", True),
    ("Risks", "Operational Risk Radar & Continuity Mitigations", True),
    ("Documentation", "Runbooks, Repositories, and Environment Specifications", True),
    ("Open Questions", "Knowledge Gaps and Unresolved Technical Inquiries", False),
    ("Successor Actions", "First 30-Day Onboarding Roadmap & Immediate Next Steps", True)
]

def get_or_create_handover(project_id: str, db: Session) -> Handover:
    """
    Retrieves or initializes the active handover draft for a project.
    Populates standard enterprise checklist items if newly created.
    """
    handover = db.query(Handover).filter(Handover.project_id == project_id).first()
    if not handover:
        handover = Handover(
            project_id=project_id,
            title="Knowledge Continuity Handover Package",
            status="draft",
            summary="Official structured handover and continuity package.",
            completion_percentage=0.0,
            version=1
        )
        db.add(handover)
        db.flush()

        for category, item_name, is_mandatory in DEFAULT_CHECKLIST_TEMPLATE:
            item = HandoverChecklistItem(
                handover_id=handover.id,
                category=category,
                item_name=item_name,
                is_mandatory=is_mandatory,
                status="incomplete",
                details=""
            )
            db.add(item)
        db.commit()
        db.refresh(handover)
        
    sync_handover_completion(handover.id, db)
    return handover

def sync_handover_completion(handover_id: str, db: Session) -> float:
    """
    Calculates actual handover completion percentage based on:
    - Status of checklist items (complete = 1.0, needs_review = 0.5, incomplete = 0)
    - Review status of underlying project claims
    - Presence of unresolved conflicts (locks completion below 90% if conflicts exist!)
    """
    handover = db.query(Handover).filter(Handover.id == handover_id).first()
    if not handover:
        return 0.0

    items = db.query(HandoverChecklistItem).filter(HandoverChecklistItem.handover_id == handover_id).all()
    if not items:
        return 0.0

    item_scores = []
    for item in items:
        if item.status == "complete":
            item_scores.append(1.0)
        elif item.status == "needs_review":
            item_scores.append(0.5)
        else:
            item_scores.append(0.0)

    base_percentage = (sum(item_scores) / len(items)) * 100.0

    # Verification penalties:
    # If there are open conflicts or unreviewed claims, cap completion
    project_id = handover.project_id
    open_conflicts = db.query(EvidenceConflict).filter(
        EvidenceConflict.project_id == project_id,
        EvidenceConflict.status == "open"
    ).count()

    unreviewed_claims = db.query(Claim).filter(
        Claim.project_id == project_id,
        Claim.status.in_(["needs_review", "conflicting_evidence"])
    ).count()

    if open_conflicts > 0:
        base_percentage = min(base_percentage, 75.0)

    if unreviewed_claims > 3:
        base_percentage = min(base_percentage, 85.0)

    handover.completion_percentage = round(base_percentage, 1)
    db.commit()
    return handover.completion_percentage

def approve_and_publish_handover(handover_id: str, reviewer: User, db: Session) -> Dict[str, Any]:
    """
    Final approval and publication of a handover package.
    Only permitted if mandatory checklist items are complete and no open conflicts remain.
    """
    handover = db.query(Handover).filter(Handover.id == handover_id).first()
    if not handover:
        raise ValueError("Handover record not found.")

    # Validation: check for open conflicts
    conflicts = db.query(EvidenceConflict).filter(
        EvidenceConflict.project_id == handover.project_id,
        EvidenceConflict.status == "open"
    ).count()
    if conflicts > 0:
        raise ValueError(f"Cannot approve handover: {conflicts} unresolved evidence conflict(s) exist. Resolve conflicts first.")

    # Check incomplete mandatory items
    mandatory_incomplete = db.query(HandoverChecklistItem).filter(
        HandoverChecklistItem.handover_id == handover_id,
        HandoverChecklistItem.is_mandatory == True,
        HandoverChecklistItem.status != "complete"
    ).count()
    if mandatory_incomplete > 0:
        raise ValueError(f"Cannot approve handover: {mandatory_incomplete} mandatory checklist item(s) are incomplete.")

    now = datetime.utcnow()
    handover.status = "published"
    handover.approved_by_id = reviewer.id
    handover.approved_at = now
    handover.published_at = now
    handover.completion_percentage = 100.0

    # Update project status
    project = db.query(Project).filter(Project.id == handover.project_id).first()
    if project:
        project.status = "handover_approved"

    # Audit log
    audit = AuditEvent(
        project_id=handover.project_id,
        user_id=reviewer.id,
        user_email=reviewer.email,
        action="handover.published",
        entity_type="Handover",
        entity_id=handover.id,
        details=f"Handover v{handover.version} formally approved and published by {reviewer.full_name} ({reviewer.email})."
    )
    db.add(audit)
    db.commit()
    db.refresh(handover)

    return {
        "id": handover.id,
        "status": handover.status,
        "approved_at": handover.approved_at,
        "approved_by_name": reviewer.full_name
    }
