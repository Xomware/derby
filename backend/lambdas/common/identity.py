"""Username canonicalization shared by all anon-username handlers."""

from __future__ import annotations

import re

from lambdas.common.constants import RESERVED_USERNAMES
from lambdas.common.errors import ValidationError

_VALID = re.compile(r"^[\w\-\.\s]+$", re.UNICODE)


def canonicalize_username(raw: str | None) -> str:
    """Trim + uppercase the value, then enforce the same rules as the FE."""
    if not raw or not isinstance(raw, str):
        raise ValidationError("username is required", field="username")
    name = raw.strip().upper()
    if not 2 <= len(name) <= 30:
        raise ValidationError(
            "username must be 2–30 characters", field="username"
        )
    if not _VALID.match(name):
        raise ValidationError(
            "username may only contain letters, numbers, spaces, _, -, .",
            field="username",
        )
    if name in RESERVED_USERNAMES:
        raise ValidationError("That username is reserved", field="username")
    return name
