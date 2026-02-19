# Plano de Retorno - Quinta-feira

## Status Atual (2026-02-16)
- **81 testes passando** (backend completo)
- **Frontend**: `tsc --noEmit` 0 erros, `npm run build` OK
- **Commit**: `62e1ba6` - Phase 7 completa (pest detection + biomass estimation)
- **Cobertura funcional**: ~100% dos endpoints planejados implementados

## Proximos Passos (Prioridade)

### 1. Validacao End-to-End (30 min)
- [ ] Subir backend (`uvicorn backend.main:app --reload`)
- [ ] Subir frontend (`npm run dev`)
- [ ] Testar fluxo completo: login -> criar projeto -> upload -> analise -> biomassa -> pragas
- [ ] Verificar se `full_report` inclui `biomass` e `pest_disease` nos resultados

### 2. Polimento de UI - Resultados de Biomassa (1h)
- [ ] Componente visual dedicado para exibir resultados de biomassa no ProjectProfile
  - Gauge/barra de progresso para `biomass_index` (0-100)
  - Card com `density_class` colorido (esparsa=vermelho, moderada=amarelo, densa=verde, muito_densa=verde escuro)
  - Exibir `estimated_biomass_kg_ha` formatado (ex: "42.5 t/ha")
  - Mini-mapa de copas detectadas (`canopy_patches`) sobreposto na imagem
- [ ] Adicionar biomassa ao resumo do projeto (`analysis-summary`)

### 3. Alertas de Biomassa (30 min)
- [ ] Adicionar biomassa aos alertas do projeto (`/projects/{id}/alerts`)
  - Warning se `biomass_index` < 25 (esparsa)
  - Critical se `biomass_index` < 10
- [ ] Exibir no painel de alertas do frontend

### 4. Relatorio PDF - Secao Biomassa (45 min)
- [ ] Adicionar secao de biomassa ao `ReportGenerator`
  - Indice, classe, estimativa kg/ha
  - Tabela de copas detectadas (top 10)
  - Metricas de vigor
  - Recomendacoes

### 5. Testes de Integracao (30 min)
- [ ] Teste do `full_report` verificando que inclui `biomass` e `pest_disease`
- [ ] Teste de alertas com biomassa baixa
- [ ] Teste do timeline com dados de biomassa

### 6. Documentacao (20 min)
- [ ] Atualizar README com novos endpoints
- [ ] Documentar algoritmo de biomassa (limitacoes, calibracao)
- [ ] Swagger/OpenAPI: verificar que descricoes estao corretas

## Backlog (Futuro)
- **Modelo de biomassa calibrado**: treinar regressao com dados reais (campo + drone)
- **Comparacao temporal de biomassa**: evolucao do indice ao longo do tempo
- **Export CSV**: exportar dados de biomassa por projeto
- **Mapa de calor de biomassa**: heatmap especifico para biomassa
- **Integracao com sensores**: NIR/LIDAR para estimativa volumetrica real
