"""Lightweight logger that doesn't double-attach handlers in Lambda warm starts."""

import logging
import sys

from lambdas.common.constants import LOG_LEVEL

_FORMAT = "%(asctime)s %(levelname)s %(name)s: %(message)s"


def get_logger(name: str) -> logging.Logger:
    log = logging.getLogger(name)
    if log.handlers:
        return log
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter(_FORMAT))
    log.addHandler(handler)
    log.setLevel(getattr(logging, LOG_LEVEL, logging.INFO))
    log.propagate = False
    return log
