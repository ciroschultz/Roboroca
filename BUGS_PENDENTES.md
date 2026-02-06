# Bugs Pendentes - Roboroça

## Status: Corrigidos em 2026-02-06

### Bug 1: Área mostra 1 ha em vez de 1.8 ha - CORRIGIDO
- **Causa**: Hook `useCountUp` no StatCard usava `Math.floor()` que arredondava 1.8 para 1
- **Solução**: Modificado para preservar 1 casa decimal quando o valor original tem decimais
- **Commit**: `0275b1c`

### Bug 2: Re-análise zera contagem de árvores - CORRIGIDO
- **Causa**: Quando status do projeto mudava para "processing", o frontend não carregava os resultados existentes
- **Solução**: Agora carrega resultados para projetos com status "completed" OU "processing"
- **Commit**: `0275b1c`

### Bug 3: Novos projetos mostram 0 árvores - CORRIGIDO
- **Causa**: Servidor estava usando código antigo onde `count_trees_by_segmentation` era `None`
- **Solução**: Reiniciar o servidor após deploy carrega o código correto
- **Verificação**: Análise do projeto 25 (talhão 4) detectou 668 árvores com sucesso

## Resumo das Correções

1. **tree_counter.py**: Módulo de contagem de árvores usando ExG
2. **StatCard.tsx**: Hook `useCountUp` preserva decimais
3. **page.tsx**: Carrega resultados mesmo em status "processing"

## Verificação

```bash
# Backend rodando
curl -s http://localhost:8000/api/v1/docs | head -3

# Frontend rodando
curl -s http://localhost:3000 | head -3

# Verificar análises com contagem de árvores
cd C:/Users/ciroa/Roboroça && source venv/Scripts/activate
python -c "
import sqlite3
conn = sqlite3.connect('roboroca.db')
cur = conn.cursor()
cur.execute('''
    SELECT p.id, p.name, p.total_area_ha,
           SUM(json_extract(a.results, \"$.tree_count.total_trees\")) as trees
    FROM projects p
    JOIN images i ON i.project_id = p.id
    JOIN analyses a ON a.image_id = i.id
    WHERE a.status = 'completed'
    GROUP BY p.id
    ORDER BY p.id DESC LIMIT 10
''')
for row in cur.fetchall():
    print(f'{row[1]}: {row[2]} ha, {row[3]} árvores')
conn.close()
"
```

## Histórico de Commits

1. `b9e8f5b` - feat: Add tree counting by vegetation segmentation
2. `80c12ae` - docs: Add pending bugs documentation
3. `0275b1c` - fix: Correct area display and preserve data during re-analysis
