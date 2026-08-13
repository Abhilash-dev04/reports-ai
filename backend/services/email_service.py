"""Email notifications for report requests and support contact requests."""

import html
import os
import smtplib
import ssl
from dataclasses import dataclass
from email.message import EmailMessage
from typing import Optional

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class EmailResult:
    """Result of an attempted email delivery."""

    sent: bool
    error: Optional[str] = None


def _required_environment(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise ValueError(f"{name} is not configured")
    return value


def _smtp_settings() -> tuple[str, int, str, str, str]:
    server = os.environ.get("SMTP_SERVER", "smtp.gmail.com").strip()
    port = int(os.environ.get("SMTP_PORT", "587"))
    username = _required_environment("SMTP_USER")
    password = _required_environment("SMTP_PASS")
    recipient = _required_environment("DEV_TEAM_EMAIL")
    return server, port, username, password, recipient


def _safe_error(error: Exception) -> str:
    """Return a safe diagnostic without exposing credentials."""

    message = str(error).replace("\r", " ").replace("\n", " ").strip()
    return f"{type(error).__name__}: {message}"[:1000]


def send_email(subject: str, text_body: str, html_body: str) -> EmailResult:
    """Send one TLS-protected SMTP email and return a non-throwing result."""

    try:
        server, port, username, password, recipient = _smtp_settings()

        message = EmailMessage()
        message["Subject"] = subject
        message["From"] = username
        message["To"] = recipient
        message.set_content(text_body)
        message.add_alternative(html_body, subtype="html")

        tls_context = ssl.create_default_context()

        with smtplib.SMTP(server, port, timeout=30) as smtp:
            smtp.ehlo()
            smtp.starttls(context=tls_context)
            smtp.ehlo()
            smtp.login(username, password)
            smtp.send_message(message)

        return EmailResult(sent=True)

    except Exception as error:
        return EmailResult(sent=False, error=_safe_error(error))


def send_report_request_notification(request_id: int, request_data: dict) -> EmailResult:
    """Notify the reporting support team that an Add Details request is pending."""

    report_name = str(request_data.get("report_name") or "Unknown report")
    requested_by = str(request_data.get("requested_by") or "Unknown user")
    requester_email = str(request_data.get("requester_email") or "Not provided")
    original_query = str(request_data.get("original_query") or "Not provided")

    rows = [
        ("Request ID", request_id),
        ("Status", "Pending"),
        ("Requested by", requested_by),
        ("Requester email", requester_email),
        ("Original query", original_query),
        ("Report ID", request_data.get("report_id") or "Not provided"),
        ("Report name", report_name),
        ("Job name", request_data.get("job_name") or "Not provided"),
        ("State", request_data.get("state") or "Not provided"),
        ("Functional area", request_data.get("functional_area") or "Not provided"),
        ("Package", request_data.get("package_name") or "Not provided"),
        ("Frequency", request_data.get("frequency") or "Not provided"),
        ("Data source", request_data.get("data_source") or "Not provided"),
        ("Tables used", request_data.get("tables_used") or "Not provided"),
        ("Columns in tables", request_data.get("columns_in_tables") or "Not provided"),
    ]

    text_body = "New Reports AI Add Details request\n\n" + "\n".join(
        f"{label}: {value}" for label, value in rows
    )

    html_rows = "".join(
        "<tr>"
        f"<th style='text-align:left;padding:6px;border:1px solid #ddd'>{html.escape(str(label))}</th>"
        f"<td style='padding:6px;border:1px solid #ddd'>{html.escape(str(value))}</td>"
        "</tr>"
        for label, value in rows
    )

    html_body = (
        "<h2>New Reports AI Add Details request</h2>"
        "<p>A report request is awaiting reporting team review.</p>"
        f"<table style='border-collapse:collapse'>{html_rows}</table>"
    )

    return send_email(
        subject=f"[Reports AI] Add Details request #{request_id}: {report_name}",
        text_body=text_body,
        html_body=html_body,
    )


def send_contact_notification(request_id: int, request_data: dict) -> EmailResult:
    """Notify the reporting support team about a no-match contact request."""

    requested_by = str(request_data.get("requested_by") or "Unknown user")
    requester_email = str(request_data.get("requester_email") or "Not provided")
    original_query = str(request_data.get("original_query") or "Not provided")
    user_message = str(request_data.get("message") or "")

    text_body = (
        "New Reports AI support contact request\n\n"
        f"Request ID: {request_id}\n"
        f"Requested by: {requested_by}\n"
        f"Requester email: {requester_email}\n"
        f"Original query: {original_query}\n\n"
        f"Message:\n{user_message}"
    )

    html_body = (
        "<h2>New Reports AI support contact request</h2>"
        f"<p><strong>Request ID:</strong> {request_id}</p>"
        f"<p><strong>Requested by:</strong> {html.escape(requested_by)}</p>"
        f"<p><strong>Requester email:</strong> {html.escape(requester_email)}</p>"
        f"<p><strong>Original query:</strong> {html.escape(original_query)}</p>"
        f"<p><strong>Message:</strong><br>{html.escape(user_message).replace(chr(10), '<br>')}</p>"
    )

    return send_email(
        subject=f"[Reports AI] support contact request #{request_id}",
        text_body=text_body,
        html_body=html_body,
    )
