from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.schemas import CopilotQuery, CopilotResponse
from app.services.auth_service import get_current_user
from app.services.rbac import require_project_role, get_user_project_role
from app.services.copilot_service import query_successor_copilot

router = APIRouter(prefix="/projects/{project_id}/copilot", tags=["Successor AI Copilot"])

@router.post("", response_model=CopilotResponse)
def ask_copilot(
    project_id: str,
    query_in: CopilotQuery,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_project_role(project_id, current_user, "successor", db)
    user_role = get_user_project_role(project_id, current_user.id, db)
    return query_successor_copilot(
        project_id=project_id,
        user_id=current_user.id,
        user_role=user_role,
        question=query_in.question,
        db=db
    )
