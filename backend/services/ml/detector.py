"""
Object Detector Service
Detecção de objetos em imagens aéreas usando YOLOv8.
"""

import os
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
import numpy as np
from PIL import Image

# YOLO
from ultralytics import YOLO

# Modelo global (singleton para evitar recarregar)
_model: Optional[YOLO] = None
_model_path = "yolov8n.pt"  # Nano version - mais leve


@dataclass
class Detection:
    """Representa uma detecção de objeto."""
    class_id: int
    class_name: str
    confidence: float
    bbox: Tuple[int, int, int, int]  # x1, y1, x2, y2
    center: Tuple[int, int]
    area_pixels: int


def get_model() -> YOLO:
    """Obter modelo YOLO (singleton)."""
    global _model
    if _model is None:
        _model = YOLO(_model_path)
    return _model


class ObjectDetector:
    """Detector de objetos usando YOLOv8."""

    # Classes relevantes para agricultura/rural do COCO dataset
    RELEVANT_CLASSES = {
        0: 'pessoa',
        1: 'bicicleta',
        2: 'carro',
        3: 'moto',
        5: 'onibus',
        7: 'caminhao',
        14: 'passaro',
        15: 'gato',
        16: 'cachorro',
        17: 'cavalo',
        18: 'ovelha',
        19: 'vaca',
        20: 'elefante',
        21: 'urso',
        22: 'zebra',
        23: 'girafa',
        58: 'planta_vaso',  # potted plant
        59: 'cama',
        60: 'mesa_jantar',
        62: 'tv',
        63: 'laptop',
    }

    # Mapeamento para categorias agrícolas
    AGRICULTURAL_CATEGORIES = {
        'animais': [15, 16, 17, 18, 19],  # gato, cachorro, cavalo, ovelha, vaca
        'veiculos': [1, 2, 3, 5, 7],  # bicicleta, carro, moto, onibus, caminhao
        'pessoas': [0],
        'plantas': [58],
        'outros': [14, 20, 21, 22, 23],
    }

    def __init__(self, model_path: str = "yolov8n.pt", confidence: float = 0.25):
        """
        Inicializar detector.

        Args:
            model_path: Caminho para o modelo YOLO
            confidence: Limiar mínimo de confiança
        """
        self.model = YOLO(model_path)
        self.confidence = confidence

    def detect(
        self,
        image: np.ndarray,
        classes: Optional[List[int]] = None,
        max_detections: int = 100
    ) -> List[Detection]:
        """
        Detectar objetos na imagem.

        Args:
            image: Array NumPy RGB (H, W, 3)
            classes: Lista de IDs de classes para filtrar (None = todas)
            max_detections: Máximo de detecções

        Returns:
            Lista de Detection
        """
        # Executar inferência
        results = self.model(
            image,
            conf=self.confidence,
            classes=classes,
            max_det=max_detections,
            verbose=False
        )

        detections = []
        for result in results:
            boxes = result.boxes
            if boxes is None:
                continue

            for i in range(len(boxes)):
                # Extrair informações
                box = boxes.xyxy[i].cpu().numpy().astype(int)
                conf = float(boxes.conf[i].cpu().numpy())
                cls_id = int(boxes.cls[i].cpu().numpy())

                x1, y1, x2, y2 = box
                center_x = (x1 + x2) // 2
                center_y = (y1 + y2) // 2
                area = (x2 - x1) * (y2 - y1)

                # Nome da classe
                class_name = self.model.names.get(cls_id, f'classe_{cls_id}')

                detections.append(Detection(
                    class_id=cls_id,
                    class_name=class_name,
                    confidence=conf,
                    bbox=(x1, y1, x2, y2),
                    center=(center_x, center_y),
                    area_pixels=area
                ))

        return detections

    def detect_from_file(self, image_path: str, **kwargs) -> List[Detection]:
        """Detectar objetos de um arquivo de imagem."""
        with Image.open(image_path) as img:
            if img.mode != 'RGB':
                img = img.convert('RGB')
            image_array = np.array(img)
        return self.detect(image_array, **kwargs)

    def count_by_class(self, detections: List[Detection]) -> Dict[str, int]:
        """Contar detecções por classe."""
        counts = {}
        for det in detections:
            counts[det.class_name] = counts.get(det.class_name, 0) + 1
        return counts

    def count_by_category(self, detections: List[Detection]) -> Dict[str, int]:
        """Contar detecções por categoria agrícola."""
        counts = {cat: 0 for cat in self.AGRICULTURAL_CATEGORIES.keys()}
        counts['desconhecido'] = 0

        for det in detections:
            found = False
            for cat, class_ids in self.AGRICULTURAL_CATEGORIES.items():
                if det.class_id in class_ids:
                    counts[cat] += 1
                    found = True
                    break
            if not found:
                counts['desconhecido'] += 1

        return counts

    def get_summary(self, detections: List[Detection]) -> Dict[str, Any]:
        """Gerar resumo das detecções."""
        if not detections:
            return {
                'total_detections': 0,
                'by_class': {},
                'by_category': {},
                'avg_confidence': 0,
                'total_area_pixels': 0,
            }

        return {
            'total_detections': len(detections),
            'by_class': self.count_by_class(detections),
            'by_category': self.count_by_category(detections),
            'avg_confidence': sum(d.confidence for d in detections) / len(detections),
            'total_area_pixels': sum(d.area_pixels for d in detections),
        }


# Funções de conveniência (usar modelo singleton)

def detect_objects(
    image_path: str,
    confidence: float = 0.25,
    classes: Optional[List[int]] = None
) -> List[Detection]:
    """
    Detectar objetos em uma imagem.

    Args:
        image_path: Caminho para a imagem
        confidence: Limiar mínimo de confiança
        classes: Lista de IDs de classes (None = todas)

    Returns:
        Lista de Detection
    """
    model = get_model()

    with Image.open(image_path) as img:
        if img.mode != 'RGB':
            img = img.convert('RGB')

        # Redimensionar se muito grande (para performance)
        max_size = 1920
        if max(img.size) > max_size:
            ratio = max_size / max(img.size)
            new_size = (int(img.width * ratio), int(img.height * ratio))
            img = img.resize(new_size, Image.Resampling.LANCZOS)

        image_array = np.array(img)

    # Executar inferência
    results = model(
        image_array,
        conf=confidence,
        classes=classes,
        verbose=False
    )

    detections = []
    for result in results:
        boxes = result.boxes
        if boxes is None:
            continue

        for i in range(len(boxes)):
            box = boxes.xyxy[i].cpu().numpy().astype(int)
            conf = float(boxes.conf[i].cpu().numpy())
            cls_id = int(boxes.cls[i].cpu().numpy())

            x1, y1, x2, y2 = box
            center_x = (x1 + x2) // 2
            center_y = (y1 + y2) // 2
            area = (x2 - x1) * (y2 - y1)

            class_name = model.names.get(cls_id, f'classe_{cls_id}')

            detections.append(Detection(
                class_id=cls_id,
                class_name=class_name,
                confidence=conf,
                bbox=(x1, y1, x2, y2),
                center=(center_x, center_y),
                area_pixels=area
            ))

    return detections


def detect_and_count(image_path: str, confidence: float = 0.25) -> Dict[str, int]:
    """Detectar e contar objetos por classe."""
    detections = detect_objects(image_path, confidence)
    counts = {}
    for det in detections:
        counts[det.class_name] = counts.get(det.class_name, 0) + 1
    return counts


def get_detection_summary(image_path: str, confidence: float = 0.25) -> Dict[str, Any]:
    """Obter resumo completo das detecções."""
    detections = detect_objects(image_path, confidence)

    if not detections:
        return {
            'total_detections': 0,
            'by_class': {},
            'avg_confidence': 0,
            'detections': [],
        }

    # Converter detecções para dicionários
    det_dicts = []
    for d in detections:
        det_dicts.append({
            'class': d.class_name,
            'confidence': round(d.confidence, 3),
            'bbox': d.bbox,
            'center': d.center,
            'area_pixels': d.area_pixels,
        })

    counts = {}
    for det in detections:
        counts[det.class_name] = counts.get(det.class_name, 0) + 1

    return {
        'total_detections': len(detections),
        'by_class': counts,
        'avg_confidence': round(sum(d.confidence for d in detections) / len(detections), 3),
        'detections': det_dicts,
    }
