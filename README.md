# Knowledge Continuity
> **Preserve Knowledge. Continue Progress.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg?logo=typescript)](https://www.typescriptlang.org)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.0-38B2AC.svg?logo=tailwind-css)](https://tailwindcss.com)

---

## 1. Product Overview

When an employee, team member, project owner, or principal architect leaves an organisation, critical knowledge often leaves with them. 

**Knowledge Continuity** is an enterprise AI-assisted handover platform. It ingests project documentation (specifications, architecture decision records, steering committee minutes, operational runbooks), reconstructs candidate claims, anchors every claim to traceable source evidence, detects contradictions and single-person bottlenecks, guides human verification, and generates an official handover package for incoming successors.

### Core Foundational Principle
> **AI assists with reconstruction. Evidence supports claims. Humans make the final decisions. Never present AI-generated assumptions as verified facts.**

---

## 2. Key Product Features

| Feature | Description |
|---|---|
| **1. AI Risk Radar** | Surfaces single-person bottlenecks, unmitigated dependencies, and unfinished deliverables with explainable severity and mitigations. |
| **2. Evidence & Trust Engine** | Strict evidence lineage linking every claim to exact document passages, page numbers, and quotes. Flagged as *Verified*, *Needs Review*, *Conflicting Evidence*, or *Rejected*. |
| **3. Successor AI Copilot** | In-app assistant strictly grounded in approved project knowledge. Cites exact document passages and communicates uncertainty when context is missing. |
| **4. Permission Shield** | Backend-enforced Project Creator governance and data isolation. Successors cannot access unapproved drafts or rejected claims. |
| **5. Handover Completion Tracker** | Multi-stage enterprise verification workflow: Preparation → Submission → Creator Verification → Publishing → Successor Receipt. |
| **6. What-If Impact Simulator** | Bounded scenario analysis modeling the blast radius if a lead engineer departs, deliverables slip, or external dependencies fail. |
| **7. Knowledge Gap Detector** | Highlights tasks without owners, decisions without documented rationale, and unmonitored dependencies with clarifying questions. |
| **8. Departure Risk Score** | Explainable 0-100 metric measuring project continuity exposure (key-person concentration, unverified claims, documentation conflicts). |

---

## 3. Quick Start & Execution

### Prerequisites
- Python 3.10+ (tested on Python 3.14)
- Node.js 18+ (tested on Node 26)

### 1. Launch Backend (FastAPI)
```bash
cd backend
pip install -r requirements.txt email-validator
python run.py
```
*API runs at `http://127.0.0.1:8000` (OpenAPI Swagger at `/docs`).*

### 2. Launch Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
*Web application runs at `http://localhost:5173`.*

---

## 4. Accounts & Evaluation Workspaces

Knowledge Continuity is a complete self-service multi-tenant SaaS application.

### A. Independent User Registration
Any evaluator or judge can directly register a new private account at `http://localhost:5173/register`. New accounts receive private workspace isolation.

### B. Preloaded Reference Workspace (For Evaluation)
For fast testing, the database includes two realistic sample reference projects (`Project Horizon` and `Project Sentinel`) in the owner workspace:

| Persona | Email | Password | Role & Permissions |
|---|---|---|---|
| **Alex Mercer** | `owner@continuity.internal` | Not disclosed | Workspace Admin & VP of Engineering |
| **Sarah Jenkins** | `sarah.jenkins@continuity.internal` | Not disclosed | Outgoing Principal Architect |
| **Marcus Vance** | `marcus.vance@continuity.internal` | Not disclosed | Lead Reviewer (Verifies claims, resolves conflicts) |
| **Elena Rostova** | `elena.rostova@continuity.internal` | Not disclosed | Successor Engineer (Restricted to approved handovers) |

---

## 5. Automated Verification & Testing

Run the full pytest automated test suite:
```bash
cd backend
python -m pytest tests/test_continuity_suite.py -v
```
All 8 test suites pass, covering user registration, workspace & project creation, document parsing, evidence extraction, contradiction detection, human review & resolution, successor role isolation, and PDF report generation.

---

## 6. Architecture & Documentation Directory

- [SETUP.md](file:///c:/Users/saksh/OneDrive/Desktop/Knowledge%20Continuity/SETUP.md): Detailed local setup instructions.
- [ARCHITECTURE.md](file:///c:/Users/saksh/OneDrive/Desktop/Knowledge%20Continuity/ARCHITECTURE.md): Technical architecture, mermaid diagrams, and database models.
- [API_DOCUMENTATION.md](file:///c:/Users/saksh/OneDrive/Desktop/Knowledge%20Continuity/API_DOCUMENTATION.md): Complete REST endpoint reference.
- [SECURITY.md](file:///c:/Users/saksh/OneDrive/Desktop/Knowledge%20Continuity/SECURITY.md): RBAC enforcement, session security, and truth safeguards.
- [TESTING.md](file:///c:/Users/saksh/OneDrive/Desktop/Knowledge%20Continuity/TESTING.md): Test verification suite and 12-step acceptance criteria.
- [DEPLOYMENT.md](file:///c:/Users/saksh/OneDrive/Desktop/Knowledge%20Continuity/DEPLOYMENT.md): Production containerization and cloud instructions.
- [.env.example](file:///c:/Users/saksh/OneDrive/Desktop/Knowledge%20Continuity/.env.example): Environment variable configuration template.

---

## 7. Known Boundaries & Limitations

1. **OCR on Scanned Images**: The current parser extracts embedded text streams from digital PDFs and Word documents. Optical Character Recognition (OCR) for scanned bitmaps requires Tesseract/PaddleOCR integration in a future release.
2. **Provider-Agnostic AI**: Operates cleanly by default in deterministic pattern mode with zero API key dependencies; enabling live Gemini or OpenAI generation requires adding API keys in `.env`.
