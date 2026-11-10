export type UserRole = 'workspace_admin' | 'project_owner' | 'outgoing_member' | 'reviewer' | 'contributor' | 'successor' | 'none';

export interface User {
  id: string;
  email: string;
  full_name: string;
  title: string;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string;
  created_by_id: string;
  created_at: string;
  member_count: number;
  project_count: number;
}

export interface Project {
  id: string;
  workspace_id: string;
  name: string;
  code: string;
  description: string;
  status: string; // active, in_review, handover_approved, archived
  target_handover_date: string | null;
  continuity_risk_score: number;
  created_by_id: string;
  created_at: string;
  user_role: UserRole;
  document_count: number;
  claims_count: number;
  verified_claims_count: number;
  open_risks_count: number;
  open_gaps_count: number;
}

export interface ProjectMember {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

export interface Document {
  id: string;
  project_id: string;
  original_name: string;
  file_type: string;
  category?: 'document' | 'code' | 'hardware' | 'package' | 'link' | string;
  folder_path?: string;
  file_size: number;
  status: 'uploaded' | 'parsing' | 'processed' | 'failed' | 'needs_review';
  page_count: number;
  metadata_json?: string;
  error_message?: string | null;
  created_at: string;
  claims_count: number;
}

export interface ProjectResponsibility {
  id: string;
  project_id: string;
  area: string;
  assigned_to: string;
  evidence_summary: string;
  status: 'needs_confirmation' | 'confirmed' | 'transferred' | string;
  successor_notes?: string;
  document_id?: string | null;
  claim_id?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface HardwareAsset {
  id: string;
  project_id: string;
  document_id?: string | null;
  title: string;
  category: 'circuit_diagram' | 'pcb_layout' | 'component_photo' | 'block_diagram' | 'system_architecture' | 'datasheet' | string;
  components_json: string;
  status: 'needs_confirmation' | 'confirmed' | string;
  notes?: string;
  created_at: string;
}

export interface ZipExtractionReport {
  total_files: number;
  processed_count: number;
  skipped_count: number;
  failed_count: number;
  extracted_documents: Document[];
  skipped_files: Array<{ path: string; reason: string }>;
}

export interface GithubImportRequest {
  repo_url: string;
  branch?: string;
}

export interface ReferenceLinkCreate {
  url: string;
  title: string;
  description?: string;
  category?: string;
}

export interface Passage {
  id: string;
  document_id: string;
  page_number: number;
  section_heading: string;
  text_content: string;
  char_offset_start: number;
  char_offset_end: number;
}

export type ClaimStatus = 'verified' | 'needs_review' | 'conflicting_evidence' | 'missing_evidence' | 'rejected';
export type ClaimType = 'completed_task' | 'decision' | 'responsibility' | 'in_progress_task' | 'unfinished_task' | 'dependency' | 'risk' | 'milestone' | 'general';

export interface Claim {
  id: string;
  project_id: string;
  document_id: string | null;
  document_name?: string | null;
  passage_id: string | null;
  passage_text?: string | null;
  page_number?: number | null;
  section_heading?: string | null;
  claim_type: ClaimType;
  title: string;
  content: string;
  confidence_score: number;
  status: ClaimStatus;
  entity_name?: string | null;
  entity_owner?: string | null;
  date_reference?: string | null;
  reviewer_notes?: string;
  reviewed_by_id?: string | null;
  reviewed_at?: string | null;
  created_at: string;
}

export interface EvidenceConflict {
  id: string;
  project_id: string;
  claim_a_id: string;
  claim_b_id: string;
  claim_a: Claim;
  claim_b: Claim;
  topic: string;
  description: string;
  status: 'open' | 'resolved';
  resolution_choice?: string | null;
  resolution_notes?: string | null;
  resolved_by_id?: string | null;
  resolved_at?: string | null;
  created_at: string;
}

export interface Risk {
  id: string;
  project_id: string;
  title: string;
  description: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  impact: string;
  suggested_mitigation: string;
  evidence_claim_id?: string | null;
  evidence_claim_title?: string | null;
  status: string;
  created_at: string;
}

export interface KnowledgeGap {
  id: string;
  project_id: string;
  title: string;
  description: string;
  gap_type: string;
  related_claim_id?: string | null;
  related_claim_title?: string | null;
  recommended_question: string;
  status: 'open' | 'addressed';
  resolution?: string | null;
  addressed_by_id?: string | null;
  created_at: string;
}

export interface HandoverChecklistItem {
  id: string;
  handover_id: string;
  category: string;
  item_name: string;
  is_mandatory: boolean;
  status: 'complete' | 'incomplete' | 'needs_review' | 'blocked';
  details?: string;
}

export type HandoverStatus = 'draft' | 'submitted' | 'changes_requested' | 'approved' | 'published' | 'received';

export interface HandoverFinding {
  category: string;
  finding: string;
  severity: 'critical' | 'warning' | 'info';
  evidence: string;
}

export interface Handover {
  id: string;
  project_id: string;
  project_name?: string;
  project_creator_id?: string;
  project_creator_name?: string;
  title: string;
  status: HandoverStatus;
  summary: string;
  completion_percentage: number;
  version: number;
  outgoing_member_id?: string | null;
  outgoing_member_name?: string | null;
  submitted_at?: string | null;
  approved_by_id?: string | null;
  approved_by_name?: string | null;
  approved_at?: string | null;
  published_by_id?: string | null;
  published_by_name?: string | null;
  published_at?: string | null;
  received_by_id?: string | null;
  received_by_name?: string | null;
  received_at?: string | null;
  change_request_notes?: string;
  successor_notes?: string;
  verification_status: string;
  publication_status: string;
  acknowledgement_status: string;
  history_json?: string;
  ai_findings?: HandoverFinding[];
  created_at: string;
  checklist_items: HandoverChecklistItem[];
}

export interface Invitation {
  id: string;
  workspace_id: string;
  workspace_name?: string;
  project_id?: string | null;
  project_name?: string | null;
  email: string;
  role: UserRole;
  token: string;
  invite_url: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expires_at: string;
  created_at: string;
}

export interface InvitationVerify {
  valid: boolean;
  email: string;
  role: UserRole;
  workspace_id: string;
  workspace_name: string;
  project_id?: string | null;
  project_name?: string | null;
  invited_by_name: string;
  expires_at: string;
}

export interface CopilotCitation {
  claim_id: string;
  title: string;
  document_name: string;
  page_number: number;
  passage_text: string;
  status: string;
}

export interface CopilotResponse {
  answer: string;
  citations: CopilotCitation[];
  is_uncertain: boolean;
  service_mode: string;
}

export interface FindingItem {
  area: string;
  finding: string;
  is_verified_fact: boolean;
  evidence_ref?: string | null;
  status?: string;
}

export interface ScenarioResult {
  scenario_type: string;
  assumptions: string;
  target_entity?: string;
  affected_tasks: Array<{
    id: string;
    title: string;
    claim_type: string;
    status: string;
    exposure: string;
  }>;
  affected_dependencies: Array<{
    id: string;
    title: string;
    impact: string;
  }>;
  findings_table?: FindingItem[];
  consequences: string[];
  suggested_mitigations: string[];
  confidence_level: string;
  uncertainty_notice?: string | null;
  insufficient_data?: boolean;
  missing_data_explanation?: string | null;
  handover_status?: string | null;
  created_at?: string;
}

export interface SavedScenario {
  id: string;
  project_id: string;
  scenario_name: string;
  scenario_type: string;
  target_entity: string;
  created_by_id?: string;
  created_by_name?: string;
  created_at: string;
  results: ScenarioResult;
}

export interface DepartureExposureScore {
  overall_score: number;
  category: string;
  explanation: string;
  factors: Array<{
    factor_name: string;
    score_contribution: number;
    severity: string;
    evidence: string;
    impact: string;
    mitigation: string;
  }>;
}

export interface AuditEvent {
  id: string;
  project_id: string;
  user_email: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: string;
  created_at: string;
}
