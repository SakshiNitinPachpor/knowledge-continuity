from datetime import datetime
import uuid
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey, Enum as SQLEnum
)
from sqlalchemy.orm import relationship
from app.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    title = Column(String(100), default="Team Member")
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    workspace_memberships = relationship("WorkspaceMember", back_populates="user", cascade="all, delete-orphan")
    project_memberships = relationship("ProjectMember", back_populates="user", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="uploaded_by")

class Workspace(Base):
    __tablename__ = "workspaces"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, index=True, nullable=False)
    description = Column(Text, default="")
    created_by_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    members = relationship("WorkspaceMember", back_populates="workspace", cascade="all, delete-orphan")
    projects = relationship("Project", back_populates="workspace", cascade="all, delete-orphan")

class WorkspaceMember(Base):
    __tablename__ = "workspace_members"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    workspace_id = Column(String(36), ForeignKey("workspaces.id"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    role = Column(String(50), default="member")  # workspace_admin, member
    created_at = Column(DateTime, default=datetime.utcnow)
    
    workspace = relationship("Workspace", back_populates="members")
    user = relationship("User", back_populates="workspace_memberships")

class Project(Base):
    __tablename__ = "projects"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    workspace_id = Column(String(36), ForeignKey("workspaces.id"), nullable=False)
    name = Column(String(255), nullable=False)
    code = Column(String(50), index=True, nullable=False)
    description = Column(Text, default="")
    status = Column(String(50), default="active")  # active, in_review, handover_approved, archived
    target_handover_date = Column(DateTime, nullable=True)
    continuity_risk_score = Column(Float, default=0.0)  # 0 to 100
    created_by_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    workspace = relationship("Workspace", back_populates="projects")
    creator = relationship("User", foreign_keys=[created_by_id])
    members = relationship("ProjectMember", back_populates="project", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="project", cascade="all, delete-orphan")
    claims = relationship("Claim", back_populates="project", cascade="all, delete-orphan")
    conflicts = relationship("EvidenceConflict", back_populates="project", cascade="all, delete-orphan")
    risks = relationship("Risk", back_populates="project", cascade="all, delete-orphan")
    gaps = relationship("KnowledgeGap", back_populates="project", cascade="all, delete-orphan")
    handovers = relationship("Handover", back_populates="project", cascade="all, delete-orphan")
    audit_events = relationship("AuditEvent", back_populates="project", cascade="all, delete-orphan")

class ProjectMember(Base):
    __tablename__ = "project_members"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    # Roles: workspace_admin, project_owner, reviewer, contributor, successor
    role = Column(String(50), default="contributor")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    project = relationship("Project", back_populates="members")
    user = relationship("User", back_populates="project_memberships")

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    uploaded_by_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    filename = Column(String(255), nullable=False)
    original_name = Column(String(255), nullable=False)
    file_type = Column(String(50), nullable=False)  # pdf, docx, txt, md, py, js, zip, png, link, etc.
    category = Column(String(50), default="document")  # document, code, package, hardware, link, archive
    folder_path = Column(String(500), default="")  # e.g. "Backend/database.py" from zip / folder upload
    file_size = Column(Integer, default=0)
    file_path = Column(String(500), nullable=False)
    status = Column(String(50), default="uploaded")  # uploaded, parsing, processed, failed, needs_review
    page_count = Column(Integer, default=1)
    extracted_text = Column(Text, default="")
    metadata_json = Column(Text, default="{}")
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    project = relationship("Project", back_populates="documents")
    uploaded_by = relationship("User", back_populates="documents")
    passages = relationship("ExtractedPassage", back_populates="document", cascade="all, delete-orphan")
    claims = relationship("Claim", back_populates="document", cascade="all, delete-orphan")

class ExtractedPassage(Base):
    __tablename__ = "extracted_passages"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    document_id = Column(String(36), ForeignKey("documents.id"), nullable=False)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    page_number = Column(Integer, default=1)
    section_heading = Column(String(255), default="General")
    text_content = Column(Text, nullable=False)
    char_offset_start = Column(Integer, default=0)
    char_offset_end = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    document = relationship("Document", back_populates="passages")
    claims = relationship("Claim", back_populates="passage")

class Claim(Base):
    __tablename__ = "claims"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    document_id = Column(String(36), ForeignKey("documents.id"), nullable=True)
    passage_id = Column(String(36), ForeignKey("extracted_passages.id"), nullable=True)
    
    # Categories: completed_task, decision, responsibility, in_progress_task, unfinished_task, dependency, risk, milestone, general
    claim_type = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    confidence_score = Column(Float, default=1.0)
    
    # Statuses: verified, needs_review, conflicting_evidence, missing_evidence, rejected
    status = Column(String(50), default="needs_review")
    
    entity_name = Column(String(255), nullable=True)     # e.g., "Sarah Jenkins", "PostgreSQL 16", "Auth Service"
    entity_owner = Column(String(255), nullable=True)    # e.g., owner of task or decision
    date_reference = Column(String(100), nullable=True)  # date mentioned in source, e.g. "2026-03-15"
    
    reviewer_notes = Column(Text, default="")
    reviewed_by_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    project = relationship("Project", back_populates="claims")
    document = relationship("Document", back_populates="claims")
    passage = relationship("ExtractedPassage", back_populates="claims")
    reviewed_by = relationship("User", foreign_keys=[reviewed_by_id])

class EvidenceConflict(Base):
    __tablename__ = "evidence_conflicts"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    claim_a_id = Column(String(36), ForeignKey("claims.id"), nullable=False)
    claim_b_id = Column(String(36), ForeignKey("claims.id"), nullable=False)
    topic = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    
    # Status: open, resolved
    status = Column(String(50), default="open")
    resolution_choice = Column(String(50), nullable=True)  # "claim_a", "claim_b", "both_modified", "dismissed"
    resolution_notes = Column(Text, default="")
    resolved_by_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    project = relationship("Project", back_populates="conflicts")
    claim_a = relationship("Claim", foreign_keys=[claim_a_id])
    claim_b = relationship("Claim", foreign_keys=[claim_b_id])
    resolved_by = relationship("User", foreign_keys=[resolved_by_id])

class Risk(Base):
    __tablename__ = "risks"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    # Category: single_person_dependency, unfinished_task, missing_documentation, unresolved_blocker, conflicting_info, external_dependency
    category = Column(String(50), nullable=False)
    severity = Column(String(50), default="medium")  # critical, high, medium, low
    impact = Column(Text, default="")
    suggested_mitigation = Column(Text, default="")
    evidence_claim_id = Column(String(36), ForeignKey("claims.id"), nullable=True)
    # Status: identified, mitigating, resolved
    status = Column(String(50), default="identified")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    project = relationship("Project", back_populates="risks")
    evidence_claim = relationship("Claim")

class KnowledgeGap(Base):
    __tablename__ = "knowledge_gaps"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    # Gap type: unassigned_task, ungrounded_decision, missing_documentation, unclear_dependency_status, incomplete_section
    gap_type = Column(String(50), nullable=False)
    related_claim_id = Column(String(36), ForeignKey("claims.id"), nullable=True)
    recommended_question = Column(Text, default="")
    # Status: open, addressed
    status = Column(String(50), default="open")
    resolution = Column(Text, default="")
    addressed_by_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    project = relationship("Project", back_populates="gaps")
    related_claim = relationship("Claim")
    addressed_by = relationship("User", foreign_keys=[addressed_by_id])

class Handover(Base):
    __tablename__ = "handovers"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    title = Column(String(255), nullable=False)
    # Status: draft, submitted, changes_requested, approved, published, received
    status = Column(String(50), default="draft")
    summary = Column(Text, default="")
    completion_percentage = Column(Float, default=0.0)
    version = Column(Integer, default=1)
    outgoing_member_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    submitted_at = Column(DateTime, nullable=True)
    approved_by_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    published_by_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    published_at = Column(DateTime, nullable=True)
    received_by_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    received_at = Column(DateTime, nullable=True)
    change_request_notes = Column(Text, default="")
    successor_notes = Column(Text, default="")
    history_json = Column(Text, default="[]")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    project = relationship("Project", back_populates="handovers")
    outgoing_member = relationship("User", foreign_keys=[outgoing_member_id])
    approved_by = relationship("User", foreign_keys=[approved_by_id])
    published_by = relationship("User", foreign_keys=[published_by_id])
    received_by = relationship("User", foreign_keys=[received_by_id])
    checklist_items = relationship("HandoverChecklistItem", back_populates="handover", cascade="all, delete-orphan")

class SimulationScenario(Base):
    __tablename__ = "simulation_scenarios"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    scenario_name = Column(String(255), nullable=False)
    scenario_type = Column(String(50), nullable=False)
    target_entity = Column(String(255), nullable=False)
    created_by_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_by_name = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    results_json = Column(Text, nullable=False)
    
    project = relationship("Project")
    creator = relationship("User", foreign_keys=[created_by_id])

class Invitation(Base):
    __tablename__ = "invitations"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    workspace_id = Column(String(36), ForeignKey("workspaces.id"), nullable=False)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=True)
    email = Column(String(255), index=True, nullable=False)
    # Roles: workspace_admin, project_owner, outgoing_member, reviewer, successor, contributor
    role = Column(String(50), nullable=False)
    token = Column(String(100), unique=True, index=True, nullable=False)
    invited_by_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    status = Column(String(50), default="pending")  # pending, accepted, expired, revoked
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    workspace = relationship("Workspace")
    project = relationship("Project")
    invited_by = relationship("User", foreign_keys=[invited_by_id])

class HandoverChecklistItem(Base):
    __tablename__ = "handover_checklist_items"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    handover_id = Column(String(36), ForeignKey("handovers.id"), nullable=False)
    category = Column(String(100), nullable=False)  # Overview, Decisions, Responsibilities, Pending Tasks, Dependencies, Risks, Documentation, Successor Actions
    item_name = Column(String(255), nullable=False)
    is_mandatory = Column(Boolean, default=True)
    # Status: complete, incomplete, needs_review, blocked
    status = Column(String(50), default="incomplete")
    details = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    handover = relationship("Handover", back_populates="checklist_items")

class AuditEvent(Base):
    __tablename__ = "audit_events"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    user_email = Column(String(255), default="system")
    action = Column(String(100), nullable=False)  # e.g., "claim.verified", "handover.approved", "document.uploaded"
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(String(36), nullable=False)
    details = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    project = relationship("Project", back_populates="audit_events")

class CopilotInteraction(Base):
    __tablename__ = "copilot_interactions"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    query = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    cited_claim_ids = Column(Text, default="[]")  # JSON list of claim IDs
    is_uncertain = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class ProjectResponsibility(Base):
    __tablename__ = "project_responsibilities"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    area = Column(String(255), nullable=False)  # e.g., "Backend API", "Frontend UI", "Database Architecture"
    assigned_to = Column(String(255), nullable=False)  # e.g., "Sarah Jenkins" or "Unassigned"
    evidence_summary = Column(Text, default="")  # e.g., "Referenced in backend/database.py lines 1-45"
    status = Column(String(50), default="needs_confirmation")  # needs_confirmation, confirmed, transferred
    successor_notes = Column(Text, default="")
    document_id = Column(String(36), ForeignKey("documents.id"), nullable=True)
    claim_id = Column(String(36), ForeignKey("claims.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    project = relationship("Project", backref="responsibilities")
    document = relationship("Document")
    claim = relationship("Claim")

class HardwareAsset(Base):
    __tablename__ = "hardware_assets"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    document_id = Column(String(36), ForeignKey("documents.id"), nullable=True)
    title = Column(String(255), nullable=False)
    category = Column(String(50), default="circuit_diagram")  # circuit_diagram, pcb_layout, component_photo, block_diagram, architecture, datasheet
    components_json = Column(Text, default="[]")  # JSON list of components e.g. [{"name": "ESP32", "type": "MCU", "status": "confirmed"}]
    status = Column(String(50), default="needs_confirmation")  # needs_confirmation, confirmed
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    project = relationship("Project", backref="hardware_assets")
    document = relationship("Document")

class ProjectRepository(Base):
    __tablename__ = "project_repositories"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    repo_url = Column(String(500), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, default="")
    default_branch = Column(String(50), default="main")
    language = Column(String(100), default="")
    stars = Column(Integer, default=0)
    status = Column(String(50), default="synced")  # synced, syncing, failed, private_unconfigured
    last_synced_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    project = relationship("Project", backref="repositories")
