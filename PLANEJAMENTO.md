# Roboroça - Planejamento do Projeto

## 1. Visão Geral

**Roboroça** é um sistema inteligente de análise de imagens aéreas para agricultura. O objetivo é transformar imagens de drone e satélite em relatórios completos e acionáveis para produtores rurais.

### Objetivo Principal
Ao carregar imagens de drone ou satélite, o sistema deve gerar automaticamente um relatório completo sobre a propriedade, incluindo todas as informações possíveis extraídas das imagens.

---

## 2. Funcionalidades do Sistema

### 2.1 Análises Disponíveis

| Análise | Descrição | Output |
|---------|-----------|--------|
| **Contagem de Plantas** | Detecta e conta plantas individuais | Quantidade total, plantas/hectare |
| **Estado das Plantas** | Classifica saúde das plantas | Saudável, estressada, crítica (%) |
| **Área Total** | Calcula área da região analisada | Hectares |
| **Área Agriculturável** | Identifica áreas próprias para cultivo | Hectares, mapa |
| **Estimativa de Altura** | Altura média da vegetação | Metros, mapa de altura |
| **Análise de Solo** | Identifica áreas com deficiências | Recomendações de correção |
| **Índices de Vegetação** | NDVI, NDWI, EVI, SAVI | Mapas de calor, estatísticas |
| **Classificação de Uso** | Floresta, pasto, agricultura, etc. | Mapa classificado, áreas por classe |
| **Qualidade da Produção** | Estimativa de produtividade | Score, áreas problemáticas |

### 2.2 Tipos de Imagem Suportados
- Imagens de drone (DJI, etc.)
- Imagens de satélite (Sentinel-2, Landsat)
- Formatos: GeoTIFF, TIFF, JPEG, PNG

---

## 3. Arquitetura Técnica

### 3.1 Stack Tecnológico

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND                                │
│  Next.js + MapLibre GL + TailwindCSS                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      BACKEND API                             │
│  FastAPI + Celery (processamento assíncrono)                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  PROCESSAMENTO DE IMAGENS                    │
│  Rasterio + GeoPandas + OpenCV + NumPy                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    MACHINE LEARNING                          │
│  PyTorch + Segmentation Models + YOLO                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      BANCO DE DADOS                          │
│  PostgreSQL + PostGIS (dados geoespaciais)                  │
│  SQLite (desenvolvimento local)                              │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Modelos de Machine Learning

| Modelo | Uso | Biblioteca |
|--------|-----|------------|
| **U-Net** | Segmentação semântica (uso do solo) | segmentation-models-pytorch |
| **DeepLabV3+** | Segmentação precisa de bordas | segmentation-models-pytorch |
| **YOLOv8** | Detecção de plantas individuais | ultralytics |
| **SegFormer** | Classificação avançada | transformers |

### 3.3 Datasets para Treinamento

| Dataset | Uso |
|---------|-----|
| **EuroSAT** | Classificação de uso do solo |
| **PASTIS** | Segmentação agrícola |
| **UC Merced** | Uso do solo aéreo |
| **Fields of The World** | Limites de campos |

---

## 4. Bibliotecas Python

### Processamento Geoespacial
```python
rasterio        # Leitura de GeoTIFF
geopandas       # Dados vetoriais
shapely         # Geometrias
pyproj          # Projeções
rio-tiler       # Tiles web
```

### Machine Learning
```python
torch           # Deep learning
segmentation_models_pytorch  # U-Net, DeepLab
ultralytics     # YOLOv8
albumentations  # Augmentação
```

### Índices de Vegetação
```python
# NDVI (Normalized Difference Vegetation Index)
ndvi = (nir - red) / (nir + red)

# NDWI (Normalized Difference Water Index)
ndwi = (green - nir) / (green + nir)

# EVI (Enhanced Vegetation Index)
evi = 2.5 * ((nir - red) / (nir + 6*red - 7.5*blue + 1))

# SAVI (Soil Adjusted Vegetation Index)
savi = ((nir - red) / (nir + red + L)) * (1 + L)  # L = 0.5
```

---

## 5. Fluxo de Processamento

```
1. UPLOAD
   └── Usuário envia imagem de drone/satélite

2. PRÉ-PROCESSAMENTO
   ├── Extração de metadados (coordenadas, resolução)
   ├── Correção radiométrica
   ├── Normalização
   └── Geração de tiles

3. ANÁLISE BÁSICA
   ├── Cálculo de índices (NDVI, NDWI, etc.)
   ├── Geração de mapas de calor
   └── Estatísticas básicas

4. MACHINE LEARNING
   ├── Classificação de uso do solo
   ├── Detecção de plantas
   ├── Análise de saúde
   └── Estimativa de altura

5. PÓS-PROCESSAMENTO
   ├── Vetorização de resultados
   ├── Cálculo de áreas
   └── Geração de recomendações

6. RELATÓRIO
   ├── Compilação de resultados
   ├── Geração de PDF
   └── Exportação de dados
```

---

## 6. Estrutura de Relatório

O relatório final gerado pelo sistema inclui:

### Seção 1: Informações Gerais
- Nome do projeto/propriedade
- Data da imagem
- Área total analisada

### Seção 2: Uso do Solo
- Mapa de classificação
- Tabela de áreas por classe
- Gráfico de distribuição

### Seção 3: Vegetação
- Mapa NDVI
- Estatísticas (min, max, média)
- Áreas de atenção

### Seção 4: Plantas
- Contagem total
- Densidade por hectare
- Estado de saúde

### Seção 5: Recomendações
- Áreas que precisam de atenção
- Sugestões de correção de solo
- Previsão de produtividade

---

## 7. Referências e Recursos

### Repositórios Úteis
- [satellite-image-deep-learning/techniques](https://github.com/satellite-image-deep-learning/techniques)
- [Awesome-Precision-Agriculture](https://github.com/px39n/Awesome-Precision-Agriculture)
- [segmentation_models.pytorch](https://github.com/qubvel/segmentation_models.pytorch)
- [ultralytics/yolov8](https://github.com/ultralytics/ultralytics)

### Documentação
- [Rasterio](https://rasterio.readthedocs.io/)
- [GeoPandas](https://geopandas.org/)
- [torchgeo](https://torchgeo.readthedocs.io/)

---

*Documento atualizado em: Janeiro 2026*
*Projeto: Roboroça - Sistema Inteligente de Análise Agrícola*
