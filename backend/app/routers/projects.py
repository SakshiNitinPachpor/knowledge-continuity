from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import (
    Project, ProjectMember, Workspace, WorkspaceMember,
    User, Document, Claim, Risk, KnowledgeGap
)
from app.schemas import (
    ProjectCreate, ProjectUpdate, ProjectOut,
    ProjectMemberAdd, ProjectMemberOut
)
from app.services.auth_service import get_current_user
from app.services.rbac import get_user_project_role, require_project_role
from app.services.handover_service import get_or_create_handover

router = APIRouter(prefix="/projects", tags=["Projects"])

@router.get("", response_model=List[ProjectOut])
def list_projects(workspace_id: Optional[str] = None, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(Project)
    if workspace_id:
        query = query.filter(Project.workspace_id == workspace_id)
        
    projects = query.all()
    results = []
    
    for p in projects:
        role = get_user_project_role(p.id, current_user.id, db)
        # If user has no role and is not workspace admin or superuser, skip
        if role == "none" and not current_user.is_superuser:
            continue

        doc_count = db.query(Document).filter(Document.project_id == p.id).count()
        claims_count = db.query(Claim).filter(Claim.project_id == p.id).count()
        verified_count = db.query(Claim).filter(Claim.project_id == p.id, Claim.status == "verified").count()
        risks_count = db.query(Risk).filter(Risk.project_id == p.id, Risk.status != "resolved").count()
        gaps_count = db.query(KnowledgeGap).filter(KnowledgeGap.project_id == p.id, KnowledgeGap.status == "open").count()

        results.append(ProjectOut(
            id=p.id,
            workspace_id=p.workspace_id,
            name=p.name,
            code=p.code,
            description=p.description or "",
            status=p.status,
            target_handover_date=p.target_handover_date,
            continuity_risk_score=p.continuity_risk_score,
            created_by_id=p.created_by_id,
            created_at=p.created_at,
            user_role=role,
            document_count=doc_count,
            claims_count=claims_count,
            verified_claims_count=verified_count,
            open_risks_count=risks_count,
            open_gaps_count=gaps_count
        ))
    return results

@router.post("", response_model=ProjectOut)
def create_project(proj_in: ProjectCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ws = db.query(Workspace).filter(Workspace.id == proj_in.workspace_id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found.")
        
    project = Project(
        workspace_id=proj_in.workspace_id,
        name=proj_in.name,
        code=proj_in.code.upper(),
        description=proj_in.description or "",
        target_handover_date=proj_in.target_handover_date,
        created_by_id=current_user.id,
        status="active"
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    # Assign creator as project_owner
    member = ProjectMember(
        project_id=project.id,
        user_id=current_user.id,
        role="project_owner"
    )
    db.add(member)
    db.commit()

    # Pre-initialize handover checklist
    get_or_create_handover(project.id, db)

    return ProjectOut(
        id=project.id,
        workspace_id=project.workspace_id,
        name=project.name,
        code=project.code,
        description=project.description or "",
        status=project.status,
        target_handover_date=project.target_handover_date,
        continuity_risk_score=0.0,
        created_by_id=project.created_by_id,
        created_at=project.created_at,
        user_role="project_owner",
        document_count=0,
        claims_count=0,
        verified_claims_count=0,
        open_risks_count=0,
        open_gaps_count=0
    )

@router.get("/{project_id}", response_model=ProjectOut)
def get_project(project_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
        
    role = get_user_project_role(project.id, current_user.id, db)
    if role == "none" and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Access denied: Not a member of this project.")

    doc_count = db.query(Document).filter(Document.project_id == project.id).count()
    claims_count = db.query(Claim).filter(Claim.project_id == project.id).count()
    verified_count = db.query(Claim).filter(Claim.project_id == project.id, Claim.status == "verified").count()
    risks_count = db.query(Risk).filter(Risk.project_id == project.id, Risk.status != "resolved").count()
    gaps_count = db.query(KnowledgeGap).filter(KnowledgeGap.project_id == project.id, KnowledgeGap.status == "open").count()

    return ProjectOut(
        id=project.id,
        workspace_id=project.workspace_id,
        name=project.name,
        code=project.code,
        description=project.description or "",
        status=project.status,
        target_handover_date=project.target_handover_date,
        continuity_risk_score=project.continuity_risk_score,
        created_by_id=project.created_by_id,
        created_at=project.created_at,
        user_role=role,
        document_count=doc_count,
        claims_count=claims_count,
        verified_claims_count=verified_count,
        open_risks_count=risks_count,
        open_gaps_count=gaps_count
    )

@router.get("/{project_id}/members", response_model=List[ProjectMemberOut])
def list_project_members(project_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_project_role(project_id, current_user, "successor", db)
    members = db.query(ProjectMember).filter(ProjectMember.project_id == project_id).all()
    results = []
    for m in members:
        results.append(ProjectMemberOut(
            id=m.id,
            user_id=m.user_id,
            email=m.user.email,
            full_name=m.user.full_name,
            role=m.role,
            created_at=m.created_at
        ))
    return results

@router.post("/{project_id}/members", response_model=ProjectMemberOut)
def add_project_member(project_id: str, member_in: ProjectMemberAdd, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_project_role(project_id, current_user, "project_owner", db)
    
    target_user = db.query(User).filter(User.email == member_in.email).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User with this email not registered.")

    existing = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == target_user.id
    ).first()
    if existing:
        existing.role = member_in.role
        db.commit()
        db.refresh(existing)
        return ProjectMemberOut(
            id=existing.id,
            user_id=target_user.id,
            email=target_user.email,
            full_name=target_user.full_name,
            role=existing.role,
            created_at=existing.created_at
        )

    new_member = ProjectMember(
        project_id=project_id,
        user_id=target_user.id,
        role=member_in.role
    )
    db.add(new_member)
    db.commit()
    db.refresh(new_member)

    return ProjectMemberOut(
        id=new_member.id,
        user_id=target_user.id,
        email=target_user.email,
        full_name=target_user.full_name,
        role=new_member.role,
        created_at=new_member.created_at
    )

@router.put("/{project_id}", response_model=ProjectOut)
def update_project(
    project_id: str,
    proj_in: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_project_role(project_id, current_user, "project_owner", db)
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    if proj_in.name is not None:
        project.name = proj_in.name
    if proj_in.code is not None:
        project.code = proj_in.code.upper()
    if proj_in.description is not None:
        project.description = proj_in.description
    if proj_in.status is not None:
        project.status = proj_in.status
    if proj_in.target_handover_date is not None:
        project.target_handover_date = proj_in.target_handover_date

    db.commit()
    db.refresh(project)

    role = get_user_project_role(project.id, current_user.id, db)
    doc_count = db.query(Document).filter(Document.project_id == project.id).count()
    claims_count = db.query(Claim).filter(Claim.project_id == project.id).count()
    verified_count = db.query(Claim).filter(Claim.project_id == project.id, Claim.status == "verified").count()
    risks_count = db.query(Risk).filter(Risk.project_id == project.id, Risk.status != "resolved").count()
    gaps_count = db.query(KnowledgeGap).filter(KnowledgeGap.project_id == project.id, KnowledgeGap.status == "open").count()

    return ProjectOut(
        id=project.id,
        workspace_id=project.workspace_id,
        name=project.name,
        code=project.code,
        description=project.description or "",
        status=project.status,
        target_handover_date=project.target_handover_date,
        continuity_risk_score=project.continuity_risk_score,
        created_by_id=project.created_by_id,
        created_at=project.created_at,
        user_role=role,
        document_count=doc_count,
        claims_count=claims_count,
        verified_claims_count=verified_count,
        open_risks_count=risks_count,
        open_gaps_count=gaps_count
    )

@router.delete("/{project_id}/members/{member_id}")
def remove_project_member(
    project_id: str,
    member_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_project_role(project_id, current_user, "project_owner", db)
    member = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.id == member_id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found in this project.")

    db.delete(member)
    db.commit()
    return {"status": "success", "message": "Member removed from project."}

@router.delete("/{project_id}")
def delete_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_project_role(project_id, current_user, "project_owner", db)
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    db.delete(project)
    db.commit()
    return {"status": "success", "message": "Project deleted successfully."}
