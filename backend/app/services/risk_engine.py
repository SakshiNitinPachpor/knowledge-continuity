from collections import Counter
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.models import Project, Claim, Risk, KnowledgeGap, EvidenceConflict, Document

def calculate_departure_risk_score(project_id: str, db: Session) -> Dict[str, Any]:
    """
    Computes an explainable Knowledge Continuity & Departure Exposure Risk Score (0 - 100).
    Breakdown of deterministic factors:
    1. Key Person Concentration (up to 30 pts): If > 40% of tasks/decisions are tied to a single individual.
    2. Unfinished Tasks / High Work In Progress (up to 20 pts): Proportion of tasks uncompleted.
    3. Unverified Knowledge Claims (up to 20 pts): Claims still in 'needs_review' or 'missing_evidence'.
    4. Unresolved Evidence Conflicts (up to 15 pts): Unresolved contradictory documentation.
    5. Open Knowledge Gaps (up to 15 pts): Missing owners, missing rationale, lack of documentation.
    """
    claims = db.query(Claim).filter(Claim.project_id == project_id, Claim.status != "rejected").all()
    conflicts = db.query(EvidenceConflict).filter(EvidenceConflict.project_id == project_id, EvidenceConflict.status == "open").all()
    gaps = db.query(KnowledgeGap).filter(KnowledgeGap.project_id == project_id, KnowledgeGap.status == "open").all()
    doc_count = db.query(Document).filter(Document.project_id == project_id).count()

    total_claims = len(claims)
    if total_claims == 0:
        return {
            "overall_score": 50.0,
            "category": "Moderate Continuity Risk",
            "explanation": "No documents or verified claims processed yet.",
            "factors": []
        }

    factors: List[Dict[str, Any]] = []
    total_score = 0.0

    # Factor 1: Key Person Concentration (Max 30 pts)
    owners = [c.entity_owner for c in claims if c.entity_owner]
    if owners:
        counts = Counter(owners)
        most_common_person, top_count = counts.most_common(1)[0]
        concentration_ratio = top_count / len(owners)
        if concentration_ratio > 0.4:
            f1_score = min(30.0, round(concentration_ratio * 35.0, 1))
            total_score += f1_score
            factors.append({
                "factor_name": "Key Person Knowledge Concentration",
                "score_contribution": f1_score,
                "severity": "critical" if f1_score > 20 else "high",
                "evidence": f"'{most_common_person}' is tied to {top_count} of {len(owners)} assigned items ({int(concentration_ratio*100)}% concentration).",
                "impact": f"If {most_common_person} becomes unavailable or departs without an explicit shadowing period, institutional memory will collapse.",
                "mitigation": f"Initiate structured paired shadowing with successor for all tasks owned by {most_common_person} immediately."
            })
    else:
        # No owners identified at all is also high risk
        total_score += 15.0
        factors.append({
            "factor_name": "Unspecified Task Ownership",
            "score_contribution": 15.0,
            "severity": "high",
            "evidence": "No clear individual assignees identified in processed project documentation.",
            "impact": "Accountability void for incoming successor.",
            "mitigation": "Review claim list and assign named project owners to each pending deliverable."
        })

    # Factor 2: Unfinished Work & In-Progress tasks (Max 20 pts)
    unfinished_claims = [c for c in claims if c.claim_type in ["unfinished_task", "in_progress_task"]]
    unfinished_ratio = len(unfinished_claims) / max(1, total_claims)
    f2_score = min(20.0, round(unfinished_ratio * 30.0, 1))
    total_score += f2_score
    if len(unfinished_claims) > 0:
        factors.append({
            "factor_name": "Unfinished Work In Progress",
            "score_contribution": f2_score,
            "severity": "medium" if f2_score < 12 else "high",
            "evidence": f"{len(unfinished_claims)} items remain pending or in-progress.",
            "impact": "Successor inherits active flight deliverables without complete operational playbooks.",
            "mitigation": "Ensure handover checklist requires step-by-step next action guides for each pending item."
        })

    # Factor 3: Unverified Claims / Lack of Human Review (Max 20 pts)
    unreviewed_claims = [c for c in claims if c.status in ["needs_review", "missing_evidence"]]
    unreviewed_ratio = len(unreviewed_claims) / max(1, total_claims)
    f3_score = min(20.0, round(unreviewed_ratio * 20.0, 1))
    total_score += f3_score
    if len(unreviewed_claims) > 0:
        factors.append({
            "factor_name": "Unverified Reconstructed Knowledge",
            "score_contribution": f3_score,
            "severity": "medium" if f3_score < 10 else "high",
            "evidence": f"{len(unreviewed_claims)} of {total_claims} claims await human reviewer verification.",
            "impact": "Successor might rely on unverified assumptions or ambiguous documentation.",
            "mitigation": "Review and mark claims as Verified or Rejected in the Evidence Review Centre."
        })

    # Factor 4: Evidence Conflicts (Max 15 pts)
    if conflicts:
        f4_score = min(15.0, len(conflicts) * 5.0)
        total_score += f4_score
        factors.append({
            "factor_name": "Contradictory Source Evidence",
            "score_contribution": f4_score,
            "severity": "critical" if len(conflicts) > 1 else "high",
            "evidence": f"{len(conflicts)} unresolved contradiction(s) detected between project documents.",
            "impact": "Direct operational confusion regarding target launch dates or architectural stack.",
            "mitigation": "Resolve open conflicts in the Evidence Review Centre."
        })

    # Factor 5: Knowledge Gaps (Max 15 pts)
    if gaps:
        f5_score = min(15.0, len(gaps) * 3.5)
        total_score += f5_score
        factors.append({
            "factor_name": "Identified Knowledge Gaps",
            "score_contribution": f5_score,
            "severity": "medium" if f5_score < 8 else "high",
            "evidence": f"{len(gaps)} knowledge gaps detected (unassigned tasks, undocumented decisions).",
            "impact": "Missing context prevents independent execution by successor.",
            "mitigation": "Answer recommended gap resolution questions and document context."
        })

    overall_score = min(100.0, max(0.0, round(total_score, 1)))
    
    if overall_score >= 65:
        category = "High Exposure Risk"
    elif overall_score >= 35:
        category = "Moderate Exposure Risk"
    else:
        category = "Low Continuity Risk"

    # Persist the score on the project record
    project = db.query(Project).filter(Project.id == project_id).first()
    if project:
        project.continuity_risk_score = overall_score
        db.commit()

    return {
        "overall_score": overall_score,
        "category": category,
        "explanation": "Calculated based on key-person dependency, unfinished work, unverified claims, documentation conflicts, and knowledge gaps.",
        "factors": factors
    }

def sync_project_risks(project_id: str, db: Session) -> int:
    """
    Synchronizes AI Risk Radar items from extracted claims and calculated exposure factors.
    """
    claims = db.query(Claim).filter(Claim.project_id == project_id, Claim.status != "rejected").all()
    created_count = 0
    
    # 1. Single Person Dependency Risk
    owners = [c.entity_owner for c in claims if c.entity_owner]
    if owners:
        counts = Counter(owners)
        top_person, count = counts.most_common(1)[0]
        if count >= 3:
            existing = db.query(Risk).filter(
                Risk.project_id == project_id,
                Risk.category == "single_person_dependency"
            ).first()
            if not existing:
                r = Risk(
                    project_id=project_id,
                    title=f"Single-Person Knowledge Bottleneck: {top_person}",
                    description=f"{top_person} is the sole documented owner for {count} critical architectural decisions and deliverables.",
                    category="single_person_dependency",
                    severity="critical" if count >= 4 else "high",
                    impact="Successor cannot resolve architecture or infrastructure incidents without this individual's undocumented mental model.",
                    suggested_mitigation=f"Conduct recorded deep-dive walkthroughs with {top_person} and co-author technical runbooks.",
                    status="identified"
                )
                db.add(r)
                created_count += 1

    # 2. Convert explicit risk claims to Risk radar items
    risk_claims = [c for c in claims if c.claim_type == "risk"]
    for rc in risk_claims:
        existing = db.query(Risk).filter(
            Risk.project_id == project_id,
            Risk.evidence_claim_id == rc.id
        ).first()
        if not existing:
            r = Risk(
                project_id=project_id,
                title=rc.title,
                description=rc.content,
                category="unresolved_blocker",
                severity="high",
                impact="Potential release blocker or operational instability during handover.",
                suggested_mitigation="Establish fallback procedure and verify disaster recovery protocols.",
                evidence_claim_id=rc.id,
                status="identified"
            )
            db.add(r)
            created_count += 1

    db.commit()
    return created_count
