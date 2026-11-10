from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import AuditEvent, User
from app.schemas import AuditEventOut
from app.services.auth_service import get_current_user
from app.services.rbac import require_project_role

router = APIRouter(prefix="/projects/{project_id}/audit", tags=["Audit Log"])

@router.get("", response_model=List[AuditEventOut])
def list_audit_events(project_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_project_role(project_id, current_user, "reviewer", db)
    events = db.query(AuditEvent).filter(AuditEvent.project_id == project_id).order_by(AuditEvent.created_at.desc()).limit(100).all()
    return events
