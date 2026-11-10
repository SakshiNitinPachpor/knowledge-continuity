import secrets
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Invitation, Workspace, WorkspaceMember, Project, ProjectMember, User, AuditEvent
from app.schemas import InvitationCreate, InvitationOut, InvitationVerifyOut, InvitationAccept
from app.services.auth_service import get_current_user
from app.services.rbac import require_project_role

router = APIRouter(prefix="/invitations", tags=["Invitations & Access Control"])

def build_invite_url(token: str) -> str:
    return f"http://127.0.0.1:5173/invite?token={token}"

@router.post("", response_model=InvitationOut)
def create_invitation(
    invite_in: InvitationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ws = db.query(Workspace).filter(Workspace.id == invite_in.workspace_id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found.")

    # Check caller has permission to invite
    if invite_in.project_id:
        require_project_role(invite_in.project_id, current_user, "project_owner", db)
        proj = db.query(Project).filter(Project.id == invite_in.project_id).first()
        proj_name = proj.name if proj else None
    else:
        # Workspace level check
        wm = db.query(WorkspaceMember).filter(
            WorkspaceMember.workspace_id == ws.id,
            WorkspaceMember.user_id == current_user.id
        ).first()
        if not wm or wm.role != "workspace_admin":
            if ws.created_by_id != current_user.id and not current_user.is_superuser:
                raise HTTPException(status_code=403, detail="Only Workspace Admins can invite workspace members.")
        proj_name = None

    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(days=7)

    invitation = Invitation(
        workspace_id=invite_in.workspace_id,
        project_id=invite_in.project_id,
        email=invite_in.email.lower().strip(),
        role=invite_in.role,
        token=token,
        invited_by_id=current_user.id,
        status="pending",
        expires_at=expires_at
    )
    db.add(invitation)
    db.commit()
    db.refresh(invitation)

    if invite_in.project_id:
        db.add(AuditEvent(
            project_id=invite_in.project_id,
            user_id=current_user.id,
            user_email=current_user.email,
            action="invitation.created",
            entity_type="Invitation",
            entity_id=invitation.id,
            details=f"Invited {invite_in.email} as role '{invite_in.role}'"
        ))
        db.commit()

    return InvitationOut(
        id=invitation.id,
        workspace_id=invitation.workspace_id,
        workspace_name=ws.name,
        project_id=invitation.project_id,
        project_name=proj_name,
        email=invitation.email,
        role=invitation.role,
        token=invitation.token,
        invite_url=build_invite_url(invitation.token),
        status=invitation.status,
        expires_at=invitation.expires_at,
        created_at=invitation.created_at
    )

@router.get("/project/{project_id}", response_model=List[InvitationOut])
def list_project_invitations(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_project_role(project_id, current_user, "project_owner", db)
    invites = db.query(Invitation).filter(Invitation.project_id == project_id).order_by(Invitation.created_at.desc()).all()
    results = []
    for inv in invites:
        results.append(InvitationOut(
            id=inv.id,
            workspace_id=inv.workspace_id,
            workspace_name=inv.workspace.name if inv.workspace else "",
            project_id=inv.project_id,
            project_name=inv.project.name if inv.project else "",
            email=inv.email,
            role=inv.role,
            token=inv.token,
            invite_url=build_invite_url(inv.token),
            status=inv.status,
            expires_at=inv.expires_at,
            created_at=inv.created_at
        ))
    return results

@router.get("/verify/{token}", response_model=InvitationVerifyOut)
def verify_invitation(token: str, db: Session = Depends(get_db)):
    inv = db.query(Invitation).filter(Invitation.token == token).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invitation token invalid or not found.")
    
    if inv.status != "pending":
        raise HTTPException(status_code=400, detail=f"This invitation has already been {inv.status}.")
        
    if inv.expires_at < datetime.utcnow():
        inv.status = "expired"
        db.commit()
        raise HTTPException(status_code=400, detail="This invitation link has expired.")

    return InvitationVerifyOut(
        valid=True,
        email=inv.email,
        role=inv.role,
        workspace_id=inv.workspace_id,
        workspace_name=inv.workspace.name if inv.workspace else "Workspace",
        project_id=inv.project_id,
        project_name=inv.project.name if inv.project else None,
        invited_by_name=inv.invited_by.full_name if inv.invited_by else "Workspace Admin",
        expires_at=inv.expires_at
    )

@router.post("/accept")
def accept_invitation(
    accept_in: InvitationAccept,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    inv = db.query(Invitation).filter(Invitation.token == accept_in.token).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invitation token not found.")

    if inv.status != "pending":
        raise HTTPException(status_code=400, detail=f"Invitation is no longer active ({inv.status}).")

    if inv.expires_at < datetime.utcnow():
        inv.status = "expired"
        db.commit()
        raise HTTPException(status_code=400, detail="Invitation token has expired.")

    # Add to workspace if not present
    wm = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == inv.workspace_id,
        WorkspaceMember.user_id == current_user.id
    ).first()
    if not wm:
        ws_role = "workspace_admin" if inv.role == "workspace_admin" else "member"
        db.add(WorkspaceMember(
            workspace_id=inv.workspace_id,
            user_id=current_user.id,
            role=ws_role
        ))

    # Add to project if project invitation
    if inv.project_id:
        pm = db.query(ProjectMember).filter(
            ProjectMember.project_id == inv.project_id,
            ProjectMember.user_id == current_user.id
        ).first()
        if pm:
            pm.role = inv.role
        else:
            db.add(ProjectMember(
                project_id=inv.project_id,
                user_id=current_user.id,
                role=inv.role
            ))

        db.add(AuditEvent(
            project_id=inv.project_id,
            user_id=current_user.id,
            user_email=current_user.email,
            action="invitation.accepted",
            entity_type="ProjectMember",
            entity_id=current_user.id,
            details=f"{current_user.full_name} accepted invitation as role '{inv.role}'"
        ))

    inv.status = "accepted"
    db.commit()

    return {
        "status": "success",
        "message": f"Successfully joined as {inv.role}.",
        "workspace_id": inv.workspace_id,
        "project_id": inv.project_id,
        "role": inv.role
    }

@router.post("/{invitation_id}/revoke")
def revoke_invitation(
    invitation_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    inv = db.query(Invitation).filter(Invitation.id == invitation_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invitation not found.")

    if inv.project_id:
        require_project_role(inv.project_id, current_user, "project_owner", db)
    else:
        ws = db.query(Workspace).filter(Workspace.id == inv.workspace_id).first()
        if ws.created_by_id != current_user.id and not current_user.is_superuser:
            raise HTTPException(status_code=403, detail="Not authorized to revoke this invitation.")

    inv.status = "revoked"
    db.commit()

    return {"status": "success", "message": "Invitation revoked successfully."}
