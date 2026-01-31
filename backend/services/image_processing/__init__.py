"""
Image Processing Services
Módulo de processamento de imagens para o Roboroça.
"""

from backend.services.image_processing.reader import (
    read_image,
    get_image_dimensions,
    extract_gps_coordinates,
    extract_gps_altitude,
    read_metadata,
    is_georeferenced,
    get_supported_formats,
)

from backend.services.image_processing.processor import (
    resize_image,
    create_thumbnail,
    save_thumbnail,
    image_to_numpy,
    numpy_to_image,
    normalize_image,
    convert_to_rgb,
    rotate_by_exif,
    crop_center,
    get_image_stats,
)

from backend.services.image_processing.analyzer import (
    calculate_excess_green_index,
    calculate_green_leaf_index,
    calculate_vegetation_coverage,
    detect_vegetation_mask,
    calculate_color_histogram,
    analyze_image_colors,
    estimate_vegetation_health,
    generate_vegetation_heatmap,
    run_basic_analysis,
)

from backend.services.image_processing.video import (
    check_opencv,
    get_video_metadata,
    extract_frames,
    extract_single_frame,
    get_video_thumbnail,
    get_supported_video_formats,
    is_video_file,
)

__all__ = [
    # Reader
    'read_image',
    'get_image_dimensions',
    'extract_gps_coordinates',
    'extract_gps_altitude',
    'read_metadata',
    'is_georeferenced',
    'get_supported_formats',
    # Processor
    'resize_image',
    'create_thumbnail',
    'save_thumbnail',
    'image_to_numpy',
    'numpy_to_image',
    'normalize_image',
    'convert_to_rgb',
    'rotate_by_exif',
    'crop_center',
    'get_image_stats',
    # Analyzer
    'calculate_excess_green_index',
    'calculate_green_leaf_index',
    'calculate_vegetation_coverage',
    'detect_vegetation_mask',
    'calculate_color_histogram',
    'analyze_image_colors',
    'estimate_vegetation_health',
    'generate_vegetation_heatmap',
    'run_basic_analysis',
    # Video
    'check_opencv',
    'get_video_metadata',
    'extract_frames',
    'extract_single_frame',
    'get_video_thumbnail',
    'get_supported_video_formats',
    'is_video_file',
]
