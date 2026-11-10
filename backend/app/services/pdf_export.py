import io
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from sqlalchemy.orm import Session
from app.models import Project, Handover, Claim, Risk, KnowledgeGap, Document, ProjectResponsibility, HardwareAsset

def generate_handover_pdf(project_id: str, db: Session) -> io.BytesIO:
    """
    Builds a structured, publication-grade PDF handover report using ReportLab.
    Contains verified knowledge claims, code repositories, hardware assets, and responsibility matrix.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    handover = db.query(Handover).filter(Handover.project_id == project_id).first()
    
    # Data extraction
    claims = db.query(Claim).filter(Claim.project_id == project_id, Claim.status == "verified").all()
    risks = db.query(Risk).filter(Risk.project_id == project_id).all()
    gaps = db.query(KnowledgeGap).filter(KnowledgeGap.project_id == project_id).all()
    docs = db.query(Document).filter(Document.project_id == project_id).all()
    responsibilities = db.query(ProjectResponsibility).filter(ProjectResponsibility.project_id == project_id).all()
    hardware_assets = db.query(HardwareAsset).filter(HardwareAsset.project_id == project_id).all()

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )

    styles = getSampleStyleSheet()
    
    # Brand styles matching product design system
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#151923')
    )
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#64748B')
    )
    h2_style = ParagraphStyle(
        'SectionH2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#1B2432'),
        spaceBefore=10,
        spaceAfter=5
    )
    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor('#151923')
    )
    badge_style = ParagraphStyle(
        'Badge',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#0F766E')
    )

    story = []

    # Title Banner
    story.append(Paragraph("KNOWLEDGE CONTINUITY — PRESERVE KNOWLEDGE. CONTINUE PROGRESS.", subtitle_style))
    story.append(Paragraph(f"Official Handover Dossier: {project.name if project else 'Project'}", title_style))
    story.append(Paragraph(f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')} | Handover Status: {handover.status.upper() if handover else 'DRAFT'}", subtitle_style))
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#B9825A'), spaceAfter=10))

    # Metadata Card
    metadata_data = [
        [
            Paragraph("<b>Project Code:</b>", body_style),
            Paragraph(project.code if project else "N/A", body_style),
            Paragraph("<b>Approved By:</b>", body_style),
            Paragraph(handover.approved_by.full_name if (handover and handover.approved_by) else "Pending Review", body_style)
        ],
        [
            Paragraph("<b>Handover Completion:</b>", body_style),
            Paragraph(f"{handover.completion_percentage if handover else 0}%", badge_style),
            Paragraph("<b>Target Handover Date:</b>", body_style),
            Paragraph(project.target_handover_date.strftime('%Y-%m-%d') if (project and project.target_handover_date) else "Immediate", body_style)
        ]
    ]
    meta_table = Table(metadata_data, colWidths=[130, 130, 130, 140])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8F6F1')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#E5E1D8')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E5E1D8')),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 10))

    # Section 1: Executive Overview
    story.append(Paragraph("1. Executive Project Overview", h2_style))
    overview_text = project.description if (project and project.description) else "Structured knowledge continuity handover package preserving critical project context."
    story.append(Paragraph(overview_text, body_style))
    story.append(Spacer(1, 8))

    # Section 2: Responsibility Handover Matrix
    story.append(Paragraph(f"2. Component Ownership & Responsibility Matrix ({len(responsibilities)} assigned)", h2_style))
    if responsibilities:
        resp_data = [
            [Paragraph("<b>Project Area</b>", body_style), Paragraph("<b>Owner</b>", body_style), Paragraph("<b>Status</b>", body_style), Paragraph("<b>Evidence / Notes</b>", body_style)]
        ]
        for r in responsibilities:
            resp_data.append([
                Paragraph(r.area, body_style),
                Paragraph(r.assigned_to, body_style),
                Paragraph(r.status.replace("_", " ").title(), badge_style if r.status == "confirmed" else body_style),
                Paragraph(r.evidence_summary or r.successor_notes or "Documented", subtitle_style)
            ])
        resp_table = Table(resp_data, colWidths=[140, 110, 90, 190])
        resp_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F1EFEA')),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#E5E1D8')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E5E1D8')),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ]))
        story.append(resp_table)
    else:
        story.append(Paragraph("No formal responsibilities assigned yet.", subtitle_style))
    story.append(Spacer(1, 8))

    # Section 3: Hardware & Circuit Assets
    if hardware_assets:
        story.append(Paragraph(f"3. Hardware Systems & Circuit Assets ({len(hardware_assets)} documented)", h2_style))
        for hw in hardware_assets:
            story.append(Paragraph(f"⚡ <b>{hw.title}</b> ({hw.category.replace('_', ' ').title()}) - Status: {hw.status}", body_style))
            if hw.notes:
                story.append(Paragraph(f"   Notes: {hw.notes}", subtitle_style))
            story.append(Spacer(1, 3))
        story.append(Spacer(1, 6))

    # Section 4: Decisions & Rationale
    decisions = [c for c in claims if c.claim_type == "decision"]
    story.append(Paragraph(f"4. Approved Decisions & Architectural Rationale ({len(decisions)} verified)", h2_style))
    if decisions:
        for d in decisions:
            story.append(Paragraph(f"• <b>{d.title}</b>", body_style))
            story.append(Paragraph(f"  {d.content}", body_style))
            if d.entity_owner:
                story.append(Paragraph(f"  <i>Decision Lead: {d.entity_owner} | Source: {d.document.original_name if d.document else 'Document'}</i>", subtitle_style))
            story.append(Spacer(1, 3))
    else:
        story.append(Paragraph("No decisions currently marked verified in handover scope.", subtitle_style))
    story.append(Spacer(1, 6))

    # Section 5: Completed Work & Milestones
    completed = [c for c in claims if c.claim_type in ["completed_task", "milestone"]]
    story.append(Paragraph(f"5. Completed Work & Achieved Milestones ({len(completed)} verified)", h2_style))
    if completed:
        for item in completed:
            date_str = f" [{item.date_reference}]" if item.date_reference else ""
            story.append(Paragraph(f"✓ <b>{item.title}{date_str}</b>: {item.content}", body_style))
            story.append(Spacer(1, 2))
    else:
        story.append(Paragraph("No verified completed tasks recorded.", subtitle_style))
    story.append(Spacer(1, 6))

    # Section 6: In-Flight Tasks
    pending = [c for c in claims if c.claim_type in ["unfinished_task", "in_progress_task"]]
    story.append(Paragraph(f"6. In-Flight Deliverables & Pending Tasks ({len(pending)} verified)", h2_style))
    if pending:
        for p in pending:
            owner_info = f" (Previous Owner: {p.entity_owner})" if p.entity_owner else " (Unassigned)"
            story.append(Paragraph(f"◻ <b>{p.title}</b>{owner_info}: {p.content}", body_style))
            story.append(Spacer(1, 2))
    else:
        story.append(Paragraph("No pending work items.", subtitle_style))
    story.append(Spacer(1, 6))

    # Section 7: Risks & Mitigations
    story.append(Paragraph(f"7. Continuity Risks & Mitigations ({len(risks)} identified)", h2_style))
    if risks:
        for r in risks:
            story.append(Paragraph(f"⚠ <b>[{r.severity.upper()}] {r.title}</b>", body_style))
            story.append(Paragraph(f"  Impact: {r.impact} | Mitigation: {r.suggested_mitigation}", subtitle_style))
            story.append(Spacer(1, 3))
    else:
        story.append(Paragraph("No open continuity risks flagged.", subtitle_style))
    story.append(Spacer(1, 6))

    # Section 8: Referenced Knowledge Sources
    story.append(Paragraph(f"8. Ingested Project Knowledge Sources ({len(docs)} files/repos)", h2_style))
    for doc_item in docs:
        path_info = f" ({doc_item.folder_path})" if doc_item.folder_path else ""
        story.append(Paragraph(f"📄 <b>{doc_item.original_name}</b>{path_info} [{doc_item.category.upper()}] - Status: {doc_item.status}", body_style))
    story.append(Spacer(1, 10))

    # Footer notice
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#CBD5E1'), spaceAfter=6))
    story.append(Paragraph("Knowledge Continuity Platform | Core Principle: AI assists with reconstruction. Evidence supports claims. Humans make the final decisions.", subtitle_style))

    doc.build(story)
    buffer.seek(0)
    return buffer
