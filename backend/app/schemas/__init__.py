from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

# --- Auth & User Schemas ---
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    title: Optional[str] = "Team Member"

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    title: Optional[str] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class UserOut(UserBase):
    id: str
    is_active: bool
    is_superuser: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut

class TokenData(BaseModel):
    email: Optional[str] = None
    user_id: Optional[str] = None

# --- Workspace Schemas ---
class WorkspaceCreate(BaseModel):
    name: str
    description: Optional[str] = ""

class WorkspaceMemberOut(BaseModel):
    id: str
    user_id: str
    email: str
    full_name: str
    role: str
    created_at: datetime

    class Config:
        from_attributes = True

class WorkspaceOut(BaseModel):
    id: str
    name: str
    slug: str
    description: str
    created_by_id: str
    created_at: datetime
    member_count: Optional[int] = 1
    project_count: Optional[int] = 0

    class Config:
        from_attributes = True

# --- Project Schemas ---
class ProjectCreate(BaseModel):
    workspace_id: str
    name: str
    code: str
    description: Optional[str] = ""
    target_handover_date: Optional[datetime] = None

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    target_handover_date: Optional[datetime] = None

class ProjectMemberAdd(BaseModel):
    email: EmailStr
    role: str = "contributor"  # workspace_admin, project_owner, reviewer, contributor, successor

class ProjectMemberOut(BaseModel):
    id: str
    user_id: str
    email: str
    full_name: str
    role: str
    created_at: datetime

    class Config:
        from_attributes = True

class ProjectOut(BaseModel):
    id: str
    workspace_id: str
    name: str
    code: str
    description: str
    status: str
    target_handover_date: Optional[datetime] = None
    continuity_risk_score: float
    created_by_id: str
    created_at: datetime
    user_role: Optional[str] = None
    document_count: Optional[int] = 0
    claims_count: Optional[int] = 0
    verified_claims_count: Optional[int] = 0
    open_risks_count: Optional[int] = 0
    open_gaps_count: Optional[int] = 0

    class Config:
        from_attributes = True

# --- Document & Passage Schemas ---
class PassageOut(BaseModel):
    id: str
    document_id: str
    page_number: int
    section_heading: str
    text_content: str
    char_offset_start: int
    char_offset_end: int

    class Config:
        from_attributes = True

class DocumentOut(BaseModel):
    id: str
    project_id: str
    original_name: str
    file_type: str
    category: Optional[str] = "document"
    folder_path: Optional[str] = ""
    file_size: int
    status: str
    page_count: int
    metadata_json: Optional[str] = "{}"
    error_message: Optional[str] = None
    created_at: datetime
    claims_count: Optional[int] = 0

    class Config:
        from_attributes = True

# --- Responsibilities Schemas ---
class ProjectResponsibilityCreate(BaseModel):
    area: str
    assigned_to: str
    evidence_summary: Optional[str] = ""
    status: Optional[str] = "needs_confirmation"
    successor_notes: Optional[str] = ""
    document_id: Optional[str] = None
    claim_id: Optional[str] = None

class ProjectResponsibilityUpdate(BaseModel):
    area: Optional[str] = None
    assigned_to: Optional[str] = None
    evidence_summary: Optional[str] = None
    status: Optional[str] = None
    successor_notes: Optional[str] = None

class ProjectResponsibilityOut(BaseModel):
    id: str
    project_id: str
    area: str
    assigned_to: str
    evidence_summary: Optional[str] = ""
    status: str
    successor_notes: Optional[str] = ""
    document_id: Optional[str] = None
    claim_id: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# --- Hardware Asset Schemas ---
class HardwareAssetCreate(BaseModel):
    title: str
    category: Optional[str] = "circuit_diagram"
    components_json: Optional[str] = "[]"
    status: Optional[str] = "needs_confirmation"
    notes: Optional[str] = ""
    document_id: Optional[str] = None

class HardwareAssetUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    components_json: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class HardwareAssetOut(BaseModel):
    id: str
    project_id: str
    document_id: Optional[str] = None
    title: str
    category: str
    components_json: str
    status: str
    notes: Optional[str] = ""
    created_at: datetime

    class Config:
        from_attributes = True

# --- Repository & Link Schemas ---
class GithubImportRequest(BaseModel):
    repo_url: str
    branch: Optional[str] = None

class ReferenceLinkCreate(BaseModel):
    url: str
    title: str
    description: Optional[str] = ""
    category: Optional[str] = "reference"

class ProjectRepositoryOut(BaseModel):
    id: str
    project_id: str
    repo_url: str
    name: str
    description: Optional[str] = ""
    default_branch: str
    language: Optional[str] = ""
    stars: int
    status: str
    last_synced_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True

class ZipExtractionReport(BaseModel):
    total_files: int
    processed_count: int
    skipped_count: int
    failed_count: int
    extracted_documents: List[DocumentOut]
    skipped_files: List[Dict[str, str]]

# --- Claim & Evidence Schemas ---
class ClaimCreate(BaseModel):
    claim_type: str
    title: str
    content: str
    entity_name: Optional[str] = None
    entity_owner: Optional[str] = None
    date_reference: Optional[str] = None
    status: Optional[str] = "needs_review"

class ClaimUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    claim_type: Optional[str] = None
    entity_name: Optional[str] = None
    entity_owner: Optional[str] = None
    date_reference: Optional[str] = None

class ClaimReview(BaseModel):
    status: str  # verified, needs_review, conflicting_evidence, missing_evidence, rejected
    reviewer_notes: Optional[str] = ""

class ClaimOut(BaseModel):
    id: str
    project_id: str
    document_id: Optional[str] = None
    document_name: Optional[str] = None
    passage_id: Optional[str] = None
    passage_text: Optional[str] = None
    page_number: Optional[int] = None
    section_heading: Optional[str] = None
    claim_type: str
    title: str
    content: str
    confidence_score: float
    status: str
    entity_name: Optional[str] = None
    entity_owner: Optional[str] = None
    date_reference: Optional[str] = None
    reviewer_notes: Optional[str] = ""
    reviewed_by_id: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- Evidence Conflict Schemas ---
class ConflictResolve(BaseModel):
    resolution_choice: str  # claim_a, claim_b, both_modified, dismissed
    resolution_notes: str

class ConflictOut(BaseModel):
    id: str
    project_id: str
    claim_a_id: str
    claim_b_id: str
    claim_a: ClaimOut
    claim_b: ClaimOut
    topic: str
    description: str
    status: str
    resolution_choice: Optional[str] = None
    resolution_notes: Optional[str] = None
    resolved_by_id: Optional[str] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- Risk Schemas ---
class RiskCreate(BaseModel):
    title: str
    description: str
    category: str
    severity: str = "medium"
    impact: Optional[str] = ""
    suggested_mitigation: Optional[str] = ""
    evidence_claim_id: Optional[str] = None

class RiskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[str] = None
    impact: Optional[str] = None
    suggested_mitigation: Optional[str] = None
    status: Optional[str] = None

class RiskOut(BaseModel):
    id: str
    project_id: str
    title: str
    description: str
    category: str
    severity: str
    impact: str
    suggested_mitigation: str
    evidence_claim_id: Optional[str] = None
    evidence_claim_title: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

# --- Knowledge Gap Schemas ---
class GapResolve(BaseModel):
    resolution: str

class GapOut(BaseModel):
    id: str
    project_id: str
    title: str
    description: str
    gap_type: str
    related_claim_id: Optional[str] = None
    related_claim_title: Optional[str] = None
    recommended_question: str
    status: str
    resolution: Optional[str] = None
    addressed_by_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- Handover Schemas ---
class HandoverChecklistItemOut(BaseModel):
    id: str
    handover_id: str
    category: str
    item_name: str
    is_mandatory: bool
    status: str
    details: Optional[str] = ""

    class Config:
        from_attributes = True

class HandoverChecklistUpdate(BaseModel):
    status: str  # complete, incomplete, needs_review, blocked
    details: Optional[str] = None

class HandoverDetailsUpdate(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None

class HandoverChangeRequest(BaseModel):
    notes: str

class HandoverAcknowledgeRequest(BaseModel):
    notes: Optional[str] = ""

class HandoverOut(BaseModel):
    id: str
    project_id: str
    project_name: Optional[str] = None
    project_creator_id: Optional[str] = None
    project_creator_name: Optional[str] = None
    title: str
    status: str
    summary: str
    completion_percentage: float
    version: int
    outgoing_member_id: Optional[str] = None
    outgoing_member_name: Optional[str] = None
    submitted_at: Optional[datetime] = None
    approved_by_id: Optional[str] = None
    approved_by_name: Optional[str] = None
    approved_at: Optional[datetime] = None
    published_by_id: Optional[str] = None
    published_by_name: Optional[str] = None
    published_at: Optional[datetime] = None
    received_by_id: Optional[str] = None
    received_by_name: Optional[str] = None
    received_at: Optional[datetime] = None
    change_request_notes: Optional[str] = ""
    successor_notes: Optional[str] = ""
    verification_status: str = "Draft"
    publication_status: str = "Not Published"
    acknowledgement_status: str = "Pending"
    history_json: Optional[str] = "[]"
    ai_findings: List[Dict[str, Any]] = []
    created_at: datetime
    checklist_items: List[HandoverChecklistItemOut] = []

    class Config:
        from_attributes = True

# --- Invitation Schemas ---
class InvitationCreate(BaseModel):
    email: EmailStr
    role: str = "contributor"  # workspace_admin, project_owner, outgoing_member, reviewer, successor, contributor
    workspace_id: str
    project_id: Optional[str] = None

class InvitationOut(BaseModel):
    id: str
    workspace_id: str
    workspace_name: Optional[str] = None
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    email: str
    role: str
    token: str
    invite_url: str
    status: str
    expires_at: datetime
    created_at: datetime

class InvitationVerifyOut(BaseModel):
    valid: bool
    email: str
    role: str
    workspace_id: str
    workspace_name: str
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    invited_by_name: str
    expires_at: datetime

class InvitationAccept(BaseModel):
    token: str

# --- Simulator Schemas ---
class FindingItem(BaseModel):
    area: str
    finding: str
    is_verified_fact: bool = True
    evidence_ref: Optional[str] = None
    status: Optional[str] = "normal"

class ScenarioRequest(BaseModel):
    scenario_type: str  # "person_unavailable", "task_delayed", "dependency_failed", "component_unavailable"
    target_entity: str  # person name or task title or component
    delay_weeks: Optional[int] = 2

class ScenarioResult(BaseModel):
    scenario_type: str
    assumptions: str
    target_entity: str
    affected_tasks: List[Dict[str, Any]] = []
    affected_dependencies: List[Dict[str, Any]] = []
    findings_table: List[FindingItem] = []
    consequences: List[str] = []
    suggested_mitigations: List[str] = []
    confidence_level: str
    uncertainty_notice: Optional[str] = None
    insufficient_data: bool = False
    missing_data_explanation: Optional[str] = None
    handover_status: Optional[str] = None
    created_at: Optional[str] = None

class SavedScenarioCreate(BaseModel):
    scenario_name: str
    scenario_type: str
    target_entity: str
    results: Dict[str, Any]

class SavedScenarioOut(BaseModel):
    id: str
    project_id: str
    scenario_name: str
    scenario_type: str
    target_entity: str
    created_by_id: Optional[str] = None
    created_by_name: Optional[str] = None
    created_at: datetime
    results: Dict[str, Any]

    class Config:
        from_attributes = True

# --- Copilot Schemas ---
class CopilotQuery(BaseModel):
    question: str

class CitedClaim(BaseModel):
    claim_id: str
    title: str
    document_name: Optional[str] = None
    page_number: Optional[int] = None
    passage_text: Optional[str] = None
    status: str

class CopilotResponse(BaseModel):
    answer: str
    citations: List[CitedClaim]
    is_uncertain: bool
    service_mode: str  # "grounded_knowledge_base" or "live_ai"

# --- Audit Schemas ---
class AuditEventOut(BaseModel):
    id: str
    project_id: str
    user_email: str
    action: str
    entity_type: str
    entity_id: str
    details: str
    created_at: datetime

    class Config:
        from_attributes = True
