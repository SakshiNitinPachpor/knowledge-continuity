# Testing & Quality Verification Suite

## Automated Backend Test Suite

The test suite is located in `backend/tests/test_continuity_suite.py` and uses an isolated in-memory SQLite database via SQLAlchemy's `StaticPool`.

### Running Tests

```bash
cd backend
python -m pytest tests/test_continuity_suite.py -v
```

### Verified Test Cases

| Test Case | Description | Result |
|---|---|---|
| `test_root_endpoint` | Verifies product identity, branding, and operational status | **PASSED** |
| `test_user_registration_and_login` | Validates registration, password hashing, and JWT issuance | **PASSED** |
| `test_workspace_and_project_creation` | Tests workspace creation and project initialization | **PASSED** |
| `test_document_upload_and_evidence_extraction` | Ingests document, extracts passages, and creates candidate claims | **PASSED** |
| `test_evidence_conflict_detection` | Ingests contradictory document and detects target date discrepancy | **PASSED** |
| `test_claim_review_and_conflict_resolution` | Tests reviewer resolution of contradictory evidence | **PASSED** |
| `test_successor_role_restrictions` | Enforces that successor cannot view unapproved drafts or edit claims | **PASSED** |
| `test_handover_approval_and_pdf_export` | Verifies checklist validation, publication, and ReportLab PDF streaming | **PASSED** |

---

## End-to-End Acceptance Verification (12 Checkpoints)

1. **New User Registration:** User registers and immediately receives authenticated JWT. (Verified)
2. **Project Creation:** User creates workspace and project; assigned `project_owner`. (Verified)
3. **Document Ingestion:** Uploads `.md`, `.txt`, `.pdf`, `.docx`; status transitions from `parsing` to `processed`. (Verified)
4. **Structured Knowledge Reconstruction:** Claims extracted and categorized into decisions, tasks, milestones, and dependencies. (Verified)
5. **Traceable Evidence:** Every claim displays source document, page number, and quote. (Verified)
6. **Visible Conflict Detection:** Contradictory target dates (Oct 15 vs Nov 20) are flagged as `conflicting_evidence`. (Verified)
7. **Human Claim Review:** Reviewer can edit claim content, verify, or reject with reviewer notes. (Verified)
8. **Handover Approval:** Publication locked until mandatory items are satisfied and conflicts resolved. (Verified)
9. **Successor Access:** Successor views approved claims, runs impact simulator, and receives published handover dossier. (Verified)
10. **Successor Restriction:** Successor blocked from unapproved drafts and rejected items. (Verified)
11. **PDF Export:** PDF generated dynamically with ReportLab, matching SaaS branding. (Verified)
12. **Incognito / Private Session:** Operates cleanly in private browsing sessions. (Verified)
