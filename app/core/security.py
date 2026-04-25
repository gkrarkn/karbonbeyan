from __future__ import annotations

from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

_pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

_ALGORITHM = "HS256"
_TOKEN_EXPIRE_DAYS = 30


def hash_password(password: str) -> str:
    return _pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return _pwd_context.verify(plain, hashed)


def create_access_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=_TOKEN_EXPIRE_DAYS)
    return jwt.encode({"sub": user_id, "exp": expire}, settings.secret_key, algorithm=_ALGORITHM)


def decode_access_token(token: str) -> str | None:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[_ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None
