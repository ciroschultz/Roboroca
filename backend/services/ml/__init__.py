"""
Machine Learning Services
Módulo de ML para análise de imagens aéreas.
"""

# Importar com tratamento de erro para módulos que dependem de torch
try:
    from backend.services.ml.detector import (
        ObjectDetector,
        detect_objects,
        detect_and_count,
        get_detection_summary,
    )
except ImportError:
    ObjectDetector = None
    detect_objects = None
    detect_and_count = None
    get_detection_summary = None

try:
    from backend.services.ml.segmenter import (
        LandSegmenter,
        segment_image,
        get_segmentation_percentages,
        segment_by_color,
    )
except ImportError:
    LandSegmenter = None
    segment_image = None
    get_segmentation_percentages = None
    segment_by_color = None

try:
    from backend.services.ml.classifier import (
        SceneClassifier,
        classify_scene,
        classify_vegetation_type,
    )
except ImportError:
    SceneClassifier = None
    classify_scene = None
    classify_vegetation_type = None

try:
    from backend.services.ml.feature_extractor import (
        extract_all_features,
        extract_texture_features,
        extract_color_features,
        detect_patterns,
    )
except ImportError:
    extract_all_features = None
    extract_texture_features = None
    extract_color_features = None
    detect_patterns = None

__all__ = [
    # Detector
    'ObjectDetector',
    'detect_objects',
    'detect_and_count',
    'get_detection_summary',
    # Segmenter
    'LandSegmenter',
    'segment_image',
    'get_segmentation_percentages',
    # Classifier
    'SceneClassifier',
    'classify_scene',
    'classify_vegetation_type',
    # Feature Extractor
    'extract_all_features',
    'extract_texture_features',
    'extract_color_features',
    'detect_patterns',
]
