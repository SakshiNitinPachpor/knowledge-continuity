# Security & Permission Guard Specifications

**Product:** Knowledge Continuity  
**Tagline:** Preserve Knowledge. Continue Progress.

---

## 1. Authentication & Session Management
- **Password Hashing:** Passwords are never stored in plaintext. They are salted and hashed using bcrypt (with SHA-256 fallback).
- **JWT Protection:** Sessions use cryptographically signed JSON Web Tokens (HS256) with configurable expiration (`ACCESS_TOKEN_EXPIRE_MINUTES`).
- **No Token Exposure:** Tokens are stored exclusively in client `localStorage` and sent via standard `Authorization: Bearer` HTTP headers.

---

## 2. Server-Side RBAC Enforcement (Smart Permission Shield)
Permissions are enforced at the API route layer in FastAPI:

1. **Role Weights & Hierarchy:**
   - `workspace_admin` (50): Workspace management & global audit.
   - `project_owner` (40): Project configuration & member invitations.
   - `outgoing_member` (35): Handover preparation, decisions, and review submission.
   - `reviewer` (30): Claim verification, contradiction resolution, checklist sign-off.
   - `contributor` (20): Ingests documents and submits candidate claims.
   - `successor` (10): Successor view.

2. **Successor Access Isolation:**
   - Cannot view draft or unapproved handovers (`403 Forbidden`).
   - Cannot view raw unreviewed or rejected candidate claims.
   - Cannot modify project settings or approve claims.

3. **Tamper Resistance:**
   - Users cannot escalate their own role. Role promotion requires `project_owner` or `workspace_admin` authority.

---

## 3. Document Ingestion Security
- **File Type Restrictions:** Strictly whitelisted extensions: `.pdf`, `.docx`, `.txt`, `.md`.
- **Upload Size Limits:** Hard limit of 25MB enforced before processing.
- **Path Traversal Protection:** Internal filenames use UUID-prefixed safe basenames (`{project_id}_{uuid}_{filename}`), preventing directory traversal attacks (`../`).
- **Private Storage:** Uploaded files are not served directly via static public directories; access is granted only via authenticated endpoints.

---

## 4. Truth & Evidence Safeguards
- **Zero Fabricated Citations:** The AI Copilot cannot invent document quotes. If evidence does not exist in the database, the assistant explicitly states uncertainty.
- **Immutable Audit Logging:** Every review decision, rejection, conflict resolution, and approval creates an `AuditEvent` with user attribution, timestamp, and previous state.
