<div align="center">

# Roboroça

<img src="Logo, icone e nome da marca/logo e nome da marca.png" alt="Roboroça Logo" width="380"/>

**Plataforma de Análise Inteligente de Imagens Aéreas para Agricultura**

[![Version](https://img.shields.io/badge/version-0.2.0--beta-brightgreen.svg)](https://github.com/ciroschultz/Roboroca)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.11%2B-3776AB.svg?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109%2B-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-14%2B-black.svg?logo=next.js)](https://nextjs.org/)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.1%2B-EE4C2C.svg?logo=pytorch&logoColor=white)](https://pytorch.org/)
[![Tests](https://img.shields.io/badge/testes-228%20passando-success.svg)](#testes)
[![Docker](https://img.shields.io/badge/Docker-suportado-2496ED.svg?logo=docker&logoColor=white)](docker/)

</div>

---

## Índice

- [Sobre o Projeto](#sobre-o-projeto)
- [Análises Disponíveis](#análises-disponíveis)
- [Arquitetura](#arquitetura)
- [Stack Tecnológica](#stack-tecnológica)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Instalação](#instalação)
- [Uso](#uso)
- [API Reference](#api-reference)
- [Modelos de ML](#modelos-de-ml)
- [Integrações Externas](#integrações-externas)
- [Testes](#testes)
- [Docker](#docker)
- [Roadmap](#roadmap)
- [Contribuindo](#contribuindo)
- [Licença](#licença)

---

## Sobre o Projeto

O **Roboroça** é um ecossistema de 6 projetos interconectados que combina visão computacional, deep learning e geoprocessamento para extrair inteligência de imagens de drone e satélite. O sistema processa imagens RGB e multiespectrais, executa pipelines de machine learning e entrega resultados em dashboards interativos, mapas anotados e relatórios PDF.

### Ecossistema de Projetos

| Projeto | Subdomain | Descricao |
|---------|-----------|-----------|
| **Aerial** (este repo) | `aerial.roboroca.com` | Analise ML de imagens aereas |
| **Home** | `roboroca.com` | Landing page institucional |
| **Calculator** | `calc.roboroca.com` | Calculadora de insumos agricolas |
| **Precision** | `precision.roboroca.com` | Agricultura de precisao |
| **Equipment** | `equipment.roboroca.com` | Catalogo de equipamentos |
| **Spectral** | `spectral.roboroca.com` | Analise espectral (NDVI, indices) |

**Casos de uso:**
- Monitoramento de lavouras e pastagens
- Estimativa de cobertura vegetal e biomassa
- Detecção precoce de pragas e estresse hídrico
- Contagem automatizada de plantas/árvores
- Classificação de uso e ocupação do solo
- Análise temporal de evolução de projetos

---

## Análises Disponíveis

### Índices de Vegetação

| Análise | Método | Output |
|---------|--------|--------|
| **Cobertura Vegetal** | ExG Index (Excess Green) | % cobertura + mapa de calor |
| **Saúde das Plantas** | ExG + análise espectral | Score 0–100 + distribuição saudável/estressada/crítica |
| **Máscara de Vegetação** | Limiarização adaptativa | Imagem binária segmentada |
| **Heatmap de Vegetação** | Gradiente colorimétrico | Overlay interativo no mapa |

### Machine Learning

| Modelo | Framework | Análise |
|--------|-----------|---------|
| **Detecção de Objetos** | YOLOv8n (Ultralytics) | Bounding boxes + classes + scores |
| **Segmentação Semântica** | DeepLabV3 (ResNet-101) | Classificação pixel a pixel |
| **Classificação de Cena** | ResNet-18 | Uso e ocupação do solo |
| **Contagem de Árvores** | Segmentação + morfologia | Quantidade + densidade (árvores/ha) |
| **Estimativa de Biomassa** | Regressão espectral | Massa seca estimada (t/ha) |
| **Detecção de Pragas** | Classificação de anomalias | Áreas afetadas + severidade |
| **Extração de Features** | SciPy + NumPy | Textura, cor, padrões visuais |
| **Análise de Vídeo** | OpenCV + ML pipeline | Keyframes + mosaico temporal |

### Classificação do Solo

| Classe | Detecção |
|--------|----------|
| Agricultura | Lavouras, cultivos |
| Floresta | Mata nativa, reflorestamento |
| Pastagem | Campo aberto |
| Água | Rios, lagos, irrigação |
| Solo Exposto | Áreas degradadas |
| Urbano | Edificações, estradas |

### Dados Ambientais Enriquecidos *(via GPS)*

| Dado | Fonte | Detalhe |
|------|-------|---------|
| Clima atual | Open-Meteo | Temperatura, umidade, vento, precipitação |
| Propriedades do solo | SoilGrids (ISRIC) | pH, argila, areia, carbono, nitrogênio |
| Elevação e terreno | Open Topo Data | Altitude + classificação topográfica |
| Endereço | Nominatim (OSM) | Geocodificação reversa de coordenadas |

### Ferramentas de Mapa

| Ferramenta | Função |
|------------|--------|
| Anotação por ponto | Marcação georreferenciada |
| Anotação por polígono | Delimitação de áreas de interesse |
| Régua de medição | Distância calculada via GSD |
| ROI (Region of Interest) | Análise em sub-região da imagem |
| Exportação GeoJSON | Shapefile compatível com QGIS/ArcGIS |
| UTM Converter | Conversão de coordenadas geográficas |

---

## Arquitetura

```
┌──────────────────────────────────────────────────────────┐
│                   FRONTEND  (Next.js 14)                  │
│  Dashboard · Upload · MapView · Análise · Relatórios      │
│  Componentes: 20+ · Dark mode · Responsivo · PWA-ready    │
└─────────────────────────┬────────────────────────────────┘
                          │  REST API (JWT)
                          ▼
┌──────────────────────────────────────────────────────────┐
│                   BACKEND  (FastAPI)                       │
│  60 endpoints · Auth JWT/Argon2 · Pydantic v2             │
│  Celery (async tasks) · SQLAlchemy 2.0 (async)            │
└──────┬────────────────────────────────────────┬──────────┘
       │                                        │
       ▼                                        ▼
┌──────────────────┐    ┌───────────┐    ┌──────────────────┐
│ IMAGE PROCESSING │    │    ML     │    │      DATA        │
│ · Rasterio       │    │ · YOLOv8  │    │ · PostgreSQL     │
│ · OpenCV         │    │ · DeepLab │    │ · PostGIS        │
│ · GeoPandas      │    │ · ResNet  │    │ · SQLite (dev)   │
│ · Shapely        │    │ · PyTorch │    │ · Redis (cache)  │
│ · rio-tiler      │    │ · SciPy   │    └──────────────────┘
└──────────────────┘    └───────────┘
       │                      │
       └──────────┬───────────┘
                  ▼
┌──────────────────────────────────────────────────────────┐
│              EXTERNAL APIs  (gratuitas, sem chave)        │
│  Open-Meteo · SoilGrids · OpenTopoData · Nominatim        │
└──────────────────────────────────────────────────────────┘
```

---

## Stack Tecnológica

### Frontend

| Tecnologia | Versão | Uso |
|------------|--------|-----|
| [Next.js](https://nextjs.org/) | 14+ | Framework React (App Router) |
| [TypeScript](https://www.typescriptlang.org/) | 5+ | Tipagem estática |
| [TailwindCSS](https://tailwindcss.com/) | 3+ | Estilização utility-first |
| [Recharts](https://recharts.org/) | 2+ | Gráficos (donut, área, bar, gauge) |
| [Leaflet](https://leafletjs.com/) | 1.9+ | Mapas interativos |
| [Lucide React](https://lucide.dev/) | — | Biblioteca de ícones |

### Backend

| Tecnologia | Versão | Uso |
|------------|--------|-----|
| [FastAPI](https://fastapi.tiangolo.com/) | 0.109+ | API REST assíncrona |
| [SQLAlchemy](https://www.sqlalchemy.org/) | 2.0+ | ORM async |
| [Pydantic](https://docs.pydantic.dev/) | v2 | Validação de dados |
| [Celery](https://docs.celeryq.dev/) | 5.3+ | Fila de tarefas assíncronas |
| [Redis](https://redis.io/) | — | Broker Celery + cache |
| [Argon2](https://github.com/hynek/argon2-cffi) | — | Hash de senhas |
| [python-jose](https://github.com/mpdavis/python-jose) | — | JWT |

### Processamento Geoespacial

| Tecnologia | Uso |
|------------|-----|
| [Rasterio](https://rasterio.readthedocs.io/) | Leitura/escrita GeoTIFF, CRS, bounds |
| [GeoPandas](https://geopandas.org/) | Dados vetoriais, projeções |
| [Shapely](https://shapely.readthedocs.io/) | Geometrias e operações espaciais |
| [PyProj](https://pyproj4.github.io/pyproj/) | Transformação de coordenadas |
| [rio-tiler](https://cogeotiff.github.io/rio-tiler/) | Tileamento de rasters |
| [GeoAlchemy2](https://geoalchemy-2.readthedocs.io/) | Tipos PostGIS no SQLAlchemy |

### Machine Learning

| Tecnologia | Uso |
|------------|-----|
| [PyTorch](https://pytorch.org/) | Deep learning (CPU + GPU) |
| [Ultralytics YOLOv8](https://ultralytics.com/) | Detecção de objetos |
| [segmentation-models-pytorch](https://github.com/qubvel/segmentation_models.pytorch) | DeepLabV3, U-Net |
| [Albumentations](https://albumentations.ai/) | Augmentação de dados |
| [OpenCV](https://opencv.org/) | Processamento de imagens e vídeos |
| [NumPy](https://numpy.org/) / [SciPy](https://scipy.org/) | Computação científica |

---

## Estrutura do Projeto

```
roboroca/
│
├── backend/
│   ├── api/
│   │   ├── routes/
│   │   │   ├── auth.py          # Autenticação, perfil, senha
│   │   │   ├── projects.py      # CRUD + análise ML por projeto
│   │   │   ├── images.py        # Upload, metadados, thumbnails, GSD
│   │   │   ├── analysis.py      # 19 endpoints de análise ML
│   │   │   ├── annotations.py   # Anotações geoespaciais
│   │   │   └── health.py        # Healthcheck
│   │   ├── schemas/             # Schemas Pydantic (request/response)
│   │   └── dependencies/        # Auth, DB injection
│   │
│   ├── core/
│   │   ├── config.py            # Settings (Pydantic BaseSettings)
│   │   ├── database.py          # Engine async, sessões
│   │   └── security.py          # JWT, hash de senhas
│   │
│   ├── models/                  # Modelos SQLAlchemy
│   │   ├── user.py
│   │   ├── project.py
│   │   ├── image.py
│   │   ├── analysis.py
│   │   └── annotation.py
│   │
│   ├── services/
│   │   ├── image_processing/    # ExG, saúde, heatmap, máscara, ROI
│   │   ├── ml/                  # YOLO, DeepLab, ResNet, tree counter,
│   │   │                        #   biomassa, pragas, features, vídeo
│   │   ├── geo/                 # UTM converter, clustering GPS
│   │   ├── external/            # Open-Meteo, SoilGrids, OpenTopo, Nominatim
│   │   └── report_generation/   # PDF (ReportLab + Jinja2)
│   │
│   ├── tasks/                   # Celery tasks assíncronas
│   └── main.py                  # Ponto de entrada FastAPI
│
├── frontend/
│   └── src/
│       ├── app/                 # Next.js App Router (layout, page, reset-password)
│       └── components/
│           ├── AuthScreen.tsx         # Login / Registro / Reset de senha
│           ├── Dashboard/             # Cards, gráficos, comparativo entre projetos
│           ├── UploadZone.tsx         # Drag-and-drop multi-imagem + vídeo
│           ├── ProjectsList.tsx       # Lista com métricas por fazenda
│           ├── ProjectProfile/        # Perfil (Overview · Mapa · Análise · Relatório)
│           ├── ImageAnalysisPanel.tsx # 8 análises ML por imagem
│           ├── MapView/              # Canvas georreferenciado (8 sub-componentes)
│           ├── map/
│           │   ├── CompassRose.tsx    # Rosa dos ventos
│           │   ├── CoordinateGrid.tsx # Grade de coordenadas
│           │   ├── LegendPanel.tsx    # Legenda dinâmica
│           │   ├── ScaleBar.tsx       # Escala gráfica
│           │   └── ViewModeCarousel.tsx # Alternância de camadas
│           ├── Charts.tsx             # Donut, Bar, Area, Line, Gauge, HorizontalBar
│           ├── ProjectComparison.tsx  # Tabela comparativa entre projetos
│           ├── SettingsPage.tsx       # Perfil, senha, notificações, tema
│           └── NotificationContext.tsx # Centro de notificações
│
├── ml_models/                   # Pesos dos modelos treinados
├── notebooks/                   # Jupyter notebooks de pesquisa
├── tests/                       # 77 testes automatizados (pytest)
├── docs/                        # Documentação adicional
├── docker/                      # Dockerfiles (backend, frontend, nginx)
├── docker-compose.yml           # Ambiente de desenvolvimento
├── docker-compose.prod.yml      # Ambiente de produção
├── pyproject.toml               # Config Python (ruff, black, mypy, pytest)
└── requirements.txt             # Dependências Python
```

---

## Instalação

### Pré-requisitos

- **Python** 3.11+
- **Node.js** 18+
- **Git**
- *(Opcional)* Docker 24+ e Docker Compose v2

### 1. Clonar o Repositório

```bash
git clone https://github.com/ciroschultz/Roboroca.git
cd Roboroca
```

### 2. Backend

```bash
# Criar e ativar ambiente virtual
python -m venv venv

# Windows
venv\Scripts\activate

# Linux / macOS
source venv/bin/activate

# Instalar dependências
pip install -r requirements.txt

# Copiar e configurar variáveis de ambiente
cp .env.example .env
# Edite o .env com suas configurações (SECRET_KEY, DATABASE_URL, etc.)

# Iniciar servidor de desenvolvimento
uvicorn backend.main:app --reload --port 8000
```

### 3. Frontend

```bash
cd frontend

# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

### 4. Acessar

| Serviço | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| API Swagger | http://localhost:8000/api/v1/docs |
| API ReDoc | http://localhost:8000/api/v1/redoc |

---

## Uso

### Fluxo Principal

```
1. Login / Cadastro
       ↓
2. Upload de imagens (drone RGB, GeoTIFF, vídeo MP4)
       ↓
3. Processamento automático → criação de projeto
       ↓
4. Dashboard → visão agregada de todos os projetos
       ↓
5. Perfil do Projeto → 4 abas:
   ├── Visão Geral   → cards de métricas, timeline, alertas, dados ambientais
   ├── Mapa          → canvas georreferenciado com anotações e sobreposições
   ├── Análise       → 8 análises ML por imagem individual
   └── Relatório     → exportar PDF profissional
```

### Análise por Imagem

Na aba **Análise** do perfil de projeto, selecione uma imagem e execute:

| Botão | Análise | Output |
|-------|---------|--------|
| Vegetação | ExG Index | % cobertura + histograma |
| Saúde | Análise espectral | Score 0–100 + distribuição |
| Cores | Histograma RGB | Perfil colorimétrico |
| Uso do Solo | ResNet-18 | Classe + confiança |
| YOLO | YOLOv8 | Objetos detectados + bboxes |
| Features | Extração de características | Textura, padrões, estatísticas |
| ML Completo | Pipeline completo | Todas as análises juntas |
| Relatório | Sumário combinado | JSON + base para PDF |

### Sobreposições de Mapa

Alterne entre as camadas no **MapView**:
- **Original** — imagem sem processamento
- **Heatmap** — gradiente de densidade vegetal
- **Máscara** — segmentação binária de vegetação

### Exportação

- **GeoJSON** — anotações compatíveis com QGIS, ArcGIS, Google Earth
- **PDF** — relatório completo com métricas, gráficos e mapas

---

## API Reference

A documentação interativa completa está disponível em `/api/v1/docs` (Swagger UI) e `/api/v1/redoc`.

### Autenticação — 8 endpoints

```
POST   /v1/auth/register              → Criar conta
POST   /v1/auth/login                 → Login (retorna JWT)
GET    /v1/auth/me                    → Dados do usuário autenticado
PUT    /v1/auth/me                    → Atualizar perfil
PUT    /v1/auth/preferences           → Atualizar preferências
POST   /v1/auth/password/change       → Trocar senha
POST   /v1/auth/password/reset-request → Solicitar reset por email
POST   /v1/auth/password/reset-confirm → Confirmar reset com token
```

### Projetos — 12 endpoints

```
GET    /v1/projects/                  → Listar projetos do usuário
POST   /v1/projects/                  → Criar projeto
GET    /v1/projects/{id}              → Detalhes do projeto
PUT    /v1/projects/{id}              → Editar projeto
DELETE /v1/projects/{id}              → Excluir projeto
POST   /v1/projects/{id}/analyze      → Executar análise ML do projeto
GET    /v1/projects/{id}/analysis-summary → Resumo agregado das análises
GET    /v1/projects/{id}/timeline     → Evolução temporal (por semana)
GET    /v1/projects/{id}/alerts       → Alertas de saúde vegetal
GET    /v1/projects/{id}/enriched-data → Clima, solo, elevação, endereço
GET    /v1/projects/stats             → Estatísticas do dashboard
GET    /v1/projects/comparison        → Comparativo entre projetos
```

### Imagens — 10 endpoints

```
GET    /v1/images/                    → Listar imagens
POST   /v1/images/upload              → Upload único
POST   /v1/images/upload-multiple     → Upload em lote
GET    /v1/images/{id}                → Detalhes da imagem
GET    /v1/images/{id}/thumbnail      → Thumbnail gerado
GET    /v1/images/{id}/file           → Arquivo original
GET    /v1/images/{id}/metadata       → Metadados EXIF + geoespaciais
GET    /v1/images/{id}/gsd            → Resolução espacial (m/px)
GET    /v1/images/clusters/by-project → Clusters GPS por projeto
DELETE /v1/images/{id}                → Excluir imagem
```

### Análises ML — 19 endpoints

```
GET    /v1/analysis/                  → Listar análises
GET    /v1/analysis/{id}              → Detalhe de análise
POST   /v1/analysis/vegetation/{id}   → Cobertura vegetal (ExG)
POST   /v1/analysis/plant-health/{id} → Saúde das plantas
POST   /v1/analysis/colors/{id}       → Distribuição de cores
POST   /v1/analysis/report/{id}       → Relatório combinado
POST   /v1/analysis/heatmap/{id}      → Heatmap (retorna imagem)
POST   /v1/analysis/mask/{id}         → Máscara de vegetação (retorna imagem)
POST   /v1/analysis/ndvi/{id}         → NDVI proxy (ExG)
POST   /v1/analysis/classify/{id}     → Classificação de uso do solo
POST   /v1/analysis/plant-count/{id}  → Contagem de árvores
POST   /v1/analysis/detect/{id}       → Detecção de objetos (YOLO)
POST   /v1/analysis/features/{id}     → Extração de features visuais
POST   /v1/analysis/full/{id}         → Pipeline ML completo
POST   /v1/analysis/video/{id}        → Análise de vídeo
POST   /v1/analysis/video/{id}/keyframes → Extração de keyframes
GET    /v1/analysis/video/{id}/mosaic → Mosaico de frames do vídeo
GET    /v1/analysis/export/pdf/{id}   → Exportar PDF do projeto
DELETE /v1/analysis/{id}              → Excluir análise
```

### Anotações — 6 endpoints

```
GET    /v1/annotations/{image_id}     → Listar anotações de uma imagem
POST   /v1/annotations/{image_id}     → Criar anotação (ponto/polígono/medida)
PUT    /v1/annotations/{id}           → Editar anotação
DELETE /v1/annotations/{id}           → Excluir anotação
GET    /v1/annotations/{image_id}/export/geojson → Exportar GeoJSON
DELETE /v1/annotations/{image_id}/all → Limpar todas as anotações
```

> **Total: 65+ endpoints** · Autenticação via Bearer Token (JWT) ou API Key (`X-API-Key`) · Documentação interativa em `/api/v1/docs`

---

## Modelos de ML

| Modelo | Framework | Tarefa | Arquivo |
|--------|-----------|--------|---------|
| YOLOv8n | Ultralytics | Detecção de objetos com bounding boxes | `services/ml/detector.py` |
| DeepLabV3 (ResNet-101) | PyTorch/torchvision | Segmentação semântica pixel a pixel | `services/ml/segmenter.py` |
| ResNet-18 | PyTorch/torchvision | Classificação de cena / uso do solo | `services/ml/classifier.py` |
| Tree Counter | NumPy + morfologia | Contagem de árvores e estimativa de densidade | `services/ml/tree_counter.py` |
| Biomass Estimator | Regressão espectral | Estimativa de biomassa seca | `services/ml/biomass_estimator.py` |
| Pest Detector | Análise de anomalias | Detecção de pragas e áreas afetadas | `services/ml/pest_detector.py` |
| Feature Extractor | SciPy + NumPy | Textura, cor, padrões visuais | `services/ml/feature_extractor.py` |
| Video Analyzer | OpenCV + pipeline | Análise temporal de vídeos | `services/ml/video_analyzer.py` |

Todos os modelos rodam em **CPU** por padrão (sem necessidade de GPU). Para habilitar CUDA, altere `torch.device` nas configurações.

---

## Integrações Externas

Todas as APIs externas são **gratuitas** e **sem autenticação**. Os resultados são **cacheados no banco de dados** como análises do tipo `enriched_data`.

| Serviço | Endpoint | Dados Fornecidos |
|---------|----------|-----------------|
| [Open-Meteo](https://open-meteo.com/) | `open-meteo.com/v1/forecast` | Temperatura, umidade, vento, precipitação |
| [SoilGrids](https://www.isric.org/explore/soilgrids) | `rest.isric.org/ogc/wcs` | pH, argila, areia, carbono orgânico, nitrogênio |
| [Open Topo Data](https://www.opentopodata.org/) | `api.opentopodata.org/v1` | Altitude (m) + classificação de terreno |
| [Nominatim](https://nominatim.openstreetmap.org/) | `nominatim.openstreetmap.org/reverse` | Endereço por coordenada GPS |

---

## Testes

O projeto conta com **228 testes automatizados** (119 backend + 68 frontend + 41 E2E).

```bash
# Backend (119 testes)
python -m pytest backend/tests/ -x -q

# Frontend (68 testes)
cd frontend && npx jest

# E2E funcional (41 testes — requer backend rodando)
python run_full_test.py

# Criar usuario de teste: flavio@gmail.com / flavio123
python create_test_user.py
```

---

## Docker

### Desenvolvimento

```bash
# Subir todos os serviços (backend, frontend, PostgreSQL, Redis)
docker compose up --build

# Apenas o backend e dependências
docker compose up backend db redis
```

### Produção (Multi-Projeto)

```bash
# Configurar .env (DOMAIN, POSTGRES_PASSWORD, SECRET_KEY)
docker compose -f docker-compose.prod.yml up -d --build

# SSL (primeiro deploy)
docker compose -f docker-compose.prod.yml run certbot \
  certonly --webroot -w /var/www/certbot \
  -d roboroca.com -d "*.roboroca.com"
```

### Serviços (10 containers)

| Container | Porta | Subdomain |
|-----------|-------|-----------|
| `roboroca-nginx` | 80, 443 | Reverse proxy + SSL |
| `roboroca-backend` | 8000 | `api.roboroca.com` |
| `roboroca-frontend` | 3000 | `aerial.roboroca.com` |
| `roboroca-home` | 3000 | `roboroca.com` |
| `roboroca-calculator` | 3000 | `calc.roboroca.com` |
| `roboroca-precision` | 3000 | `precision.roboroca.com` |
| `roboroca-equipment` | 3000 | `equipment.roboroca.com` |
| `roboroca-spectral` | 3000 | `spectral.roboroca.com` |
| `roboroca-db` | 5432 | PostgreSQL + PostGIS |
| `roboroca-certbot` | — | Let's Encrypt auto-renewal |

---

## Modelo de Dados

```
User
 ├── id, email, username, full_name, phone, bio, company
 ├── language, theme, is_active, plan
 └── projects[] (1:N)

Project
 ├── id, name, description, status
 ├── location, latitude, longitude, total_area_ha
 ├── owner_id (FK → User)
 └── images[] (1:N)

Image
 ├── id, filename, file_path, file_size, mime_type
 ├── width, height, center_lat, center_lon, capture_date
 ├── crs, bounds, resolution, bands, source
 ├── project_id (FK → Project)
 └── analyses[] (1:N), annotations[] (1:N)

Analysis
 ├── id, analysis_type, status, error_message
 ├── results (JSON), config (JSON), output_files
 ├── processing_time_seconds
 └── image_id (FK → Image)

Annotation
 ├── id, annotation_type (point | polygon | measurement | circle | rectangle)
 ├── data (JSON — coordenadas, propriedades)
 ├── image_id (FK → Image), created_by (FK → User)
 └── created_at, updated_at
```

---

## Roadmap

| Fase | Descrição | Status |
|------|-----------|--------|
| 1 | Estabilização — NDVI, contagem de plantas, PDF, anotações | ✅ Concluída |
| 2 | Qualidade — 77 testes, loading states, tratamento de erros | ✅ Concluída |
| 3 | Dashboard — estatísticas reais, comparativo entre projetos | ✅ Concluída |
| 4 | Timeline, Settings, recuperação de senha | ✅ Concluída |
| 5 | Export GeoJSON, alertas, Docker, CI/CD inicial | ✅ Concluída |
| 6 | UX polish, notificações, dark mode, relatórios redesenhados | ✅ Concluída |
| 7 | ROI, UTM converter, componentes profissionais de mapa | ✅ Concluída |
| 8 | Detecção de pragas e doenças (ML) | ✅ Concluída |
| 9 | Cálculo de biomassa (ML) | ✅ Concluída |
| 10 | Modo offline / PWA (parcial) | ✅ Service worker instalado |
| 11 | Deploy produção (Docker multi-projeto) | ✅ Concluída |
| 12 | WebSocket, i18n (3 idiomas), mobile CSS | ✅ Concluída |
| A-J | Comparação, GPS, GIS, ROI, Confidence, UX, Dashboard, Video | ✅ Concluídas |
| Audit | Security hardening, API keys, JWT blacklist, refactoring | ✅ Concluída |

---

## Contribuindo

Contribuições são bem-vindas! Veja [CONTRIBUTING.md](CONTRIBUTING.md) para o guia completo de setup, padrões de código e fluxo de PR.

**Resumo rápido:**

```bash
# 1. Fork → clone
git clone https://github.com/seu-usuario/Roboroca.git

# 2. Criar branch
git checkout -b feat/nome-da-feature

# 3. Commit (Conventional Commits)
git commit -m "feat: adiciona análise de biomassa por satélite"

# 4. Push e abrir Pull Request
git push origin feat/nome-da-feature
```

Tipos de commit aceitos: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

---

## Licença

Distribuído sob a licença **MIT**. Veja [LICENSE](LICENSE) para mais detalhes.

---

<div align="center">

**Roboroça** · Transformando imagens em inteligência agrícola

[Reportar Bug](https://github.com/ciroschultz/Roboroca/issues) · [Solicitar Feature](https://github.com/ciroschultz/Roboroca/issues)

</div>
