# Roboroça

**Sistema Inteligente de Análise de Imagens Aéreas para Agricultura**

O Roboroça é uma plataforma que utiliza inteligência artificial para analisar imagens de drone e satélite, gerando relatórios completos sobre propriedades rurais.

---

## O que o Roboroça faz?

Ao carregar imagens de drone ou satélite, o sistema gera automaticamente um relatório completo contendo:

- **Contagem de Plantas** - Quantidade total de plantas na área
- **Estado das Plantas** - Classificação de saúde (saudável, estressada, crítica)
- **Área Total** - Cálculo preciso em hectares
- **Área Agriculturável** - Identificação de áreas próprias para cultivo
- **Estimativa de Altura** - Altura média das plantas/vegetação
- **Análise de Solo** - Recomendações para correção
- **Índices de Vegetação** - NDVI, NDWI, EVI, SAVI
- **Classificação de Uso do Solo** - Floresta, pasto, agricultura, água, etc.
- **Qualidade da Produção** - Estimativas de produtividade

---

## Tecnologias

### Backend
- **FastAPI** - Framework web assíncrono
- **PostgreSQL + PostGIS** - Banco de dados com suporte geoespacial
- **Celery + Redis** - Processamento assíncrono de tarefas
- **SQLAlchemy** - ORM para banco de dados

### Processamento de Imagens
- **Rasterio** - Leitura de imagens georreferenciadas
- **GeoPandas** - Manipulação de dados geoespaciais
- **OpenCV** - Processamento de imagens
- **NumPy** - Computação numérica

### Machine Learning
- **PyTorch** - Framework de deep learning
- **Segmentation Models PyTorch** - Modelos de segmentação (U-Net, DeepLab)
- **Ultralytics** - YOLOv8 para detecção de objetos
- **Albumentations** - Augmentação de dados

### Frontend (em desenvolvimento)
- **Next.js** - Framework React
- **MapLibre GL** - Visualização de mapas
- **TailwindCSS** - Estilização

---

## Instalação

### Requisitos
- Python 3.11+
- Git

### Configuração Local

```bash
# Clonar o repositório
git clone https://github.com/seu-usuario/roboroca.git
cd roboroca

# Criar ambiente virtual
python -m venv venv

# Ativar ambiente (Windows)
venv\Scripts\activate

# Ativar ambiente (Linux/Mac)
source venv/bin/activate

# Instalar dependências
pip install -r requirements.txt

# Copiar arquivo de configuração
cp .env.example .env

# Iniciar servidor de desenvolvimento
uvicorn backend.main:app --reload
```

### Acessar a API
- Documentação Swagger: http://localhost:8000/api/v1/docs
- Documentação ReDoc: http://localhost:8000/api/v1/redoc

---

## Estrutura do Projeto

```
roboroca/
├── backend/
│   ├── api/                    # Endpoints da API
│   │   ├── routes/             # Rotas (auth, projects, images, analysis)
│   │   ├── schemas/            # Schemas Pydantic
│   │   └── dependencies/       # Dependencies (autenticação)
│   ├── core/                   # Configurações e segurança
│   ├── models/                 # Modelos SQLAlchemy
│   ├── services/               # Lógica de negócio
│   │   ├── image_processing/   # Processamento de imagens
│   │   ├── ml/                 # Machine Learning
│   │   └── analysis/           # Análises e índices
│   ├── tasks/                  # Tarefas Celery
│   └── utils/                  # Utilitários
├── frontend/                   # React/Next.js (em desenvolvimento)
├── ml_models/                  # Modelos treinados
├── notebooks/                  # Jupyter notebooks
├── tests/                      # Testes automatizados
├── docker/                     # Dockerfiles
├── docs/                       # Documentação
├── scripts/                    # Scripts auxiliares
├── data/                       # Dados de treinamento
├── docker-compose.yml
├── requirements.txt
├── pyproject.toml
└── README.md
```

---

## API Endpoints

### Autenticação
- `POST /api/v1/auth/register` - Registrar usuário
- `POST /api/v1/auth/login` - Login (retorna JWT)
- `GET /api/v1/auth/me` - Dados do usuário atual

### Projetos
- `GET /api/v1/projects/` - Listar projetos
- `POST /api/v1/projects/` - Criar projeto
- `GET /api/v1/projects/{id}` - Detalhes do projeto
- `DELETE /api/v1/projects/{id}` - Excluir projeto

### Imagens
- `POST /api/v1/images/upload` - Upload de imagem
- `GET /api/v1/images/` - Listar imagens
- `GET /api/v1/images/{id}/metadata` - Metadados da imagem

### Análises
- `POST /api/v1/analysis/ndvi/{image_id}` - Calcular NDVI
- `POST /api/v1/analysis/classify/{image_id}` - Classificar uso do solo
- `POST /api/v1/analysis/plant-count/{image_id}` - Contar plantas
- `POST /api/v1/analysis/plant-health/{image_id}` - Análise de saúde
- `POST /api/v1/analysis/height-estimation/{image_id}` - Estimativa de altura
- `POST /api/v1/analysis/soil-analysis/{image_id}` - Análise de solo
- `POST /api/v1/analysis/report/{image_id}` - Gerar relatório completo

---

## Roadmap

### Fase 1 - Backend Foundation ✅
- [x] API FastAPI configurada
- [x] Sistema de autenticação JWT
- [x] Modelos de banco de dados
- [x] Upload de imagens

### Fase 2 - Processamento de Imagens (em andamento)
- [ ] Pipeline de pré-processamento
- [ ] Cálculo de índices de vegetação (NDVI, NDWI, EVI)
- [ ] Geração de tiles para visualização

### Fase 3 - Machine Learning
- [ ] Modelo de segmentação (U-Net)
- [ ] Detecção de plantas (YOLO)
- [ ] Análise de saúde das plantas
- [ ] Estimativa de altura

### Fase 4 - Frontend
- [ ] Interface de mapa interativo
- [ ] Dashboard de projetos
- [ ] Visualização de resultados

### Fase 5 - Relatórios
- [ ] Geração de PDF
- [ ] Exportação de dados

---

## Licença

MIT License

---

*Roboroça - Transformando imagens em inteligência agrícola*
