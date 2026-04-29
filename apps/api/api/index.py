"""Vercel Python serverless entry point.

Vercel's Python runtime detects ASGI apps exposed at module level. Every
request to api.derby.xoware.com gets rewritten to /api/index by vercel.json,
and FastAPI handles routing from there.
"""

from app.main import app  # noqa: F401  (Vercel imports `app` symbol)
