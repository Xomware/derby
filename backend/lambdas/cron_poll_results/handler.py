"""EventBridge-triggered poll. Runs only inside the configured race window.

Invoked directly by a CloudWatch / EventBridge schedule, NOT through API Gateway.
No authorizer in front of it — the trigger principal is AWS itself.
"""

from __future__ import annotations

from lambdas.common.logger import get_logger
from lambdas.common.poll_helpers import run_poll_once

log = get_logger(__file__)
HANDLER = "cron_poll_results"


def handler(event, context):
    summary = run_poll_once(force=False)
    log.info("Cron poll result: %s", summary)
    return summary
