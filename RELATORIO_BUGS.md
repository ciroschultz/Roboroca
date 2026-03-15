# Relatório de Bugs — Roboroça Ecosystem
**Data**: 2026-03-15
**Testador**: Automação via API (curl/Python requests)
**Ambiente**: Windows 11, SQLite dev, backend porta 8000

---

## Resumo Geral

### Antes das Correções
| Plataforma | Testes | PASS | FAIL | Taxa |
|---|---|---|---|---|
| Hub Central (3000) | 10 | 10 | 0 | 100% |
| Aerial (3005) | 17 | 16 | 1 | 94% |
| Calculator (3001) | 17 | 17 | 0 | 100% |
| Precision (3002) | 23 | 14 | 9 | 61% |
| Equipment (3003) | 22 | 20 | 2 | 91% |
| Spectral (3004) | 22 | 22 | 0 | 100% |
| **TOTAL** | **111** | **99** | **12** | **89%** |

### Após Correções (47 testes de verificação)
| Plataforma | Testes | PASS | FAIL | Taxa |
|---|---|---|---|---|
| Hub Central | 4 | 4 | 0 | 100% |
| Aerial | 10 | 10 | 0 | 100% |
| Calculator | 3 | 3 | 0 | 100% |
| Precision | 10 | 10 | 0 | 100% |
| Equipment | 11 | 11 | 0 | 100% |
| Spectral | 9 | 9 | 0 | 100% |
| **TOTAL** | **47** | **47** | **0** | **100%** |

---

## Bugs Encontrados

### BUG-001 — Full Analysis retorna 500
- **Plataforma**: Aerial
- **Etapa**: POST /api/v1/analysis/full/{image_id}
- **Descrição**: Ao executar análise completa (full ML analysis) de uma imagem, o endpoint retorna HTTP 500 com erro `'NoneType' object is not callable`.
- **Esperado**: Retornar 200 com resultado de todas as análises (vegetação + saúde + cores).
- **Severidade**: Alto
- **Log**: `'NoneType' object is not callable` em `backend/modules/aerial/router.py` ~linha 1177
- **Causa provável**: Uma das funções ML (`segment_by_color` ou similar) está resolvendo como `None` apesar de `ML_AVAILABLE = True`. O import try/except não está definindo corretamente todas as funções.

---

### BUG-002 — Coluna ndvi_source ausente no banco (9 falhas)
- **Plataforma**: Precision
- **Etapa**: Múltiplas — snapshot, soil, zones, dashboard, delete, list snapshots
- **Descrição**: O modelo `FieldSnapshot` define a coluna `ndvi_source` (VARCHAR(50)), mas esta coluna não existe na tabela `field_snapshots` do SQLite. Toda query que toca `FieldSnapshot` falha com `sqlite3.OperationalError: no such column: field_snapshots.ndvi_source`.
- **Esperado**: Todas as operações relacionadas a snapshots, solo, zonas e dashboard devem funcionar normalmente.
- **Severidade**: Crítico
- **Endpoints afetados**:
  - `POST /precision/fields/{id}/snapshot` → 500
  - `GET /precision/fields/{id}/soil` → 500
  - `POST /precision/fields/{id}/zones/generate` → 500
  - `GET /precision/fields/{id}/snapshots` → 500
  - `GET /precision/dashboard/stats` → 500 (com campos existentes)
  - `DELETE /precision/fields/{id}` → 500 (cascade delete)
- **Causa raiz**: A coluna `ndvi_source` foi adicionada ao modelo SQLAlchemy mas nunca foi aplicada uma migration no SQLite. Como `init_db()` usa `create_all()`, ele cria tabelas que não existem mas **não altera tabelas existentes** para adicionar colunas novas.

---

### BUG-003 — Listar pedidos retorna 500
- **Plataforma**: Equipment
- **Etapa**: GET /api/v1/equipment/orders
- **Descrição**: Ao listar pedidos do usuário, o endpoint retorna HTTP 500. O modelo `Order` tem relacionamentos `items` e `status_history` com `lazy="joined"`, mas em contexto async do SQLAlchemy, o eager loading pode falhar com erro de greenlet.
- **Esperado**: Retornar 200 com lista de pedidos do usuário.
- **Severidade**: Alto
- **Causa provável**: A query `select(Order)` não usa `selectinload()` explícito para os relacionamentos. Em SQLAlchemy async, `lazy="joined"` pode não funcionar corretamente. O `create_order` funciona porque faz `db.refresh(order)`.

---

### BUG-004 — Detalhe do pedido retorna 500
- **Plataforma**: Equipment
- **Etapa**: GET /api/v1/equipment/orders/{id}
- **Descrição**: Ao buscar detalhes de um pedido específico, retorna HTTP 500. Mesma causa raiz do BUG-003.
- **Esperado**: Retornar 200 com detalhes do pedido incluindo items e histórico de status.
- **Severidade**: Alto
- **Causa provável**: Mesma do BUG-003 — falta `selectinload()` na query.

---

## Observações Adicionais

### Endpoints Inexistentes (não são bugs, mas lacunas)
- **Comparar projetos**: Não existe endpoint `GET /projects/compare`. A rota é interpretada como `/{project_id}` com "compare" como ID, retornando 422.
- **SoilGrids/ISRIC**: API externa retornando 503 (indisponibilidade temporária do serviço externo, não é bug do sistema).

### Comportamento Menor
- **Toggle favorite (Equipment)**: Re-adicionar favorito após remoção retorna 204 em vez de 201. Não é um crash, mas comportamento inconsistente.
- **Preferências de idioma (Hub)**: Aceita qualquer string como idioma sem validação. Pode ser intencional, mas uma allow-list seria mais segura.

---

## Metodologia
- 3 usuários criados via API (joao.silva, maria.santos, pedro.oliveira)
- Todos os testes executados via HTTP requests (Python requests)
- Tokens JWT obtidos via POST /auth/login (OAuth2 form data)
- Nenhum código fonte foi modificado durante os testes
