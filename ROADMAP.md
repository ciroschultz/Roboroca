# Roboroça - Roadmap de Desenvolvimento

## Visão Geral do Projeto

**Objetivo**: Sistema local de análise de imagens de drone/satélite que gera relatórios completos sobre propriedades rurais.

**MVP**: Upload de imagens → Processamento automático → Relatório completo

---

## FASE 1: Backend Foundation ✅ COMPLETA

### 1.1 API Base com FastAPI ✅
- [x] Configurar FastAPI com estrutura modular
- [x] Implementar sistema de autenticação (JWT)
- [x] Criar modelos de usuário e projeto
- [x] Configurar CORS e middleware de segurança

### 1.2 Banco de Dados ✅
- [x] Configurar SQLite para desenvolvimento local
- [x] Modelar tabelas principais (Users, Projects, Images, Analysis)
- [x] Schemas Pydantic para validação

### 1.3 Sistema de Upload ✅
- [x] Upload de arquivos (GeoTIFF, JPEG, PNG)
- [x] Validação de formatos
- [x] Armazenamento local

---

## FASE 2: Processamento de Imagens (PRÓXIMA)

### 2.1 Pipeline de Pré-processamento
- [ ] Leitura de imagens com Rasterio
- [ ] Extração de metadados (coordenadas, resolução, bandas)
- [ ] Correção radiométrica básica
- [ ] Reprojeção de coordenadas
- [ ] Normalização de valores

### 2.2 Cálculo de Índices de Vegetação
- [ ] NDVI (Normalized Difference Vegetation Index)
- [ ] NDWI (Normalized Difference Water Index)
- [ ] EVI (Enhanced Vegetation Index)
- [ ] SAVI (Soil Adjusted Vegetation Index)
- [ ] Geração de mapas de calor coloridos
- [ ] Estatísticas (min, max, média, desvio padrão)

### 2.3 Geração de Tiles
- [ ] Criar tiles para visualização web (XYZ)
- [ ] Implementar COG (Cloud Optimized GeoTIFF)
- [ ] API de servir tiles

---

## FASE 3: Machine Learning - Classificação

### 3.1 Classificação de Uso do Solo
- [ ] Preparar dataset (EuroSAT, PASTIS)
- [ ] Implementar U-Net como modelo base
- [ ] Treinar para classes:
  - Floresta
  - Pasto
  - Plantação/Agricultura
  - Água
  - Solo exposto
  - Construções
- [ ] Vetorização das máscaras
- [ ] Cálculo de área por classe

### 3.2 Detecção de Plantas
- [ ] Implementar YOLOv8 para detecção
- [ ] Treinar modelo para culturas específicas
- [ ] Contagem automática de plantas
- [ ] Cálculo de densidade (plantas/hectare)

### 3.3 Análise de Saúde das Plantas
- [ ] Classificação por índices de vegetação
- [ ] Modelo de detecção de estresse
- [ ] Categorização (saudável, estressada, crítica)
- [ ] Mapa de saúde

### 3.4 Estimativa de Altura
- [ ] Análise de modelos digitais de superfície
- [ ] Cálculo de altura da vegetação
- [ ] Mapa de altura

---

## FASE 4: Análise de Solo e Recomendações

### 4.1 Análise de Solo
- [ ] Identificação de áreas com deficiências
- [ ] Correlação com índices de vegetação
- [ ] Detecção de padrões

### 4.2 Sistema de Recomendações
- [ ] Regras baseadas em análises
- [ ] Sugestões de correção
- [ ] Alertas de áreas críticas

---

## FASE 5: Geração de Relatórios

### 5.1 Compilação de Resultados
- [ ] Agregação de todas as análises
- [ ] Cálculo de estatísticas gerais
- [ ] Priorização de informações

### 5.2 Geração de PDF
- [ ] Template de relatório profissional
- [ ] Inclusão de mapas e gráficos
- [ ] Tabelas de dados
- [ ] Recomendações

### 5.3 Exportação de Dados
- [ ] GeoJSON para mapas
- [ ] CSV para tabelas
- [ ] Shapefiles

---

## FASE 6: Frontend

### 6.1 Interface Base
- [ ] Configurar Next.js
- [ ] Sistema de autenticação
- [ ] Layout responsivo

### 6.2 Mapa Interativo
- [ ] Integrar MapLibre GL
- [ ] Exibir imagens como layers
- [ ] Toggle de resultados (NDVI, classificação, etc.)
- [ ] Ferramentas de zoom e navegação

### 6.3 Dashboard
- [ ] Lista de projetos
- [ ] Upload com progress bar
- [ ] Visualização de resultados
- [ ] Download de relatórios

---

## FASE 7: Otimizações (Futuro)

### 7.1 Performance
- [ ] Processamento em chunks para imagens grandes
- [ ] Cache de resultados
- [ ] Otimização de modelos ML

### 7.2 Deploy Web
- [ ] Configuração para servidor
- [ ] SSL/HTTPS
- [ ] Backup automático

### 7.3 Funcionalidades Avançadas
- [ ] Comparação temporal
- [ ] Integração com APIs de satélite
- [ ] Alertas automáticos

---

## Marcos (Milestones)

| Marco | Descrição | Status |
|-------|-----------|--------|
| **M1** | Backend funcional | ✅ Completo |
| **M2** | Índices de vegetação | ⏳ Próximo |
| **M3** | Classificação ML | Pendente |
| **M4** | Detecção de plantas | Pendente |
| **M5** | Relatório PDF | Pendente |
| **M6** | Frontend básico | Pendente |
| **M7** | Sistema completo | Pendente |

---

## Próximo Passo Imediato

**Iniciar FASE 2**: Implementar o pipeline de processamento de imagens e cálculo de índices de vegetação (NDVI, NDWI, etc.).

---

*Documento atualizado em: Janeiro 2026*
*Projeto: Roboroça - Sistema Inteligente de Análise Agrícola*
