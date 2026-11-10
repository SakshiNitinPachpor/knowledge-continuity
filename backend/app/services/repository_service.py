import re
import json
import httpx
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from app.config import settings
from app.models import Document, ExtractedPassage, Claim, ProjectRepository, User, AuditEvent
from app.services.reconstruction_engine import extract_claims_from_passages

GITHUB_REPO_REGEX = r'^(?:https?://)?(?:www\.)?github\.com/([a-zA-Z0-9_.-]+)/([a-zA-Z0-9_.-]+)(?:/.*)?$'

def parse_github_url(url: str) -> Optional[tuple[str, str]]:
    """Extracts owner and repo name from GitHub URL."""
    m = re.match(GITHUB_REPO_REGEX, url.strip())
    if m:
        return m.group(1), m.group(2).rstrip(".git")
    return None

async def import_github_repository(
    repo_url: str,
    project_id: str,
    current_user: User,
    db: Session
) -> Dict[str, Any]:
    """
    Imports a public GitHub repository without requiring credentials,
    extracting repository metadata, README documentation, and tech stack manifests.
    If private or rate-limited, reports clear instructions.
    """
    parsed = parse_github_url(repo_url)
    if not parsed:
        raise ValueError("Invalid GitHub repository URL. Expected format: https://github.com/owner/repo")
        
    owner, repo_name = parsed
    headers = {"User-Agent": "Knowledge-Continuity-Platform"}
    if settings.GITHUB_TOKEN:
        headers["Authorization"] = f"token {settings.GITHUB_TOKEN}"

    async with httpx.AsyncClient(timeout=15.0) as client:
        # 1. Fetch Repository Metadata
        api_url = f"https://api.github.com/repos/{owner}/{repo_name}"
        res = await client.get(api_url, headers=headers)
        
        if res.status_code == 404:
            raise ValueError(
                f"Repository '{owner}/{repo_name}' not found. If this is a private repository, "
                "configure a GitHub Personal Access Token in environment variables or Settings."
            )
        elif res.status_code == 403:
            raise ValueError("GitHub API rate limit exceeded. Please configure a GitHub Token or try again later.")
        elif res.status_code != 200:
            raise ValueError(f"GitHub API returned error: {res.status_code} - {res.text}")

        repo_data = res.json()
        default_branch = repo_data.get("default_branch", "main")
        description = repo_data.get("description") or "No description provided."
        stars = repo_data.get("stargazers_count", 0)
        language = repo_data.get("language") or "Code"
        topics = repo_data.get("topics", [])

        # 2. Fetch README
        readme_url = f"https://raw.githubusercontent.com/{owner}/{repo_name}/{default_branch}/README.md"
        readme_res = await client.get(readme_url, headers=headers)
        readme_content = ""
        if readme_res.status_code == 200:
            readme_content = readme_res.text
        else:
            # Try lowercase readme
            readme_url_alt = f"https://raw.githubusercontent.com/{owner}/{repo_name}/{default_branch}/readme.md"
            readme_res_alt = await client.get(readme_url_alt, headers=headers)
            if readme_res_alt.status_code == 200:
                readme_content = readme_res_alt.text

        # 3. Create or update ProjectRepository record
        existing_repo = db.query(ProjectRepository).filter(
            ProjectRepository.project_id == project_id,
            ProjectRepository.repo_url == repo_url
        ).first()

        if not existing_repo:
            existing_repo = ProjectRepository(
                project_id=project_id,
                repo_url=repo_url,
                name=f"{owner}/{repo_name}",
                description=description,
                default_branch=default_branch,
                language=language,
                stars=stars,
                status="synced"
            )
            db.add(existing_repo)
        else:
            existing_repo.description = description
            existing_repo.language = language
            existing_repo.stars = stars
            existing_repo.status = "synced"
        db.commit()

        # 4. Create Document entry for the repository
        doc_filename = f"github_{owner}_{repo_name}.md"
        doc_content = (
            f"# GitHub Repository: {owner}/{repo_name}\n\n"
            f"**Repository URL:** {repo_url}\n"
            f"**Primary Language:** {language}\n"
            f"**Default Branch:** {default_branch}\n"
            f"**Stars:** {stars}\n"
            f"**Topics:** {', '.join(topics) if topics else 'None'}\n\n"
            f"## Repository Description\n{description}\n\n"
            f"## README Documentation\n{readme_content[:15000]}"
        )

        doc = Document(
            project_id=project_id,
            uploaded_by_id=current_user.id,
            filename=doc_filename,
            original_name=f"GitHub: {owner}/{repo_name}",
            file_type="github_repo",
            category="code",
            folder_path="repositories/",
            file_size=len(doc_content.encode("utf-8")),
            file_path=repo_url,
            status="processed",
            page_count=1,
            extracted_text=doc_content,
            metadata_json=json.dumps({
                "owner": owner,
                "repo": repo_name,
                "stars": stars,
                "language": language,
                "default_branch": default_branch,
                "is_public": not repo_data.get("private", False)
            })
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)

        # 5. Extract Passages & Grounded Claims
        passages = [
            {
                "page_number": 1,
                "section_heading": f"GitHub Repository Overview: {owner}/{repo_name}",
                "text_content": f"Repository {owner}/{repo_name} ({language}). Description: {description}",
                "char_offset_start": 0,
                "char_offset_end": len(description)
            }
        ]

        if readme_content:
            passages.append({
                "page_number": 1,
                "section_heading": f"README Architecture: {repo_name}",
                "text_content": readme_content[:2000],
                "char_offset_start": 0,
                "char_offset_end": min(2000, len(readme_content))
            })

        for p in passages:
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

        claims = extract_claims_from_passages(passages, doc.original_name)
        for c in claims:
            claim_obj = Claim(
                project_id=project_id,
                document_id=doc.id,
                passage_id=c.get("passage_id"),
                claim_type=c.get("claim_type", "architecture"),
                title=c.get("title"),
                content=c.get("content"),
                confidence_score=c.get("confidence_score", 0.95),
                status=c.get("status", "needs_review"),
                entity_owner=c.get("entity_owner"),
                date_reference=c.get("date_reference")
            )
            db.add(claim_obj)
        db.commit()

        # Audit
        db.add(AuditEvent(
            project_id=project_id,
            user_id=current_user.id,
            user_email=current_user.email,
            action="repository.imported",
            entity_type="Repository",
            entity_id=doc.id,
            details=f"Imported public repository '{owner}/{repo_name}' ({language})."
        ))
        db.commit()

        return {
            "document_id": doc.id,
            "name": f"{owner}/{repo_name}",
            "description": description,
            "language": language,
            "stars": stars,
            "claims_extracted": len(claims)
        }
