"""JWT and magic-token helpers."""

from __future__ import annotations

import secrets
import uuid
from datetime import timedelta

import jwt

from lambdas.common.constants import SESSION_DAYS
from lambdas.common.errors import UnauthorizedError
from lambdas.common.logger import get_logger
from lambdas.common.ssm_helpers import JWT_SECRET
from lambdas.common.utility_helpers import utcnow

log = get_logger(__file__)

JWT_ALGORITHM = "HS256"


def make_magic_token() -> str:
    return secrets.token_urlsafe(32)


def issue_session_jwt(user_id: str) -> str:
    now = utcnow()
    payload = {
        "sub": user_id,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(days=SESSION_DAYS)).timestamp()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_session_jwt(token: str) -> str:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError as e:
        log.info("invalid JWT: %s", e)
        raise UnauthorizedError("Invalid or expired session")
    sub = payload.get("sub")
    if not sub:
        raise UnauthorizedError("Session missing subject")
    return sub


def issue_signup_jwt(email: str) -> str:
    now = utcnow()
    payload = {
        "email": email,
        "purpose": "signup",
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=15)).timestamp()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_signup_jwt(token: str) -> str:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError as e:
        log.info("invalid signup JWT: %s", e)
        raise UnauthorizedError("Signup token invalid or expired")
    if payload.get("purpose") != "signup":
        raise UnauthorizedError("Wrong token purpose")
    return payload["email"]


def new_user_id() -> str:
    return str(uuid.uuid4())
