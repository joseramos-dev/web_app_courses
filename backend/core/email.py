"""SMTP email helpers for transactional messages."""

from __future__ import annotations

import logging
import os
import smtplib
from email.message import EmailMessage

logger = logging.getLogger(__name__)


def _smtp_configured() -> bool:
    return bool(
        os.getenv("SMTP_HOST")
        and os.getenv("SMTP_USER")
        and os.getenv("SMTP_PASSWORD")
        and os.getenv("SMTP_FROM")
    )


def send_password_reset_email(to: str, reset_url: str) -> None:
    """Send a password reset link. Logs and swallows SMTP errors."""
    if not _smtp_configured():
        logger.warning(
            "SMTP not configured; password reset email not sent to %s. URL: %s",
            to,
            reset_url,
        )
        return

    host = os.getenv("SMTP_HOST", "")
    port = int(os.getenv("SMTP_PORT", "587"))
    user = os.getenv("SMTP_USER", "")
    password = os.getenv("SMTP_PASSWORD", "")
    sender = os.getenv("SMTP_FROM", "")

    msg = EmailMessage()
    msg["Subject"] = "Kursa — Restablecer contraseña"
    msg["From"] = sender
    msg["To"] = to
    msg.set_content(
        f"Haz clic en el siguiente enlace para restablecer tu contraseña:\n\n{reset_url}\n\n"
        "Si no solicitaste este cambio, ignora este correo.\n"
        "El enlace caduca en 30 minutos."
    )

    try:
        with smtplib.SMTP(host, port, timeout=30) as server:
            server.starttls()
            server.login(user, password)
            server.send_message(msg)
    except Exception:
        logger.exception("Failed to send password reset email to %s", to)
