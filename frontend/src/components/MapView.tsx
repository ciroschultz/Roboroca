'use client'

import { useState, useEffect } from 'react'
import { API_BASE_URL, loadAuthToken } from '@/lib/api'
import {
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Ruler,
  Download,
  Eye,
  EyeOff,
  MapPin,
  FolderOpen,
  Satellite,
  Crosshair,
  Circle,
  PenTool,
  Play,
  Plus,
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
} from 'lucide-react'

type MapMode = 'project' | 'gps'

interface Layer {
  id: string
  name: string
  type: 'original' | 'vegetation' | 'health' | 'classification' | 'detection' | 'heatmap'
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
  file_path: string
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

type DrawingTool = 'select' | 'point' | 'polygon' | 'measurement' | 'eraser'

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

export default function MapView() {
  const [mode, setMode] = useState<MapMode>('project')
  const [zoom, setZoom] = useState(100)
  const [showLayers, setShowLayers] = useState(true)

  // Project mode states
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [projectImages, setProjectImages] = useState<ProjectImage[]>([])
  const [analysisSummary, setAnalysisSummary] = useState<AnalysisSummary | null>(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [layers, setLayers] = useState<Layer[]>([
    { id: '1', name: 'Imagem Original', type: 'original', visible: true, opacity: 100, color: '#ffffff' },
    { id: '2', name: 'Cobertura Vegetal', type: 'vegetation', visible: false, opacity: 80, color: '#6AAF3D' },
    { id: '3', name: 'Saúde da Vegetação', type: 'health', visible: false, opacity: 70, color: '#F59E0B' },
    { id: '4', name: 'Mapa de Calor', type: 'heatmap', visible: false, opacity: 60, color: '#EF4444' },
  ])

  // GPS Mode states
  const [gpsActive, setGpsActive] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [areaMode, setAreaMode] = useState<'radius' | 'draw'>('radius')
  const [radius, setRadius] = useState(500)
  const [satelliteSource, setSatelliteSource] = useState<'sentinel' | 'landsat'>('sentinel')
  const [areaSelected, setAreaSelected] = useState(false)

  // Drawing tools states
  const [activeTool, setActiveTool] = useState<DrawingTool>('select')
  const [selectedColor, setSelectedColor] = useState('#FF0000')
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null)
  const [showInfoPanel, setShowInfoPanel] = useState(true)
  const [imageAnalysis, setImageAnalysis] = useState<ImageAnalysis | null>(null)
  const [savingAnnotation, setSavingAnnotation] = useState(false)
  const [imageGSD, setImageGSD] = useState<ImageGSD | null>(null)

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
      const response = await fetch(`${API_BASE_URL}/projects/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          setError('Sessão expirada. Faça login novamente.')
          return
        }
        throw new Error('Erro ao carregar projetos')
      }

      const data = await response.json()
      setProjects(data.projects || [])
    } catch (err) {
      setError('Erro ao carregar projetos. Verifique se o backend está rodando.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch project images
  const fetchProjectImages = async (projectId: number) => {
    const token = getAuthToken()
    if (!token) return

    try {
      const response = await fetch(`${API_BASE_URL}/images/?project_id=${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setProjectImages(data.images || [])
        setSelectedImageIndex(0)
      }
    } catch (err) {
      console.error('Erro ao carregar imagens:', err)
    }
  }

  // Fetch analysis summary
  const fetchAnalysisSummary = async (projectId: number) => {
    const token = getAuthToken()
    if (!token) return

    try {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/analysis-summary`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setAnalysisSummary(data)
      }
    } catch (err) {
      console.error('Erro ao carregar análise:', err)
      setAnalysisSummary(null)
    }
  }

  // Fetch image analysis
  const fetchImageAnalysis = async (imageId: number) => {
    const token = getAuthToken()
    if (!token) return

    try {
      const response = await fetch(`${API_BASE_URL}/analyses/?image_id=${imageId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        const fullAnalysis = data.analyses?.find((a: any) => a.analysis_type === 'full_report' && a.status === 'completed')
        if (fullAnalysis?.results) {
          setImageAnalysis({
            vegetation_coverage: fullAnalysis.results.vegetation_coverage,
            vegetation_health: fullAnalysis.results.vegetation_health,
            object_detection: fullAnalysis.results.object_detection,
            vegetation_type: fullAnalysis.results.vegetation_type,
          })
        } else {
          setImageAnalysis(null)
        }
      }
    } catch (err) {
      console.error('Erro ao carregar analise da imagem:', err)
      setImageAnalysis(null)
    }
  }

  // Fetch annotations for image
  const fetchAnnotations = async (imageId: number) => {
    const token = getAuthToken()
    if (!token) return

    try {
      const response = await fetch(`${API_BASE_URL}/annotations/?image_id=${imageId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setAnnotations(data.annotations?.map((a: any) => ({
          id: a.id,
          type: a.annotation_type,
          data: a.data,
        })) || [])
      }
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
    const token = getAuthToken()
    if (!token || !projectImages[selectedImageIndex]) return

    setSavingAnnotation(true)
    try {
      const response = await fetch(`${API_BASE_URL}/annotations/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_id: projectImages[selectedImageIndex].id,
          annotation_type: annotation.type,
          data: annotation.data,
        }),
      })

      if (response.ok) {
        const saved = await response.json()
        setAnnotations(prev => [...prev.filter(a => a.isNew !== true), { id: saved.id, type: saved.annotation_type, data: saved.data }])
        setCurrentAnnotation(null)
      }
    } catch (err) {
      console.error('Erro ao salvar anotacao:', err)
    } finally {
      setSavingAnnotation(false)
    }
  }

  // Delete annotation
  const deleteAnnotation = async (annotationId: number) => {
    const token = getAuthToken()
    if (!token) return

    try {
      const response = await fetch(`${API_BASE_URL}/annotations/${annotationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        setAnnotations(prev => prev.filter(a => a.id !== annotationId))
      }
    } catch (err) {
      console.error('Erro ao deletar anotacao:', err)
    }
  }

  // Handle canvas click for drawing
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool === 'select' || activeTool === 'eraser') return

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

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

  // Handle double click to finish polygon
  const handleCanvasDoubleClick = () => {
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

  // Load project details when selected
  useEffect(() => {
    if (selectedProject) {
      fetchProjectImages(selectedProject.id)
      fetchAnalysisSummary(selectedProject.id)
    } else {
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

  const handleActivateGPS = () => {
    setGpsLoading(true)
    setTimeout(() => {
      setGpsActive(true)
      setGpsLoading(false)
    }, 1500)
  }

  const handleSelectArea = () => {
    setAreaSelected(true)
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

  // Load image with authentication
  const loadImage = async (image: ProjectImage) => {
    const token = getAuthToken()
    if (!token) return

    setImageLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/images/${image.id}/thumbnail`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        // Revoke previous URL to free memory
        if (currentImageUrl) {
          URL.revokeObjectURL(currentImageUrl)
        }
        setCurrentImageUrl(url)
      }
    } catch (err) {
      console.error('Erro ao carregar imagem:', err)
      setCurrentImageUrl(null)
    } finally {
      setImageLoading(false)
    }
  }

  // Load image when selected
  useEffect(() => {
    if (projectImages.length > 0 && selectedImageIndex >= 0) {
      loadImage(projectImages[selectedImageIndex])
      fetchImageAnalysis(projectImages[selectedImageIndex].id)
      fetchAnnotations(projectImages[selectedImageIndex].id)
      fetchImageGSD(projectImages[selectedImageIndex].id)
    } else {
      setCurrentImageUrl(null)
      setImageAnalysis(null)
      setAnnotations([])
      setImageGSD(null)
    }
    // Cleanup on unmount
    return () => {
      if (currentImageUrl) {
        URL.revokeObjectURL(currentImageUrl)
      }
    }
  }, [projectImages, selectedImageIndex])

  return (
    <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl overflow-hidden h-full flex flex-col">
      {/* Tabs de modo */}
      <div className="flex border-b border-gray-700/50">
        <button
          onClick={() => { setMode('project'); setSelectedProject(null); }}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 transition-colors ${
            mode === 'project'
              ? 'bg-[#6AAF3D]/20 text-[#6AAF3D] border-b-2 border-[#6AAF3D]'
              : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
          }`}
        >
          <FolderOpen size={18} />
          <span className="font-medium">Ver Projeto</span>
        </button>
        <button
          onClick={() => { setMode('gps'); setGpsActive(false); setAreaSelected(false); }}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 transition-colors ${
            mode === 'gps'
              ? 'bg-blue-500/20 text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
          }`}
        >
          <Satellite size={18} />
          <span className="font-medium">Captura GPS</span>
          <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 text-[10px] font-bold rounded">EM BREVE</span>
        </button>
      </div>

      {/* Conteúdo baseado no modo */}
      {mode === 'project' ? (
        // ========== MODO 1: VER PROJETO ==========
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
                {/* Toolbar do mapa */}
                <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
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
                        title="Desenhar polígono - duplo-clique para fechar, ESC para cancelar"
                      >
                        <PenTool size={18} />
                      </button>
                      <button
                        onClick={() => setActiveTool('measurement')}
                        className={`p-2 rounded-lg transition-colors ${activeTool === 'measurement' ? 'bg-[#6AAF3D] text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
                        title="Medir distância em metros - clique início e fim, ESC para cancelar"
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
                    <button className="p-2 bg-gray-800/90 hover:bg-gray-700 text-white rounded-lg transition-colors" title="Exportar">
                      <Download size={18} />
                    </button>
                    <button className="p-2 bg-gray-800/90 hover:bg-gray-700 text-white rounded-lg transition-colors" title="Tela cheia">
                      <Maximize2 size={18} />
                    </button>
                  </div>
                </div>

                {/* Exibir imagem do projeto */}
                {projectImages.length > 0 ? (
                  <div
                    className="absolute inset-0 overflow-auto"
                    onClick={handleCanvasClick}
                    onDoubleClick={handleCanvasDoubleClick}
                    style={{ cursor: activeTool === 'select' ? 'default' : activeTool === 'eraser' ? 'not-allowed' : 'crosshair' }}
                  >
                    <div
                      className="relative min-w-full min-h-full"
                      style={{
                        transform: `scale(${zoom / 100})`,
                        transformOrigin: 'center center',
                        width: zoom > 100 ? `${zoom}%` : '100%',
                        height: zoom > 100 ? `${zoom}%` : '100%',
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
                          <p className="text-gray-400">Erro ao carregar imagem</p>
                        </div>
                      </div>
                    )}
                    {/* Overlay com gradiente se necessário */}
                    {layers.find(l => l.type === 'vegetation')?.visible && (
                      <div className="absolute inset-0 bg-gradient-to-br from-green-500/30 via-yellow-500/20 to-red-500/20 mix-blend-overlay pointer-events-none" />
                    )}
                    {layers.find(l => l.type === 'heatmap')?.visible && (
                      <div className="absolute inset-0 bg-gradient-to-br from-red-500/40 via-yellow-500/30 to-green-500/20 mix-blend-overlay pointer-events-none" />
                    )}

                    {/* Renderizar anotacoes */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none">
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
                  <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-gray-800/90 rounded-lg">
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
                <div className="absolute right-4 bottom-20 flex flex-col gap-2">
                  <button
                    onClick={() => setZoom(prev => Math.min(prev + 10, 200))}
                    className="p-2 bg-gray-800/90 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    <ZoomIn size={18} />
                  </button>
                  <div className="px-2 py-1 bg-gray-800/90 text-white text-xs text-center rounded-lg">
                    {zoom}%
                  </div>
                  <button
                    onClick={() => setZoom(prev => Math.max(prev - 10, 10))}
                    className="p-2 bg-gray-800/90 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    <ZoomOut size={18} />
                  </button>
                </div>

                {/* Info do projeto */}
                <div className="absolute left-4 bottom-4 px-4 py-3 bg-gray-800/90 rounded-lg">
                  <p className="text-white font-medium text-sm">{selectedProject.name}</p>
                  <p className="text-gray-400 text-xs">
                    {selectedProject.image_count} imagem(ns) • {formatDate(selectedProject.created_at)}
                  </p>
                </div>

                {/* Escala dinâmica baseada no GSD */}
                <div className="absolute right-4 bottom-4 flex items-center gap-2 px-3 py-2 bg-gray-800/90 rounded-lg">
                  <div className="h-1 w-16 bg-white rounded"></div>
                  <span className="text-xs text-gray-300">
                    {imageGSD ? formatDistance(64 * imageGSD.gsd_m) : '~2m'}
                  </span>
                </div>

                {/* Painel de informacoes da imagem */}
                {showInfoPanel && projectImages[selectedImageIndex] && (
                  <div className="absolute top-20 right-4 w-72 bg-gray-800/95 rounded-xl border border-gray-700/50 overflow-hidden shadow-xl">
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
      ) : (
        // ========== MODO 2: CAPTURA GPS ==========
        <div className="flex flex-1 overflow-hidden">
          {/* Área do mapa GPS */}
          <div className="flex-1 relative bg-gray-900">
            {!gpsActive ? (
              // Tela inicial do GPS
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center max-w-md px-6">
                  <div className="w-24 h-24 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Satellite size={48} className="text-blue-400" />
                  </div>
                  <h3 className="text-white text-xl font-semibold mb-2">Captura via GPS</h3>
                  <p className="text-gray-400 mb-6">
                    Ative sua localização para buscar imagens de satélite da região ao seu redor e criar novos projetos de análise.
                  </p>
                  <button
                    onClick={handleActivateGPS}
                    disabled={gpsLoading}
                    className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white font-medium rounded-xl transition-colors flex items-center gap-2 mx-auto"
                  >
                    {gpsLoading ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        Obtendo localização...
                      </>
                    ) : (
                      <>
                        <Crosshair size={20} />
                        Ativar Localização GPS
                      </>
                    )}
                  </button>
                  <p className="text-yellow-500 text-xs mt-4">
                    Funcionalidade em desenvolvimento
                  </p>
                </div>
              </div>
            ) : (
              // Mapa com GPS ativo
              <>
                {/* Mapa de satélite placeholder */}
                <div className="absolute inset-0 bg-gradient-to-br from-green-900/50 via-emerald-800/40 to-teal-900/50" />

                {/* Textura de terreno */}
                <div className="absolute inset-0 opacity-40" style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                }} />

                {/* Marcador de localização central */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="relative">
                    {/* Área selecionada (círculo) */}
                    {areaSelected && (
                      <div
                        className="absolute rounded-full border-2 border-blue-400 bg-blue-400/20 animate-pulse"
                        style={{
                          width: `${radius / 2}px`,
                          height: `${radius / 2}px`,
                          left: `${-(radius / 4)}px`,
                          top: `${-(radius / 4)}px`,
                        }}
                      />
                    )}
                    {/* Pin de localização */}
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/50 relative z-10">
                      <MapPin size={24} className="text-white" />
                    </div>
                    {/* Pulso */}
                    <div className="absolute inset-0 w-12 h-12 bg-blue-500 rounded-full animate-ping opacity-30" />
                  </div>
                </div>

                {/* Toolbar */}
                <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
                  <div className="px-4 py-2 bg-green-500/90 text-white rounded-lg flex items-center gap-2">
                    <CheckCircle size={16} />
                    <span className="text-sm font-medium">GPS Ativo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 bg-gray-800/90 hover:bg-gray-700 text-white rounded-lg transition-colors" title="Centralizar">
                      <Crosshair size={18} />
                    </button>
                    <button className="p-2 bg-gray-800/90 hover:bg-gray-700 text-white rounded-lg transition-colors" title="Tela cheia">
                      <Maximize2 size={18} />
                    </button>
                  </div>
                </div>

                {/* Controles de zoom */}
                <div className="absolute right-4 bottom-20 flex flex-col gap-2">
                  <button
                    onClick={() => setZoom(prev => Math.min(prev + 10, 200))}
                    className="p-2 bg-gray-800/90 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    <ZoomIn size={18} />
                  </button>
                  <div className="px-2 py-1 bg-gray-800/90 text-white text-xs text-center rounded-lg">
                    {zoom}%
                  </div>
                  <button
                    onClick={() => setZoom(prev => Math.max(prev - 10, 10))}
                    className="p-2 bg-gray-800/90 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    <ZoomOut size={18} />
                  </button>
                </div>

                {/* Coordenadas */}
                <div className="absolute left-4 bottom-4 px-4 py-2 bg-gray-800/90 rounded-lg">
                  <p className="text-white text-sm font-medium">Sua Localização</p>
                  <p className="text-gray-400 text-xs">Lat: -23.5505° | Lon: -46.6333°</p>
                </div>
              </>
            )}
          </div>

          {/* Painel lateral GPS */}
          <div className="w-80 border-l border-gray-700/50 bg-[#12121e] p-4 overflow-y-auto">
            {gpsActive ? (
              <>
                {/* Localização */}
                <div className="mb-6">
                  <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                    <MapPin size={16} className="text-blue-400" />
                    Sua Localização
                  </h4>
                  <div className="p-3 bg-gray-800/50 rounded-lg space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Latitude:</span>
                      <span className="text-white font-mono">-23.5505°</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Longitude:</span>
                      <span className="text-white font-mono">-46.6333°</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Precisão:</span>
                      <span className="text-green-400">±5m</span>
                    </div>
                  </div>
                </div>

                {/* Fonte de Imagem */}
                <div className="mb-6">
                  <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                    <Satellite size={16} className="text-purple-400" />
                    Fonte de Imagem
                  </h4>
                  <div className="space-y-2">
                    <label className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      satelliteSource === 'sentinel' ? 'bg-purple-500/20 border border-purple-500/50' : 'bg-gray-800/50 hover:bg-gray-800'
                    }`}>
                      <input
                        type="radio"
                        name="satellite"
                        checked={satelliteSource === 'sentinel'}
                        onChange={() => setSatelliteSource('sentinel')}
                        className="hidden"
                      />
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        satelliteSource === 'sentinel' ? 'border-purple-400' : 'border-gray-500'
                      }`}>
                        {satelliteSource === 'sentinel' && <div className="w-2 h-2 rounded-full bg-purple-400" />}
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">Sentinel-2</p>
                        <p className="text-gray-500 text-xs">10m resolução • Gratuito</p>
                      </div>
                    </label>
                    <label className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      satelliteSource === 'landsat' ? 'bg-purple-500/20 border border-purple-500/50' : 'bg-gray-800/50 hover:bg-gray-800'
                    }`}>
                      <input
                        type="radio"
                        name="satellite"
                        checked={satelliteSource === 'landsat'}
                        onChange={() => setSatelliteSource('landsat')}
                        className="hidden"
                      />
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        satelliteSource === 'landsat' ? 'border-purple-400' : 'border-gray-500'
                      }`}>
                        {satelliteSource === 'landsat' && <div className="w-2 h-2 rounded-full bg-purple-400" />}
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">Landsat 8</p>
                        <p className="text-gray-500 text-xs">30m resolução • Gratuito</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Definir Área */}
                <div className="mb-6">
                  <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                    <Circle size={16} className="text-green-400" />
                    Definir Área
                  </h4>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setAreaMode('radius')}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                          areaMode === 'radius'
                            ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                            : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800'
                        }`}
                      >
                        <Circle size={14} />
                        Raio
                      </button>
                      <button
                        onClick={() => setAreaMode('draw')}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                          areaMode === 'draw'
                            ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                            : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800'
                        }`}
                      >
                        <PenTool size={14} />
                        Desenhar
                      </button>
                    </div>

                    {areaMode === 'radius' && (
                      <div className="p-3 bg-gray-800/50 rounded-lg">
                        <div className="flex justify-between mb-2">
                          <span className="text-gray-400 text-sm">Raio:</span>
                          <span className="text-white text-sm font-medium">{radius}m</span>
                        </div>
                        <input
                          type="range"
                          min="100"
                          max="2000"
                          step="100"
                          value={radius}
                          onChange={(e) => setRadius(parseInt(e.target.value))}
                          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between mt-1">
                          <span className="text-xs text-gray-500">100m</span>
                          <span className="text-xs text-gray-500">2km</span>
                        </div>
                      </div>
                    )}

                    {areaMode === 'draw' && (
                      <div className="p-3 bg-gray-800/50 rounded-lg text-center">
                        <PenTool size={24} className="text-gray-500 mx-auto mb-2" />
                        <p className="text-gray-400 text-sm">Clique no mapa para desenhar a área de interesse</p>
                      </div>
                    )}

                    <button
                      onClick={handleSelectArea}
                      className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                        areaSelected
                          ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                          : 'bg-gray-700 text-white hover:bg-gray-600'
                      }`}
                    >
                      {areaSelected ? '✓ Área Selecionada' : 'Selecionar Área'}
                    </button>
                  </div>
                </div>

                {/* Área estimada */}
                {areaSelected && (
                  <div className="mb-6 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <p className="text-blue-400 text-sm font-medium mb-1">Área Estimada</p>
                    <p className="text-white text-2xl font-bold">{(Math.PI * Math.pow(radius/1000, 2)).toFixed(2)} ha</p>
                    <p className="text-gray-400 text-xs mt-1">Baseado no raio de {radius}m</p>
                  </div>
                )}

                {/* Botões de ação */}
                <div className="space-y-3">
                  <button
                    disabled={!areaSelected}
                    className={`w-full py-3 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                      areaSelected
                        ? 'bg-blue-500 hover:bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <Play size={18} />
                    Analisar Área
                  </button>
                  <button
                    disabled={!areaSelected}
                    className={`w-full py-3 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                      areaSelected
                        ? 'bg-[#6AAF3D] hover:bg-[#5a9a34] text-white'
                        : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <Plus size={18} />
                    Criar Projeto
                  </button>
                </div>

                <p className="text-yellow-500 text-xs text-center mt-4">
                  Funcionalidade em desenvolvimento
                </p>
              </>
            ) : (
              // Estado inicial - GPS não ativo
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <Crosshair size={48} className="text-gray-600 mb-4" />
                <p className="text-gray-400 text-sm">
                  Ative sua localização GPS para começar a capturar imagens de satélite
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
