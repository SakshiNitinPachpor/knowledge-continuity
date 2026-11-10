from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models import User, Project, ProjectMember, WorkspaceMember

ROLE_WEIGHTS = {
    "workspace_admin": 50,
    "project_owner": 40,
    "outgoing_member": 35,
    "reviewer": 30,
    "contributor": 20,
    "successor": 10,
}

def get_user_project_role(project_id: str, user_id: str, db: Session) -> str:
    """Determine the active role a user has for a given project."""
    # 1. Superuser override
    user = db.query(User).filter(User.id == user_id).first()
    if user and user.is_superuser:
        return "workspace_admin"

    # 2. Check direct project membership
    pm = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == user_id
    ).first()
    if pm:
        return pm.role

    # 3. Check workspace membership & project ownership
    project = db.query(Project).filter(Project.id == project_id).first()
    if project:
        if project.created_by_id == user_id:
            return "project_owner"
        wm = db.query(WorkspaceMember).filter(
            WorkspaceMember.workspace_id == project.workspace_id,
            WorkspaceMember.user_id == user_id
        ).first()
        if wm:
            return "project_owner" if wm.role == "workspace_admin" else "contributor"

    return "none"

def require_project_role(project_id: str, user: User, min_role: str, db: Session) -> str:
    """
    Verifies user ownership, project membership, and minimum role:
    - Protects across tenant boundaries (outsiders denied with 403).
    - Protects claim integrity (read-only successors cannot tamper with existing claims).
    """
    user_role = get_user_project_role(project_id, user.id, db)
    
    if user_role == "none":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You do not have permission to access this project."
        )

    min_weight = ROLE_WEIGHTS.get(min_role, 10)
    user_weight = ROLE_WEIGHTS.get(user_role, 0)
    if user_weight < min_weight:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: Requires role '{min_role}' or higher. Your role: '{user_role}'."
        )
        
    return user_role

def check_can_view_claim(claim_status: str, user_role: str) -> bool:
    """All authorized project members can view claims and evidence."""
    return True

def check_can_view_handover(handover_status: str, user_role: str) -> bool:
    """
    Successors can only view published, approved, or received handovers.
    Draft or in_review handovers are restricted to contributors, reviewers, and owners.
    """
    if user_role == "successor":
        return handover_status in ["approved", "published", "received"]
    return True
