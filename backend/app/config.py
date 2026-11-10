import os
from pathlib import Path
from typing import List

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings:
    PROJECT_NAME: str = "Knowledge Continuity"
    ORGANIZATION: str = "Knowledge Continuity"
    TAGLINE: str = "Preserve Knowledge. Continue Progress."
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    SECRET_KEY: str = os.getenv("SECRET_KEY") or os.urandom(32).hex()
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'knowledge_continuity.db'}")
    
    # Upload storage & safety limits
    UPLOAD_DIR: Path = BASE_DIR / "uploads"
    MAX_UPLOAD_SIZE_MB: int = 100
    MAX_ZIP_UNCOMPRESSED_MB: int = 150
    MAX_ZIP_FILES: int = 500
    
    # Supported extensions
    DOCUMENT_EXTENSIONS: List[str] = [".pdf", ".docx", ".doc", ".txt", ".md", ".csv", ".xlsx", ".pptx"]
    CODE_EXTENSIONS: List[str] = [
        ".py", ".c", ".cpp", ".h", ".hpp", ".java", ".js", ".jsx", ".ts", ".tsx",
        ".html", ".css", ".sql", ".json", ".yaml", ".yml", ".xml", ".sh", ".bat", ".ipynb"
    ]
    IMAGE_EXTENSIONS: List[str] = [".png", ".jpg", ".jpeg", ".webp"]
    PACKAGE_EXTENSIONS: List[str] = [".zip"]
    
    ALLOWED_EXTENSIONS: List[str] = (
        DOCUMENT_EXTENSIONS + CODE_EXTENSIONS + IMAGE_EXTENSIONS + PACKAGE_EXTENSIONS
    )
    
    # Integrations
    GITHUB_TOKEN: str = os.getenv("GITHUB_TOKEN", "")
    
    # AI Engine Configuration
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "deterministic_grounded")  # options: 'gemini', 'openai', 'deterministic_grounded'
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    
    # CORS
CORS_ORIGINS: List[str] = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000"
    ).split(",")
    if origin.strip()
]

settings = Settings()
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
