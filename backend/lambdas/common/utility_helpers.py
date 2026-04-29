"""Shared helpers for parsing API Gateway events + emitting responses."""

from __future__ import annotations

import decimal
import json
import os
from datetime import datetime, timezone
from typing import Any

from lambdas.common.errors import ValidationError
from lambdas.common.logger import get_logger

log = get_logger(__file__)

CORS_ALLOW_ORIGIN = os.environ.get("CORS_ALLOW_ORIGIN", "https://derby.xomware.com")
CORS_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": CORS_ALLOW_ORIGIN,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,Cookie",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
    "Vary": "Origin",
}


class DerbyJSONEncoder(json.JSONEncoder):
    def default(self, obj: Any) -> Any:
        if isinstance(obj, decimal.Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        if isinstance(obj, set):
            return list(obj)
        return super().default(obj)


def json_dumps(obj: Any) -> str:
    return json.dumps(obj, cls=DerbyJSONEncoder)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def iso_now() -> str:
    return utcnow().isoformat()


def parse_iso(value: str) -> datetime:
    # Accept "Z" suffix as UTC.
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def parse_body(event: dict) -> dict:
    body = event.get("body")
    if body is None:
        return {}
    if isinstance(body, str):
        try:
            return json.loads(body)
        except json.JSONDecodeError:
            raise ValidationError("Body is not valid JSON")
    return body if isinstance(body, dict) else {}


def get_path_params(event: dict) -> dict:
    return event.get("pathParameters") or {}


def get_query_params(event: dict) -> dict:
    return event.get("queryStringParameters") or {}


def get_headers(event: dict) -> dict:
    return {(k.lower() if k else k): v for k, v in (event.get("headers") or {}).items()}


def get_cookie(event: dict, name: str) -> str | None:
    headers = get_headers(event)
    raw = headers.get("cookie") or headers.get("Cookie")
    if not raw:
        return None
    for part in raw.split(";"):
        if "=" not in part:
            continue
        k, v = part.strip().split("=", 1)
        if k == name:
            return v
    return None


def require_fields(data: dict, *fields: str) -> None:
    missing = [f for f in fields if data.get(f) in (None, "")]
    if missing:
        raise ValidationError(f"Missing required fields: {', '.join(missing)}", field=missing[0])


def success_response(body: Any, status: int = 200, set_cookies: list[str] | None = None) -> dict:
    response: dict = {
        "statusCode": status,
        "headers": dict(CORS_HEADERS),
        "body": json_dumps(body) if body is not None else "",
        "isBase64Encoded": False,
    }
    if set_cookies:
        response["multiValueHeaders"] = {"Set-Cookie": set_cookies}
    return response


def no_content(set_cookies: list[str] | None = None) -> dict:
    response: dict = {
        "statusCode": 204,
        "headers": dict(CORS_HEADERS),
        "body": "",
        "isBase64Encoded": False,
    }
    if set_cookies:
        response["multiValueHeaders"] = {"Set-Cookie": set_cookies}
    return response


def make_cookie(
    name: str,
    value: str,
    *,
    max_age_seconds: int,
    domain: str | None = None,
    secure: bool = True,
    same_site: str = "Lax",
    http_only: bool = True,
    path: str = "/",
) -> str:
    parts = [f"{name}={value}", f"Path={path}", f"Max-Age={max_age_seconds}", f"SameSite={same_site}"]
    if domain:
        parts.append(f"Domain={domain}")
    if secure:
        parts.append("Secure")
    if http_only:
        parts.append("HttpOnly")
    return "; ".join(parts)


def expire_cookie(name: str, *, domain: str | None = None) -> str:
    return make_cookie(name, "", max_age_seconds=0, domain=domain)


def get_authorizer_context(event: dict) -> dict:
    """API Gateway custom authorizer puts user attrs in requestContext.authorizer."""
    return ((event.get("requestContext") or {}).get("authorizer") or {})
