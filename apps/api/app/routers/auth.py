from __future__ import annotations

from datetime import timedelta

from fastapi import APIRouter, Cookie, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth import (
    decode_signup_jwt,
    issue_session_jwt,
    issue_signup_jwt,
    make_magic_token,
    utcnow,
)
from app.config import get_settings
from app.db import get_db
from app.deps import SESSION_COOKIE, get_current_user
from app.email import send_magic_link_email
from app.models import MagicLinkToken, User
from app.schemas import CompleteSignupIn, MeOut, RequestLinkIn, VerifyOut

router = APIRouter(prefix="/auth", tags=["auth"])

SIGNUP_COOKIE = "derby_signup"
RATE_LIMIT = 3
RATE_WINDOW = timedelta(minutes=15)

RESERVED_USERNAMES = {
    "admin", "administrator", "root", "system", "moderator",
    "grant", "sun-oracle", "sunoracle", "oracle", "derby",
}


def _set_session_cookie(response: Response, token: str) -> None:
    settings = get_settings()
    response.set_cookie(
        SESSION_COOKIE,
        token,
        max_age=settings.session_days * 24 * 60 * 60,
        **settings.cookie_kwargs,
    )


def _clear_cookie(response: Response, name: str) -> None:
    settings = get_settings()
    response.delete_cookie(name, path="/", domain=settings.cookie_domain or None)


@router.post("/request-link", status_code=status.HTTP_204_NO_CONTENT)
def request_link(payload: RequestLinkIn, db: Session = Depends(get_db)) -> Response:
    settings = get_settings()
    email = payload.email.lower()

    cutoff = utcnow() - RATE_WINDOW
    recent_count = db.scalar(
        select(func.count(MagicLinkToken.token)).where(
            MagicLinkToken.email == email, MagicLinkToken.created_at >= cutoff
        )
    ) or 0
    if recent_count >= RATE_LIMIT:
        raise HTTPException(status_code=429, detail="Too many sign-in attempts. Try again in a few minutes.")

    token = make_magic_token()
    db.add(
        MagicLinkToken(
            token=token,
            email=email,
            expires_at=utcnow() + timedelta(minutes=15),
        )
    )
    db.commit()

    link = f"{settings.app_base_url.rstrip('/')}/auth/verify?token={token}"
    send_magic_link_email(email=email, link=link)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/verify", response_model=VerifyOut)
def verify(
    response: Response,
    token: str = Query(..., min_length=10),
    db: Session = Depends(get_db),
) -> VerifyOut:
    settings = get_settings()
    record = db.get(MagicLinkToken, token)
    if not record or record.used_at is not None or record.expires_at < utcnow():
        raise HTTPException(status_code=400, detail="Invalid or expired link")

    record.used_at = utcnow()

    user = db.scalar(select(User).where(User.email == record.email))
    if user:
        user.last_login_at = utcnow()
        if record.email in settings.admin_email_list and not user.is_admin:
            user.is_admin = True
        db.commit()
        _set_session_cookie(response, issue_session_jwt(user.id))
        _clear_cookie(response, SIGNUP_COOKIE)
        return VerifyOut(needs_username=False, user=MeOut.model_validate(user))

    db.commit()
    # First-time: short-lived signup token proves they verified the email.
    response.set_cookie(
        SIGNUP_COOKIE,
        issue_signup_jwt(record.email),
        max_age=15 * 60,
        **settings.cookie_kwargs,
    )
    return VerifyOut(needs_username=True, user=None)


@router.post("/complete-signup", response_model=MeOut)
def complete_signup(
    payload: CompleteSignupIn,
    response: Response,
    db: Session = Depends(get_db),
    derby_signup: str | None = Cookie(default=None, alias=SIGNUP_COOKIE),
) -> MeOut:
    settings = get_settings()
    if not derby_signup:
        raise HTTPException(status_code=400, detail="No active signup. Request a new sign-in link.")
    email = decode_signup_jwt(derby_signup)
    if not email:
        raise HTTPException(status_code=400, detail="Signup token invalid or expired.")

    username = payload.username.strip()
    if username.lower() in RESERVED_USERNAMES:
        raise HTTPException(status_code=400, detail="That username is reserved. Pick another.")

    is_admin = email in settings.admin_email_list

    user = User(email=email, username=username, is_admin=is_admin, last_login_at=utcnow())
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        existing = db.scalar(select(User).where(User.email == email))
        if existing:
            existing.last_login_at = utcnow()
            if is_admin and not existing.is_admin:
                existing.is_admin = True
            db.commit()
            _set_session_cookie(response, issue_session_jwt(existing.id))
            _clear_cookie(response, SIGNUP_COOKIE)
            return MeOut.model_validate(existing)
        raise HTTPException(status_code=409, detail="Username taken. Pick another.")

    _set_session_cookie(response, issue_session_jwt(user.id))
    _clear_cookie(response, SIGNUP_COOKIE)
    return MeOut.model_validate(user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response) -> Response:
    _clear_cookie(response, SESSION_COOKIE)
    _clear_cookie(response, SIGNUP_COOKIE)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me", response_model=MeOut)
def me(user: User = Depends(get_current_user)) -> MeOut:
    return MeOut.model_validate(user)
