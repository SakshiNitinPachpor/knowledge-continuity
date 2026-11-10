import os
import secrets
from datetime import datetime, timedelta
from pathlib import Path
from sqlalchemy.orm import Session
from app.models import (
    User, Workspace, WorkspaceMember, Project, ProjectMember,
    Document, ExtractedPassage, Claim, EvidenceConflict, Risk,
    KnowledgeGap, Handover, HandoverChecklistItem, AuditEvent,
    ProjectResponsibility, HardwareAsset
)
from app.services.auth_service import get_password_hash
from app.services.document_parser import parse_document
from app.services.reconstruction_engine import extract_claims_from_passages
from app.services.conflict_engine import scan_project_conflicts
from app.services.gap_engine import scan_project_gaps
from app.services.risk_engine import calculate_departure_risk_score, sync_project_risks
from app.services.handover_service import get_or_create_handover

HORIZON_DOC_1 = """# Project Horizon: Core Architecture Specification v2.4
[SYNTHETIC REFERENCE DATA FOR EVALUATION]

## Executive Overview
Project Horizon modernizes our high-throughput payment processing pipeline.
Principal Architect: Sarah Jenkins.
Engineering Lead: Sarah Jenkins.

## Architectural Decisions
1. Primary Persistence: Selected PostgreSQL 16 with TimescaleDB for transactional ledger integrity and ACID compliance.
2. Authentication: Implemented OAuth2 / OIDC mutual TLS gateways for partner connectivity.
3. Target Cutover Date: The production cutover deadline is officially confirmed for 2026-10-15.

## Completed Milestones
- Microservices core payment ledger service completed and verified under 15,000 TPS load test.
- Kafka event streaming backbone deployed on Kubernetes cluster.

## Dependencies & Infrastructure
- Depends on external clearing house settlement API.
- Infrastructure depends on AWS KMS HSM for hardware encryption keys. Owned by Sarah Jenkins.

## Active Risks & Bottlenecks
- Single point of failure: Sarah Jenkins holds exclusive institutional context for the ledger rollback state machine.
"""

HORIZON_DOC_2 = """# Project Horizon: Executive Steering Committee - Q3 Minutes
[SYNTHETIC REFERENCE DATA FOR EVALUATION]

Date: August 2026
Attendees: Sarah Jenkins, Marcus Vance, Elena Rostova, VP Engineering.

## Milestone & Progress Review
- Management reviewed production readiness.
- Target Cutover Date: In the Q3 steering meeting, the committee agreed that the target cutover is delayed to 2026-11-20 due to mandatory external compliance certification.
- Architectural Note: VP Engineering asked whether DynamoDB should be used instead of PostgreSQL for ledger caching. Sarah Jenkins affirmed PostgreSQL was chosen.

## Unfinished & Pending Tasks
- Card Tokenization PCI-DSS Level 1 compliance sign-off is pending.
- Remaining work: Disaster Recovery multi-region failover drill is outstanding.
- Must complete: Finalize production cryptographic key rotation runbook.

## Successor Transition Notes
- Elena Rostova has been appointed as incoming Lead Successor.
- Marcus Vance will serve as Lead Reviewer for the handover package.
"""

SENTINEL_DOC_1 = """# Project Sentinel: Zero-Trust Identity Gateway v1.8
[SYNTHETIC REFERENCE DATA FOR EVALUATION]

## Executive Overview
Project Sentinel consolidates customer authentication and fine-grained authorization into a unified Zero-Trust IAM proxy.
Lead Engineer: David Park.

## Architectural Decisions
1. Authorization Model: Decided to adopt Open Policy Agent (OPA) with Rego policies for RBAC and ABAC evaluation.
2. Session Storage: Selected distributed Redis Cluster with at-rest encryption for distributed token revocation.
3. Target Cutover Date: Production deployment scheduled for 2026-09-30.

## Completed Milestones
- OPA micro-service policy evaluation latency verified below 3ms at p99.
- Redis Cluster replication deployed across three availability zones.

## Pending Tasks & Dependencies
- Pending: Mutual TLS certificate rotation automation using HashiCorp Vault.
- Dependency: Internal PKI root certificate CA migration must be finished prior to rollout.
"""

def seed_reference_projects(db: Session, uploads_dir: Path) -> dict:
    """
    Creates two realistic synthetic sample reference projects in the product owner's workspace
    for testing and evaluation. These projects remain private to the owner's workspace.
    """
        # 1. Product Owner Account
    owner_email = "owner@continuity.internal"
    owner_user = db.query(User).filter(User.email == owner_email).first()

    if not owner_user:
        owner_password = os.getenv("DEMO_OWNER_PASSWORD") or secrets.token_urlsafe(32)

        owner_user = User(
            email=owner_email,
            full_name="Alex Mercer",
            title="VP of Engineering",
            hashed_password=get_password_hash(owner_password),
            is_active=True,
            is_superuser=True
        )
        db.add(owner_user)
        db.commit()
        db.refresh(owner_user)

    # Colleague Accounts for Sample Projects
    colleagues = [
        ("sarah.jenkins@continuity.internal", "Sarah Jenkins", "Principal Architect"),
        ("marcus.vance@continuity.internal", "Marcus Vance", "Lead Reviewer"),
        ("elena.rostova@continuity.internal", "Elena Rostova", "Successor Engineer"),
        ("david.park@continuity.internal", "David Park", "Staff Security Engineer")
    ]

    colleague_map = {}

    for email, name, title in colleagues:
        u = db.query(User).filter(User.email == email).first()

        if not u:
            random_password = secrets.token_urlsafe(32)
            u = User(
                email=email,
                full_name=name,
                title=title,
                hashed_password=get_password_hash(random_password),
                is_active=True,
                is_superuser=False
            )
            db.add(u)
            db.commit()
            db.refresh(u)

        colleague_map[email] = u