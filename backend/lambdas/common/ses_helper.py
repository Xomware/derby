"""SES email sender for magic links."""

from __future__ import annotations

import boto3

from lambdas.common.constants import AWS_DEFAULT_REGION, FROM_EMAIL
from lambdas.common.logger import get_logger

log = get_logger(__file__)

_ses = boto3.client("ses", region_name=AWS_DEFAULT_REGION)


def send_magic_link_email(*, to: str, link: str) -> None:
    subject = "Sign in to Sun God Derby"
    text = (
        "Tap the link below to sign in to Sun God Derby (derby.xomware.com).\n\n"
        f"{link}\n\n"
        "This link works once and expires in 15 minutes.\n"
        "If you didn't request it, ignore this email."
    )
    html = f"""\
<div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; color:#2b2018; line-height:1.5; max-width:480px; margin:0 auto; padding:24px;">
  <table role="presentation" style="width:100%; margin-bottom:20px; border-collapse:collapse;"><tr>
    <td style="vertical-align:middle;">
      <img src="https://derby.xomware.com/icon.png" alt="" width="40" height="40" style="display:block;border:0;" />
    </td>
    <td style="vertical-align:middle; padding-left:12px;">
      <strong style="font-family: Georgia, serif; font-size:18px; color:#5D4037;">Sun God Derby</strong>
    </td>
  </tr></table>
  <h1 style="font-family: Georgia, serif; font-size:22px; color:#8B0A1F; margin:0 0 12px;">Sign in</h1>
  <p style="margin:0 0 18px;">Tap the button to sign in to <strong>derby.xomware.com</strong>.</p>
  <p style="margin:0 0 24px;">
    <a href="{link}" style="display:inline-block; padding:14px 22px; background:#C8102E; color:#FAF6E8; text-decoration:none; border-radius:6px; font-weight:600;">Sign in</a>
  </p>
  <p style="margin:0 0 8px; color:#5D4037; font-size:13px;">Or paste this URL into your browser:</p>
  <p style="margin:0 0 24px; word-break:break-all; font-size:12px;"><a href="{link}" style="color:#5D4037;">{link}</a></p>
  <hr style="border:none; border-top:1px solid #e3ddc9; margin:16px 0;" />
  <p style="font-size:12px; color:#7a6d5e; margin:0;">
    This link works once and expires in 15 minutes. If you didn't request it, you can safely ignore this email.
  </p>
</div>"""

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
