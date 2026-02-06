# Bugs Pendentes - Roboroça

## Data: 2026-02-05

## Problemas Identificados

### 1. Área mostra 1 ha em vez do valor calculado
- **Onde**: Perfil do projeto, campo "Área Analisada"
- **Esperado**: Mostrar área calculada (ex: 1.8 ha baseado em GSD 3cm/pixel)
- **Atual**: Mostra sempre 1 ha
- **Arquivos relacionados**:
  - `frontend/src/components/ProjectProfile.tsx` (linha ~422)
  - `frontend/src/app/page.tsx` (linha ~174-186)
  - `backend/api/routes/projects.py` (endpoint analysis-summary)

### 2. Re-análise zera contagem de árvores
- **Onde**: Ao clicar em "Re-analisar" no perfil do projeto
- **Esperado**: Manter ou atualizar contagem de árvores
- **Atual**: Volta para 0 árvores detectadas
- **Arquivos relacionados**:
  - `backend/api/routes/projects.py` (função `analyze_project`)
  - `frontend/src/components/ProjectProfile.tsx` (botão re-analisar)

### 3. Novos projetos mostram 0 árvores
- **Onde**: Ao criar e analisar um novo projeto
- **Esperado**: Detectar árvores após análise
- **Atual**: Mostra 0 árvores detectadas
- **Possíveis causas**:
  - Análise pode não estar executando `count_trees_by_segmentation`
  - Resultados podem não estar sendo salvos corretamente
  - Frontend pode não estar lendo dados corretos

## O que foi corrigido nesta sessão

1. **Criado `tree_counter.py`**: Módulo independente para contagem de árvores usando ExG
2. **Corrigido serialização JSON**: Convertido `numpy.float32` para `float` Python
3. **Separado imports ML**: `tree_counter` agora importa independente de YOLO/torch
4. **Testado com sucesso**: Análise direta via Python detectou 668-1738 árvores por projeto

## Verificação para amanhã

```bash
# 1. Verificar se análises existentes têm tree_count
cd C:/Users/ciroa/Roboroça
source venv/Scripts/activate
python -c "
import sqlite3
conn = sqlite3.connect('roboroca.db')
cur = conn.cursor()
cur.execute('''
    SELECT a.id, i.project_id,
           json_extract(a.results, \"$.tree_count.total_trees\") as trees
    FROM analyses a
    JOIN images i ON a.image_id = i.id
    WHERE a.analysis_type = 'full_report' AND a.status = 'completed'
    ORDER BY a.id DESC LIMIT 10
''')
for row in cur.fetchall():
    print(f'Análise {row[0]} | Projeto {row[1]} | Árvores: {row[2]}')
conn.close()
"

# 2. Testar análise nova
# - Criar projeto novo
# - Upload de imagem
# - Disparar análise
# - Verificar se tree_count aparece nos resultados
```

## Usuário de teste
- Email: ciro@gmail.com
- Projetos com dados: 8, 9, 12, 14, 16, 18-21
