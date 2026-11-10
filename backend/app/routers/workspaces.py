import re
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Workspace, WorkspaceMember, User, Project
from app.schemas import WorkspaceCreate, WorkspaceOut, WorkspaceMemberOut
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])

def slugify(text: str) -> str:
    text = text.lower().strip()
    return re.sub(r'[^a-z0-9]+', '-', text).strip('-')

@router.get("", response_model=List[WorkspaceOut])
def list_workspaces(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.is_superuser:
        workspaces = db.query(Workspace).all()
    else:
        # User is member or creator
        member_ws_ids = [m.workspace_id for m in current_user.workspace_memberships]
        workspaces = db.query(Workspace).filter(
            (Workspace.id.in_(member_ws_ids)) | (Workspace.created_by_id == current_user.id)
        ).all()

        if not workspaces:
            # Auto-provision default private workspace for user
            base_slug = slugify(current_user.full_name) or "workspace"
            ws = Workspace(
                name=f"{current_user.full_name}'s Workspace",
                slug=f"{base_slug}-{current_user.id[:8]}",
                description="Private organizational workspace for knowledge continuity.",
                created_by_id=current_user.id
            )
            db.add(ws)
            db.flush()
            wm = WorkspaceMember(
                workspace_id=ws.id,
                user_id=current_user.id,
                role="workspace_admin"
            )
            db.add(wm)
            db.commit()
            db.refresh(ws)
            workspaces = [ws]
        
    results = []
    for ws in workspaces:
        m_count = db.query(WorkspaceMember).filter(WorkspaceMember.workspace_id == ws.id).count()
        p_count = db.query(Project).filter(Project.workspace_id == ws.id).count()
        results.append(WorkspaceOut(
            id=ws.id,
            name=ws.name,
            slug=ws.slug,
            description=ws.description or "",
            created_by_id=ws.created_by_id,
            created_at=ws.created_at,
            member_count=max(1, m_count),
            project_count=p_count
        ))
    return results

@router.post("", response_model=WorkspaceOut)
def create_workspace(ws_in: WorkspaceCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    base_slug = slugify(ws_in.name) or "workspace"
    slug = base_slug
    idx = 1
    while db.query(Workspace).filter(Workspace.slug == slug).first():
        slug = f"{base_slug}-{idx}"
        idx += 1

    ws = Workspace(
        name=ws_in.name,
        slug=slug,
        description=ws_in.description or "",
        created_by_id=current_user.id
    )
    db.add(ws)
    db.commit()
    db.refresh(ws)

    # Automatically add creator as workspace_admin
    member = WorkspaceMember(
        workspace_id=ws.id,
        user_id=current_user.id,
        role="workspace_admin"
    )
    db.add(member)
    db.commit()

    return WorkspaceOut(
        id=ws.id,
        name=ws.name,
        slug=ws.slug,
        description=ws.description or "",
        created_by_id=ws.created_by_id,
        created_at=ws.created_at,
        member_count=1,
        project_count=0
    )

@router.get("/{workspace_id}/members", response_model=List[WorkspaceMemberOut])
def list_workspace_members(workspace_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    members = db.query(WorkspaceMember).filter(WorkspaceMember.workspace_id == workspace_id).all()
    results = []
    for m in members:
        results.append(WorkspaceMemberOut(
            id=m.id,
            user_id=m.user_id,
            email=m.user.email,
            full_name=m.user.full_name,
            role=m.role,
            created_at=m.created_at
        ))
    return results
