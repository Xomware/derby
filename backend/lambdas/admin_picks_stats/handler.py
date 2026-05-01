"""POST /admin-results/picks-stats — bulk update per-pick stat fields.

Body: {
  "admin_token": "...",
  "picks": [
    {
      "pick_id": "<uuid>",
      "record": "5: 2-2-1",
      "beyer": "98",
      "brisnet": "97",
      "equibase_rating": null,
      "style": "Mid Pack - Closer",
      "last_race": "Won Arkansas Derby"
    },
    ...
  ]
}

Fields not present in a row are left alone. Fields explicitly set to null
or empty string are REMOVED from the row so the UI shows the standard
'N/A' fallback consistently.
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

HANDLER = "admin_picks_stats"

EDITABLE_FIELDS = {
    "record",
    "beyer",
    "brisnet",
    "equibase_rating",
    "style",
    "last_race",
}


@handle_errors(HANDLER)
def handler(event, context):
    body = parse_body(event)
    require_fields(body, "admin_token", "picks")

    if not ADMIN_TOKEN or body.get("admin_token") != ADMIN_TOKEN:
        raise ForbiddenError("Bad admin password")

    rows = body.get("picks")
    if not isinstance(rows, list) or not rows:
        raise ValidationError("picks must be a non-empty list", field="picks")

    now = iso_now()
    updated = 0
    for r in rows:
        if not isinstance(r, dict):
            raise ValidationError("each picks entry must be an object", field="picks")
        pid = str(r.get("pick_id") or "").strip()
        if not pid:
            raise ValidationError("missing pick_id", field="picks")

        sets: dict[str, str] = {}
        removes: list[str] = []
        for key in EDITABLE_FIELDS:
            if key not in r:
                continue
            val = r.get(key)
            if val is None or (isinstance(val, str) and val.strip() == ""):
                removes.append(key)
            else:
                sets[key] = str(val).strip()

        if not sets and not removes:
            continue

        expr_parts: list[str] = []
        names: dict[str, str] = {}
        values: dict[str, object] = {":n": now}

        if sets:
            assigns = ", ".join(f"#{k} = :{k}" for k in sets)
            expr_parts.append(f"SET {assigns}, updated_at = :n")
            for k, v in sets.items():
                names[f"#{k}"] = k
                values[f":{k}"] = v
        else:
            expr_parts.append("SET updated_at = :n")

        if removes:
            expr_parts.append("REMOVE " + ", ".join(f"#{k}" for k in removes))
            for k in removes:
                names[f"#{k}"] = k

        try:
            picks_table.update_item(
                Key={"id": pid},
                UpdateExpression=" ".join(expr_parts),
                ExpressionAttributeNames=names,
                ExpressionAttributeValues=values,
                ConditionExpression="attribute_exists(id)",
            )
            updated += 1
        except picks_table.meta.client.exceptions.ConditionalCheckFailedException:
            continue

    return success_response({"updated": updated})
