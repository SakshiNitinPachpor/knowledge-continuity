# Deployment Guide — Knowledge Continuity

## 1. Local / Demonstration Deployment
- **Backend**: Runs on `http://127.0.0.1:8000` via Uvicorn.
- **Frontend**: Runs on `http://localhost:5173` via Vite development server with proxy.
- **Database**: Local SQLite database (`knowledge_continuity.db`).

---

## 2. Production Docker Deployment

A multi-stage Docker deployment setup for production environments:

### `backend/Dockerfile`
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt email-validator
COPY . .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### `docker-compose.yml`
```yaml
version: '3.8'

services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: continuity_user
      POSTGRES_PASSWORD: continuity_secure_password
      POSTGRES_DB: knowledge_continuity
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://continuity_user:continuity_secure_password@db:5432/knowledge_continuity
      - SECRET_KEY=production-secure-random-jwt-key
      - AI_PROVIDER=deterministic_grounded
    depends_on:
      - db
    volumes:
      - uploads_data:/app/uploads

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  pgdata:
  uploads_data:
```

---

## 3. Cloud Deployment (Render / Railway / AWS ECS)

1. **Environment Variables Required:**
   - `DATABASE_URL`: Connection string to PostgreSQL instance.
   - `SECRET_KEY`: High-entropy 64-character secret.
   - `AI_PROVIDER`: `deterministic_grounded` (or `gemini` / `openai` if API keys configured).
   - `CORS_ORIGINS`: Comma-separated list of allowed frontend domains.

2. **Database Migrations:**
   SQLAlchemy automatically creates all tables on initial startup (`Base.metadata.create_all(bind=engine)`). For production schema evolution, Alembic migrations can be initialized via `alembic init migrations`.
