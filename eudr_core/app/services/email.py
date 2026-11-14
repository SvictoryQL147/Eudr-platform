"""
Transactional email: password resets and team invitations.

"console" (default) prints the email to the server log and keeps it in
OUTBOX — enough for local development and tests. "resend" posts to the
Resend API (https://resend.com, free tier covers early usage). Sending
never raises into the request: a failed email is logged and reported back
as False so the route can fall back to showing the link to an admin.
"""
import html
import logging

import httpx

from app.config import Settings

log = logging.getLogger("ala.email")
OUTBOX: list[dict] = []  # console backend only; tests read this


def _layout(settings: Settings, heading: str, body_html: str, button_text: str, button_url: str, footer: str) -> str:
    name = html.escape(settings.app_name)
    return f"""<!doctype html><html><body style="margin:0;background:#f4f6f3;font-family:Inter,Segoe UI,Arial,sans-serif;color:#1c2b22">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e3e8e2">
<tr><td style="background:#0f3d2e;padding:22px 28px;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:.2px">
<span style="display:inline-block;width:22px;height:22px;border-radius:6px;background:#3ccf7e;vertical-align:-5px;margin-right:8px"></span>{name}</td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 12px;font-size:20px;line-height:1.3">{html.escape(heading)}</h1>
<div style="font-size:15px;line-height:1.6;color:#3d4b42">{body_html}</div>
<p style="margin:26px 0"><a href="{html.escape(button_url)}" style="background:#16a35a;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;display:inline-block">{html.escape(button_text)}</a></p>
<p style="font-size:12px;color:#7a877e;line-height:1.5;word-break:break-all">If the button doesn't work, paste this link into your browser:<br>{html.escape(button_url)}</p>
</td></tr>
<tr><td style="padding:16px 28px;border-top:1px solid #eef1ed;font-size:12px;color:#7a877e">{html.escape(footer)}</td></tr>
</table></td></tr></table></body></html>"""


def send_email(settings: Settings, to: str, subject: str, html_body: str, text_body: str) -> bool:
    if settings.email_backend == "resend":
        if not settings.resend_api_key:
            log.error("EUDR_EMAIL_BACKEND=resend but EUDR_RESEND_API_KEY is empty")
            return False
        try:
            r = httpx.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {settings.resend_api_key}"},
                json={"from": settings.email_from, "to": [to], "subject": subject, "html": html_body, "text": text_body},
                timeout=15,
            )
            if r.status_code >= 300:
                log.error("Resend rejected email to %s: %s %s", to, r.status_code, r.text[:300])
                return False
            return True
        except httpx.HTTPError as exc:
            log.error("Resend request failed: %s", exc)
            return False
    OUTBOX.append({"to": to, "subject": subject, "html": html_body, "text": text_body})
    del OUTBOX[:-50]
    log.warning("EMAIL (console backend) to=%s subject=%s\n%s", to, subject, text_body)
    return False  # not actually delivered


def send_password_reset(settings: Settings, to: str, name: str, url: str) -> bool:
    subject = f"Reset your {settings.app_name} password"
    body = (f"<p>Hi {html.escape(name.split()[0] if name else '')},</p>"
            f"<p>Someone asked to reset the password for your {html.escape(settings.app_name)} account. "
            "The link works once and expires in 1 hour.</p>")
    text = f"Hi,\n\nReset your {settings.app_name} password (link expires in 1 hour):\n{url}\n\nIf you didn't ask for this, ignore this email."
    return send_email(settings, to, subject,
                      _layout(settings, "Reset your password", body, "Choose a new password", url,
                              "Didn't ask for this? You can ignore this email; your password stays the same."), text)


def send_invite(settings: Settings, to: str, name: str, inviter: str, org: str, role_label: str, url: str) -> bool:
    subject = f"{inviter} invited you to {org} on {settings.app_name}"
    body = (f"<p>Hi {html.escape(name.split()[0] if name else '')},</p>"
            f"<p><b>{html.escape(inviter)}</b> added you to <b>{html.escape(org)}</b> on {html.escape(settings.app_name)} "
            f"as <b>{html.escape(role_label)}</b>. {html.escape(settings.app_name)} keeps farm, batch and shipment records "
            "ready for EU deforestation (EUDR) checks.</p><p>Set a password to activate your account. The link expires in 7 days.</p>")
    text = f"{inviter} invited you to {org} on {settings.app_name} as {role_label}.\nSet your password (expires in 7 days):\n{url}"
    return send_email(settings, to, subject,
                      _layout(settings, f"Join {org}", body, "Accept invitation", url,
                              "Not expecting this? You can ignore this email."), text)
