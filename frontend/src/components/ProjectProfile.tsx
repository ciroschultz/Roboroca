'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  ArrowLeft,
  Download,
  Share2,
  Trash2,
  Calendar,
  MapPin,
  Leaf,
  Trees,
  Droplets,
  Mountain,
  Thermometer,
  FileText,
  Image,
  Clock,
  CheckCircle,
  AlertTriangle,
  Eye,
  BarChart3,
  Cloud,
  Globe,
  Layers,
  Loader2,
  Video,
  Cpu,
} from 'lucide-react'
import {
  DonutChart,
  BarChartComponent,
  AreaChartComponent,
  GaugeChart,
} from './Charts'
import StatCard from './StatCard'
import MapView from './MapView'
import {
  getProjectAnalyses,
  getProjectEnrichedData,
  getProjectAnalysisSummary,
  getProjectTimeline,
  downloadAnalysisPDF,
  analyzeProject,
  type Analysis,
  type EnrichedData,
  type WeatherData,
  type SoilData,
  type ElevationData,
  type GeocodingData,
  type TimelineEntry,
} from '@/lib/api'
import { useToast } from './Toast'

interface ProjectData {
  id: string
  name: string
  createdAt: string
  status: 'pending' | 'processing' | 'completed' | 'error'
  sourceType: 'drone' | 'satellite'
  imageCount: number
  area: number // hectares
  location?: string
  results?: {
    vegetationCoverage: number  // % de cobertura vegetal
    healthIndex: number         // % índice de saúde
    plantCount: number          // Total de árvores detectadas
    healthyPercentage: number
    stressedPercentage: number
    criticalPercentage: number
    landUse: { name: string; value: number; color: string }[]
    heightDistribution: { altura: string; quantidade: number }[]
  }
}

interface AnalysisProgress {
  stage: string
  analyzedImages: number
  totalImages: number
  startedAt: number
}

interface ProjectProfileProps {
  project: ProjectData
  onBack: () => void
  onRefresh?: () => void
  initialTab?: 'overview' | 'map' | 'analysis' | 'report'
  analysisSection?: string
}

// Mapa de submenu ID → section element ID
const sectionMap: Record<string, string> = {
  'cobertura': 'section-segmentation',
  'saude-indice': 'section-visual-features',
  'uso-solo': 'section-scene-classification',
  'contagem': 'section-object-detection',
  'saude': 'section-vegetation-type',
  'altura': 'section-summary',
}

export default function ProjectProfile({ project, onBack, onRefresh, initialTab, analysisSection }: ProjectProfileProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'map' | 'analysis' | 'report'>(initialTab || 'overview')
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [enrichedData, setEnrichedData] = useState<EnrichedData | null>(null)
  const [timelineData, setTimelineData] = useState<TimelineEntry[]>([])
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [loadingAnalyses, setLoadingAnalyses] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const toast = useToast()

  // Reagir a mudanças de initialTab (ex: clique em submenu da sidebar)
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab)
    }
  }, [initialTab])

  // Scroll para seção específica quando analysisSection muda
  useEffect(() => {
    if (analysisSection && activeTab === 'analysis') {
      const sectionId = sectionMap[analysisSection]
      if (sectionId) {
        // Pequeno delay para garantir que o DOM renderizou
        setTimeout(() => {
          document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 100)
      }
    }
  }, [analysisSection, activeTab])
  const [loadingEnriched, setLoadingEnriched] = useState(false)
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const [isReanalyzing, setIsReanalyzing] = useState(false)
  const [isExportingJson, setIsExportingJson] = useState(false)

  // Buscar análises do projeto ao montar
  useEffect(() => {
    if (project.status === 'completed' || project.status === 'processing') {
      fetchAnalyses()
    }
  }, [project.id, project.status])

  // Stages for the ML analysis pipeline
  const analysisStages = [
    'Preparando imagens...',
    'Segmentacao (DeepLabV3)...',
    'Classificacao de cena (ResNet18)...',
    'Deteccao de objetos (YOLO)...',
    'Contagem de arvores...',
    'Extraindo caracteristicas visuais...',
    'Gerando relatorio final...',
  ]

  // Poll analysis progress during processing
  const pollProgress = useCallback(async () => {
    try {
      const summary = await getProjectAnalysisSummary(Number(project.id))
      const analyzed = summary.analyzed_images || 0
      const total = summary.total_images || 1

      // Estimate which stage based on progress
      const progressRatio = analyzed / total
      const stageIdx = Math.min(
        Math.floor(progressRatio * analysisStages.length),
        analysisStages.length - 1
      )

      setAnalysisProgress(prev => ({
        stage: analysisStages[stageIdx],
        analyzedImages: analyzed,
        totalImages: total,
        startedAt: prev?.startedAt || Date.now(),
      }))

      // Check if analysis is complete
      if (summary.status === 'completed' || (analyzed >= total && total > 0)) {
        // Stop polling
        if (pollingRef.current) {
          clearInterval(pollingRef.current)
          pollingRef.current = null
        }
        setAnalysisProgress(null)
        toast.success('Analise concluida', `${analyzed} imagem(ns) analisada(s) com sucesso`)
        // Refresh parent project list and local analyses
        onRefresh?.()
        fetchAnalyses()
      }
    } catch {
      // Silently fail polling — analysis still running
    }
  }, [project.id, onRefresh])

  // Start polling when project is processing
  useEffect(() => {
    if (project.status === 'processing' && !pollingRef.current) {
      setAnalysisProgress({
        stage: analysisStages[0],
        analyzedImages: 0,
        totalImages: project.imageCount || 1,
        startedAt: Date.now(),
      })
      pollingRef.current = setInterval(pollProgress, 5000)
      // Also poll immediately
      pollProgress()
    }
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [project.status, pollProgress])

  const fetchAnalyses = async () => {
    setLoadingAnalyses(true)
    try {
      const data = await getProjectAnalyses(Number(project.id))
      setAnalyses(data.analyses.filter(a => a.status === 'completed'))
    } catch (err) {
      console.error('Erro ao buscar análises:', err)
      toast.error('Erro ao carregar analises', 'Nao foi possivel carregar os resultados de analise')
    } finally {
      setLoadingAnalyses(false)
    }
  }

  const fetchEnrichedData = async () => {
    setLoadingEnriched(true)
    try {
      const data = await getProjectEnrichedData(Number(project.id))
      setEnrichedData(data)
    } catch (err) {
      // Silently fail - enriched data is optional (may not have GPS)
      console.error('Erro ao buscar dados enriquecidos:', err)
    } finally {
      setLoadingEnriched(false)
    }
  }

  const fetchTimeline = useCallback(async () => {
    setTimelineLoading(true)
    try {
      const data = await getProjectTimeline(Number(project.id))
      setTimelineData(data.timeline)
    } catch {
      // Silently fail - timeline is optional
    } finally {
      setTimelineLoading(false)
    }
  }, [project.id])

  // Buscar dados enriquecidos e timeline independente do status
  useEffect(() => {
    fetchEnrichedData()
    fetchTimeline()
  }, [project.id, fetchTimeline])

  const handleStartAnalysis = async () => {
    try {
      setIsReanalyzing(true)
      const result = await analyzeProject(Number(project.id))
      if (result.analyses_started === 0) {
        toast.info('Analise ja realizada', 'Todas as imagens ja foram analisadas')
        return
      }
      toast.info('Analise iniciada', `Analisando ${result.analyses_started} arquivo(s)...`)
      // Start progress tracking
      setAnalysisProgress({
        stage: analysisStages[0],
        analyzedImages: 0,
        totalImages: result.analyses_started,
        startedAt: Date.now(),
      })
      pollingRef.current = setInterval(pollProgress, 5000)
      onRefresh?.()
    } catch (err) {
      console.error('Erro ao iniciar analise:', err)
      toast.error('Erro na analise', 'Falha ao iniciar analise. Verifique se o projeto possui imagens.')
    } finally {
      setIsReanalyzing(false)
    }
  }

  const handleReanalyze = async () => {
    try {
      setIsReanalyzing(true)
      const result = await analyzeProject(Number(project.id))
      if (result.analyses_started === 0) {
        toast.info('Analise ja realizada', 'Todas as imagens ja foram analisadas. Delete analises anteriores para forcar re-analise.')
        return
      }
      toast.info('Re-analise iniciada', `Analisando ${result.analyses_started} arquivo(s)...`)
      setAnalysisProgress({
        stage: analysisStages[0],
        analyzedImages: 0,
        totalImages: result.analyses_started,
        startedAt: Date.now(),
      })
      pollingRef.current = setInterval(pollProgress, 5000)
      onRefresh?.()
    } catch (err) {
      console.error('Erro ao re-analisar:', err)
      toast.error('Erro na re-analise', 'Falha ao iniciar re-analise. Tente novamente.')
    } finally {
      setIsReanalyzing(false)
    }
  }

  const handleExportJson = async () => {
    if (analyses.length === 0) return
    setIsExportingJson(true)
    try {
      const exportData = {
        project: {
          id: project.id,
          name: project.name,
          area: project.area,
          imageCount: project.imageCount,
          createdAt: project.createdAt,
        },
        analyses: analyses.map(a => ({
          id: a.id,
          type: a.analysis_type,
          status: a.status,
          results: a.results,
          created_at: a.created_at,
          processing_time: a.processing_time_seconds,
        })),
        exported_at: new Date().toISOString(),
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `analise_${project.name.replace(/\s+/g, '_')}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('JSON exportado', 'Arquivo salvo com sucesso')
    } catch (err) {
      console.error('Erro ao exportar JSON:', err)
      toast.error('Erro ao exportar', 'Falha ao gerar arquivo JSON')
    } finally {
      setIsExportingJson(false)
    }
  }

  const handleExportPdf = async () => {
    if (analyses.length === 0) return
    setIsExportingPdf(true)
    try {
      await downloadAnalysisPDF(analyses[0].id, `relatorio_${project.name}.pdf`)
      toast.success('PDF exportado', 'Relatorio salvo com sucesso')
    } catch (err) {
      console.error('Erro ao exportar PDF:', err)
      toast.error('Erro ao exportar', 'Falha ao gerar relatorio PDF')
    } finally {
      setIsExportingPdf(false)
    }
  }

  // Extrair dados ML das análises completas
  const fullAnalysis = analyses.find(a => a.analysis_type === 'full_report')
  const videoAnalysis = analyses.find(a => a.analysis_type === 'video_analysis')
  const analysisResults = fullAnalysis?.results || {}

  // Dados de segmentação
  const segmentation = analysisResults.segmentation as Record<string, unknown> | undefined
  // Classificação de cena
  const sceneClassification = analysisResults.scene_classification as Record<string, unknown> | undefined
  // Tipo de vegetação
  const vegetationType = analysisResults.vegetation_type as Record<string, unknown> | undefined
  // Features visuais
  const visualFeatures = analysisResults.visual_features as Record<string, unknown> | undefined
  // Detecção de objetos
  const objectDetection = analysisResults.object_detection as Record<string, unknown> | undefined
  // Resumo temporal (vídeo)
  const temporalSummary = videoAnalysis?.results?.temporal_summary as Record<string, unknown> | undefined
  const videoInfo = videoAnalysis?.results?.video_info as Record<string, unknown> | undefined

  const getStatusBadge = () => {
    switch (project.status) {
      case 'completed':
        return (
          <span className="flex items-center gap-1 px-3 py-1 bg-green-900/30 text-green-400 rounded-full text-sm">
            <CheckCircle size={14} />
            Concluido
          </span>
        )
      case 'processing':
        return (
          <span className="flex items-center gap-1 px-3 py-1 bg-yellow-900/30 text-yellow-400 rounded-full text-sm">
            <Clock size={14} className="animate-spin" />
            Processando
          </span>
        )
      case 'error':
        return (
          <span className="flex items-center gap-1 px-3 py-1 bg-red-900/30 text-red-400 rounded-full text-sm">
            <AlertTriangle size={14} />
            Erro
          </span>
        )
      case 'pending':
        return (
          <span className="flex items-center gap-1 px-3 py-1 bg-blue-900/30 text-blue-400 rounded-full text-sm">
            <Clock size={14} />
            Pendente
          </span>
        )
    }
  }

  // Dados de exemplo para os gráficos do projeto
  const plantHealthData = project.results ? [
    { name: 'Saudavel', value: project.results.healthyPercentage, color: '#6AAF3D' },
    { name: 'Estressada', value: project.results.stressedPercentage, color: '#F59E0B' },
    { name: 'Critica', value: project.results.criticalPercentage, color: '#EF4444' },
  ] : []

  // Dados de evolução temporal (da API)
  const vegetationTimeData = timelineData.length > 0
    ? timelineData.map(entry => ({
        periodo: entry.periodo,
        cobertura: entry.cobertura ?? 0,
        saude: entry.saude ?? 0,
      }))
    : []

  // Helper para formatar valores de dados enriquecidos
  const formatWeatherValue = (val: unknown): string => {
    if (val === null || val === undefined) return 'N/A'
    if (typeof val === 'number') return val.toFixed(1)
    return String(val)
  }

  return (
    <div className="min-h-screen">
      {/* Header do Projeto */}
      <div className="bg-[#1a1a2e] border-b border-gray-700/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-400" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white">{project.name}</h1>
                {getStatusBadge()}
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  {project.createdAt}
                </span>
                <span className="flex items-center gap-1">
                  <Image size={14} />
                  {project.imageCount} {project.imageCount === 1 ? 'imagem' : 'imagens'}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin size={14} />
                  {project.area} hectares
                </span>
                <span className="px-2 py-0.5 bg-gray-700 rounded text-xs">
                  {project.sourceType === 'drone' ? 'Drone' : 'Satelite'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors">
              <Share2 size={18} />
              Compartilhar
            </button>
            <button
              onClick={handleExportPdf}
              disabled={isExportingPdf || analyses.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-[#6AAF3D] hover:bg-[#5a9a34] disabled:bg-gray-600 text-white rounded-lg transition-colors"
            >
              {isExportingPdf ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Download size={18} />
              )}
              Baixar Relatorio
            </button>
            <button className="p-2 hover:bg-red-900/30 text-gray-400 hover:text-red-400 rounded-lg transition-colors">
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4">
          {[
            { id: 'overview', label: 'Visao Geral', icon: <BarChart3 size={16} /> },
            { id: 'analysis', label: 'Analise ML', icon: <Cpu size={16} /> },
            { id: 'map', label: 'Mapa', icon: <MapPin size={16} /> },
            { id: 'report', label: 'Relatorio', icon: <FileText size={16} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#0f0f1a] text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conteudo */}
      <div className="p-6">
        {project.status === 'pending' ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-24 h-24 rounded-full bg-blue-900/20 flex items-center justify-center mb-6">
              <BarChart3 size={48} className="text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Analise pendente</h3>
            <p className="text-gray-400 text-center max-w-md mb-6">
              Este projeto possui arquivos carregados mas ainda nao foi analisado.
              Clique no botao abaixo para iniciar a analise com algoritmos de Machine Learning.
            </p>
            <button
              onClick={handleStartAnalysis}
              className="px-6 py-3 bg-[#6AAF3D] hover:bg-[#5a9a34] text-white rounded-lg transition-colors font-medium text-lg mb-8"
            >
              Iniciar Analise
            </button>

            {/* Dados ambientais mesmo em projetos pendentes */}
            {enrichedData && enrichedData.coordinates ? (
              <div className="w-full max-w-4xl">
                <h4 className="text-white font-medium text-sm mb-3 text-center">Dados Ambientais do Local</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {enrichedData.weather && !enrichedData.weather.error && (
                    <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Cloud size={18} className="text-blue-400" />
                        <h4 className="text-white font-medium text-sm">Clima</h4>
                      </div>
                      <div className="space-y-2 text-sm">
                        {enrichedData.weather.current?.weather_description && (
                          <p className="text-blue-300 font-medium mb-1">{enrichedData.weather.current.weather_description}</p>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-500">Temperatura</span>
                          <span className="text-white">{formatWeatherValue(enrichedData.weather.current?.temperature_c)}°C</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Umidade</span>
                          <span className="text-white">{formatWeatherValue(enrichedData.weather.current?.relative_humidity_pct)}%</span>
                        </div>
                      </div>
                    </div>
                  )}
                  {enrichedData.soil && !enrichedData.soil.error && (
                    <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Layers size={18} className="text-amber-400" />
                        <h4 className="text-white font-medium text-sm">Solo</h4>
                      </div>
                      <div className="space-y-2 text-sm">
                        {enrichedData.soil.properties && ['phh2o', 'nitrogen', 'soc', 'clay']
                          .filter(k => enrichedData.soil!.properties![k])
                          .slice(0, 3)
                          .map(key => {
                            const val = enrichedData.soil!.properties![key]
                            const firstDepth = val?.depths ? Object.values(val.depths)[0] : null
                            return (
                              <div key={key} className="flex justify-between">
                                <span className="text-gray-500 truncate mr-2">{val?.label || key}</span>
                                <span className="text-white">{firstDepth != null ? firstDepth : '-'} {val?.unit || ''}</span>
                              </div>
                            )
                          })
                        }
                      </div>
                    </div>
                  )}
                  {enrichedData.elevation && !enrichedData.elevation.error && (
                    <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Mountain size={18} className="text-green-400" />
                        <h4 className="text-white font-medium text-sm">Elevacao</h4>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Altitude</span>
                          <span className="text-white">{formatWeatherValue(enrichedData.elevation.elevation_m)} m</span>
                        </div>
                        {enrichedData.elevation.terrain_classification && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Terreno</span>
                            <span className="text-white">{enrichedData.elevation.terrain_classification.description || enrichedData.elevation.terrain_classification.category}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {enrichedData.geocoding && !enrichedData.geocoding.error && (
                    <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Globe size={18} className="text-purple-400" />
                        <h4 className="text-white font-medium text-sm">Localizacao</h4>
                      </div>
                      <div className="space-y-2 text-sm">
                        {enrichedData.geocoding.address?.city && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Cidade</span>
                            <span className="text-white truncate ml-2">{enrichedData.geocoding.address.city}</span>
                          </div>
                        )}
                        {enrichedData.geocoding.address?.state && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Estado</span>
                            <span className="text-white">{enrichedData.geocoding.address.state}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : loadingEnriched ? (
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Loader2 size={14} className="animate-spin" />
                Carregando dados ambientais...
              </div>
            ) : null}
          </div>
        ) : project.status === 'processing' || analysisProgress ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-24 h-24 rounded-full bg-yellow-900/20 flex items-center justify-center mb-6">
              <div className="w-16 h-16 rounded-full border-4 border-yellow-500/30 border-t-yellow-500 animate-spin" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Processando imagens...</h3>
            <p className="text-gray-400 text-center max-w-md mb-4">
              O sistema esta analisando suas imagens com algoritmos de Machine Learning.
              Isso pode levar alguns minutos dependendo do tamanho dos arquivos.
            </p>

            {/* Progress bar */}
            {analysisProgress ? (
              <div className="w-80 mb-4">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Imagem {analysisProgress.analyzedImages} de {analysisProgress.totalImages}</span>
                  <span>{analysisProgress.totalImages > 0 ? Math.round((analysisProgress.analyzedImages / analysisProgress.totalImages) * 100) : 0}%</span>
                </div>
                <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-500 rounded-full transition-all duration-500"
                    style={{ width: `${analysisProgress.totalImages > 0 ? Math.max(5, (analysisProgress.analyzedImages / analysisProgress.totalImages) * 100) : 5}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="w-64 h-2 bg-gray-700 rounded-full overflow-hidden mb-4">
                <div className="h-full bg-yellow-500 rounded-full"
                  style={{
                    width: '40%',
                    animation: 'progressIndeterminate 2s ease-in-out infinite',
                  }}
                />
              </div>
            )}

            {/* Current stage */}
            <p className="text-sm text-yellow-400 font-medium mb-2">
              {analysisProgress?.stage || 'Analisando vegetacao, solo e objetos...'}
            </p>

            {/* Pipeline stages */}
            {analysisProgress && (
              <div className="w-80 mt-4 space-y-2">
                {analysisStages.map((stage, idx) => {
                  const currentIdx = analysisStages.indexOf(analysisProgress.stage)
                  const isDone = idx < currentIdx
                  const isCurrent = idx === currentIdx
                  return (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      {isDone ? (
                        <CheckCircle size={14} className="text-green-400 shrink-0" />
                      ) : isCurrent ? (
                        <Loader2 size={14} className="text-yellow-400 animate-spin shrink-0" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-gray-600 shrink-0" />
                      )}
                      <span className={isDone ? 'text-green-400' : isCurrent ? 'text-yellow-400 font-medium' : 'text-gray-600'}>
                        {stage}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Elapsed time */}
            {analysisProgress && (
              <p className="text-xs text-gray-500 mt-4">
                Tempo decorrido: {Math.round((Date.now() - analysisProgress.startedAt) / 1000)}s
              </p>
            )}

            <style jsx>{`
              @keyframes progressIndeterminate {
                0% { transform: translateX(-100%); }
                50% { transform: translateX(150%); }
                100% { transform: translateX(-100%); }
              }
            `}</style>
          </div>
        ) : project.status === 'error' ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-24 h-24 rounded-full bg-red-900/20 flex items-center justify-center mb-6">
              <AlertTriangle size={48} className="text-red-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Erro na analise</h3>
            <p className="text-gray-400 text-center max-w-md mb-6">
              Ocorreu um erro durante o processamento das imagens. Tente iniciar a analise novamente.
            </p>
            <button
              onClick={handleStartAnalysis}
              className="px-6 py-3 bg-[#6AAF3D] hover:bg-[#5a9a34] text-white rounded-lg transition-colors font-medium"
            >
              Tentar Novamente
            </button>
          </div>
        ) : activeTab === 'overview' ? (
          project.results ? (
          <>
            {/* Cards de estatisticas do projeto */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard
                title="Area Analisada"
                value={project.area}
                unit="ha"
                icon={<MapPin size={24} />}
                color="green"
              />
              <StatCard
                title="Árvores Detectadas"
                value={project.results.plantCount.toLocaleString()}
                unit="árvores"
                icon={<Trees size={24} />}
                color="green"
              />
              <StatCard
                title="Cobertura Vegetal"
                value={project.results.vegetationCoverage.toFixed(1)}
                unit="%"
                icon={<Leaf size={24} />}
                color="green"
              />
              <StatCard
                title="Indice de Saude"
                value={project.results.healthIndex.toFixed(1)}
                unit="%"
                icon={<Thermometer size={24} />}
                color={project.results.healthIndex >= 70 ? 'green' : project.results.healthIndex >= 50 ? 'yellow' : 'red'}
              />
            </div>

            {/* Segunda linha de cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard
                title="Vegetação Saudável"
                value={project.results.healthyPercentage}
                unit="%"
                icon={<Leaf size={24} />}
                color="green"
              />
              <StatCard
                title="Vegetação Estressada"
                value={project.results.stressedPercentage}
                unit="%"
                icon={<AlertTriangle size={24} />}
                color="yellow"
              />
              <StatCard
                title="Solo Exposto"
                value={project.results.criticalPercentage}
                unit="%"
                icon={<Mountain size={24} />}
                color="purple"
              />
              <StatCard
                title="Árvores/Hectare"
                value={project.area > 0 ? Math.round(project.results.plantCount / project.area) : 0}
                unit="árv/ha"
                icon={<Trees size={24} />}
                color="green"
              />
            </div>

            {/* Graficos */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <DonutChart
                data={project.results.landUse}
                title="Classificacao de Uso do Solo"
                centerValue={`${project.area}`}
                centerLabel="hectares"
              />
              <DonutChart
                data={plantHealthData}
                title="Saude das Plantas"
                centerValue={`${project.results.healthyPercentage}%`}
                centerLabel="saudaveis"
              />
              <GaugeChart
                value={project.results.healthyPercentage}
                maxValue={100}
                title="Indice de Saude"
                label="saudavel"
                color={project.results.healthyPercentage >= 70 ? '#6AAF3D' : project.results.healthyPercentage >= 50 ? '#F59E0B' : '#EF4444'}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {timelineLoading ? (
                <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-6 flex items-center justify-center min-h-[200px]">
                  <Loader2 size={24} className="animate-spin text-gray-400" />
                </div>
              ) : vegetationTimeData.length > 0 ? (
                <AreaChartComponent
                  data={vegetationTimeData}
                  title="Evolução da Vegetação"
                  dataKeys={[
                    { key: 'cobertura', name: 'Cobertura Vegetal (%)', color: '#6AAF3D' },
                    { key: 'saude', name: 'Índice de Saúde (%)', color: '#3B82F6' },
                  ]}
                  xAxisKey="periodo"
                />
              ) : (
                <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-6 flex flex-col items-center justify-center min-h-[200px] text-center">
                  <BarChart3 size={32} className="text-gray-600 mb-2" />
                  <p className="text-gray-400 text-sm">Sem dados temporais disponíveis</p>
                  <p className="text-gray-500 text-xs mt-1">Realize análises em diferentes datas para ver a evolução</p>
                </div>
              )}
              {project.results.heightDistribution.length > 0 && (
                <BarChartComponent
                  data={project.results.heightDistribution}
                  title="Distribuicao de Altura das Plantas"
                  dataKeys={[{ key: 'quantidade', name: 'Quantidade', color: '#8B5CF6' }]}
                  xAxisKey="altura"
                />
              )}
            </div>

            {/* Dados Enriquecidos */}
            {enrichedData && enrichedData.coordinates ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Clima */}
                {enrichedData.weather && !enrichedData.weather.error && (
                  <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Cloud size={18} className="text-blue-400" />
                      <h4 className="text-white font-medium text-sm">Clima</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      {enrichedData.weather.current?.weather_description && (
                        <p className="text-blue-300 font-medium mb-1">{enrichedData.weather.current.weather_description}</p>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-500">Temperatura</span>
                        <span className="text-white">{formatWeatherValue(enrichedData.weather.current?.temperature_c)}°C</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Umidade</span>
                        <span className="text-white">{formatWeatherValue(enrichedData.weather.current?.relative_humidity_pct)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Precipitacao</span>
                        <span className="text-white">{formatWeatherValue(enrichedData.weather.current?.precipitation_mm)} mm</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Vento</span>
                        <span className="text-white">{formatWeatherValue(enrichedData.weather.current?.wind_speed_kmh)} km/h</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Solo */}
                {enrichedData.soil && !enrichedData.soil.error && (
                  <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Layers size={18} className="text-amber-400" />
                      <h4 className="text-white font-medium text-sm">Solo</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      {enrichedData.soil.properties && ['phh2o', 'nitrogen', 'soc', 'clay']
                        .filter(k => enrichedData.soil!.properties![k])
                        .map(key => {
                          const val = enrichedData.soil!.properties![key]
                          const firstDepth = val?.depths ? Object.values(val.depths)[0] : null
                          return (
                            <div key={key} className="flex justify-between">
                              <span className="text-gray-500 truncate mr-2">{val?.label || key}</span>
                              <span className="text-white">{firstDepth != null ? firstDepth : '-'} {val?.unit || ''}</span>
                            </div>
                          )
                        })
                      }
                      {enrichedData.soil.interpretation && (
                        <p className="text-xs text-gray-400 mt-1">
                          {typeof enrichedData.soil.interpretation === 'object'
                            ? Object.values(enrichedData.soil.interpretation).join(' | ')
                            : String(enrichedData.soil.interpretation)}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Elevacao */}
                {enrichedData.elevation && !enrichedData.elevation.error && (
                  <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Mountain size={18} className="text-green-400" />
                      <h4 className="text-white font-medium text-sm">Elevacao</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Altitude</span>
                        <span className="text-white">{formatWeatherValue(enrichedData.elevation.elevation_m)} m</span>
                      </div>
                      {enrichedData.elevation.terrain_classification && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Terreno</span>
                          <span className="text-white">{enrichedData.elevation.terrain_classification.description || enrichedData.elevation.terrain_classification.category}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Localizacao */}
                {enrichedData.geocoding && !enrichedData.geocoding.error && (
                  <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Globe size={18} className="text-purple-400" />
                      <h4 className="text-white font-medium text-sm">Localizacao</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      {enrichedData.geocoding.address?.city && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Cidade</span>
                          <span className="text-white truncate ml-2">{enrichedData.geocoding.address.city}</span>
                        </div>
                      )}
                      {enrichedData.geocoding.address?.state && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Estado</span>
                          <span className="text-white">{enrichedData.geocoding.address.state}</span>
                        </div>
                      )}
                      {enrichedData.geocoding.address?.country && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Pais</span>
                          <span className="text-white">{enrichedData.geocoding.address.country}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : loadingEnriched ? (
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-6">
                <Loader2 size={14} className="animate-spin" />
                Carregando dados ambientais...
              </div>
            ) : null}

            {/* Alertas e Recomendacoes */}
            <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-6">
              <h3 className="text-white font-semibold mb-4">Alertas e Recomendacoes</h3>
              <div className="space-y-3">
                {project.results.criticalPercentage > 5 && (
                  <div className="flex items-start gap-3 p-4 bg-red-900/20 border border-red-700/30 rounded-lg">
                    <AlertTriangle className="text-red-400 mt-0.5" size={20} />
                    <div>
                      <p className="text-red-400 font-medium">Atencao: Plantas em estado critico</p>
                      <p className="text-gray-400 text-sm mt-1">
                        {project.results.criticalPercentage}% das plantas estao em estado critico. Recomenda-se verificacao imediata da area afetada.
                      </p>
                    </div>
                  </div>
                )}
                {project.results.stressedPercentage > 15 && (
                  <div className="flex items-start gap-3 p-4 bg-yellow-900/20 border border-yellow-700/30 rounded-lg">
                    <AlertTriangle className="text-yellow-400 mt-0.5" size={20} />
                    <div>
                      <p className="text-yellow-400 font-medium">Aviso: Plantas estressadas</p>
                      <p className="text-gray-400 text-sm mt-1">
                        {project.results.stressedPercentage}% das plantas apresentam sinais de estresse. Verifique irrigacao e nutrientes.
                      </p>
                    </div>
                  </div>
                )}
                {project.results.healthyPercentage >= 70 && (
                  <div className="flex items-start gap-3 p-4 bg-green-900/20 border border-green-700/30 rounded-lg">
                    <CheckCircle className="text-green-400 mt-0.5" size={20} />
                    <div>
                      <p className="text-green-400 font-medium">Bom estado geral</p>
                      <p className="text-gray-400 text-sm mt-1">
                        A maioria das plantas ({project.results.healthyPercentage}%) esta saudavel. Continue com o manejo atual.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
          ) : analyses.length > 0 ? (
            /* Projeto concluido sem dados de resumo (ex: video-only) - mostrar dados disponíveis das análises */
            <div className="space-y-6">
              {/* Resumo das analises disponíveis */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {fullAnalysis?.results?.vegetation_coverage && (
                  <StatCard
                    title="Cobertura Vegetal"
                    value={Number((fullAnalysis.results.vegetation_coverage as any)?.vegetation_percentage || 0).toFixed(1)}
                    unit="%"
                    icon={<Leaf size={24} />}
                    color="green"
                  />
                )}
                {fullAnalysis?.results?.vegetation_health && (
                  <StatCard
                    title="Indice de Saude"
                    value={Number((fullAnalysis.results.vegetation_health as any)?.health_index || 0).toFixed(1)}
                    unit="%"
                    icon={<Thermometer size={24} />}
                    color={(fullAnalysis.results.vegetation_health as any)?.health_index >= 70 ? 'green' : 'yellow'}
                  />
                )}
                {videoAnalysis?.results?.video_info && (
                  <StatCard
                    title="Duracao do Video"
                    value={Number((videoAnalysis.results.video_info as any)?.duration_seconds || 0).toFixed(1)}
                    unit="s"
                    icon={<Video size={24} />}
                    color="blue"
                  />
                )}
                {videoAnalysis?.results?.temporal_summary && (
                  <StatCard
                    title="Frames Analisados"
                    value={(videoAnalysis.results.temporal_summary as any)?.total_frames_analyzed || 0}
                    icon={<Image size={24} />}
                    color="purple"
                  />
                )}
                {(videoAnalysis?.results?.temporal_summary as any)?.vegetation && (
                  <StatCard
                    title="Vegetacao Media (Video)"
                    value={Number(((videoAnalysis?.results?.temporal_summary as any)?.vegetation as any)?.mean_percentage || 0).toFixed(1)}
                    unit="%"
                    icon={<Trees size={24} />}
                    color="green"
                  />
                )}
              </div>

              {/* Dados Enriquecidos */}
              {enrichedData && enrichedData.coordinates ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {enrichedData.weather && !enrichedData.weather.error && (
                    <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Cloud size={18} className="text-blue-400" />
                        <h4 className="text-white font-medium text-sm">Clima</h4>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Temperatura</span>
                          <span className="text-white">{formatWeatherValue(enrichedData.weather.current?.temperature_c)}C</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Umidade</span>
                          <span className="text-white">{formatWeatherValue(enrichedData.weather.current?.relative_humidity_pct)}%</span>
                        </div>
                      </div>
                    </div>
                  )}
                  {enrichedData.geocoding && !enrichedData.geocoding.error && (
                    <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Globe size={18} className="text-purple-400" />
                        <h4 className="text-white font-medium text-sm">Localizacao</h4>
                      </div>
                      <p className="text-white text-sm">{enrichedData.geocoding.display_name}</p>
                    </div>
                  )}
                  {enrichedData.elevation && !enrichedData.elevation.error && (
                    <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Mountain size={18} className="text-green-400" />
                        <h4 className="text-white font-medium text-sm">Elevacao</h4>
                      </div>
                      <p className="text-white text-2xl font-bold">{formatWeatherValue(enrichedData.elevation.elevation_m)} m</p>
                    </div>
                  )}
                </div>
              ) : null}

              <div className="text-center mt-4">
                <button
                  onClick={() => setActiveTab('analysis')}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
                >
                  Ver detalhes da Analise ML
                </button>
              </div>
            </div>
          ) : (
            /* Sem resultados nenhum */
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-24 h-24 rounded-full bg-blue-900/20 flex items-center justify-center mb-6">
                <BarChart3 size={48} className="text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Sem dados de analise</h3>
              <p className="text-gray-400 text-center max-w-md mb-6">
                Este projeto ainda nao possui resultados de analise. Inicie uma analise para ver os resultados.
              </p>
              <button
                onClick={handleStartAnalysis}
                className="px-4 py-2 bg-[#6AAF3D] hover:bg-[#5a9a34] text-white rounded-lg transition-colors font-medium"
              >
                Iniciar Analise
              </button>
            </div>
          )
        ) : activeTab === 'analysis' ? (
          /* Aba de Analise ML */
          <div className="space-y-6">
            {/* Botoes de acao */}
            <div className="flex flex-wrap gap-3 pb-4 border-b border-gray-700/50">
              <button
                onClick={handleReanalyze}
                disabled={isReanalyzing}
                className="flex items-center gap-2 px-4 py-2 bg-[#6AAF3D] hover:bg-[#5a9a34] disabled:bg-gray-600 text-white rounded-lg transition-colors"
              >
                {isReanalyzing ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Cpu size={18} />
                )}
                {isReanalyzing ? 'Re-analisando...' : 'Re-analisar Projeto'}
              </button>
              <button
                onClick={handleExportJson}
                disabled={isExportingJson || analyses.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
              >
                {isExportingJson ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Download size={18} />
                )}
                Exportar JSON
              </button>
              <button
                onClick={handleExportPdf}
                disabled={isExportingPdf || analyses.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 text-white rounded-lg transition-colors"
              >
                {isExportingPdf ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <FileText size={18} />
                )}
                Exportar PDF
              </button>
            </div>

            {loadingAnalyses ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={32} className="animate-spin text-[#6AAF3D]" />
                <span className="ml-3 text-gray-400">Carregando resultados de analise...</span>
              </div>
            ) : analyses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Cpu size={48} className="text-gray-600 mb-4" />
                <h3 className="text-lg text-white mb-2">Sem análises ML disponíveis</h3>
                <p className="text-gray-500 text-sm mb-4">Inicie uma análise para ver resultados de Machine Learning.</p>
                <button
                  onClick={handleStartAnalysis}
                  disabled={isReanalyzing}
                  className="px-4 py-2 bg-[#6AAF3D] hover:bg-[#5a9a34] disabled:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  {isReanalyzing ? 'Iniciando...' : 'Iniciar Análise'}
                </button>
              </div>
            ) : (
              <>
                {/* Resumo e Histórico de Análises */}
                <div id="section-summary" className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-6 mb-6">
                  <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <BarChart3 size={18} className="text-blue-400" />
                    Resumo das Análises
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="p-3 bg-gray-800/30 rounded-lg">
                      <p className="text-xs text-gray-500">Total de Análises</p>
                      <p className="text-lg font-bold text-white">{analyses.length}</p>
                    </div>
                    <div className="p-3 bg-gray-800/30 rounded-lg">
                      <p className="text-xs text-gray-500">Última Análise</p>
                      <p className="text-sm font-bold text-white">
                        {analyses[0]?.created_at ? new Date(analyses[0].created_at).toLocaleDateString('pt-BR') : 'N/A'}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-800/30 rounded-lg">
                      <p className="text-xs text-gray-500">Tempo de Processamento</p>
                      <p className="text-lg font-bold text-[#6AAF3D]">
                        {fullAnalysis?.processing_time_seconds ? `${fullAnalysis.processing_time_seconds.toFixed(1)}s` : 'N/A'}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-800/30 rounded-lg">
                      <p className="text-xs text-gray-500">Status</p>
                      <p className="text-lg font-bold text-green-400 flex items-center gap-1">
                        <CheckCircle size={16} /> Concluída
                      </p>
                    </div>
                  </div>

                  {/* Histórico de análises */}
                  {analyses.length > 1 && (
                    <div className="mt-4 pt-4 border-t border-gray-700/50">
                      <p className="text-sm text-gray-400 mb-2">Histórico de Análises:</p>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {analyses.map((a, idx) => (
                          <div key={a.id} className="flex items-center justify-between text-sm p-2 bg-gray-800/20 rounded">
                            <span className="text-gray-300">
                              {a.analysis_type === 'full_report' ? 'Análise Completa' :
                               a.analysis_type === 'video_analysis' ? 'Análise de Vídeo' :
                               a.analysis_type === 'enriched_data' ? 'Dados Enriquecidos' : a.analysis_type}
                            </span>
                            <span className="text-gray-500">
                              {a.created_at ? new Date(a.created_at).toLocaleString('pt-BR') : 'N/A'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Segmentacao */}
                {segmentation && (
                  <div id="section-segmentation" className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-6">
                    <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                      <Layers size={18} className="text-purple-400" />
                      Segmentacao (DeepLabV3)
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {(segmentation as any)?.category_percentages && Object.entries((segmentation as any).category_percentages).map(([category, pct]: [string, any]) => (
                        <div key={category} className="p-3 bg-gray-800/30 rounded-lg">
                          <p className="text-xs text-gray-500 truncate">{category}</p>
                          <p className="text-lg font-bold text-white">{typeof pct === 'number' ? pct.toFixed(1) : pct}%</p>
                        </div>
                      ))}
                      {(segmentation as any)?.num_classes_detected && (
                        <div className="p-3 bg-gray-800/30 rounded-lg">
                          <p className="text-xs text-gray-500">Classes Detectadas</p>
                          <p className="text-lg font-bold text-[#6AAF3D]">{(segmentation as any).num_classes_detected}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Classificacao de Cena */}
                {sceneClassification && (
                  <div id="section-scene-classification" className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-6">
                    <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                      <Eye size={18} className="text-blue-400" />
                      Classificacao de Cena (ResNet18)
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {(sceneClassification as any)?.land_use_percentages && Object.entries((sceneClassification as any).land_use_percentages)
                        .sort(([, a]: any, [, b]: any) => b - a)
                        .slice(0, 6)
                        .map(([cls, pct]: [string, any]) => (
                        <div key={cls} className="p-3 bg-gray-800/30 rounded-lg">
                          <p className="text-xs text-gray-500 truncate">{cls.replace(/_/g, ' ')}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
                              <div className="h-full bg-blue-400 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                            </div>
                            <span className="text-sm font-bold text-white">{typeof pct === 'number' ? pct.toFixed(1) : pct}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tipo de Vegetacao */}
                {vegetationType && (
                  <div id="section-vegetation-type" className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-6">
                    <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                      <Trees size={18} className="text-green-400" />
                      Classificacao de Vegetacao
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {(vegetationType as any)?.vegetation_type && (
                        <div className="p-3 bg-gray-800/30 rounded-lg">
                          <p className="text-xs text-gray-500">Tipo</p>
                          <p className="text-lg font-bold text-[#6AAF3D]">{(vegetationType as any).vegetation_type}</p>
                        </div>
                      )}
                      {(vegetationType as any)?.vegetation_density && (
                        <div className="p-3 bg-gray-800/30 rounded-lg">
                          <p className="text-xs text-gray-500">Densidade</p>
                          <p className="text-lg font-bold text-white">{(vegetationType as any).vegetation_density}</p>
                        </div>
                      )}
                      {(vegetationType as any)?.confidence !== undefined && (
                        <div className="p-3 bg-gray-800/30 rounded-lg">
                          <p className="text-xs text-gray-500">Confianca</p>
                          <p className="text-lg font-bold text-white">{((vegetationType as any).confidence * 100).toFixed(1)}%</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Deteccao de Arvores */}
                {objectDetection && (
                  <div id="section-object-detection" className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-6">
                    <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                      <Trees size={18} className="text-green-400" />
                      Detecção de Árvores
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="p-3 bg-gray-800/30 rounded-lg">
                        <p className="text-xs text-gray-500">Total de Árvores</p>
                        <p className="text-lg font-bold text-white">{(objectDetection as any)?.total_detections ?? 0}</p>
                      </div>
                      <div className="p-3 bg-gray-800/30 rounded-lg">
                        <p className="text-xs text-gray-500">Confianca Media</p>
                        <p className="text-lg font-bold text-white">{(((objectDetection as any)?.avg_confidence ?? 0) * 100).toFixed(1)}%</p>
                      </div>
                    </div>
                    {(objectDetection as any)?.by_class && Object.keys((objectDetection as any).by_class).length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm text-gray-400 mb-2">Deteccoes por Classe:</p>
                        {Object.entries((objectDetection as any).by_class).map(([cls, count]: [string, any]) => (
                          <div key={cls} className="flex items-center gap-2">
                            <span className="text-xs text-gray-400 w-28 truncate">{cls}</span>
                            <div className="flex-1 bg-gray-700 rounded-full h-3 overflow-hidden">
                              <div
                                className="h-full bg-cyan-400 rounded-full"
                                style={{ width: `${Math.min((count / ((objectDetection as any)?.total_detections || 1)) * 100, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-white w-8 text-right">{count}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Features Visuais */}
                {visualFeatures && (
                  <div id="section-visual-features" className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-6">
                    <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                      <BarChart3 size={18} className="text-yellow-400" />
                      Caracteristicas Visuais
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(visualFeatures as any)?.texture && (
                        <div className="p-4 bg-gray-800/30 rounded-lg">
                          <p className="text-sm text-gray-400 mb-2">Textura</p>
                          <div className="space-y-1 text-xs">
                            {Object.entries((visualFeatures as any).texture).slice(0, 5).map(([key, val]: [string, any]) => (
                              <div key={key} className="flex justify-between">
                                <span className="text-gray-500">{key.replace(/_/g, ' ')}</span>
                                <span className="text-white">{typeof val === 'number' ? val.toFixed(3) : String(val)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {(visualFeatures as any)?.colors && (
                        <div className="p-4 bg-gray-800/30 rounded-lg">
                          <p className="text-sm text-gray-400 mb-2">Cores</p>
                          <div className="space-y-1 text-xs">
                            {Object.entries((visualFeatures as any).colors).slice(0, 5).map(([key, val]: [string, any]) => (
                              <div key={key} className="flex justify-between">
                                <span className="text-gray-500">{key.replace(/_/g, ' ')}</span>
                                <span className="text-white">{typeof val === 'number' ? val.toFixed(3) : String(val)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Analise de Video */}
                {videoAnalysis && (
                  <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-6">
                    <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                      <Video size={18} className="text-red-400" />
                      Analise de Video
                    </h3>
                    {videoInfo && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="p-3 bg-gray-800/30 rounded-lg">
                          <p className="text-xs text-gray-500">Resolucao</p>
                          <p className="text-lg font-bold text-white">
                            {(videoInfo as any)?.width}x{(videoInfo as any)?.height}
                          </p>
                        </div>
                        <div className="p-3 bg-gray-800/30 rounded-lg">
                          <p className="text-xs text-gray-500">FPS</p>
                          <p className="text-lg font-bold text-white">{(videoInfo as any)?.fps}</p>
                        </div>
                        <div className="p-3 bg-gray-800/30 rounded-lg">
                          <p className="text-xs text-gray-500">Duracao</p>
                          <p className="text-lg font-bold text-white">{((videoInfo as any)?.duration_seconds ?? 0).toFixed(1)}s</p>
                        </div>
                        <div className="p-3 bg-gray-800/30 rounded-lg">
                          <p className="text-xs text-gray-500">Frames Totais</p>
                          <p className="text-lg font-bold text-white">{(videoInfo as any)?.frame_count}</p>
                        </div>
                      </div>
                    )}
                    {temporalSummary && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="p-3 bg-gray-800/30 rounded-lg">
                          <p className="text-xs text-gray-500">Frames Analisados</p>
                          <p className="text-lg font-bold text-white">{(temporalSummary as any)?.total_frames_analyzed ?? 0}</p>
                        </div>
                        {(temporalSummary as any)?.vegetation && (
                          <>
                            <div className="p-3 bg-gray-800/30 rounded-lg">
                              <p className="text-xs text-gray-500">Vegetacao Media</p>
                              <p className="text-lg font-bold text-[#6AAF3D]">
                                {((temporalSummary as any).vegetation.mean_percentage ?? 0).toFixed(1)}%
                              </p>
                            </div>
                            <div className="p-3 bg-gray-800/30 rounded-lg">
                              <p className="text-xs text-gray-500">Tendencia</p>
                              <p className="text-lg font-bold text-white capitalize">
                                {(temporalSummary as any).vegetation.trend === 'increasing' ? 'Crescente'
                                  : (temporalSummary as any).vegetation.trend === 'decreasing' ? 'Decrescente'
                                  : 'Estavel'}
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Erros ML (se houver) */}
                {analysisResults.ml_errors && (analysisResults.ml_errors as string[]).length > 0 && (
                  <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-xl p-4">
                    <h4 className="text-yellow-400 font-medium mb-2 flex items-center gap-2">
                      <AlertTriangle size={16} />
                      Avisos de Processamento ML
                    </h4>
                    <ul className="text-sm text-gray-400 space-y-1">
                      {(analysisResults.ml_errors as string[]).map((err, i) => (
                        <li key={i}>- {err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        ) : activeTab === 'map' ? (
          <div className="h-[calc(100vh-250px)]">
            <MapView projectId={Number(project.id)} />
          </div>
        ) : activeTab === 'report' ? (
          <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-semibold">Relatorio Completo</h3>
              <button
                onClick={handleExportPdf}
                disabled={isExportingPdf || analyses.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-[#6AAF3D] hover:bg-[#5a9a34] disabled:bg-gray-600 text-white rounded-lg transition-colors"
              >
                {isExportingPdf ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Download size={18} />
                )}
                Baixar PDF
              </button>
            </div>

            <div className="prose prose-invert max-w-none">
              <div className="bg-gray-800/50 rounded-lg p-6 mb-6">
                <h4 className="text-lg font-semibold text-white mb-4">Resumo Executivo</h4>
                <p className="text-gray-400">
                  Analise realizada em {project.createdAt} para a area de {project.area} hectares.
                  {project.results && (
                    <> Foram identificadas {project.results.plantCount.toLocaleString()} árvores, com {project.results.healthyPercentage}% em estado saudável.
                    A cobertura vegetal de {project.results.vegetationCoverage.toFixed(1)}% indica vegetação em bom estado.</>
                  )}
                  {analyses.length > 0 && <> Foram realizadas {analyses.length} analise(s) no projeto.</>}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-800/50 rounded-lg p-6">
                  <h5 className="text-white font-medium mb-3">Informacoes Gerais</h5>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Nome do Projeto</dt>
                      <dd className="text-white">{project.name}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Data da Analise</dt>
                      <dd className="text-white">{project.createdAt}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Fonte das Imagens</dt>
                      <dd className="text-white">{project.sourceType === 'drone' ? 'Drone' : 'Satelite'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Area Total</dt>
                      <dd className="text-white">{project.area} hectares</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Total de Imagens</dt>
                      <dd className="text-white">{project.imageCount}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Analises Realizadas</dt>
                      <dd className="text-white">{analyses.length}</dd>
                    </div>
                  </dl>
                </div>

                <div className="bg-gray-800/50 rounded-lg p-6">
                  <h5 className="text-white font-medium mb-3">Índices de Vegetação</h5>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Cobertura Vegetal</dt>
                      <dd className="text-white">{project.results?.vegetationCoverage.toFixed(1) ?? 'N/A'}%</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Índice de Saúde</dt>
                      <dd className="text-white">{project.results?.healthIndex.toFixed(1) ?? 'N/A'}%</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Total de Árvores</dt>
                      <dd className="text-white">{project.results?.plantCount.toLocaleString() ?? 'N/A'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Densidade</dt>
                      <dd className="text-white">{project.results && project.area > 0 ? Math.round(project.results.plantCount / project.area) : 0} árvores/ha</dd>
                    </div>
                  </dl>
                </div>
              </div>

              {/* ML Results Summary in Report */}
              {(segmentation || sceneClassification || objectDetection || vegetationType) && (
                <div className="bg-gray-800/50 rounded-lg p-6 mb-6">
                  <h5 className="text-white font-medium mb-3">Resultados de Machine Learning</h5>
                  <dl className="space-y-2 text-sm">
                    {segmentation && (segmentation as any)?.num_classes_detected && (
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Segmentacao - Classes Detectadas</dt>
                        <dd className="text-white">{(segmentation as any).num_classes_detected}</dd>
                      </div>
                    )}
                    {vegetationType && (vegetationType as any)?.vegetation_type && (
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Tipo de Vegetacao</dt>
                        <dd className="text-white">{(vegetationType as any).vegetation_type}</dd>
                      </div>
                    )}
                    {objectDetection && (objectDetection as any)?.total_detections !== undefined && (
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Árvores Detectadas</dt>
                        <dd className="text-white">{(objectDetection as any).total_detections}</dd>
                      </div>
                    )}
                    {sceneClassification && (sceneClassification as any)?.land_use_percentages && (
                      <>
                        <dt className="text-gray-500 mt-2">Classificacao de Uso do Solo:</dt>
                        {Object.entries((sceneClassification as any).land_use_percentages)
                          .sort(([, a]: any, [, b]: any) => b - a)
                          .slice(0, 5)
                          .map(([cls, pct]: [string, any]) => (
                          <div key={cls} className="flex justify-between pl-4">
                            <dt className="text-gray-500">{cls.replace(/_/g, ' ')}</dt>
                            <dd className="text-white">{typeof pct === 'number' ? pct.toFixed(1) : pct}%</dd>
                          </div>
                        ))}
                      </>
                    )}
                  </dl>
                </div>
              )}

              {/* Enriched Data in Report */}
              {enrichedData && (
                <div className="bg-gray-800/50 rounded-lg p-6 mb-6">
                  <h5 className="text-white font-medium mb-3">Dados Ambientais</h5>
                  <dl className="space-y-2 text-sm">
                    {enrichedData.geocoding && !enrichedData.geocoding.error && (
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Localizacao</dt>
                        <dd className="text-white">{enrichedData.geocoding.display_name || `${enrichedData.geocoding.address?.city}, ${enrichedData.geocoding.address?.state}`}</dd>
                      </div>
                    )}
                    {enrichedData.elevation && !enrichedData.elevation.error && (
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Altitude</dt>
                        <dd className="text-white">{formatWeatherValue(enrichedData.elevation.elevation_m)} m</dd>
                      </div>
                    )}
                    {enrichedData.weather && !enrichedData.weather.error && (
                      <>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Temperatura Atual</dt>
                          <dd className="text-white">{formatWeatherValue(enrichedData.weather.current?.temperature_c)}C</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Umidade</dt>
                          <dd className="text-white">{formatWeatherValue(enrichedData.weather.current?.relative_humidity_pct)}%</dd>
                        </div>
                      </>
                    )}
                    {enrichedData.soil && !enrichedData.soil.error && enrichedData.soil.interpretation && (
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Classificacao do Solo</dt>
                        <dd className="text-white">
                          {typeof enrichedData.soil.interpretation === 'object'
                            ? Object.values(enrichedData.soil.interpretation).join(' | ')
                            : String(enrichedData.soil.interpretation)}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
