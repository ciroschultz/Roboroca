"""
Roboroça - Main Application
Ponto de entrada da API FastAPI.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html

from backend.api.routes import health, images, projects, analysis, auth, annotations
from backend.core.config import settings
from backend.core.database import init_db, close_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gerencia o ciclo de vida da aplicação."""
    # Startup
    print(f"Starting Roboroça API v{settings.VERSION}")
    print(f"Environment: {settings.ENVIRONMENT}")
    print(f"Database: {settings.DATABASE_URL.split('@')[-1] if '@' in settings.DATABASE_URL else settings.DATABASE_URL}")

    # Inicializar banco de dados
    await init_db()
    print("Database initialized")

    yield

    # Shutdown
    await close_db()
    print("Shutting down Roboroça API")


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

app = FastAPI(
    title=settings.PROJECT_NAME,
    description=f"""
## 🤖 {settings.PROJECT_NAME}

{settings.DESCRIPTION}

### Funcionalidades

- **🔐 Autenticação**: Login e registro de usuários com JWT
- **📁 Projetos**: Gerenciamento de projetos de análise
- **🖼️ Imagens**: Upload e processamento de imagens de drone/satélite
- **📊 Análises**: Análise de vegetação, saúde de plantas, uso do solo

### Links Úteis

- [Frontend](http://localhost:3000) - Interface do usuário
- [Health Check]({settings.API_V1_PREFIX}/health) - Status da API
    """,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    docs_url=None,  # Desabilita docs padrão
    redoc_url=None,  # Desabilita redoc padrão
    lifespan=lifespan,
)

# Configurar CORS - Permitir todas origens em desenvolvimento
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permitir qualquer origem em dev
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Registrar rotas
app.include_router(health.router, prefix=settings.API_V1_PREFIX, tags=["Health"])
app.include_router(auth.router, prefix=settings.API_V1_PREFIX, tags=["Authentication"])
app.include_router(projects.router, prefix=settings.API_V1_PREFIX, tags=["Projects"])
app.include_router(images.router, prefix=settings.API_V1_PREFIX, tags=["Images"])
app.include_router(analysis.router, prefix=settings.API_V1_PREFIX, tags=["Analysis"])
app.include_router(annotations.router, prefix=settings.API_V1_PREFIX, tags=["Annotations"])


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
