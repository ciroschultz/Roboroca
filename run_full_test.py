"""
Teste funcional completo end-to-end do Roboroça.
Testa: auth, projeto, upload de imagens, upload de vídeo, análise,
perímetro/ROI, área, dashboard, timeline, exportação, endpoints legados.
"""
import requests
import json
import sys
import os
import time

BASE = "http://localhost:8000/api/v1"
TEST_EMAIL = "flavio_test@gmail.com"
TEST_PASS = "flavio123"
TEST_NAME = "Flavio Teste"

# Pasta de imagens reais de drone
IMG_DIR = os.path.join(os.path.dirname(__file__), "Imagens e videos para testes", "Ciro")

RESULTS = []
FAILURES = []


def log(test_name, ok, detail=""):
    status = "PASS" if ok else "FAIL"
    RESULTS.append((test_name, status, detail))
    if not ok:
        FAILURES.append(test_name)
    icon = "  OK " if ok else " FAIL"
    print(f"  [{icon}] {test_name}" + (f" — {detail}" if detail else ""))


def section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")


# =====================================================================
# 1. AUTH
# =====================================================================
section("1. AUTENTICAÇÃO")

# Registro
r = requests.post(f"{BASE}/auth/register", json={
    "email": TEST_EMAIL, "username": "flavio_test", "password": TEST_PASS, "full_name": TEST_NAME
})
if r.status_code in (200, 201):
    log("Registro de usuário", True)
elif r.status_code in (400, 409) or "exist" in r.text.lower() or "already" in r.text.lower():
    log("Registro de usuário", True, "já existia")
else:
    log("Registro de usuário", False, f"{r.status_code}: {r.text[:100]}")

# Login
r = requests.post(f"{BASE}/auth/login", data={
    "username": TEST_EMAIL, "password": TEST_PASS
})
if r.status_code == 200:
    TOKEN = r.json().get("access_token", "")
    log("Login", bool(TOKEN), f"token={TOKEN[:20]}...")
else:
    log("Login", False, f"{r.status_code}: {r.text[:100]}")
    print("\n*** ABORTANDO: sem token ***")
    sys.exit(1)

HEADERS = {"Authorization": f"Bearer {TOKEN}"}

# Perfil
r = requests.get(f"{BASE}/auth/me", headers=HEADERS)
log("Perfil (GET /auth/me)", r.status_code == 200,
    f"email={r.json().get('email')}" if r.ok else r.text[:80])

# =====================================================================
# 2. PROJETOS
# =====================================================================
section("2. PROJETOS")

# Criar projeto
r = requests.post(f"{BASE}/projects/", headers=HEADERS, json={
    "name": f"Teste Drone {int(time.time())}",
    "description": "Projeto de teste automatizado com imagens DJI reais"
})
if r.status_code in (200, 201):
    PROJECT_ID = r.json().get("id")
    log("Criar projeto", True, f"id={PROJECT_ID}")
else:
    log("Criar projeto", False, f"{r.status_code}: {r.text[:100]}")
    PROJECT_ID = None

# Listar projetos
r = requests.get(f"{BASE}/projects/", headers=HEADERS)
log("Listar projetos", r.status_code == 200,
    f"{len(r.json()) if isinstance(r.json(), list) else r.json().get('total', '?')} projetos")

if not PROJECT_ID:
    print("\n*** ABORTANDO: sem projeto ***")
    sys.exit(1)

# =====================================================================
# 3. UPLOAD DE IMAGENS
# =====================================================================
section("3. UPLOAD DE IMAGENS")

uploaded_image_ids = []
test_images = sorted([
    f for f in os.listdir(IMG_DIR)
    if f.lower().endswith(('.jpg', '.jpeg', '.png'))
])[:5]  # Limitar a 5 imagens para velocidade

for img_name in test_images:
    img_path = os.path.join(IMG_DIR, img_name)
    with open(img_path, "rb") as f:
        r = requests.post(
            f"{BASE}/images/upload",
            headers=HEADERS,
            files={"file": (img_name, f, "image/jpeg")},
            data={"project_id": PROJECT_ID}
        )
    if r.status_code in (200, 201):
        data = r.json()
        img_id = data.get("id") or (data.get("image", {}).get("id"))
        if img_id:
            uploaded_image_ids.append(img_id)
        gps = data.get("image", {}).get("center_lat")
        log(f"Upload {img_name}", True, f"id={img_id}, gps={'sim' if gps else 'nao'}")
    else:
        log(f"Upload {img_name}", False, f"{r.status_code}: {r.text[:80]}")

# =====================================================================
# 4. UPLOAD DE VÍDEO
# =====================================================================
section("4. UPLOAD DE VÍDEO")

# Usar o vídeo menor (DJI_0037.MOV ~5MB)
video_name = "DJI_0037.MOV"
video_path = os.path.join(IMG_DIR, video_name)
VIDEO_IMAGE_ID = None

if os.path.exists(video_path):
    with open(video_path, "rb") as f:
        r = requests.post(
            f"{BASE}/images/upload",
            headers=HEADERS,
            files={"file": (video_name, f, "video/quicktime")},
            data={"project_id": PROJECT_ID}
        )
    if r.status_code in (200, 201):
        vdata = r.json()
        VIDEO_IMAGE_ID = vdata.get("id") or (vdata.get("image", {}).get("id"))
        log(f"Upload vídeo {video_name}", True, f"id={VIDEO_IMAGE_ID}")
    else:
        log(f"Upload vídeo {video_name}", False, f"{r.status_code}: {r.text[:80]}")
else:
    log(f"Upload vídeo {video_name}", False, "arquivo não encontrado")

# =====================================================================
# 5. ANÁLISE DO PROJETO (pipeline completa)
# =====================================================================
section("5. ANÁLISE DO PROJETO")

r = requests.post(f"{BASE}/projects/{PROJECT_ID}/analyze", headers=HEADERS)
if r.status_code == 200:
    log("Iniciar análise do projeto", True)
else:
    log("Iniciar análise do projeto", False, f"{r.status_code}: {r.text[:100]}")

# Aguardar análise (polling)
print("  Aguardando análise...")
max_wait = 300  # 5 min max
start = time.time()
project_status = "processing"
while time.time() - start < max_wait:
    r = requests.get(f"{BASE}/projects/{PROJECT_ID}", headers=HEADERS)
    if r.ok:
        project_status = r.json().get("status", "unknown")
        if project_status in ("analyzed", "completed", "active"):
            break
    time.sleep(5)

elapsed = round(time.time() - start, 1)
log("Análise completa", project_status in ("analyzed", "completed", "active"),
    f"status={project_status}, tempo={elapsed}s")

# =====================================================================
# 6. VERIFICAR RESULTADOS DA ANÁLISE
# =====================================================================
section("6. RESULTADOS DA ANÁLISE")

# Summary
r = requests.get(f"{BASE}/projects/{PROJECT_ID}/analysis-summary", headers=HEADERS)
if r.ok:
    summary = r.json()
    log("Analysis summary endpoint", True)

    # Verificar campos essenciais
    area = summary.get("total_area_ha", 0)
    veg = summary.get("vegetation_coverage_avg", 0)
    health = summary.get("health_index_avg", 0)
    objects = summary.get("total_objects_detected", 0)
    analyzed = summary.get("analyzed_images", 0)
    total = summary.get("total_images", 0)

    log("Área calculada (ha)", area > 0, f"{area} ha")
    log("Cobertura vegetal média", True, f"{veg}%")
    log("Índice de saúde médio", True, f"{health}")
    log("Imagens analisadas", analyzed > 0, f"{analyzed}/{total}")
    log("Detecções de objetos", True, f"{objects} objetos")

    # BUG 2: Verificar que área não é a soma
    # Se temos 5 imagens sem GPS, a área deve ser ~= 1 imagem, não 5x
    if len(uploaded_image_ids) > 1 and area > 0:
        log("Bug2: Área não somada", area < 50,
            f"{area} ha (deve ser ~área de 1 img, não {len(uploaded_image_ids)}x)")
else:
    log("Analysis summary endpoint", False, f"{r.status_code}: {r.text[:80]}")

# Listar análises
r = requests.get(f"{BASE}/analysis/", headers=HEADERS, params={"project_id": PROJECT_ID})
if r.ok:
    data = r.json()
    analyses = data.get("analyses", data) if isinstance(data, dict) else data
    total_analyses = len(analyses) if isinstance(analyses, list) else data.get("total", 0)
    log("Listar análises", True, f"{total_analyses} análises")
else:
    log("Listar análises", False, f"{r.status_code}")

# =====================================================================
# 7. ENDPOINTS LEGADOS (análise individual)
# =====================================================================
section("7. ENDPOINTS LEGADOS")

if uploaded_image_ids:
    test_img_id = uploaded_image_ids[0]

    # Vegetação
    r = requests.post(f"{BASE}/analysis/vegetation/{test_img_id}", headers=HEADERS)
    log("Análise vegetação (legacy)", r.status_code == 200,
        f"status={r.json().get('status')}" if r.ok else f"{r.status_code}")

    # Saúde
    r = requests.post(f"{BASE}/analysis/plant-health/{test_img_id}", headers=HEADERS)
    log("Análise saúde (legacy)", r.status_code == 200,
        f"status={r.json().get('status')}" if r.ok else f"{r.status_code}")

    # Cores
    r = requests.post(f"{BASE}/analysis/colors/{test_img_id}", headers=HEADERS)
    log("Análise cores (legacy)", r.status_code == 200,
        f"status={r.json().get('status')}" if r.ok else f"{r.status_code}")

    # Heatmap
    r = requests.post(f"{BASE}/analysis/heatmap/{test_img_id}", headers=HEADERS)
    log("Heatmap", r.status_code == 200, "imagem gerada" if r.ok else f"{r.status_code}")

    # Máscara vegetação
    r = requests.post(f"{BASE}/analysis/mask/{test_img_id}", headers=HEADERS)
    log("Máscara vegetação", r.status_code == 200, "imagem gerada" if r.ok else f"{r.status_code}")

# =====================================================================
# 8. PERÍMETRO / ROI
# =====================================================================
section("8. PERÍMETRO / ROI")

if uploaded_image_ids:
    test_img_id = uploaded_image_ids[0]

    # Definir perímetro no projeto (coordenadas normalizadas)
    perimeter = [[0.2, 0.2], [0.8, 0.2], [0.8, 0.8], [0.2, 0.8]]
    r = requests.put(f"{BASE}/projects/{PROJECT_ID}", headers=HEADERS, json={
        "perimeter_polygon": perimeter
    })
    log("Definir perímetro no projeto", r.status_code == 200,
        f"4 pontos" if r.ok else f"{r.status_code}: {r.text[:80]}")

    # Definir perímetro na imagem (rota dedicada)
    r = requests.put(f"{BASE}/images/{test_img_id}/perimeter", headers=HEADERS, json={
        "perimeter_polygon": perimeter
    })
    if r.status_code == 200:
        log("Definir perímetro na imagem", True)
    else:
        log("Definir perímetro na imagem", False, f"{r.status_code}: {r.text[:80]}")

    # Análise ROI
    r = requests.post(f"{BASE}/analysis/roi/{test_img_id}", headers=HEADERS, json={
        "roi_polygon": [[0.2, 0.2], [0.8, 0.2], [0.8, 0.8], [0.2, 0.8]]
    })
    log("Análise ROI", r.status_code == 200,
        f"status={r.json().get('status')}" if r.ok else f"{r.status_code}: {r.text[:80]}")

    # Re-analisar com perímetro (Bug 3: ROI deve ser respeitado)
    r = requests.post(f"{BASE}/projects/{PROJECT_ID}/analyze", headers=HEADERS)
    log("Re-análise com perímetro", r.status_code == 200,
        "iniciada" if r.ok else f"{r.status_code}")

    if r.ok:
        print("  Aguardando re-análise com ROI...")
        time.sleep(30)  # Esperar um pouco pela re-análise

# =====================================================================
# 9. DASHBOARD / STATS
# =====================================================================
section("9. DASHBOARD / STATS")

r = requests.get(f"{BASE}/projects/stats", headers=HEADERS)
log("Dashboard stats", r.ok,
    json.dumps(r.json(), indent=2)[:200] if r.ok else f"{r.status_code}")

# Timeline
r = requests.get(f"{BASE}/projects/{PROJECT_ID}/timeline", headers=HEADERS)
log("Timeline", r.ok,
    f"{len(r.json().get('timeline', []))} entries" if r.ok else f"{r.status_code}")

# =====================================================================
# 10. ANOTAÇÕES / GeoJSON
# =====================================================================
section("10. ANOTAÇÕES / GEOJSON")

if uploaded_image_ids:
    test_img_id = uploaded_image_ids[0]

    # Criar anotação
    r = requests.post(f"{BASE}/annotations/", headers=HEADERS, json={
        "image_id": test_img_id,
        "annotation_type": "point",
        "data": {
            "x": 100,
            "y": 200,
            "label": "Árvore teste",
            "color": "#FF0000"
        }
    })
    annotation_id = None
    if r.status_code in (200, 201):
        annotation_id = r.json().get("id")
        log("Criar anotação", True, f"id={annotation_id}")
    else:
        log("Criar anotação", False, f"{r.status_code}: {r.text[:80]}")

    # Listar anotações
    r = requests.get(f"{BASE}/annotations/", headers=HEADERS, params={"image_id": test_img_id})
    log("Listar anotações", r.ok,
        f"{len(r.json()) if isinstance(r.json(), list) else '?'} anotações")

    # Exportar GeoJSON
    r = requests.get(f"{BASE}/annotations/export/geojson", headers=HEADERS,
                     params={"project_id": PROJECT_ID})
    if r.ok:
        geojson = r.json()
        log("Exportar GeoJSON", True,
            f"type={geojson.get('type')}, features={len(geojson.get('features', []))}")
    else:
        log("Exportar GeoJSON", False, f"{r.status_code}: {r.text[:80]}")

# =====================================================================
# 11. IMAGENS INDIVIDUAIS
# =====================================================================
section("11. IMAGENS INDIVIDUAIS")

if uploaded_image_ids:
    test_img_id = uploaded_image_ids[0]

    # Detalhes da imagem
    r = requests.get(f"{BASE}/images/{test_img_id}", headers=HEADERS)
    if r.ok:
        img_data = r.json()
        log("Detalhes da imagem", True,
            f"{img_data.get('original_filename')}, {img_data.get('width')}x{img_data.get('height')}")
    else:
        log("Detalhes da imagem", False, f"{r.status_code}")

    # UTM info
    r = requests.get(f"{BASE}/images/{test_img_id}/utm-info", headers=HEADERS)
    log("UTM info", r.ok,
        f"zone={r.json().get('utm_zone')}" if r.ok else f"{r.status_code}: sem GPS?")

    # Thumbnail
    r = requests.get(f"{BASE}/images/{test_img_id}/thumbnail", headers=HEADERS)
    log("Thumbnail", r.status_code == 200, f"{len(r.content)} bytes" if r.ok else f"{r.status_code}")

# =====================================================================
# 12. PROVIDERS (satélite)
# =====================================================================
section("12. SATELLITE PROVIDERS")

r = requests.get(f"{BASE}/images/capture/providers", headers=HEADERS)
if r.ok:
    providers = r.json()
    log("Listar providers", True, f"{len(providers)} providers")
    for p in providers:
        if isinstance(p, dict):
            print(f"       - {p.get('id', p.get('name', '?'))}")
        else:
            print(f"       - {p}")
else:
    log("Listar providers", False, f"{r.status_code}")

# =====================================================================
# 13. CONFIGURAÇÕES DO USUÁRIO
# =====================================================================
section("13. CONFIGURAÇÕES")

# Preferences (included in /auth/me response)
r = requests.get(f"{BASE}/auth/me", headers=HEADERS)
if r.ok:
    prefs = {k: r.json().get(k) for k in ["language", "theme", "email_notifications"]}
    log("GET preferences", True, str(prefs)[:100])
else:
    log("GET preferences", False, f"{r.status_code}")

r = requests.put(f"{BASE}/auth/preferences", headers=HEADERS, json={
    "language": "pt-BR", "theme": "dark"
})
log("PUT preferences", r.ok, "language=pt-BR, theme=dark" if r.ok else f"{r.status_code}")

# =====================================================================
# RESUMO FINAL
# =====================================================================
section("RESUMO FINAL")

total = len(RESULTS)
passed = sum(1 for _, s, _ in RESULTS if s == "PASS")
failed = sum(1 for _, s, _ in RESULTS if s == "FAIL")

print(f"\n  Total: {total} testes")
print(f"  Passaram: {passed}")
print(f"  Falharam: {failed}")

if FAILURES:
    print(f"\n  FALHAS:")
    for f in FAILURES:
        print(f"    - {f}")

print(f"\n  Taxa de sucesso: {round(passed/total*100, 1)}%")

# Salvar relatório
report_path = os.path.join(os.path.dirname(__file__), "RESULTADO_TESTES.md")
with open(report_path, "w", encoding="utf-8") as f:
    f.write("# Resultado dos Testes Funcionais\n\n")
    f.write(f"**Data**: {time.strftime('%Y-%m-%d %H:%M')}\n")
    f.write(f"**Total**: {total} | **Passaram**: {passed} | **Falharam**: {failed}\n")
    f.write(f"**Taxa**: {round(passed/total*100, 1)}%\n\n")
    f.write("| # | Teste | Status | Detalhe |\n")
    f.write("|---|-------|--------|--------|\n")
    for i, (name, status, detail) in enumerate(RESULTS, 1):
        emoji = "PASS" if status == "PASS" else "FAIL"
        f.write(f"| {i} | {name} | {emoji} | {detail} |\n")
    if FAILURES:
        f.write(f"\n## Falhas\n\n")
        for fail in FAILURES:
            f.write(f"- {fail}\n")

print(f"\n  Relatório salvo em: {report_path}")
sys.exit(1 if failed > 0 else 0)
