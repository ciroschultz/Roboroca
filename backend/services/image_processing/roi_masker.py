"""
ROI (Region of Interest) Masking
Aplica máscara poligonal sobre imagens para análise restrita a uma área selecionada.
"""

import numpy as np
from PIL import Image

try:
    import cv2
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False


def apply_roi_mask(
    image_path: str,
    polygon_points: list[list[float]],
) -> tuple[np.ndarray, dict]:
    """
    Aplica máscara ROI a uma imagem.

    Args:
        image_path: Caminho para o arquivo de imagem.
        polygon_points: Lista de pontos [[x1,y1], [x2,y2], ...] em coordenadas de pixel.

    Returns:
        Tupla (imagem_mascarada_rgb, roi_metadata).
    """
    if len(polygon_points) < 3:
        raise ValueError("Polígono ROI precisa de pelo menos 3 pontos")

    # Abrir imagem
    with Image.open(image_path) as img:
        if img.mode != "RGB":
            img = img.convert("RGB")
        image_array = np.array(img)

    h, w = image_array.shape[:2]

    # Criar máscara binária do polígono
    pts = np.array(polygon_points, dtype=np.int32)

    if CV2_AVAILABLE:
        mask = np.zeros((h, w), dtype=np.uint8)
        cv2.fillPoly(mask, [pts], 255)
        masked = cv2.bitwise_and(image_array, image_array, mask=mask)
    else:
        # Fallback sem cv2: usar rasterização simples via PIL
        from PIL import ImageDraw
        mask_img = Image.new("L", (w, h), 0)
        draw = ImageDraw.Draw(mask_img)
        flat_pts = [(int(p[0]), int(p[1])) for p in polygon_points]
        draw.polygon(flat_pts, fill=255)
        mask = np.array(mask_img)
        masked = image_array.copy()
        masked[mask == 0] = 0

    # Calcular metadados do ROI
    roi_pixels = int(np.sum(mask > 0))
    total_pixels = h * w
    coverage_pct = round(roi_pixels / total_pixels * 100, 2) if total_pixels > 0 else 0

    # Bounding box do polígono
    x_coords = [p[0] for p in polygon_points]
    y_coords = [p[1] for p in polygon_points]
    bounds = {
        "x_min": float(min(x_coords)),
        "y_min": float(min(y_coords)),
        "x_max": float(max(x_coords)),
        "y_max": float(max(y_coords)),
    }

    # Perímetro em pixels
    perimeter = 0.0
    n = len(polygon_points)
    for i in range(n):
        j = (i + 1) % n
        dx = polygon_points[j][0] - polygon_points[i][0]
        dy = polygon_points[j][1] - polygon_points[i][1]
        perimeter += (dx ** 2 + dy ** 2) ** 0.5

    roi_metadata = {
        "area_pixels": roi_pixels,
        "perimeter_pixels": round(perimeter, 1),
        "bounds": bounds,
        "coverage_pct": coverage_pct,
        "image_width": w,
        "image_height": h,
        "num_vertices": len(polygon_points),
    }

    # Retornar máscara binária (0/1) junto para uso nos ML services
    binary_mask = (mask > 0).astype(np.uint8)

    return masked, roi_metadata, binary_mask


def create_perimeter_overlay(
    image_path: str,
    polygon_points: list[list[float]],
    shadow_alpha: float = 0.45,
    border_color: tuple[int, int, int] = (255, 60, 60),
    vertex_radius: int = 6,
) -> Image.Image:
    """
    Cria cópia da imagem com sombra escura FORA do perímetro,
    contorno vermelho e bolinhas brancas nos vértices.
    A área DENTRO do perímetro fica intacta.

    Args:
        image_path: Caminho para o arquivo de imagem.
        polygon_points: Lista de pontos [[x1,y1], [x2,y2], ...] em coordenadas de pixel.
        shadow_alpha: Opacidade da sombra externa (0-1).
        border_color: Cor RGB do contorno.
        vertex_radius: Raio das bolinhas nos vértices.

    Returns:
        Imagem PIL com overlay aplicado.
    """
    with Image.open(image_path) as img:
        arr = np.array(img.convert("RGB"))

    h, w = arr.shape[:2]
    pts = np.array(polygon_points, dtype=np.int32)

    if CV2_AVAILABLE:
        mask = np.zeros((h, w), dtype=np.uint8)
        cv2.fillPoly(mask, [pts], 255)
    else:
        from PIL import ImageDraw
        mask_img = Image.new("L", (w, h), 0)
        draw = ImageDraw.Draw(mask_img)
        flat_pts = [(int(p[0]), int(p[1])) for p in polygon_points]
        draw.polygon(flat_pts, fill=255)
        mask = np.array(mask_img)

    # Sombra escura FORA do perímetro — interior fica intacto
    outside = (mask == 0)
    result = arr.copy().astype(np.float32)
    result[outside] = arr[outside] * (1 - shadow_alpha)

    result_uint8 = result.astype(np.uint8)

    # Contorno vermelho do perímetro
    if CV2_AVAILABLE:
        cv2.polylines(result_uint8, [pts], isClosed=True, color=border_color, thickness=3)
        # Bolinhas brancas nos vértices
        for pt in polygon_points:
            center = (int(pt[0]), int(pt[1]))
            cv2.circle(result_uint8, center, vertex_radius, (255, 255, 255), -1)
            cv2.circle(result_uint8, center, vertex_radius, border_color, 2)
    else:
        from PIL import ImageDraw as ID2
        pil_result = Image.fromarray(result_uint8)
        draw2 = ID2.Draw(pil_result)
        flat = [(int(p[0]), int(p[1])) for p in polygon_points]
        draw2.polygon(flat, outline=border_color)
        # Bolinhas brancas nos vértices
        for pt in polygon_points:
            x, y = int(pt[0]), int(pt[1])
            r = vertex_radius
            draw2.ellipse([x - r, y - r, x + r, y + r], fill=(255, 255, 255), outline=border_color)
        result_uint8 = np.array(pil_result)

    return Image.fromarray(result_uint8)
