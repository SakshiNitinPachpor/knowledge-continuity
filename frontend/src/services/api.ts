import {
  User, Workspace, Project, ProjectMember, Document, Passage,
  Claim, EvidenceConflict, Risk, KnowledgeGap,
  Handover, HandoverChecklistItem, CopilotResponse,
  ScenarioResult, DepartureExposureScore, AuditEvent, Invitation, InvitationVerify,
  SavedScenario, ZipExtractionReport, ProjectResponsibility, HardwareAsset
} from '../types';

const API_BASE = '/api/v1';

export const getToken = (): string | null => localStorage.getItem('kc_auth_token');
export const setToken = (token: string) => localStorage.setItem('kc_auth_token', token);
export const removeToken = () => localStorage.removeItem('kc_auth_token');

const request = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = 'An unexpected error occurred.';
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.detail || errorDetail;
    } catch {
      errorDetail = await response.text() || errorDetail;
    }
    throw new Error(errorDetail);
  }

  return response.json();
};

export const api = {
  // Auth & Profile
  register: (data: { email: string; full_name: string; title?: string; password: string }) =>
    request<{ access_token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  login: (formData: URLSearchParams) =>
    request<{ access_token: string; user: User }>('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    }),
  getMe: () => request<User>('/auth/me'),
  updateProfile: (data: { full_name?: string; title?: string }) =>
    request<User>('/auth/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  changePassword: (data: { current_password: string; new_password: string }) =>
    request<{ status: string; message: string }>('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Workspaces
  listWorkspaces: () => request<Workspace[]>('/workspaces'),
  createWorkspace: (data: { name: string; description?: string }) =>
    request<Workspace>('/workspaces', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getWorkspaceMembers: (workspaceId: string) =>
    request<Array<{ id: string; user_id: string; email: string; full_name: string; role: string; created_at: string }>>(`/workspaces/${workspaceId}/members`),

  // Projects
  listProjects: (workspaceId?: string) =>
    request<Project[]>(`/projects${workspaceId ? `?workspace_id=${workspaceId}` : ''}`),
  createProject: (data: { workspace_id: string; name: string; code: string; description?: string; target_handover_date?: string }) =>
    request<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getProject: (projectId: string) => request<Project>(`/projects/${projectId}`),
  updateProject: (projectId: string, data: Partial<Project>) =>
    request<Project>(`/projects/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteProject: (projectId: string) =>
    request<{ status: string; message: string }>(`/projects/${projectId}`, {
      method: 'DELETE',
    }),
  getProjectMembers: (projectId: string) => request<ProjectMember[]>(`/projects/${projectId}/members`),
  addProjectMember: (projectId: string, data: { email: string; role: string }) =>
    request<ProjectMember>(`/projects/${projectId}/members`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  removeProjectMember: (projectId: string, memberId: string) =>
    request<{ status: string; message: string }>(`/projects/${projectId}/members/${memberId}`, {
      method: 'DELETE',
    }),

  // Invitations
  createInvitation: (data: { email: string; role: string; workspace_id: string; project_id?: string }) =>
    request<Invitation>('/invitations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getProjectInvitations: (projectId: string) =>
    request<Invitation[]>(`/invitations/project/${projectId}`),
  verifyInvitation: (token: string) =>
    request<InvitationVerify>(`/invitations/verify/${token}`),
  acceptInvitation: (token: string) =>
    request<{ status: string; message: string; workspace_id: string; project_id?: string; role: string }>('/invitations/accept', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),
  revokeInvitation: (invitationId: string) =>
    request<{ status: string; message: string }>(`/invitations/${invitationId}/revoke`, {
      method: 'POST',
    }),

  // Documents & Knowledge Ingestion
  listDocuments: (projectId: string, category?: string) =>
    request<Document[]>(`/projects/${projectId}/documents${category ? `?category=${category}` : ''}`),
  uploadDocument: (projectId: string, file: File, folderPath: string = '') => {
    const formData = new FormData();
    formData.append('file', file);
    if (folderPath) formData.append('folder_path', folderPath);
    return request<Document>(`/projects/${projectId}/documents/upload`, {
      method: 'POST',
      body: formData,
    });
  },
  uploadMultipleDocuments: (projectId: string, files: File[]) => {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    return request<Document[]>(`/projects/${projectId}/documents/upload-multiple`, {
      method: 'POST',
      body: formData,
    });
  },
  uploadZipArchive: (projectId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<ZipExtractionReport>(`/projects/${projectId}/documents/upload-zip`, {
      method: 'POST',
      body: formData,
    });
  },
  importGithub: (projectId: string, data: { repo_url: string; branch?: string }) =>
    request<{ status: string; message: string; data: any }>(`/projects/${projectId}/documents/import-github`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  addReferenceLink: (projectId: string, data: { url: string; title: string; description?: string; category?: string }) =>
    request<Document>(`/projects/${projectId}/documents/add-link`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteDocument: (projectId: string, documentId: string) =>
    request<{ status: string; message: string }>(`/projects/${projectId}/documents/${documentId}`, {
      method: 'DELETE',
    }),
  getDocumentPassages: (projectId: string, documentId: string) =>
    request<Passage[]>(`/projects/${projectId}/documents/${documentId}/passages`),

  // Responsibilities & Ownership
  listResponsibilities: (projectId: string) =>
    request<ProjectResponsibility[]>(`/projects/${projectId}/responsibilities`),
  createResponsibility: (projectId: string, data: Partial<ProjectResponsibility>) =>
    request<ProjectResponsibility>(`/projects/${projectId}/responsibilities`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateResponsibility: (projectId: string, respId: string, data: Partial<ProjectResponsibility>) =>
    request<ProjectResponsibility>(`/projects/${projectId}/responsibilities/${respId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteResponsibility: (projectId: string, respId: string) =>
    request<{ status: string; message: string }>(`/projects/${projectId}/responsibilities/${respId}`, {
      method: 'DELETE',
    }),
  extractResponsibilities: (projectId: string) =>
    request<{ status: string; message: string; count: number }>(`/projects/${projectId}/responsibilities/extract`, {
      method: 'POST',
    }),

  // Hardware Assets
  listHardwareAssets: (projectId: string) =>
    request<HardwareAsset[]>(`/projects/${projectId}/hardware`),
  createHardwareAsset: (projectId: string, data: Partial<HardwareAsset>) =>
    request<HardwareAsset>(`/projects/${projectId}/hardware`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateHardwareAsset: (projectId: string, assetId: string, data: Partial<HardwareAsset>) =>
    request<HardwareAsset>(`/projects/${projectId}/hardware/${assetId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Claims & Evidence
  listClaims: (projectId: string, statusFilter?: string, typeFilter?: string) => {
    const params = new URLSearchParams();
    if (statusFilter) params.append('status_filter', statusFilter);
    if (typeFilter) params.append('type_filter', typeFilter);
    const qs = params.toString();
    return request<Claim[]>(`/projects/${projectId}/claims${qs ? `?${qs}` : ''}`);
  },
  createClaim: (projectId: string, data: Partial<Claim>) =>
    request<Claim>(`/projects/${projectId}/claims`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateClaim: (projectId: string, claimId: string, data: Partial<Claim>) =>
    request<Claim>(`/projects/${projectId}/claims/${claimId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  reviewClaim: (projectId: string, claimId: string, status: string, reviewer_notes?: string) =>
    request<Claim>(`/projects/${projectId}/claims/${claimId}/review`, {
      method: 'POST',
      body: JSON.stringify({ status, reviewer_notes }),
    }),

  // Conflicts
  listConflicts: (projectId: string) => request<EvidenceConflict[]>(`/projects/${projectId}/conflicts`),
  resolveConflict: (projectId: string, conflictId: string, resolution_choice: string, resolution_notes: string) =>
    request<EvidenceConflict>(`/projects/${projectId}/conflicts/${conflictId}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ resolution_choice, resolution_notes }),
    }),

  // Risks & Exposure
  listRisks: (projectId: string) => request<Risk[]>(`/projects/${projectId}/risks`),
  createRisk: (projectId: string, data: Partial<Risk>) =>
    request<Risk>(`/projects/${projectId}/risks`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateRisk: (projectId: string, riskId: string, data: Partial<Risk>) =>
    request<Risk>(`/projects/${projectId}/risks/${riskId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  getDepartureScore: (projectId: string) =>
    request<DepartureExposureScore>(`/projects/${projectId}/risks/departure-score`),

  // Knowledge Gaps
  listGaps: (projectId: string) => request<KnowledgeGap[]>(`/projects/${projectId}/gaps`),
  resolveGap: (projectId: string, gapId: string, resolution: string) =>
    request<KnowledgeGap>(`/projects/${projectId}/gaps/${gapId}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ resolution }),
    }),

  // Simulator
  runSimulation: (projectId: string, scenario_type: string, target_entity: string, delay_weeks: number = 2) =>
    request<ScenarioResult>(`/projects/${projectId}/simulator`, {
      method: 'POST',
      body: JSON.stringify({ scenario_type, target_entity, delay_weeks }),
    }),
  getSimulationTargets: (projectId: string) =>
    request<{ people: string[]; components: string[] }>(`/projects/${projectId}/simulator/targets`),
  saveSimulationScenario: (projectId: string, scenario_name: string, scenario_type: string, target_entity: string, results: any) =>
    request<SavedScenario>(`/projects/${projectId}/simulator/save`, {
      method: 'POST',
      body: JSON.stringify({ scenario_name, scenario_type, target_entity, results }),
    }),
  listSavedScenarios: (projectId: string) =>
    request<SavedScenario[]>(`/projects/${projectId}/simulator/saved`),

  // Copilot
  askCopilot: (projectId: string, question: string) =>
    request<CopilotResponse>(`/projects/${projectId}/copilot`, {
      method: 'POST',
      body: JSON.stringify({ question }),
    }),

  // Handover Workflow
  getHandover: (projectId: string) => request<Handover>(`/projects/${projectId}/handover`),
  getHandoverAiCheck: (projectId: string) =>
    request<{ status: string; findings: any[]; total_checks: number }>(`/projects/${projectId}/handover/ai-check`),
  updateHandoverDetails: (projectId: string, data: { title?: string; summary?: string }) =>
    request<Handover>(`/projects/${projectId}/handover/details`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  submitHandover: (projectId: string) =>
    request<Handover>(`/projects/${projectId}/handover/submit`, {
      method: 'POST',
    }),
  requestHandoverChanges: (projectId: string, notes: string) =>
    request<Handover>(`/projects/${projectId}/handover/request-changes`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    }),
  approveHandover: (projectId: string) =>
    request<Handover>(`/projects/${projectId}/handover/approve`, {
      method: 'POST',
    }),
  publishHandover: (projectId: string) =>
    request<Handover>(`/projects/${projectId}/handover/publish`, {
      method: 'POST',
    }),
  receiveHandover: (projectId: string, notes?: string) =>
    request<Handover>(`/projects/${projectId}/handover/receive`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    }),
  updateChecklistItem: (projectId: string, itemId: string, status: string, details?: string) =>
    request<HandoverChecklistItem>(`/projects/${projectId}/handover/checklist/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify({ status, details }),
    }),
  getExportPdfUrl: (projectId: string) => `/api/v1/projects/${projectId}/handover/export-pdf`,

  // Audit
  listAudit: (projectId: string) => request<AuditEvent[]>(`/projects/${projectId}/audit`),
};
