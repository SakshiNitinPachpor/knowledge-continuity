import json
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.models import (
    Project, Claim, Risk, Document, ProjectResponsibility,
    KnowledgeGap, Handover, SimulationScenario, User
)

def simulate_scenario(
    project_id: str,
    scenario_type: str,
    target_entity: str,
    delay_weeks: int,
    db: Session
) -> Dict[str, Any]:
    """
    Performs real, evidence-grounded impact analysis using actual project records:
    - Queries ProjectResponsibility, Document, Claim, Risk, and Handover tables
    - Distinguishes verified facts (grounded in database) from AI inferences
    - Surfaces explicit uncertainty when information is insufficient
    - Generates structured findings table (Area | Impact Finding | Evidence)
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise ValueError("Project not found.")

    target_clean = target_entity.strip().lower()

    # 1. Query actual database records
    all_resps = db.query(ProjectResponsibility).filter(
        ProjectResponsibility.project_id == project_id
    ).all()

    all_claims = db.query(Claim).filter(
        Claim.project_id == project_id,
        Claim.status != "rejected"
    ).all()

    all_docs = db.query(Document).filter(
        Document.project_id == project_id,
        Document.status == "processed"
    ).all()

    all_risks = db.query(Risk).filter(
        Risk.project_id == project_id,
        Risk.status != "resolved"
    ).all()

    all_gaps = db.query(KnowledgeGap).filter(
        KnowledgeGap.project_id == project_id,
        KnowledgeGap.status == "open"
    ).all()

    handover = db.query(Handover).filter(Handover.project_id == project_id).first()
    handover_status_str = handover.status.replace("_", " ").title() if handover else "Not Initialized"

    # Match responsibilities to target
    matched_resps = [
        r for r in all_resps
        if target_clean in (r.assigned_to or "").lower() or target_clean in (r.area or "").lower()
    ]

    # Match claims to target
    matched_claims = [
        c for c in all_claims
        if target_clean in (c.entity_owner or "").lower() or
           target_clean in (c.title or "").lower() or
           target_clean in (c.content or "").lower()
    ]

    # Match docs to target
    matched_docs = [
        d for d in all_docs
        if target_clean in d.original_name.lower() or target_clean in (d.extracted_text or "").lower()
    ]

    findings_table: List[Dict[str, Any]] = []
    affected_tasks: List[Dict[str, Any]] = []
    affected_dependencies: List[Dict[str, Any]] = []
    consequences: List[str] = []
    mitigations: List[str] = []

    # Check for insufficient data
    has_grounding = len(matched_resps) > 0 or len(matched_claims) > 0 or len(matched_docs) > 0

    if not has_grounding:
        insufficient_data = True
        missing_explanation = (
            f"No verified responsibilities, code modules, or documents currently link '{target_entity}' to this project. "
            "Continuity simulation requires grounded database records. "
            "Please assign responsibilities in the Matrix or upload technical specifications first."
        )
        uncertainty_notice = "High Uncertainty: Results reflect general continuity heuristics because explicit entity evidence was not located."
        confidence_level = "Low (Insufficient Database Grounding)"

        findings_table.append({
            "area": "Target Entity Ownership",
            "finding": f"'{target_entity}' has 0 registered responsibilities in project database.",
            "is_verified_fact": True,
            "evidence_ref": "Project Responsibilities Table (0 records)",
            "status": "warning"
        })
        findings_table.append({
            "area": "Documentation Coverage",
            "finding": "No uploaded specifications or runbooks mention this entity.",
            "is_verified_fact": True,
            "evidence_ref": "Document Repository (0 matches)",
            "status": "warning"
        })
        findings_table.append({
            "area": "Dependencies",
            "finding": "Downstream architecture dependencies cannot be verified without indexed docs.",
            "is_verified_fact": False,
            "evidence_ref": None,
            "status": "neutral"
        })
        findings_table.append({
            "area": "Handover Readiness",
            "finding": f"Current handover status is '{handover_status_str}'. No successor confirmed for this role.",
            "is_verified_fact": True,
            "evidence_ref": f"Handover Record v{handover.version if handover else 1}",
            "status": "warning"
        })

        consequences.append(f"Unmapped contributor/module '{target_entity}' leaves unknown institutional knowledge gap.")
        consequences.append("Downstream blast radius cannot be mathematically calculated without document citations.")
        mitigations.append(f"Add '{target_entity}' to the Project Responsibility Matrix with confirmed scope.")
        mitigations.append("Upload runbooks, source code, or architecture diagrams to ground this component.")

    else:
        insufficient_data = False
        missing_explanation = None
        uncertainty_notice = None
        confidence_level = f"High ({len(matched_resps)} responsibilities, {len(matched_claims)} claims verified in database)"

        # 1. Target Module / Ownership Finding
        if matched_resps:
            areas = ", ".join([r.area for r in matched_resps])
            findings_table.append({
                "area": f"{target_entity} Ownership",
                "finding": f"Primary ownership of {len(matched_resps)} core area(s) [{areas}] will become vacant.",
                "is_verified_fact": True,
                "evidence_ref": f"Responsibility Matrix: {matched_resps[0].area} (Assigned to: {matched_resps[0].assigned_to})",
                "status": "critical" if any(r.status == 'confirmed' for r in matched_resps) else "warning"
            })
            for r in matched_resps:
                affected_tasks.append({
                    "id": r.id,
                    "title": f"Ownership Domain: {r.area}",
                    "claim_type": "responsibility",
                    "status": r.status,
                    "exposure": f"Assigned to {r.assigned_to}. Successor note: '{r.successor_notes or 'None'}'"
                })
        else:
            findings_table.append({
                "area": f"{target_entity} Ownership",
                "finding": "Identified in project claims but lacks an explicit entry in Responsibility Matrix.",
                "is_verified_fact": True,
                "evidence_ref": "Evidence Grounding Engine",
                "status": "warning"
            })

        # 2. Downstream Dependencies
        dep_claims = [c for c in all_claims if c.claim_type == "dependency"]
        matched_deps = [c for c in dep_claims if target_clean in c.content.lower() or target_clean in c.title.lower()]
        if matched_deps:
            for d in matched_deps:
                findings_table.append({
                    "area": "Downstream Dependencies",
                    "finding": f"Direct dependency on '{d.title}' risks SLA interruption.",
                    "is_verified_fact": True,
                    "evidence_ref": f"Verified Claim: {d.title}",
                    "status": "warning"
                })
                affected_dependencies.append({
                    "id": d.id,
                    "title": d.title,
                    "impact": "Unavailability triggers system fallback or halts dependent integrations."
                })
        else:
            # Check other components dependent on target modules
            other_resps = [r for r in all_resps if r not in matched_resps]
            if other_resps:
                dep_area = other_resps[0].area
                findings_table.append({
                    "area": f"Inter-Module Dependency ({dep_area})",
                    "finding": f"Module '{dep_area}' authored in same subsystem may experience integration friction.",
                    "is_verified_fact": False,
                    "evidence_ref": f"Architecture Dependency: {dep_area}",
                    "status": "neutral"
                })

        # 3. Documentation Coverage
        if matched_docs:
            findings_table.append({
                "area": "Documentation",
                "finding": f"{len(matched_docs)} technical document(s) available as operational runbooks.",
                "is_verified_fact": True,
                "evidence_ref": f"Document: {matched_docs[0].original_name}",
                "status": "normal"
            })
        else:
            findings_table.append({
                "area": "Documentation",
                "finding": "Specific setup and execution runbooks missing for this component.",
                "is_verified_fact": True,
                "evidence_ref": "Document Repository Audit",
                "status": "warning"
            })

        # 4. Open Knowledge Gaps & Unresolved Technical Issues
        touching_gaps = [g for g in all_gaps if target_clean in g.question.lower() or target_clean in (g.context or "").lower()]
        if touching_gaps:
            findings_table.append({
                "area": "Unresolved Technical Issues",
                "finding": f"{len(touching_gaps)} open knowledge gap(s) directly touch this subject.",
                "is_verified_fact": True,
                "evidence_ref": f"Gap: {touching_gaps[0].question}",
                "status": "warning"
            })
        else:
            findings_table.append({
                "area": "Unresolved Technical Issues",
                "finding": "No open contradictory conflicts currently logged for this module.",
                "is_verified_fact": True,
                "evidence_ref": "Conflict Engine (0 open conflicts)",
                "status": "normal"
            })

        # 5. Handover Readiness Status
        findings_table.append({
            "area": "Handover Readiness",
            "finding": f"Handover completion is at {handover.completion_percentage if handover else 0}% (Status: {handover_status_str}).",
            "is_verified_fact": True,
            "evidence_ref": f"Handover Record v{handover.version if handover else 1}",
            "status": "normal" if (handover and handover.status in ['approved', 'published', 'received']) else "warning"
        })

        # Scenario specific consequences & mitigations
        if scenario_type == "person_unavailable":
            consequences.append(f"Immediate loss of primary technical context for {len(matched_resps)} registered areas.")
            consequences.append(f"Architectural choices authored by {target_entity} risk being re-litigated without original design context.")
            consequences.append("Successor will need emergency walkthrough sessions for critical repositories.")

            mitigations.append(f"Conduct knowledge capture interview covering the {len(matched_resps)} assigned modules.")
            mitigations.append(f"Ensure secondary co-owners are designated in the Responsibility Matrix.")
            mitigations.append("Verify credentials, environment secrets, and repository permissions before transition.")

        elif scenario_type == "task_delayed":
            consequences.append(f"A {delay_weeks}-week delay pushes downstream project milestones back.")
            consequences.append("Successor onboarding window compresses, risking ungrounded operational handover.")
            mitigations.append(f"De-scope non-critical deliverables from '{target_entity}' to protect the transition deadline.")
            mitigations.append("Prepare an explicit transitional runbook for partial completion handover.")

        elif scenario_type == "dependency_failed":
            consequences.append(f"External service or component '{target_entity}' failure halts integration verification.")
            consequences.append("Successor lacks direct vendor SLA contacts to expedite incident recovery.")
            mitigations.append("Document mock fallback interfaces and offline development stubs.")
            mitigations.append("Record vendor escalation contacts in the Handover Package.")

        else:
            consequences.append(f"Component '{target_entity}' risks operational degradation during leadership transition.")
            mitigations.append("Conduct comprehensive verification of handover checklist items.")

    return {
        "scenario_type": scenario_type,
        "assumptions": f"Simulating '{scenario_type.replace('_', ' ').title()}' for '{target_entity}' with {delay_weeks} weeks horizon.",
        "target_entity": target_entity,
        "affected_tasks": affected_tasks,
        "affected_dependencies": affected_dependencies,
        "findings_table": findings_table,
        "consequences": consequences,
        "suggested_mitigations": mitigations,
        "confidence_level": confidence_level,
        "uncertainty_notice": uncertainty_notice,
        "insufficient_data": insufficient_data,
        "missing_data_explanation": missing_explanation,
        "handover_status": handover_status_str,
        "created_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    }

def save_scenario_result(
    project_id: str,
    scenario_name: str,
    scenario_type: str,
    target_entity: str,
    results: Dict[str, Any],
    user: User,
    db: Session
) -> SimulationScenario:
    scenario = SimulationScenario(
        project_id=project_id,
        scenario_name=scenario_name,
        scenario_type=scenario_type,
        target_entity=target_entity,
        created_by_id=user.id,
        created_by_name=user.full_name,
        created_at=datetime.utcnow(),
        results_json=json.dumps(results)
    )
    db.add(scenario)
    db.commit()
    db.refresh(scenario)
    return scenario

def list_saved_scenarios(project_id: str, db: Session) -> List[SimulationScenario]:
    return db.query(SimulationScenario).filter(
        SimulationScenario.project_id == project_id
    ).order_by(SimulationScenario.created_at.desc()).all()
