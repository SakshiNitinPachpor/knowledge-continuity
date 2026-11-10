# API Documentation — Knowledge Continuity

Interactive Swagger / OpenAPI UI is served live at `http://127.0.0.1:8000/docs`.

All protected endpoints require an `Authorization: Bearer <token>` header obtained from `/api/v1/auth/login`.

---

## 1. Authentication (`/api/v1/auth`)

### `POST /api/v1/auth/register`
Creates a new corporate account.
```json
{
  "email": "user@continuity.internal",
  "full_name": "Full Name",
  "title": "Principal Architect",
  "password": "Password123!"
}
```

### `POST /api/v1/auth/login`
OAuth2 password form login. Returns JWT access token.

### `GET /api/v1/auth/me`
Retrieves current authenticated profile and global admin privileges.

---

## 2. Workspaces & Projects (`/api/v1/workspaces`, `/api/v1/projects`)

### `GET /api/v1/projects`
Lists all projects accessible to the authenticated user with real database counters (`document_count`, `claims_count`, `verified_claims_count`, `open_risks_count`, `open_gaps_count`).

### `POST /api/v1/projects`
Creates a project within a workspace and auto-assigns the creator as `project_owner`.

### `GET /api/v1/projects/{project_id}`
Retrieves project overview, role metadata, and continuity risk score.

### `POST /api/v1/projects/{project_id}/members`
Assigns a user to a project with one of: `workspace_admin`, `project_owner`, `reviewer`, `contributor`, `successor`.

---

## 3. Documents (`/api/v1/projects/{project_id}/documents`)

### `POST /api/v1/projects/{project_id}/documents/upload`
Uploads a document (`.pdf`, `.docx`, `.txt`, `.md`). Extracts passages, generates candidate claims, and runs automatic contradiction & knowledge gap scans.

### `GET /api/v1/projects/{project_id}/documents`
Lists ingested documents with parsing status, page count, and claims extracted.

### `GET /api/v1/projects/{project_id}/documents/{document_id}/passages`
Retrieves exact text passages with character offsets and section headers.

---

## 4. Evidence Review & Claims (`/api/v1/projects/{project_id}/claims`)

### `GET /api/v1/projects/{project_id}/claims`
Lists claims. **RBAC Rule:** Successors only receive verified claims.

### `POST /api/v1/projects/{project_id}/claims/{claim_id}/review`
Reviewer action: sets status (`verified`, `rejected`, `needs_review`) with reviewer notes.

### `POST /api/v1/projects/{project_id}/conflicts/{conflict_id}/resolve`
Human conflict resolution: selects `claim_a`, `claim_b`, or custom resolution notes.

---

## 5. Continuity Intelligence Engines

### `GET /api/v1/projects/{project_id}/risks/departure-score`
Computes explainable 5-factor Departure Continuity Exposure Score (0-100).

### `POST /api/v1/projects/{project_id}/simulator`
Runs evidence-grounded bounded What-If scenario simulations.

### `POST /api/v1/projects/{project_id}/copilot`
Grounded inquiry query. Retrieves verified claims only with exact passage citations.

---

## 6. Handover Workflow (`/api/v1/projects/{project_id}/handover`)

### `GET /api/v1/projects/{project_id}/handover`
Retrieves handover checklist and status. Restricted from successors until approved.

### `POST /api/v1/projects/{project_id}/handover/submit`
Outgoing contributor submits draft handover for Project Creator verification.

### `POST /api/v1/projects/{project_id}/handover/approve`
Project Creator sign-off and verification approval.

### `POST /api/v1/projects/{project_id}/handover/publish`
Releases approved handover dossier to successor.

### `POST /api/v1/projects/{project_id}/handover/receive`
Successor confirms receipt and logs onboarding notes.

### `GET /api/v1/projects/{project_id}/handover/export-pdf`
Streams publication-grade PDF report generated via ReportLab.
