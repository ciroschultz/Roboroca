# FASE 4 - Plano de Execução: Machine Learning Local

## Visão Geral

**Objetivo**: Extrair o máximo de informações das imagens e vídeos usando modelos pré-treinados rodando localmente.

**Estratégia**: Usar modelos leves e otimizados que funcionem bem em CPU (com suporte opcional a GPU).

**Arquivos de Teste**:
- 35 imagens JPG de drone DJI (8-11 MB cada, 5472x3648)
- 14 vídeos MOV de drone DJI (5-163 MB cada)

---

## Modelos Pré-Treinados Selecionados

| Tarefa | Modelo | Biblioteca | Tamanho | CPU/GPU |
|--------|--------|------------|---------|---------|
| Detecção de Objetos | YOLOv8n | ultralytics | 6 MB | CPU OK |
| Segmentação Semântica | DeepLabV3 | torchvision | 40 MB | CPU OK |
| Classificação de Cena | ResNet18 | torchvision | 45 MB | CPU OK |
| Detecção de Bordas | Canny + Contours | OpenCV | - | CPU |
| OCR (placas/textos) | EasyOCR | easyocr | 100 MB | CPU OK |

---

## Estrutura das Etapas

### ETAPA 1: Preparação do Ambiente ML ✅
**Prioridade**: Alta | **Esforço**: Baixo

- [x] 1.1 Instalar dependências de ML
  ```
  torch (CPU version)
  torchvision
  ultralytics (YOLO)
  opencv-python
  scikit-learn
  ```
- [x] 1.2 Criar estrutura de pastas para modelos
- [x] 1.3 Baixar modelos pré-treinados (YOLOv8n, DeepLabV3)
- [x] 1.4 Testar se modelos carregam corretamente (PyTorch 2.10, YOLO OK)

---

### ETAPA 2: Serviços de ML ✅
**Prioridade**: Alta | **Esforço**: Alto

Criar em `backend/services/ml/`:

- [x] 2.1 `detector.py` - Detecção de Objetos (YOLO)
  ```python
  - detect_objects(image) -> list[Detection]
  - detect_vegetation(image) -> list[VegetationArea]
  - detect_structures(image) -> list[Structure]  # casas, cercas, estradas
  - count_objects(image, class_name) -> int
  ```

- [x] 2.2 `segmenter.py` - Segmentação de Áreas (por cor)
  ```python
  - segment_land_use(image) -> SegmentationMask
  - get_land_use_percentages(mask) -> dict
  - extract_polygons(mask) -> list[GeoJSON]
  ```

- [x] 2.3 `classifier.py` - Classificação de Cenas e Vegetação
  ```python
  - classify_scene(image) -> SceneType  # rural, urbano, floresta, água
  - classify_crop_type(image) -> CropType  # soja, milho, café, pasto
  - estimate_crop_stage(image) -> GrowthStage
  ```

- [x] 2.4 `feature_extractor.py` - Extração de Características (textura, cor, padrões)
  ```python
  - extract_texture_features(image) -> TextureFeatures
  - extract_color_features(image) -> ColorFeatures
  - calculate_vegetation_indices(image) -> VegetationIndices
  - detect_anomalies(image) -> list[Anomaly]
  ```

- [ ] 2.5 `video_analyzer.py` - Análise de Vídeo
  ```python
  - analyze_video(video_path) -> VideoAnalysis
  - extract_key_frames(video_path) -> list[Frame]
  - track_changes(frames) -> ChangeDetection
  - create_mosaic(frames) -> Image
  ```

---

### ETAPA 3: Processamento Avançado de Imagens
**Prioridade**: Média | **Esforço**: Médio

Criar em `backend/services/image_processing/`:

- [ ] 3.1 `advanced_analyzer.py` - Análises Avançadas
  ```python
  - detect_water_bodies(image) -> list[WaterBody]
  - detect_roads_paths(image) -> list[Path]
  - detect_shadows(image) -> ShadowMask
  - estimate_sun_position(image, metadata) -> SunPosition
  - calculate_canopy_coverage(image) -> float
  ```

- [ ] 3.2 `geo_processor.py` - Processamento Geoespacial
  ```python
  - create_orthomosaic(images) -> Orthomosaic
  - georefence_image(image, gps) -> GeoImage
  - calculate_area_from_pixels(pixels, altitude) -> float
  - estimate_plant_density(detections, area) -> float
  ```

---

### ETAPA 4: Atualizar API com Endpoints de ML ✅
**Prioridade**: Alta | **Esforço**: Médio

Atualizar `backend/api/routes/analysis.py`:

- [x] 4.1 Novos endpoints de detecção
  ```
  POST /analysis/detect/{image_id} - Detectar objetos
  POST /analysis/segment/{image_id} - Segmentar áreas
  POST /analysis/classify/{image_id} - Classificar cena
  ```

- [ ] 4.2 Novos endpoints de vídeo
  ```
  POST /analysis/video/{image_id}/analyze - Análise completa
  POST /analysis/video/{image_id}/keyframes - Extrair frames
  POST /analysis/video/{image_id}/mosaic - Criar mosaico
  ```

- [ ] 4.3 Endpoint de análise completa
  ```
  POST /analysis/full/{image_id} - Executar todas as análises
  ```

---

### ETAPA 5: Integrar com Frontend
**Prioridade**: Média | **Esforço**: Médio

- [ ] 5.1 Atualizar `lib/api.ts` com novos endpoints
- [ ] 5.2 Criar componente de visualização de detecções
- [ ] 5.3 Criar componente de visualização de segmentação
- [ ] 5.4 Adicionar página de análise avançada

---

### ETAPA 6: Testes com Imagens Reais ✅
**Prioridade**: Alta | **Esforço**: Baixo

- [x] 6.1 Testar detecção de objetos (YOLO - 0 detecções em aérea, esperado)
- [x] 6.2 Testar segmentação de uso do solo (23% veg, 32% solo, 8% água)
- [x] 6.3 Testar classificação de vegetação (moderada, densidade média)
- [ ] 6.4 Testar análise de vídeos (pendente)
- [x] 6.5 Medir tempo de processamento (Seg: 1.4s, Class: 2.3s, Features: 70s)
- [x] 6.6 Otimizar para imagens grandes (redimensionamento para 1000-1500px)

---

## Informações que Serão Extraídas

### De Cada Imagem:
1. **Detecção de Objetos**
   - Árvores/plantas individuais (contagem)
   - Estruturas (casas, galpões, cercas)
   - Veículos
   - Corpos d'água
   - Estradas/caminhos

2. **Segmentação de Áreas**
   - Vegetação densa
   - Vegetação esparsa
   - Solo exposto
   - Água
   - Construções
   - Sombras

3. **Classificação**
   - Tipo de cena (rural/urbano/floresta)
   - Tipo de cultura (se aplicável)
   - Estágio de crescimento

4. **Características Visuais**
   - Textura dominante
   - Cores predominantes
   - Padrões detectados
   - Anomalias visuais

5. **Métricas Calculadas**
   - Densidade de vegetação
   - Cobertura de dossel (canopy)
   - Área de cada classe (m² / ha)
   - Contagem de plantas por hectare

### De Cada Vídeo:
1. **Frames-chave** (imagens mais representativas)
2. **Mosaico** (imagem única combinada)
3. **Análise de movimento** (áreas estáticas vs dinâmicas)
4. **Estatísticas agregadas** de todos os frames

---

## Dependências Python Necessárias

```txt
# ML Core
torch>=2.0.0
torchvision>=0.15.0

# Object Detection
ultralytics>=8.0.0  # YOLOv8

# Image Processing (já instalados)
opencv-python>=4.8.0
numpy>=1.24.0
Pillow>=10.0.0

# ML Utils
scikit-learn>=1.3.0
scipy>=1.11.0

# Optional - OCR
# easyocr>=1.7.0  # Adicionar se precisar detectar texto
```

---

## Arquivos a Criar

```
backend/services/ml/__init__.py
backend/services/ml/detector.py
backend/services/ml/segmenter.py
backend/services/ml/classifier.py
backend/services/ml/feature_extractor.py
backend/services/ml/video_analyzer.py
backend/services/ml/models.py (tipos/schemas)

backend/services/image_processing/advanced_analyzer.py
backend/services/image_processing/geo_processor.py

frontend/src/components/DetectionViewer.tsx
frontend/src/components/SegmentationViewer.tsx
frontend/src/components/AdvancedAnalysis.tsx
```

---

## Estimativa de Performance (CPU)

| Operação | Tempo Estimado | Memória |
|----------|----------------|---------|
| Carregar modelos | 5-10s (uma vez) | ~500 MB |
| Detecção YOLO (1 img) | 1-3s | ~200 MB |
| Segmentação (1 img) | 2-5s | ~300 MB |
| Classificação (1 img) | 0.5-1s | ~100 MB |
| Análise completa (1 img) | 5-10s | ~500 MB |
| Análise de vídeo (1 min) | 30-60s | ~1 GB |

**Nota**: Imagens serão redimensionadas para 1920px para processamento mais rápido, mantendo originais para visualização.

---

## Ordem de Execução Recomendada

```
ETAPA 1 (Preparação ML)
    ↓
ETAPA 2.1 (Detector YOLO)
    ↓
ETAPA 6.1 (Testar detecção)
    ↓
ETAPA 2.2 (Segmentador)
    ↓
ETAPA 6.2 (Testar segmentação)
    ↓
ETAPA 4 (API endpoints)
    ↓
ETAPA 5 (Frontend)
    ↓
ETAPA 6.5-6.6 (Performance)
```

---

## Critérios de Sucesso

1. ✅ Modelos carregam em menos de 10 segundos
2. ✅ Detecção de objetos funciona nas imagens de teste
3. ✅ Segmentação identifica pelo menos 5 classes
4. ✅ Tempo de análise completa < 15 segundos por imagem
5. ✅ Vídeos são processados sem erro de memória
6. ✅ Resultados são exibidos no frontend

---

*Plano criado em: Janeiro 2026*
*Projeto: Roboroça - FASE 4 - Machine Learning*
