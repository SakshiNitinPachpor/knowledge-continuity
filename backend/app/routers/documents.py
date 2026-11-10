import os
import json
import uuid
import shutil
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Document, ExtractedPassage, Claim, User, AuditEvent, HardwareAsset
from app.schemas import (
    DocumentOut, PassageOut, ZipExtractionReport,
    GithubImportRequest, ReferenceLinkCreate
)
from app.services.auth_service import get_current_user
from app.services.rbac import require_project_role
from app.services.document_parser import parse_document, safe_extract_zip, get_file_category
from app.services.reconstruction_engine import (
    extract_claims_from_passages,
    sync_project_responsibilities_from_evidence
)
from app.services.repository_service import import_github_repository
from app.services.conflict_engine import scan_project_conflicts
from app.services.gap_engine import scan_project_gaps
from app.services.risk_engine import sync_project_risks, calculate_departure_risk_score
from app.config import settings

router = APIRouter(prefix="/projects/{project_id}/documents", tags=["Documents"])

def process_single_file_record(
    file_path: Path,
    orig_name: str,
    project_id: str,
    current_user: User,
    db: Session,
    folder_path: str = ""
) -> Document:
    """Helper to parse a file, save DB record, extract passages and grounded claims."""
    ext = Path(orig_name).suffix.lower()
    file_type = ext.replace(".", "")
    category = get_file_category(file_type)
    file_size = os.path.getsize(file_path)

    doc = Document(
        project_id=project_id,
        uploaded_by_id=current_user.id,
        filename=file_path.name,
        original_name=orig_name,
        file_type=file_type,
        category=category,
        folder_path=folder_path if folder_path else (Path(orig_name).parent.as_posix() if ("/" in orig_name or "\\" in orig_name) else ""),
        file_size=file_size,
        file_path=str(file_path),
        status="parsing"
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    try:
        parsed_result = parse_document(file_path, file_type, relative_path=folder_path)
        doc.page_count = parsed_result["page_count"]
        doc.extracted_text = parsed_result["total_text"]
        doc.metadata_json = json.dumps(parsed_result.get("metadata", {}))
        doc.status = "processed"
        db.commit()

        # If hardware image, auto-register as Hardware Asset
        if category == "hardware":
            hw_asset = HardwareAsset(
                project_id=project_id,
                document_id=doc.id,
                title=f"Hardware Diagram: {Path(orig_name).stem}",
                category="circuit_diagram" if "circuit" in orig_name.lower() else "component_photo",
                components_json="[]",
                status="needs_confirmation",
                notes=f"Auto-indexed from {orig_name}. Ready for component verification."
            )
            db.add(hw_asset)
            db.commit()

        # Save extracted passages
        passages_for_engine = []
        for p in parsed_result["passages"]:
            passage_obj = ExtractedPassage(
                document_id=doc.id,
                project_id=project_id,
                page_number=p["page_number"],
                section_heading=p["section_heading"],
                text_content=p["text_content"],
                char_offset_start=p["char_offset_start"],
                char_offset_end=p["char_offset_end"]
            )
            db.add(passage_obj)
            db.flush()
            p["id"] = passage_obj.id
            passages_for_engine.append(p)
        db.commit()

        # Extract grounded claims
        candidate_claims = extract_claims_from_passages(passages_for_engine, doc.original_name)
        for c in candidate_claims:
            claim_obj = Claim(
                project_id=project_id,
                document_id=doc.id,
                passage_id=c.get("passage_id"),
                claim_type=c.get("claim_type", "general"),
                title=c.get("title"),
                content=c.get("content"),
                confidence_score=c.get("confidence_score", 0.90),
                status=c.get("status", "needs_review"),
                entity_owner=c.get("entity_owner"),
                date_reference=c.get("date_reference")
            )
            db.add(claim_obj)
        db.commit()

        # Run automated intelligence scans & responsibility sync
        scan_project_conflicts(project_id, db)
        scan_project_gaps(project_id, db)
        sync_project_risks(project_id, db)
        calculate_departure_risk_score(project_id, db)
        sync_project_responsibilities_from_evidence(project_id, db)

        # Audit
        db.add(AuditEvent(
            project_id=project_id,
            user_id=current_user.id,
            user_email=current_user.email,
            action="document.uploaded",
            entity_type="Document",
            entity_id=doc.id,
            details=f"Processed '{orig_name}' ({file_size} bytes). Category: {category}. Extracted {len(candidate_claims)} claims."
        ))
        db.commit()

    except Exception as e:
        doc.status = "failed"
        doc.error_message = str(e)
        db.commit()

    return doc

@router.get("", response_model=List[DocumentOut])
def list_documents(
    project_id: str,
    category: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_project_role(project_id, current_user, "contributor", db)
    query = db.query(Document).filter(Document.project_id == project_id)
    if category:
        query = query.filter(Document.category == category)
    docs = query.order_by(Document.created_at.desc()).all()
    
    results = []
    for d in docs:
        claims_count = db.query(Claim).filter(Claim.document_id == d.id).count()
        results.append(DocumentOut(
            id=d.id,
            project_id=d.project_id,
            original_name=d.original_name,
            file_type=d.file_type,
            category=d.category or "document",
            folder_path=d.folder_path or "",
            file_size=d.file_size,
            status=d.status,
            page_count=d.page_count,
            metadata_json=d.metadata_json or "{}",
            error_message=d.error_message,
            created_at=d.created_at,
            claims_count=claims_count
        ))
    return results

@router.post("/upload", response_model=DocumentOut)
async def upload_document(
    project_id: str,
    file: UploadFile = File(...),
    folder_path: str = Form(""),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_project_role(project_id, current_user, "contributor", db)
    
    orig_name = file.filename or "uploaded_file"
    ext = Path(orig_name).suffix.lower()
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format '{ext}'. Allowed extensions: {', '.join(settings.ALLOWED_EXTENSIONS[:10])}..."
        )
        
    safe_filename = f"{project_id}_{uuid.uuid4().hex[:8]}_{Path(orig_name).name}"
    target_path = settings.UPLOAD_DIR / safe_filename
    
    file_bytes = await file.read()
    file_size = len(file_bytes)
    
    if file_size > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum upload size limit of {settings.MAX_UPLOAD_SIZE_MB}MB."
        )
        
    with open(target_path, "wb") as f:
        f.write(file_bytes)

    doc = process_single_file_record(target_path, orig_name, project_id, current_user, db, folder_path=folder_path)
    claims_count = db.query(Claim).filter(Claim.document_id == doc.id).count()

    return DocumentOut(
        id=doc.id,
        project_id=doc.project_id,
        original_name=doc.original_name,
        file_type=doc.file_type,
        category=doc.category or "document",
        folder_path=doc.folder_path or "",
        file_size=doc.file_size,
        status=doc.status,
        page_count=doc.page_count,
        metadata_json=doc.metadata_json or "{}",
        error_message=doc.error_message,
        created_at=doc.created_at,
        claims_count=claims_count
    )

@router.post("/upload-multiple", response_model=List[DocumentOut])
async def upload_multiple_documents(
    project_id: str,
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_project_role(project_id, current_user, "contributor", db)
    results = []

    for file in files:
        orig_name = file.filename or "file"
        ext = Path(orig_name).suffix.lower()
        if ext not in settings.ALLOWED_EXTENSIONS:
            continue
            
        safe_filename = f"{project_id}_{uuid.uuid4().hex[:8]}_{Path(orig_name).name}"
        target_path = settings.UPLOAD_DIR / safe_filename
        
        file_bytes = await file.read()
        if len(file_bytes) > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
            continue

        with open(target_path, "wb") as f:
            f.write(file_bytes)

        doc = process_single_file_record(target_path, orig_name, project_id, current_user, db)
        claims_count = db.query(Claim).filter(Claim.document_id == doc.id).count()
        results.append(DocumentOut(
            id=doc.id,
            project_id=doc.project_id,
            original_name=doc.original_name,
            file_type=doc.file_type,
            category=doc.category or "document",
            folder_path=doc.folder_path or "",
            file_size=doc.file_size,
            status=doc.status,
            page_count=doc.page_count,
            metadata_json=doc.metadata_json or "{}",
            error_message=doc.error_message,
            created_at=doc.created_at,
            claims_count=claims_count
        ))

    return results

@router.post("/upload-zip", response_model=ZipExtractionReport)
async def upload_zip_archive(
    project_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Safely extracts and ingests a ZIP project repository or document package:
    - Protects against Zip Slip and compression bombs
    - Preserves relative folder structure
    - Indexes all supported documents, source code, and hardware diagrams
    """
    require_project_role(project_id, current_user, "contributor", db)

    orig_name = file.filename or "archive.zip"
    if not orig_name.lower().endswith(".zip"):
        raise HTTPException(status_code=400, detail="Uploaded file must be a valid .zip archive.")

    zip_temp_name = f"zip_{project_id}_{uuid.uuid4().hex[:8]}.zip"
    zip_path = settings.UPLOAD_DIR / zip_temp_name
    
    file_bytes = await file.read()
    if len(file_bytes) > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"ZIP archive exceeds {settings.MAX_UPLOAD_SIZE_MB}MB limit.")

    with open(zip_path, "wb") as f:
        f.write(file_bytes)

    extract_dir = settings.UPLOAD_DIR / f"extracted_{project_id}_{uuid.uuid4().hex[:8]}"

    try:
        extract_result = safe_extract_zip(
            zip_path=zip_path,
            target_extract_dir=extract_dir,
            max_uncompressed_bytes=settings.MAX_ZIP_UNCOMPRESSED_MB * 1024 * 1024,
            max_files=settings.MAX_ZIP_FILES
        )
    except ValueError as ve:
        if zip_path.exists():
            zip_path.unlink()
        raise HTTPException(status_code=400, detail=f"Archive validation failed: {str(ve)}")

    extracted_docs = []
    failed_count = 0

    for item in extract_result["extracted_files"]:
        item_path = item["file_path"]
        rel_path = item["relative_path"]
        file_ext = f".{item['file_type']}"

        if file_ext in settings.ALLOWED_EXTENSIONS:
            try:
                # Copy into main upload directory with safe unique prefix
                safe_item_name = f"{project_id}_{uuid.uuid4().hex[:6]}_{item['name']}"
                permanent_path = settings.UPLOAD_DIR / safe_item_name
                shutil.copy2(item_path, permanent_path)

                doc = process_single_file_record(
                    file_path=permanent_path,
                    orig_name=item["name"],
                    project_id=project_id,
                    current_user=current_user,
                    db=db,
                    folder_path=rel_path
                )
                claims_count = db.query(Claim).filter(Claim.document_id == doc.id).count()
                extracted_docs.append(DocumentOut(
                    id=doc.id,
                    project_id=doc.project_id,
                    original_name=doc.original_name,
                    file_type=doc.file_type,
                    category=doc.category or "document",
                    folder_path=doc.folder_path or "",
                    file_size=doc.file_size,
                    status=doc.status,
                    page_count=doc.page_count,
                    metadata_json=doc.metadata_json or "{}",
                    error_message=doc.error_message,
                    created_at=doc.created_at,
                    claims_count=claims_count
                ))
            except Exception as e:
                failed_count += 1
        else:
            extract_result["skipped_files"].append({
                "path": rel_path,
                "reason": f"File extension '{file_ext}' is not in supported project knowledge formats."
            })

    # Clean up extraction workspace directory
    try:
        shutil.rmtree(extract_dir, ignore_errors=True)
        if zip_path.exists():
            zip_path.unlink()
    except Exception:
        pass

    return ZipExtractionReport(
        total_files=extract_result["total_in_archive"],
        processed_count=len(extracted_docs),
        skipped_count=len(extract_result["skipped_files"]),
        failed_count=failed_count,
        extracted_documents=extracted_docs,
        skipped_files=extract_result["skipped_files"]
    )

@router.post("/import-github")
async def import_github(
    project_id: str,
    req: GithubImportRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_project_role(project_id, current_user, "contributor", db)
    try:
        res = await import_github_repository(
            repo_url=req.repo_url,
            project_id=project_id,
            current_user=current_user,
            db=db
        )
        return {
            "status": "success",
            "message": f"Repository '{res['name']}' imported successfully with {res['claims_extracted']} knowledge claims.",
            "data": res
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to import repository: {str(e)}")

@router.post("/add-link", response_model=DocumentOut)
def add_reference_link(
    project_id: str,
    link_in: ReferenceLinkCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_project_role(project_id, current_user, "contributor", db)
    
    doc_content = (
        f"# Reference Link: {link_in.title}\n\n"
        f"**URL:** {link_in.url}\n"
        f"**Category:** {link_in.category}\n\n"
        f"## Description\n{link_in.description or 'No extra description provided.'}"
    )

    doc = Document(
        project_id=project_id,
        uploaded_by_id=current_user.id,
        filename=f"link_{uuid.uuid4().hex[:8]}.md",
        original_name=link_in.title,
        file_type="link",
        category="link",
        folder_path="references/",
        file_size=len(doc_content.encode("utf-8")),
        file_path=link_in.url,
        status="processed",
        page_count=1,
        extracted_text=doc_content,
        metadata_json=json.dumps({"url": link_in.url, "category": link_in.category})
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Passage & claim
    passage = ExtractedPassage(
        document_id=doc.id,
        project_id=project_id,
        page_number=1,
        section_heading=f"Reference Link: {link_in.title}",
        text_content=doc_content,
        char_offset_start=0,
        char_offset_end=len(doc_content)
    )
    db.add(passage)
    db.flush()

    claim = Claim(
        project_id=project_id,
        document_id=doc.id,
        passage_id=passage.id,
        claim_type="reference",
        title=f"Link Reference: {link_in.title}",
        content=f"Reference to {link_in.url}. {link_in.description or ''}",
        confidence_score=0.95,
        status="verified"
    )
    db.add(claim)
    db.commit()

    return DocumentOut(
        id=doc.id,
        project_id=doc.project_id,
        original_name=doc.original_name,
        file_type=doc.file_type,
        category=doc.category,
        folder_path=doc.folder_path,
        file_size=doc.file_size,
        status=doc.status,
        page_count=1,
        metadata_json=doc.metadata_json,
        error_message=None,
        created_at=doc.created_at,
        claims_count=1
    )

@router.delete("/{document_id}")
def delete_document(
    project_id: str,
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_project_role(project_id, current_user, "contributor", db)
    doc = db.query(Document).filter(Document.id == document_id, Document.project_id == project_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    # Remove physical file if on disk
    if doc.file_path and os.path.exists(doc.file_path) and not doc.file_path.startswith("http"):
        try:
            os.remove(doc.file_path)
        except Exception:
            pass

    db.delete(doc)
    db.commit()

    # Recalculate risks and gaps after deletion
    scan_project_conflicts(project_id, db)
    scan_project_gaps(project_id, db)
    sync_project_risks(project_id, db)
    calculate_departure_risk_score(project_id, db)

    return {"status": "success", "message": f"Document '{doc.original_name}' deleted."}

@router.get("/{document_id}/passages", response_model=List[PassageOut])
def get_document_passages(
    project_id: str,
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_project_role(project_id, current_user, "contributor", db)
    passages = db.query(ExtractedPassage).filter(
        ExtractedPassage.document_id == document_id,
        ExtractedPassage.project_id == project_id
    ).order_by(ExtractedPassage.page_number, ExtractedPassage.char_offset_start).all()
    return passages
