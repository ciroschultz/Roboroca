"""
Auditoria Externa Completa — Testes Manuais como Usuário "Carlos"
Simula um usuário real interagindo com todos os módulos da API Roboroça.
Gera relatório completo em RELATORIO_AUDITORIA_CARLOS.md
"""
import requests
import json
import sys
import os
import time
from datetime import datetime

BASE = "http://localhost:8000/api/v1"
TEST_EMAIL = "carlos@gmail.com"
TEST_USER = "carlos"
TEST_PASS = "123123"
TEST_NAME = "Carlos Silva"

RESULTS = []
FAILURES = []
TOKEN = None
HEADERS = {}

# IDs capturados durante os testes
PROJECT_ID = None
API_KEY_RAW = None
API_KEY_ID = None
CALC_ID = None
FIELD_ID = None
PRESCRIPTION_ID = None
SAMPLE_ID = None
CART_ITEM_ID = None
PRODUCT_ID = None


def log(test_name, ok, detail="", category=""):
    status = "PASS" if ok else "FAIL"
    RESULTS.append((test_name, status, detail, category))
    if not ok:
        FAILURES.append(test_name)
    icon = "  OK " if ok else " FAIL"
    print(f"  [{icon}] {test_name}" + (f" -- {detail}" if detail else ""))


def section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")


def safe_json(r):
    try:
        return r.json()
    except Exception:
        return {}


# =====================================================================
# 1. HEALTH & METRICS
# =====================================================================
section("1. HEALTH & METRICS")

r = requests.get(f"{BASE}/health")
log("GET /health", r.status_code == 200,
    f"status={safe_json(r).get('status')}", "Health")

r = requests.get(f"{BASE}/health/ready")
log("GET /health/ready", r.status_code == 200,
    f"db={safe_json(r).get('database')}" if r.ok else f"{r.status_code}", "Health")

r = requests.get(f"{BASE}/metrics")
log("GET /metrics", r.status_code == 200,
    f"{len(r.text)} bytes" if r.ok else f"{r.status_code}", "Health")

# =====================================================================
# 2. AUTH — HAPPY PATH
# =====================================================================
section("2. AUTH — HAPPY PATH")

# Register
r = requests.post(f"{BASE}/auth/register", json={
    "email": TEST_EMAIL, "username": TEST_USER,
    "password": TEST_PASS, "full_name": TEST_NAME
})
if r.status_code == 201:
    log("Registro carlos", True, f"id={safe_json(r).get('id')}", "Auth")
elif r.status_code == 400 and ("exist" in r.text.lower() or "já" in r.text.lower()):
    log("Registro carlos", True, "já existia", "Auth")
else:
    log("Registro carlos", False, f"{r.status_code}: {r.text[:100]}", "Auth")

# Login
r = requests.post(f"{BASE}/auth/login", data={
    "username": TEST_EMAIL, "password": TEST_PASS
})
if r.status_code == 200:
    TOKEN = safe_json(r).get("access_token", "")
    log("Login carlos", bool(TOKEN), f"token={TOKEN[:20]}...", "Auth")
else:
    log("Login carlos", False, f"{r.status_code}: {r.text[:100]}", "Auth")
    print("\n*** ABORTANDO: sem token ***")
    sys.exit(1)

HEADERS = {"Authorization": f"Bearer {TOKEN}"}

# GET /auth/me
r = requests.get(f"{BASE}/auth/me", headers=HEADERS)
me_data = safe_json(r)
log("GET /auth/me", r.status_code == 200,
    f"email={me_data.get('email')}, username={me_data.get('username')}", "Auth")

# PUT /auth/me (update profile)
r = requests.put(f"{BASE}/auth/me", headers=HEADERS, json={
    "full_name": "Carlos Silva Auditor"
})
log("PUT /auth/me (update name)", r.status_code == 200,
    f"name={safe_json(r).get('full_name')}" if r.ok else f"{r.status_code}", "Auth")

# PUT /auth/preferences
r = requests.put(f"{BASE}/auth/preferences", headers=HEADERS, json={
    "language": "pt-BR", "theme": "dark", "email_notifications": True
})
log("PUT /auth/preferences", r.status_code == 200,
    "lang=pt-BR, theme=dark" if r.ok else f"{r.status_code}", "Auth")

# POST /auth/password/change
r = requests.post(f"{BASE}/auth/password/change", headers=HEADERS, json={
    "current_password": TEST_PASS, "new_password": "456456"
})
log("Trocar senha (123123->456456)", r.status_code == 200,
    safe_json(r).get("message", "") if r.ok else f"{r.status_code}", "Auth")

# Login com nova senha
r = requests.post(f"{BASE}/auth/login", data={
    "username": TEST_EMAIL, "password": "456456"
})
if r.status_code == 200:
    TOKEN = safe_json(r).get("access_token", "")
    HEADERS = {"Authorization": f"Bearer {TOKEN}"}
    log("Login com nova senha", True, "OK", "Auth")
else:
    log("Login com nova senha", False, f"{r.status_code}", "Auth")

# Trocar senha de volta
r = requests.post(f"{BASE}/auth/password/change", headers=HEADERS, json={
    "current_password": "456456", "new_password": TEST_PASS
})
log("Restaurar senha original", r.status_code == 200, "", "Auth")

# Re-login com senha original para garantir
r = requests.post(f"{BASE}/auth/login", data={
    "username": TEST_EMAIL, "password": TEST_PASS
})
if r.status_code == 200:
    TOKEN = safe_json(r).get("access_token", "")
    HEADERS = {"Authorization": f"Bearer {TOKEN}"}

# POST /auth/password/reset-request
r = requests.post(f"{BASE}/auth/password/reset-request", json={
    "email": TEST_EMAIL
})
log("POST password/reset-request", r.status_code == 200,
    safe_json(r).get("message", "")[:60] if r.ok else f"{r.status_code}", "Auth")

# =====================================================================
# 3. AUTH — EDGE CASES
# =====================================================================
section("3. AUTH — EDGE CASES")

# Duplicate email
r = requests.post(f"{BASE}/auth/register", json={
    "email": TEST_EMAIL, "username": "carlos_dup",
    "password": TEST_PASS, "full_name": "Dup"
})
log("Registro email duplicado -> 400", r.status_code == 400,
    f"got {r.status_code}", "Auth Edge")

# Duplicate username
r = requests.post(f"{BASE}/auth/register", json={
    "email": "outro@gmail.com", "username": TEST_USER,
    "password": TEST_PASS, "full_name": "Dup"
})
log("Registro username duplicado -> 400", r.status_code == 400,
    f"got {r.status_code}", "Auth Edge")

# Invalid email
r = requests.post(f"{BASE}/auth/register", json={
    "email": "nao-eh-email", "username": "teste_inv",
    "password": TEST_PASS, "full_name": "Inv"
})
log("Registro email invalido -> 422", r.status_code == 422,
    f"got {r.status_code}", "Auth Edge")

# Short password
r = requests.post(f"{BASE}/auth/register", json={
    "email": "short@gmail.com", "username": "shortpw",
    "password": "12", "full_name": "Short"
})
log("Registro senha curta -> 422", r.status_code == 422,
    f"got {r.status_code}", "Auth Edge")

# Wrong password login
r = requests.post(f"{BASE}/auth/login", data={
    "username": TEST_EMAIL, "password": "errada123"
})
log("Login senha errada -> 401", r.status_code == 401,
    f"got {r.status_code}", "Auth Edge")

# No token access
r = requests.get(f"{BASE}/auth/me")
log("GET /auth/me sem token -> 401", r.status_code == 401,
    f"got {r.status_code}", "Auth Edge")

# =====================================================================
# 4. PROJETOS CRUD
# =====================================================================
section("4. PROJETOS CRUD")

# Create project
r = requests.post(f"{BASE}/projects/", headers=HEADERS, json={
    "name": f"Fazenda Auditoria {int(time.time())}",
    "description": "Projeto criado durante auditoria externa por Carlos"
})
if r.status_code in (200, 201):
    PROJECT_ID = safe_json(r).get("id")
    log("Criar projeto", True, f"id={PROJECT_ID}", "Projetos")
else:
    log("Criar projeto", False, f"{r.status_code}: {r.text[:100]}", "Projetos")

# List projects
r = requests.get(f"{BASE}/projects/", headers=HEADERS)
data = safe_json(r)
count = len(data) if isinstance(data, list) else data.get("total", "?")
log("Listar projetos", r.status_code == 200, f"{count} projetos", "Projetos")

# Get project
if PROJECT_ID:
    r = requests.get(f"{BASE}/projects/{PROJECT_ID}", headers=HEADERS)
    log("GET projeto por ID", r.status_code == 200,
        f"name={safe_json(r).get('name')}" if r.ok else f"{r.status_code}", "Projetos")

# Update project
if PROJECT_ID:
    r = requests.put(f"{BASE}/projects/{PROJECT_ID}", headers=HEADERS, json={
        "description": "Descricao atualizada pelo auditor Carlos"
    })
    log("PUT atualizar projeto", r.status_code == 200,
        "descricao atualizada" if r.ok else f"{r.status_code}", "Projetos")

# Stats
r = requests.get(f"{BASE}/projects/stats", headers=HEADERS)
log("GET /projects/stats", r.status_code == 200,
    json.dumps(safe_json(r))[:80] if r.ok else f"{r.status_code}", "Projetos")

# Timeline
if PROJECT_ID:
    r = requests.get(f"{BASE}/projects/{PROJECT_ID}/timeline", headers=HEADERS)
    tl = safe_json(r)
    entries = len(tl.get("timeline", tl.get("entries", []))) if isinstance(tl, dict) else 0
    log("GET /projects/{id}/timeline", r.status_code == 200,
        f"{entries} entries", "Projetos")

# 404 on non-existent project
r = requests.get(f"{BASE}/projects/99999", headers=HEADERS)
log("GET projeto inexistente -> 404", r.status_code == 404,
    f"got {r.status_code}", "Projetos")

# 401 without token
r = requests.get(f"{BASE}/projects/")
log("GET projetos sem token -> 401", r.status_code == 401,
    f"got {r.status_code}", "Projetos")

# =====================================================================
# 5. API KEYS
# =====================================================================
section("5. API KEYS")

# Create API key
r = requests.post(f"{BASE}/api-keys/", headers=HEADERS, json={
    "name": "Chave Auditoria Carlos",
    "scopes": ["read", "write"]
})
if r.status_code in (200, 201):
    key_data = safe_json(r)
    API_KEY_RAW = key_data.get("key") or key_data.get("raw_key") or key_data.get("api_key")
    API_KEY_ID = key_data.get("id") or key_data.get("key_id")
    log("Criar API Key", True, f"id={API_KEY_ID}, key={str(API_KEY_RAW)[:15]}...", "API Keys")
else:
    log("Criar API Key", False, f"{r.status_code}: {r.text[:100]}", "API Keys")

# List API keys
r = requests.get(f"{BASE}/api-keys/", headers=HEADERS)
log("Listar API Keys", r.status_code == 200,
    f"{len(safe_json(r)) if isinstance(safe_json(r), list) else '?'} keys", "API Keys")

# Auth via API Key
if API_KEY_RAW:
    r = requests.get(f"{BASE}/auth/me", headers={"X-API-Key": API_KEY_RAW})
    log("Auth via X-API-Key header", r.status_code == 200,
        f"email={safe_json(r).get('email')}" if r.ok else f"{r.status_code}: {r.text[:60]}", "API Keys")

# Delete API key
if API_KEY_ID:
    r = requests.delete(f"{BASE}/api-keys/{API_KEY_ID}", headers=HEADERS)
    log("Deletar API Key", r.status_code in (200, 204),
        f"status={r.status_code}", "API Keys")

# =====================================================================
# 6. CALCULATOR
# =====================================================================
section("6. CALCULATOR")

# Create calculation
r = requests.post(f"{BASE}/calculator/calculations", headers=HEADERS, json={
    "calc_type": "area",
    "title": "Calculo Area Fazenda",
    "inputs": {"length": 500, "width": 300},
    "result": {"value": 150000, "unit": "m2"},
    "result_summary": "Area total: 150.000 m2 (15 ha)"
})
if r.status_code in (200, 201):
    CALC_ID = safe_json(r).get("id")
    log("Criar calculo", True, f"id={CALC_ID}", "Calculator")
else:
    log("Criar calculo", False, f"{r.status_code}: {r.text[:100]}", "Calculator")

# List calculations
r = requests.get(f"{BASE}/calculator/calculations", headers=HEADERS)
log("Listar calculos", r.status_code == 200,
    f"count={len(safe_json(r)) if isinstance(safe_json(r), list) else safe_json(r).get('total', '?')}", "Calculator")

# Get calculation
if CALC_ID:
    r = requests.get(f"{BASE}/calculator/calculations/{CALC_ID}", headers=HEADERS)
    log("GET calculo por ID", r.status_code == 200,
        f"title={safe_json(r).get('title')}" if r.ok else f"{r.status_code}", "Calculator")

# Stats
r = requests.get(f"{BASE}/calculator/calculations/stats", headers=HEADERS)
log("GET /calculator/stats", r.status_code == 200,
    json.dumps(safe_json(r))[:80] if r.ok else f"{r.status_code}", "Calculator")

# Delete calculation
if CALC_ID:
    r = requests.delete(f"{BASE}/calculator/calculations/{CALC_ID}", headers=HEADERS)
    log("Deletar calculo", r.status_code in (200, 204),
        f"status={r.status_code}", "Calculator")

# =====================================================================
# 7. EQUIPMENT
# =====================================================================
section("7. EQUIPMENT")

# List products (public)
r = requests.get(f"{BASE}/equipment/products")
products = safe_json(r)
product_list = products.get("items", products) if isinstance(products, dict) else products
log("Listar produtos (publico)", r.status_code == 200,
    f"{len(product_list) if isinstance(product_list, list) else '?'} produtos", "Equipment")

# Get first product ID
if isinstance(product_list, list) and len(product_list) > 0:
    PRODUCT_ID = product_list[0].get("id")

# Filter products by category
r = requests.get(f"{BASE}/equipment/products", params={"category": "drone"})
log("Filtrar produtos por categoria", r.status_code == 200,
    f"status={r.status_code}", "Equipment")

# Search products
r = requests.get(f"{BASE}/equipment/products", params={"search": "sensor"})
log("Buscar produtos (search=sensor)", r.status_code == 200,
    f"status={r.status_code}", "Equipment")

# Get product by ID
if PRODUCT_ID:
    r = requests.get(f"{BASE}/equipment/products/{PRODUCT_ID}")
    log("GET produto por ID", r.status_code == 200,
        f"name={safe_json(r).get('name')}" if r.ok else f"{r.status_code}", "Equipment")

# Cart — add item
if PRODUCT_ID:
    r = requests.post(f"{BASE}/equipment/cart", headers=HEADERS, json={
        "product_id": PRODUCT_ID, "quantity": 2
    })
    if r.status_code in (200, 201):
        cart_data = safe_json(r)
        items = cart_data.get("items", [cart_data]) if isinstance(cart_data, dict) else [cart_data]
        if items and isinstance(items[0], dict):
            CART_ITEM_ID = items[0].get("id") or items[-1].get("id")
        log("Adicionar ao carrinho", True, f"item_id={CART_ITEM_ID}", "Equipment")
    else:
        log("Adicionar ao carrinho", False, f"{r.status_code}: {r.text[:80]}", "Equipment")

# Cart — get
r = requests.get(f"{BASE}/equipment/cart", headers=HEADERS)
log("GET carrinho", r.status_code == 200,
    f"items={len(safe_json(r)) if isinstance(safe_json(r), list) else '?'}" if r.ok else f"{r.status_code}", "Equipment")

# Favorites — toggle
if PRODUCT_ID:
    r = requests.post(f"{BASE}/equipment/favorites/{PRODUCT_ID}", headers=HEADERS)
    log("Toggle favorito", r.status_code in (200, 201),
        f"status={r.status_code}", "Equipment")

# Favorites — list
r = requests.get(f"{BASE}/equipment/favorites", headers=HEADERS)
log("Listar favoritos", r.status_code == 200,
    f"count={len(safe_json(r)) if isinstance(safe_json(r), list) else '?'}", "Equipment")

# =====================================================================
# 8. PRECISION AGRICULTURE
# =====================================================================
section("8. PRECISION AGRICULTURE")

# Dashboard stats
r = requests.get(f"{BASE}/precision/dashboard/stats", headers=HEADERS)
log("GET /precision/dashboard/stats", r.status_code == 200,
    json.dumps(safe_json(r))[:80] if r.ok else f"{r.status_code}", "Precision")

# Create field
r = requests.post(f"{BASE}/precision/fields", headers=HEADERS, json={
    "name": "Talhao Norte",
    "crop": "soja",
    "area_ha": 50.5,
    "center_lat": -23.45,
    "center_lon": -46.45,
    "geometry": {"type": "Polygon", "coordinates": [[[-46.5, -23.5], [-46.4, -23.5], [-46.4, -23.4], [-46.5, -23.4], [-46.5, -23.5]]]}
})
if r.status_code in (200, 201):
    FIELD_ID = safe_json(r).get("id")
    log("Criar talhao (field)", True, f"id={FIELD_ID}", "Precision")
else:
    log("Criar talhao (field)", False, f"{r.status_code}: {r.text[:100]}", "Precision")

# List fields
r = requests.get(f"{BASE}/precision/fields", headers=HEADERS)
log("Listar talhoes", r.status_code == 200,
    f"count={len(safe_json(r)) if isinstance(safe_json(r), list) else '?'}", "Precision")

# Get field
if FIELD_ID:
    r = requests.get(f"{BASE}/precision/fields/{FIELD_ID}", headers=HEADERS)
    log("GET talhao por ID", r.status_code == 200,
        f"name={safe_json(r).get('name')}" if r.ok else f"{r.status_code}", "Precision")

# Update field
if FIELD_ID:
    r = requests.put(f"{BASE}/precision/fields/{FIELD_ID}", headers=HEADERS, json={
        "name": "Talhao Norte Atualizado"
    })
    log("PUT atualizar talhao", r.status_code == 200,
        f"name={safe_json(r).get('name')}" if r.ok else f"{r.status_code}", "Precision")

# Snapshot
if FIELD_ID:
    r = requests.post(f"{BASE}/precision/fields/{FIELD_ID}/snapshot", headers=HEADERS)
    log("Capturar snapshot", r.status_code in (200, 201),
        f"status={r.status_code}" if r.ok else f"{r.status_code}: {r.text[:60]}", "Precision")

# Create prescription
if FIELD_ID:
    r = requests.post(f"{BASE}/precision/prescriptions", headers=HEADERS, json={
        "field_id": FIELD_ID,
        "type": "fertilizer",
        "product_name": "NPK 10-20-10",
        "rate_per_ha": 200,
        "total_quantity": 10100
    })
    if r.status_code in (200, 201):
        PRESCRIPTION_ID = safe_json(r).get("id")
        log("Criar prescricao", True, f"id={PRESCRIPTION_ID}", "Precision")
    else:
        log("Criar prescricao", False, f"{r.status_code}: {r.text[:100]}", "Precision")

# List prescriptions
r = requests.get(f"{BASE}/precision/prescriptions", headers=HEADERS)
log("Listar prescricoes", r.status_code == 200,
    f"count={len(safe_json(r)) if isinstance(safe_json(r), list) else '?'}", "Precision")

# Delete field
if FIELD_ID:
    r = requests.delete(f"{BASE}/precision/fields/{FIELD_ID}", headers=HEADERS)
    log("Deletar talhao", r.status_code in (200, 204),
        f"status={r.status_code}", "Precision")

# =====================================================================
# 9. SPECTRAL
# =====================================================================
section("9. SPECTRAL")

# Dashboard stats
r = requests.get(f"{BASE}/spectral/dashboard/stats", headers=HEADERS)
log("GET /spectral/dashboard/stats", r.status_code == 200,
    json.dumps(safe_json(r))[:80] if r.ok else f"{r.status_code}", "Spectral")

# Create sample
r = requests.post(f"{BASE}/spectral/samples", headers=HEADERS, json={
    "sample_code": "EUC-001",
    "species": "Eucalyptus grandis",
    "technique": "raman"
})
if r.status_code in (200, 201):
    SAMPLE_ID = safe_json(r).get("id")
    log("Criar amostra espectral", True, f"id={SAMPLE_ID}", "Spectral")
else:
    log("Criar amostra espectral", False, f"{r.status_code}: {r.text[:100]}", "Spectral")

# List samples
r = requests.get(f"{BASE}/spectral/samples", headers=HEADERS)
log("Listar amostras", r.status_code == 200,
    f"count={len(safe_json(r)) if isinstance(safe_json(r), list) else safe_json(r).get('total', '?')}", "Spectral")

# Get sample
if SAMPLE_ID:
    r = requests.get(f"{BASE}/spectral/samples/{SAMPLE_ID}", headers=HEADERS)
    log("GET amostra por ID", r.status_code == 200,
        f"name={safe_json(r).get('name')}" if r.ok else f"{r.status_code}", "Spectral")

# Update sample
if SAMPLE_ID:
    r = requests.put(f"{BASE}/spectral/samples/{SAMPLE_ID}", headers=HEADERS, json={
        "species": "Eucalyptus grandis (atualizado)"
    })
    log("PUT atualizar amostra", r.status_code == 200,
        "descricao atualizada" if r.ok else f"{r.status_code}", "Spectral")

# Library — list
r = requests.get(f"{BASE}/spectral/library", headers=HEADERS)
log("GET /spectral/library", r.status_code == 200,
    f"count={len(safe_json(r)) if isinstance(safe_json(r), list) else '?'}", "Spectral")

# Library — add entry
r = requests.post(f"{BASE}/spectral/library", headers=HEADERS, json={
    "name": "Referencia Celulose",
    "species": "Reference Standard",
    "spectrum_type": "NIR",
    "wavelengths": [400, 500, 600, 700, 800],
    "intensities": [0.2, 0.35, 0.5, 0.7, 0.85]
})
lib_entry_id = None
if r.status_code in (200, 201):
    lib_entry_id = safe_json(r).get("id")
    log("Adicionar a biblioteca", True, f"id={lib_entry_id}", "Spectral")
else:
    log("Adicionar a biblioteca", False, f"{r.status_code}: {r.text[:100]}", "Spectral")

# Calibration — list
r = requests.get(f"{BASE}/spectral/calibration", headers=HEADERS)
log("GET /spectral/calibration", r.status_code == 200,
    f"count={len(safe_json(r)) if isinstance(safe_json(r), list) else '?'}", "Spectral")

# Calibration — add point
r = requests.post(f"{BASE}/spectral/calibration", headers=HEADERS, json={
    "technique": "raman",
    "species": "Eucalyptus grandis",
    "ratio": 1.45,
    "lignin_reference": 28.5
})
cal_point_id = None
if r.status_code in (200, 201):
    cal_point_id = safe_json(r).get("id")
    log("Adicionar ponto calibracao", True, f"id={cal_point_id}", "Spectral")
else:
    log("Adicionar ponto calibracao", False, f"{r.status_code}: {r.text[:100]}", "Spectral")

# Delete sample
if SAMPLE_ID:
    r = requests.delete(f"{BASE}/spectral/samples/{SAMPLE_ID}", headers=HEADERS)
    log("Deletar amostra espectral", r.status_code in (200, 204),
        f"status={r.status_code}", "Spectral")

# =====================================================================
# 10. IMAGES (sem upload de arquivo)
# =====================================================================
section("10. IMAGES")

# List images
r = requests.get(f"{BASE}/images/", headers=HEADERS)
log("GET /images/", r.status_code == 200,
    f"count={len(safe_json(r)) if isinstance(safe_json(r), list) else safe_json(r).get('total', '?')}", "Images")

# Capture providers
r = requests.get(f"{BASE}/images/capture/providers", headers=HEADERS)
if r.ok:
    providers = safe_json(r)
    log("GET /images/capture/providers", True,
        f"{len(providers)} providers", "Images")
else:
    log("GET /images/capture/providers", False, f"{r.status_code}", "Images")

# Clusters
if PROJECT_ID:
    r = requests.get(f"{BASE}/images/clusters/by-project", headers=HEADERS,
                     params={"project_id": PROJECT_ID})
    log("GET /images/clusters/by-project", r.status_code == 200,
        f"clusters={len(safe_json(r)) if isinstance(safe_json(r), list) else '?'}", "Images")

# =====================================================================
# 11. ANNOTATIONS
# =====================================================================
section("11. ANNOTATIONS")

# List annotations requires image_id — test with non-existent image for 404
r = requests.get(f"{BASE}/annotations/", headers=HEADERS, params={"image_id": 99999})
log("GET /annotations/ (image inexistente)", r.status_code == 404,
    f"got {r.status_code}", "Annotations")

# Export GeoJSON
if PROJECT_ID:
    r = requests.get(f"{BASE}/annotations/export/geojson", headers=HEADERS,
                     params={"project_id": PROJECT_ID})
    if r.ok:
        geojson = safe_json(r)
        log("Export GeoJSON", True,
            f"type={geojson.get('type')}, features={len(geojson.get('features', []))}", "Annotations")
    else:
        log("Export GeoJSON", r.status_code in (200, 404),
            f"{r.status_code}: {r.text[:60]}", "Annotations")

# =====================================================================
# 12. LOGOUT + RATE LIMIT
# =====================================================================
section("12. LOGOUT + RATE LIMIT")

# Logout
old_token = TOKEN
r = requests.post(f"{BASE}/auth/logout", headers=HEADERS)
log("POST /auth/logout", r.status_code == 200,
    safe_json(r).get("message", "") if r.ok else f"{r.status_code}", "Logout")

# Token invalidated — should fail
r = requests.get(f"{BASE}/auth/me", headers={"Authorization": f"Bearer {old_token}"})
log("GET /auth/me com token invalidado -> 401", r.status_code == 401,
    f"got {r.status_code}", "Logout")

# Re-login for rate limit test
r = requests.post(f"{BASE}/auth/login", data={
    "username": TEST_EMAIL, "password": TEST_PASS
})
if r.status_code == 200:
    TOKEN = safe_json(r).get("access_token", "")
    HEADERS = {"Authorization": f"Bearer {TOKEN}"}

# Rate limit test — rapid requests (login_rate_limiter = 5/60s)
# Use a different endpoint or register to avoid polluting login limiter
rate_limit_hit = False
for i in range(12):
    r = requests.post(f"{BASE}/auth/register", json={
        "email": f"ratelimit{i}@test.com", "username": f"ratelimit{i}",
        "password": "test123456", "full_name": "Rate Test"
    })
    if r.status_code == 429:
        rate_limit_hit = True
        break
log("Rate limit (429 em registros rapidos)", rate_limit_hit,
    f"hit after {i+1} requests" if rate_limit_hit else "nao atingiu 429 em 12 tentativas", "Rate Limit")


# =====================================================================
# RESUMO FINAL
# =====================================================================
section("RESUMO FINAL")

total = len(RESULTS)
passed = sum(1 for _, s, _, _ in RESULTS if s == "PASS")
failed = sum(1 for _, s, _, _ in RESULTS if s == "FAIL")

print(f"\n  Total: {total} testes")
print(f"  Passaram: {passed}")
print(f"  Falharam: {failed}")
print(f"  Taxa de sucesso: {round(passed/total*100, 1)}%")

if FAILURES:
    print(f"\n  FALHAS:")
    for f in FAILURES:
        print(f"    - {f}")

# =====================================================================
# SALVAR RESULTADOS PARA O RELATORIO
# =====================================================================
results_path = os.path.join(os.path.dirname(__file__), "RESULTADOS_TESTES_CARLOS.json")
with open(results_path, "w", encoding="utf-8") as f:
    json.dump({
        "date": datetime.now().isoformat(),
        "user": TEST_USER,
        "total": total,
        "passed": passed,
        "failed": failed,
        "rate": round(passed/total*100, 1),
        "results": [
            {"name": name, "status": status, "detail": detail, "category": cat}
            for name, status, detail, cat in RESULTS
        ],
        "failures": FAILURES
    }, f, ensure_ascii=False, indent=2)

print(f"\n  Resultados salvos em: {results_path}")
sys.exit(1 if failed > 0 else 0)
