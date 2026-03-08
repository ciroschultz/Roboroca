import type { UTMInfo, Analysis } from '@/lib/api'
import type { ZoneData } from '@/components/map/ZoneLayerItem'

export type MapMode = 'project'

export interface Layer {
  id: string
  name: string
  type: 'original' | 'vegetation' | 'health' | 'classification' | 'detection' | 'heatmap' | 'roi' | 'trees' | 'pests'
  visible: boolean
  opacity: number
  color: string
}

export interface Project {
  id: number
  name: string
  description?: string
  status: string
  location?: string
  latitude?: number
  longitude?: number
  total_area_ha?: number
  area_hectares?: number
  image_count: number
  created_at: string
  updated_at: string
  perimeter_polygon?: number[][]
}

export interface ProjectImage {
  id: number
  filename: string
  original_filename: string
  file_path?: string
  width?: number
  height?: number
  center_lat?: number
  center_lon?: number
  status: string
}

export interface AnalysisSummary {
  project_id: number
  project_name: string
  total_images: number
  analyzed_images: number
  pending_images: number
  vegetation_coverage_avg: number
  health_index_avg: number
  total_objects_detected?: number
  land_use_summary: Record<string, number>
  status: string
}

export interface ImageAnalysis {
  vegetation_coverage?: {
    vegetation_percentage: number
    soil_percentage: number
  }
  vegetation_health?: {
    health_index: number
    healthy_percentage: number
    moderate_percentage: number
    stressed_percentage: number
  }
  object_detection?: {
    total_detections: number
    by_class: Record<string, number>
  }
  vegetation_type?: {
    vegetation_type: string
    vegetation_density: string
  }
}

export type DrawingTool = 'select' | 'point' | 'polygon' | 'measurement' | 'eraser' | 'roi' | 'zone'

export interface Annotation {
  id?: number
  type: string
  data: {
    x?: number
    y?: number
    points?: number[][]
    start?: { x: number; y: number }
    end?: { x: number; y: number }
    label?: string
    color?: string
    distanceM?: number
    areaM2?: number
  }
  isNew?: boolean
}

export interface ImageGSD {
  image_id: number
  gsd_m: number
  gsd_cm: number
  width: number
  height: number
  is_estimated: boolean
}

export interface MapViewProps {
  projectId?: number
}

export { type UTMInfo, type Analysis, type ZoneData }
