"""POST /admin-results/odds — bulk update horse odds.

Body: {
  "admin_token": "derbytime",
  "odds": [
    {"pick_id": "<uuid>", "odds_at_pick": "9-2"},
    ...
  ]
}
"""

from __future__ import annotations

from lambdas.common.constants import ADMIN_TOKEN
from lambdas.common.dynamo_helpers import picks_table
from lambdas.common.errors import ForbiddenError, ValidationError, handle_errors
from lambdas.common.utility_helpers import (
    iso_now,
    parse_body,
    require_fields,
    success_response,
)

HANDLER = "admin_odds_update"

ODDS_RE = __import__("re").compile(r"^\d+\s*[-/]\s*\d+$")


@handle_errors(HANDLER)
def handler(event, context):
    body = parse_body(event)
    require_fields(body, "admin_token", "odds")

    if not ADMIN_TOKEN or body.get("admin_token") != ADMIN_TOKEN:
        raise ForbiddenError("Bad admin password")

    rows = body.get("odds")
    if not isinstance(rows, list) or not rows:
        raise ValidationError("odds must be a non-empty list", field="odds")

    cleaned: list[tuple[str, str]] = []
    for r in rows:
        if not isinstance(r, dict):
            raise ValidationError("each odds entry must be an object", field="odds")
        pid = str(r.get("pick_id") or "").strip()
        odds = str(r.get("odds_at_pick") or "").strip()
        if not pid:
            raise ValidationError("missing pick_id", field="odds")
        if odds and not ODDS_RE.match(odds):
            raise ValidationError(f"odds '{odds}' must look like '5-1' or '9/2'", field="odds")
        cleaned.append((pid, odds))

    now = iso_now()
    updated = 0
    for pid, odds in cleaned:
        # Skip empty values — admins can leave a horse blank.
        update_kwargs = {
            "Key": {"id": pid},
            "UpdateExpression": "SET odds_at_pick = :o, updated_at = :n",
            "ExpressionAttributeValues": {":o": odds or None, ":n": now},
            "ConditionExpression": "attribute_exists(id)",
        }
        try:
            picks_table.update_item(**update_kwargs)
            updated += 1
        except picks_table.meta.client.exceptions.ConditionalCheckFailedException:
            # Pick was deleted out from under us — skip silently.
            continue

    return success_response({"updated": updated})
