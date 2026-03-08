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
  type Project as ApiProject,
  type Analysis,
} from '@/lib/api'
import type { ZoneFormData } from '@/components/map/ZonePropertiesDialog'
import type {
  Layer,
  Project,
  ProjectImage,
  AnalysisSummary,
  ImageAnalysis,
  DrawingTool,
  Annotation,
  ImageGSD,
  UTMInfo,
  ZoneData,
} from '../types'

export function useMapState(projectId?: number) {
  const mode = 'project' as const
  const [zoom, setZoom] = useState(100)
  const [showLayers, setShowLayers] = useState(true)

  // Pan/drag states
  const [isPanning, setIsPanning] = useState(false)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 })
  const imageContainerRef = useRef<HTMLDivElement>(null)
  const zoomableRef = useRef<HTMLDivElement>(null)

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
    { id: 'heatmap', name: 'Mapa de Calor', type: 'heatmap', visible: false, opacity: 60, color: '#EF4444' },
  ])

  // ROI states
  const [roiPolygon, setRoiPolygon] = useState<number[][] | null>(null)
  const [roiResults, setRoiResults] = useState<Record<string, unknown> | null>(null)
  const [roiAnalyzing, setRoiAnalyzing] = useState(false)
  const [roiAnalyses, setRoiAnalyses] = useState<string[]>(['vegetation', 'health', 'plant_count'])

  // Original image toggle
  const [showOriginalImage, setShowOriginalImage] = useState(false)

  // Project analysis
  const [analyzingProject, setAnalyzingProject] = useState(false)

  // UTM info
  const [utmInfo, setUtmInfo] = useState<UTMInfo | null>(null)

  // View mode carousel
  const [activeViewMode, setActiveViewMode] = useState('original')

  // Full report data for SVG overlays
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
  const [editingPointId, setEditingPointId] = useState<number | null>(null)
  const [editingPointLabel, setEditingPointLabel] = useState('')
  const [savingScreenshot, setSavingScreenshot] = useState(false)

  // Color picker dropdown
  const [showColorPicker, setShowColorPicker] = useState(false)
  const colorPickerRef = useRef<HTMLDivElement>(null)

  // Zone states
  const [zones, setZones] = useState<ZoneData[]>([])
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null)
  const [zoneAnalyzing, setZoneAnalyzing] = useState<Set<number>>(new Set())
  const [zoneVisibility, setZoneVisibility] = useState<Record<number, boolean>>({})
  const [editingVertices, setEditingVertices] = useState(false)
  const [showZoneDialog, setShowZoneDialog] = useState(false)
  const [pendingZonePoints, setPendingZonePoints] = useState<number[][] | null>(null)
  const [draggingVertex, setDraggingVertex] = useState<{ zoneId: number; vertexIndex: number } | null>(null)

  // Fullscreen
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Image blob URL
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null)
  const [imageLoading, setImageLoading] = useState(false)
  const currentImageUrlRef = useRef<string | null>(null)

  // GeoJSON export
  const [exportingGeoJSON, setExportingGeoJSON] = useState(false)

  const annotationColors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080']

  const toolInstructions: Record<string, string> = {
    'point': 'Clique na imagem para adicionar um marcador',
    'polygon': 'Clique para adicionar vertices. Duplo-clique para fechar. ESC para cancelar',
    'measurement': 'Clique no ponto inicial, depois no ponto final para medir',
    'eraser': 'Clique em uma anotacao para remove-la',
    'roi': 'Desenhe o perimetro da area de interesse. Duplo-clique para fechar. ESC para cancelar',
    'zone': 'Clique para adicionar vertices da zona. Duplo-clique para fechar e definir propriedades',
  }

  // ─── Utility functions ───────────────────────────────────────────

  const calculateRealDistance = (p1: { x: number; y: number }, p2: { x: number; y: number }): number => {
    if (!imageGSD) return 0
    const pixelDistance = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2))
    return pixelDistance * imageGSD.gsd_m
  }

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
    return pixelArea * imageGSD.gsd_m * imageGSD.gsd_m
  }

  const formatArea = (areaM2: number): string => {
    if (areaM2 >= 10000) return `${(areaM2 / 10000).toFixed(2)} ha`
    return `${areaM2.toFixed(1)} m²`
  }

  const formatDistance = (distanceM: number): string => {
    if (distanceM >= 1000) return `${(distanceM / 1000).toFixed(2)} km`
    return `${distanceM.toFixed(2)} m`
  }

  const calculatePolygonCentroid = (points: number[][]): { x: number; y: number } => {
    let sumX = 0, sumY = 0
    for (const p of points) { sumX += p[0]; sumY += p[1] }
    return { x: sumX / points.length, y: sumY / points.length }
  }

  const getAuthToken = () => loadAuthToken()

  const formatDate = (dateStr: string) => {
    try { return new Date(dateStr).toLocaleDateString('pt-BR') } catch { return dateStr }
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

  // ─── Data fetching ───────────────────────────────────────────────

  const fetchProjects = async () => {
    const token = getAuthToken()
    if (!token) { setError('Faça login para ver seus projetos'); return }
    setLoading(true)
    setError(null)
    try {
      const data = await apiGetProjects(0, 100)
      setProjects((data.projects || []).map((p: ApiProject) => ({
        id: p.id, name: p.name, description: p.description, status: p.status,
        latitude: p.latitude, longitude: p.longitude, total_area_ha: p.total_area_ha,
        area_hectares: p.area_hectares, image_count: p.image_count,
        created_at: p.created_at, updated_at: p.updated_at, perimeter_polygon: p.perimeter_polygon,
      })))
    } catch (err: any) {
      if (err?.status === 401) setError('Sessão expirada. Faça login novamente.')
      else setError('Erro ao carregar projetos. Verifique se o backend está rodando.')
      console.error(err)
    } finally { setLoading(false) }
  }

  const fetchProjectImages = async (pid: number) => {
    try {
      const data = await apiGetImages(pid, 0, 100)
      setProjectImages(data.images || [])
      setSelectedImageIndex(0)
    } catch (err) { console.error('Erro ao carregar imagens:', err) }
  }

  const fetchAnalysisSummary = async (pid: number) => {
    try {
      const data = await getProjectAnalysisSummary(pid)
      setAnalysisSummary(data as any)
    } catch (err) { console.error('Erro ao carregar análise:', err); setAnalysisSummary(null) }
  }

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
      } else { setImageAnalysis(null) }
    } catch (err) { console.error('Erro ao carregar analise da imagem:', err); setImageAnalysis(null) }
  }

  const fetchAnnotations = async (imageId: number) => {
    try {
      const data = await apiGetAnnotations(imageId)
      const all = data.annotations || []
      setAnnotations(all.filter((a: any) => a.annotation_type !== 'zone').map((a: any) => ({
        id: a.id, type: a.annotation_type, data: a.data,
      })))
      setZones(all.filter((a: any) => a.annotation_type === 'zone') as unknown as ZoneData[])
    } catch (err) { console.error('Erro ao carregar anotacoes:', err); setAnnotations([]); setZones([]) }
  }

  const fetchImageGSD = async (imageId: number) => {
    const token = getAuthToken()
    if (!token) return
    try {
      const response = await fetch(`${API_BASE_URL}/images/${imageId}/gsd`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (response.ok) { const data = await response.json(); setImageGSD(data) }
    } catch (err) { console.error('Erro ao carregar GSD:', err); setImageGSD(null) }
  }

  const fetchUTMInfo = async (imageId: number) => {
    try { const data = await getImageUTMInfo(imageId); setUtmInfo(data) }
    catch (err) { console.error('Erro ao carregar UTM:', err); setUtmInfo(null) }
  }

  // ─── Annotation actions ──────────────────────────────────────────

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
    } catch (err) { console.error('Erro ao salvar anotacao:', err) }
    finally { setSavingAnnotation(false) }
  }

  const deleteAnnotation = async (annotationId: number) => {
    try { await deleteAnnotationApi(annotationId); setAnnotations(prev => prev.filter(a => a.id !== annotationId)) }
    catch (err) { console.error('Erro ao deletar anotacao:', err) }
  }

  const updatePointLabel = async (annotationId: number, newLabel: string) => {
    try {
      const ann = annotations.find(a => a.id === annotationId)
      if (!ann) return
      const updatedData = { ...ann.data, label: newLabel }
      await apiUpdateAnnotation(annotationId, { data: updatedData as Record<string, unknown> })
      setAnnotations(prev => prev.map(a => a.id === annotationId ? { ...a, data: updatedData } : a))
    } catch (err) { console.error('Erro ao atualizar label:', err) }
    setEditingPointId(null)
    setEditingPointLabel('')
  }

  // ─── ROI actions ─────────────────────────────────────────────────

  const handleAnalyzeROI = async () => {
    if (!roiPolygon || roiPolygon.length < 3 || !projectImages[selectedImageIndex]) return
    setRoiAnalyzing(true)
    try {
      const result = await analyzeROI(projectImages[selectedImageIndex].id, roiPolygon, roiAnalyses)
      setRoiResults(result.results || null)
    } catch (err) { console.error('Erro na analise ROI:', err); setRoiResults(null) }
    finally { setRoiAnalyzing(false) }
  }

  const clearROI = () => { setRoiPolygon(null); setRoiResults(null); setCurrentAnnotation(null) }

  // ─── Zone actions ────────────────────────────────────────────────

  const handleSaveZone = async (formData: ZoneFormData) => {
    if (!projectImages[selectedImageIndex]) return
    setShowZoneDialog(false)
    try {
      const saved = await apiCreateAnnotation(projectImages[selectedImageIndex].id, 'zone', formData as unknown as Record<string, unknown>)
      setZones(prev => [...prev, saved as unknown as ZoneData])
      setZoneVisibility(prev => ({ ...prev, [saved.id]: true }))
      setPendingZonePoints(null)
      setActiveTool('select')
    } catch (err) { console.error('Erro ao salvar zona:', err) }
  }

  const handleCancelZoneDialog = () => { setShowZoneDialog(false); setPendingZonePoints(null) }

  const analyzeZone = async (zone: ZoneData) => {
    if (!projectImages[selectedImageIndex]) return
    setZoneAnalyzing(prev => new Set(prev).add(zone.id))
    try {
      const result = await analyzeROI(projectImages[selectedImageIndex].id, zone.data.points, ['vegetation', 'health', 'plant_count', 'pest_disease', 'biomass'])
      const analysisResults = (result.results || result) as any
      const updatedData = { ...zone.data, analysis_results: analysisResults }
      await apiUpdateAnnotation(zone.id, { data: updatedData as unknown as Record<string, unknown> })
      setZones(prev => prev.map(z => z.id === zone.id ? { ...z, data: updatedData } as ZoneData : z))
    } catch (err) { console.error('Erro ao analisar zona:', err) }
    finally { setZoneAnalyzing(prev => { const s = new Set(prev); s.delete(zone.id); return s }) }
  }

  const analyzeAllZones = async () => {
    for (const zone of zones) {
      if (!zone.data.analysis_results) await analyzeZone(zone)
    }
  }

  const deleteZone = async (zoneId: number) => {
    try {
      await deleteAnnotationApi(zoneId)
      setZones(prev => prev.filter(z => z.id !== zoneId))
      if (selectedZoneId === zoneId) { setSelectedZoneId(null); setEditingVertices(false) }
    } catch (err) { console.error('Erro ao excluir zona:', err) }
  }

  const toggleZoneVisibility = (zoneId: number) => {
    setZoneVisibility(prev => ({ ...prev, [zoneId]: !(prev[zoneId] ?? true) }))
  }

  const editZone = (zone: ZoneData) => {
    setPendingZonePoints(zone.data.points)
    setShowZoneDialog(true)
    setSelectedZoneId(zone.id)
  }

  const handleUpdateZone = async (formData: ZoneFormData) => {
    if (!selectedZoneId) { handleSaveZone(formData); return }
    setShowZoneDialog(false)
    try {
      await apiUpdateAnnotation(selectedZoneId, { data: formData as unknown as Record<string, unknown> })
      setZones(prev => prev.map(z => z.id === selectedZoneId ? { ...z, data: { ...z.data, ...formData } } : z))
      setPendingZonePoints(null)
      setSelectedZoneId(null)
    } catch (err) { console.error('Erro ao atualizar zona:', err) }
  }

  // ─── Zone vertex dragging ───────────────────────────────────────

  const handleVertexMouseDown = (zoneId: number, vertexIndex: number, e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault()
    setDraggingVertex({ zoneId, vertexIndex })
  }

  const handleVertexMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggingVertex) return
    const inner = zoomableRef.current
    if (!inner) return
    const rect = inner.getBoundingClientRect()
    const scale = zoom / 100
    const x = (e.clientX - rect.left) / scale
    const y = (e.clientY - rect.top) / scale
    setZones(prev => prev.map(z => {
      if (z.id !== draggingVertex.zoneId) return z
      const newPoints = [...z.data.points]
      newPoints[draggingVertex.vertexIndex] = [x, y]
      return { ...z, data: { ...z.data, points: newPoints } }
    }))
  }, [draggingVertex, zoom])

  const handleVertexMouseUp = useCallback(async () => {
    if (!draggingVertex) return
    const zone = zones.find(z => z.id === draggingVertex.zoneId)
    if (zone) {
      try {
        const areaM2 = calculatePolygonArea(zone.data.points)
        const updatedData = { ...zone.data, area_m2: areaM2, area_ha: areaM2 / 10000 }
        await apiUpdateAnnotation(zone.id, { data: updatedData as unknown as Record<string, unknown> })
        setZones(prev => prev.map(z => z.id === zone.id ? { ...z, data: updatedData } : z))
      } catch (err) { console.error('Erro ao salvar vertices:', err) }
    }
    setDraggingVertex(null)
  }, [draggingVertex, zones])

  // ─── Screenshot & export ─────────────────────────────────────────

  const handleSaveScreenshot = useCallback(async () => {
    const container = zoomableRef.current
    if (!container) return
    setSavingScreenshot(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(container, { backgroundColor: '#000', useCORS: true, allowTaint: true, scale: 1 })
      const url = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = url
      const filename = projectImages[selectedImageIndex]?.original_filename?.replace(/\.[^/.]+$/, '') || 'mapa'
      a.download = `${filename}_anotacoes.png`
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
    } catch (err) { console.error('Erro ao salvar screenshot:', err) }
    finally { setSavingScreenshot(false) }
  }, [projectImages, selectedImageIndex])

  const handleExportImage = useCallback(() => {
    if (!currentImageUrl) return
    const a = document.createElement('a')
    a.href = currentImageUrl
    const filename = projectImages[selectedImageIndex]?.original_filename || 'imagem_exportada.png'
    a.download = filename
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
  }, [currentImageUrl, projectImages, selectedImageIndex])

  const handleExportGeoJSON = useCallback(async () => {
    if (!selectedProject) return
    setExportingGeoJSON(true)
    try {
      const currentImage = projectImages[selectedImageIndex]
      const geojson = await exportAnnotationsGeoJSON(currentImage?.id, undefined)
      const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/geo+json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `anotacoes_${currentImage?.original_filename || selectedProject.name}.geojson`
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) { console.error('Erro ao exportar GeoJSON:', err) }
    finally { setExportingGeoJSON(false) }
  }, [selectedProject, projectImages, selectedImageIndex])

  // ─── Project analysis ────────────────────────────────────────────

  const handleAnalyzeProject = async () => {
    const pid = selectedProject?.id || projectId
    if (!pid) return
    setAnalyzingProject(true)
    try { await analyzeProject(pid) }
    catch (err) { console.error('Erro ao iniciar analise:', err) }
    finally { setAnalyzingProject(false) }
  }

  // ─── View mode ───────────────────────────────────────────────────

  const handleViewModeChange = (modeId: string, activeLayers: string[]) => {
    setActiveViewMode(modeId)
    setLayers(prev => prev.map(layer => ({ ...layer, visible: activeLayers.includes(layer.id) })))
  }

  // ─── Drawing interactions ────────────────────────────────────────

  const toImageCoords = (e: React.MouseEvent): { x: number; y: number } | null => {
    const inner = zoomableRef.current
    if (!inner) return null
    const rect = inner.getBoundingClientRect()
    const scale = zoom / 100
    return { x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale }
  }

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool === 'select' || activeTool === 'eraser') return
    const coords = toImageCoords(e)
    if (!coords) return
    const { x, y } = coords

    if (activeTool === 'roi') {
      if (!currentAnnotation) {
        setCurrentAnnotation({ type: 'roi', data: { points: [[x, y]], color: '#3B82F6' }, isNew: true })
      } else if (currentAnnotation.type === 'roi' && currentAnnotation.data.points) {
        setCurrentAnnotation({ ...currentAnnotation, data: { ...currentAnnotation.data, points: [...currentAnnotation.data.points, [x, y]] } })
      }
      return
    }

    if (activeTool === 'zone') {
      if (!currentAnnotation) {
        setCurrentAnnotation({ type: 'zone', data: { points: [[x, y]], color: selectedColor }, isNew: true })
      } else if (currentAnnotation.type === 'zone' && currentAnnotation.data.points) {
        setCurrentAnnotation({ ...currentAnnotation, data: { ...currentAnnotation.data, points: [...currentAnnotation.data.points, [x, y]] } })
      }
      return
    }

    if (activeTool === 'point') {
      const newAnnotation: Annotation = { type: 'point', data: { x, y, label: `Ponto ${annotations.length + 1}`, color: selectedColor }, isNew: true }
      setAnnotations(prev => [...prev, newAnnotation])
      saveAnnotation(newAnnotation)
    } else if (activeTool === 'measurement') {
      if (!currentAnnotation) {
        setCurrentAnnotation({ type: 'measurement', data: { start: { x, y }, color: selectedColor }, isNew: true })
      } else if (currentAnnotation.type === 'measurement' && currentAnnotation.data.start) {
        const start = currentAnnotation.data.start
        const end = { x, y }
        const distanceM = calculateRealDistance(start, end)
        const newAnnotation: Annotation = {
          type: 'measurement',
          data: {
            start, end, color: selectedColor,
            label: imageGSD ? formatDistance(distanceM) : `${Math.sqrt(Math.pow(x - start.x, 2) + Math.pow(y - start.y, 2)).toFixed(0)}px`,
            distanceM,
          },
          isNew: true,
        }
        setAnnotations(prev => [...prev, newAnnotation])
        saveAnnotation(newAnnotation)
        setCurrentAnnotation(null)
      }
    } else if (activeTool === 'polygon') {
      if (!currentAnnotation) {
        setCurrentAnnotation({ type: 'polygon', data: { points: [[x, y]], color: selectedColor }, isNew: true })
      } else if (currentAnnotation.type === 'polygon' && currentAnnotation.data.points) {
        setCurrentAnnotation({ ...currentAnnotation, data: { ...currentAnnotation.data, points: [...currentAnnotation.data.points, [x, y]] } })
      }
    }
  }

  const handleCanvasDoubleClick = () => {
    if (activeTool === 'zone' && currentAnnotation?.type === 'zone' && currentAnnotation.data.points && currentAnnotation.data.points.length >= 3) {
      setPendingZonePoints(currentAnnotation.data.points)
      setShowZoneDialog(true)
      setCurrentAnnotation(null)
      return
    }

    if (activeTool === 'roi' && currentAnnotation?.type === 'roi' && currentAnnotation.data.points && currentAnnotation.data.points.length >= 3) {
      setRoiPolygon(currentAnnotation.data.points)
      setCurrentAnnotation(null)
      setActiveTool('select')
      const areaM2 = calculatePolygonArea(currentAnnotation.data.points)
      const roiAnnotation: Annotation = {
        type: 'polygon',
        data: { points: currentAnnotation.data.points, color: '#3B82F6', label: imageGSD ? `ROI - ${formatArea(areaM2)}` : 'ROI - Perimetro', areaM2 },
        isNew: true,
      }
      saveAnnotation(roiAnnotation)
      return
    }

    if (activeTool === 'polygon' && currentAnnotation?.data.points && currentAnnotation.data.points.length >= 3) {
      const points = currentAnnotation.data.points
      const areaM2 = calculatePolygonArea(points)
      const newAnnotation: Annotation = {
        type: 'polygon',
        data: { ...currentAnnotation.data, label: imageGSD ? formatArea(areaM2) : `Área ${annotations.filter(a => a.type === 'polygon').length + 1}`, areaM2 },
        isNew: true,
      }
      setAnnotations(prev => [...prev, newAnnotation])
      saveAnnotation(newAnnotation)
      setCurrentAnnotation(null)
    }
  }

  // ─── Fullscreen ──────────────────────────────────────────────────

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) mapContainerRef.current?.requestFullscreen()
    else document.exitFullscreen()
  }, [])

  // ─── Image loading ───────────────────────────────────────────────

  const loadImage = useCallback(async (image: ProjectImage, useOriginal = false) => {
    const token = getAuthToken()
    if (!token) return
    setImageLoading(true)
    try {
      const endpoint = useOriginal ? `${API_BASE_URL}/images/${image.id}/original` : `${API_BASE_URL}/images/${image.id}/file`
      let response = await fetch(endpoint, { headers: { 'Authorization': `Bearer ${token}` } })
      if (!response.ok && useOriginal) {
        response = await fetch(`${API_BASE_URL}/images/${image.id}/file`, { headers: { 'Authorization': `Bearer ${token}` } })
      }
      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        if (currentImageUrlRef.current) URL.revokeObjectURL(currentImageUrlRef.current)
        currentImageUrlRef.current = url
        setCurrentImageUrl(url)
      } else { console.error('Erro ao carregar imagem: status', response.status); setCurrentImageUrl(null) }
    } catch (err) { console.error('Erro ao carregar imagem:', err); setCurrentImageUrl(null) }
    finally { setImageLoading(false) }
  }, [])

  const toggleLayer = (id: string) => {
    setLayers(prev => prev.map(layer => layer.id === id ? { ...layer, visible: !layer.visible } : layer))
  }

  const updateOpacity = (id: string, opacity: number) => {
    setLayers(prev => prev.map(layer => layer.id === id ? { ...layer, opacity } : layer))
  }

  // ─── Pan handlers ────────────────────────────────────────────────

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

  const handlePanEnd = useCallback(() => { setIsPanning(false) }, [])

  const resetView = useCallback(() => { setZoom(100); setPanOffset({ x: 0, y: 0 }) }, [])

  // ─── Effects ─────────────────────────────────────────────────────

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) setShowColorPicker(false)
    }
    if (showColorPicker) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showColorPicker])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && currentAnnotation) setCurrentAnnotation(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentAnnotation])

  useEffect(() => { if (mode === 'project') fetchProjects() }, [mode])

  useEffect(() => {
    if (projectId && projects.length > 0 && !selectedProject) {
      const target = projects.find(p => p.id === projectId)
      if (target) setSelectedProject(target)
    }
  }, [projectId, projects])

  useEffect(() => {
    if (projectId && !selectedProject && projects.length === 0) {
      fetchProjectImages(projectId)
      fetchAnalysisSummary(projectId)
    }
  }, [projectId])

  useEffect(() => {
    if (selectedProject) {
      fetchProjectImages(selectedProject.id)
      fetchAnalysisSummary(selectedProject.id)
    } else if (!projectId) {
      setProjectImages([])
      setAnalysisSummary(null)
    }
  }, [selectedProject])

  useEffect(() => {
    if (!selectedProject || !analysisSummary) return
    const hasPendingAnalysis = analysisSummary.pending_images > 0 || analysisSummary.status === 'processing'
    if (!hasPendingAnalysis) return
    const intervalId = setInterval(() => {
      fetchAnalysisSummary(selectedProject.id)
      fetchProjectImages(selectedProject.id)
    }, 5000)
    return () => clearInterval(intervalId)
  }, [selectedProject, analysisSummary])

  useEffect(() => {
    if (projectImages.length > 0 && selectedImageIndex >= 0) loadImage(projectImages[selectedImageIndex], showOriginalImage)
  }, [showOriginalImage])

  useEffect(() => {
    if (projectImages.length > 0 && selectedImageIndex >= 0) {
      const imgId = projectImages[selectedImageIndex].id
      loadImage(projectImages[selectedImageIndex], showOriginalImage)
      fetchImageAnalysis(imgId)
      fetchAnnotations(imgId)
      fetchImageGSD(imgId)
      fetchUTMInfo(imgId)
      apiGetAnalyses(imgId, undefined, undefined, 0, 100).then(data => {
        const full = data.analyses?.find((a: Analysis) => a.analysis_type === 'full_report' && a.status === 'completed')
        setFullReportData(full?.results as Record<string, unknown> || null)
      }).catch(() => setFullReportData(null))
      setRoiPolygon(null); setRoiResults(null); setSelectedZoneId(null); setEditingVertices(false); setDraggingVertex(null)
    } else {
      setCurrentImageUrl(null); setImageAnalysis(null); setAnnotations([]); setZones([])
      setImageGSD(null); setUtmInfo(null); setFullReportData(null)
    }
    return () => { if (currentImageUrlRef.current) URL.revokeObjectURL(currentImageUrlRef.current) }
  }, [projectImages, selectedImageIndex, loadImage])

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -10 : 10
    setZoom(prev => Math.min(300, Math.max(25, prev + delta)))
  }, [])

  useEffect(() => {
    const container = imageContainerRef.current
    if (!container) return
    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  return {
    // Refs
    mapContainerRef, imageContainerRef, zoomableRef, colorPickerRef,
    // State
    mode, zoom, setZoom, showLayers, setShowLayers, isPanning, panOffset, lastPanPoint,
    projects, selectedProject, setSelectedProject, projectImages, analysisSummary,
    selectedImageIndex, setSelectedImageIndex, loading, error,
    layers, roiPolygon, roiResults, roiAnalyzing, roiAnalyses, setRoiAnalyses,
    showOriginalImage, setShowOriginalImage, analyzingProject,
    utmInfo, activeViewMode, fullReportData,
    activeTool, setActiveTool, selectedColor, setSelectedColor,
    annotations, currentAnnotation, showInfoPanel, setShowInfoPanel,
    imageAnalysis, savingAnnotation, imageGSD, editingPointId, setEditingPointId,
    editingPointLabel, setEditingPointLabel, savingScreenshot,
    showColorPicker, setShowColorPicker, zones, selectedZoneId, setSelectedZoneId,
    zoneAnalyzing, zoneVisibility, editingVertices, setEditingVertices,
    showZoneDialog, pendingZonePoints, draggingVertex, isFullscreen,
    currentImageUrl, imageLoading, exportingGeoJSON,
    annotationColors, toolInstructions,
    // Utility
    calculatePolygonArea, calculatePolygonCentroid, formatArea, formatDate,
    getHealthColor, getHealthLabel,
    // Actions
    fetchProjects, toggleLayer, updateOpacity,
    handleAnalyzeROI, clearROI,
    handleSaveZone, handleCancelZoneDialog, analyzeZone, analyzeAllZones,
    deleteZone, toggleZoneVisibility, editZone, handleUpdateZone,
    handleVertexMouseDown, handleVertexMouseMove, handleVertexMouseUp,
    saveAnnotation, deleteAnnotation, updatePointLabel,
    handleSaveScreenshot, handleExportImage, handleExportGeoJSON,
    handleAnalyzeProject, handleViewModeChange,
    handleCanvasClick, handleCanvasDoubleClick,
    toggleFullscreen, loadImage,
    handlePanStart, handlePanMove, handlePanEnd, resetView,
  }
}
