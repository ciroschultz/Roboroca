'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  API_BASE_URL,
  loadAuthToken,
  exportAnnotationsGeoJSON,
  getProjects as apiGetProjects,
  getImages as apiGetImages,
  getProjectAnalysisSummary,
  getAnalyses as apiGetAnalyses,
  getAnnotations as apiGetAnnotations,
  createAnnotation as apiCreateAnnotation,
  deleteAnnotationApi,
  updateAnnotation as apiUpdateAnnotation,
  analyzeROI,
  analyzeProject,
  getImageUTMInfo,
  getOverlayUrl,
  type Project as ApiProject,
  type UTMInfo,
  type Analysis,
} from '@/lib/api'
import {
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Ruler,
  Download,
  Eye,
  EyeOff,
  MapPin,
  FolderOpen,
  PenTool,
  ChevronRight,
  Leaf,
  Trees,
  CheckCircle,
  Loader2,
  AlertCircle,
  RefreshCw,
  Image as ImageIcon,
  MousePointer,
  Trash2,
  Square,
  Info,
  X,
  Save,
  Palette,
  Globe,
  Target,
  Bug,
  Droplets,
  Play,
} from 'lucide-react'
import CompassRose from '@/components/map/CompassRose'
import ScaleBar from '@/components/map/ScaleBar'
import CoordinateGrid from '@/components/map/CoordinateGrid'
import LegendPanel from '@/components/map/LegendPanel'
import ViewModeCarousel from '@/components/map/ViewModeCarousel'

type MapMode = 'project'

interface Layer {
  id: string
  name: string
  type: 'original' | 'vegetation' | 'health' | 'classification' | 'detection' | 'heatmap' | 'roi' | 'trees' | 'pests' | 'water'
  visible: boolean
  opacity: number
  color: string
}

interface Project {
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
}

interface ProjectImage {
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

interface AnalysisSummary {
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

interface ImageAnalysis {
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

type DrawingTool = 'select' | 'point' | 'polygon' | 'measurement' | 'eraser' | 'roi'

interface Annotation {
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
    distanceM?: number  // Distância real em metros para medições
    areaM2?: number     // Área real em m² para polígonos
  }
  isNew?: boolean
}

interface ImageGSD {
  image_id: number
  gsd_m: number
  gsd_cm: number
  width: number
  height: number
  is_estimated: boolean
}

interface MapViewProps {
  projectId?: number
}

export default function MapView({ projectId }: MapViewProps) {
  const mode: MapMode = 'project'
  const [zoom, setZoom] = useState(100)
  const [showLayers, setShowLayers] = useState(true)

  // Pan/drag states
  const [isPanning, setIsPanning] = useState(false)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 })
  const imageContainerRef = useRef<HTMLDivElement>(null)

  // Project mode states
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [projectImages, setProjectImages] = useState<ProjectImage[]>([])
  const [analysisSummary, setAnalysisSummary] = useState<AnalysisSummary | null>(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [layers, setLayers] = useState<Layer[]>([
    { id: 'original', name: 'Imagem Original', type: 'original', visible: true, opacity: 100, color: '#ffffff' },
    { id: 'perimeter', name: 'Perimetro (ROI)', type: 'roi', visible: true, opacity: 90, color: '#3B82F6' },
    { id: 'vegetation', name: 'Cobertura Vegetal', type: 'vegetation', visible: false, opacity: 80, color: '#6AAF3D' },
    { id: 'health', name: 'Saude', type: 'health', visible: false, opacity: 70, color: '#F59E0B' },
    { id: 'trees', name: 'Arvores Detectadas', type: 'trees', visible: false, opacity: 85, color: '#22C55E' },
    { id: 'pests', name: 'Areas com Pragas', type: 'pests', visible: false, opacity: 75, color: '#EF4444' },
    { id: 'water', name: "Corpos d'Agua", type: 'water', visible: false, opacity: 70, color: '#3B82F6' },
    { id: 'heatmap', name: 'Mapa de Calor', type: 'heatmap', visible: false, opacity: 60, color: '#EF4444' },
  ])

  // ROI states
  const [roiPolygon, setRoiPolygon] = useState<number[][] | null>(null)
  const [roiResults, setRoiResults] = useState<Record<string, unknown> | null>(null)
  const [roiAnalyzing, setRoiAnalyzing] = useState(false)
  const [roiAnalyses, setRoiAnalyses] = useState<string[]>(['vegetation', 'health', 'plant_count'])

  // Project analysis
  const [analyzingProject, setAnalyzingProject] = useState(false)

  // UTM info
  const [utmInfo, setUtmInfo] = useState<UTMInfo | null>(null)

  // View mode carousel
  const [activeViewMode, setActiveViewMode] = useState('original')

  // Full report data for SVG overlays (trees, pests)
  const [fullReportData, setFullReportData] = useState<Record<string, unknown> | null>(null)

  // Drawing tools states
  const [activeTool, setActiveTool] = useState<DrawingTool>('select')
  const [selectedColor, setSelectedColor] = useState('#FF0000')
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null)
  const [showInfoPanel, setShowInfoPanel] = useState(true)
  const [imageAnalysis, setImageAnalysis] = useState<ImageAnalysis | null>(null)
  const [savingAnnotation, setSavingAnnotation] = useState(false)
  const [imageGSD, setImageGSD] = useState<ImageGSD | null>(null)

  // Fullscreen
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      mapContainerRef.current?.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }, [])

  // Sync fullscreen state with browser
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Tool instruction messages
  const toolInstructions: Record<string, string> = {
    'point': 'Clique na imagem para adicionar um marcador',
    'polygon': 'Clique para adicionar vertices. Duplo-clique para fechar. ESC para cancelar',
    'measurement': 'Clique no ponto inicial, depois no ponto final para medir',
    'eraser': 'Clique em uma anotacao para remove-la',
    'roi': 'Desenhe o perimetro da area de interesse. Duplo-clique para fechar. ESC para cancelar',
  }

  // Colors for annotations
  const annotationColors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080']

  // Calcular distância real em metros usando GSD
  const calculateRealDistance = (p1: { x: number; y: number }, p2: { x: number; y: number }): number => {
    if (!imageGSD) return 0
    const pixelDistance = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2))
    return pixelDistance * imageGSD.gsd_m
  }

  // Calcular área real de polígono em m² usando fórmula de Shoelace
  const calculatePolygonArea = (points: number[][]): number => {
    if (!imageGSD || points.length < 3) return 0
    let area = 0
    const n = points.length
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n
      area += points[i][0] * points[j][1]
      area -= points[j][0] * points[i][1]
    }
    const pixelArea = Math.abs(area / 2)
    // Converter de pixels² para m² usando GSD²
    return pixelArea * imageGSD.gsd_m * imageGSD.gsd_m
  }

  // Formatar área para exibição
  const formatArea = (areaM2: number): string => {
    if (areaM2 >= 10000) {
      return `${(areaM2 / 10000).toFixed(2)} ha`
    }
    return `${areaM2.toFixed(1)} m²`
  }

  // Formatar distância para exibição
  const formatDistance = (distanceM: number): string => {
    if (distanceM >= 1000) {
      return `${(distanceM / 1000).toFixed(2)} km`
    }
    return `${distanceM.toFixed(2)} m`
  }

  // Calcular centróide do polígono para posicionar texto
  const calculatePolygonCentroid = (points: number[][]): { x: number; y: number } => {
    let sumX = 0, sumY = 0
    for (const p of points) {
      sumX += p[0]
      sumY += p[1]
    }
    return { x: sumX / points.length, y: sumY / points.length }
  }

  // Get auth token from localStorage
  const getAuthToken = () => loadAuthToken()

  // Fetch projects from backend
  const fetchProjects = async () => {
    const token = getAuthToken()
    if (!token) {
      setError('Faça login para ver seus projetos')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = await apiGetProjects(0, 100)
      setProjects((data.projects || []).map((p: ApiProject) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        status: p.status,
        latitude: p.latitude,
        longitude: p.longitude,
        total_area_ha: p.total_area_ha,
        area_hectares: p.area_hectares,
        image_count: p.image_count,
        created_at: p.created_at,
        updated_at: p.updated_at,
      })))
    } catch (err: any) {
      if (err?.status === 401) {
        setError('Sessão expirada. Faça login novamente.')
      } else {
        setError('Erro ao carregar projetos. Verifique se o backend está rodando.')
      }
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch project images
  const fetchProjectImages = async (projectId: number) => {
    try {
      const data = await apiGetImages(projectId, 0, 100)
      setProjectImages(data.images || [])
      setSelectedImageIndex(0)
    } catch (err) {
      console.error('Erro ao carregar imagens:', err)
    }
  }

  // Fetch analysis summary
  const fetchAnalysisSummary = async (projectId: number) => {
    try {
      const data = await getProjectAnalysisSummary(projectId)
      setAnalysisSummary(data as any)
    } catch (err) {
      console.error('Erro ao carregar análise:', err)
      setAnalysisSummary(null)
    }
  }

  // Fetch image analysis
  const fetchImageAnalysis = async (imageId: number) => {
    try {
      const data = await apiGetAnalyses(imageId, undefined, undefined, 0, 100)
      const fullAnalysis = data.analyses?.find((a: any) => a.analysis_type === 'full_report' && a.status === 'completed')
      if (fullAnalysis?.results) {
        setImageAnalysis({
          vegetation_coverage: fullAnalysis.results.vegetation_coverage as any,
          vegetation_health: fullAnalysis.results.vegetation_health as any,
          object_detection: fullAnalysis.results.object_detection as any,
          vegetation_type: fullAnalysis.results.vegetation_type as any,
        })
      } else {
        setImageAnalysis(null)
      }
    } catch (err) {
      console.error('Erro ao carregar analise da imagem:', err)
      setImageAnalysis(null)
    }
  }

  // Fetch annotations for image
  const fetchAnnotations = async (imageId: number) => {
    try {
      const data = await apiGetAnnotations(imageId)
      setAnnotations(data.annotations?.map((a: any) => ({
        id: a.id,
        type: a.annotation_type,
        data: a.data,
      })) || [])
    } catch (err) {
      console.error('Erro ao carregar anotacoes:', err)
      setAnnotations([])
    }
  }

  // Fetch GSD for image
  const fetchImageGSD = async (imageId: number) => {
    const token = getAuthToken()
    if (!token) return

    try {
      const response = await fetch(`${API_BASE_URL}/images/${imageId}/gsd`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setImageGSD(data)
      }
    } catch (err) {
      console.error('Erro ao carregar GSD:', err)
      setImageGSD(null)
    }
  }

  // Save annotation
  const saveAnnotation = async (annotation: Annotation) => {
    if (!projectImages[selectedImageIndex]) return

    setSavingAnnotation(true)
    try {
      const saved = await apiCreateAnnotation(
        projectImages[selectedImageIndex].id,
        annotation.type,
        annotation.data as Record<string, unknown>,
      )
      setAnnotations(prev => [...prev.filter(a => a.isNew !== true), { id: saved.id, type: saved.annotation_type, data: saved.data as any }])
      setCurrentAnnotation(null)
    } catch (err) {
      console.error('Erro ao salvar anotacao:', err)
    } finally {
      setSavingAnnotation(false)
    }
  }

  // Delete annotation
  const deleteAnnotation = async (annotationId: number) => {
    try {
      await deleteAnnotationApi(annotationId)
      setAnnotations(prev => prev.filter(a => a.id !== annotationId))
    } catch (err) {
      console.error('Erro ao deletar anotacao:', err)
    }
  }

  // Handle ROI analysis
  const handleAnalyzeROI = async () => {
    if (!roiPolygon || roiPolygon.length < 3 || !projectImages[selectedImageIndex]) return
    setRoiAnalyzing(true)
    try {
      const result = await analyzeROI(
        projectImages[selectedImageIndex].id,
        roiPolygon,
        roiAnalyses,
      )
      setRoiResults(result.results || null)
    } catch (err) {
      console.error('Erro na analise ROI:', err)
      setRoiResults(null)
    } finally {
      setRoiAnalyzing(false)
    }
  }

  // Clear ROI
  const clearROI = () => {
    setRoiPolygon(null)
    setRoiResults(null)
    setCurrentAnnotation(null)
  }

  // Analyze full project
  const handleAnalyzeProject = async () => {
    const pid = selectedProject?.id || projectId
    if (!pid) return
    setAnalyzingProject(true)
    try {
      await analyzeProject(pid)
    } catch (err) {
      console.error('Erro ao iniciar analise:', err)
    } finally {
      setAnalyzingProject(false)
    }
  }

  // Fetch UTM info
  const fetchUTMInfo = async (imageId: number) => {
    try {
      const data = await getImageUTMInfo(imageId)
      setUtmInfo(data)
    } catch (err) {
      console.error('Erro ao carregar UTM:', err)
      setUtmInfo(null)
    }
  }

  // View mode change handler
  const handleViewModeChange = (modeId: string, activeLayers: string[]) => {
    setActiveViewMode(modeId)
    setLayers(prev => prev.map(layer => ({
      ...layer,
      visible: activeLayers.includes(layer.id),
    })))
  }

  // Handle canvas click for drawing
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool === 'select' || activeTool === 'eraser') return

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (activeTool === 'roi') {
      if (!currentAnnotation) {
        setCurrentAnnotation({
          type: 'roi',
          data: { points: [[x, y]], color: '#3B82F6' },
          isNew: true,
        })
      } else if (currentAnnotation.type === 'roi' && currentAnnotation.data.points) {
        const points = [...currentAnnotation.data.points, [x, y]]
        setCurrentAnnotation({
          ...currentAnnotation,
          data: { ...currentAnnotation.data, points },
        })
      }
      return
    }

    if (activeTool === 'point') {
      const newAnnotation: Annotation = {
        type: 'point',
        data: { x, y, label: `Ponto ${annotations.length + 1}`, color: selectedColor },
        isNew: true,
      }
      setAnnotations(prev => [...prev, newAnnotation])
      saveAnnotation(newAnnotation)
    } else if (activeTool === 'measurement') {
      if (!currentAnnotation) {
        setCurrentAnnotation({
          type: 'measurement',
          data: { start: { x, y }, color: selectedColor },
          isNew: true,
        })
      } else if (currentAnnotation.type === 'measurement' && currentAnnotation.data.start) {
        const start = currentAnnotation.data.start
        const end = { x, y }
        const distanceM = calculateRealDistance(start, end)
        const newAnnotation: Annotation = {
          type: 'measurement',
          data: {
            start,
            end,
            color: selectedColor,
            label: imageGSD ? formatDistance(distanceM) : `${Math.sqrt(Math.pow(x - start.x, 2) + Math.pow(y - start.y, 2)).toFixed(0)}px`,
            distanceM: distanceM,
          },
          isNew: true,
        }
        setAnnotations(prev => [...prev, newAnnotation])
        saveAnnotation(newAnnotation)
        setCurrentAnnotation(null)
      }
    } else if (activeTool === 'polygon') {
      if (!currentAnnotation) {
        setCurrentAnnotation({
          type: 'polygon',
          data: { points: [[x, y]], color: selectedColor },
          isNew: true,
        })
      } else if (currentAnnotation.type === 'polygon' && currentAnnotation.data.points) {
        const points = [...currentAnnotation.data.points, [x, y]]
        setCurrentAnnotation({
          ...currentAnnotation,
          data: { ...currentAnnotation.data, points },
        })
      }
    }
  }

  // Handle double click to finish polygon or ROI
  const handleCanvasDoubleClick = () => {
    // Finish ROI polygon
    if (activeTool === 'roi' && currentAnnotation && currentAnnotation.type === 'roi' && currentAnnotation.data.points && currentAnnotation.data.points.length >= 3) {
      setRoiPolygon(currentAnnotation.data.points)
      setCurrentAnnotation(null)
      setActiveTool('select')
      // Save ROI as special annotation
      const areaM2 = calculatePolygonArea(currentAnnotation.data.points)
      const roiAnnotation: Annotation = {
        type: 'polygon',
        data: {
          points: currentAnnotation.data.points,
          color: '#3B82F6',
          label: imageGSD ? `ROI - ${formatArea(areaM2)}` : 'ROI - Perimetro',
          areaM2,
        },
        isNew: true,
      }
      saveAnnotation(roiAnnotation)
      return
    }

    if (activeTool === 'polygon' && currentAnnotation && currentAnnotation.data.points && currentAnnotation.data.points.length >= 3) {
      const points = currentAnnotation.data.points
      const areaM2 = calculatePolygonArea(points)
      const newAnnotation: Annotation = {
        type: 'polygon',
        data: {
          ...currentAnnotation.data,
          label: imageGSD ? formatArea(areaM2) : `Área ${annotations.filter(a => a.type === 'polygon').length + 1}`,
          areaM2: areaM2,
        },
        isNew: true,
      }
      setAnnotations(prev => [...prev, newAnnotation])
      saveAnnotation(newAnnotation)
      setCurrentAnnotation(null)
    }
  }

  // Handle ESC key to cancel current drawing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && currentAnnotation) {
        setCurrentAnnotation(null)
        // Optionally reset tool to select mode
        // setActiveTool('select')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentAnnotation])

  // Load projects on mount
  useEffect(() => {
    if (mode === 'project') {
      fetchProjects()
    }
  }, [mode])

  // Auto-select project when projectId prop is provided
  useEffect(() => {
    if (projectId && projects.length > 0 && !selectedProject) {
      const target = projects.find(p => p.id === projectId)
      if (target) {
        setSelectedProject(target)
      }
    }
  }, [projectId, projects])

  // When projectId is provided but projects haven't loaded yet,
  // start loading images directly to avoid waiting for the full project list
  useEffect(() => {
    if (projectId && !selectedProject && projects.length === 0) {
      fetchProjectImages(projectId)
      fetchAnalysisSummary(projectId)
    }
  }, [projectId])

  // Load project details when selected
  useEffect(() => {
    if (selectedProject) {
      fetchProjectImages(selectedProject.id)
      fetchAnalysisSummary(selectedProject.id)
    } else if (!projectId) {
      // Only clear when no projectId prop (manual deselection)
      setProjectImages([])
      setAnalysisSummary(null)
    }
  }, [selectedProject])

  // Auto-refresh when analysis is pending (polling every 5 seconds)
  useEffect(() => {
    if (!selectedProject || !analysisSummary) return

    const hasPendingAnalysis = analysisSummary.pending_images > 0 ||
                               analysisSummary.status === 'processing'

    if (!hasPendingAnalysis) return

    const intervalId = setInterval(() => {
      fetchAnalysisSummary(selectedProject.id)
      fetchProjectImages(selectedProject.id)
    }, 5000) // Poll every 5 seconds

    return () => clearInterval(intervalId)
  }, [selectedProject, analysisSummary])

  const toggleLayer = (id: string) => {
    setLayers(prev =>
      prev.map(layer =>
        layer.id === id ? { ...layer, visible: !layer.visible } : layer
      )
    )
  }

  const updateOpacity = (id: string, opacity: number) => {
    setLayers(prev =>
      prev.map(layer =>
        layer.id === id ? { ...layer, opacity } : layer
      )
    )
  }


  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR')
    } catch {
      return dateStr
    }
  }

  const getHealthColor = (health: number) => {
    if (health >= 70) return 'text-green-400'
    if (health >= 40) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getHealthLabel = (health: number) => {
    if (health >= 70) return 'Bom'
    if (health >= 40) return 'Moderado'
    return 'Baixo'
  }

  // State for image blob URL
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null)
  const [imageLoading, setImageLoading] = useState(false)
  const currentImageUrlRef = useRef<string | null>(null)

  // Export current image
  const handleExportImage = useCallback(() => {
    if (!currentImageUrl) return
    const a = document.createElement('a')
    a.href = currentImageUrl
    const filename = projectImages[selectedImageIndex]?.original_filename || 'imagem_exportada.png'
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }, [currentImageUrl, projectImages, selectedImageIndex])

  // Export GeoJSON annotations
  const [exportingGeoJSON, setExportingGeoJSON] = useState(false)
  const handleExportGeoJSON = useCallback(async () => {
    if (!selectedProject) return
    setExportingGeoJSON(true)
    try {
      const currentImage = projectImages[selectedImageIndex]
      const geojson = await exportAnnotationsGeoJSON(
        currentImage?.id,
        undefined
      )
      const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/geo+json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `anotacoes_${currentImage?.original_filename || selectedProject.name}.geojson`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Erro ao exportar GeoJSON:', err)
    } finally {
      setExportingGeoJSON(false)
    }
  }, [selectedProject, projectImages, selectedImageIndex])

  // Load image with authentication (try thumbnail first, fallback to full file)
  const loadImage = useCallback(async (image: ProjectImage) => {
    const token = getAuthToken()
    if (!token) return

    setImageLoading(true)
    try {
      // Try thumbnail first
      let response = await fetch(`${API_BASE_URL}/images/${image.id}/thumbnail`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })

      // Fallback to full file if thumbnail fails
      if (!response.ok) {
        response = await fetch(`${API_BASE_URL}/images/${image.id}/file`, {
          headers: { 'Authorization': `Bearer ${token}` },
        })
      }

      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        // Revoke previous URL to free memory
        if (currentImageUrlRef.current) {
          URL.revokeObjectURL(currentImageUrlRef.current)
        }
        currentImageUrlRef.current = url
        setCurrentImageUrl(url)
      } else {
        console.error('Erro ao carregar imagem: status', response.status)
        setCurrentImageUrl(null)
      }
    } catch (err) {
      console.error('Erro ao carregar imagem:', err)
      setCurrentImageUrl(null)
    } finally {
      setImageLoading(false)
    }
  }, [])

  // Load image when selected
  useEffect(() => {
    if (projectImages.length > 0 && selectedImageIndex >= 0) {
      const imgId = projectImages[selectedImageIndex].id
      loadImage(projectImages[selectedImageIndex])
      fetchImageAnalysis(imgId)
      fetchAnnotations(imgId)
      fetchImageGSD(imgId)
      fetchUTMInfo(imgId)
      // Fetch full report data for SVG overlays
      apiGetAnalyses(imgId, undefined, undefined, 0, 100).then(data => {
        const full = data.analyses?.find((a: Analysis) => a.analysis_type === 'full_report' && a.status === 'completed')
        setFullReportData(full?.results as Record<string, unknown> || null)
      }).catch(() => setFullReportData(null))
      // Reset ROI on image change
      setRoiPolygon(null)
      setRoiResults(null)
    } else {
      setCurrentImageUrl(null)
      setImageAnalysis(null)
      setAnnotations([])
      setImageGSD(null)
      setUtmInfo(null)
      setFullReportData(null)
    }
    // Cleanup on unmount
    return () => {
      if (currentImageUrlRef.current) {
        URL.revokeObjectURL(currentImageUrlRef.current)
      }
    }
  }, [projectImages, selectedImageIndex, loadImage])

  // Mousewheel zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -10 : 10
    setZoom(prev => Math.min(300, Math.max(25, prev + delta)))
  }, [])

  // Attach wheel event to image container
  useEffect(() => {
    const container = imageContainerRef.current
    if (!container) return
    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  // Pan handlers
  const handlePanStart = useCallback((e: React.MouseEvent) => {
    if (activeTool !== 'select') return
    setIsPanning(true)
    setLastPanPoint({ x: e.clientX, y: e.clientY })
  }, [activeTool])

  const handlePanMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return
    const dx = e.clientX - lastPanPoint.x
    const dy = e.clientY - lastPanPoint.y
    setPanOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }))
    setLastPanPoint({ x: e.clientX, y: e.clientY })
  }, [isPanning, lastPanPoint])

  const handlePanEnd = useCallback(() => {
    setIsPanning(false)
  }, [])

  // Reset zoom and pan
  const resetView = useCallback(() => {
    setZoom(100)
    setPanOffset({ x: 0, y: 0 })
  }, [])

  return (
    <div ref={mapContainerRef} className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl overflow-hidden h-full flex flex-col">
      {/* Tabs de modo */}
      <div className="flex border-b border-gray-700/50">
        <button
          onClick={() => { setSelectedProject(null); }}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 transition-colors ${
            mode === 'project'
              ? 'bg-[#6AAF3D]/20 text-[#6AAF3D] border-b-2 border-[#6AAF3D]'
              : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
          }`}
        >
          <FolderOpen size={18} />
          <span className="font-medium">Ver Projeto</span>
        </button>
      </div>

      {/* Conteúdo */}
      {mode === 'project' && (
        // ========== VER PROJETO ==========
        <div className="flex flex-1 overflow-hidden">
          {/* Lista de projetos ou visualização */}
          {!selectedProject ? (
            // Lista de projetos para selecionar
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="max-w-2xl mx-auto">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-white text-lg font-semibold">Selecione um Projeto</h3>
                  <button
                    onClick={fetchProjects}
                    disabled={loading}
                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                    title="Atualizar lista"
                  >
                    <RefreshCw size={18} className={`text-gray-400 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                <p className="text-gray-400 text-sm mb-6">Escolha um projeto para visualizar as imagens e análises no mapa</p>

                {/* Loading state */}
                {loading && (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 size={32} className="text-[#6AAF3D] animate-spin" />
                  </div>
                )}

                {/* Error state */}
                {error && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <AlertCircle size={48} className="text-red-400 mb-4" />
                    <p className="text-red-400 mb-4">{error}</p>
                    <button
                      onClick={fetchProjects}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                      Tentar novamente
                    </button>
                  </div>
                )}

                {/* Empty state */}
                {!loading && !error && projects.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FolderOpen size={48} className="text-gray-600 mb-4" />
                    <p className="text-gray-400 mb-2">Nenhum projeto encontrado</p>
                    <p className="text-gray-500 text-sm">Crie um novo projeto na seção de Upload</p>
                  </div>
                )}

                {/* Projects list */}
                {!loading && !error && projects.length > 0 && (
                  <div className="space-y-3">
                    {projects.map(project => (
                      <div
                        key={project.id}
                        onClick={() => setSelectedProject(project)}
                        className="flex items-center gap-4 p-4 bg-gray-800/50 hover:bg-gray-800 rounded-xl cursor-pointer transition-colors border border-gray-700/50 hover:border-[#6AAF3D]/50"
                      >
                        <div className="w-16 h-16 bg-gradient-to-br from-[#6AAF3D]/30 to-green-900/30 rounded-lg flex items-center justify-center">
                          <ImageIcon size={28} className="text-[#6AAF3D]" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-white font-medium">{project.name}</h4>
                          <p className="text-gray-500 text-sm">
                            {project.image_count} imagem(ns) • {formatDate(project.created_at)}
                          </p>
                          <div className="flex items-center gap-4 mt-1">
                            {project.total_area_ha && (
                              <span className="text-xs text-gray-400">
                                Área: <span className="text-[#6AAF3D]">{project.total_area_ha} ha</span>
                              </span>
                            )}
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              project.status === 'completed'
                                ? 'bg-green-500/20 text-green-400'
                                : project.status === 'processing'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-gray-500/20 text-gray-400'
                            }`}>
                              {project.status === 'completed' ? 'Analisado' :
                               project.status === 'processing' ? 'Processando' : 'Pendente'}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="text-gray-500" size={20} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Visualização do projeto selecionado
            <>
              {/* Área do mapa/imagem */}
              <div className="flex-1 relative bg-gray-900">
                {/* View Mode Carousel no topo */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30">
                  <ViewModeCarousel activeMode={activeViewMode} onModeChange={handleViewModeChange} />
                </div>

                {/* Toolbar do mapa */}
                <div className="absolute top-14 left-4 right-4 z-20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedProject(null)}
                      className="px-3 py-2 bg-gray-800/90 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
                    >
                      ← Voltar
                    </button>

                    {/* Toolbar de ferramentas de desenho */}
                    <div className="flex items-center gap-1 bg-gray-800/90 rounded-lg p-1">
                      <button
                        onClick={() => setActiveTool('select')}
                        className={`p-2 rounded-lg transition-colors ${activeTool === 'select' ? 'bg-[#6AAF3D] text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
                        title="Selecionar"
                      >
                        <MousePointer size={18} />
                      </button>
                      <button
                        onClick={() => setActiveTool('point')}
                        className={`p-2 rounded-lg transition-colors ${activeTool === 'point' ? 'bg-[#6AAF3D] text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
                        title="Adicionar marcador"
                      >
                        <MapPin size={18} />
                      </button>
                      <button
                        onClick={() => setActiveTool('polygon')}
                        className={`p-2 rounded-lg transition-colors ${activeTool === 'polygon' ? 'bg-[#6AAF3D] text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
                        title="Desenhar poligono"
                      >
                        <PenTool size={18} />
                      </button>
                      <button
                        onClick={() => setActiveTool('roi')}
                        className={`p-2 rounded-lg transition-colors ${activeTool === 'roi' ? 'bg-blue-500 text-white' : 'text-blue-400 hover:text-white hover:bg-gray-700'}`}
                        title="Desenhar ROI (Region of Interest) - analise dentro do perimetro"
                      >
                        <Target size={18} />
                      </button>
                      <button
                        onClick={() => setActiveTool('measurement')}
                        className={`p-2 rounded-lg transition-colors ${activeTool === 'measurement' ? 'bg-[#6AAF3D] text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
                        title="Medir distancia"
                      >
                        <Ruler size={18} />
                      </button>
                      <button
                        onClick={() => setActiveTool('eraser')}
                        className={`p-2 rounded-lg transition-colors ${activeTool === 'eraser' ? 'bg-red-500 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
                        title="Apagar anotacao"
                      >
                        <Trash2 size={18} />
                      </button>

                      {/* Seletor de cor */}
                      <div className="w-px h-6 bg-gray-600 mx-1" />
                      <div className="flex items-center gap-1">
                        {annotationColors.slice(0, 4).map(color => (
                          <button
                            key={color}
                            onClick={() => setSelectedColor(color)}
                            className={`w-6 h-6 rounded-full border-2 transition-all ${selectedColor === color ? 'border-white scale-110' : 'border-transparent'}`}
                            style={{ backgroundColor: color }}
                            title={`Cor: ${color}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowInfoPanel(!showInfoPanel)}
                      className={`p-2 rounded-lg transition-colors ${showInfoPanel ? 'bg-[#6AAF3D] text-white' : 'bg-gray-800/90 text-white hover:bg-gray-700'}`}
                      title="Painel de informacoes"
                    >
                      <Info size={18} />
                    </button>
                    <button
                      onClick={handleExportGeoJSON}
                      disabled={exportingGeoJSON || !projectImages[selectedImageIndex]}
                      className="p-2 bg-gray-800/90 hover:bg-gray-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                      title="Exportar anotacoes como GeoJSON"
                    >
                      {exportingGeoJSON ? <Loader2 size={18} className="animate-spin" /> : <Globe size={18} />}
                    </button>
                    <button
                      onClick={handleExportImage}
                      disabled={!currentImageUrl}
                      className="p-2 bg-gray-800/90 hover:bg-gray-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                      title="Exportar imagem"
                    >
                      <Download size={18} />
                    </button>
                    <button
                      onClick={toggleFullscreen}
                      className="p-2 bg-gray-800/90 hover:bg-gray-700 text-white rounded-lg transition-colors"
                      title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
                    >
                      {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                    </button>
                  </div>
                </div>

                {/* Barra de instrucao da ferramenta ativa */}
                {activeTool !== 'select' && toolInstructions[activeTool] && (
                  <div className="absolute top-[110px] left-1/2 -translate-x-1/2 z-10 flex justify-center">
                    <div className={`px-4 py-2 ${activeTool === 'roi' ? 'bg-blue-600/90' : 'bg-blue-600/90'} text-white text-sm rounded-lg shadow-lg flex items-center gap-2`}>
                      <Info size={16} />
                      {toolInstructions[activeTool]}
                    </div>
                  </div>
                )}

                {/* ROI: Botao flutuante para analisar area + painel de resultados */}
                {roiPolygon && roiPolygon.length >= 3 && (
                  <div className="absolute top-[110px] left-4 z-20 w-64">
                    {!roiResults ? (
                      <div className="bg-gray-800/95 rounded-xl border border-blue-500/50 p-4 shadow-xl">
                        <h4 className="text-blue-400 font-medium text-sm mb-3 flex items-center gap-2">
                          <Target size={16} /> Analisar Area ROI
                        </h4>
                        <div className="space-y-2 mb-3">
                          {['vegetation', 'health', 'plant_count', 'pest_disease', 'biomass'].map(a => (
                            <label key={a} className="flex items-center gap-2 text-xs text-gray-300">
                              <input
                                type="checkbox"
                                checked={roiAnalyses.includes(a)}
                                onChange={(e) => {
                                  if (e.target.checked) setRoiAnalyses(prev => [...prev, a])
                                  else setRoiAnalyses(prev => prev.filter(x => x !== a))
                                }}
                                className="rounded"
                              />
                              {a === 'vegetation' ? 'Vegetacao' : a === 'health' ? 'Saude' : a === 'plant_count' ? 'Contagem' : a === 'pest_disease' ? 'Pragas' : 'Biomassa'}
                            </label>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleAnalyzeROI}
                            disabled={roiAnalyzing}
                            className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
                          >
                            {roiAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <Target size={14} />}
                            {roiAnalyzing ? 'Analisando...' : 'Analisar'}
                          </button>
                          <button
                            onClick={clearROI}
                            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
                          >
                            Limpar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-800/95 rounded-xl border border-blue-500/50 p-4 shadow-xl max-h-[50vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-blue-400 font-medium text-sm flex items-center gap-2">
                            <Target size={16} /> Resultados ROI
                          </h4>
                          <button onClick={clearROI} className="p-1 hover:bg-gray-700 rounded">
                            <X size={14} className="text-gray-400" />
                          </button>
                        </div>

                        {/* ROI metadata */}
                        {(roiResults as any)?.roi_metadata && (
                          <div className="p-2 bg-blue-500/10 rounded-lg mb-2">
                            <p className="text-xs text-blue-300">
                              Area: {((roiResults as any).roi_metadata.area_pixels * (imageGSD?.gsd_m || 0.03) * (imageGSD?.gsd_m || 0.03)).toFixed(1)} m²
                              {' '}| Cobertura: {(roiResults as any).roi_metadata.coverage_pct}%
                            </p>
                          </div>
                        )}

                        {/* Vegetation */}
                        {(roiResults as any)?.vegetation && !(roiResults as any).vegetation.error && (
                          <div className="flex items-center gap-2 p-2 bg-gray-700/30 rounded-lg mb-1">
                            <Leaf className="text-[#6AAF3D]" size={14} />
                            <div className="flex-1">
                              <p className="text-xs text-gray-500">Vegetacao</p>
                              <p className="text-white text-sm font-medium">
                                {((roiResults as any).vegetation.vegetation_percentage ?? 0).toFixed(1)}%
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Health */}
                        {(roiResults as any)?.health && !(roiResults as any).health.error && (
                          <div className="flex items-center gap-2 p-2 bg-gray-700/30 rounded-lg mb-1">
                            <CheckCircle className="text-yellow-400" size={14} />
                            <div className="flex-1">
                              <p className="text-xs text-gray-500">Saude</p>
                              <p className="text-white text-sm font-medium">
                                {((roiResults as any).health.health_index ?? 0).toFixed(1)}%
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Plant count */}
                        {(roiResults as any)?.plant_count && !(roiResults as any).plant_count.error && (
                          <div className="flex items-center gap-2 p-2 bg-gray-700/30 rounded-lg mb-1">
                            <Trees className="text-green-400" size={14} />
                            <div className="flex-1">
                              <p className="text-xs text-gray-500">Arvores no ROI</p>
                              <p className="text-white text-sm font-medium">
                                {(roiResults as any).plant_count.total_count}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Pest */}
                        {(roiResults as any)?.pest_disease && !(roiResults as any).pest_disease.error && (
                          <div className="flex items-center gap-2 p-2 bg-gray-700/30 rounded-lg mb-1">
                            <Bug className="text-red-400" size={14} />
                            <div className="flex-1">
                              <p className="text-xs text-gray-500">Pragas</p>
                              <p className="text-white text-sm font-medium">
                                Infeccao: {((roiResults as any).pest_disease.infection_rate ?? 0).toFixed(1)}%
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Biomass */}
                        {(roiResults as any)?.biomass && !(roiResults as any).biomass.error && (
                          <div className="flex items-center gap-2 p-2 bg-gray-700/30 rounded-lg mb-1">
                            <Leaf className="text-emerald-400" size={14} />
                            <div className="flex-1">
                              <p className="text-xs text-gray-500">Biomassa</p>
                              <p className="text-white text-sm font-medium">
                                Indice: {((roiResults as any).biomass.biomass_index ?? 0).toFixed(1)}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Botao flutuante "Analisar Projeto" — aparece após ROI ou se projeto sem analise */}
                {(roiPolygon || (analysisSummary && analysisSummary.analyzed_images === 0)) && !analyzingProject && (
                  <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-20">
                    <button
                      onClick={handleAnalyzeProject}
                      className="px-6 py-3 bg-[#6AAF3D] hover:bg-[#5a9a34] text-white font-semibold rounded-xl shadow-lg shadow-[#6AAF3D]/30 transition-all flex items-center gap-2 text-sm"
                    >
                      <Play size={18} />
                      Analisar Projeto Completo
                    </button>
                  </div>
                )}
                {analyzingProject && (
                  <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-20">
                    <div className="px-6 py-3 bg-yellow-500/90 text-white font-semibold rounded-xl shadow-lg flex items-center gap-2 text-sm">
                      <Loader2 size={18} className="animate-spin" />
                      Analise iniciada...
                    </div>
                  </div>
                )}

                {/* Exibir imagem do projeto */}
                {projectImages.length > 0 ? (
                  <div
                    ref={imageContainerRef}
                    className="absolute inset-0 overflow-hidden"
                    onClick={handleCanvasClick}
                    onDoubleClick={handleCanvasDoubleClick}
                    onMouseDown={handlePanStart}
                    onMouseMove={handlePanMove}
                    onMouseUp={handlePanEnd}
                    onMouseLeave={handlePanEnd}
                    style={{ cursor: activeTool === 'select' ? (isPanning ? 'grabbing' : 'grab') : activeTool === 'eraser' ? 'not-allowed' : 'crosshair' }}
                  >
                    <div
                      className="relative min-w-full min-h-full"
                      style={{
                        transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom / 100})`,
                        transformOrigin: 'center center',
                      }}
                    >
                    {imageLoading ? (
                      <div className="flex items-center justify-center h-full" style={{ minHeight: '100vh' }}>
                        <Loader2 size={48} className="text-[#6AAF3D] animate-spin" />
                      </div>
                    ) : currentImageUrl ? (
                      <img
                        src={currentImageUrl}
                        alt={projectImages[selectedImageIndex]?.original_filename || 'Imagem do projeto'}
                        className="w-full h-full object-contain bg-black"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full" style={{ minHeight: '100vh' }}>
                        <div className="text-center">
                          <AlertCircle size={48} className="text-gray-600 mx-auto mb-4" />
                          <p className="text-gray-400 mb-3">Erro ao carregar imagem</p>
                          <button
                            onClick={() => projectImages[selectedImageIndex] && loadImage(projectImages[selectedImageIndex])}
                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors flex items-center gap-2 mx-auto"
                          >
                            <RefreshCw size={14} />
                            Tentar novamente
                          </button>
                        </div>
                      </div>
                    )}
                    {/* Overlay de camadas baseado em dados reais */}
                    {layers.find(l => l.type === 'vegetation')?.visible && (() => {
                      const vegLayer = layers.find(l => l.type === 'vegetation')!
                      const vegPct = imageAnalysis?.vegetation_coverage?.vegetation_percentage
                      // Intensidade baseada na % de vegetação real (ou gradiente padrão se sem dados)
                      const intensity = vegPct != null ? Math.min(vegPct / 100, 1) * 0.5 : 0.3
                      return (
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            background: vegPct != null
                              ? `radial-gradient(ellipse at center, rgba(106,175,61,${intensity}) 0%, rgba(106,175,61,${intensity * 0.3}) 70%, transparent 100%)`
                              : 'linear-gradient(135deg, rgba(106,175,61,0.3) 0%, rgba(245,158,11,0.2) 50%, rgba(239,68,68,0.15) 100%)',
                            mixBlendMode: 'overlay',
                            opacity: vegLayer.opacity / 100,
                          }}
                        />
                      )
                    })()}
                    {layers.find(l => l.type === 'health')?.visible && (() => {
                      const healthLayer = layers.find(l => l.type === 'health')!
                      const healthIdx = imageAnalysis?.vegetation_health?.health_index
                      // Cor baseada no health_index: verde >= 70, amarelo 50-70, vermelho < 50
                      const healthColor = healthIdx != null
                        ? healthIdx >= 70 ? 'rgba(34,197,94,0.35)' : healthIdx >= 50 ? 'rgba(245,158,11,0.35)' : 'rgba(239,68,68,0.35)'
                        : 'rgba(245,158,11,0.25)'
                      return (
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            backgroundColor: healthColor,
                            mixBlendMode: 'overlay',
                            opacity: healthLayer.opacity / 100,
                          }}
                        />
                      )
                    })()}
                    {layers.find(l => l.type === 'heatmap')?.visible && (() => {
                      const heatLayer = layers.find(l => l.type === 'heatmap')!
                      const vegPct = imageAnalysis?.vegetation_coverage?.vegetation_percentage ?? 50
                      // Tom quente/frio baseado na cobertura vegetal (mais verde = mais frio)
                      const hue = Math.round((vegPct / 100) * 120) // 0=vermelho, 120=verde
                      return (
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            background: `radial-gradient(ellipse at 30% 30%, hsla(${hue},80%,50%,0.4) 0%, hsla(${Math.max(0, hue - 60)},80%,50%,0.3) 50%, hsla(0,80%,50%,0.2) 100%)`,
                            mixBlendMode: 'overlay',
                            opacity: heatLayer.opacity / 100,
                          }}
                        />
                      )
                    })()}
                    {/* Camada water - overlay azul */}
                    {layers.find(l => l.type === 'water')?.visible && (() => {
                      const waterLayer = layers.find(l => l.type === 'water')!
                      return (
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            background: 'radial-gradient(ellipse at 60% 70%, rgba(59,130,246,0.3) 0%, transparent 60%)',
                            mixBlendMode: 'overlay',
                            opacity: waterLayer.opacity / 100,
                          }}
                        />
                      )
                    })()}

                    {/* UTM Coordinate Grid */}
                    {utmInfo && utmInfo.has_gps && projectImages[selectedImageIndex]?.width && projectImages[selectedImageIndex]?.height && (
                      <CoordinateGrid
                        utmInfo={utmInfo}
                        imageWidth={projectImages[selectedImageIndex].width!}
                        imageHeight={projectImages[selectedImageIndex].height!}
                      />
                    )}

                    {/* Renderizar anotacoes + overlays SVG */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none">
                      {/* SVG overlay: Árvores detectadas */}
                      {layers.find(l => l.type === 'trees')?.visible && fullReportData && (() => {
                        const treesLayer = layers.find(l => l.type === 'trees')!
                        const plantCount = (fullReportData as any)?.plant_count || (fullReportData as any)?.tree_count
                        const treeList = plantCount?.locations || plantCount?.trees || []
                        return treeList.map((tree: any, i: number) => {
                          const center = tree.center
                          if (!center) return null
                          const radius = Math.max(4, Math.sqrt((tree.area || 200)) / 3)
                          return (
                            <circle
                              key={`tree-${i}`}
                              cx={center[0]}
                              cy={center[1]}
                              r={radius}
                              fill="rgba(34,197,94,0.5)"
                              stroke="#22C55E"
                              strokeWidth={1.5}
                              opacity={treesLayer.opacity / 100}
                            />
                          )
                        })
                      })()}

                      {/* SVG overlay: Pragas */}
                      {layers.find(l => l.type === 'pests')?.visible && fullReportData && (() => {
                        const pestsLayer = layers.find(l => l.type === 'pests')!
                        const pestData = (fullReportData as any)?.pest_disease
                        const regions = pestData?.affected_regions || []
                        return regions.map((region: any, i: number) => {
                          const bbox = region.bbox
                          if (!bbox || bbox.length < 4) return null
                          return (
                            <rect
                              key={`pest-${i}`}
                              x={bbox[0]}
                              y={bbox[1]}
                              width={bbox[2] - bbox[0]}
                              height={bbox[3] - bbox[1]}
                              fill="rgba(239,68,68,0.3)"
                              stroke="#EF4444"
                              strokeWidth={1.5}
                              strokeDasharray="4,2"
                              opacity={pestsLayer.opacity / 100}
                            />
                          )
                        })
                      })()}

                      {/* ROI polygon visual */}
                      {roiPolygon && roiPolygon.length >= 3 && layers.find(l => l.type === 'roi')?.visible && (
                        <polygon
                          points={roiPolygon.map(p => p.join(',')).join(' ')}
                          fill="rgba(59,130,246,0.15)"
                          stroke="#3B82F6"
                          strokeWidth={2.5}
                          strokeDasharray="8,4"
                        />
                      )}
                      {annotations.map((ann, idx) => {
                        if (ann.type === 'point' && ann.data.x && ann.data.y) {
                          return (
                            <g key={ann.id || `new-${idx}`}>
                              <circle
                                cx={ann.data.x}
                                cy={ann.data.y}
                                r={8}
                                fill={ann.data.color || '#FF0000'}
                                stroke="white"
                                strokeWidth={2}
                                style={{ pointerEvents: activeTool === 'eraser' ? 'auto' : 'none', cursor: activeTool === 'eraser' ? 'pointer' : 'default' }}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (activeTool === 'eraser' && ann.id) deleteAnnotation(ann.id)
                                }}
                              />
                              {ann.data.label && (
                                <text x={(ann.data.x || 0) + 12} y={(ann.data.y || 0) + 4} fill="white" fontSize={12} fontWeight="bold">
                                  {ann.data.label}
                                </text>
                              )}
                            </g>
                          )
                        }
                        if (ann.type === 'measurement' && ann.data.start && ann.data.end) {
                          return (
                            <g key={ann.id || `new-${idx}`}>
                              <line
                                x1={ann.data.start.x}
                                y1={ann.data.start.y}
                                x2={ann.data.end.x}
                                y2={ann.data.end.y}
                                stroke={ann.data.color || '#0000FF'}
                                strokeWidth={3}
                                style={{ pointerEvents: activeTool === 'eraser' ? 'auto' : 'none', cursor: activeTool === 'eraser' ? 'pointer' : 'default' }}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (activeTool === 'eraser' && ann.id) deleteAnnotation(ann.id)
                                }}
                              />
                              <circle cx={ann.data.start.x} cy={ann.data.start.y} r={5} fill={ann.data.color || '#0000FF'} stroke="white" strokeWidth={2} />
                              <circle cx={ann.data.end.x} cy={ann.data.end.y} r={5} fill={ann.data.color || '#0000FF'} stroke="white" strokeWidth={2} />
                              {ann.data.label && (
                                <>
                                  {/* Fundo do texto para melhor legibilidade */}
                                  <rect
                                    x={(ann.data.start.x + ann.data.end.x) / 2 - 35}
                                    y={(ann.data.start.y + ann.data.end.y) / 2 - 22}
                                    width={70}
                                    height={18}
                                    fill="rgba(0,0,0,0.7)"
                                    rx={4}
                                  />
                                  <text
                                    x={(ann.data.start.x + ann.data.end.x) / 2}
                                    y={(ann.data.start.y + ann.data.end.y) / 2 - 8}
                                    fill="white"
                                    fontSize={12}
                                    fontWeight="bold"
                                    textAnchor="middle"
                                  >
                                    {ann.data.label}
                                  </text>
                                </>
                              )}
                            </g>
                          )
                        }
                        if (ann.type === 'polygon' && ann.data.points && ann.data.points.length >= 3) {
                          const svgPoints = ann.data.points.map(p => p.join(',')).join(' ')
                          const centroid = calculatePolygonCentroid(ann.data.points)
                          return (
                            <g key={ann.id || `new-${idx}`}>
                              <polygon
                                points={svgPoints}
                                fill={`${ann.data.color || '#00FF00'}40`}
                                stroke={ann.data.color || '#00FF00'}
                                strokeWidth={2}
                                style={{ pointerEvents: activeTool === 'eraser' ? 'auto' : 'none', cursor: activeTool === 'eraser' ? 'pointer' : 'default' }}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (activeTool === 'eraser' && ann.id) deleteAnnotation(ann.id)
                                }}
                              />
                              {ann.data.label && (
                                <>
                                  {/* Fundo do texto para melhor legibilidade */}
                                  <rect
                                    x={centroid.x - 35}
                                    y={centroid.y - 10}
                                    width={70}
                                    height={20}
                                    fill="rgba(0,0,0,0.7)"
                                    rx={4}
                                  />
                                  <text
                                    x={centroid.x}
                                    y={centroid.y + 5}
                                    fill="white"
                                    fontSize={12}
                                    fontWeight="bold"
                                    textAnchor="middle"
                                  >
                                    {ann.data.label}
                                  </text>
                                </>
                              )}
                            </g>
                          )
                        }
                        return null
                      })}
                      {/* Desenho em progresso */}
                      {currentAnnotation?.type === 'measurement' && currentAnnotation.data.start && (
                        <circle cx={currentAnnotation.data.start.x} cy={currentAnnotation.data.start.y} r={5} fill={selectedColor} stroke="white" strokeWidth={2} />
                      )}
                      {currentAnnotation?.type === 'polygon' && currentAnnotation.data.points && currentAnnotation.data.points.length > 0 && (
                        <polyline
                          points={currentAnnotation.data.points.map(p => p.join(',')).join(' ')}
                          fill="none"
                          stroke={selectedColor}
                          strokeWidth={2}
                          strokeDasharray="5,5"
                        />
                      )}
                      {/* ROI em progresso */}
                      {currentAnnotation?.type === 'roi' && currentAnnotation.data.points && currentAnnotation.data.points.length > 0 && (
                        <polyline
                          points={currentAnnotation.data.points.map(p => p.join(',')).join(' ')}
                          fill="none"
                          stroke="#3B82F6"
                          strokeWidth={2.5}
                          strokeDasharray="8,4"
                        />
                      )}
                    </svg>
                    </div>{/* end zoomable wrapper */}
                  </div>
                ) : (
                  // Placeholder se não houver imagens
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <ImageIcon size={64} className="text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400">Nenhuma imagem neste projeto</p>
                      <p className="text-gray-500 text-sm mt-2">Faça upload de imagens na seção de Upload</p>
                    </div>
                  </div>
                )}

                {/* Navegação entre imagens */}
                {projectImages.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-gray-800/90 rounded-lg z-10">
                    <button
                      onClick={() => setSelectedImageIndex(Math.max(0, selectedImageIndex - 1))}
                      disabled={selectedImageIndex === 0}
                      className="p-1 hover:bg-gray-700 rounded disabled:opacity-50"
                    >
                      ←
                    </button>
                    <span className="text-white text-sm px-2">
                      {selectedImageIndex + 1} / {projectImages.length}
                    </span>
                    <button
                      onClick={() => setSelectedImageIndex(Math.min(projectImages.length - 1, selectedImageIndex + 1))}
                      disabled={selectedImageIndex === projectImages.length - 1}
                      className="p-1 hover:bg-gray-700 rounded disabled:opacity-50"
                    >
                      →
                    </button>
                  </div>
                )}

                {/* Controles de zoom */}
                <div className="absolute right-20 bottom-4 flex items-center gap-1 z-10">
                  <button
                    onClick={() => setZoom(prev => Math.min(prev + 10, 300))}
                    className="p-2 bg-gray-800/90 hover:bg-gray-700 text-white rounded-lg transition-colors"
                    title="Zoom in"
                  >
                    <ZoomIn size={18} />
                  </button>
                  <div className="px-2 py-1 bg-gray-800/90 text-white text-xs text-center rounded-lg min-w-[42px]">
                    {zoom}%
                  </div>
                  <button
                    onClick={() => setZoom(prev => Math.max(prev - 10, 25))}
                    className="p-2 bg-gray-800/90 hover:bg-gray-700 text-white rounded-lg transition-colors"
                    title="Zoom out"
                  >
                    <ZoomOut size={18} />
                  </button>
                  <button
                    onClick={resetView}
                    className="p-2 bg-gray-800/90 hover:bg-gray-700 text-white rounded-lg transition-colors ml-1"
                    title="Resetar zoom e posicao"
                  >
                    <Maximize2 size={18} />
                  </button>
                </div>

                {/* Compass Rose */}
                <div className="absolute top-3 right-3 z-20">
                  <CompassRose size={48} />
                </div>

                {/* Info do projeto */}
                <div className="absolute left-4 bottom-14 px-4 py-3 bg-gray-800/90 rounded-lg z-10">
                  <p className="text-white font-medium text-sm">{selectedProject.name}</p>
                  <p className="text-gray-400 text-xs">
                    {selectedProject.image_count} imagem(ns) • {formatDate(selectedProject.created_at)}
                  </p>
                  {utmInfo?.has_gps && utmInfo.utm_zone && (
                    <p className="text-blue-300 text-xs mt-1 font-mono">
                      UTM {utmInfo.utm_zone} | E{utmInfo.center?.easting?.toFixed(0)} N{utmInfo.center?.northing?.toFixed(0)}
                    </p>
                  )}
                </div>

                {/* ScaleBar + LegendPanel bottom */}
                <div className="absolute right-4 bottom-14 flex items-end gap-2 z-10">
                  <LegendPanel items={layers.map(l => ({
                    id: l.id,
                    name: l.name,
                    color: l.color,
                    visible: l.visible,
                  }))} />
                  {imageGSD && (
                    <ScaleBar gsdM={imageGSD.gsd_m} zoom={zoom} />
                  )}
                </div>

                {/* Painel de informacoes da imagem */}
                {showInfoPanel && !roiPolygon && projectImages[selectedImageIndex] && (
                  <div className="absolute top-14 right-16 w-72 bg-gray-800/95 rounded-xl border border-gray-700/50 overflow-hidden shadow-xl z-20">
                    <div className="flex items-center justify-between p-3 bg-gray-700/50 border-b border-gray-700/50">
                      <h4 className="text-white font-medium text-sm">Informacoes da Imagem</h4>
                      <button onClick={() => setShowInfoPanel(false)} className="p-1 hover:bg-gray-600 rounded">
                        <X size={14} className="text-gray-400" />
                      </button>
                    </div>
                    <div className="p-3 space-y-3 max-h-[60vh] overflow-y-auto">
                      {/* Dados basicos da imagem */}
                      <div className="space-y-2">
                        <p className="text-xs text-gray-500 uppercase tracking-wider">Arquivo</p>
                        <p className="text-white text-sm truncate">{projectImages[selectedImageIndex].original_filename}</p>
                      </div>

                      {projectImages[selectedImageIndex].width && projectImages[selectedImageIndex].height && (
                        <div className="space-y-1">
                          <p className="text-xs text-gray-500 uppercase tracking-wider">Dimensoes</p>
                          <p className="text-white text-sm">
                            {projectImages[selectedImageIndex].width} x {projectImages[selectedImageIndex].height} px
                          </p>
                        </div>
                      )}

                      {projectImages[selectedImageIndex].center_lat && projectImages[selectedImageIndex].center_lon && (
                        <div className="space-y-1">
                          <p className="text-xs text-gray-500 uppercase tracking-wider">Coordenadas GPS</p>
                          <p className="text-white text-sm font-mono">
                            {projectImages[selectedImageIndex].center_lat?.toFixed(6)}, {projectImages[selectedImageIndex].center_lon?.toFixed(6)}
                          </p>
                        </div>
                      )}

                      {/* GSD - Ground Sample Distance */}
                      {imageGSD && (
                        <div className="space-y-1">
                          <p className="text-xs text-gray-500 uppercase tracking-wider">Resolucao do Solo (GSD)</p>
                          <p className="text-white text-sm">
                            {imageGSD.gsd_cm.toFixed(2)} cm/pixel
                            {imageGSD.is_estimated && (
                              <span className="text-yellow-400 text-xs ml-1">(estimado)</span>
                            )}
                          </p>
                        </div>
                      )}

                      {/* Resultados ML da imagem */}
                      {imageAnalysis && (
                        <>
                          <div className="border-t border-gray-700/50 pt-3 mt-3">
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Analise ML</p>
                          </div>

                          {imageAnalysis.vegetation_coverage && (
                            <div className="flex items-center gap-3 p-2 bg-gray-700/30 rounded-lg">
                              <Leaf className="text-[#6AAF3D]" size={16} />
                              <div className="flex-1">
                                <p className="text-xs text-gray-500">Cobertura Vegetal</p>
                                <p className="text-white font-medium">{imageAnalysis.vegetation_coverage.vegetation_percentage.toFixed(1)}%</p>
                              </div>
                            </div>
                          )}

                          {imageAnalysis.vegetation_health && (
                            <div className="flex items-center gap-3 p-2 bg-gray-700/30 rounded-lg">
                              <CheckCircle className={imageAnalysis.vegetation_health.health_index >= 70 ? 'text-green-400' : imageAnalysis.vegetation_health.health_index >= 40 ? 'text-yellow-400' : 'text-red-400'} size={16} />
                              <div className="flex-1">
                                <p className="text-xs text-gray-500">Indice de Saude</p>
                                <p className="text-white font-medium">{imageAnalysis.vegetation_health.health_index.toFixed(1)}%</p>
                              </div>
                            </div>
                          )}

                          {imageAnalysis.object_detection && imageAnalysis.object_detection.total_detections > 0 && (
                            <div className="flex items-center gap-3 p-2 bg-gray-700/30 rounded-lg">
                              <Trees className="text-green-400" size={16} />
                              <div className="flex-1">
                                <p className="text-xs text-gray-500">Árvores Detectadas</p>
                                <p className="text-white font-medium">{imageAnalysis.object_detection.total_detections}</p>
                              </div>
                            </div>
                          )}

                          {imageAnalysis.vegetation_type && (
                            <div className="flex items-center gap-3 p-2 bg-gray-700/30 rounded-lg">
                              <Layers className="text-purple-400" size={16} />
                              <div className="flex-1">
                                <p className="text-xs text-gray-500">Tipo de Vegetacao</p>
                                <p className="text-white font-medium text-sm">{imageAnalysis.vegetation_type.vegetation_type}</p>
                                {imageAnalysis.vegetation_type.vegetation_density && (
                                  <p className="text-gray-400 text-xs">{imageAnalysis.vegetation_type.vegetation_density}</p>
                                )}
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {!imageAnalysis && (
                        <div className="text-center py-4">
                          <p className="text-gray-500 text-sm">Sem analise ML disponivel</p>
                        </div>
                      )}

                      {/* Anotacoes */}
                      <div className="border-t border-gray-700/50 pt-3 mt-3">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                          Anotacoes ({annotations.length})
                        </p>
                        {annotations.length === 0 ? (
                          <p className="text-gray-500 text-xs">Nenhuma anotacao</p>
                        ) : (
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {annotations.map((ann, idx) => (
                              <div key={ann.id || idx} className="flex items-center justify-between p-1.5 bg-gray-700/30 rounded text-xs">
                                <span className="text-white capitalize">{ann.type}</span>
                                <div className="flex items-center gap-1">
                                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ann.data.color || '#FF0000' }} />
                                  {ann.id && activeTool === 'eraser' && (
                                    <button onClick={() => deleteAnnotation(ann.id!)} className="p-1 hover:bg-red-500/20 rounded">
                                      <Trash2 size={12} className="text-red-400" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Painel lateral de camadas e informações */}
              <div className="w-72 border-l border-gray-700/50 bg-[#12121e] p-4 overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-white font-medium">Camadas</h4>
                  <button
                    onClick={() => setShowLayers(!showLayers)}
                    className="p-1 hover:bg-gray-700 rounded transition-colors"
                  >
                    <Layers size={16} className="text-gray-400" />
                  </button>
                </div>

                <div className="space-y-2">
                  {layers.map(layer => (
                    <div
                      key={layer.id}
                      className={`p-3 rounded-lg transition-colors ${
                        layer.visible ? 'bg-gray-800/50' : 'bg-gray-900/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: layer.color }}
                          />
                          <span className={`text-sm ${layer.visible ? 'text-white' : 'text-gray-500'}`}>
                            {layer.name}
                          </span>
                        </div>
                        <button
                          onClick={() => toggleLayer(layer.id)}
                          className="p-1 hover:bg-gray-700 rounded transition-colors"
                        >
                          {layer.visible ? (
                            <Eye size={16} className="text-[#6AAF3D]" />
                          ) : (
                            <EyeOff size={16} className="text-gray-500" />
                          )}
                        </button>
                      </div>
                      {layer.visible && (
                        <div className="flex items-center gap-2 mt-2">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={layer.opacity}
                            onChange={(e) => updateOpacity(layer.id, parseInt(e.target.value))}
                            className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                          />
                          <span className="text-xs text-gray-400 w-8">{layer.opacity}%</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Informações de análise do projeto */}
                <div className="mt-6 pt-4 border-t border-gray-700/50">
                  <h5 className="text-white text-sm font-medium mb-3 flex items-center gap-2">
                    Análise do Projeto
                    {analysisSummary && (analysisSummary.pending_images > 0 || analysisSummary.status === 'processing') && (
                      <span className="flex items-center gap-1 text-xs text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-full">
                        <Loader2 size={12} className="animate-spin" />
                        Processando...
                      </span>
                    )}
                  </h5>

                  {analysisSummary ? (
                    <div className="space-y-3">
                      {/* Barra de progresso quando há análises pendentes */}
                      {analysisSummary.pending_images > 0 && (
                        <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-yellow-400 text-xs font-medium">Análise em andamento</span>
                            <span className="text-yellow-300 text-xs">
                              {analysisSummary.analyzed_images}/{analysisSummary.total_images}
                            </span>
                          </div>
                          <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-yellow-500 transition-all duration-500"
                              style={{
                                width: `${analysisSummary.total_images > 0
                                  ? (analysisSummary.analyzed_images / analysisSummary.total_images) * 100
                                  : 0}%`
                              }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-3 p-2 bg-gray-800/30 rounded-lg">
                        <Leaf className="text-[#6AAF3D]" size={18} />
                        <div>
                          <p className="text-xs text-gray-500">Cobertura Vegetal</p>
                          <p className="text-white font-medium">
                            {analysisSummary.vegetation_coverage_avg > 0
                              ? `${analysisSummary.vegetation_coverage_avg.toFixed(1)}%`
                              : 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-2 bg-gray-800/30 rounded-lg">
                        <Trees className="text-blue-400" size={18} />
                        <div>
                          <p className="text-xs text-gray-500">Imagens Analisadas</p>
                          <p className="text-white font-medium">
                            {analysisSummary.analyzed_images} / {analysisSummary.total_images}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-2 bg-gray-800/30 rounded-lg">
                        <CheckCircle className={getHealthColor(analysisSummary.health_index_avg)} size={18} />
                        <div>
                          <p className="text-xs text-gray-500">Índice de Saúde</p>
                          <p className={`font-medium ${getHealthColor(analysisSummary.health_index_avg)}`}>
                            {analysisSummary.health_index_avg > 0
                              ? `${analysisSummary.health_index_avg.toFixed(0)}% - ${getHealthLabel(analysisSummary.health_index_avg)}`
                              : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-gray-500 text-sm">Nenhuma análise disponível</p>
                      <p className="text-gray-600 text-xs mt-1">Execute uma análise nas imagens do projeto</p>
                    </div>
                  )}
                </div>

                {/* Legenda */}
                <div className="mt-6 pt-4 border-t border-gray-700/50">
                  <h5 className="text-white text-sm font-medium mb-3">Legenda - Saúde</h5>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-green-500"></div>
                      <span className="text-xs text-gray-400">Saudável (≥70%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                      <span className="text-xs text-gray-400">Moderado (40-69%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-red-500"></div>
                      <span className="text-xs text-gray-400">Crítico (&lt;40%)</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
