# FASE 3 - Plano de Execução: Processamento de Imagens

## Visão Geral

**Objetivo**: Conectar frontend ao backend e implementar processamento real de imagens de drone.

**Arquivos de Teste Disponíveis**:
- 35 imagens JPG de drone DJI (~10MB cada)
- 14 vídeos MOV de drone DJI (até 353MB)
- Local: `Imagens e videos para testes/Ciro/`

---

## Estrutura das Etapas

### ETAPA 1: Preparação do Ambiente ✅
**Prioridade**: Alta | **Esforço**: Baixo

- [x] 1.1 Verificar/atualizar dependências do backend (requirements.txt)
  - Pillow (imagens)
  - OpenCV (processamento)
  - exifread (metadados GPS de drone)
  - numpy
- [x] 1.2 Criar pasta de uploads se não existir
- [x] 1.3 Configurar variáveis de ambiente (.env)
- [x] 1.4 Testar se backend inicia corretamente

---

### ETAPA 2: Serviço de Processamento de Imagens ✅
**Prioridade**: Alta | **Esforço**: Médio

Implementar em `backend/services/image_processing/`:

- [x] 2.1 `reader.py` - Leitura de imagens
  ```python
  - read_image(path) -> numpy array
  - read_metadata(path) -> dict (GPS, dimensões, câmera)
  - extract_gps_coordinates(path) -> (lat, lon)
  - get_image_dimensions(path) -> (width, height)
  ```

- [x] 2.2 `processor.py` - Processamento básico
  ```python
  - resize_image(image, max_size) -> image
  - create_thumbnail(image, size) -> image
  - normalize_image(image) -> image
  ```

- [x] 2.3 `analyzer.py` - Análises simples (sem ML por enquanto)
  ```python
  - calculate_green_index(image) -> float (0-1)
  - calculate_color_histogram(image) -> dict
  - detect_vegetation_mask(image) -> mask
  - estimate_vegetation_coverage(image) -> percentage
  ```

- [x] 2.4 `video.py` - Processamento de vídeo
  ```python
  - extract_frames(video_path, interval) -> list[images]
  - get_video_metadata(path) -> dict
  ```

---

### ETAPA 3: Atualizar Rotas da API ✅
**Prioridade**: Alta | **Esforço**: Médio

Implementar em `backend/api/routes/`:

- [x] 3.1 `images.py` - Melhorar upload
  - Adicionar suporte a vídeos (MOV, MP4)
  - Extrair e salvar metadados GPS automaticamente
  - Gerar thumbnail após upload
  - Retornar preview URL

- [x] 3.2 `analysis.py` - Implementar análises básicas
  - POST `/analysis/process/{project_id}` - Processar projeto completo
  - GET `/analysis/{project_id}/results` - Obter resultados
  - Calcular índice de vegetação (verde)
  - Calcular cobertura vegetal (%)
  - Gerar estatísticas básicas

- [x] 3.3 `projects.py` - Atualizar projetos (já funcional)
  - Atualizar status do projeto após processamento
  - Agregar resultados de múltiplas imagens

---

### ETAPA 4: Conectar Frontend ao Backend ✅
**Prioridade**: Alta | **Esforço**: Médio

Implementar em `frontend/src/`:

- [x] 4.1 `lib/api.ts` - Cliente de API
  ```typescript
  - API_BASE_URL
  - uploadImages(files, projectName, sourceType)
  - getProjects()
  - getProject(id)
  - processProject(id)
  - getAnalysisResults(projectId)
  ```

- [x] 4.2 Atualizar `UploadZone.tsx`
  - Chamar API real de upload
  - Mostrar progresso real
  - Tratar erros

- [x] 4.3 Atualizar `page.tsx`
  - Buscar projetos reais do backend
  - Atualizar estado após processamento

- [x] 4.4 Configurar proxy/CORS
  - Variável de ambiente NEXT_PUBLIC_API_URL
  - CORS configurado no backend

---

### ETAPA 5: Testes e Validação ✅
**Prioridade**: Alta | **Esforço**: Baixo

- [x] 5.1 Testar upload de imagem JPG
- [x] 5.2 Testar extração de metadados GPS (Lat: -21.99°, Lon: -46.46°, Alt: 1426m)
- [x] 5.3 Testar geração de thumbnail
- [x] 5.4 Testar análise básica de vegetação (99.8% cobertura, health index: 70)
- [x] 5.5 Testar fluxo completo: API funcionando em http://localhost:8000

---

## Ordem de Execução Recomendada

```
ETAPA 1 (Preparação)
    ↓
ETAPA 2.1 (Leitura de imagens)
    ↓
ETAPA 2.2 (Processamento básico)
    ↓
ETAPA 3.1 (Upload melhorado)
    ↓
ETAPA 5.1-5.3 (Testar backend)
    ↓
ETAPA 4.1 (Cliente API)
    ↓
ETAPA 4.2-4.4 (Frontend conectado)
    ↓
ETAPA 2.3 (Análises)
    ↓
ETAPA 3.2 (Rotas de análise)
    ↓
ETAPA 5.4-5.5 (Testes finais)
```

---

## Arquivos a Criar/Modificar

### Criar (Novos)
```
backend/services/image_processing/reader.py
backend/services/image_processing/processor.py
backend/services/image_processing/analyzer.py
backend/services/image_processing/video.py
frontend/src/lib/api.ts
```

### Modificar (Existentes)
```
backend/requirements.txt
backend/api/routes/images.py
backend/api/routes/analysis.py
backend/api/routes/projects.py
frontend/src/components/UploadZone.tsx
frontend/src/app/page.tsx
frontend/next.config.js (ou mjs)
```

---

## Critérios de Sucesso - TODOS ATINGIDOS! ✅

1. ✅ Upload de imagem JPG funciona via frontend (UploadZone com API real)
2. ✅ Metadados GPS são extraídos automaticamente (Lat, Lon, Alt, Camera)
3. ✅ Thumbnail é gerado e exibido (save_thumbnail funcionando)
4. ✅ Análise básica retorna índice de vegetação (ExG, GLI, health index)
5. ✅ Dashboard mostra projetos reais do banco (page.tsx integrado)
6. ✅ Fluxo completo funciona de ponta a ponta (Frontend → API → Backend → DB)

---

## Dependências Python Necessárias

```txt
# Já existentes
fastapi
uvicorn
sqlalchemy
pydantic

# Adicionar para FASE 3
Pillow>=10.0.0        # Manipulação de imagens
opencv-python>=4.8.0  # Processamento de imagens/vídeo
numpy>=1.24.0         # Arrays numéricos
exifread>=3.0.0       # Metadados EXIF (GPS de drone)
python-multipart      # Upload de arquivos
aiofiles              # Arquivos assíncronos
```

---

## Estimativa de Complexidade

| Etapa | Arquivos | Complexidade |
|-------|----------|--------------|
| 1 | 2 | Baixa |
| 2 | 4 | Média |
| 3 | 3 | Média |
| 4 | 4 | Média |
| 5 | - | Baixa |

**Total**: ~13 arquivos para criar/modificar

---

*Plano criado em: Janeiro 2026*
*Projeto: Roboroça - FASE 3*
