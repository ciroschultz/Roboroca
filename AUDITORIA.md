# Auditoria Completa — Roboroca

> Gerado em: 2026-02-15
> Verificado contra o codigo-fonte real (api.ts, routes/*.py, componentes frontend)

---

## 1. Status das Fases do Roadmap

| Fase | Descricao | Status | Commit |
|------|-----------|--------|--------|
| 1 | Estabilizacao (NDVI, plant-count, validacao, anotacoes, PDF) | IMPLEMENTADA | f9973c4 |
| 2 | Qualidade (77 testes, loading, errors) | IMPLEMENTADA | f9973c4 |
| 3 | Dashboard (stats reais, comparativo) | IMPLEMENTADA | f9973c4 |
| 4 | Timeline, Settings, Password Recovery | IMPLEMENTADA | 067a1a3 |
| 5 | GeoJSON export, health alerts, Docker, CI/CD | IMPLEMENTADA | 1dc7c34 |
| 6 | UX polish, notificacoes, dark mode, reports | IMPLEMENTADA | dacdd0b |
| 7 | Deteccao de pragas/doencas | NAO IMPLEMENTADA | - |
| 8 | Calculo de biomassa | NAO IMPLEMENTADA | - |
| 9 | Modo offline / PWA | NAO IMPLEMENTADA | - |
| 10 | Deploy producao (Docker ja existe) | PARCIAL | - |
| 11 | WebSocket, mobile, i18n, CI/CD | NAO IMPLEMENTADA | - |

**Resumo: 6 de 11 fases implementadas (55%)**

---

## 2. Catalogo Completo de APIs (60 endpoints)

### 2.1 Autenticacao (8 endpoints)

| # | Metodo | Rota | Descricao | Funcao api.ts | Onde Acessar |
|---|--------|------|-----------|---------------|--------------|
| 1 | POST | /v1/auth/register | Criar conta | `register()` | Tela de login > "Criar conta" |
| 2 | POST | /v1/auth/login | Fazer login | `login()` | Tela de login |
| 3 | GET | /v1/auth/me | Perfil do usuario | `getCurrentUser()` | Sidebar (nome/foto), SettingsPage |
| 4 | PUT | /v1/auth/me | Atualizar perfil | `updateUserProfile()` | Configuracoes > Perfil |
| 5 | PUT | /v1/auth/preferences | Preferencias | `updateUserPreferences()` | Configuracoes > Preferencias |
| 6 | POST | /v1/auth/password/change | Trocar senha | `changePassword()` | Configuracoes > Seguranca |
| 7 | POST | /v1/auth/password/reset-request | Solicitar reset | `requestPasswordReset()` | Tela login > "Esqueci senha" |
| 8 | POST | /v1/auth/password/reset-confirm | Confirmar reset | `confirmPasswordReset()` | Link enviado por email |

### 2.2 Projetos (12 endpoints)

| # | Metodo | Rota | Descricao | Funcao api.ts | Onde Acessar |
|---|--------|------|-----------|---------------|--------------|
| 9 | GET | /v1/projects/ | Listar projetos | `getProjects()` | Dashboard / Lista de projetos / MapView |
| 10 | POST | /v1/projects/ | Criar projeto | `createProject()` | Upload de imagens (auto-cria) |
| 11 | GET | /v1/projects/{id} | Detalhe projeto | `getProject()` | **Exportada mas nao usada no frontend** |
| 12 | PUT | /v1/projects/{id} | Editar projeto | `updateProject()` | Perfil projeto > botao Editar |
| 13 | DELETE | /v1/projects/{id} | Deletar projeto | `deleteProject()` | Perfil projeto > botao Excluir |
| 14 | POST | /v1/projects/{id}/analyze | Executar analise ML | `analyzeProject()` | Perfil projeto > "Analisar Projeto" |
| 15 | GET | /v1/projects/{id}/analysis-summary | Resumo de analise | `getProjectAnalysisSummary()` | Dashboard cards / Perfil projeto / MapView |
| 16 | GET | /v1/projects/{id}/timeline | Evolucao temporal | `getProjectTimeline()` | Perfil projeto > aba Visao Geral |
| 17 | GET | /v1/projects/{id}/alerts | Alertas de saude | `getProjectAlerts()` | Perfil projeto > aba Visao Geral |
| 18 | GET | /v1/projects/{id}/enriched-data | Dados ambientais | `getProjectEnrichedData()` | Perfil projeto > 3 abas |
| 19 | GET | /v1/projects/stats | Estatisticas dashboard | `getDashboardStats()` | Dashboard (cards superiores) |
| 20 | GET | /v1/projects/comparison | Comparar projetos | `getProjectsComparison()` | Dashboard > ProjectComparison |

### 2.3 Imagens (10 endpoints)

| # | Metodo | Rota | Descricao | Funcao api.ts | Onde Acessar |
|---|--------|------|-----------|---------------|--------------|
| 21 | GET | /v1/images/ | Listar imagens | `getImages()` | MapView / ImageAnalysisPanel / page.tsx |
| 22 | POST | /v1/images/upload | Upload unico | `uploadImage()` | UploadZone (upload individual) |
| 23 | POST | /v1/images/upload-multiple | Upload multiplo | `uploadMultipleImages()` | UploadZone (upload em lote) |
| 24 | GET | /v1/images/{id} | Detalhe imagem | `getImage()` | **Exportada mas nao usada** |
| 25 | GET | /v1/images/{id}/thumbnail | Thumbnail | `getImageThumbnailUrl()` | Lista projetos / MapView / ImageAnalysisPanel |
| 26 | GET | /v1/images/{id}/file | Arquivo original | fetch direto | MapView (fallback) |
| 27 | GET | /v1/images/{id}/metadata | Metadados EXIF | `getImageMetadata()` | ImageAnalysisPanel > botao "Metadata" |
| 28 | GET | /v1/images/{id}/gsd | Resolucao espacial | fetch direto | MapView (medicoes) |
| 29 | GET | /v1/images/clusters/by-project | Clusters GPS | **Sem funcao no api.ts** | **NAO CONECTADO** |
| 30 | DELETE | /v1/images/{id} | Deletar imagem | `deleteImage()` | ImageAnalysisPanel > botao lixeira |

### 2.4 Analises ML (19 endpoints)

| # | Metodo | Rota | Descricao | Funcao api.ts | Onde Acessar |
|---|--------|------|-----------|---------------|--------------|
| 31 | GET | /v1/analysis/ | Listar analises | `getAnalyses()` | ImageAnalysisPanel / MapView |
| 32 | GET | /v1/analysis/{id} | Detalhe analise | `getAnalysis()` | **Exportada mas nao usada** |
| 33 | POST | /v1/analysis/vegetation/{id} | Cobertura vegetal (ExG) | `analyzeVegetation()` | ImageAnalysisPanel > "Vegetacao" |
| 34 | POST | /v1/analysis/plant-health/{id} | Saude vegetal | `analyzePlantHealth()` | ImageAnalysisPanel > "Saude" |
| 35 | POST | /v1/analysis/colors/{id} | Distribuicao de cores | `analyzeColors()` | ImageAnalysisPanel > "Cores" |
| 36 | POST | /v1/analysis/report/{id} | Relatorio completo | `generateReport()` | ImageAnalysisPanel > "Relatorio" |
| 37 | POST | /v1/analysis/heatmap/{id} | Heatmap vegetacao | `getHeatmapUrl()` | ImageAnalysisPanel > overlay Heatmap |
| 38 | POST | /v1/analysis/mask/{id} | Mascara vegetacao | `getVegetationMaskUrl()` | ImageAnalysisPanel > overlay Mascara |
| 39 | POST | /v1/analysis/ndvi/{id} | NDVI proxy (ExG) | **Sem funcao no api.ts** | **NAO CONECTADO** |
| 40 | POST | /v1/analysis/classify/{id} | Uso do solo | `classifyLandUse()` | ImageAnalysisPanel > "Uso Solo" |
| 41 | POST | /v1/analysis/plant-count/{id} | Contagem arvores | **Sem funcao no api.ts** | **NAO CONECTADO** |
| 42 | POST | /v1/analysis/detect/{id} | Deteccao objetos YOLO | `detectObjects()` | ImageAnalysisPanel > "YOLO" |
| 43 | POST | /v1/analysis/features/{id} | Features visuais | `extractFeatures()` | ImageAnalysisPanel > "Features" |
| 44 | POST | /v1/analysis/full/{id} | Analise ML completa | `runFullMLAnalysis()` | ImageAnalysisPanel > "ML Completo" |
| 45 | POST | /v1/analysis/video/{id} | Analise de video | `analyzeVideo()` | ImageAnalysisPanel (se video) |
| 46 | POST | /v1/analysis/video/{id}/keyframes | Extrair keyframes | `extractVideoKeyframes()` | ImageAnalysisPanel (se video) |
| 47 | GET | /v1/analysis/video/{id}/mosaic | Mosaico de video | `getVideoMosaicUrl()` | ImageAnalysisPanel (exibe apos analise video) |
| 48 | GET | /v1/analysis/export/pdf/{id} | Exportar PDF | `downloadAnalysisPDF()` | Perfil projeto > aba Relatorio |
| 49 | DELETE | /v1/analysis/{id} | Deletar analise | `deleteAnalysis()` | ImageAnalysisPanel > lixeira |

### 2.5 Anotacoes (6 endpoints)

| # | Metodo | Rota | Descricao | Funcao api.ts | Onde Acessar |
|---|--------|------|-----------|---------------|--------------|
| 50 | POST | /v1/annotations/ | Criar anotacao | `createAnnotation()` | MapView > ferramentas desenho |
| 51 | GET | /v1/annotations/ | Listar anotacoes | `getAnnotations()` | MapView (ao abrir imagem) |
| 52 | GET | /v1/annotations/{id} | Detalhe anotacao | **Sem funcao no api.ts** | **NAO CONECTADO** |
| 53 | PUT | /v1/annotations/{id} | Editar anotacao | `updateAnnotation()` | MapView |
| 54 | DELETE | /v1/annotations/{id} | Deletar anotacao | `deleteAnnotationApi()` | MapView > borracha |
| 55 | GET | /v1/annotations/export/geojson | Exportar GeoJSON | `exportAnnotationsGeoJSON()` | MapView > botao export |

### 2.6 Saude e Utilitarios (5 endpoints)

| # | Metodo | Rota | Descricao | Funcao api.ts | Onde Acessar |
|---|--------|------|-----------|---------------|--------------|
| 56 | GET | / | Info da API | `getApiInfo()` | **Exportada mas nao usada** |
| 57 | GET | /v1/health | Health check | `healthCheck()` | **Exportada mas nao usada** |
| 58 | GET | /v1/health/ready | Readiness + DB | **Sem funcao no api.ts** | **NAO CONECTADO** |
| 59 | GET | /v1/docs | Swagger UI | - | Browser: localhost:8000/v1/docs |
| 60 | GET | /v1/redoc | ReDoc | - | Browser: localhost:8000/v1/redoc |

### Resumo de Cobertura

- **60 endpoints** no backend
- **56 funcoes** no api.ts (incluindo URL builders como `getHeatmapUrl`, `getVegetationMaskUrl`)
- **48 funcoes** ativamente usadas no frontend (86%)
- **4 funcoes** exportadas mas nao importadas por nenhum componente:
  - `getProject()` — detalhe de projeto individual
  - `getImage()` — detalhe de imagem individual
  - `getAnalysis()` — detalhe de analise individual
  - `healthCheck()` / `getApiInfo()` — verificacao de API
- **4 endpoints** sem funcao no api.ts:
  - `POST /analysis/ndvi/{id}` — NDVI proxy (full_report ja inclui)
  - `POST /analysis/plant-count/{id}` — contagem arvores (full_report ja inclui)
  - `GET /images/clusters/by-project` — clusters GPS
  - `GET /health/ready` — readiness check
- **5 endpoints** de doc/info (nao precisam de frontend)

---

## 3. Mapa de Informacoes — O Que o Sistema Detecta e Onde Ver

### 3.1 Analise de Vegetacao (ExG - Excess Green Index)

| Informacao | Descricao | Onde Ver |
|------------|-----------|----------|
| Cobertura vegetal (%) | Percentual da imagem com vegetacao | Dashboard > card "Cobertura Vegetal" |
| | | Perfil projeto > aba Visao Geral > StatCard |
| | | ImageAnalysisPanel > botao "Vegetacao" |
| Histograma verde | Distribuicao de intensidade verde | ImageAnalysisPanel > resultado da analise |
| Heatmap vegetacao | Mapa de calor da vegetacao | ImageAnalysisPanel > overlay "Heatmap" |
| Mascara binaria | Areas verdes vs. nao-verdes | ImageAnalysisPanel > overlay "Mascara" |

### 3.2 Saude Vegetal

| Informacao | Descricao | Onde Ver |
|------------|-----------|----------|
| Indice de saude (0-100) | Saude geral da vegetacao | Dashboard > card "Saude" |
| | | Perfil projeto > aba Visao Geral |
| % Saudavel | Vegetacao em bom estado (healthy + moderate) | Perfil projeto > aba Visao Geral |
| % Estressada | Vegetacao sob estresse | Perfil projeto > aba Visao Geral |
| % Critica | Vegetacao em estado critico (non_vegetation) | Perfil projeto > aba Visao Geral |

### 3.3 Classificacao de Uso do Solo (ResNet18)

| Informacao | Descricao | Onde Ver |
|------------|-----------|----------|
| Tipo de cena | Classificacao da imagem (floresta, campo, etc) | ImageAnalysisPanel > "Uso Solo" |
| % por categoria | Distribuicao por tipo de uso | Perfil projeto > aba Visao Geral |
| Tipo vegetacao dominante | Vegetacao mais frequente | Perfil projeto > resumo |

### 3.4 Deteccao de Objetos (YOLOv8)

| Informacao | Descricao | Onde Ver |
|------------|-----------|----------|
| Objetos detectados | Lista de objetos com bounding boxes | ImageAnalysisPanel > "YOLO" |
| Contagem por classe | Quantos de cada tipo | Perfil projeto > resumo |
| Confianca | Score de confianca de cada deteccao | ImageAnalysisPanel > resultado expandido |

### 3.5 Contagem de Arvores (ExG + segmentacao)

| Informacao | Descricao | Onde Ver |
|------------|-----------|----------|
| Total de arvores | Contagem estimada por segmentacao de vegetacao | Perfil projeto > aba Visao Geral |
| Cobertura (%) | Percentual de cobertura das copas | Resultado da analise (JSON expandido) |
| Deteccoes | Contagens integradas com object_detection | Perfil projeto > resumo |

### 3.6 Features Visuais (Feature Extractor)

| Informacao | Descricao | Onde Ver |
|------------|-----------|----------|
| Textura | Metricas de textura (contraste, homogeneidade) | ImageAnalysisPanel > "Features" |
| Cor dominante | Cores predominantes na imagem | ImageAnalysisPanel > resultado expandido |
| Padroes | Padroes visuais detectados | ImageAnalysisPanel > resultado expandido |

### 3.7 Segmentacao Semantica (DeepLabV3)

| Informacao | Descricao | Onde Ver |
|------------|-----------|----------|
| Mapa de segmentacao | Cada pixel classificado por categoria | Parte do full_report |
| % por classe | Distribuicao de categorias (category_percentages) | Perfil projeto > resumo |
| Classes detectadas | Numero de classes presentes | Resultado da analise (JSON) |

### 3.8 Analise de Video

| Informacao | Descricao | Onde Ver |
|------------|-----------|----------|
| Info do video | Duracao, FPS, resolucao, frame count | ImageAnalysisPanel (se arquivo e video) |
| Keyframes | Frames-chave extraidos | ImageAnalysisPanel > "Extrair Keyframes" |
| Resumo temporal | Evolucao da vegetacao ao longo do video | ImageAnalysisPanel > resultado expandido |
| Mosaico | Grid de frames do video | ImageAnalysisPanel (exibido apos analise) |

### 3.9 Dados Ambientais Enriquecidos (APIs Externas)

| Informacao | Fonte | Onde Ver |
|------------|-------|----------|
| **Clima atual** | Open-Meteo | Perfil projeto > Visao Geral, Analise, Relatorio |
| - Temperatura (C) | | Cards de clima |
| - Umidade (%) | | Cards de clima |
| - Precipitacao (mm) | | Cards de clima |
| - Vento (km/h) | | Cards de clima |
| **Solo** | SoilGrids (ISRIC) | Perfil projeto > cards de solo |
| - pH | | Card de solo |
| - Argila (%) | | Card de solo |
| - Areia (%) | | Card de solo |
| - Carbono organico | | Card de solo |
| - Nitrogenio | | Card de solo |
| **Elevacao** | Open Topo Data | Perfil projeto > card elevacao |
| - Altitude (m) | | Card de elevacao |
| - Classificacao terreno | | Card de elevacao |
| **Geocodificacao** | Nominatim (OSM) | Perfil projeto > localizacao |
| - Endereco completo | | Texto no perfil |
| - Cidade, Estado, Pais | | Texto no perfil |

*Nota: Dados ambientais dependem de coordenadas GPS no projeto. Sem GPS, esses dados nao aparecem.*

### 3.10 Metricas Agregadas do Projeto

| Informacao | Onde Ver |
|------------|----------|
| Total de imagens | Dashboard > cards |
| Total de analises | Dashboard > cards |
| Area monitorada (ha) | Dashboard > cards (calculada do bounding box GPS ou estimada via GSD) |
| Evolucao temporal (timeline) | Perfil projeto > aba Visao Geral (agrupado por semana ISO) |
| Alertas de saude | Perfil projeto > aba Visao Geral (limiares configuraveis) |
| Comparativo entre projetos | Dashboard > secao comparativo (ProjectComparison) |

### 3.11 Anotacoes e Medicoes

| Informacao | Onde Ver |
|------------|----------|
| Pontos marcados | MapView > ferramenta ponto |
| Poligonos desenhados | MapView > ferramenta poligono |
| Medicoes de distancia | MapView > ferramenta medida |
| Exportacao GeoJSON | MapView > botao exportar |

---

## 4. Capacidades Completas do Programa

### 4.1 Gestao de Projetos
- Criar, editar, excluir projetos
- Upload individual de imagens/videos (jpg, png, tiff, mp4, mov, avi)
- Upload multiplo de imagens (UploadZone)
- Visualizar lista de projetos com thumbnails e metricas
- Trocar entre projetos sem sair da view (project switcher dropdown)

### 4.2 Analise por Imagem (8 acoes ML + 2 video)

Acessar via: **Sidebar > Analises > selecionar projeto > aba Analise > selecionar imagem**

**Imagens:**
1. **ML Completo** — Todas as analises combinadas (segmentacao, cena, YOLO, features, contagem)
2. **Vegetacao** — Cobertura vegetal (ExG index, threshold 0.3)
3. **Saude** — Indice de saude da vegetacao (healthy/moderate/stressed)
4. **Cores** — Distribuicao de cores (histograma, brilho, cor dominante)
5. **YOLO** — Deteccao de objetos (YOLOv8, confidence 0.25)
6. **Uso Solo** — Classificacao de uso do solo (ResNet18)
7. **Features** — Caracteristicas visuais (textura, cor, padroes)
8. **Relatorio** — Relatorio resumido (vegetacao + saude + cores)

**Videos:**
9. **Analisar Video** — Analise temporal (sample rate, max frames configuraveis)
10. **Extrair Keyframes** — Frames-chave (numero configuravel)

**Extras por imagem:**
- Visualizar metadados EXIF (botao "Metadata")
- Overlays: Heatmap / Mascara de vegetacao
- Excluir imagem individual
- Excluir analises individuais

### 4.3 Analise do Projeto Inteiro
- Botao "Analisar Projeto" executa `full_report` em todas as imagens + `video_analysis` em todos os videos
- Analise roda em background (BackgroundTasks do FastAPI)
- Limpa analises com erro antes de re-analisar
- Pula imagens ja analisadas (tem `full_report` completo)
- Atualiza coordenadas GPS do projeto pelo centroide das imagens
- Resultados agregados aparecem nos cards da Visao Geral
- Polling de progresso mostra stages do pipeline ML

### 4.4 Visualizacao de Imagens (MapView)

Acessar via: **Sidebar > Visualizar Mapa**

- Selecionar projeto e imagem na lista lateral
- Visualizar imagens com zoom/pan (canvas-based)
- Overlays: heatmap e mascara de vegetacao
- Ferramentas de anotacao: ponto, poligono, medida, borracha
- Exportar anotacoes como GeoJSON
- Painel lateral com informacoes da analise
- Calculo de distancia usando GSD (Ground Sample Distance)

### 4.5 Relatorios
- Exportar analise como PDF
- Relatorio inclui: metricas, dados, recomendacoes
- Acessar via: **Perfil projeto > aba Relatorio**

### 4.6 Dashboard
- Cards com estatisticas reais (projetos, imagens, analises, area)
- Graficos de distribuicao (donut, bar, area, gauge)
- Comparativo entre projetos (tabela com metricas)
- Acessar via: **Sidebar > Dashboard**

### 4.7 Configuracoes
- Editar perfil (nome, telefone, bio, empresa)
- Trocar senha (senha atual + nova senha)
- Preferencias (tema, idioma, notificacoes email/push/semanal)
- Acessar via: **Sidebar > Configuracoes**

### 4.8 Autenticacao
- Login/registro com email e senha
- Recuperacao de senha (gera link no console do backend)
- Token JWT com expiracao
- Auto-login apos registro

### 4.9 Notificacoes e UX
- Sistema de toast (sucesso, erro, info)
- Dialogo de confirmacao para acoes destrutivas
- Centro de notificacoes (historico de eventos)
- Dark mode (sincronizado com preferencias do usuario)
- Loading states e skeletons

---

## 5. Lacunas Identificadas

### 5.1 Endpoints Backend SEM Conexao no Frontend

| Endpoint | Descricao | Impacto |
|----------|-----------|---------|
| `POST /analysis/ndvi/{id}` | NDVI proxy (ExG) | Baixo — full_report ja inclui ExG |
| `POST /analysis/plant-count/{id}` | Contagem arvores individual | Baixo — full_report ja inclui tree_count |
| `GET /images/clusters/by-project` | Clusters GPS | Medio — util para agrupar imagens no MapView |
| `GET /health/ready` | Readiness com DB check | Baixo — monitoring/infra |
| `GET /annotations/{id}` | Detalhe de anotacao individual | Baixo — lista ja retorna dados completos |

### 5.2 Funcoes api.ts Exportadas Mas Nao Usadas

| Funcao | Descricao | Motivo |
|--------|-----------|--------|
| `getProject()` | Buscar projeto por ID | Dashboard carrega lista completa, nao precisa de detalhe individual |
| `getImage()` | Buscar imagem por ID | Nao necessario — `getImages()` com filtro de projeto ja atende |
| `getAnalysis()` | Buscar analise por ID | Nao necessario — `getAnalyses()` com filtro ja atende |
| `healthCheck()` | Verificar se API esta online | Poderia ser usado para status indicator |
| `getApiInfo()` | Info da API (versao, docs) | Poderia ser usado no footer/about |

### 5.3 Funcionalidades NAO Implementadas (Fases 7-11)

| Funcionalidade | Fase | Prioridade |
|----------------|------|------------|
| Deteccao de pragas/doencas | 7 | Media |
| Calculo de biomassa/carbono | 8 | Media |
| Modo offline (PWA) | 9 | Baixa |
| Deploy producao completo | 10 | Alta (quando for publicar) |
| WebSocket para progresso ML | 11 | Media |
| Responsividade mobile | 11 | Alta |
| Internacionalizacao (i18n) | 11 | Baixa |

### 5.4 Melhorias Pendentes

- Clusters GPS no mapa (endpoint existe, nao conectado)
- Comparacao antes/depois com slider (planejado na fase 4, nao implementado)
- Progresso de analise ML em tempo real (atualmente usa polling com setInterval)
- Upload drag-and-drop com preview antes de enviar

---

## 6. Guia de Teste Manual

### Teste 1: Autenticacao
1. Abrir `http://localhost:3000`
2. Clicar "Criar conta" > preencher nome, email, senha > criar
3. Fazer logout (icone no sidebar)
4. Fazer login com as credenciais criadas
5. Ir em Configuracoes > alterar nome > salvar
6. Ir em Configuracoes > trocar senha > salvar

### Teste 2: Criar Projeto e Upload
1. Clicar "Upload" no sidebar
2. Arrastar imagens de drone (.jpg com EXIF/GPS)
3. Verificar que o projeto foi criado automaticamente
4. Verificar thumbnails na lista de projetos
5. Verificar que coordenadas GPS foram extraidas (se imagem tem GPS)

### Teste 3: Analise ML do Projeto
1. Selecionar um projeto na lista
2. Clicar "Analisar Projeto" (aba Visao Geral)
3. Aguardar analise completar (observar indicador de progresso)
4. Verificar cards: Cobertura Vegetal (%), Saude (0-100), Arvores (contagem)
5. Verificar dados ambientais (se projeto tem GPS): clima, solo, elevacao, endereco
6. Verificar alertas de saude (amarelo/vermelho se metricas baixas)
7. Verificar timeline (evolucao temporal por semana)

### Teste 4: Analise por Imagem
1. Ir para aba "Analise" no perfil do projeto
2. Selecionar uma imagem na grid de thumbnails
3. Verificar informacoes: nome, dimensoes, tamanho, GPS
4. Clicar "Metadata" > verificar dados EXIF
5. Clicar cada botao de analise e verificar resultados:
   - **Vegetacao**: deve mostrar % cobertura e histograma
   - **Saude**: deve mostrar indice 0-100 e distribuicao
   - **Cores**: deve mostrar histograma de cores e brilho
   - **Uso Solo**: deve mostrar classificacao (floresta, campo, etc)
   - **YOLO**: deve mostrar objetos detectados (se houver)
   - **Features**: deve mostrar metricas de textura e cor
   - **ML Completo**: deve rodar todas as analises juntas
   - **Relatorio**: deve gerar relatorio combinado
6. Trocar overlay para **Heatmap** > verificar mapa de calor verde
7. Trocar overlay para **Mascara** > verificar mascara binaria
8. Expandir resultados de cada analise para ver JSON detalhado

### Teste 5: MapView
1. Clicar "Visualizar Mapa" no sidebar
2. Selecionar projeto (se nao selecionado)
3. Selecionar imagem na lista lateral
4. Verificar que a imagem carrega no canvas
5. Usar zoom (scroll) e pan (arrastar)
6. Usar ferramenta **ponto**: clicar na imagem > ponto aparece
7. Usar ferramenta **poligono**: clicar 3+ pontos > poligono se forma
8. Usar ferramenta **medida**: clicar 2 pontos > distancia calculada via GSD
9. Usar **borracha** para apagar anotacao
10. Clicar "Exportar GeoJSON" > verificar download

### Teste 6: Relatorios
1. No perfil do projeto, ir na aba "Relatorio"
2. Clicar para exportar PDF
3. Verificar que o PDF baixa e contem dados da analise

### Teste 7: Dashboard
1. Voltar ao Dashboard (sidebar)
2. Verificar cards superiores (totais: projetos, imagens, analises, area)
3. Verificar secao comparativa (se 2+ projetos analisados)
4. Verificar graficos de distribuicao

### Teste 8: Troca de Projeto
1. Dentro de um perfil de projeto, clicar no nome do projeto
2. Deve aparecer dropdown com outros projetos
3. Selecionar outro projeto > deve trocar sem sair da view

### Teste 9: Excluir Imagem/Analise
1. Na aba Analise, selecionar uma imagem
2. Clicar na lixeira ao lado de uma analise > confirmar exclusao
3. Clicar na lixeira ao lado do nome da imagem > confirmar exclusao
4. Verificar que a imagem sumiu da lista

### Teste 10: Video (se disponivel)
1. Fazer upload de um video (.mp4)
2. Na aba Analise, selecionar o video (icone vermelho)
3. Ajustar parametros: sample rate, max frames, keyframes
4. Clicar "Analisar Video" > aguardar
5. Clicar "Extrair Keyframes" > aguardar
6. Verificar mosaico exibido apos analise

---

## 7. Como Iniciar os Servidores

### Backend
```bash
cd C:\Users\ciroa\Roboroca
venv\Scripts\activate
uvicorn backend.main:app --reload --port 8000
```

### Frontend
```bash
cd C:\Users\ciroa\Roboroca\frontend
npm run dev
```

### Acessar
- Frontend: http://localhost:3000
- API Docs (Swagger): http://localhost:8000/api/v1/docs
- API ReDoc: http://localhost:8000/api/v1/redoc

### Credenciais de Teste
- Email: cid@gmail.com (conta existente)
- Projetos existentes: fazenda 1, fazenda 2, fazenda 3 (com imagens e analises)

### Rodar Testes
```bash
venv\Scripts\python.exe -m pytest backend\tests\ -v
```

---

## 8. Arquitetura de Componentes Frontend

```
page.tsx (Home)
  ├── AuthScreen.tsx          — Login / Registro / Reset senha
  ├── Sidebar.tsx             — Navegacao lateral
  ├── Header.tsx              — Cabecalho com busca
  ├── Dashboard (inline)      — Cards + graficos + stats
  │   ├── StatCard.tsx        — Card de estatistica
  │   ├── Charts.tsx          — Donut, Bar, Area, Line, Gauge, HorizontalBar
  │   └── ProjectComparison   — Tabela comparativa
  ├── UploadZone.tsx          — Upload drag-and-drop
  ├── ProjectsList.tsx        — Lista de projetos
  ├── ProjectProfile.tsx      — Perfil do projeto (4 abas)
  │   ├── Overview            — Cards, timeline, alertas, dados ambientais
  │   ├── MapView.tsx         — Visualizacao + anotacoes
  │   ├── ImageAnalysisPanel  — Analise por imagem (8 botoes ML)
  │   └── Report              — Exportar PDF
  ├── SettingsPage.tsx        — Perfil, senha, preferencias
  ├── MapView.tsx             — View standalone de mapa
  ├── ProjectEditModal.tsx    — Modal de edicao de projeto
  ├── Toast.tsx               — Notificacoes toast
  ├── ConfirmDialog.tsx       — Dialogo de confirmacao
  ├── NotificationContext.tsx — Centro de notificacoes
  └── Providers.tsx           — Wrappers (Toast, Confirm, Notifications)
```

---

## 9. Modelo de Dados (Backend)

```
User
  ├── id, email, username, full_name
  ├── phone, bio, company
  ├── language, theme
  ├── email_notifications, push_notifications, weekly_report
  ├── is_active, plan, password_hash
  └── projects[] (1:N)

Project
  ├── id, name, description, status
  ├── location, latitude, longitude, total_area_ha
  ├── owner_id (FK → User)
  ├── images[] (1:N)
  └── created_at, updated_at

Image
  ├── id, filename, original_filename, file_path
  ├── file_size, mime_type, image_type, source
  ├── width, height, center_lat, center_lon
  ├── capture_date, status
  ├── crs, bounds, resolution, bands
  ├── project_id (FK → Project)
  └── analyses[] (1:N), annotations[] (1:N)

Analysis
  ├── id, analysis_type, status, error_message
  ├── results (JSON), config (JSON)
  ├── output_files, processing_time_seconds
  ├── image_id (FK → Image)
  └── created_at, completed_at

Annotation
  ├── id, image_id (FK → Image)
  ├── annotation_type (point/polygon/measurement/circle/rectangle)
  ├── data (JSON)
  ├── created_by (FK → User)
  └── created_at, updated_at
```

---

## 10. Servicos Externos

| Servico | API | Uso | Modulo |
|---------|-----|-----|--------|
| Open-Meteo | open-meteo.com | Clima atual (temp, umidade, vento, precipitacao) | `backend/services/external/weather.py` |
| SoilGrids | rest.isric.org | Propriedades do solo (pH, argila, areia, C, N) | `backend/services/external/soil.py` |
| Open Topo Data | api.opentopodata.org | Elevacao e classificacao de terreno | `backend/services/external/elevation.py` |
| Nominatim | nominatim.openstreetmap.org | Geocodificacao reversa (coordenadas → endereco) | `backend/services/external/geocoding.py` |

Todos sao **gratuitos** e **sem autenticacao**. Resultados sao **cacheados no banco** (como analise do tipo `enriched_data`).

---

## 11. Modelos ML

| Modelo | Framework | Uso | Arquivo |
|--------|-----------|-----|---------|
| DeepLabV3 (ResNet101) | PyTorch/torchvision | Segmentacao semantica por pixel | `backend/services/ml/segmentation.py` |
| ResNet18 | PyTorch/torchvision | Classificacao de cena / uso do solo | `backend/services/ml/classification.py` |
| YOLOv8n | Ultralytics | Deteccao de objetos com bounding boxes | `backend/services/ml/detection.py` |
| ExG Index | NumPy/PIL | Cobertura vegetal e saude (sem ML) | `backend/services/image_processing.py` |
| Tree Counter | NumPy/PIL | Contagem de arvores por segmentacao | `backend/services/ml/tree_counter.py` |
| Feature Extractor | SciPy/NumPy | Textura, cor, padroes visuais | `backend/services/ml/features.py` |
| Video Analyzer | OpenCV | Analise temporal de videos | `backend/services/ml/video.py` |

**Dependencias:** `torch 2.10.0+cpu`, `torchvision 0.25.0+cpu`, `ultralytics`, `scipy`, `opencv-python`
