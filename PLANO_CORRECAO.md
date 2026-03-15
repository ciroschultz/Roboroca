# Plano de Correção — Roboroça Ecosystem
**Data**: 2026-03-15
**Baseado em**: RELATORIO_BUGS.md

---

## Prioridade de Execução

### 1. CRÍTICO — BUG-002: Coluna ndvi_source ausente (Precision)

**Impacto**: 9 de 23 testes falhando (61% taxa de sucesso). Módulo Precision praticamente inutilizável.

**Arquivo**: `backend/modules/precision/models.py` (modelo FieldSnapshot, linha ~59)

**Solução**: Recriar o banco de dados (ambiente dev com SQLite, sem dados de produção).

```python
# Em backend/core/database.py — init_db() já faz create_all()
# O problema é que create_all() não faz ALTER TABLE.
# Solução dev: deletar roboroca.db e reiniciar (init_db recria tudo)
# Solução prod: usar Alembic migration
```

**Passos**:
1. Parar o backend
2. Deletar `backend/roboroca.db`
3. Reiniciar o backend (init_db() recria todas as tabelas com schema atualizado)
4. Recriar os usuários de teste
5. Verificar: `POST /precision/fields/{id}/snapshot` deve retornar 200/201

**Complexidade**: Simples (dev) / Médio (prod — requer Alembic migration)

---

### 2. ALTO — BUG-001: Full Analysis 500 (Aerial)

**Impacto**: Análise completa não funciona. Análises individuais (vegetation, plant-health, colors) funcionam.

**Arquivo**: `backend/modules/aerial/router.py` (~linha 1137-1177)

**Causa**: Uma função ML importada via try/except resolveu como `None`. O guard `if ML_AVAILABLE` passa, mas a função em si é `None`.

**Solução proposta**:
```python
# No bloco try/except de imports ML, verificar cada função individualmente:
# Antes de chamar cada função, verificar se não é None:
if segment_by_color is None:
    raise HTTPException(500, "ML function 'segment_by_color' not available")

# OU: Ajustar o import para garantir que todas as funções são importadas corretamente
# OU: Setar ML_AVAILABLE = False se qualquer função for None
```

**Passos**:
1. Abrir `backend/modules/aerial/router.py`
2. Localizar o bloco de import ML (try/except que define ML_AVAILABLE)
3. Verificar quais funções estão sendo importadas e se alguma é None
4. Corrigir o import ou adicionar guards individuais
5. Testar: `POST /api/v1/analysis/full/{image_id}` deve retornar 200

**Complexidade**: Médio

---

### 3. ALTO — BUG-003 e BUG-004: Orders 500 (Equipment)

**Impacto**: Usuários não conseguem ver histórico de pedidos após criá-los.

**Arquivo**: `backend/modules/equipment/router.py` (linhas ~329-340)

**Causa**: Queries `select(Order)` sem eager loading explícito. Em SQLAlchemy async, `lazy="joined"` no modelo não é suficiente.

**Solução proposta**:
```python
from sqlalchemy.orm import selectinload

# Em list_orders (linha ~329):
query = select(Order).options(
    selectinload(Order.items),
    selectinload(Order.status_history)
).where(Order.user_id == current_user.id)

# Em get_order (linha ~336):
query = select(Order).options(
    selectinload(Order.items),
    selectinload(Order.status_history)
).where(Order.id == order_id, Order.user_id == current_user.id)
```

**Passos**:
1. Abrir `backend/modules/equipment/router.py`
2. Adicionar `from sqlalchemy.orm import selectinload` (se não existir)
3. Modificar queries em `list_orders` e `get_order` para usar `selectinload`
4. Testar: `GET /api/v1/equipment/orders` e `GET /api/v1/equipment/orders/{id}` devem retornar 200

**Complexidade**: Simples

---

## Melhorias Opcionais (Baixa Prioridade)

### OPT-001: Validação de idiomas (Hub Central)
- **Arquivo**: `backend/api/schemas/user.py` (UserPreferencesUpdate)
- **Solução**: Adicionar `Literal["pt-BR", "en-US", "es"]` ao campo `language`
- **Complexidade**: Simples

### OPT-002: Toggle favorite retorna 204 em vez de 201 (Equipment)
- **Arquivo**: `backend/modules/equipment/router.py` (toggle_favorite)
- **Solução**: Verificar lógica de toggle e retornar status code correto
- **Complexidade**: Simples

### OPT-003: Endpoint de comparação de projetos (Aerial)
- **Arquivo**: `backend/api/routes/projects.py`
- **Solução**: Criar rota `GET /projects/compare?ids=1,2` ANTES da rota `/{project_id}`
- **Complexidade**: Médio

---

## Ordem de Execução Recomendada

| Ordem | Bug | Ação | Tempo Est. |
|---|---|---|---|
| 1 | BUG-002 | Deletar DB + reiniciar (dev) | 2 min |
| 2 | BUG-003/004 | Adicionar selectinload nas queries de orders | 5 min |
| 3 | BUG-001 | Investigar e corrigir imports ML no full analysis | 15 min |
| 4 | OPT-001/002 | Melhorias menores | 10 min |

**Total estimado**: ~30 minutos para todos os bugs críticos e altos.

---

## Verificação Pós-Correção

Após aplicar as correções, re-executar os testes:
```bash
# BUG-002: Precision snapshot
curl -X POST http://localhost:8000/api/v1/precision/fields/1/snapshot -H "Authorization: Bearer $TOKEN"

# BUG-001: Full analysis
curl -X POST http://localhost:8000/api/v1/analysis/full/1 -H "Authorization: Bearer $TOKEN"

# BUG-003/004: Equipment orders
curl http://localhost:8000/api/v1/equipment/orders -H "Authorization: Bearer $TOKEN"
curl http://localhost:8000/api/v1/equipment/orders/1 -H "Authorization: Bearer $TOKEN"
```

Todos devem retornar 200/201.
