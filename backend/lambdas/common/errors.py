"""Error classes + decorator that converts to API Gateway responses."""

from __future__ import annotations

import functools
import json
import traceback
from typing import Any, Callable

from lambdas.common.logger import get_logger

log = get_logger(__file__)


class DerbyError(Exception):
    def __init__(self, message: str, status: int = 500, detail: dict | None = None):
        super().__init__(message)
        self.message = message
        self.status = status
        self.detail = detail or {}


class ValidationError(DerbyError):
    def __init__(self, message: str, field: str | None = None):
        super().__init__(message, status=400, detail={"field": field} if field else None)


class NotFoundError(DerbyError):
    def __init__(self, message: str = "Not found"):
        super().__init__(message, status=404)


class UnauthorizedError(DerbyError):
    def __init__(self, message: str = "Not authenticated"):
        super().__init__(message, status=401)


class ForbiddenError(DerbyError):
    def __init__(self, message: str = "Forbidden"):
        super().__init__(message, status=403)


class ConflictError(DerbyError):
    def __init__(self, message: str = "Conflict"):
        super().__init__(message, status=409)


class LockedError(DerbyError):
    def __init__(self, message: str = "Locked"):
        super().__init__(message, status=423)


class RateLimitError(DerbyError):
    def __init__(self, message: str = "Too many requests"):
        super().__init__(message, status=429)


def _err_response(handler: str, message: str, status: int, detail: dict | None = None) -> dict:
    from lambdas.common.utility_helpers import CORS_HEADERS  # avoid circular at import

    body = {"error": {"handler": handler, "message": message, "status": status}}
    if detail:
        body["error"]["detail"] = detail
    return {
        "statusCode": status,
        "headers": CORS_HEADERS,
        "body": json.dumps(body),
        "isBase64Encoded": False,
    }


def handle_errors(handler_name: str) -> Callable:
    """Wrap a Lambda handler so DerbyError + bare exceptions become clean responses."""

    def decorator(fn: Callable) -> Callable:
        @functools.wraps(fn)
        def wrapper(event: Any, context: Any):
            try:
                return fn(event, context)
            except DerbyError as e:
                log.warning("[%s] %s", handler_name, e.message)
                return _err_response(handler_name, e.message, e.status, e.detail or None)
            except Exception as e:  # noqa: BLE001
                log.error("[%s] unhandled: %s\n%s", handler_name, e, traceback.format_exc())
                return _err_response(handler_name, "Internal error", 500)

        return wrapper

    return decorator
