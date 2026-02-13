'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Image as ImageIcon,
  Trash2,
  Loader2,
  Cpu,
  Leaf,
  Thermometer,
  Palette,
  Trees,
  Layers,
  BarChart3,
  FileText,
  Video,
  Film,
  ChevronDown,
  ChevronUp,
  Info,
  X,
  Eye,
} from 'lucide-react'
import {
  getImages,
  getImageThumbnailUrl,
  getImageMetadata,
  getAnalyses,
  analyzeVegetation,
  analyzePlantHealth,
  analyzeColors,
  detectObjects,
  classifyLandUse,
  extractFeatures,
  generateReport,
  runFullMLAnalysis,
  analyzeVideo,
  extractVideoKeyframes,
  getVideoMosaicUrl,
  getHeatmapUrl,
  getVegetationMaskUrl,
  deleteAnalysis,
  deleteImage,
  type ImageData,
  type Analysis,
  API_BASE_URL,
  loadAuthToken,
} from '@/lib/api'
import { useToast } from './Toast'
import { useConfirmDialog } from './ConfirmDialog'

interface ImageAnalysisPanelProps {
  projectId: number
  onAnalysisComplete?: () => void
}

const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.mkv', '.webm']

function isVideoFile(filename: string): boolean {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'))
  return VIDEO_EXTENSIONS.includes(ext)
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

export default function ImageAnalysisPanel({ projectId, onAnalysisComplete }: ImageAnalysisPanelProps) {
  const [images, setImages] = useState<ImageData[]>([])
  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null)
  const [imageAnalyses, setImageAnalyses] = useState<Analysis[]>([])
  const [metadata, setMetadata] = useState<Record<string, unknown> | null>(null)
  const [showMetadata, setShowMetadata] = useState(false)
  const [isRunning, setIsRunning] = useState<Record<string, boolean>>({})
  const [overlayMode, setOverlayMode] = useState<'none' | 'heatmap' | 'mask'>('none')
  const [loading, setLoading] = useState(true)
  const [loadingAnalyses, setLoadingAnalyses] = useState(false)
  const [expandedAnalysis, setExpandedAnalysis] = useState<number | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Video-specific
  const [videoSampleRate, setVideoSampleRate] = useState(30)
  const [videoMaxFrames, setVideoMaxFrames] = useState(50)
  const [videoNumKeyframes, setVideoNumKeyframes] = useState(10)

  const toast = useToast()
  const { confirm } = useConfirmDialog()

  // Load images on mount
  useEffect(() => {
    loadImages()
  }, [projectId])

  const loadImages = async () => {
    setLoading(true)
    try {
      const data = await getImages(projectId, 0, 200)
      setImages(data.images)
      if (data.images.length > 0 && !selectedImage) {
        setSelectedImage(data.images[0])
      }
    } catch {
      toast.error('Erro ao carregar imagens', 'Nao foi possivel listar as imagens do projeto')
    } finally {
      setLoading(false)
    }
  }

  // Load analyses when selected image changes
  useEffect(() => {
    if (selectedImage) {
      loadImageAnalyses(selectedImage.id)
      loadPreview(selectedImage.id)
      setMetadata(null)
      setShowMetadata(false)
      setOverlayMode('none')
    } else {
      setImageAnalyses([])
      setPreviewUrl(null)
    }
  }, [selectedImage?.id])

  const loadImageAnalyses = async (imageId: number) => {
    setLoadingAnalyses(true)
    try {
      const data = await getAnalyses(imageId, undefined, undefined, 0, 100)
      setImageAnalyses(data.analyses)
    } catch {
      setImageAnalyses([])
    } finally {
      setLoadingAnalyses(false)
    }
  }

  const loadPreview = async (imageId: number) => {
    const token = loadAuthToken()
    if (!token) return
    try {
      const response = await fetch(`${API_BASE_URL}/images/${imageId}/thumbnail`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (response.ok) {
        const blob = await response.blob()
        if (previewUrl) URL.revokeObjectURL(previewUrl)
        setPreviewUrl(URL.createObjectURL(blob))
      }
    } catch {
      setPreviewUrl(null)
    }
  }

  const handleLoadMetadata = async () => {
    if (!selectedImage) return
    if (metadata) {
      setShowMetadata(!showMetadata)
      return
    }
    try {
      const data = await getImageMetadata(selectedImage.id)
      setMetadata(data)
      setShowMetadata(true)
    } catch {
      toast.error('Erro', 'Nao foi possivel carregar metadados')
    }
  }

  // Run an analysis action
  const runAnalysis = async (key: string, fn: () => Promise<Analysis>) => {
    if (!selectedImage) return
    setIsRunning(prev => ({ ...prev, [key]: true }))
    try {
      await fn()
      toast.success('Analise concluida', `${key} finalizada com sucesso`)
      await loadImageAnalyses(selectedImage.id)
      onAnalysisComplete?.()
    } catch (err: any) {
      toast.error('Erro na analise', err?.detail || err?.message || 'Falha ao executar analise')
    } finally {
      setIsRunning(prev => ({ ...prev, [key]: false }))
    }
  }

  const handleDeleteAnalysis = (analysisId: number) => {
    confirm({
      title: 'Excluir Analise',
      message: 'Tem certeza que deseja excluir esta analise? Esta acao nao pode ser desfeita.',
      confirmText: 'Excluir',
      type: 'danger',
      onConfirm: async () => {
        await deleteAnalysis(analysisId)
        toast.success('Analise excluida', 'A analise foi removida com sucesso')
        if (selectedImage) await loadImageAnalyses(selectedImage.id)
        onAnalysisComplete?.()
      },
    })
  }

  const handleDeleteImage = (image: ImageData) => {
    confirm({
      title: 'Excluir Imagem',
      message: `Tem certeza que deseja excluir "${image.original_filename}"? Todas as analises associadas serao perdidas.`,
      confirmText: 'Excluir',
      type: 'danger',
      onConfirm: async () => {
        await deleteImage(image.id)
        toast.success('Imagem excluida', 'A imagem foi removida com sucesso')
        setImages(prev => prev.filter(i => i.id !== image.id))
        if (selectedImage?.id === image.id) {
          const remaining = images.filter(i => i.id !== image.id)
          setSelectedImage(remaining.length > 0 ? remaining[0] : null)
        }
        onAnalysisComplete?.()
      },
    })
  }

  const isVideo = selectedImage ? isVideoFile(selectedImage.original_filename) : false

  // Analysis action buttons config
  const imageActions = [
    { key: 'ML Completo', icon: <Cpu size={16} />, fn: () => runFullMLAnalysis(selectedImage!.id), color: 'bg-[#6AAF3D] hover:bg-[#5a9a34]' },
    { key: 'Vegetacao', icon: <Leaf size={16} />, fn: () => analyzeVegetation(selectedImage!.id), color: 'bg-green-700 hover:bg-green-600' },
    { key: 'Saude', icon: <Thermometer size={16} />, fn: () => analyzePlantHealth(selectedImage!.id), color: 'bg-blue-700 hover:bg-blue-600' },
    { key: 'Cores', icon: <Palette size={16} />, fn: () => analyzeColors(selectedImage!.id), color: 'bg-purple-700 hover:bg-purple-600' },
    { key: 'YOLO', icon: <Trees size={16} />, fn: () => detectObjects(selectedImage!.id), color: 'bg-cyan-700 hover:bg-cyan-600' },
    { key: 'Uso Solo', icon: <Layers size={16} />, fn: () => classifyLandUse(selectedImage!.id), color: 'bg-amber-700 hover:bg-amber-600' },
    { key: 'Features', icon: <BarChart3 size={16} />, fn: () => extractFeatures(selectedImage!.id), color: 'bg-indigo-700 hover:bg-indigo-600' },
    { key: 'Relatorio', icon: <FileText size={16} />, fn: () => generateReport(selectedImage!.id), color: 'bg-gray-600 hover:bg-gray-500' },
  ]

  const videoActions = [
    { key: 'Analisar Video', icon: <Video size={16} />, fn: () => analyzeVideo(selectedImage!.id, videoSampleRate, videoMaxFrames), color: 'bg-red-700 hover:bg-red-600' },
    { key: 'Extrair Keyframes', icon: <Film size={16} />, fn: () => extractVideoKeyframes(selectedImage!.id, videoNumKeyframes), color: 'bg-orange-700 hover:bg-orange-600' },
  ]

  const getAnalysisTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'full_report': 'Analise Completa (ML)',
      'vegetation_coverage': 'Cobertura Vegetal',
      'plant_health': 'Saude das Plantas',
      'color_analysis': 'Analise de Cores',
      'object_detection': 'Deteccao de Objetos (YOLO)',
      'land_use': 'Classificacao de Uso do Solo',
      'feature_extraction': 'Extracao de Features',
      'report': 'Relatorio',
      'video_analysis': 'Analise de Video',
      'video_keyframes': 'Keyframes do Video',
    }
    return labels[type] || type
  }

  const getStatusColor = (status: string) => {
    if (status === 'completed') return 'text-green-400'
    if (status === 'failed' || status === 'error') return 'text-red-400'
    return 'text-yellow-400'
  }

  // Overlay URL
  const overlayUrl = selectedImage
    ? overlayMode === 'heatmap'
      ? getHeatmapUrl(selectedImage.id)
      : overlayMode === 'mask'
        ? getVegetationMaskUrl(selectedImage.id)
        : null
    : null

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={32} className="animate-spin text-[#6AAF3D]" />
        <span className="ml-3 text-gray-400">Carregando imagens...</span>
      </div>
    )
  }

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <ImageIcon size={48} className="text-gray-600 mb-4" />
        <h3 className="text-lg text-white mb-2">Nenhuma imagem no projeto</h3>
        <p className="text-gray-500 text-sm">Faca upload de imagens para executar analises individuais.</p>
      </div>
    )
  }

  return (
    <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-6">
      <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
        <ImageIcon size={18} className="text-[#6AAF3D]" />
        Analise por Imagem
        <span className="text-gray-500 text-sm font-normal">({images.length} arquivo{images.length !== 1 ? 's' : ''})</span>
      </h3>

      {/* Thumbnail Grid */}
      <div className="flex flex-wrap gap-2 mb-6">
        {images.map(img => (
          <button
            key={img.id}
            onClick={() => setSelectedImage(img)}
            className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
              selectedImage?.id === img.id
                ? 'border-[#6AAF3D] ring-2 ring-[#6AAF3D]/30'
                : 'border-gray-700 hover:border-gray-500'
            }`}
            title={img.original_filename}
          >
            {isVideoFile(img.original_filename) ? (
              <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                <Video size={20} className="text-red-400" />
              </div>
            ) : (
              <img
                src={getImageThumbnailUrl(img.id)}
                alt={img.original_filename}
                className="w-full h-full object-cover"
                crossOrigin="use-credentials"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none'
                  ;(e.target as HTMLImageElement).parentElement!.classList.add('bg-gray-800')
                }}
              />
            )}
            {selectedImage?.id === img.id && (
              <div className="absolute inset-0 bg-[#6AAF3D]/20" />
            )}
          </button>
        ))}
      </div>

      {/* Selected Image Detail */}
      {selectedImage && (
        <div className="border border-gray-700/50 rounded-xl overflow-hidden">
          {/* Image Header */}
          <div className="flex items-center justify-between p-4 bg-gray-800/30">
            <div>
              <h4 className="text-white font-medium text-sm">{selectedImage.original_filename}</h4>
              <p className="text-gray-500 text-xs mt-0.5">
                {selectedImage.width && selectedImage.height
                  ? `${selectedImage.width}x${selectedImage.height} · `
                  : ''}
                {formatFileSize(selectedImage.file_size)}
                {selectedImage.center_lat && selectedImage.center_lon
                  ? ` · GPS: ${selectedImage.center_lat.toFixed(4)}, ${selectedImage.center_lon.toFixed(4)}`
                  : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleLoadMetadata}
                className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                <Info size={14} className="inline mr-1" />
                Metadata
              </button>
              <button
                onClick={() => handleDeleteImage(selectedImage)}
                className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
                title="Excluir imagem"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          {/* Metadata Panel */}
          {showMetadata && metadata && (
            <div className="p-4 bg-gray-800/20 border-t border-gray-700/50">
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-sm text-gray-400 font-medium">Metadados EXIF</h5>
                <button onClick={() => setShowMetadata(false)} className="p-1 hover:bg-gray-700 rounded">
                  <X size={14} className="text-gray-500" />
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                {Object.entries(metadata).map(([key, val]) => (
                  <div key={key} className="p-2 bg-gray-800/50 rounded">
                    <span className="text-gray-500 block truncate">{key}</span>
                    <span className="text-white block truncate">{val != null ? String(val) : 'N/A'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview with Overlays */}
          <div className="relative bg-black">
            {!isVideo && previewUrl && (
              <div className="relative">
                <img
                  src={previewUrl}
                  alt={selectedImage.original_filename}
                  className="w-full max-h-[400px] object-contain"
                />
                {overlayUrl && (
                  <img
                    src={overlayUrl}
                    alt="overlay"
                    className="absolute inset-0 w-full h-full object-contain mix-blend-screen opacity-70"
                    crossOrigin="use-credentials"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                )}
              </div>
            )}
            {isVideo && (
              <div className="flex items-center justify-center py-12 bg-gray-900">
                <div className="text-center">
                  <Video size={48} className="text-red-400 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">{selectedImage.original_filename}</p>
                  {imageAnalyses.some(a => a.analysis_type === 'video_analysis' && a.status === 'completed') && (
                    <img
                      src={getVideoMosaicUrl(selectedImage.id)}
                      alt="Mosaico do video"
                      className="mt-4 max-h-[300px] mx-auto rounded-lg"
                      crossOrigin="use-credentials"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Overlay Controls (images only) */}
            {!isVideo && previewUrl && (
              <div className="absolute bottom-3 right-3 flex gap-1">
                {(['none', 'heatmap', 'mask'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setOverlayMode(mode)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      overlayMode === mode
                        ? 'bg-[#6AAF3D] text-white'
                        : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {mode === 'none' ? 'Nenhuma' : mode === 'heatmap' ? 'Heatmap' : 'Mascara'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Analysis Action Buttons */}
          <div className="p-4 border-t border-gray-700/50">
            <p className="text-gray-400 text-xs mb-3 font-medium uppercase tracking-wider">Executar Analise:</p>

            {!isVideo ? (
              <div className="flex flex-wrap gap-2">
                {imageActions.map(action => (
                  <button
                    key={action.key}
                    onClick={() => runAnalysis(action.key, action.fn)}
                    disabled={isRunning[action.key]}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs text-white rounded-lg transition-colors disabled:opacity-50 ${action.color}`}
                  >
                    {isRunning[action.key] ? <Loader2 size={14} className="animate-spin" /> : action.icon}
                    {action.key}
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {videoActions.map(action => (
                    <button
                      key={action.key}
                      onClick={() => runAnalysis(action.key, action.fn)}
                      disabled={isRunning[action.key]}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs text-white rounded-lg transition-colors disabled:opacity-50 ${action.color}`}
                    >
                      {isRunning[action.key] ? <Loader2 size={14} className="animate-spin" /> : action.icon}
                      {action.key}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-gray-400">
                  <label className="flex items-center gap-1">
                    Sample Rate:
                    <input
                      type="number"
                      value={videoSampleRate}
                      onChange={e => setVideoSampleRate(Number(e.target.value))}
                      className="w-16 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white"
                      min={1}
                    />
                  </label>
                  <label className="flex items-center gap-1">
                    Max Frames:
                    <input
                      type="number"
                      value={videoMaxFrames}
                      onChange={e => setVideoMaxFrames(Number(e.target.value))}
                      className="w-16 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white"
                      min={1}
                    />
                  </label>
                  <label className="flex items-center gap-1">
                    Keyframes:
                    <input
                      type="number"
                      value={videoNumKeyframes}
                      onChange={e => setVideoNumKeyframes(Number(e.target.value))}
                      className="w-16 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white"
                      min={1}
                    />
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Analysis Results */}
          <div className="p-4 border-t border-gray-700/50">
            <p className="text-gray-400 text-xs mb-3 font-medium uppercase tracking-wider">
              Resultados ({imageAnalyses.length} analise{imageAnalyses.length !== 1 ? 's' : ''}):
            </p>

            {loadingAnalyses ? (
              <div className="flex items-center gap-2 py-4">
                <Loader2 size={16} className="animate-spin text-gray-400" />
                <span className="text-gray-500 text-sm">Carregando analises...</span>
              </div>
            ) : imageAnalyses.length === 0 ? (
              <p className="text-gray-600 text-sm py-4">Nenhuma analise executada nesta imagem.</p>
            ) : (
              <div className="space-y-2">
                {imageAnalyses.map(analysis => (
                  <div key={analysis.id} className="bg-gray-800/30 rounded-lg overflow-hidden">
                    {/* Analysis Header */}
                    <div
                      className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-800/50 transition-colors"
                      onClick={() => setExpandedAnalysis(expandedAnalysis === analysis.id ? null : analysis.id)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`text-xs font-medium ${getStatusColor(analysis.status)}`}>
                          {analysis.status === 'completed' ? '●' : analysis.status === 'failed' ? '✕' : '○'}
                        </span>
                        <div className="min-w-0">
                          <p className="text-white text-sm truncate">{getAnalysisTypeLabel(analysis.analysis_type)}</p>
                          <p className="text-gray-500 text-xs">
                            {analysis.processing_time_seconds
                              ? `${analysis.processing_time_seconds.toFixed(1)}s · `
                              : ''}
                            {new Date(analysis.created_at).toLocaleString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteAnalysis(analysis.id) }}
                          className="p-1 text-gray-500 hover:text-red-400 rounded transition-colors"
                          title="Excluir analise"
                        >
                          <Trash2 size={14} />
                        </button>
                        {expandedAnalysis === analysis.id ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
                      </div>
                    </div>

                    {/* Analysis Details (Expanded) */}
                    {expandedAnalysis === analysis.id && analysis.results && (
                      <div className="p-3 border-t border-gray-700/30">
                        {analysis.error_message && (
                          <p className="text-red-400 text-xs mb-2">{analysis.error_message}</p>
                        )}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                          {Object.entries(analysis.results).map(([key, val]) => {
                            if (key === 'ml_errors' || key === 'output_files') return null
                            const displayVal = typeof val === 'object' && val !== null
                              ? JSON.stringify(val).slice(0, 120) + (JSON.stringify(val).length > 120 ? '...' : '')
                              : String(val)
                            return (
                              <div key={key} className="p-2 bg-gray-800/50 rounded">
                                <span className="text-gray-500 block truncate">{key.replace(/_/g, ' ')}</span>
                                <span className="text-white block truncate" title={typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val)}>
                                  {displayVal}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
