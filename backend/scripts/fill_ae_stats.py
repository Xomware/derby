"""Fill stats for cron-added AEs and any N/A holes in derby-picks.

Idempotent: only writes fields that are currently None or "N/A". Run
again whenever the cron drops in new horses, after editing the UPDATES
block below.

    python3 backend/scripts/fill_ae_stats.py

Requires AWS creds for the prod account in your shell environment.
"""

from __future__ import annotations

from datetime import datetime, timezone

import boto3

dynamo = boto3.resource("dynamodb")
PICKS = dynamo.Table("derby-picks")

UPDATES: dict[str, dict[str, dict[str, str]]] = {
    "2026-kentucky-derby": {
        "Robusta": {
            "record": "5: 1-1-0",
            "brisnet": "92",
            "style": "Pacesetter",
            "last_race": "Faded after dueling in Santa Anita Derby",
        },
        "Corona De Oro": {
            "record": "3: 1-0-1",
            "brisnet": "91",
            "style": "Pace Stalker",
            "last_race": "3rd in Lexington G3 at Keeneland",
        },
        "Ocelli": {
            "record": "6: 0-2-1",
            "brisnet": "92",
            "style": "Stalker/Closer",
            "last_race": "3rd in Wood Memorial G2",
        },
        "Great White": {
            "record": "4: 2-0-0",
            "style": "Pacesetter",
            "last_race": "5th in Blue Grass Stakes at Keeneland (faded)",
        },
        "Litmus Test": {"beyer": "96"},
        "Intrepido": {"brisnet": "99"},
    },
    "2026-kentucky-oaks": {
        "Resist": {
            "record": "4: 1-1-1",
            "style": "Presser",
            "last_race": "3rd in Bourbonette Oaks LS",
        },
        "Nycon": {
            "record": "5: 1-0-0",
            "style": "Mid Pack - Closer",
            "last_race": "4th in Gazelle Stakes G3",
        },
    },
}


def query_event(event_id: str) -> list[dict]:
    out: list[dict] = []
    kwargs: dict = {
        "IndexName": "event-index",
        "KeyConditionExpression": "event_id = :e",
        "ExpressionAttributeValues": {":e": event_id},
    }
    while True:
        resp = PICKS.query(**kwargs)
        out.extend(resp.get("Items", []))
        lk = resp.get("LastEvaluatedKey")
        if not lk:
            break
        kwargs["ExclusiveStartKey"] = lk
    return out


def is_blank(v) -> bool:
    if v is None:
        return True
    if isinstance(v, str) and (v.strip() == "" or v.strip().upper() == "N/A"):
        return True
    return False


def main() -> None:
    now = datetime.now(timezone.utc).isoformat()
    for event_id, plan in UPDATES.items():
        items = query_event(event_id)
        by_name = {it["horse_name"].strip().lower(): it for it in items}
        for horse_name, fields in plan.items():
            it = by_name.get(horse_name.strip().lower())
            if not it:
                print(f"[skip] {event_id} :: {horse_name} not in DDB")
                continue
            sets = {k: v for k, v in fields.items() if is_blank(it.get(k))}
            if not sets:
                print(f"[skip] {event_id} :: {horse_name} already has all fields")
                continue
            expr_names = {f"#{k}": k for k in sets}
            expr_vals = {f":{k}": v for k, v in sets.items()}
            expr_vals[":n"] = now
            assigns = ", ".join(f"#{k} = :{k}" for k in sets) + ", updated_at = :n"
            PICKS.update_item(
                Key={"id": it["id"]},
                UpdateExpression=f"SET {assigns}",
                ExpressionAttributeNames=expr_names,
                ExpressionAttributeValues=expr_vals,
            )
            print(f"[ok]   {event_id} :: {horse_name} <- {sets}")


if __name__ == "__main__":
    main()
