import json
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import (
    Handover, HandoverChecklistItem, User, Project,
    AuditEvent, EvidenceConflict, Claim, KnowledgeGap,
    ProjectResponsibility, Document
)
from app.schemas import (
    HandoverOut, HandoverChecklistItemOut, HandoverChecklistUpdate,
    HandoverDetailsUpdate, HandoverChangeRequest, HandoverAcknowledgeRequest
)
from app.services.auth_service import get_current_user
from app.services.rbac import (
    require_project_role, get_user_project_role, check_can_view_handover
)
from app.services.handover_service import (
    get_or_create_handover, sync_handover_completion
)
from app.services.pdf_export import generate_handover_pdf

router = APIRouter(prefix="/projects/{project_id}/handover", tags=["Handover Management"])

def run_ai_handover_verification(project_id: str, db: Session) -> List[Dict[str, Any]]:
    """
    Automated AI-assisted verification checking project completeness,
    grounding, and readiness before Project Creator approval.
    AI PROVIDES FINDINGS AND EVIDENCE; AI NEVER APPROVES THE HANDOVER.
    """
    findings: List[Dict[str, Any]] = []

    # 1. Document Coverage
    doc_count = db.query(Document).filter(Document.project_id == project_id).count()
    if doc_count == 0:
        findings.append({
            "category": "Documentation",
            "finding": "Zero project documents or repositories uploaded.",
            "severity": "critical",
            "evidence": "Project repository empty. Upload architecture specifications or source code."
        })
    else:
        findings.append({
            "category": "Documentation",
            "finding": f"{doc_count} source document(s) and repositories indexed.",
            "severity": "info",
            "evidence": f"Repository contains {doc_count} verified document assets."
        })

    # 2. Responsibility Assignments
    resps = db.query(ProjectResponsibility).filter(ProjectResponsibility.project_id == project_id).all()
    unconfirmed_resps = [r for r in resps if r.status == "needs_confirmation"]
    if unconfirmed_resps:
        findings.append({
            "category": "Responsibilities",
            "finding": f"{len(unconfirmed_resps)} component ownerships remain unconfirmed by human leads.",
            "severity": "warning",
            "evidence": f"Unconfirmed areas: {', '.join([r.area for r in unconfirmed_resps[:3]])}"
        })
    elif len(resps) == 0:
        findings.append({
            "category": "Responsibilities",
            "finding": "No component responsibilities mapped for successor transition.",
            "severity": "warning",
            "evidence": "Populate the Responsibility Matrix to assign lead owners."
        })
    else:
        findings.append({
            "category": "Responsibilities",
            "finding": f"All {len(resps)} component responsibilities confirmed with evidence.",
            "severity": "info",
            "evidence": "Human leads verified ownership matrix."
        })

    # 3. Contradictory Evidence
    open_conflicts = db.query(EvidenceConflict).filter(
        EvidenceConflict.project_id == project_id,
        EvidenceConflict.status == "open"
    ).all()
    if open_conflicts:
        findings.append({
            "category": "Evidence Grounding",
            "finding": f"{len(open_conflicts)} contradictory evidence conflict(s) detected.",
            "severity": "critical",
            "evidence": f"Conflicting topics: {', '.join([c.topic for c in open_conflicts[:2]])}"
        })

    # 4. Unreviewed Claims
    unreviewed = db.query(Claim).filter(
        Claim.project_id == project_id,
        Claim.status.in_(["needs_review", "missing_evidence"])
    ).count()
    if unreviewed > 0:
        findings.append({
            "category": "Evidence Grounding",
            "finding": f"{unreviewed} candidate claims await human verification.",
            "severity": "warning",
            "evidence": "Review claims in Evidence Review Centre to guarantee ground truth."
        })

    # 5. Open Knowledge Gaps
    open_gaps = db.query(KnowledgeGap).filter(
        KnowledgeGap.project_id == project_id,
        KnowledgeGap.status == "open"
    ).count()
    if open_gaps > 0:
        findings.append({
            "category": "Knowledge Continuity",
            "finding": f"{open_gaps} unresolved technical knowledge gaps flagged.",
            "severity": "warning",
            "evidence": "Address open questions before outgoing contributor departure."
        })

    return findings

def serialize_handover(handover: Handover, db: Session) -> HandoverOut:
    items = [
        HandoverChecklistItemOut(
            id=item.id,
            handover_id=item.handover_id,
            category=item.category,
            item_name=item.item_name,
            is_mandatory=item.is_mandatory,
            status=item.status,
            details=item.details or ""
        )
        for item in handover.checklist_items
    ]

    project = db.query(Project).filter(Project.id == handover.project_id).first()
    creator_name = project.creator.full_name if (project and project.creator) else "Project Creator"
    creator_id = project.created_by_id if project else ""

    # Clear status strings
    if handover.status in ["approved", "published", "received"]:
        ver_status = "Approved"
    elif handover.status == "submitted":
        ver_status = "Pending"
    elif handover.status == "changes_requested":
        ver_status = "Changes Requested"
    else:
        ver_status = "Draft"

    pub_status = "Published" if handover.status in ["published", "received"] else "Not Published"
    ack_status = "Received" if handover.status == "received" else "Pending"

    ai_findings = run_ai_handover_verification(handover.project_id, db)

    return HandoverOut(
        id=handover.id,
        project_id=handover.project_id,
        project_name=project.name if project else "",
        project_creator_id=creator_id,
        project_creator_name=creator_name,
        title=handover.title,
        status=handover.status,
        summary=handover.summary or "",
        completion_percentage=handover.completion_percentage,
        version=handover.version,
        outgoing_member_id=handover.outgoing_member_id,
        outgoing_member_name=handover.outgoing_member.full_name if handover.outgoing_member else None,
        submitted_at=handover.submitted_at,
        approved_by_id=handover.approved_by_id,
        approved_by_name=handover.approved_by.full_name if handover.approved_by else None,
        approved_at=handover.approved_at,
        published_by_id=handover.published_by_id,
        published_by_name=handover.published_by.full_name if handover.published_by else None,
        published_at=handover.published_at,
        received_by_id=handover.received_by_id,
        received_by_name=handover.received_by.full_name if handover.received_by else None,
        received_at=handover.received_at,
        change_request_notes=handover.change_request_notes or "",
        successor_notes=handover.successor_notes or "",
        verification_status=ver_status,
        publication_status=pub_status,
        acknowledgement_status=ack_status,
        history_json=handover.history_json or "[]",
        ai_findings=ai_findings,
        created_at=handover.created_at,
        checklist_items=items
    )

@router.get("", response_model=HandoverOut)
def get_handover(project_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_project_role(project_id, current_user, "successor", db)
    user_role = get_user_project_role(project_id, current_user.id, db)
    
    handover = get_or_create_handover(project_id, db)
    
    # Successor role check: cannot view unapproved drafts
    if not check_can_view_handover(handover.status, user_role):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The official handover package is currently in review and has not yet been approved and published for successor access."
        )
        
    return serialize_handover(handover, db)

@router.get("/ai-check")
def get_ai_check(project_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_project_role(project_id, current_user, "contributor", db)
    findings = run_ai_handover_verification(project_id, db)
    return {
        "status": "success",
        "findings": findings,
        "total_checks": len(findings)
    }

@router.put("/checklist/{item_id}", response_model=HandoverChecklistItemOut)
def update_checklist_item(
    project_id: str,
    item_id: str,
    update_in: HandoverChecklistUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_project_role(project_id, current_user, "reviewer", db)
    item = db.query(HandoverChecklistItem).filter(HandoverChecklistItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Checklist item not found.")

    valid_statuses = ["complete", "incomplete", "needs_review", "blocked"]
    if update_in.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Choose from: {valid_statuses}")

    item.status = update_in.status
    if update_in.details is not None:
        item.details = update_in.details

    db.commit()
    db.refresh(item)

    # Recalculate percentage
    sync_handover_completion(item.handover_id, db)

    return HandoverChecklistItemOut(
        id=item.id,
        handover_id=item.handover_id,
        category=item.category,
        item_name=item.item_name,
        is_mandatory=item.is_mandatory,
        status=item.status,
        details=item.details or ""
    )

@router.put("/details", response_model=HandoverOut)
def update_handover_details(
    project_id: str,
    details_in: HandoverDetailsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_project_role(project_id, current_user, "contributor", db)
    handover = get_or_create_handover(project_id, db)

    if details_in.title is not None:
        handover.title = details_in.title
    if details_in.summary is not None:
        handover.summary = details_in.summary

    db.commit()
    db.refresh(handover)
    return serialize_handover(handover, db)

@router.post("/submit", response_model=HandoverOut)
def submit_handover_for_review(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_project_role(project_id, current_user, "contributor", db)
    handover = get_or_create_handover(project_id, db)

    now = datetime.utcnow()
    handover.status = "submitted"
    handover.outgoing_member_id = current_user.id
    handover.submitted_at = now
    db.commit()
    db.refresh(handover)

    project = db.query(Project).filter(Project.id == project_id).first()
    creator_name = project.creator.full_name if (project and project.creator) else "Project Creator"

    # Audit Event
    db.add(AuditEvent(
        project_id=project_id,
        user_id=current_user.id,
        user_email=current_user.email,
        action="handover.submitted_for_review",
        entity_type="Handover",
        entity_id=handover.id,
        details=f"Handover v{handover.version} submitted by {current_user.full_name} for verification by {creator_name}."
    ))
    db.commit()

    return serialize_handover(handover, db)

@router.post("/request-changes", response_model=HandoverOut)
def request_handover_changes(
    project_id: str,
    request_in: HandoverChangeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    # Project Creator = Project Owner = Final Approver
    if project.created_by_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Only the original project creator ({project.creator.full_name if project.creator else 'Project Creator'}) can request changes on the handover package."
        )

    handover = get_or_create_handover(project_id, db)

    # Save to version history
    history = []
    if handover.history_json:
        try:
            history = json.loads(handover.history_json)
        except Exception:
            history = []
    history.append({
        "version": handover.version,
        "action": "changes_requested",
        "requested_by": current_user.full_name,
        "notes": request_in.notes,
        "timestamp": datetime.utcnow().isoformat()
    })
    handover.history_json = json.dumps(history)

    handover.status = "changes_requested"
    handover.change_request_notes = request_in.notes
    db.commit()
    db.refresh(handover)

    db.add(AuditEvent(
        project_id=project_id,
        user_id=current_user.id,
        user_email=current_user.email,
        action="handover.changes_requested",
        entity_type="Handover",
        entity_id=handover.id,
        details=f"Project Creator {current_user.full_name} requested corrections: {request_in.notes}"
    ))
    db.commit()

    return serialize_handover(handover, db)

@router.post("/approve", response_model=HandoverOut)
def approve_handover(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    CRITICAL BUSINESS RULE:
    Project Creator = Project Owner = Final Handover Approver.
    Only the original creator of this specific project can approve the handover.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    if project.created_by_id != current_user.id and not current_user.is_superuser:
        creator_name = project.creator.full_name if project.creator else "Project Creator"
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Only the original project creator ({creator_name}) can formally approve the handover package."
        )

    handover = get_or_create_handover(project_id, db)

    # Validation: check for open conflicts
    conflicts = db.query(EvidenceConflict).filter(
        EvidenceConflict.project_id == project_id,
        EvidenceConflict.status == "open"
    ).count()
    if conflicts > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot approve handover: {conflicts} unresolved evidence conflict(s) exist. Resolve conflicts first."
        )

    # Validation: check incomplete mandatory items
    mandatory_incomplete = db.query(HandoverChecklistItem).filter(
        HandoverChecklistItem.handover_id == handover.id,
        HandoverChecklistItem.is_mandatory == True,
        HandoverChecklistItem.status != "complete"
    ).count()
    if mandatory_incomplete > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot approve handover: {mandatory_incomplete} mandatory checklist item(s) are incomplete."
        )

    now = datetime.utcnow()
    # Distinct Approved state (Not yet published until release action)
    handover.status = "approved"
    handover.approved_by_id = current_user.id
    handover.approved_at = now
    handover.completion_percentage = 100.0

    project.status = "handover_approved"

    # Save to history
    history = []
    if handover.history_json:
        try:
            history = json.loads(handover.history_json)
        except Exception:
            history = []
    history.append({
        "version": handover.version,
        "action": "approved",
        "approved_by": current_user.full_name,
        "timestamp": now.isoformat()
    })
    handover.history_json = json.dumps(history)

    db.commit()
    db.refresh(handover)

    # Audit Event
    db.add(AuditEvent(
        project_id=project_id,
        user_id=current_user.id,
        user_email=current_user.email,
        action="handover.approved",
        entity_type="Handover",
        entity_id=handover.id,
        details=f"Handover v{handover.version} formally approved by Project Creator {current_user.full_name}."
    ))
    db.commit()

    return serialize_handover(handover, db)

@router.post("/publish", response_model=HandoverOut)
def publish_handover(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    PUBLISHING: Officially releases an approved handover package to the successor.
    Only approved handovers can be published.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    if project.created_by_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the Project Creator can publish the approved handover package."
        )

    handover = get_or_create_handover(project_id, db)

    if handover.status not in ["approved", "published", "received"]:
        raise HTTPException(
            status_code=400,
            detail="Cannot publish handover: Package must first be formally approved by the Project Creator."
        )

    now = datetime.utcnow()
    handover.status = "published"
    handover.published_by_id = current_user.id
    handover.published_at = now

    # Save to history
    history = []
    if handover.history_json:
        try:
            history = json.loads(handover.history_json)
        except Exception:
            history = []
    history.append({
        "version": handover.version,
        "action": "published",
        "published_by": current_user.full_name,
        "timestamp": now.isoformat()
    })
    handover.history_json = json.dumps(history)

    db.commit()
    db.refresh(handover)

    # Audit Event
    db.add(AuditEvent(
        project_id=project_id,
        user_id=current_user.id,
        user_email=current_user.email,
        action="handover.published",
        entity_type="Handover",
        entity_id=handover.id,
        details=f"Handover v{handover.version} released and published to successor by {current_user.full_name}."
    ))
    db.commit()

    return serialize_handover(handover, db)

@router.post("/receive", response_model=HandoverOut)
@router.post("/acknowledge", response_model=HandoverOut)
def receive_and_acknowledge_handover(
    project_id: str,
    ack_in: Optional[HandoverAcknowledgeRequest] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_project_role(project_id, current_user, "successor", db)
    handover = get_or_create_handover(project_id, db)

    if handover.status not in ["published", "received"]:
        raise HTTPException(
            status_code=400,
            detail="Cannot acknowledge a handover that has not yet been approved and published."
        )

    now = datetime.utcnow()
    handover.status = "received"
    handover.received_by_id = current_user.id
    handover.received_at = now
    if ack_in and ack_in.notes:
        handover.successor_notes = ack_in.notes

    # Save to history
    history = []
    if handover.history_json:
        try:
            history = json.loads(handover.history_json)
        except Exception:
            history = []
    history.append({
        "version": handover.version,
        "action": "received",
        "received_by": current_user.full_name,
        "notes": handover.successor_notes,
        "timestamp": now.isoformat()
    })
    handover.history_json = json.dumps(history)

    db.commit()
    db.refresh(handover)

    db.add(AuditEvent(
        project_id=project_id,
        user_id=current_user.id,
        user_email=current_user.email,
        action="handover.received_and_acknowledged",
        entity_type="Handover",
        entity_id=handover.id,
        details=f"Successor {current_user.full_name} acknowledged and received the handover."
    ))
    db.commit()

    return serialize_handover(handover, db)

@router.get("/export-pdf")
@router.get("/pdf")
def export_pdf(project_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_project_role(project_id, current_user, "successor", db)
    user_role = get_user_project_role(project_id, current_user.id, db)
    
    handover = get_or_create_handover(project_id, db)
    if not check_can_view_handover(handover.status, user_role):
        raise HTTPException(
            status_code=403,
            detail="Cannot export unapproved handover package as a successor."
        )

    pdf_buffer = generate_handover_pdf(project_id, db)
    filename = f"Handover_Report_{project_id[:8]}.pdf"
    
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
