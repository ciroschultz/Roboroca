# Novos Endpoints Adicionados

## Resumo
Dois novos endpoints foram adicionados ao arquivo `backend/api/routes/projects.py`:
- `GET /api/projects/stats` - Estatísticas do dashboard
- `GET /api/projects/comparison` - Comparação de projetos

## Detalhes

### 1. GET /api/projects/stats

**Linha**: 439-515
**Posição**: Após `GET /` (listagem) e antes de `POST /` (criação)

**Retorno**:
```json
{
  "total_projects": int,
  "total_images": int,
  "total_analyses": int,
  "total_area_ha": float,
  "projects_by_status": {
    "pending": int,
    "processing": int,
    "completed": int,
    "error": int
  },
  "analyses_by_type": {
    "full_report": int,
    "video_analysis": int,
    "enriched_data": int
  }
}
```

**Funcionalidade**:
- Conta total de projetos do usuário
- Conta total de imagens (join com Project)
- Conta total de análises (join Image -> Project)
- Soma área total em hectares
- Agrupa projetos por status (pending, processing, completed, error)
- Agrupa análises por tipo

**Queries SQLAlchemy**:
- `func.count(Project.id)` para contar projetos
- `func.count(Image.id)` com join para contar imagens
- `func.count(Analysis.id)` com joins múltiplos para contar análises
- `func.sum(Project.total_area_ha)` para área total
- `group_by(Project.status)` para distribuição por status
- `group_by(Analysis.analysis_type)` para distribuição por tipo

---

### 2. GET /api/projects/comparison

**Linha**: 518-619
**Posição**: Após `GET /stats` e antes de `POST /`

**Retorno**:
```json
{
  "projects": [
    {
      "id": int,
      "name": str,
      "status": str,
      "image_count": int,
      "total_area_ha": float,
      "vegetation_coverage_avg": float,
      "health_index_avg": float,
      "total_trees": int,
      "created_at": str (ISO 8601)
    }
  ]
}
```

**Funcionalidade**:
- Lista todos os projetos do usuário
- Para cada projeto:
  - Conta imagens (via relationship `project.images`)
  - Busca análises do tipo `full_report` completas
  - Calcula média de `vegetation_coverage.vegetation_percentage`
  - Calcula média de `vegetation_health.health_index`
  - Soma `object_detection.by_class.arvore` ou `tree_count.total_trees`

**Extração de Métricas**:
- Cobertura vegetal: `results['vegetation_coverage']['vegetation_percentage']` ou `results['coverage']['vegetation_percentage']`
- Índice de saúde: `results['vegetation_health']['health_index']` ou `results['health']['health_index']`
- Árvores: `results['object_detection']['by_class']['arvore']` ou `results['tree_count']['total_trees']`

**Queries SQLAlchemy**:
- `selectinload(Project.images)` para carregar imagens em uma query
- `select(Analysis).join(Image)` com filtros por `project_id` e `analysis_type`
- Loop sobre projetos e análises para calcular agregados

---

## Ordem das Rotas

A ordem final das rotas em `projects.py` é:

1. `GET /` (linha 389) - Listar projetos
2. `GET /stats` (linha 439) - **NOVO** - Estatísticas do dashboard
3. `GET /comparison` (linha 518) - **NOVO** - Comparação de projetos
4. `POST /` (linha 622) - Criar projeto
5. `GET /{project_id}` (linha 656) - Obter projeto por ID
6. `PUT /{project_id}` - Atualizar projeto
7. `DELETE /{project_id}` - Excluir projeto
8. `POST /{project_id}/analyze` - Analisar projeto
9. `GET /{project_id}/analysis-summary` - Resumo de análises
10. `GET /{project_id}/enriched-data` - Dados enriquecidos

**Nota importante**: Os novos endpoints `/stats` e `/comparison` foram posicionados ANTES das rotas com `{project_id}` para evitar conflitos de roteamento. FastAPI faz match de rotas na ordem em que são definidas, então rotas específicas (como `/stats`) devem vir antes de rotas com path parameters (como `/{project_id}`).

---

## Testes

Para verificar que os endpoints foram adicionados corretamente:

```bash
# Testar import
python test_routes_import.py

# Ou diretamente
python -c "from backend.api.routes.projects import router; print(f'Routes: {len(router.routes)}')"
```

Para testar os endpoints com o servidor rodando:

```bash
# Stats
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/api/projects/stats

# Comparison
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/api/projects/comparison
```

---

## Imports Utilizados

Todos os imports necessários já estavam presentes em `projects.py`:
- `select, func` do SQLAlchemy (linha 17)
- `Project, Image, Analysis` models (linhas 21-23)
- `get_current_user, get_db` dependencies (linhas 19, 30)
- `selectinload` do SQLAlchemy ORM (importado localmente dentro das funções)

Não foi necessário adicionar novos imports.
