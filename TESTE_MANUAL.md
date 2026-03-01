# Guia de Testes Manuais — Bugfixes Video, Area, ROI

## Pre-requisitos

```bash
# Terminal 1 — Backend (a partir da raiz do projeto)
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 — Frontend (a partir de frontend/)
cd frontend && npx next dev --port 3000
```

Acesse: http://localhost:3000

---

## 1. Criar usuario de teste

```bash
python create_test_user.py
```

Login: `flavio@gmail.com` / `flavio123`

---

## 2. Teste: Video Keyframes (Bug 1)

**Objetivo**: Verificar que keyframes cobrem inicio, meio e fim do video.

1. Criar novo projeto
2. Fazer upload de um video de drone (>1 min de duracao)
3. Clicar "Analisar Projeto"
4. Verificar nos resultados:
   - Os keyframes extraidos devem ter timestamps distribuidos ao longo de todo o video
   - Nao devem estar concentrados apenas nos primeiros segundos
   - Verificar no mosaico que as imagens sao visivelmente diferentes (inicio vs fim)

**Validacao via API**:
```bash
curl http://localhost:8000/api/projects/{id}/analysis-summary \
  -H "Authorization: Bearer {token}"
```

---

## 3. Teste: Calculo de Area (Bug 2)

**Objetivo**: Verificar que a area nao e somada para imagens sobrepostas.

### 3a. Multiplas imagens sem GPS
1. Criar projeto
2. Upload de 3-5 imagens de drone (sem GPS nos metadados)
3. Analisar projeto
4. Verificar no resumo: `total_area_ha` deve ser a area da MAIOR imagem, nao a soma

### 3b. Contagem de arvores
1. No mesmo projeto, verificar `total_objects_detected`
2. Deve ser o MAX de uma unica imagem, nao a soma de todas

**Validacao via API**:
```bash
curl http://localhost:8000/api/projects/{id}/analysis-summary \
  -H "Authorization: Bearer {token}" | python -m json.tool
```

Verificar: `total_area_ha`, `total_objects_detected`, `objects_by_class`

---

## 4. Teste: ROI Mask (Bug 3)

**Objetivo**: Verificar que analises ML respeitam o perimetro desenhado.

### 4a. Pipeline principal
1. Criar projeto com 1 imagem de drone
2. Analisar projeto (sem perimetro) — anotar resultados
3. Desenhar perimetro (poligono) sobre uma area menor da imagem
4. Re-analisar projeto
5. Verificar que os resultados DIFEREM:
   - `vegetation_percentage` deve mudar
   - `health_index` deve mudar
   - Deteccoes YOLO devem ser filtradas (apenas as dentro do perimetro)
   - Segmentacao deve ter percentuais diferentes

### 4b. Endpoints legados
```bash
# Analise de vegetacao
curl -X POST http://localhost:8000/api/analysis/vegetation/{image_id} \
  -H "Authorization: Bearer {token}"

# Saude das plantas
curl -X POST http://localhost:8000/api/analysis/plant-health/{image_id} \
  -H "Authorization: Bearer {token}"

# Cores
curl -X POST http://localhost:8000/api/analysis/colors/{image_id} \
  -H "Authorization: Bearer {token}"
```

Para cada endpoint: se a imagem tem perimetro, os resultados devem ser restritos a ele.

---

## 5. Testes automatizados (verificacao rapida)

```bash
# Backend — 119 testes
python -m pytest backend/tests/ -x -q

# Frontend — 68 testes
cd frontend && npx jest --passWithNoTests
```

---

## Checklist de Validacao

- [ ] Video: keyframes distribuidos ao longo de todo o video
- [ ] Area: nao soma areas de multiplas imagens sem GPS
- [ ] Area: contagem de arvores usa MAX (nao SUM)
- [ ] ROI: vegetacao muda com perimetro vs sem perimetro
- [ ] ROI: deteccoes YOLO filtradas pelo perimetro
- [ ] ROI: endpoints legados respeitam perimetro
- [ ] Todos os 119 testes backend passando
- [ ] Usuario flavio@gmail.com criado com sucesso
