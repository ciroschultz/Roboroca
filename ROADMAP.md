# Roboroça - Roadmap de Desenvolvimento

## Visão Geral

**Objetivo**: Sistema multiplataforma (mobile/web/desktop) de análise de imagens de drone/satélite que gera relatórios completos sobre propriedades rurais.

**MVP**: Upload de imagens → Processamento automático → Projeto criado → Relatório completo

---

## Status Atual: v0.2.0-beta

### Concluído
- [x] Estrutura do projeto
- [x] Backend FastAPI base
- [x] Sistema de autenticação JWT
- [x] Modelos de banco de dados
- [x] Frontend Next.js com interface completa
- [x] Dashboard com gráficos (Recharts)
- [x] Sistema de Upload (UI)
- [x] Visualização de Mapa (UI)
- [x] Perfil do Projeto (UI)

### Em Desenvolvimento
- [ ] Conectar frontend ao backend
- [ ] Processamento real de imagens

---

## FASE 1: Interface do Usuário ✅ COMPLETA

### 1.1 Dashboard
- [x] Layout estilo Power BI/ArcGIS
- [x] Cards de estatísticas agregadas
- [x] Gráficos de pizza (donut)
- [x] Gráficos de barras e linhas
- [x] Estado vazio para novos usuários
- [x] Lista de projetos recentes
- [ ] **Alertas de projetos críticos** (destacar visualmente)
- [ ] **Botões de acesso rápido** aos projetos

### 1.2 Upload de Imagens
- [x] Seleção Drone/Satélite
- [x] Drag & drop de arquivos
- [x] Preview de imagens
- [x] Barra de progresso
- [ ] **Suporte a múltiplas imagens** (mesma área)
- [ ] **Suporte a vídeo** (drone)
- [ ] **Combinação vídeo + fotos**
- [ ] Nome do projeto personalizado

### 1.3 Meus Projetos
- [x] Lista em Grid e Lista
- [x] Filtros por status
- [x] Busca por nome
- [x] Cards com thumbnail
- [ ] Ordenação por data/nome/área

### 1.4 Perfil do Projeto
- [x] Header com informações
- [x] Abas (Visão Geral, Mapa, Relatório)
- [x] Cards de métricas
- [x] Gráficos específicos
- [x] Alertas e recomendações
- [ ] Histórico de análises
- [ ] Editar nome do projeto
- [ ] Adicionar mais imagens

### 1.5 Visualizar Mapa
- [x] Área de visualização
- [x] Painel de camadas
- [x] Controles de zoom
- [x] Legenda NDVI
- [ ] **MODO 1: Ver projeto existente** (imagem real)
- [ ] **MODO 2: GPS em tempo real** (diferencial!)
- [ ] Ferramentas de medição
- [ ] Desenhar polígono

---

## FASE 2: Lapidar Interface (ATUAL)

### 2.1 Dashboard - Melhorias
- [ ] Alertas visuais para projetos críticos (badge vermelho)
- [ ] Card de acesso rápido ao último projeto
- [ ] Notificações de processamento concluído
- [ ] Gráfico de evolução temporal (se houver múltiplos projetos)

### 2.2 Upload - Melhorias
- [ ] Campo para nome do projeto
- [ ] Seleção de múltiplos arquivos de uma vez
- [ ] Detecção automática se é foto ou vídeo
- [ ] Preview em grid das imagens selecionadas
- [ ] Estimativa de tempo de processamento
- [ ] Validação de formatos suportados

### 2.3 Mapa - Implementar Modos
- [ ] **Modo 1**: Carregar imagem do projeto
  - Exibir imagem georreferenciada
  - Sobrepor camadas de análise
  - Mostrar marcadores de detecção
- [ ] **Modo 2**: GPS em tempo real
  - Obter localização do dispositivo
  - Buscar imagem de satélite (Sentinel/Landsat)
  - Definir área de interesse
  - Análise instantânea
  - Botão "Criar Projeto"

### 2.4 Relatório PDF
- [ ] Template profissional
- [ ] Incluir logo Roboroça
- [ ] Seções organizadas
- [ ] Gráficos renderizados
- [ ] Mapa thumbnail
- [ ] Recomendações

---

## FASE 3: Processamento de Imagens

### 3.1 Pipeline de Pré-processamento
- [ ] Leitura com Rasterio (GeoTIFF, TIFF)
- [ ] Leitura com OpenCV (JPEG, PNG)
- [ ] Extração de frames de vídeo
- [ ] Detecção de metadados (GPS, resolução)
- [ ] Normalização de valores
- [ ] Merge de múltiplas imagens

### 3.2 Cálculo de Índices
```python
NDVI = (NIR - Red) / (NIR + Red)
NDWI = (Green - NIR) / (Green + NIR)
EVI = 2.5 * ((NIR - Red) / (NIR + 6*Red - 7.5*Blue + 1))
SAVI = ((NIR - Red) / (NIR + Red + L)) * (1 + L)
```
- [ ] NDVI (vegetação)
- [ ] NDWI (água)
- [ ] EVI (vegetação melhorado)
- [ ] SAVI (solo ajustado)
- [ ] Geração de mapas de calor
- [ ] Estatísticas (min, max, média, desvio)

### 3.3 Geração de Tiles
- [ ] Criar tiles XYZ para web
- [ ] Cloud Optimized GeoTIFF (COG)
- [ ] API para servir tiles

---

## FASE 4: Machine Learning

### 4.1 Classificação de Uso do Solo
- [ ] Modelo U-Net (segmentation-models-pytorch)
- [ ] Dataset: EuroSAT, PASTIS
- [ ] Classes: Agricultura, Floresta, Pasto, Água, Solo exposto, Construções
- [ ] Vetorização das máscaras
- [ ] Cálculo de área por classe

### 4.2 Detecção de Plantas
- [ ] Modelo YOLOv8 (Ultralytics)
- [ ] Treinamento com dataset customizado
- [ ] Contagem automática
- [ ] Densidade por hectare
- [ ] Exportar bounding boxes

### 4.3 Análise de Saúde
- [ ] Classificação por NDVI
- [ ] Detecção de estresse hídrico
- [ ] Categorização (Saudável/Estressada/Crítica)
- [ ] Mapa de saúde

### 4.4 Estimativa de Altura
- [ ] Análise de DSM (Digital Surface Model)
- [ ] Comparação com DTM (Digital Terrain Model)
- [ ] Mapa de altura

---

## FASE 5: Integração com Satélite (GPS)

### 5.1 APIs de Imagens
- [ ] Integrar Sentinel Hub API
- [ ] Integrar Copernicus Data Space
- [ ] Cache local de imagens
- [ ] Seleção automática da melhor imagem disponível

### 5.2 Funcionalidade GPS
- [ ] Obter localização (navigator.geolocation)
- [ ] Buscar imagem de satélite da região
- [ ] Interface para definir raio/área
- [ ] Processamento em tempo real
- [ ] Criar projeto da localização

---

## FASE 6: Relatórios e Exportação

### 6.1 Relatório PDF
- [ ] Biblioteca: ReportLab ou WeasyPrint
- [ ] Template profissional
- [ ] Seções: Resumo, Uso do Solo, Vegetação, Plantas, Recomendações
- [ ] Incluir mapas e gráficos
- [ ] Tabelas de dados

### 6.2 Exportação de Dados
- [ ] GeoJSON (mapas)
- [ ] CSV (tabelas)
- [ ] Shapefile (GIS)
- [ ] Imagens processadas

---

## FASE 7: Otimizações e Deploy

### 7.1 Performance
- [ ] Processamento em chunks para imagens grandes
- [ ] Cache de resultados (Redis)
- [ ] Otimização de modelos ML (ONNX)
- [ ] Lazy loading no frontend

### 7.2 Deploy
- [ ] Docker Compose completo
- [ ] CI/CD (GitHub Actions)
- [ ] Deploy em cloud (AWS/GCP/Azure)
- [ ] SSL/HTTPS
- [ ] Backup automático

### 7.3 Mobile (Futuro)
- [ ] PWA (Progressive Web App)
- [ ] React Native (se necessário)
- [ ] Modo offline

---

## Marcos (Milestones)

| Marco | Descrição | Status | Previsão |
|-------|-----------|--------|----------|
| **M1** | Interface completa (UI) | ✅ Completo | - |
| **M2** | Interface lapidada | ⏳ Em andamento | Fase 2 |
| **M3** | Processamento de índices | Pendente | Fase 3 |
| **M4** | Machine Learning básico | Pendente | Fase 4 |
| **M5** | Funcionalidade GPS | Pendente | Fase 5 |
| **M6** | Relatórios PDF | Pendente | Fase 6 |
| **M7** | Versão Beta completa | Pendente | Fase 7 |

---

## Bibliotecas Open Source Utilizadas

### Processamento de Imagens
| Biblioteca | Uso | Link |
|------------|-----|------|
| Rasterio | Leitura GeoTIFF | [GitHub](https://github.com/rasterio/rasterio) |
| OpenCV | Processamento | [GitHub](https://github.com/opencv/opencv) |
| GeoPandas | Vetores | [GitHub](https://github.com/geopandas/geopandas) |

### Machine Learning
| Biblioteca | Uso | Link |
|------------|-----|------|
| TorchGeo | Datasets geoespaciais | [GitHub](https://github.com/microsoft/torchgeo) |
| segmentation-models-pytorch | U-Net, DeepLab | [GitHub](https://github.com/qubvel/segmentation_models.pytorch) |
| Ultralytics | YOLOv8 | [GitHub](https://github.com/ultralytics/ultralytics) |
| eo-learn | Pipeline EO | [GitHub](https://github.com/sentinel-hub/eo-learn) |

### Mapas e Visualização
| Biblioteca | Uso | Link |
|------------|-----|------|
| Leaflet | Mapas interativos | [GitHub](https://github.com/Leaflet/Leaflet) |
| leaflet-multispectral | NDVI no mapa | [GitHub](https://github.com/publiclab/leaflet-multispectral) |
| georaster-layer-for-leaflet | GeoTIFF no Leaflet | [GitHub](https://github.com/GeoTIFF/georaster-layer-for-leaflet) |

### Satélite
| Biblioteca | Uso | Link |
|------------|-----|------|
| sentinelhub-py | Sentinel API | [GitHub](https://github.com/sentinel-hub/sentinelhub-py) |
| sentinelhub-js | Sentinel no browser | [GitHub](https://github.com/sentinel-hub/sentinelhub-js) |
| sentinelsat | Download Sentinel | [GitHub](https://github.com/sentinelsat/sentinelsat) |

### PDF
| Biblioteca | Uso | Link |
|------------|-----|------|
| ReportLab | Gerar PDF | [Docs](https://www.reportlab.com/) |
| pdf_reports | Templates PDF | [GitHub](https://github.com/Edinburgh-Genome-Foundry/pdf_reports) |
| FPDF2 | PDF simples | [GitHub](https://github.com/py-pdf/fpdf2) |

---

## Referências e Inspirações

- [Awesome Precision Agriculture](https://github.com/px39n/Awesome-Precision-Agriculture)
- [Awesome Agriculture](https://github.com/brycejohnston/awesome-agriculture)
- [satellite-image-deep-learning](https://github.com/satellite-image-deep-learning/techniques)
- [drone_data](https://github.com/anaguilarar/drone_data)
- [CropAnalysis](https://github.com/dronemapper-io/CropAnalysis)
- [OpenDroneMap](https://github.com/OpenDroneMap)

---

*Documento atualizado em: Janeiro 2026*
*Projeto: Roboroça - Sistema Inteligente de Análise Agrícola*
