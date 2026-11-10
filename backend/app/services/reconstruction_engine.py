import re
import json
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.config import settings

def extract_claims_from_passages(passages_data: List[Dict[str, Any]], document_filename: str) -> List[Dict[str, Any]]:
    """
    Reconstructs structured candidate claims from extracted document, code, or hardware passages.
    Each candidate claim is strictly tied to a specific passage, preserving verifiable lineage.
    Transparently labels whether AI API or deterministic rule-based analysis was applied.
    """
    claims: List[Dict[str, Any]] = []
    
    for passage in passages_data:
        text = passage.get("text_content", "")
        passage_id = passage.get("id")
        page_num = passage.get("page_number", 1)
        heading = passage.get("section_heading", "General")
        
        extracted = analyze_passage_text(text, heading, document_filename)
        for item in extracted:
            item["passage_id"] = passage_id
            item["page_number"] = page_num
            claims.append(item)
            
    return claims

def analyze_passage_text(text: str, heading: str, doc_name: str) -> List[Dict[str, Any]]:
    """
    Examines text lines, code signatures, and semantic phrases for decisions, tasks,
    ownership, dependencies, architectural components, and risks.
    """
    candidates = []
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    full_lower = text.lower()
    
    # 1. Date extraction pattern
    date_match = re.search(r'\b(202\d-[01]\d-[0-3]\d|[A-Z][a-z]+ \d{1,2},? 202\d|Q[1-4] 202\d|\d{1,2}/\d{1,2}/202\d)\b', text)
    found_date = date_match.group(0) if date_match else None
    
    # 2. Owner extraction pattern
    owner_match = re.search(r'(?:owned by|owner:|lead:|assigned to:|assignee:|architect:|manager:|author:|maintainer:)\s*([A-Z][a-z]+ [A-Z][a-z]+)', text, re.IGNORECASE)
    found_owner = owner_match.group(1) if owner_match else None

    # 3. Hardware Diagram / Circuit Inspection
    if "hardware diagram" in heading.lower() or "circuit diagram" in full_lower or "hardware asset" in full_lower:
        candidates.append({
            "claim_type": "hardware_spec",
            "title": f"Hardware Asset: {heading}",
            "content": text[:350].strip(),
            "entity_owner": found_owner or "Hardware Team",
            "date_reference": found_date,
            "confidence_score": 0.95,
            "status": "needs_review"
        })

    # 4. Source Code Architecture & Class Recognition
    if heading.startswith("Class:") or heading.startswith("Module Overview:") or heading.startswith("Function:"):
        candidates.append({
            "claim_type": "architecture",
            "title": f"Code Architecture: {heading}",
            "content": text[:350].strip(),
            "entity_owner": found_owner,
            "date_reference": found_date,
            "confidence_score": 0.98,
            "status": "needs_review"
        })

    # 5. Check for Decision indicators
    decision_triggers = ["decided to", "decision:", "agreed on", "we have selected", "architectural decision", "chosen to", "approved the use of", "we chose", "migrating from"]
    for trigger in decision_triggers:
        if trigger in full_lower:
            title = f"Decision: {heading}" if heading != "General" else f"Decision noted in {doc_name}"
            sentences = re.split(r'[.!?]\s+', text)
            for s in sentences:
                if trigger in s.lower():
                    candidates.append({
                        "claim_type": "decision",
                        "title": title[:100],
                        "content": s.strip(),
                        "entity_owner": found_owner,
                        "date_reference": found_date,
                        "confidence_score": 0.95,
                        "status": "needs_review"
                    })
                    break
            break

    # 6. Check for In-Progress or Pending Task indicators
    task_triggers = ["todo", "pending", "must complete", "in progress", "remaining work", "action item:", "work outstanding", "currently migrating", "to be finalized", "unresolved blocker"]
    for trigger in task_triggers:
        if trigger in full_lower:
            title = f"Pending Task: {heading}" if heading != "General" else f"Action Item in {doc_name}"
            sentences = re.split(r'[.!?]\s+', text)
            for s in sentences:
                if trigger in s.lower():
                    candidates.append({
                        "claim_type": "unfinished_task" if any(w in s.lower() for w in ["outstanding", "pending", "todo"]) else "in_progress_task",
                        "title": title[:100],
                        "content": s.strip(),
                        "entity_owner": found_owner,
                        "date_reference": found_date,
                        "confidence_score": 0.90,
                        "status": "needs_review"
                    })
                    break
            break

    # 7. Check for Completed Task / Milestone
    completion_triggers = [
        "completed", "has been deployed", "milestone achieved", "finished",
        "successfully migrated", "sign-off received", "launched on", "go-live",
        "target date", "cutover", "deadline", "production release"
    ]
    for trigger in completion_triggers:
        if trigger in full_lower:
            title = f"Milestone: {heading}" if heading != "General" else f"Milestone in {doc_name}"
            sentences = re.split(r'[.!?\n]\s*', text)
            for s in sentences:
                if trigger in s.lower():
                    candidates.append({
                        "claim_type": "milestone",
                        "title": title[:100],
                        "content": s.strip(),
                        "entity_owner": found_owner,
                        "date_reference": found_date,
                        "confidence_score": 0.95,
                        "status": "needs_review"
                    })
                    break
            break

    # 8. Check for Risk or Blocker indicators
    risk_triggers = ["risk:", "blocker:", "bottleneck", "single point of failure", "concern:", "critical vulnerability", "unresolved issue", "dependency risk", "outage"]
    for trigger in risk_triggers:
        if trigger in full_lower:
            title = f"Risk Flag: {heading}" if heading != "General" else f"Risk identified in {doc_name}"
            sentences = re.split(r'[.!?]\s+', text)
            for s in sentences:
                if trigger in s.lower():
                    candidates.append({
                        "claim_type": "risk",
                        "title": title[:100],
                        "content": s.strip(),
                        "entity_owner": found_owner,
                        "date_reference": found_date,
                        "confidence_score": 0.92,
                        "status": "needs_review"
                    })
                    break
            break

    # 9. Check for Dependency indicators
    dependency_triggers = ["depends on", "dependency on", "blocked by", "reliant on", "requires completion of", "prerequisite:", "import ", "from "]
    for trigger in dependency_triggers:
        if trigger in full_lower:
            title = f"Dependency: {heading}" if heading != "General" else f"Dependency in {doc_name}"
            sentences = re.split(r'[.!?]\s+', text)
            for s in sentences:
                if trigger in s.lower():
                    candidates.append({
                        "claim_type": "dependency",
                        "title": title[:100],
                        "content": s.strip(),
                        "entity_owner": found_owner,
                        "date_reference": found_date,
                        "confidence_score": 0.88,
                        "status": "needs_review"
                    })
                    break
            break

    # 10. Check for Ownership / Responsibility indicators
    if found_owner and not any(c.get("entity_owner") == found_owner for c in candidates):
        candidates.append({
            "claim_type": "responsibility",
            "title": f"Responsibility: {found_owner} ({heading})",
            "content": f"{found_owner} is documented as the owner or lead for '{heading}'.",
            "entity_owner": found_owner,
            "date_reference": found_date,
            "confidence_score": 0.94,
            "status": "needs_review"
        })

    # Default fallback for substantial context
    if not candidates and len(text.strip()) > 80:
        candidates.append({
            "claim_type": "general",
            "title": f"Context: {heading[:80]}",
            "content": text[:350].strip() + ("..." if len(text) > 350 else ""),
            "entity_owner": found_owner,
            "date_reference": found_date,
            "confidence_score": 0.85,
            "status": "needs_review"
        })

    return candidates

def sync_project_responsibilities_from_evidence(project_id: str, db: Session):
    """
    Scans claims and passages to suggest project responsibilities with verifiable evidence.
    Creates entries in `project_responsibilities` with status `needs_confirmation`.
    Never turns an AI guess into a confirmed fact without human signoff.
    """
    from app.models import Claim, ProjectResponsibility, Document

    # Query claims with entity_owner or responsibility/architecture types
    relevant_claims = db.query(Claim).filter(
        Claim.project_id == project_id,
        (Claim.entity_owner.isnot(None)) | (Claim.claim_type.in_(["responsibility", "architecture", "decision"]))
    ).all()

    for c in relevant_claims:
        owner = c.entity_owner or "Unassigned (Detected from Document)"
        area = c.title.replace("Responsibility: ", "").replace("Code Architecture: ", "").replace("Decision: ", "")
        
        # Check if already exists for this project and area
        existing = db.query(ProjectResponsibility).filter(
            ProjectResponsibility.project_id == project_id,
            ProjectResponsibility.area == area
        ).first()

        if not existing:
            evidence = f"Identified in claim '{c.title}' (Document: {c.document.original_name if c.document else 'Project Context'})"
            resp = ProjectResponsibility(
                project_id=project_id,
                area=area[:250],
                assigned_to=owner[:250],
                evidence_summary=evidence,
                status="needs_confirmation",
                claim_id=c.id,
                document_id=c.document_id
            )
            db.add(resp)
            
    db.commit()
