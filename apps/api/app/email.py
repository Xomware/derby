from __future__ import annotations

import logging

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

RESEND_API = "https://api.resend.com/emails"


def send_magic_link_email(email: str, link: str) -> None:
    settings = get_settings()
    subject = "Your Sun Oracle sign-in link"
    text = (
        f"Tap the link below to sign in to derby.xoware.com.\n\n"
        f"{link}\n\n"
        f"This link expires in 15 minutes and works once. If you didn't request it, ignore this email."
    )
    html = f"""
    <div style="font-family: Georgia, serif; color: #2b2b2b; line-height: 1.5;">
      <p>Tap the link below to sign in to <strong>derby.xoware.com</strong>.</p>
      <p>
        <a href="{link}" style="display:inline-block;padding:12px 18px;background:#C8102E;color:#FAF6E8;text-decoration:none;border-radius:6px;">
          Sign in
        </a>
      </p>
      <p style="font-size: 13px; color: #666;">
        This link expires in 15 minutes and works once. If you didn't request it, ignore this email.
      </p>
    </div>
    """

    if not settings.resend_api_key:
        logger.warning("[dev] No RESEND_API_KEY set. Magic link for %s: %s", email, link)
        return

    payload = {
        "from": settings.email_from,
        "to": [email],
        "subject": subject,
        "html": html,
        "text": text,
    }
    headers = {"Authorization": f"Bearer {settings.resend_api_key}"}

    try:
        with httpx.Client(timeout=10) as client:
            r = client.post(RESEND_API, json=payload, headers=headers)
            r.raise_for_status()
    except httpx.HTTPError as e:
        logger.error("Resend send failed for %s: %s", email, e)
        raise
