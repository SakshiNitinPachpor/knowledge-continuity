# Setup Guide — Knowledge Continuity

## Prerequisites
- **Python**: Version 3.10+ (Tested on Python 3.14)
- **Node.js**: Version 18+ (Tested on Node 26 LTS)
- **Package Managers**: `pip` and `npm`

---

## 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# (Optional) Create and activate virtual environment
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
pip install email-validator

# Run automated tests to verify environment integrity
pytest tests/test_continuity_suite.py

# Start backend server (runs on http://127.0.0.1:8000)
python run.py
```

FastAPI interactive OpenAPI documentation is immediately available at `http://127.0.0.1:8000/docs`.

---

## 2. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server (runs on http://localhost:5173)
npm run dev
```

The frontend development server includes a built-in proxy forwarding all `/api` requests to `http://127.0.0.1:8000`.

---

## 3. Account Creation & Sample Evaluation Workspace

Knowledge Continuity is a complete self-service multi-tenant SaaS application.

### A. Independent User Registration
Any evaluator or judge can directly register a new private account at `http://127.0.0.1:5173/register`. New accounts receive private workspace isolation.

### B. Preloaded Reference Workspace (For Evaluation)
For fast testing, the database includes two realistic sample reference projects (`Project Horizon` and `Project Sentinel`) in the owner workspace:

| Persona | Email | Password | Role & Permissions |
|---|---|---|---|
| **Alex Mercer** | `owner@continuity.internal` | `OwnerPass123!` | Workspace Admin & VP of Engineering |
| **Sarah Jenkins** | `sarah.jenkins@continuity.internal` | `SarahPass123!` | Outgoing Principal Architect |
| **Marcus Vance** | `marcus.vance@continuity.internal` | `MarcusPass123!` | Lead Reviewer (Verifies claims, resolves conflicts) |
| **Elena Rostova** | `elena.rostova@continuity.internal` | `ElenaPass123!` | Successor Engineer (Restricted to approved handovers) |
