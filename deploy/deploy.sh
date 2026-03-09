#!/bin/bash
# ===========================================
# Roboroça - Deploy Script
# ===========================================
# Uso: ./deploy/deploy.sh [--ssl-init]
#
# Flags:
#   --ssl-init    Primeiro deploy: gera certificado SSL antes de subir
#   --no-build    Pula o build (usa imagens existentes)
#   --pull        Faz git pull antes do deploy
# ===========================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="${PROJECT_DIR}/docker-compose.prod.yml"

cd "$PROJECT_DIR"

# Parse flags
SSL_INIT=false
NO_BUILD=false
DO_PULL=false
for arg in "$@"; do
    case $arg in
        --ssl-init) SSL_INIT=true ;;
        --no-build) NO_BUILD=true ;;
        --pull) DO_PULL=true ;;
    esac
done

echo "=========================================="
echo "  Roboroca Deploy"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="

# Verificar .env
if [ ! -f .env ]; then
    echo "ERRO: .env nao encontrado! Copie .env.example e configure."
    exit 1
fi

# Carregar .env
set -a
source .env
set +a

# Validar variaveis obrigatorias
for var in DOMAIN POSTGRES_PASSWORD SECRET_KEY; do
    if [ -z "${!var:-}" ] || [ "${!var}" = "change-me-in-production" ] || [ "${!var}" = "sua-chave-secreta-aqui-mude-em-producao" ]; then
        echo "ERRO: $var deve ser configurado no .env!"
        exit 1
    fi
done

echo "Domain: ${DOMAIN}"
echo "Environment: ${ENVIRONMENT:-production}"

# Git pull se solicitado
if [ "$DO_PULL" = true ]; then
    echo ""
    echo "[1/5] Git pull..."
    git pull origin main
fi

# SSL inicial
if [ "$SSL_INIT" = true ]; then
    echo ""
    echo "[SSL] Gerando certificado SSL..."

    # Criar nginx config temporario (somente HTTP)
    docker compose -f "$COMPOSE_FILE" up -d nginx

    # Aguardar nginx subir
    sleep 5

    # Gerar certificado
    docker compose -f "$COMPOSE_FILE" run --rm certbot certonly \
        --webroot -w /var/www/certbot \
        --email "${CERTBOT_EMAIL:-admin@${DOMAIN}}" \
        --agree-tos \
        --no-eff-email \
        -d "${DOMAIN}" \
        -d "*.${DOMAIN}"

    echo "[SSL] Certificado gerado! Reiniciando nginx..."
    docker compose -f "$COMPOSE_FILE" restart nginx
fi

# Build
BUILD_FLAG=""
if [ "$NO_BUILD" = false ]; then
    BUILD_FLAG="--build"
    echo ""
    echo "[2/5] Building containers..."
fi

# Deploy
echo ""
echo "[3/5] Deploying..."
docker compose -f "$COMPOSE_FILE" up -d $BUILD_FLAG

# Wait for health
echo ""
echo "[4/5] Aguardando health check..."
MAX_WAIT=120
WAITED=0
until curl -sf "http://localhost/api/v1/health" > /dev/null 2>&1; do
    if [ $WAITED -ge $MAX_WAIT ]; then
        echo "AVISO: Health check timeout apos ${MAX_WAIT}s"
        echo "Verificar logs: docker compose -f $COMPOSE_FILE logs backend"
        break
    fi
    sleep 3
    WAITED=$((WAITED + 3))
    echo "  Aguardando... (${WAITED}s)"
done

if [ $WAITED -lt $MAX_WAIT ]; then
    echo "  Health check OK!"
fi

# Setup backup cron
echo ""
echo "[5/5] Configurando backup automatico..."
BACKUP_SCRIPT="${PROJECT_DIR}/docker/backup.sh"
chmod +x "$BACKUP_SCRIPT" 2>/dev/null || true
CRON_LINE="0 3 * * * ${BACKUP_SCRIPT} >> /var/log/roboroca-backup.log 2>&1"
(crontab -l 2>/dev/null | grep -v "roboroca" ; echo "$CRON_LINE") | crontab - 2>/dev/null || echo "AVISO: Nao foi possivel configurar cron (configure manualmente)"

echo ""
echo "=========================================="
echo "  Deploy concluido!"
echo "=========================================="
echo ""
echo "  Site: https://${DOMAIN}"
echo "  API:  https://api.${DOMAIN}/api/v1/docs"
echo "  Aerial: https://aerial.${DOMAIN}"
echo "  Calculator: https://calc.${DOMAIN}"
echo "  Precision: https://precision.${DOMAIN}"
echo "  Equipment: https://equipment.${DOMAIN}"
echo "  Spectral: https://spectral.${DOMAIN}"
echo ""
echo "  Logs:    docker compose -f $COMPOSE_FILE logs -f"
echo "  Status:  docker compose -f $COMPOSE_FILE ps"
echo "  Backup:  ${BACKUP_SCRIPT}"
echo ""
echo "=========================================="
