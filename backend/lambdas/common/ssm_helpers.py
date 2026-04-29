"""SSM Parameter Store loader. Resolved once at module import (cold start)."""

from __future__ import annotations

import os

import boto3

from lambdas.common.constants import AWS_DEFAULT_REGION, APP_NAME
from lambdas.common.logger import get_logger

log = get_logger(__file__)

_ssm = boto3.client("ssm", region_name=AWS_DEFAULT_REGION)


def _get(name: str, *, decrypt: bool = True, default: str = "") -> str:
    try:
        resp = _ssm.get_parameter(Name=name, WithDecryption=decrypt)
        return resp["Parameter"]["Value"]
    except Exception as e:  # noqa: BLE001
        log.warning("SSM get_parameter failed for %s: %s — falling back to env/default", name, e)
        return default


# Allow env-var override for local dev / pytest.
JWT_SECRET = os.environ.get("JWT_SECRET") or _get(f"/{APP_NAME}/api/JWT_SECRET")
INTERNAL_SECRET = os.environ.get("INTERNAL_SECRET") or _get(f"/{APP_NAME}/api/INTERNAL_SECRET", default="")
