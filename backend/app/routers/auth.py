from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Workspace, WorkspaceMember
from app.schemas import UserCreate, UserLogin, UserOut, Token, UserUpdate, PasswordChange
from app.services.auth_service import (
    verify_password, get_password_hash, create_access_token, get_current_user
)
from app.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=Token)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )
    
    # Check if first user to grant admin
    user_count = db.query(User).count()
    
    new_user = User(
        email=user_in.email,
        full_name=user_in.full_name,
        title=user_in.title or "Team Member",
        hashed_password=get_password_hash(user_in.password),
        is_active=True,
        is_superuser=(user_count == 0)
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Automatically provision private workspace for the new user
    import re
    base_slug = re.sub(r'[^a-z0-9]+', '-', new_user.full_name.lower().strip()).strip('-') or "workspace"
    personal_ws = Workspace(
        name=f"{new_user.full_name}'s Workspace",
        slug=f"{base_slug}-{new_user.id[:8]}",
        description="Private organizational workspace for knowledge continuity.",
        created_by_id=new_user.id
    )
    db.add(personal_ws)
    db.flush()
    wm = WorkspaceMember(
        workspace_id=personal_ws.id,
        user_id=new_user.id,
        role="workspace_admin"
    )
    db.add(wm)
    db.commit()
    
    token = create_access_token(
        data={"sub": new_user.email, "id": new_user.id},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": new_user
    }

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is deactivated.")

    token = create_access_token(
        data={"sub": user.email, "id": user.id},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserOut)
def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/me", response_model=UserOut)
def update_profile(
    user_in: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if user_in.full_name is not None:
        current_user.full_name = user_in.full_name.strip()
    if user_in.title is not None:
        current_user.title = user_in.title.strip()

    db.commit()
    db.refresh(current_user)
    return current_user

@router.put("/change-password")
def change_password(
    pwd_in: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not verify_password(pwd_in.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password does not match."
        )
    if len(pwd_in.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters."
        )

    current_user.hashed_password = get_password_hash(pwd_in.new_password)
    db.commit()
    return {"status": "success", "message": "Password updated successfully."}
