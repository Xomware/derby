"""DynamoDB helpers — table refs and small utility functions."""

from __future__ import annotations

import boto3

from lambdas.common.constants import (
    AWS_DEFAULT_REGION,
    COMMENTS_TABLE,
    PICKS_TABLE,
    POLL_RUNS_TABLE,
    PREDICTIONS_TABLE,
    RACE_RESULTS_TABLE,
    USERS_TABLE,
    VISITS_TABLE,
    VOTES_TABLE,
)

_dynamodb = boto3.resource("dynamodb", region_name=AWS_DEFAULT_REGION)

users_table = _dynamodb.Table(USERS_TABLE)
picks_table = _dynamodb.Table(PICKS_TABLE)
votes_table = _dynamodb.Table(VOTES_TABLE)
poll_runs_table = _dynamodb.Table(POLL_RUNS_TABLE)
race_results_table = _dynamodb.Table(RACE_RESULTS_TABLE)
visits_table = _dynamodb.Table(VISITS_TABLE)
predictions_table = _dynamodb.Table(PREDICTIONS_TABLE)
comments_table = _dynamodb.Table(COMMENTS_TABLE)


def query_all(table, **kwargs) -> list[dict]:
    """Query and follow LastEvaluatedKey to gather full results."""
    items: list[dict] = []
    last = None
    while True:
        if last is not None:
            kwargs["ExclusiveStartKey"] = last
        page = table.query(**kwargs)
        items.extend(page.get("Items") or [])
        last = page.get("LastEvaluatedKey")
        if not last:
            break
    return items


def scan_all(table, **kwargs) -> list[dict]:
    items: list[dict] = []
    last = None
    while True:
        if last is not None:
            kwargs["ExclusiveStartKey"] = last
        page = table.scan(**kwargs)
        items.extend(page.get("Items") or [])
        last = page.get("LastEvaluatedKey")
        if not last:
            break
    return items
