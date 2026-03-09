#!/bin/bash
# ===========================================
# Roboroça - Digital Ocean Droplet Setup
# ===========================================
# Executar como root no droplet recem-criado:
#   curl -sSL https://raw.githubusercontent.com/.../deploy/setup-droplet.sh | bash
#
# Requisitos: Ubuntu 22.04+ Droplet (recomendado: 4GB RAM, 2 vCPUs)
# ===========================================

set -euo pipefail

echo "=========================================="
echo "  Roboroca - Setup Digital Ocean Droplet"
echo "=========================================="

# 1. Atualizar sistema
echo "[1/8] Atualizando sistema..."
apt-get update -qq && apt-get upgrade -y -qq

# 2. Instalar Docker
echo "[2/8] Instalando Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
fi

# 3. Instalar Docker Compose v2
echo "[3/8] Verificando Docker Compose..."
docker compose version || {
    apt-get install -y docker-compose-plugin
}

# 4. Criar usuario deploy
echo "[4/8] Criando usuario deploy..."
if ! id "deploy" &>/dev/null; then
    adduser --disabled-password --gecos "Deploy User" deploy
    usermod -aG docker deploy
    echo "deploy ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/deploy
fi

# 5. Firewall
echo "[5/8] Configurando firewall..."
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# 6. Swap (para droplets pequenos)
echo "[6/8] Configurando swap..."
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo "/swapfile none swap sw 0 0" >> /etc/fstab
fi

# 7. Criar diretorios
echo "[7/8] Criando diretorios..."
mkdir -p /opt/roboroca
chown deploy:deploy /opt/roboroca

# 8. Instalar ferramentas extras
echo "[8/8] Instalando ferramentas..."
apt-get install -y -qq git htop ncdu fail2ban

# Configurar fail2ban
systemctl enable fail2ban
systemctl start fail2ban

echo ""
echo "=========================================="
echo "  Setup completo!"
echo "=========================================="
echo ""
echo "Proximos passos:"
echo ""
echo "  1. Fazer login como deploy:"
echo "     su - deploy"
echo ""
echo "  2. Clonar o repositorio:"
echo "     cd /opt/roboroca"
echo "     git clone https://github.com/SEU_USER/roboroca.git ."
echo ""
echo "  3. Configurar .env:"
echo "     cp .env.example .env"
echo "     nano .env  # Preencher DOMAIN, POSTGRES_PASSWORD, SECRET_KEY, SMTP"
echo ""
echo "  4. Deploy:"
echo "     ./deploy/deploy.sh"
echo ""
echo "=========================================="
