from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import create_access_token, decode_access_token, verify_password
from app.db.database import user_repository
from app.models.auth import TokenResponse, UserCreate, UserLogin, UserRecord

router = APIRouter(tags=["auth"])

_bearer = HTTPBearer(auto_error=False)


def get_current_user(credentials: HTTPAuthorizationCredentials | None = Depends(_bearer)) -> UserRecord:
    if not credentials:
        raise HTTPException(status_code=401, detail="Giriş yapmanız gerekiyor.")
    user_id = decode_access_token(credentials.credentials)
    if not user_id:
        raise HTTPException(status_code=401, detail="Geçersiz veya süresi dolmuş token.")
    user = user_repository.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="Kullanıcı bulunamadı.")
    return user


@router.post("/auth/register", response_model=TokenResponse)
def register(payload: UserCreate) -> TokenResponse:
    if not payload.email or not payload.password:
        raise HTTPException(status_code=422, detail="E-posta ve şifre zorunludur.")
    if len(payload.password) < 8:
        raise HTTPException(status_code=422, detail="Şifre en az 8 karakter olmalıdır.")
    existing = user_repository.get_by_email(payload.email)
    if existing:
        raise HTTPException(status_code=409, detail="Bu e-posta adresi zaten kayıtlı.")
    user = user_repository.create(
        email=payload.email,
        password=payload.password,
        full_name=payload.full_name,
        company_name=payload.company_name,
    )
    return TokenResponse(access_token=create_access_token(user.user_id), user=user)


@router.post("/auth/login", response_model=TokenResponse)
def login(payload: UserLogin) -> TokenResponse:
    row = user_repository.get_by_email(payload.email)
    if not row or not verify_password(payload.password, row.hashed_password):
        raise HTTPException(status_code=401, detail="E-posta veya şifre hatalı.")
    user = user_repository.get_by_id(row.user_id)
    return TokenResponse(access_token=create_access_token(row.user_id), user=user)


@router.get("/auth/me", response_model=UserRecord)
def me(current_user: UserRecord = Depends(get_current_user)) -> UserRecord:
    return current_user
