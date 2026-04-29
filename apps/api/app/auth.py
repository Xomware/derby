from __future__ import annotations

import secrets
import uuid
from datetime import datetime, timedelta, timezone

import jwt

from app.config import get_settings


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def make_magic_token() -> str:
    return secrets.token_urlsafe(32)


def issue_session_jwt(user_id: uuid.UUID) -> str:
    settings = get_settings()
    now = utcnow()
    payload = {
        "sub": str(user_id),
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(days=settings.session_days)).timestamp()),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_session_jwt(token: str) -> uuid.UUID | None:
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except jwt.PyJWTError:
        return None
    sub = payload.get("sub")
    if not sub:
        return None
    try:
        return uuid.UUID(sub)
    except ValueError:
        return None


def issue_signup_jwt(email: str) -> str:
    """Short-lived token used between magic-link verify and username submission."""
    settings = get_settings()
    now = utcnow()
    payload = {
        "email": email,
        "purpose": "signup",
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=15)).timestamp()),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_signup_jwt(token: str) -> str | None:
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except jwt.PyJWTError:
        return None
    if payload.get("purpose") != "signup":
        return None
    return payload.get("email")
