from sqlalchemy.orm import Session
from app.models import Claim, KnowledgeGap, Document

def scan_project_gaps(project_id: str, db: Session) -> int:
    """
    Examines reconstructed project claims and documents to detect knowledge gaps:
    1. Tasks with no designated owner.
    2. Decisions with no stated rationale or explanation.
    3. Critical dependencies with unclear completion criteria.
    4. Mention of undocumented services or processes.
    """
    claims = db.query(Claim).filter(Claim.project_id == project_id, Claim.status != "rejected").all()
    created_count = 0
    
    for claim in claims:
        # Check 1: Unassigned Task
        if claim.claim_type in ["unfinished_task", "in_progress_task"] and not claim.entity_owner:
            existing = db.query(KnowledgeGap).filter(
                KnowledgeGap.project_id == project_id,
                KnowledgeGap.related_claim_id == claim.id,
                KnowledgeGap.gap_type == "unassigned_task"
            ).first()
            if not existing:
                gap = KnowledgeGap(
                    project_id=project_id,
                    title=f"Unassigned Critical Task: {claim.title}",
                    description=f"The task '{claim.content}' has no designated owner identified in project documents. An incoming successor will not know who is driving this work.",
                    gap_type="unassigned_task",
                    related_claim_id=claim.id,
                    recommended_question="Who is currently executing this task and who will be the designated successor upon departure?",
                    status="open"
                )
                db.add(gap)
                created_count += 1

        # Check 2: Decision with no recorded rationale
        if claim.claim_type == "decision" and len(claim.content.split()) < 12:
            existing = db.query(KnowledgeGap).filter(
                KnowledgeGap.project_id == project_id,
                KnowledgeGap.related_claim_id == claim.id,
                KnowledgeGap.gap_type == "ungrounded_decision"
            ).first()
            if not existing:
                gap = KnowledgeGap(
                    project_id=project_id,
                    title=f"Decision Lacks Documented Rationale: {claim.title}",
                    description=f"A major decision was recorded ('{claim.content}'), but the background reasoning, trade-offs, and alternative evaluations were not found.",
                    gap_type="ungrounded_decision",
                    related_claim_id=claim.id,
                    recommended_question="What technical benchmarks or business requirements justified this decision over alternatives?",
                    status="open"
                )
                db.add(gap)
                created_count += 1

        # Check 3: Dependency missing clear owner or status
        if claim.claim_type == "dependency" and not claim.entity_owner:
            existing = db.query(KnowledgeGap).filter(
                KnowledgeGap.project_id == project_id,
                KnowledgeGap.related_claim_id == claim.id,
                KnowledgeGap.gap_type == "unclear_dependency_status"
            ).first()
            if not existing:
                gap = KnowledgeGap(
                    project_id=project_id,
                    title=f"Unmonitored External Dependency: {claim.title}",
                    description=f"The dependency '{claim.content}' has no primary liaison contact. If this external interface fails, no internal owner is accountable.",
                    gap_type="unclear_dependency_status",
                    related_claim_id=claim.id,
                    recommended_question="Which external team or contact person provides the SLA for this dependency?",
                    status="open"
                )
                db.add(gap)
                created_count += 1

    # Check 4: General documentation gap if fewer than 2 documents uploaded
    doc_count = db.query(Document).filter(Document.project_id == project_id).count()
    if doc_count < 2:
        existing_doc_gap = db.query(KnowledgeGap).filter(
            KnowledgeGap.project_id == project_id,
            KnowledgeGap.gap_type == "missing_documentation"
        ).first()
        if not existing_doc_gap:
            gap = KnowledgeGap(
                project_id=project_id,
                title="Single Document Repository Risk",
                description="Project knowledge is currently extracted from a single document. Single-source reconstruction has high risk of omission.",
                gap_type="missing_documentation",
                recommended_question="Can you upload additional architectural diagrams, sprint notes, or operational runbooks?",
                status="open"
            )
            db.add(gap)
            created_count += 1

    db.commit()
    return created_count
