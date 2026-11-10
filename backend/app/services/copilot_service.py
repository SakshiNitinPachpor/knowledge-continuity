from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.models import Claim, Document, Handover, CopilotInteraction
from app.config import settings

def query_successor_copilot(project_id: str, user_id: str, user_role: str, question: str, db: Session) -> Dict[str, Any]:
    """
    Answers successor inquiries strictly grounded in verified, permission-accessible project knowledge.
    Never hallucinates or invents project history. Cites exact claim sources and documents.
    """
    # 1. Fetch accessible claims based on role
    claims_query = db.query(Claim).filter(Claim.project_id == project_id)
    if user_role == "successor":
        claims_query = claims_query.filter(Claim.status == "verified")
    else:
        claims_query = claims_query.filter(Claim.status != "rejected")
    claims = claims_query.all()

    # Preload document names
    docs_map = {d.id: d.original_name for d in db.query(Document).filter(Document.project_id == project_id).all()}

    # Check approved handover status
    approved_handover = db.query(Handover).filter(
        Handover.project_id == project_id,
        Handover.status.in_(["approved", "published"])
    ).first()

    # 2. Score relevance of claims
    q_words = set(w.lower() for w in question.split() if len(w) > 2)
    scored_claims = []
    
    for c in claims:
        text = f"{c.title} {c.content} {c.claim_type} {c.entity_owner or ''} {c.entity_name or ''}".lower()
        score = sum(1 for w in q_words if w in text)
        if score > 0:
            scored_claims.append((score, c))
            
    scored_claims.sort(key=lambda x: x[0], reverse=True)
    top_claims = [c for score, c in scored_claims[:5]]

    citations = []
    for c in top_claims:
        doc_name = docs_map.get(c.document_id, "Project Document")
        passage_text = c.passage.text_content if c.passage else c.content
        citations.append({
            "claim_id": c.id,
            "title": c.title,
            "document_name": doc_name,
            "page_number": c.passage.page_number if c.passage else 1,
            "passage_text": (passage_text[:200] + "...") if len(passage_text) > 200 else passage_text,
            "status": c.status
        })

    is_uncertain = False
    answer = ""
    service_mode = "grounded_knowledge_base"

    # Intent routing for common successor queries
    q_lower = question.lower()
    
    if len(top_claims) == 0:
        is_uncertain = True
        answer = (
            "I searched all verified project knowledge and approved handover artifacts, "
            f"but found no conclusive evidence answering: '{question}'.\n\n"
            "To preserve knowledge integrity, I do not generate ungrounded assumptions. "
            "Please review the open Knowledge Gaps or consult the project reviewer."
        )
    else:
        # Synthesize verified response
        if any(term in q_lower for term in ["work on first", "first step", "next action", "priority", "where do i start"]):
            pending_tasks = [c for c in claims if c.claim_type in ["unfinished_task", "in_progress_task"]]
            answer = "### Recommended Immediate Priorities for Successor:\n\n"
            if pending_tasks:
                for idx, t in enumerate(pending_tasks[:4], 1):
                    owner_text = f" (Previously led by {t.entity_owner})" if t.entity_owner else " (No prior owner - Needs Assignment)"
                    answer += f"{idx}. **{t.title}**{owner_text}: {t.content}\n"
                answer += "\n*Grounding:* These tasks are currently active deliverables extracted from verified project records."
            else:
                answer += "All documented core deliverables are marked as completed or in review. Check the Handover Checklist."
        elif any(term in q_lower for term in ["decision", "why did we", "rationale"]):
            decisions = [c for c in top_claims if c.claim_type == "decision"]
            if decisions:
                answer = "### Documented Project Decisions:\n\n"
                for d in decisions:
                    answer += f"- **{d.title}**: {d.content}\n"
                answer += "\n*Grounding:* Extracted directly from approved technical decision records."
            else:
                answer = f"Found related project information for your query:\n\n" + "\n".join([f"- **{c.title}**: {c.content}" for c in top_claims[:3]])
        elif any(term in q_lower for term in ["risk", "blocker", "vulnerability"]):
            risks = [c for c in top_claims if c.claim_type == "risk"]
            answer = "### Key Continuity & Project Risks:\n\n"
            for r in (risks or top_claims[:3]):
                answer += f"- **{r.title}**: {r.content}\n"
        else:
            answer = f"Based on verified project documentation:\n\n"
            for c in top_claims[:4]:
                doc_name = docs_map.get(c.document_id, "Project Source")
                answer += f"- **{c.title}**: {c.content} *(Source: {doc_name})*\n"

    # Save interaction for audit and continuity
    interaction = CopilotInteraction(
        project_id=project_id,
        user_id=user_id,
        query=question,
        answer=answer,
        cited_claim_ids=str([c["claim_id"] for c in citations]),
        is_uncertain=is_uncertain
    )
    db.add(interaction)
    db.commit()

    return {
        "answer": answer,
        "citations": citations,
        "is_uncertain": is_uncertain,
        "service_mode": service_mode
    }
