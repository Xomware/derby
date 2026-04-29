"""SES email sender for magic links."""

from __future__ import annotations

import boto3

from lambdas.common.constants import AWS_DEFAULT_REGION, FROM_EMAIL
from lambdas.common.logger import get_logger

log = get_logger(__file__)

_ses = boto3.client("ses", region_name=AWS_DEFAULT_REGION)


def send_magic_link_email(*, to: str, link: str) -> None:
    subject = "Your Sun God Derby sign-in link"
    text = (
        f"Tap the link below to sign in to derby.xomware.com.\n\n"
        f"{link}\n\n"
        f"This link expires in 15 minutes and works once. "
        f"If you didn't request it, ignore this email."
    )
    html = (
        '<div style="font-family: Georgia, serif; color:#2b2018; line-height:1.5; max-width:520px;">'
        '<img src="https://derby.xomware.com/banner.png" alt="Sun God Derby" '
        'style="max-width:280px; height:auto; display:block; margin-bottom:8px;" />'
        f'<p>Tap the link below to sign in to <strong>derby.xomware.com</strong>.</p>'
        f'<p><a href="{link}" style="display:inline-block;padding:12px 18px;'
        'background:#C8102E;color:#FAF6E8;text-decoration:none;border-radius:6px;">'
        'Sign in</a></p>'
        '<p style="font-size:13px;color:#666;">This link expires in 15 minutes '
        "and works once. If you didn't request it, ignore this email.</p></div>"
    )

    _ses.send_email(
        Source=FROM_EMAIL,
        Destination={"ToAddresses": [to]},
        Message={
            "Subject": {"Data": subject, "Charset": "UTF-8"},
            "Body": {
                "Text": {"Data": text, "Charset": "UTF-8"},
                "Html": {"Data": html, "Charset": "UTF-8"},
            },
        },
    )
    log.info("Sent magic link to %s", to)
