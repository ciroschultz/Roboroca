"""
Video Analyzer Service
Análise de vídeos de drone com extração de frames, detecção e segmentação.
"""

import os
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
from PIL import Image

# Importar serviços de vídeo
from backend.services.image_processing.video import (
    get_video_metadata,
    extract_frames,
    extract_single_frame,
    is_video_file,
    check_opencv,
)

# Importar serviços ML
from backend.services.ml.detector import detect_objects, get_detection_summary
from backend.services.ml.segmenter import segment_by_color
from backend.services.ml.classifier import classify_vegetation_type
from backend.services.image_processing.analyzer import (
    calculate_vegetation_coverage,
    estimate_vegetation_health,
)

# Verificar OpenCV
try:
    import cv2
    OPENCV_AVAILABLE = True
except ImportError:
    OPENCV_AVAILABLE = False


@dataclass
class VideoAnalysisResult:
    """Resultado da análise de vídeo."""
    video_info: Dict[str, Any]  # duration, fps, total_frames, resolution
    key_frames: List[Dict[str, Any]]  # frames representativos com análise
    frame_analyses: List[Dict[str, Any]]  # análise por frame amostrado
    temporal_summary: Dict[str, Any]  # estatísticas agregadas ao longo do tempo
    mosaic_path: Optional[str] = None  # caminho do mosaico gerado


class VideoAnalyzer:
    """
    Analisador de vídeos de drone.

    Extrai frames, executa análises ML e gera resumos temporais.
    """

    def __init__(self, device: str = 'cpu'):
        """
        Inicializar analisador de vídeo.

        Args:
            device: Dispositivo para inferência ('cpu' ou 'cuda')
        """
        self.device = device

        if not OPENCV_AVAILABLE:
            raise RuntimeError("OpenCV é necessário para análise de vídeo")

    def analyze(
        self,
        video_path: str,
        sample_rate: int = 30,
        max_frames: int = 50,
        output_dir: Optional[str] = None
    ) -> VideoAnalysisResult:
        """
        Analisar vídeo completo.

        Args:
            video_path: Caminho para o arquivo de vídeo
            sample_rate: Taxa de amostragem em frames (ex: 30 = 1 frame a cada 30)
            max_frames: Número máximo de frames a analisar
            output_dir: Diretório para salvar frames e mosaico

        Returns:
            VideoAnalysisResult com todas as análises
        """
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Vídeo não encontrado: {video_path}")

        if not is_video_file(video_path):
            raise ValueError(f"Formato de vídeo não suportado: {video_path}")

        # Obter metadados do vídeo
        video_info = get_video_metadata(video_path)

        # Configurar diretório de saída
        if output_dir is None:
            output_dir = os.path.dirname(video_path)
        os.makedirs(output_dir, exist_ok=True)

        # Calcular intervalo de amostragem
        fps = video_info.get('fps', 30)
        if fps <= 0:
            fps = 30
        interval_seconds = sample_rate / fps

        # Extrair frames
        frame_paths = extract_frames(
            video_path,
            output_dir=output_dir,
            interval_seconds=interval_seconds,
            max_frames=max_frames,
            format='jpg'
        )

        # Analisar cada frame
        frame_analyses = []
        for i, frame_path in enumerate(frame_paths):
            try:
                frame_analysis = self._analyze_frame(frame_path, i)
                frame_analyses.append(frame_analysis)
            except Exception as e:
                frame_analyses.append({
                    'frame_index': i,
                    'frame_path': frame_path,
                    'error': str(e)
                })

        # Extrair key frames (frames mais representativos)
        key_frames = self.extract_key_frames(
            video_path,
            num_frames=min(10, len(frame_paths)),
            output_dir=output_dir
        )

        # Gerar resumo temporal
        temporal_summary = self.get_temporal_summary(frame_analyses)

        # Gerar mosaico
        mosaic_path = None
        if len(frame_paths) > 0:
            try:
                frames_for_mosaic = [
                    np.array(Image.open(p)) for p in frame_paths[:16]
                ]
                mosaic = self.create_mosaic(frames_for_mosaic)
                mosaic_filename = os.path.splitext(os.path.basename(video_path))[0] + '_mosaic.jpg'
                mosaic_path = os.path.join(output_dir, mosaic_filename)
                Image.fromarray(mosaic).save(mosaic_path, 'JPEG', quality=90)
            except Exception:
                mosaic_path = None

        return VideoAnalysisResult(
            video_info=video_info,
            key_frames=key_frames,
            frame_analyses=frame_analyses,
            temporal_summary=temporal_summary,
            mosaic_path=mosaic_path
        )

    def _analyze_frame(self, frame_path: str, frame_index: int) -> Dict[str, Any]:
        """Analisar um único frame."""
        with Image.open(frame_path) as img:
            if img.mode != 'RGB':
                img = img.convert('RGB')
            image_array = np.array(img)

        # Análise de vegetação
        coverage = calculate_vegetation_coverage(image_array)
        health = estimate_vegetation_health(image_array)

        # Segmentação por cor
        segmentation = segment_by_color(image_array)

        return {
            'frame_index': frame_index,
            'frame_path': frame_path,
            'vegetation_coverage': coverage,
            'vegetation_health': health,
            'land_use': segmentation,
        }

    def extract_key_frames(
        self,
        video_path: str,
        num_frames: int = 10,
        output_dir: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Extrair frames-chave representativos do vídeo.

        Seleciona frames distribuídos uniformemente ao longo do vídeo.

        Args:
            video_path: Caminho para o vídeo
            num_frames: Número de key frames a extrair
            output_dir: Diretório para salvar os frames

        Returns:
            Lista de dicionários com informações dos key frames
        """
        metadata = get_video_metadata(video_path)
        total_frames = metadata.get('frame_count', 0)

        if total_frames == 0:
            return []

        if output_dir is None:
            output_dir = os.path.dirname(video_path)
        os.makedirs(output_dir, exist_ok=True)

        video_name = os.path.splitext(os.path.basename(video_path))[0]

        # Calcular posições dos key frames
        if num_frames >= total_frames:
            positions = list(range(total_frames))
        else:
            step = total_frames / num_frames
            positions = [int(i * step) for i in range(num_frames)]

        key_frames = []
        for i, pos in enumerate(positions):
            output_path = os.path.join(output_dir, f"{video_name}_keyframe_{i:03d}.jpg")

            try:
                frame_array, saved_path = extract_single_frame(
                    video_path,
                    frame_number=pos,
                    output_path=output_path
                )

                # Calcular timestamp
                fps = metadata.get('fps', 30) or 30
                timestamp = pos / fps

                # Análise rápida do frame
                coverage = calculate_vegetation_coverage(frame_array)

                key_frames.append({
                    'index': i,
                    'frame_number': pos,
                    'timestamp_seconds': round(timestamp, 2),
                    'path': saved_path,
                    'vegetation_percentage': coverage.get('vegetation_percentage', 0),
                })
            except Exception as e:
                key_frames.append({
                    'index': i,
                    'frame_number': pos,
                    'error': str(e)
                })

        return key_frames

    def create_mosaic(
        self,
        frames: List[np.ndarray],
        cols: int = 4,
        thumb_size: Tuple[int, int] = (320, 240)
    ) -> np.ndarray:
        """
        Criar mosaico de frames.

        Args:
            frames: Lista de arrays de frames (RGB)
            cols: Número de colunas no mosaico
            thumb_size: Tamanho de cada thumbnail (largura, altura)

        Returns:
            Array do mosaico (RGB)
        """
        if not frames:
            return np.zeros((thumb_size[1], thumb_size[0], 3), dtype=np.uint8)

        # Limitar número de frames
        frames = frames[:16]

        # Calcular dimensões do mosaico
        num_frames = len(frames)
        rows = (num_frames + cols - 1) // cols

        # Criar canvas
        mosaic_width = cols * thumb_size[0]
        mosaic_height = rows * thumb_size[1]
        mosaic = np.zeros((mosaic_height, mosaic_width, 3), dtype=np.uint8)

        # Preencher com frames
        for i, frame in enumerate(frames):
            row = i // cols
            col = i % cols

            # Redimensionar frame
            pil_frame = Image.fromarray(frame)
            pil_frame = pil_frame.resize(thumb_size, Image.Resampling.LANCZOS)
            resized = np.array(pil_frame)

            # Posicionar no mosaico
            y_start = row * thumb_size[1]
            x_start = col * thumb_size[0]
            mosaic[y_start:y_start + thumb_size[1], x_start:x_start + thumb_size[0]] = resized

        return mosaic

    def get_temporal_summary(self, analyses: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Gerar resumo temporal das análises.

        Calcula estatísticas agregadas ao longo dos frames analisados.

        Args:
            analyses: Lista de análises por frame

        Returns:
            Dicionário com estatísticas temporais
        """
        if not analyses:
            return {
                'total_frames_analyzed': 0,
                'error_count': 0,
            }

        # Filtrar análises válidas
        valid_analyses = [a for a in analyses if 'error' not in a]
        error_count = len(analyses) - len(valid_analyses)

        if not valid_analyses:
            return {
                'total_frames_analyzed': len(analyses),
                'error_count': error_count,
            }

        # Extrair métricas de vegetação
        veg_percentages = []
        health_indices = []

        for analysis in valid_analyses:
            coverage = analysis.get('vegetation_coverage', {})
            health = analysis.get('vegetation_health', {})

            if 'vegetation_percentage' in coverage:
                veg_percentages.append(coverage['vegetation_percentage'])
            if 'health_index' in health:
                health_indices.append(health['health_index'])

        # Calcular estatísticas de uso do solo
        land_use_totals = {}
        for analysis in valid_analyses:
            land_use = analysis.get('land_use', {})
            for category, pct in land_use.items():
                if category not in land_use_totals:
                    land_use_totals[category] = []
                land_use_totals[category].append(pct)

        land_use_avg = {
            cat: round(np.mean(values), 2)
            for cat, values in land_use_totals.items()
        }

        summary = {
            'total_frames_analyzed': len(analyses),
            'valid_frames': len(valid_analyses),
            'error_count': error_count,
            'vegetation': {
                'mean_percentage': round(np.mean(veg_percentages), 2) if veg_percentages else 0,
                'min_percentage': round(np.min(veg_percentages), 2) if veg_percentages else 0,
                'max_percentage': round(np.max(veg_percentages), 2) if veg_percentages else 0,
                'std_percentage': round(np.std(veg_percentages), 2) if veg_percentages else 0,
            },
            'health': {
                'mean_index': round(np.mean(health_indices), 2) if health_indices else 0,
                'min_index': round(np.min(health_indices), 2) if health_indices else 0,
                'max_index': round(np.max(health_indices), 2) if health_indices else 0,
            },
            'land_use_average': land_use_avg,
        }

        # Detectar tendências (simples: comparar primeira e última metade)
        if len(veg_percentages) >= 4:
            mid = len(veg_percentages) // 2
            first_half_avg = np.mean(veg_percentages[:mid])
            second_half_avg = np.mean(veg_percentages[mid:])

            if second_half_avg > first_half_avg * 1.1:
                trend = 'increasing'
            elif second_half_avg < first_half_avg * 0.9:
                trend = 'decreasing'
            else:
                trend = 'stable'

            summary['vegetation']['trend'] = trend

        return summary


# Singleton global
_video_analyzer: Optional[VideoAnalyzer] = None


def get_video_analyzer() -> VideoAnalyzer:
    """Obter analisador de vídeo (singleton)."""
    global _video_analyzer
    if _video_analyzer is None:
        _video_analyzer = VideoAnalyzer()
    return _video_analyzer


def analyze_video(
    video_path: str,
    sample_rate: int = 30,
    max_frames: int = 50
) -> Dict[str, Any]:
    """
    Função de conveniência para analisar vídeo.

    Args:
        video_path: Caminho para o vídeo
        sample_rate: Taxa de amostragem
        max_frames: Máximo de frames

    Returns:
        Dicionário com resultados da análise
    """
    analyzer = get_video_analyzer()
    result = analyzer.analyze(video_path, sample_rate, max_frames)

    return {
        'video_info': result.video_info,
        'key_frames': result.key_frames,
        'frame_count_analyzed': len(result.frame_analyses),
        'temporal_summary': result.temporal_summary,
        'mosaic_path': result.mosaic_path,
    }


def extract_video_keyframes(video_path: str, num_frames: int = 10) -> List[Dict[str, Any]]:
    """Extrair key frames de um vídeo."""
    analyzer = get_video_analyzer()
    return analyzer.extract_key_frames(video_path, num_frames)
