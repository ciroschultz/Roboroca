# Roboroça

<div align="center">
  <img src="Logo, icone e nome da marca/logo e nome da marca.png" alt="Roboroça Logo" width="400"/>

  **Sistema Inteligente de Análise de Imagens Aéreas para Agricultura**

  [![Version](https://img.shields.io/badge/version-0.2.0--beta-green.svg)](https://github.com/seu-usuario/roboroca)
  [![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
  [![Python](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/)
  [![Next.js](https://img.shields.io/badge/Next.js-14+-black.svg)](https://nextjs.org/)
</div>

---

## Sobre o Projeto

O **Roboroça** é uma plataforma que utiliza inteligência artificial para analisar imagens de drone e satélite, gerando relatórios completos sobre propriedades rurais. O sistema pode ser usado como aplicativo mobile, site web ou instalado em computador.

### Funcionalidades Principais

- **Upload de Imagens**: Suporte a fotos/vídeos de drone e imagens de satélite
- **Análise Automática**: Processamento com IA para extração de dados
- **Múltiplas Imagens**: Combine várias imagens da mesma área para melhor precisão
- **GPS em Tempo Real**: Analise a área ao seu redor usando localização do dispositivo
- **Relatórios PDF**: Geração automática de relatórios profissionais
- **Dashboard Agregado**: Visão geral de todos os seus projetos

---

## O Que o Sistema Analisa?

| Análise | Descrição | Output |
|---------|-----------|--------|
| **Índice NDVI** | Saúde da vegetação | Mapa de calor + estatísticas |
| **Índice NDWI** | Presença de água | Mapa de calor + estatísticas |
| **Contagem de Plantas** | Detecta plantas individuais | Quantidade + densidade/ha |
| **Saúde das Plantas** | Classifica estado | Saudável/Estressada/Crítica (%) |
| **Uso do Solo** | Classifica áreas | Agricultura/Floresta/Pasto/Água |
| **Área Total** | Calcula dimensões | Hectares |
| **Estimativa de Altura** | Altura da vegetação | Metros + mapa |

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                        │
│  • Dashboard • Upload • Mapa Interativo • Relatórios        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (FastAPI)                         │
│  • API REST • Autenticação JWT • Processamento Assíncrono   │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌───────────────────┐ ┌───────────────┐ ┌───────────────────┐
│ PROCESSAMENTO     │ │ MACHINE       │ │ DADOS             │
│ • Rasterio        │ │ LEARNING      │ │ • PostgreSQL      │
│ • OpenCV          │ │ • PyTorch     │ │ • PostGIS         │
│ • GeoPandas       │ │ • YOLO        │ │ • Redis           │
└───────────────────┘ │ • U-Net       │ └───────────────────┘
                      └───────────────┘
```

---

## Tecnologias Utilizadas

### Frontend
| Tecnologia | Uso |
|------------|-----|
| [Next.js 14](https://nextjs.org/) | Framework React |
| [TailwindCSS](https://tailwindcss.com/) | Estilização |
| [Recharts](https://recharts.org/) | Gráficos |
| [Leaflet](https://leafletjs.com/) | Mapas interativos |
| [Lucide React](https://lucide.dev/) | Ícones |

### Backend
| Tecnologia | Uso |
|------------|-----|
| [FastAPI](https://fastapi.tiangolo.com/) | API REST |
| [SQLAlchemy](https://www.sqlalchemy.org/) | ORM |
| [Celery](https://docs.celeryq.dev/) | Tarefas assíncronas |
| [Redis](https://redis.io/) | Cache e filas |

### Processamento de Imagens
| Tecnologia | Uso |
|------------|-----|
| [Rasterio](https://rasterio.readthedocs.io/) | Leitura GeoTIFF |
| [GeoPandas](https://geopandas.org/) | Dados vetoriais |
| [OpenCV](https://opencv.org/) | Processamento de imagens |
| [NumPy](https://numpy.org/) | Computação numérica |

### Machine Learning
| Tecnologia | Uso |
|------------|-----|
| [PyTorch](https://pytorch.org/) | Deep Learning |
| [TorchGeo](https://torchgeo.readthedocs.io/) | Dados geoespaciais |
| [Ultralytics](https://ultralytics.com/) | YOLOv8 (detecção) |
| [segmentation-models-pytorch](https://github.com/qubvel/segmentation_models.pytorch) | U-Net, DeepLab |

### APIs de Satélite
| Serviço | Uso |
|---------|-----|
| [Sentinel Hub](https://www.sentinel-hub.com/) | Imagens Sentinel-2 |
| [Copernicus](https://dataspace.copernicus.eu/) | Dados gratuitos |
| [AWS Earth](https://aws.amazon.com/earth/) | Landsat, MODIS |

---

## Instalação

### Requisitos
- Python 3.11+
- Node.js 18+
- Git

### 1. Clonar o Repositório

```bash
git clone https://github.com/seu-usuario/roboroca.git
cd roboroca
```

### 2. Configurar Backend

```bash
# Criar ambiente virtual
python -m venv venv

# Ativar ambiente (Windows)
venv\Scripts\activate

# Ativar ambiente (Linux/Mac)
source venv/bin/activate

# Instalar dependências
pip install -r requirements.txt

# Copiar configurações
cp .env.example .env

# Iniciar servidor
uvicorn backend.main:app --reload
```

### 3. Configurar Frontend

```bash
cd frontend

# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

### 4. Acessar

- **Frontend**: http://localhost:3000
- **API Docs**: http://localhost:8000/api/v1/docs

---

## Estrutura do Projeto

```
roboroca/
├── backend/
│   ├── api/
│   │   ├── routes/          # Endpoints (auth, projects, images, analysis)
│   │   ├── schemas/         # Schemas Pydantic
│   │   └── dependencies/    # Autenticação
│   ├── core/                # Config, database, security
│   ├── models/              # Modelos SQLAlchemy
│   ├── services/
│   │   ├── image_processing/  # Rasterio, OpenCV
│   │   ├── ml/                # PyTorch, YOLO
│   │   ├── analysis/          # NDVI, NDWI, classificação
│   │   └── satellite/         # APIs Sentinel, Landsat
│   ├── tasks/               # Celery tasks
│   └── utils/               # Utilitários
├── frontend/
│   ├── src/
│   │   ├── app/             # Pages Next.js
│   │   └── components/      # Componentes React
│   └── public/              # Assets estáticos
├── ml_models/               # Modelos treinados
├── notebooks/               # Jupyter notebooks
├── tests/                   # Testes automatizados
├── docs/                    # Documentação
└── docker/                  # Dockerfiles
```

---

## Uso

### Fluxo Principal

1. **Criar Conta/Login** - Autenticação segura com JWT
2. **Upload de Imagens** - Selecione drone ou satélite, envie múltiplas imagens
3. **Processamento** - O sistema analisa automaticamente e cria um projeto
4. **Visualizar Resultados** - Acesse gráficos, mapas e dados no perfil do projeto
5. **Baixar Relatório** - Exporte PDF profissional com todos os dados

### Funcionalidade GPS (Diferencial)

1. Acesse "Visualizar Mapa"
2. Ative "Modo GPS"
3. O sistema obtém sua localização
4. Busca imagem de satélite da região
5. Defina a área de interesse
6. Veja análise em tempo real
7. Salve como novo projeto

---

## API Endpoints

### Autenticação
```
POST /api/v1/auth/register   - Registrar usuário
POST /api/v1/auth/login      - Login (JWT)
GET  /api/v1/auth/me         - Dados do usuário
```

### Projetos
```
GET    /api/v1/projects/     - Listar projetos
POST   /api/v1/projects/     - Criar projeto
GET    /api/v1/projects/{id} - Detalhes
DELETE /api/v1/projects/{id} - Excluir
```

### Imagens
```
POST /api/v1/images/upload           - Upload (múltiplas)
GET  /api/v1/images/{id}/metadata    - Metadados
```

### Análises
```
POST /api/v1/analysis/process/{project_id}  - Processar projeto
GET  /api/v1/analysis/{project_id}/results  - Resultados
GET  /api/v1/analysis/{project_id}/report   - Gerar PDF
```

### GPS/Satélite
```
POST /api/v1/satellite/location      - Análise por coordenadas
GET  /api/v1/satellite/available     - Imagens disponíveis
```

---

## Contribuindo

Veja [CONTRIBUTING.md](CONTRIBUTING.md) para detalhes sobre como contribuir.

---

## Roadmap

Veja [ROADMAP.md](ROADMAP.md) para o plano de desenvolvimento completo.

---

## Licença

Este projeto está sob a licença MIT. Veja [LICENSE](LICENSE) para mais detalhes.

---

## Contato

**Roboroça** - Automação Agrícola

*Transformando imagens em inteligência agrícola*
