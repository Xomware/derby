"""POST /admin-results/run-cron — fire the odds cron synchronously.

Body: {"admin_token": "..."}

Invokes the cron_update_odds lambda RequestResponse so the caller gets the
summary back and can decide whether to refresh history. Used by the admin
"Run cron now" button.
"""

from __future__ import annotations

import json
import os

import boto3

from lambdas.common.constants import ADMIN_TOKEN, APP_NAME
from lambdas.common.errors import DerbyError, ForbiddenError, handle_errors
from lambdas.common.utility_helpers import parse_body, success_response

HANDLER = "admin_run_cron"

CRON_FN = os.environ.get("ODDS_CRON_FUNCTION", f"{APP_NAME}-cron-update-odds")

_lambda = boto3.client("lambda")


@handle_errors(HANDLER)
def handler(event, context):
    body = parse_body(event)
    if not ADMIN_TOKEN or body.get("admin_token") != ADMIN_TOKEN:
        raise ForbiddenError("Bad admin password")

    try:
        resp = _lambda.invoke(
            FunctionName=CRON_FN,
            InvocationType="RequestResponse",
            Payload=json.dumps({"manual": True}).encode("utf-8"),
        )
    except Exception as exc:
        raise DerbyError(f"Failed to invoke {CRON_FN}: {exc}", status=502)

    payload_bytes = resp.get("Payload").read() if resp.get("Payload") else b""
    try:
        payload = json.loads(payload_bytes.decode("utf-8")) if payload_bytes else {}
    except Exception:
        payload = {"raw": payload_bytes.decode("utf-8", errors="replace")}

    fn_error = resp.get("FunctionError")
    return success_response({
        "function": CRON_FN,
        "status_code": resp.get("StatusCode"),
        "function_error": fn_error,
        "result": payload,
    })
