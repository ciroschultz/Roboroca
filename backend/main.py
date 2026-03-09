"""
Roboroça - Main Application
Ponto de entrada da API FastAPI.
"""

import logging
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from backend.core.logging_config import setup_logging

setup_logging()

logger = logging.getLogger(__name__)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html

from backend.api.routes import health, images, projects, analysis, auth, annotations
from backend.api.routes.api_keys import router as api_keys_router
from backend.api.routes.websocket import router as ws_router
from backend.modules.aerial.router import router as aerial_router
from backend.modules.calculator.router import router as calculator_router
from backend.modules.equipment.router import router as equipment_router
from backend.modules.precision.router import router as precision_router
from backend.modules.spectral.router import router as spectral_router
from backend.core.config import settings
from backend.core.database import init_db, close_db, async_session_maker


async def recover_stuck_projects():
    """Recuperar projetos presos em 'processing' de execuções anteriores."""
    try:
        from sqlalchemy import select, update
        from backend.models.project import Project

        async with async_session_maker() as db:
            result = await db.execute(
                select(Project).where(Project.status == "processing")
            )
            stuck = result.scalars().all()
            if stuck:
                for p in stuck:
                    p.status = "error"
                await db.commit()
                logger.warning("Recovered %d stuck project(s) from 'processing' to 'error'", len(stuck))
    except Exception as e:
        logger.error("Failed to recover stuck projects: %s", e)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gerencia o ciclo de vida da aplicação."""
    # Startup
    logger.info("Starting Roboroça API v%s", settings.VERSION)
    logger.info("Environment: %s", settings.ENVIRONMENT)
    logger.info("Database: %s", settings.DATABASE_URL.split('@')[-1] if '@' in settings.DATABASE_URL else settings.DATABASE_URL)

    # Inicializar banco de dados
    await init_db()
    logger.info("Database initialized")

    # Recuperar projetos presos em processamento
    await recover_stuck_projects()

    yield

    # Shutdown
    await close_db()
    logger.info("Shutting down Roboroça API")


# CSS personalizado para Swagger UI com tema Roboroça
CUSTOM_SWAGGER_CSS = """
:root {
    --robo-green: #6AAF3D;
    --robo-blue: #1B3A5C;
    --robo-dark: #0f0f1a;
    --robo-card: #1a1a2e;
}

body {
    background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #0f2027 100%) !important;
    min-height: 100vh;
}

.swagger-ui {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important;
}

.swagger-ui .topbar {
    background: linear-gradient(90deg, var(--robo-green) 0%, var(--robo-blue) 100%) !important;
    padding: 15px 0 !important;
}

.swagger-ui .topbar .download-url-wrapper {
    display: none !important;
}

.swagger-ui .topbar-wrapper {
    max-width: 1200px;
    margin: 0 auto;
}

.swagger-ui .topbar-wrapper img {
    content: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><circle cx="12" cy="12" r="10"/></svg>') !important;
}

.swagger-ui .topbar-wrapper .link span {
    font-size: 1.5rem !important;
    font-weight: bold !important;
}

.swagger-ui .info {
    margin: 30px 0 !important;
}

.swagger-ui .info .title {
    color: white !important;
    font-size: 2.5rem !important;
}

.swagger-ui .info .title small {
    background: var(--robo-green) !important;
    color: white !important;
    border-radius: 8px !important;
    padding: 4px 12px !important;
}

.swagger-ui .info .description {
    color: #9ca3af !important;
    font-size: 1.1rem !important;
}

.swagger-ui .info a {
    color: var(--robo-green) !important;
}

.swagger-ui .scheme-container {
    background: var(--robo-card) !important;
    border-radius: 12px !important;
    padding: 20px !important;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3) !important;
}

.swagger-ui .opblock-tag {
    color: white !important;
    border-bottom: 1px solid #374151 !important;
    font-size: 1.3rem !important;
}

.swagger-ui .opblock-tag:hover {
    background: rgba(106, 175, 61, 0.1) !important;
}

.swagger-ui .opblock {
    background: var(--robo-card) !important;
    border-radius: 12px !important;
    margin: 10px 0 !important;
    border: 1px solid #374151 !important;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2) !important;
}

.swagger-ui .opblock .opblock-summary {
    border: none !important;
}

.swagger-ui .opblock .opblock-summary-method {
    border-radius: 8px !important;
    font-weight: bold !important;
    min-width: 80px !important;
}

.swagger-ui .opblock.opblock-get .opblock-summary-method {
    background: #3b82f6 !important;
}

.swagger-ui .opblock.opblock-post .opblock-summary-method {
    background: var(--robo-green) !important;
}

.swagger-ui .opblock.opblock-put .opblock-summary-method {
    background: #f59e0b !important;
}

.swagger-ui .opblock.opblock-delete .opblock-summary-method {
    background: #ef4444 !important;
}

.swagger-ui .opblock.opblock-patch .opblock-summary-method {
    background: #8b5cf6 !important;
}

.swagger-ui .opblock .opblock-summary-path {
    color: white !important;
}

.swagger-ui .opblock .opblock-summary-description {
    color: #9ca3af !important;
}

.swagger-ui .opblock-description-wrapper,
.swagger-ui .opblock-body {
    background: #0f0f1a !important;
}

.swagger-ui .opblock-body pre {
    background: #1a1a2e !important;
    border-radius: 8px !important;
    color: #e5e7eb !important;
}

.swagger-ui .parameters-col_description {
    color: #d1d5db !important;
}

.swagger-ui .parameter__name {
    color: white !important;
}

.swagger-ui .parameter__type {
    color: var(--robo-green) !important;
}

.swagger-ui table tbody tr td {
    color: #d1d5db !important;
    border-color: #374151 !important;
}

.swagger-ui .response-col_status {
    color: white !important;
}

.swagger-ui .response-col_description {
    color: #9ca3af !important;
}

.swagger-ui .btn {
    border-radius: 8px !important;
}

.swagger-ui .btn.execute {
    background: var(--robo-green) !important;
    border-color: var(--robo-green) !important;
}

.swagger-ui .btn.execute:hover {
    background: #5a9a34 !important;
}

.swagger-ui .btn.cancel {
    background: #ef4444 !important;
    border-color: #ef4444 !important;
}

.swagger-ui input[type=text],
.swagger-ui textarea,
.swagger-ui select {
    background: #1a1a2e !important;
    border: 1px solid #374151 !important;
    border-radius: 8px !important;
    color: white !important;
}

.swagger-ui input[type=text]:focus,
.swagger-ui textarea:focus {
    border-color: var(--robo-green) !important;
    outline: none !important;
}

.swagger-ui .model-box {
    background: var(--robo-card) !important;
    border-radius: 8px !important;
}

.swagger-ui .model {
    color: #d1d5db !important;
}

.swagger-ui .model-title {
    color: white !important;
}

.swagger-ui .prop-type {
    color: var(--robo-green) !important;
}

.swagger-ui section.models {
    border: 1px solid #374151 !important;
    border-radius: 12px !important;
    background: var(--robo-card) !important;
}

.swagger-ui section.models h4 {
    color: white !important;
    border-color: #374151 !important;
}

.swagger-ui .model-container {
    background: #0f0f1a !important;
    border-radius: 8px !important;
    margin: 10px 0 !important;
}

.swagger-ui .servers > label {
    color: white !important;
}

.swagger-ui .servers select {
    background: #1a1a2e !important;
    color: white !important;
    border: 1px solid #374151 !important;
}

/* Autorização */
.swagger-ui .auth-wrapper {
    background: var(--robo-card) !important;
    border-radius: 12px !important;
}

.swagger-ui .dialog-ux .modal-ux {
    background: var(--robo-card) !important;
    border: 1px solid #374151 !important;
    border-radius: 12px !important;
}

.swagger-ui .dialog-ux .modal-ux-header {
    border-color: #374151 !important;
}

.swagger-ui .dialog-ux .modal-ux-header h3 {
    color: white !important;
}

.swagger-ui .dialog-ux .modal-ux-content {
    color: #d1d5db !important;
}

.swagger-ui .auth-btn-wrapper .btn-done {
    background: var(--robo-green) !important;
    border-color: var(--robo-green) !important;
}

/* Loading */
.swagger-ui .loading-container {
    background: var(--robo-dark) !important;
}

/* Scroll */
.swagger-ui ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
}

.swagger-ui ::-webkit-scrollbar-track {
    background: #1a1a2e;
}

.swagger-ui ::-webkit-scrollbar-thumb {
    background: #4a4a6a;
    border-radius: 4px;
}

.swagger-ui ::-webkit-scrollbar-thumb:hover {
    background: var(--robo-green);
}
"""

description = """
# Roboroça API 🌱

Sistema inteligente de analise de imagens aereas para agricultura.

## Funcionalidades

* **Projetos** — Crie e gerencie projetos de monitoramento agricola
* **Imagens** — Upload de drone, satelite e video; captura por GPS
* **Analise ML** — 8 servicos de IA (vegetacao, arvores, pragas, biomassa, NDVI...)
* **GIS** — Anotacoes, zonas de cultivo, perimetro ROI, export GeoJSON
* **Relatorios** — PDF, dashboard comparativo, timeline evolutiva
* **Tempo Real** — WebSocket para progresso de analises

## Autenticacao

Todos os endpoints (exceto health e login) requerem autenticacao via:
```
Authorization: Bearer <token>   (JWT - usuarios dos frontends)
X-API-Key: rbr_live_...         (API Key - clientes externos)
```
"""

tags_metadata = [
    {"name": "Health", "description": "Status e saude da API"},
    {"name": "Auth", "description": "Autenticacao, registro e gerenciamento de conta"},
    {"name": "Projects", "description": "CRUD de projetos, analises, comparacoes e timeline"},
    {"name": "Images", "description": "Upload, metadados, perimetro e captura satelital"},
    {"name": "Aerial - Descricao de Imagens", "description": "Descricao de imagens aereas: vegetacao, saude, pragas, biomassa, NDVI, PDF"},
    {"name": "Analysis", "description": "Alias de compatibilidade — mesmos endpoints de Aerial"},
    {"name": "API Keys", "description": "CRUD de chaves de API para acesso externo"},
    {"name": "Annotations", "description": "Anotacoes GIS, zonas de cultivo e export GeoJSON"},
    {"name": "WebSocket", "description": "Progresso em tempo real de analises via WebSocket"},
    {"name": "Calculator", "description": "Calculadora Agraria — salvar e consultar calculos"},
    {"name": "Equipment", "description": "Marketplace de equipamentos — produtos, carrinho, pedidos"},
    {"name": "Precision", "description": "Agricultura de Precisao — talhoes, snapshots, zonas de manejo"},
    {"name": "Spectral", "description": "Espectroscopia — amostras, analise lignina/celulose, calibracao"},
]

app = FastAPI(
    title="Roboroça API",
    description=description,
    version=settings.VERSION,
    contact={
        "name": "Roboroça",
        "url": "http://localhost:3000",
    },
    license_info={
        "name": "Proprietary",
    },
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    docs_url=None,  # Desabilita docs padrão
    redoc_url=None,  # Desabilita redoc padrão
    lifespan=lifespan,
    openapi_tags=tags_metadata,
)

# Configurar CORS - Restritivo em produção, aberto em dev
if settings.ENVIRONMENT == "development":
    cors_origins = ["*"]
else:
    cors_origins = settings.CORS_ORIGINS
    if settings.FRONTEND_URL not in cors_origins:
        cors_origins.append(settings.FRONTEND_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"],
    allow_headers=["*"],
    expose_headers=["*"],
)


# Middleware X-Request-ID + Metrics
class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        from backend.services.metrics import metrics

        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.state.request_id = request_id

        start = time.time()
        response = await call_next(request)
        duration = time.time() - start

        response.headers["X-Request-ID"] = request_id

        # Metricas
        method = request.method
        path = request.url.path
        status_code = response.status_code
        metrics.inc("roboroca_http_requests_total", labels={"method": method, "status": str(status_code)})
        metrics.observe("roboroca_http_request_duration_seconds", duration, labels={"method": method, "path": path})

        if duration > 1.0:
            logger.warning("Slow request: %s %s took %.2fs (status=%d)", method, path, duration, status_code)

        return response


app.add_middleware(RequestIDMiddleware)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handler global para exceções não tratadas."""
    request_id = getattr(request.state, "request_id", "unknown")
    logger.error(
        "Unhandled: %s %s [%s] %s",
        request.method, request.url.path, request_id, exc,
        exc_info=True,
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "Erro interno do servidor"},
    )


# Registrar rotas
app.include_router(health.router, prefix=settings.API_V1_PREFIX, tags=["Health"])
app.include_router(auth.router, prefix=settings.API_V1_PREFIX, tags=["Auth"])
app.include_router(projects.router, prefix=settings.API_V1_PREFIX, tags=["Projects"])
app.include_router(images.router, prefix=settings.API_V1_PREFIX, tags=["Images"])
app.include_router(aerial_router, prefix=f"{settings.API_V1_PREFIX}/aerial", tags=["Aerial - Descricao de Imagens"])
app.include_router(analysis.router, prefix=settings.API_V1_PREFIX, tags=["Analysis"])
app.include_router(api_keys_router, prefix=settings.API_V1_PREFIX, tags=["API Keys"])
app.include_router(annotations.router, prefix=settings.API_V1_PREFIX, tags=["Annotations"])
app.include_router(ws_router, tags=["WebSocket"])
app.include_router(calculator_router, prefix=f"{settings.API_V1_PREFIX}/calculator", tags=["Calculator"])
app.include_router(equipment_router, prefix=f"{settings.API_V1_PREFIX}/equipment", tags=["Equipment"])
app.include_router(precision_router, prefix=f"{settings.API_V1_PREFIX}/precision", tags=["Precision"])
app.include_router(spectral_router, prefix=f"{settings.API_V1_PREFIX}/spectral", tags=["Spectral"])


@app.get("/")
async def root():
    """Rota raiz - Informações básicas da API."""
    return {
        "name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "description": settings.DESCRIPTION,
        "docs": f"{settings.API_V1_PREFIX}/docs",
        "health": f"{settings.API_V1_PREFIX}/health",
    }


@app.get(f"{settings.API_V1_PREFIX}/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    """Swagger UI com tema personalizado Roboroça."""
    return HTMLResponse(f"""
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Roboroça API - Documentação</title>
    <link rel="icon" type="image/png" href="http://localhost:3000/favicon.png">
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
    <style>
        {CUSTOM_SWAGGER_CSS}
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
        window.onload = function() {{
            const ui = SwaggerUIBundle({{
                url: "{settings.API_V1_PREFIX}/openapi.json",
                dom_id: '#swagger-ui',
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIBundle.SwaggerUIStandalonePreset
                ],
                layout: "BaseLayout",
                deepLinking: true,
                showExtensions: true,
                showCommonExtensions: true,
                defaultModelsExpandDepth: 1,
                defaultModelExpandDepth: 2,
                docExpansion: "list",
                filter: true,
                syntaxHighlight: {{
                    activate: true,
                    theme: "monokai"
                }}
            }});
            window.ui = ui;
        }};
    </script>
</body>
</html>
    """)


@app.get(f"{settings.API_V1_PREFIX}/redoc", include_in_schema=False)
async def custom_redoc_html():
    """ReDoc com tema personalizado."""
    return HTMLResponse(f"""
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Roboroça API - ReDoc</title>
    <link rel="icon" type="image/png" href="http://localhost:3000/favicon.png">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        body {{
            margin: 0;
            padding: 0;
        }}
    </style>
</head>
<body>
    <redoc
        spec-url="{settings.API_V1_PREFIX}/openapi.json"
        theme='{{"colors": {{"primary": {{"main": "#6AAF3D"}}}}, "typography": {{"fontSize": "15px", "fontFamily": "Inter, sans-serif"}}, "sidebar": {{"backgroundColor": "#1a1a2e", "textColor": "#ffffff"}}, "rightPanel": {{"backgroundColor": "#0f0f1a"}}}}'
    ></redoc>
    <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
</body>
</html>
    """)
