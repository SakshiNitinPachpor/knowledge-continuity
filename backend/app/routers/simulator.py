import json
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, ProjectResponsibility, ProjectMember, Claim
from app.schemas import (
    ScenarioRequest, ScenarioResult, SavedScenarioCreate, SavedScenarioOut
)
from app.services.auth_service import get_current_user
from app.services.rbac import require_project_role
from app.services.simulator_engine import (
    simulate_scenario, save_scenario_result, list_saved_scenarios
)

router = APIRouter(prefix="/projects/{project_id}/simulator", tags=["What-If Simulator"])

@router.post("", response_model=ScenarioResult)
def run_simulation(
    project_id: str,
    scenario_in: ScenarioRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_project_role(project_id, current_user, "successor", db)
    return simulate_scenario(
        project_id=project_id,
        scenario_type=scenario_in.scenario_type,
        target_entity=scenario_in.target_entity,
        delay_weeks=scenario_in.delay_weeks or 2,
        db=db
    )

@router.get("/targets")
def get_simulation_targets(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns dynamically populated team members and components from actual project database records.
    """
    require_project_role(project_id, current_user, "successor", db)
    
    # 1. Responsibilities & Components
    resps = db.query(ProjectResponsibility).filter(ProjectResponsibility.project_id == project_id).all()
    areas = list(set([r.area for r in resps if r.area]))
    resp_people = list(set([r.assigned_to for r in resps if r.assigned_to]))
    
    # 2. Project Members
    members = db.query(ProjectMember).filter(ProjectMember.project_id == project_id).all()
    member_names = list(set([m.user.full_name for m in members if m.user]))
    
    # 3. Claims Owners
    claims = db.query(Claim).filter(Claim.project_id == project_id).all()
    claim_owners = list(set([c.entity_owner for c in claims if c.entity_owner]))
    
    people = sorted(list(set(resp_people + member_names + claim_owners)))
    components = sorted(areas)
    
    return {
        "people": people,
        "components": components
    }

@router.post("/save", response_model=SavedScenarioOut)
def save_scenario(
    project_id: str,
    req: SavedScenarioCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_project_role(project_id, current_user, "contributor", db)
    scenario = save_scenario_result(
        project_id=project_id,
        scenario_name=req.scenario_name,
        scenario_type=req.scenario_type,
        target_entity=req.target_entity,
        results=req.results,
        user=current_user,
        db=db
    )
    
    return SavedScenarioOut(
        id=scenario.id,
        project_id=scenario.project_id,
        scenario_name=scenario.scenario_name,
        scenario_type=scenario.scenario_type,
        target_entity=scenario.target_entity,
        created_by_id=scenario.created_by_id,
        created_by_name=scenario.created_by_name,
        created_at=scenario.created_at,
        results=json.loads(scenario.results_json)
    )

@router.get("/saved", response_model=List[SavedScenarioOut])
def list_scenarios(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_project_role(project_id, current_user, "successor", db)
    saved = list_saved_scenarios(project_id, db)
    results = []
    for s in saved:
        results.append(SavedScenarioOut(
            id=s.id,
            project_id=s.project_id,
            scenario_name=s.scenario_name,
            scenario_type=s.scenario_type,
            target_entity=s.target_entity,
            created_by_id=s.created_by_id,
            created_by_name=s.created_by_name,
            created_at=s.created_at,
            results=json.loads(s.results_json)
        ))
    return results
