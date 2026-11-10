from typing import List, Tuple
from sqlalchemy.orm import Session
from app.models import Claim, EvidenceConflict, AuditEvent

def scan_project_conflicts(project_id: str, db: Session) -> int:
    """
    Scans project claims for contradictions (dates, owners, architecture choices, deadlines).
    Creates EvidenceConflict records for any detected contradiction, flagging the claims
    with status 'conflicting_evidence'.
    """
    claims = db.query(Claim).filter(
        Claim.project_id == project_id,
        Claim.status != "rejected"
    ).all()
    
    new_conflicts_count = 0
    
    for i in range(len(claims)):
        for j in range(i + 1, len(claims)):
            claim_a = claims[i]
            claim_b = claims[j]
            
            # Check if this pair is already tracked in conflicts
            existing = db.query(EvidenceConflict).filter(
                EvidenceConflict.project_id == project_id,
                ((EvidenceConflict.claim_a_id == claim_a.id) & (EvidenceConflict.claim_b_id == claim_b.id)) |
                ((EvidenceConflict.claim_a_id == claim_b.id) & (EvidenceConflict.claim_b_id == claim_a.id))
            ).first()
            if existing:
                continue

            conflict_info = detect_contradiction(claim_a, claim_b)
            if conflict_info:
                topic, description = conflict_info
                
                # Flag both claims
                if claim_a.status != "verified":
                    claim_a.status = "conflicting_evidence"
                if claim_b.status != "verified":
                    claim_b.status = "conflicting_evidence"
                    
                import uuid
                conflict_id = str(uuid.uuid4())
                conflict = EvidenceConflict(
                    id=conflict_id,
                    project_id=project_id,
                    claim_a_id=claim_a.id,
                    claim_b_id=claim_b.id,
                    topic=topic,
                    description=description,
                    status="open"
                )
                db.add(conflict)
                db.flush()
                
                # Audit
                audit = AuditEvent(
                    id=str(uuid.uuid4()),
                    project_id=project_id,
                    user_email="system.conflict_engine",
                    action="conflict.detected",
                    entity_type="EvidenceConflict",
                    entity_id=conflict_id,
                    details=f"Detected conflict between '{claim_a.title}' and '{claim_b.title}': {topic}"
                )
                db.add(audit)
                new_conflicts_count += 1
                
    db.commit()
    return new_conflicts_count

def detect_contradiction(a: Claim, b: Claim) -> tuple[str, str] | None:
    """
    Evaluates two claims for contradictory dates, incompatible ownership, or conflicting decisions.
    """
    # 1. Date contradiction check
    if a.date_reference and b.date_reference and a.date_reference != b.date_reference:
        words_a = set(re_tokenize((a.title + " " + a.content).lower()))
        words_b = set(re_tokenize((b.title + " " + b.content).lower()))
        overlap = words_a.intersection(words_b)
        
        significant_keywords = {
            "launch", "cutover", "migration", "release", "go-live", "deadline",
            "target", "date", "production", "database", "gateway", "authentication", "api", "project"
        }
        matching_keywords = overlap.intersection(significant_keywords)
        
        if matching_keywords or (a.claim_type == "milestone" and b.claim_type == "milestone"):
            topic_subject = ' / '.join(matching_keywords).title() if matching_keywords else "Target Milestone"
            topic = f"Conflicting Target Date for {topic_subject}"
            desc = (
                f"Claim A ('{a.title}') references date '{a.date_reference}', "
                f"whereas Claim B ('{b.title}') specifies date '{b.date_reference}'. "
                "Both documents provide conflicting operational schedules that must be verified by a human reviewer."
            )
            return (topic, desc)

    # 2. Incompatible ownership assignment
    if a.entity_owner and b.entity_owner and a.entity_owner.lower() != b.entity_owner.lower():
        words_a = set(re_tokenize(a.title.lower()))
        words_b = set(re_tokenize(b.title.lower()))
        overlap = words_a.intersection(words_b)
        significant_keywords = {"launch", "cutover", "migration", "release", "database", "gateway", "authentication", "api", "ledger"}
        matching_keywords = overlap.intersection(significant_keywords)
        if matching_keywords:
            topic = f"Ambiguous Ownership of {' / '.join(matching_keywords).title()}"
            desc = (
                f"Claim A cites '{a.entity_owner}' as responsible, while Claim B indicates '{b.entity_owner}'. "
                "Successor cannot confirm designated account owner without formal reviewer clarification."
            )
            return (topic, desc)

    # 2. Direct architectural choice contradictions
    text_a = (a.title + " " + a.content).lower()
    text_b = (b.title + " " + b.content).lower()
    
    if "database" in text_a and "database" in text_b:
        if ("postgres" in text_a and "dynamodb" in text_b) or ("dynamodb" in text_a and "postgres" in text_b):
            return (
                "Conflicting Database Architecture Decision",
                "One source document asserts PostgreSQL as the selected core database, while another mentions DynamoDB. Human review required to lock approved architecture."
            )

    return None

def re_tokenize(text: str) -> List[str]:
    import re
    return [w for w in re.split(r'[^a-zA-Z0-9]+', text) if len(w) > 3]
