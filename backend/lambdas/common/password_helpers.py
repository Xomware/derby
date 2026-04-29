"""Password hashing wrapper around bcrypt."""

from __future__ import annotations

import bcrypt

# Cost factor 12 — ~250ms on Lambda's tiny CPU. Plenty for a friend-group app
# and well above the 10-12 OWASP guidance.
COST = 12


def hash_password(plaintext: str) -> str:
    return bcrypt.hashpw(plaintext.encode("utf-8"), bcrypt.gensalt(rounds=COST)).decode("utf-8")


def verify_password(plaintext: str, hashed: str) -> bool:
    if not hashed:
        return False
    try:
        return bcrypt.checkpw(plaintext.encode("utf-8"), hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False


MIN_PASSWORD_LENGTH = 8
MAX_PASSWORD_LENGTH = 128


def password_is_valid(plaintext: str) -> tuple[bool, str | None]:
    if not isinstance(plaintext, str):
        return False, "Password must be a string"
    if len(plaintext) < MIN_PASSWORD_LENGTH:
        return False, f"Password must be at least {MIN_PASSWORD_LENGTH} characters"
    if len(plaintext) > MAX_PASSWORD_LENGTH:
        return False, f"Password must be {MAX_PASSWORD_LENGTH} characters or fewer"
    return True, None
