import { type Analysis, type EnrichedData, type TimelineEntry, type AlertItem } from '@/lib/api'

export interface ProjectData {
  id: string
  name: string
  createdAt: string
  status: 'pending' | 'processing' | 'completed' | 'error'
  sourceType: 'drone' | 'satellite'
  imageCount: number
  area: number // hectares
  location?: string
  description?: string
  latitude?: number
  longitude?: number
  perimeter_polygon?: number[][]
  results?: {
    vegetationCoverage: number  // % de cobertura vegetal
    healthIndex: number         // % índice de saúde
    plantCount: number          // Total de árvores detectadas
    healthyPercentage: number
    stressedPercentage: number
    criticalPercentage: number
    landUse: { name: string; value: number; color: string }[]
    heightDistribution: { altura: string; quantidade: number }[]
    biomassIndexAvg?: number | null
    biomassDensityClass?: string | null
    pestInfectionRateAvg?: number | null
  }
}

export interface AnalysisProgress {
  stage: string
  analyzedImages: number
  totalImages: number
  startedAt: number
}

export interface ProjectProfileProps {
  project: ProjectData
  onBack: () => void
  onRefresh?: () => void
  initialTab?: 'overview' | 'map' | 'analysis' | 'report'
  analysisSection?: string
  allProjects?: { id: string; name: string }[]
  onProjectChange?: (projectId: string) => void
  openPerimeterEditor?: boolean
}

// Mapa de submenu ID → section element ID
export const sectionMap: Record<string, string> = {
  'cobertura': 'section-segmentation',
  'saude-indice': 'section-visual-features',
  'uso-solo': 'section-scene-classification',
  'contagem': 'section-object-detection',
  'saude': 'section-vegetation-type',
  'pragas': 'section-pest-disease',
  'biomassa': 'section-biomass',
  'ndvi': 'section-ndvi',
  'cores': 'section-colors',
}

// Stages for the ML analysis pipeline
export const analysisStages = [
  'Preparando imagens...',
  'Segmentacao (DeepLabV3)...',
  'Classificacao de cena (ResNet18)...',
  'Deteccao de objetos (YOLO)...',
  'Contagem de arvores...',
  'Extraindo caracteristicas visuais...',
  'Gerando relatorio final...',
]

// Helper para formatar valores de dados enriquecidos
export const formatWeatherValue = (val: unknown): string => {
  if (val === null || val === undefined) return 'N/A'
  if (typeof val === 'number') return val.toFixed(1)
  return String(val)
}

// Extracted analysis results type
export interface AnalysisResultsData {
  analysisResults: Record<string, unknown>
  fullAnalysis: Analysis | undefined
  videoAnalysis: Analysis | undefined
  segmentation: Record<string, unknown> | undefined
  sceneClassification: Record<string, unknown> | undefined
  vegetationType: Record<string, unknown> | undefined
  visualFeatures: Record<string, unknown> | undefined
  objectDetection: Record<string, unknown> | undefined
  pestDisease: Record<string, unknown> | undefined
  biomassData: Record<string, unknown> | undefined
  vegetationCoverage: Record<string, unknown> | undefined
  vegetationHealth: Record<string, unknown> | undefined
  colorAnalysis: Record<string, unknown> | undefined
  treeCount: Record<string, unknown> | undefined
  temporalSummary: Record<string, unknown> | undefined
  videoInfo: Record<string, unknown> | undefined
}

export function extractAnalysisResults(analyses: Analysis[]): AnalysisResultsData {
  const fullAnalysis = analyses.find(a => a.analysis_type === 'full_report')
  const videoAnalysis = analyses.find(a => a.analysis_type === 'video_analysis')
  const analysisResults = fullAnalysis?.results || videoAnalysis?.results || {}

  return {
    analysisResults,
    fullAnalysis,
    videoAnalysis,
    segmentation: analysisResults.segmentation as Record<string, unknown> | undefined,
    sceneClassification: analysisResults.scene_classification as Record<string, unknown> | undefined,
    vegetationType: analysisResults.vegetation_type as Record<string, unknown> | undefined,
    visualFeatures: analysisResults.visual_features as Record<string, unknown> | undefined,
    objectDetection: analysisResults.object_detection as Record<string, unknown> | undefined,
    pestDisease: analysisResults.pest_disease as Record<string, unknown> | undefined,
    biomassData: analysisResults.biomass as Record<string, unknown> | undefined,
    vegetationCoverage: analysisResults.vegetation_coverage as Record<string, unknown> | undefined,
    vegetationHealth: analysisResults.vegetation_health as Record<string, unknown> | undefined,
    colorAnalysis: analysisResults.color_analysis as Record<string, unknown> | undefined,
    treeCount: analysisResults.tree_count as Record<string, unknown> | undefined,
    temporalSummary: videoAnalysis?.results?.temporal_summary as Record<string, unknown> | undefined,
    videoInfo: videoAnalysis?.results?.video_info as Record<string, unknown> | undefined,
  }
}
