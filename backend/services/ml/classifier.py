"""
Scene Classifier Service
Classificação de cenas e tipos de vegetação.
"""

import os
from typing import Dict, Any, Optional, List, Tuple
from dataclasses import dataclass
import numpy as np
from PIL import Image
import torch
from torchvision import transforms
from torchvision.models import resnet18, ResNet18_Weights

# Modelo global (singleton)
_classifier: Optional['SceneClassifier'] = None


@dataclass
class ClassificationResult:
    """Resultado de classificação."""
    predicted_class: str
    confidence: float
    top_classes: List[Tuple[str, float]]
    features: Optional[np.ndarray] = None


class SceneClassifier:
    """Classificador de cenas usando ResNet18."""

    # Mapeamento das classes ImageNet para categorias de cena
    # Selecionamos classes relevantes para imagens aéreas/rurais
    SCENE_MAPPING = {
        # Natureza
        'lakeside': 'agua',
        'seashore': 'agua',
        'sandbar': 'praia',
        'valley': 'vale',
        'volcano': 'montanha',
        'cliff': 'penhasco',
        'alp': 'montanha',

        # Rural/Agrícola
        'hay': 'agricultura',
        'harvester': 'agricultura',
        'thresher': 'agricultura',
        'tractor': 'agricultura',
        'plow': 'agricultura',
        'barn': 'rural',
        'greenhouse': 'agricultura',

        # Floresta/Vegetação
        'tree_frog': 'floresta',
        'jungle': 'floresta',
        'rainforest': 'floresta',

        # Urbano
        'street_sign': 'urbano',
        'traffic_light': 'urbano',
        'parking_meter': 'urbano',
        'building': 'urbano',

        # Animais (rural)
        'ox': 'pecuaria',
        'cow': 'pecuaria',
        'horse': 'pecuaria',
        'sheep': 'pecuaria',
        'goat': 'pecuaria',
        'pig': 'pecuaria',
        'hen': 'avicultura',
        'rooster': 'avicultura',
    }

    # Categorias de cena para imagens aéreas
    SCENE_CATEGORIES = [
        'rural',
        'urbano',
        'floresta',
        'agua',
        'agricultura',
        'pecuaria',
        'misto',
        'desconhecido',
    ]

    def __init__(self, device: str = 'cpu'):
        """
        Inicializar classificador.

        Args:
            device: Dispositivo ('cpu' ou 'cuda')
        """
        self.device = torch.device(device)

        # Carregar modelo pré-treinado
        weights = ResNet18_Weights.DEFAULT
        self.model = resnet18(weights=weights)
        self.model.to(self.device)
        self.model.eval()

        # Categorias do ImageNet
        self.imagenet_classes = weights.meta['categories']

        # Transformações
        self.transform = transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225]
            ),
        ])

    def classify(
        self,
        image: np.ndarray,
        top_k: int = 5
    ) -> ClassificationResult:
        """
        Classificar imagem.

        Args:
            image: Array NumPy RGB (H, W, 3)
            top_k: Número de top classes a retornar

        Returns:
            ClassificationResult
        """
        # Converter para PIL
        pil_image = Image.fromarray(image)

        # Transformar
        input_tensor = self.transform(pil_image).unsqueeze(0).to(self.device)

        # Inferência
        with torch.no_grad():
            output = self.model(input_tensor)
            probabilities = torch.nn.functional.softmax(output[0], dim=0)

        # Top K classes
        top_probs, top_indices = torch.topk(probabilities, top_k)
        top_probs = top_probs.cpu().numpy()
        top_indices = top_indices.cpu().numpy()

        top_classes = []
        for i in range(top_k):
            class_name = self.imagenet_classes[top_indices[i]]
            prob = float(top_probs[i])
            top_classes.append((class_name, round(prob, 4)))

        # Classe principal
        predicted_class = top_classes[0][0]
        confidence = top_classes[0][1]

        return ClassificationResult(
            predicted_class=predicted_class,
            confidence=confidence,
            top_classes=top_classes,
        )

    def classify_from_file(self, image_path: str, **kwargs) -> ClassificationResult:
        """Classificar de um arquivo de imagem."""
        with Image.open(image_path) as img:
            if img.mode != 'RGB':
                img = img.convert('RGB')
            image_array = np.array(img)
        return self.classify(image_array, **kwargs)

    def get_scene_type(self, result: ClassificationResult) -> str:
        """Determinar tipo de cena baseado na classificação."""
        # Verificar se alguma das top classes mapeia para uma categoria
        for class_name, _ in result.top_classes:
            class_lower = class_name.lower().replace('_', ' ')
            for key, scene in self.SCENE_MAPPING.items():
                if key in class_lower:
                    return scene

        # Se não encontrou mapeamento, retornar 'desconhecido'
        return 'desconhecido'


def get_classifier() -> SceneClassifier:
    """Obter classificador (singleton)."""
    global _classifier
    if _classifier is None:
        _classifier = SceneClassifier()
    return _classifier


def classify_scene(image_path: str) -> Dict[str, Any]:
    """
    Classificar cena de uma imagem.

    Args:
        image_path: Caminho para a imagem

    Returns:
        Dicionário com resultados da classificação
    """
    classifier = get_classifier()
    result = classifier.classify_from_file(image_path)
    scene_type = classifier.get_scene_type(result)

    return {
        'imagenet_class': result.predicted_class,
        'confidence': result.confidence,
        'scene_type': scene_type,
        'top_5_classes': [
            {'class': c, 'probability': p}
            for c, p in result.top_classes
        ],
    }


def classify_vegetation_type(image_path: str) -> Dict[str, Any]:
    """
    Classificar tipo de vegetação baseado em análise de cores.

    Args:
        image_path: Caminho para a imagem

    Returns:
        Dicionário com tipo de vegetação estimado
    """
    with Image.open(image_path) as img:
        if img.mode != 'RGB':
            img = img.convert('RGB')
        image = np.array(img)

    # Análise de cores para determinar tipo de vegetação
    r = image[:, :, 0].astype(float)
    g = image[:, :, 1].astype(float)
    b = image[:, :, 2].astype(float)

    # Índice de vegetação (Excess Green)
    total = r + g + b
    total[total == 0] = 1
    exg = (2 * g - r - b) / total

    # Estatísticas
    mean_exg = float(exg.mean())
    std_exg = float(exg.std())

    # Brilho médio
    brightness = float(image.mean())

    # Variação de verde (textura)
    green_var = float(g.std())

    # Determinar tipo de vegetação
    if mean_exg > 0.15:
        if green_var > 40:
            veg_type = 'floresta_densa'
            description = 'Vegetação densa com alta variação (floresta)'
        elif brightness > 120:
            veg_type = 'agricultura_irrigada'
            description = 'Vegetação verde clara, possivelmente irrigada'
        else:
            veg_type = 'vegetacao_densa'
            description = 'Vegetação densa e uniforme'
    elif mean_exg > 0.05:
        if brightness > 150:
            veg_type = 'pastagem'
            description = 'Vegetação clara, possível pastagem'
        else:
            veg_type = 'vegetacao_moderada'
            description = 'Vegetação moderada'
    elif mean_exg > 0:
        veg_type = 'vegetacao_esparsa'
        description = 'Vegetação esparsa ou estressada'
    else:
        if brightness > 180:
            veg_type = 'solo_exposto_claro'
            description = 'Solo exposto ou areia'
        elif brightness < 50:
            veg_type = 'agua_sombra'
            description = 'Água ou sombra'
        else:
            veg_type = 'solo_exposto'
            description = 'Solo exposto ou sem vegetação'

    return {
        'vegetation_type': veg_type,
        'description': description,
        'metrics': {
            'mean_exg': round(mean_exg, 4),
            'std_exg': round(std_exg, 4),
            'brightness': round(brightness, 2),
            'green_variation': round(green_var, 2),
        },
        'is_vegetated': mean_exg > 0.05,
        'vegetation_density': 'alta' if mean_exg > 0.15 else 'media' if mean_exg > 0.05 else 'baixa',
    }
