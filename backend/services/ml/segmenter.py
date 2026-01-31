"""
Land Segmenter Service
Segmentação semântica de uso do solo usando DeepLabV3.
"""

import os
from typing import Dict, Any, Optional, Tuple, List
from dataclasses import dataclass
import numpy as np
from PIL import Image
import torch
import torch.nn.functional as F
from torchvision import transforms
from torchvision.models.segmentation import deeplabv3_mobilenet_v3_large, DeepLabV3_MobileNet_V3_Large_Weights

# Modelo global (singleton)
_segmenter: Optional['LandSegmenter'] = None


@dataclass
class SegmentationResult:
    """Resultado de segmentação."""
    mask: np.ndarray  # Máscara de classes (H, W)
    class_percentages: Dict[str, float]
    num_classes: int
    image_size: Tuple[int, int]


class LandSegmenter:
    """Segmentador de uso do solo usando DeepLabV3."""

    # Classes do modelo COCO/VOC adaptadas para uso agrícola
    COCO_CLASSES = [
        'background',      # 0
        'aeroplane',       # 1
        'bicycle',         # 2
        'bird',            # 3
        'boat',            # 4
        'bottle',          # 5
        'bus',             # 6
        'car',             # 7
        'cat',             # 8
        'chair',           # 9
        'cow',             # 10
        'diningtable',     # 11
        'dog',             # 12
        'horse',           # 13
        'motorbike',       # 14
        'person',          # 15
        'pottedplant',     # 16
        'sheep',           # 17
        'sofa',            # 18
        'train',           # 19
        'tvmonitor',       # 20
    ]

    # Mapeamento para categorias agrícolas
    LAND_CATEGORIES = {
        'vegetacao': [16],  # pottedplant (plantas)
        'animais': [3, 8, 10, 12, 13, 17],  # bird, cat, cow, dog, horse, sheep
        'veiculos': [1, 2, 6, 7, 14, 19],  # aeroplane, bicycle, bus, car, motorbike, train
        'pessoas': [15],
        'estruturas': [4, 5, 9, 11, 18, 20],  # boat, bottle, chair, table, sofa, tv
        'fundo': [0],
    }

    def __init__(self, device: str = 'cpu'):
        """
        Inicializar segmentador.

        Args:
            device: Dispositivo ('cpu' ou 'cuda')
        """
        self.device = torch.device(device)

        # Carregar modelo pré-treinado
        weights = DeepLabV3_MobileNet_V3_Large_Weights.DEFAULT
        self.model = deeplabv3_mobilenet_v3_large(weights=weights)
        self.model.to(self.device)
        self.model.eval()

        # Transformações
        self.transform = transforms.Compose([
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225]
            ),
        ])

    def segment(
        self,
        image: np.ndarray,
        resize_to: int = 520
    ) -> SegmentationResult:
        """
        Segmentar imagem.

        Args:
            image: Array NumPy RGB (H, W, 3)
            resize_to: Tamanho para processamento

        Returns:
            SegmentationResult
        """
        original_size = (image.shape[1], image.shape[0])  # W, H

        # Converter para PIL e redimensionar
        pil_image = Image.fromarray(image)
        if max(pil_image.size) > resize_to:
            ratio = resize_to / max(pil_image.size)
            new_size = (int(pil_image.width * ratio), int(pil_image.height * ratio))
            pil_image = pil_image.resize(new_size, Image.Resampling.BILINEAR)

        # Transformar
        input_tensor = self.transform(pil_image).unsqueeze(0).to(self.device)

        # Inferência
        with torch.no_grad():
            output = self.model(input_tensor)['out']
            output = F.interpolate(
                output,
                size=(original_size[1], original_size[0]),  # H, W
                mode='bilinear',
                align_corners=False
            )
            mask = output.argmax(1).squeeze().cpu().numpy()

        # Calcular percentuais
        total_pixels = mask.size
        unique, counts = np.unique(mask, return_counts=True)
        class_counts = dict(zip(unique, counts))

        percentages = {}
        for cls_id, count in class_counts.items():
            if cls_id < len(self.COCO_CLASSES):
                class_name = self.COCO_CLASSES[cls_id]
            else:
                class_name = f'classe_{cls_id}'
            percentages[class_name] = round((count / total_pixels) * 100, 2)

        return SegmentationResult(
            mask=mask.astype(np.uint8),
            class_percentages=percentages,
            num_classes=len(class_counts),
            image_size=original_size
        )

    def segment_from_file(self, image_path: str, **kwargs) -> SegmentationResult:
        """Segmentar de um arquivo de imagem."""
        with Image.open(image_path) as img:
            if img.mode != 'RGB':
                img = img.convert('RGB')
            image_array = np.array(img)
        return self.segment(image_array, **kwargs)

    def get_category_percentages(
        self,
        result: SegmentationResult
    ) -> Dict[str, float]:
        """Agrupar percentuais por categoria agrícola."""
        category_pcts = {cat: 0.0 for cat in self.LAND_CATEGORIES.keys()}

        for class_name, pct in result.class_percentages.items():
            try:
                cls_id = self.COCO_CLASSES.index(class_name)
            except ValueError:
                continue

            for cat, ids in self.LAND_CATEGORIES.items():
                if cls_id in ids:
                    category_pcts[cat] += pct
                    break

        return {k: round(v, 2) for k, v in category_pcts.items()}

    def create_color_mask(
        self,
        result: SegmentationResult
    ) -> np.ndarray:
        """Criar máscara colorida para visualização."""
        # Cores para cada classe (BGR para OpenCV)
        colors = [
            [0, 0, 0],        # 0: background - preto
            [128, 128, 128],  # 1: aeroplane - cinza
            [255, 0, 0],      # 2: bicycle - azul
            [255, 255, 0],    # 3: bird - ciano
            [0, 0, 128],      # 4: boat - marrom
            [128, 0, 128],    # 5: bottle - roxo
            [0, 128, 128],    # 6: bus - oliva
            [255, 0, 255],    # 7: car - magenta
            [0, 255, 255],    # 8: cat - amarelo
            [128, 128, 0],    # 9: chair - teal
            [0, 128, 0],      # 10: cow - verde escuro
            [64, 64, 64],     # 11: diningtable - cinza escuro
            [255, 128, 0],    # 12: dog - laranja
            [128, 64, 0],     # 13: horse - marrom
            [0, 64, 128],     # 14: motorbike
            [255, 192, 203],  # 15: person - rosa
            [0, 255, 0],      # 16: pottedplant - verde
            [245, 245, 220],  # 17: sheep - bege
            [165, 42, 42],    # 18: sofa - marrom
            [192, 192, 192],  # 19: train - prata
            [0, 0, 255],      # 20: tvmonitor - vermelho
        ]

        # Criar imagem colorida
        h, w = result.mask.shape
        color_mask = np.zeros((h, w, 3), dtype=np.uint8)

        for cls_id in range(len(colors)):
            mask_region = result.mask == cls_id
            color_mask[mask_region] = colors[cls_id]

        return color_mask


def get_segmenter() -> LandSegmenter:
    """Obter segmentador (singleton)."""
    global _segmenter
    if _segmenter is None:
        _segmenter = LandSegmenter()
    return _segmenter


def segment_image(image_path: str) -> Dict[str, Any]:
    """
    Segmentar imagem e retornar resultados.

    Args:
        image_path: Caminho para a imagem

    Returns:
        Dicionário com resultados da segmentação
    """
    segmenter = get_segmenter()
    result = segmenter.segment_from_file(image_path)

    return {
        'class_percentages': result.class_percentages,
        'category_percentages': segmenter.get_category_percentages(result),
        'num_classes_detected': result.num_classes,
        'image_size': result.image_size,
    }


def get_segmentation_percentages(image_path: str) -> Dict[str, float]:
    """Obter apenas os percentuais de segmentação."""
    segmenter = get_segmenter()
    result = segmenter.segment_from_file(image_path)
    return result.class_percentages


# Segmentação baseada em cor (mais simples, sem ML)
def segment_by_color(image: np.ndarray) -> Dict[str, float]:
    """
    Segmentação simples baseada em análise de cores.
    Mais rápida que ML, útil para vegetação.

    Args:
        image: Array NumPy RGB (H, W, 3)

    Returns:
        Percentuais por categoria
    """
    # Converter para HSV para melhor segmentação de cores
    import cv2
    hsv = cv2.cvtColor(image, cv2.COLOR_RGB2HSV)

    h, s, v = hsv[:, :, 0], hsv[:, :, 1], hsv[:, :, 2]
    total = image.shape[0] * image.shape[1]

    # Máscaras por cor/categoria
    # Verde (vegetação): H entre 35-85, S > 40
    green_mask = ((h >= 35) & (h <= 85) & (s > 40))
    green_pct = (green_mask.sum() / total) * 100

    # Marrom (solo): H entre 10-30, S > 30
    brown_mask = ((h >= 10) & (h <= 30) & (s > 30) & (v > 50))
    brown_pct = (brown_mask.sum() / total) * 100

    # Azul (água): H entre 100-130, S > 50
    blue_mask = ((h >= 100) & (h <= 130) & (s > 50))
    blue_pct = (blue_mask.sum() / total) * 100

    # Cinza/Branco (construções, estradas): S < 30, V > 100
    gray_mask = ((s < 30) & (v > 100))
    gray_pct = (gray_mask.sum() / total) * 100

    # Escuro (sombras): V < 50
    dark_mask = (v < 50)
    dark_pct = (dark_mask.sum() / total) * 100

    # Outros
    other_pct = 100 - green_pct - brown_pct - blue_pct - gray_pct - dark_pct
    if other_pct < 0:
        other_pct = 0

    return {
        'vegetacao': round(green_pct, 2),
        'solo_exposto': round(brown_pct, 2),
        'agua': round(blue_pct, 2),
        'construcoes_estradas': round(gray_pct, 2),
        'sombras': round(dark_pct, 2),
        'outros': round(other_pct, 2),
    }
