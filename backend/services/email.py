"""
Roboroça - Email Service
Envio de emails via Resend API (async).
Suporta: reset de senha, notificações, relatórios semanais.
Fallback: log no console quando RESEND_API_KEY não configurado.
"""

import logging
from typing import Optional

import httpx

from backend.core.config import settings

logger = logging.getLogger(__name__)


def _is_email_configured() -> bool:
    """Verifica se Resend está configurado."""
    return bool(settings.RESEND_API_KEY)


async def send_email(
    to_email: str,
    subject: str,
    html_body: str,
    text_body: Optional[str] = None,
) -> bool:
    """
    Envia email via Resend API (async).
    Retorna True se enviado, False se não configurado ou erro.
    """
    if not _is_email_configured():
        logger.warning("Resend not configured — email to %s not sent (subject: %s)", to_email, subject)
        return False

    payload = {
        "from": f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>",
        "to": [to_email],
        "subject": subject,
        "html": html_body,
    }
    if text_body:
        payload["text"] = text_body

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                "https://api.resend.com/emails",
                json=payload,
                headers={
                    "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                    "Content-Type": "application/json",
                },
            )
            response.raise_for_status()
        logger.info("Email sent to %s (subject: %s)", to_email, subject)
        return True
    except (httpx.HTTPStatusError, httpx.ConnectError, httpx.TimeoutException) as e:
        logger.error("Failed to send email to %s: %s", to_email, e)
        return False


async def send_password_reset_email(to_email: str, reset_token: str) -> bool:
    """Envia email de reset de senha."""
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #0f0f1a; color: #e5e7eb; margin: 0; padding: 20px; }}
            .container {{ max-width: 500px; margin: 0 auto; background: #1a1a2e; border-radius: 16px; padding: 40px; border: 1px solid #374151; }}
            .logo {{ text-align: center; margin-bottom: 24px; font-size: 28px; font-weight: bold; }}
            .logo span:first-child {{ color: white; }}
            .logo span:last-child {{ color: #6AAF3D; }}
            h1 {{ color: white; font-size: 22px; text-align: center; margin-bottom: 16px; }}
            p {{ color: #9ca3af; line-height: 1.6; }}
            .btn {{ display: block; width: 100%; text-align: center; padding: 14px 24px; background: #6AAF3D; color: white !important; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; margin: 24px 0; box-sizing: border-box; }}
            .url {{ word-break: break-all; font-size: 12px; color: #6b7280; background: #0f0f1a; padding: 10px; border-radius: 8px; margin-top: 16px; }}
            .footer {{ text-align: center; color: #6b7280; font-size: 12px; margin-top: 24px; border-top: 1px solid #374151; padding-top: 16px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="logo"><span>Robo</span><span>roca</span></div>
            <h1>Redefinir Senha</h1>
            <p>Voce solicitou a redefinicao de senha da sua conta. Clique no botao abaixo para criar uma nova senha:</p>
            <a href="{reset_url}" class="btn">Redefinir Minha Senha</a>
            <p>Este link expira em <strong>1 hora</strong>. Se voce nao solicitou esta alteracao, ignore este email.</p>
            <div class="url">{reset_url}</div>
            <div class="footer">Roboroca — Automacao Agricola Inteligente</div>
        </div>
    </body>
    </html>
    """

    text_body = f"""Redefinir Senha — Roboroca

Voce solicitou a redefinicao de senha.
Acesse o link abaixo para criar uma nova senha:

{reset_url}

Este link expira em 1 hora.
Se voce nao solicitou esta alteracao, ignore este email.
"""

    return await send_email(to_email, "Redefinir Senha — Roboroca", html_body, text_body)


async def send_welcome_email(to_email: str, username: str) -> bool:
    """Envia email de boas-vindas ao novo usuario."""
    login_url = f"{settings.FRONTEND_URL}/login"

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #0f0f1a; color: #e5e7eb; margin: 0; padding: 20px; }}
            .container {{ max-width: 500px; margin: 0 auto; background: #1a1a2e; border-radius: 16px; padding: 40px; border: 1px solid #374151; }}
            .logo {{ text-align: center; margin-bottom: 24px; font-size: 28px; font-weight: bold; }}
            .logo span:first-child {{ color: white; }}
            .logo span:last-child {{ color: #6AAF3D; }}
            h1 {{ color: white; font-size: 22px; text-align: center; }}
            p {{ color: #9ca3af; line-height: 1.6; }}
            .btn {{ display: block; text-align: center; padding: 14px 24px; background: #6AAF3D; color: white !important; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; margin: 24px 0; }}
            .footer {{ text-align: center; color: #6b7280; font-size: 12px; margin-top: 24px; border-top: 1px solid #374151; padding-top: 16px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="logo"><span>Robo</span><span>roca</span></div>
            <h1>Bem-vindo, {username}!</h1>
            <p>Sua conta foi criada com sucesso. Com o Roboroca voce pode:</p>
            <ul style="color: #9ca3af; line-height: 2;">
                <li>Analisar imagens aereas com IA</li>
                <li>Calcular custos de producao</li>
                <li>Monitorar saude da lavoura</li>
                <li>Gerar relatorios profissionais</li>
            </ul>
            <a href="{login_url}" class="btn">Acessar Plataforma</a>
            <div class="footer">Roboroca — Automacao Agricola Inteligente</div>
        </div>
    </body>
    </html>
    """

    return await send_email(to_email, f"Bem-vindo ao Roboroca, {username}!", html_body)


async def send_analysis_complete_email(
    to_email: str,
    project_name: str,
    project_id: int,
    stats: dict,
) -> bool:
    """Envia email quando analise do projeto termina."""
    project_url = f"{settings.FRONTEND_URL}/projects/{project_id}"

    images_count = stats.get("images", 0)
    area = stats.get("area_ha", 0)
    vegetation = stats.get("vegetation_pct", 0)

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #0f0f1a; color: #e5e7eb; margin: 0; padding: 20px; }}
            .container {{ max-width: 500px; margin: 0 auto; background: #1a1a2e; border-radius: 16px; padding: 40px; border: 1px solid #374151; }}
            .logo {{ text-align: center; margin-bottom: 24px; font-size: 28px; font-weight: bold; }}
            .logo span:first-child {{ color: white; }}
            .logo span:last-child {{ color: #6AAF3D; }}
            h1 {{ color: white; font-size: 22px; text-align: center; }}
            p {{ color: #9ca3af; line-height: 1.6; }}
            .stats {{ display: flex; justify-content: space-around; margin: 24px 0; }}
            .stat {{ text-align: center; }}
            .stat-value {{ font-size: 28px; font-weight: bold; color: #6AAF3D; }}
            .stat-label {{ font-size: 12px; color: #6b7280; margin-top: 4px; }}
            .btn {{ display: block; text-align: center; padding: 14px 24px; background: #6AAF3D; color: white !important; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; margin: 24px 0; }}
            .footer {{ text-align: center; color: #6b7280; font-size: 12px; margin-top: 24px; border-top: 1px solid #374151; padding-top: 16px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="logo"><span>Robo</span><span>roca</span></div>
            <h1>Analise Concluida</h1>
            <p>A analise do projeto <strong style="color:white">{project_name}</strong> foi concluida:</p>
            <div class="stats">
                <div class="stat"><div class="stat-value">{images_count}</div><div class="stat-label">Imagens</div></div>
                <div class="stat"><div class="stat-value">{area:.1f}</div><div class="stat-label">Hectares</div></div>
                <div class="stat"><div class="stat-value">{vegetation:.1f}%</div><div class="stat-label">Vegetacao</div></div>
            </div>
            <a href="{project_url}" class="btn">Ver Resultados</a>
            <div class="footer">Roboroca — Automacao Agricola Inteligente</div>
        </div>
    </body>
    </html>
    """

    return await send_email(to_email, f"Analise concluida: {project_name}", html_body)
