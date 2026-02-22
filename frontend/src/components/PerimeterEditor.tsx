'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  ArrowLeft,
  PenTool,
  Trash2,
  Loader2,
  ZoomIn,
  ZoomOut,
  Play,
  Eye,
  EyeOff,
  Download,
  Image as ImageIcon,
} from 'lucide-react'
import {
  API_BASE_URL,
  loadAuthToken,
  getImages,
  analyzeROI,
  analyzeProject,
  getProjectAnalysisSummary,
  type ImageData,
} from '@/lib/api'
import { useToast } from './Toast'

interface PerimeterEditorProps {
  projectId: number
  onComplete: () => void
  onCancel: () => void
}

type Point = { x: number; y: number }

const ANALYSIS_STEPS = [
  { label: 'Análise ROI (vegetação, saúde, contagem, pragas, biomassa)...', key: 'roi' },
  { label: 'Pipeline ML completo (segmentação, classificação, detecção)...', key: 'full_ml' },
  { label: 'Aguardando conclusão das análises...', key: 'waiting' },
]

export default function PerimeterEditor({ projectId, onComplete, onCancel }: PerimeterEditorProps) {
  const toast = useToast()

  // Images
  const [images, setImages] = useState<ImageData[]>([])
  const [selectedImageIdx, setSelectedImageIdx] = useState(0)
  const [imageLoading, setImageLoading] = useState(false)
  const [imageBitmap, setImageBitmap] = useState<HTMLImageElement | null>(null)

  // Drawing state
  const [drawing, setDrawing] = useState(false)
  const [points, setPoints] = useState<Point[]>([])
  const [closed, setClosed] = useState(false)
  const [mousePos, setMousePos] = useState<Point | null>(null)

  // Overlay toggle
  const [showOverlay, setShowOverlay] = useState(true)

  // Pan & Zoom
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 })
  const [panning, setPanning] = useState(false)
  const panStart = useRef<Point>({ x: 0, y: 0 })
  const panOrigin = useRef<Point>({ x: 0, y: 0 })

  // Analysis
  const [analyzing, setAnalyzing] = useState(false)
  const [progressStep, setProgressStep] = useState(0)
  const [progressTotal, setProgressTotal] = useState(0)
  const [progressLabel, setProgressLabel] = useState('')

  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const selectedImage = images[selectedImageIdx] || null

  // Load project images
  useEffect(() => {
    const load = async () => {
      try {
        const data = await getImages(projectId, 0, 100)
        setImages(data.images)
      } catch {
        toast.error('Erro', 'Não foi possível carregar imagens do projeto')
      }
    }
    load()
  }, [projectId])

  // Load selected image - use FULL image (not thumbnail) for better quality
  useEffect(() => {
    if (!selectedImage) return
    setImageLoading(true)
    setImageBitmap(null)
    setPoints([])
    setClosed(false)
    setDrawing(false)
    setShowOverlay(true)
    setZoom(1)
    setPan({ x: 0, y: 0 })

    const token = loadAuthToken()
    if (!token) return

    const loadImg = async () => {
      try {
        // Load full image for better quality/larger display
        let response = await fetch(`${API_BASE_URL}/images/${selectedImage.id}/file`, {
          headers: { 'Authorization': `Bearer ${token}` },
        })
        // Fallback to thumbnail if full file fails
        if (!response.ok) {
          response = await fetch(`${API_BASE_URL}/images/${selectedImage.id}/thumbnail`, {
            headers: { 'Authorization': `Bearer ${token}` },
          })
        }
        if (!response.ok) throw new Error('Failed to load image')
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const img = new Image()
        img.onload = () => {
          setImageBitmap(img)
          setImageLoading(false)
          // Fit image to fill most of the container (allow larger than 1:1)
          if (containerRef.current) {
            const cw = containerRef.current.clientWidth
            const ch = containerRef.current.clientHeight
            const padding = 20
            const scale = Math.min((cw - padding) / img.width, (ch - padding) / img.height)
            setZoom(scale)
            setPan({
              x: (cw - img.width * scale) / 2,
              y: (ch - img.height * scale) / 2,
            })
          }
        }
        img.src = url
      } catch {
        setImageLoading(false)
        toast.error('Erro', 'Não foi possível carregar a imagem')
      }
    }
    loadImg()
  }, [selectedImage?.id])

  // Convert screen coords to image pixel coords
  const screenToImage = useCallback((sx: number, sy: number): Point => {
    return {
      x: (sx - pan.x) / zoom,
      y: (sy - pan.y) / zoom,
    }
  }, [pan, zoom])

  // Convert image pixel coords to screen coords
  const imageToScreen = useCallback((ix: number, iy: number): Point => {
    return {
      x: ix * zoom + pan.x,
      y: iy * zoom + pan.y,
    }
  }, [pan, zoom])

  // Draw canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !imageBitmap) return

    const container = containerRef.current
    if (!container) return

    canvas.width = container.clientWidth
    canvas.height = container.clientHeight

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw image
    ctx.save()
    ctx.translate(pan.x, pan.y)
    ctx.scale(zoom, zoom)
    ctx.drawImage(imageBitmap, 0, 0)
    ctx.restore()

    if (points.length === 0) return

    // Convert points to screen coords
    const screenPts = points.map(p => imageToScreen(p.x, p.y))

    // Draw filled polygon if closed
    if (closed) {
      // Red overlay inside the polygon (toggleable)
      if (showOverlay) {
        ctx.beginPath()
        ctx.moveTo(screenPts[0].x, screenPts[0].y)
        for (let i = 1; i < screenPts.length; i++) {
          ctx.lineTo(screenPts[i].x, screenPts[i].y)
        }
        ctx.closePath()
        ctx.fillStyle = 'rgba(220, 60, 60, 0.20)'
        ctx.fill()
      }

      // Border always visible
      ctx.beginPath()
      ctx.moveTo(screenPts[0].x, screenPts[0].y)
      for (let i = 1; i < screenPts.length; i++) {
        ctx.lineTo(screenPts[i].x, screenPts[i].y)
      }
      ctx.closePath()
      ctx.strokeStyle = 'rgba(220, 60, 60, 0.9)'
      ctx.lineWidth = 2.5
      ctx.stroke()
    } else {
      // Draw polyline (dashed while drawing)
      ctx.beginPath()
      ctx.moveTo(screenPts[0].x, screenPts[0].y)
      for (let i = 1; i < screenPts.length; i++) {
        ctx.lineTo(screenPts[i].x, screenPts[i].y)
      }
      if (drawing && mousePos) {
        ctx.lineTo(mousePos.x, mousePos.y)
      }
      ctx.strokeStyle = 'rgba(220, 60, 60, 0.8)'
      ctx.lineWidth = 2
      ctx.setLineDash([8, 4])
      ctx.stroke()
      ctx.setLineDash([])
    }

    // Draw vertex dots
    screenPts.forEach((p, i) => {
      ctx.beginPath()
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2)
      ctx.fillStyle = i === 0 ? '#dc3c3c' : '#ffffff'
      ctx.fill()
      ctx.strokeStyle = '#dc3c3c'
      ctx.lineWidth = 2
      ctx.stroke()
    })
  }, [imageBitmap, points, closed, drawing, mousePos, pan, zoom, imageToScreen, showOverlay])

  useEffect(() => {
    draw()
  }, [draw])

  // Resize observer
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const obs = new ResizeObserver(() => draw())
    obs.observe(container)
    return () => obs.disconnect()
  }, [draw])

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && !drawing)) {
      if (!drawing) {
        setPanning(true)
        panStart.current = { x: e.clientX, y: e.clientY }
        panOrigin.current = { ...pan }
      }
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    if (panning) {
      const dx = e.clientX - panStart.current.x
      const dy = e.clientY - panStart.current.y
      setPan({ x: panOrigin.current.x + dx, y: panOrigin.current.y + dy })
      return
    }

    if (drawing && !closed) {
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    }
  }

  const handleMouseUp = () => {
    setPanning(false)
  }

  const handleClick = (e: React.MouseEvent) => {
    if (!drawing || closed || panning) return
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const imgPt = screenToImage(sx, sy)

    setPoints(prev => [...prev, imgPt])
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!drawing || closed || points.length < 3) return
    e.preventDefault()
    setPoints(prev => prev.length > 3 ? prev.slice(0, -1) : prev)
    setClosed(true)
    setDrawing(false)
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15
    const newZoom = Math.min(Math.max(zoom * factor, 0.05), 15)

    const newPanX = mx - (mx - pan.x) * (newZoom / zoom)
    const newPanY = my - (my - pan.y) * (newZoom / zoom)

    setZoom(newZoom)
    setPan({ x: newPanX, y: newPanY })
  }

  const handleClear = () => {
    setPoints([])
    setClosed(false)
    setDrawing(false)
    setMousePos(null)
    setShowOverlay(true)
  }

  const handleStartDrawing = () => {
    handleClear()
    setDrawing(true)
  }

  // Run ALL analyses on the image
  const handleAnalyze = async () => {
    if (!selectedImage || points.length < 3) return
    setAnalyzing(true)
    setProgressStep(0)
    setProgressTotal(ANALYSIS_STEPS.length)

    const polygon = points.map(p => [Math.round(p.x), Math.round(p.y)])
    const imgId = selectedImage.id
    let completedSteps = 0
    let errors = 0

    const runStep = async (stepIdx: number, fn: () => Promise<unknown>) => {
      setProgressStep(stepIdx + 1)
      setProgressLabel(ANALYSIS_STEPS[stepIdx].label)
      try {
        await fn()
      } catch (err) {
        console.warn(`Passo "${ANALYSIS_STEPS[stepIdx].key}" falhou:`, err)
        errors++
      }
      completedSteps++
    }

    try {
      // 1. ROI analysis — masks image and runs vegetation/health/count/pest/biomass inside perimeter
      // Backend saves masked image over original file
      await runStep(0, () => analyzeROI(imgId, polygon, ['vegetation', 'health', 'plant_count', 'pest_disease', 'biomass']))

      // 2. Full ML pipeline on the (now masked) image — generates full_report with
      // segmentation, classification, YOLO, tree count, etc. needed for project overview
      // This dispatches a background task on the server
      await runStep(1, () => analyzeProject(projectId))

      // 3. Poll until the background analysis finishes (full_report completed)
      await runStep(2, async () => {
        const maxAttempts = 60 // max ~2 minutes
        for (let i = 0; i < maxAttempts; i++) {
          await new Promise(resolve => setTimeout(resolve, 2000))
          try {
            const summary = await getProjectAnalysisSummary(projectId)
            if (summary.analyzed_images > 0 && summary.status === 'completed') {
              return // Analysis finished
            }
          } catch {
            // Ignore polling errors, keep trying
          }
        }
        // Timeout - proceed anyway, data may load on next refresh
      })

      if (errors === 0) {
        toast.success('Análise completa', 'Todas as análises foram realizadas com sucesso')
      } else {
        toast.success('Análise concluída', `${completedSteps - errors} de ${completedSteps} etapas finalizadas`)
      }
      onComplete()
    } catch (err) {
      console.error('Erro fatal na análise:', err)
      toast.error('Erro na análise', 'Falha ao analisar. Tente novamente.')
      setAnalyzing(false)
      setProgressLabel('')
    }
  }

  // Save image with perimeter overlay
  const handleSaveImage = () => {
    if (!imageBitmap || points.length < 3) return

    const saveCanvas = document.createElement('canvas')
    saveCanvas.width = imageBitmap.width
    saveCanvas.height = imageBitmap.height
    const ctx = saveCanvas.getContext('2d')
    if (!ctx) return

    // Draw original image
    ctx.drawImage(imageBitmap, 0, 0)

    // Draw polygon overlay
    if (showOverlay) {
      ctx.beginPath()
      ctx.moveTo(points[0].x, points[0].y)
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y)
      }
      ctx.closePath()
      ctx.fillStyle = 'rgba(220, 60, 60, 0.20)'
      ctx.fill()
    }

    // Draw border
    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y)
    }
    ctx.closePath()
    ctx.strokeStyle = 'rgba(220, 60, 60, 0.9)'
    ctx.lineWidth = 3
    ctx.stroke()

    // Draw vertex dots
    points.forEach((p, i) => {
      ctx.beginPath()
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2)
      ctx.fillStyle = i === 0 ? '#dc3c3c' : '#ffffff'
      ctx.fill()
      ctx.strokeStyle = '#dc3c3c'
      ctx.lineWidth = 2
      ctx.stroke()
    })

    // Download
    const link = document.createElement('a')
    link.download = `perimetro_${selectedImage?.original_filename || 'imagem'}.png`
    link.href = saveCanvas.toDataURL('image/png')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Imagem salva', 'Imagem com perímetro delimitado foi salva')
  }

  const zoomTo = (factor: number) => {
    const newZoom = Math.min(Math.max(zoom * factor, 0.05), 15)
    const container = containerRef.current
    if (container) {
      const cx = container.clientWidth / 2
      const cy = container.clientHeight / 2
      setPan({
        x: cx - (cx - pan.x) * (newZoom / zoom),
        y: cy - (cy - pan.y) * (newZoom / zoom),
      })
    }
    setZoom(newZoom)
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            disabled={analyzing}
            className="flex items-center gap-2 px-3 py-1.5 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
          >
            <ArrowLeft size={18} />
            Voltar
          </button>
          <div className="h-5 w-px bg-gray-700" />
          <h2 className="text-white font-medium">Delimitar Perímetro</h2>
        </div>

        {/* Instructions */}
        <div className="text-sm text-gray-400">
          {!drawing && !closed && !analyzing && 'Clique em "Desenhar" para iniciar o perímetro'}
          {drawing && !closed && 'Clique para adicionar pontos. Duplo-clique para fechar o perímetro.'}
          {closed && !analyzing && 'Perímetro definido. Clique "Analisar" para processar.'}
          {analyzing && `Processando análise ${progressStep}/${progressTotal}...`}
        </div>

        <div className="w-32" />
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Image thumbnails sidebar (if multiple images) */}
        {images.length > 1 && (
          <div className="w-20 bg-gray-900 border-r border-gray-800 overflow-y-auto shrink-0 p-2 flex flex-col gap-2">
            {images.map((img, idx) => (
              <button
                key={img.id}
                onClick={() => !analyzing && setSelectedImageIdx(idx)}
                className={`relative w-full aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                  idx === selectedImageIdx ? 'border-red-500' : 'border-transparent hover:border-gray-600'
                } ${analyzing ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={img.original_filename}
                disabled={analyzing}
              >
                <div className="w-full h-full bg-gray-800 flex items-center justify-center text-gray-500">
                  <ImageIcon size={16} />
                </div>
                <span className="absolute bottom-0 left-0 right-0 bg-black/70 text-[10px] text-gray-300 text-center py-0.5 truncate px-1">
                  {idx + 1}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Main canvas area */}
        <div
          ref={containerRef}
          className="flex-1 relative overflow-hidden bg-gray-950"
          style={{ cursor: drawing ? 'crosshair' : panning ? 'grabbing' : 'grab' }}
        >
          {imageLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 size={32} className="animate-spin text-green-500" />
            </div>
          ) : !imageBitmap ? (
            <div className="absolute inset-0 flex items-center justify-center text-gray-500">
              {images.length === 0 ? 'Nenhuma imagem encontrada no projeto' : 'Selecione uma imagem'}
            </div>
          ) : null}

          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
            onWheel={handleWheel}
          />

          {/* Floating toolbar */}
          <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
            <button
              onClick={handleStartDrawing}
              disabled={analyzing}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg ${
                drawing
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
              } disabled:opacity-50`}
              title="Desenhar perímetro"
            >
              <PenTool size={16} />
              Desenhar
            </button>

            <button
              onClick={handleClear}
              disabled={points.length === 0 || analyzing}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors shadow-lg disabled:opacity-50"
              title="Limpar perímetro"
            >
              <Trash2 size={16} />
              Limpar
            </button>

            {/* Toggle overlay */}
            {closed && (
              <button
                onClick={() => setShowOverlay(v => !v)}
                disabled={analyzing}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors shadow-lg disabled:opacity-50"
                title={showOverlay ? 'Ocultar sombreamento' : 'Mostrar sombreamento'}
              >
                {showOverlay ? <EyeOff size={16} /> : <Eye size={16} />}
                {showOverlay ? 'Ocultar filtro' : 'Mostrar filtro'}
              </button>
            )}

            {/* Save image with perimeter */}
            {closed && (
              <button
                onClick={handleSaveImage}
                disabled={analyzing}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors shadow-lg disabled:opacity-50"
                title="Salvar imagem com perímetro"
              >
                <Download size={16} />
                Salvar Imagem
              </button>
            )}

            <div className="h-px bg-gray-700 my-1" />

            <button
              onClick={() => zoomTo(1.3)}
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors shadow-lg"
              title="Zoom in"
            >
              <ZoomIn size={16} />
            </button>
            <button
              onClick={() => zoomTo(1 / 1.3)}
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors shadow-lg"
              title="Zoom out"
            >
              <ZoomOut size={16} />
            </button>
          </div>

          {/* Analyze button (appears when polygon is closed) */}
          {closed && !analyzing && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
              <button
                onClick={handleAnalyze}
                className="flex items-center gap-3 px-8 py-4 bg-green-600 hover:bg-green-500 text-white rounded-xl text-lg font-semibold shadow-2xl transition-all hover:scale-105"
              >
                <Play size={22} />
                Analisar Área Delimitada
              </button>
            </div>
          )}

          {/* Analyzing overlay */}
          {analyzing && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-20">
              <Loader2 size={48} className="animate-spin text-green-500 mb-4" />
              <p className="text-white text-lg font-semibold mb-2">Executando análises completas...</p>
              <p className="text-green-400 text-sm mb-4">{progressLabel}</p>

              {/* Progress bar */}
              <div className="w-80">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Etapa {progressStep} de {progressTotal}</span>
                  <span>{progressTotal > 0 ? Math.round((progressStep / progressTotal) * 100) : 0}%</span>
                </div>
                <div className="w-full h-2.5 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all duration-500"
                    style={{ width: `${progressTotal > 0 ? Math.max(3, (progressStep / progressTotal) * 100) : 3}%` }}
                  />
                </div>
              </div>

              <p className="text-gray-500 text-xs mt-4">Isso pode levar alguns minutos</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
