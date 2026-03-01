"""
Video Processing Service
Processamento de vídeos de drone: extração de frames, metadados.
"""

import os
from typing import List, Dict, Any, Optional, Tuple
from PIL import Image
import numpy as np

# Tentar importar OpenCV
try:
    import cv2
    OPENCV_AVAILABLE = True
except ImportError:
    OPENCV_AVAILABLE = False


def check_opencv() -> bool:
    """Verificar se OpenCV está disponível."""
    return OPENCV_AVAILABLE


def get_video_metadata(video_path: str) -> Dict[str, Any]:
    """
    Obter metadados de um vídeo.

    Args:
        video_path: Caminho para o arquivo de vídeo

    Returns:
        Dicionário com metadados do vídeo
    """
    if not OPENCV_AVAILABLE:
        return {'error': 'OpenCV não disponível'}

    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Vídeo não encontrado: {video_path}")

    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        raise ValueError(f"Não foi possível abrir o vídeo: {video_path}")

    try:
        metadata = {
            'filename': os.path.basename(video_path),
            'file_size': os.path.getsize(video_path),
            'width': int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
            'height': int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)),
            'fps': cap.get(cv2.CAP_PROP_FPS),
            'frame_count': int(cap.get(cv2.CAP_PROP_FRAME_COUNT)),
            'duration_seconds': None,
            'codec': None,
        }

        # Calcular duração
        if metadata['fps'] > 0:
            metadata['duration_seconds'] = metadata['frame_count'] / metadata['fps']

        # Tentar obter codec
        fourcc = int(cap.get(cv2.CAP_PROP_FOURCC))
        if fourcc > 0:
            metadata['codec'] = "".join([chr((fourcc >> 8 * i) & 0xFF) for i in range(4)])

        return metadata

    finally:
        cap.release()


def extract_frames(
    video_path: str,
    output_dir: str,
    interval_seconds: float = 1.0,
    max_frames: int = 100,
    format: str = 'jpg'
) -> List[str]:
    """
    Extrair frames de um vídeo em intervalos regulares.

    Args:
        video_path: Caminho para o arquivo de vídeo
        output_dir: Diretório para salvar os frames
        interval_seconds: Intervalo entre frames em segundos
        max_frames: Número máximo de frames a extrair
        format: Formato de saída ('jpg', 'png')

    Returns:
        Lista de caminhos dos frames salvos
    """
    if not OPENCV_AVAILABLE:
        raise RuntimeError('OpenCV não disponível para processamento de vídeo')

    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Vídeo não encontrado: {video_path}")

    # Criar diretório de saída
    os.makedirs(output_dir, exist_ok=True)

    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        raise ValueError(f"Não foi possível abrir o vídeo: {video_path}")

    try:
        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        if fps <= 0:
            fps = 30  # Assumir 30fps se não conseguir detectar

        # Distribuir frames uniformemente ao longo do vídeo inteiro
        # Em vez de avançar por intervalo fixo (que só cobre o início),
        # calculamos step = total_frames / max_frames
        if total_frames <= max_frames:
            # Vídeo curto: pegar todos os frames possíveis com o intervalo
            frame_interval = int(fps * interval_seconds)
            if frame_interval < 1:
                frame_interval = 1
            positions = list(range(0, total_frames, frame_interval))
        else:
            step = total_frames / max_frames
            positions = [int(i * step) for i in range(max_frames)]

        saved_frames = []

        # Nome base do vídeo (sem extensão)
        video_name = os.path.splitext(os.path.basename(video_path))[0]

        for idx, frame_number in enumerate(positions):
            # Posicionar no frame desejado
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_number)

            ret, frame = cap.read()

            if not ret:
                break  # Fim do vídeo

            # Converter BGR para RGB
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

            # Salvar frame
            frame_filename = f"{video_name}_frame_{idx:04d}.{format}"
            frame_path = os.path.join(output_dir, frame_filename)

            # Converter para PIL e salvar
            img = Image.fromarray(frame_rgb)
            img.save(frame_path, quality=90 if format == 'jpg' else None)

            saved_frames.append(frame_path)

        return saved_frames

    finally:
        cap.release()


def extract_single_frame(
    video_path: str,
    frame_number: int = 0,
    output_path: Optional[str] = None
) -> Tuple[np.ndarray, Optional[str]]:
    """
    Extrair um único frame de um vídeo.

    Args:
        video_path: Caminho para o arquivo de vídeo
        frame_number: Número do frame a extrair (0-indexed)
        output_path: Caminho para salvar o frame (opcional)

    Returns:
        Tupla (array do frame, caminho salvo ou None)
    """
    if not OPENCV_AVAILABLE:
        raise RuntimeError('OpenCV não disponível para processamento de vídeo')

    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        raise ValueError(f"Não foi possível abrir o vídeo: {video_path}")

    try:
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_number)
        ret, frame = cap.read()

        if not ret:
            raise ValueError(f"Não foi possível ler o frame {frame_number}")

        # Converter BGR para RGB
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        saved_path = None
        if output_path:
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            img = Image.fromarray(frame_rgb)
            img.save(output_path)
            saved_path = output_path

        return frame_rgb, saved_path

    finally:
        cap.release()


def get_video_thumbnail(
    video_path: str,
    output_path: str,
    size: Tuple[int, int] = (400, 400),
    frame_position: float = 0.1
) -> str:
    """
    Gerar thumbnail de um vídeo.

    Args:
        video_path: Caminho para o arquivo de vídeo
        output_path: Caminho para salvar o thumbnail
        size: Tamanho do thumbnail
        frame_position: Posição do frame (0-1, ex: 0.1 = 10% do vídeo)

    Returns:
        Caminho do thumbnail salvo
    """
    if not OPENCV_AVAILABLE:
        raise RuntimeError('OpenCV não disponível para processamento de vídeo')

    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        raise ValueError(f"Não foi possível abrir o vídeo: {video_path}")

    try:
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        target_frame = int(total_frames * frame_position)

        cap.set(cv2.CAP_PROP_POS_FRAMES, target_frame)
        ret, frame = cap.read()

        if not ret:
            # Tentar o primeiro frame
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            ret, frame = cap.read()

        if not ret:
            raise ValueError("Não foi possível ler nenhum frame do vídeo")

        # Converter BGR para RGB
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        # Criar thumbnail
        img = Image.fromarray(frame_rgb)
        img.thumbnail(size, Image.Resampling.LANCZOS)

        # Salvar
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        img.save(output_path, 'JPEG', quality=85)

        return output_path

    finally:
        cap.release()


def get_supported_video_formats() -> List[str]:
    """
    Retornar lista de formatos de vídeo suportados.
    """
    return ['.mov', '.mp4', '.avi', '.mkv', '.wmv', '.flv']


def is_video_file(file_path: str) -> bool:
    """
    Verificar se o arquivo é um vídeo suportado.

    Args:
        file_path: Caminho para o arquivo

    Returns:
        True se for vídeo suportado
    """
    ext = os.path.splitext(file_path)[1].lower()
    return ext in get_supported_video_formats()
