"""
Shared file utility functions.
Used by images.py and projects.py routes.
"""

import os

IMAGE_EXTENSIONS = {".tif", ".tiff", ".jpg", ".jpeg", ".png", ".geotiff"}
VIDEO_EXTENSIONS = {".mov", ".mp4", ".avi", ".mkv", ".wmv", ".flv"}


def is_image_file(filename: str) -> bool:
    """Verificar se é arquivo de imagem (não vídeo)."""
    ext = os.path.splitext(filename)[1].lower()
    return ext in IMAGE_EXTENSIONS


def is_video_file(filename: str) -> bool:
    """Verificar se é arquivo de vídeo."""
    ext = os.path.splitext(filename)[1].lower()
    return ext in VIDEO_EXTENSIONS
