from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str = ""
    company_name: str = ""


class UserLogin(BaseModel):
    email: str
    password: str


class UserRecord(BaseModel):
    user_id: str
    email: str
    full_name: str
    company_name: str
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRecord
