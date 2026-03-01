# Resultado dos Testes Funcionais

**Data**: 2026-03-01 18:26
**Total**: 41 | **Passaram**: 41 | **Falharam**: 0
**Taxa**: 100.0%

| # | Teste | Status | Detalhe |
|---|-------|--------|--------|
| 1 | Registro de usuário | PASS | já existia |
| 2 | Login | PASS | token=eyJhbGciOiJIUzI1NiIs... |
| 3 | Perfil (GET /auth/me) | PASS | email=flavio_test@gmail.com |
| 4 | Criar projeto | PASS | id=38 |
| 5 | Listar projetos | PASS | 3 projetos |
| 6 | Upload DJI_0038 - Copia.JPG | PASS | id=113, gps=sim |
| 7 | Upload DJI_0038.JPG | PASS | id=114, gps=sim |
| 8 | Upload DJI_0039.JPG | PASS | id=115, gps=sim |
| 9 | Upload DJI_0041.JPG | PASS | id=116, gps=sim |
| 10 | Upload DJI_0042 - Copia.JPG | PASS | id=117, gps=sim |
| 11 | Upload vídeo DJI_0037.MOV | PASS | id=118 |
| 12 | Iniciar análise do projeto | PASS |  |
| 13 | Análise completa | PASS | status=completed, tempo=99.6s |
| 14 | Analysis summary endpoint | PASS |  |
| 15 | Área calculada (ha) | PASS | 37.22 ha |
| 16 | Cobertura vegetal média | PASS | 1.75% |
| 17 | Índice de saúde médio | PASS | 33.93 |
| 18 | Imagens analisadas | PASS | 6/7 |
| 19 | Detecções de objetos | PASS | 668 objetos |
| 20 | Bug2: Área não somada | PASS | 37.22 ha (deve ser ~área de 1 img, não 5x) |
| 21 | Listar análises | PASS | 7 análises |
| 22 | Análise vegetação (legacy) | PASS | status=completed |
| 23 | Análise saúde (legacy) | PASS | status=completed |
| 24 | Análise cores (legacy) | PASS | status=completed |
| 25 | Heatmap | PASS | imagem gerada |
| 26 | Máscara vegetação | PASS | imagem gerada |
| 27 | Definir perímetro no projeto | PASS | 4 pontos |
| 28 | Definir perímetro na imagem | PASS |  |
| 29 | Análise ROI | PASS | status=completed |
| 30 | Re-análise com perímetro | PASS | iniciada |
| 31 | Dashboard stats | PASS | {
  "total_projects": 3,
  "total_images": 22,
  "total_analyses": 29,
  "total_area_ha": 111.66,
  "projects_by_status": {
    "pending": 0,
    "processing": 0,
    "completed": 3,
    "error": 0
   |
| 32 | Timeline | PASS | 1 entries |
| 33 | Criar anotação | PASS | id=22 |
| 34 | Listar anotações | PASS | ? anotações |
| 35 | Exportar GeoJSON | PASS | type=FeatureCollection, features=1 |
| 36 | Detalhes da imagem | PASS | DJI_0038 - Copia.JPG, 5472x3648 |
| 37 | UTM info | PASS | zone=23S |
| 38 | Thumbnail | PASS | 25000 bytes |
| 39 | Listar providers | PASS | 1 providers |
| 40 | GET preferences | PASS | {'language': 'pt-BR', 'theme': 'dark', 'email_notifications': True} |
| 41 | PUT preferences | PASS | language=pt-BR, theme=dark |
