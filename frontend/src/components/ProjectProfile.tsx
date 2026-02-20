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
  Pencil,
  ChevronDown,
  Bug,
  TreePine,
  Palette,
  Info,
  ShieldAlert,
  Heart,
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
  getProjectAlerts,
  downloadAnalysisPDF,
  analyzeProject,
  deleteProject,
  type Analysis,
  type EnrichedData,
  type WeatherData,
  type SoilData,
  type ElevationData,
  type GeocodingData,
  type TimelineEntry,
  type AlertItem,
} from '@/lib/api'
import { useToast } from './Toast'
import { useConfirmDialog } from './ConfirmDialog'
import ImageAnalysisPanel from './ImageAnalysisPanel'
import ProjectEditModal from './ProjectEditModal'

interface ProjectData {
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
  allProjects?: { id: string; name: string }[]
  onProjectChange?: (projectId: string) => void
}

// Mapa de submenu ID → section element ID
const sectionMap: Record<string, string> = {
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

export default function ProjectProfile({ project, onBack, onRefresh, initialTab, analysisSection, allProjects, onProjectChange }: ProjectProfileProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'map' | 'analysis' | 'report'>(initialTab || 'overview')
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [enrichedData, setEnrichedData] = useState<EnrichedData | null>(null)
  const [timelineData, setTimelineData] = useState<TimelineEntry[]>([])
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [loadingAnalyses, setLoadingAnalyses] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const toast = useToast()
  const { confirm } = useConfirmDialog()
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showProjectSwitcher, setShowProjectSwitcher] = useState(false)

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

  // Buscar análises e alertas do projeto ao montar
  useEffect(() => {
    if (project.status === 'completed' || project.status === 'processing') {
      fetchAnalyses()
    }
    if (project.status === 'completed') {
      getProjectAlerts(Number(project.id)).then(res => setAlerts(res.alerts)).catch(() => {})
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

  const handleStartAnalysis = () => {
    // Redirecionar para aba mapa para delimitar perímetro antes de analisar
    setActiveTab('map')
    toast.info('Delimite o perimetro', 'Desenhe a area de interesse e clique em "Analisar Projeto Completo"')
  }

  const handleRunAnalysis = async () => {
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
    } catch {
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
  // Pragas/doenças
  const pestDisease = analysisResults.pest_disease as Record<string, unknown> | undefined
  // Biomassa
  const biomassData = analysisResults.biomass as Record<string, unknown> | undefined
  // Cobertura vegetal (contém ExG/NDVI proxy)
  const vegetationCoverage = analysisResults.vegetation_coverage as Record<string, unknown> | undefined
  // Saúde da vegetação
  const vegetationHealth = analysisResults.vegetation_health as Record<string, unknown> | undefined
  // Análise de cores
  const colorAnalysis = analysisResults.color_analysis as Record<string, unknown> | undefined
  // Contagem de árvores
  const treeCount = analysisResults.tree_count as Record<string, unknown> | undefined
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
                {/* Project name with optional switcher dropdown */}
                <div className="relative">
                  <button
                    onClick={() => allProjects && allProjects.length > 1 ? setShowProjectSwitcher(!showProjectSwitcher) : undefined}
                    className={`flex items-center gap-1 text-2xl font-bold text-white ${allProjects && allProjects.length > 1 ? 'hover:text-[#6AAF3D] cursor-pointer' : ''}`}
                  >
                    {project.name}
                    {allProjects && allProjects.length > 1 && <ChevronDown size={20} className="text-gray-400" />}
                  </button>
                  {showProjectSwitcher && allProjects && (
                    <div className="absolute top-full left-0 mt-1 w-64 bg-[#1a1a2e] border border-gray-700 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
                      {allProjects.filter(p => p.id !== project.id).map(p => (
                        <button
                          key={p.id}
                          onClick={() => {
                            setShowProjectSwitcher(false)
                            onProjectChange?.(p.id)
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700/50 hover:text-white transition-colors truncate"
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="p-1.5 hover:bg-gray-700/50 text-gray-400 hover:text-white rounded-lg transition-colors"
                  title="Editar projeto"
                >
                  <Pencil size={16} />
                </button>
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
            <button
              onClick={() => {
                confirm({
                  title: 'Excluir Projeto',
                  message: `Tem certeza que deseja excluir o projeto "${project.name}"? Todas as imagens e analises serao perdidas.`,
                  confirmText: 'Excluir',
                  type: 'danger',
                  onConfirm: async () => {
                    setIsDeleting(true)
                    try {
                      await deleteProject(Number(project.id))
                      toast.success('Projeto excluido', 'O projeto foi removido com sucesso')
                      onRefresh?.()
                      onBack()
                    } catch (err: any) {
                      toast.error('Erro ao excluir', err?.detail || 'Falha ao excluir o projeto')
                    } finally {
                      setIsDeleting(false)
                    }
                  },
                })
              }}
              disabled={isDeleting}
              className="p-2 hover:bg-red-900/30 text-gray-400 hover:text-red-400 rounded-lg transition-colors disabled:opacity-50"
            >
              {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
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
              Delimite o perimetro de interesse no mapa e depois inicie a analise.
            </p>
            <button
              onClick={handleStartAnalysis}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium text-lg mb-8 flex items-center gap-2"
            >
              <MapPin size={20} />
              Delimitar Perimetro e Analisar
            </button>

            {/* Dados ambientais mesmo em projetos pendentes */}
            {enrichedData && (enrichedData.weather || enrichedData.soil || enrichedData.elevation || enrichedData.geocoding) ? (
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
              onClick={handleRunAnalysis}
              disabled={isReanalyzing}
              className="px-6 py-3 bg-[#6AAF3D] hover:bg-[#5a9a34] disabled:bg-gray-600 text-white rounded-lg transition-colors font-medium"
            >
              {isReanalyzing ? 'Iniciando...' : 'Tentar Novamente'}
            </button>
          </div>
        ) : activeTab === 'overview' ? (
          project.results ? (
          <>
            {/* Banner de alertas */}
            {alerts.length > 0 && (
              <div className="mb-6 space-y-2">
                {alerts.map((alert, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      alert.severity === 'critical'
                        ? 'bg-red-900/20 border-red-500/40 text-red-400'
                        : 'bg-yellow-900/20 border-yellow-500/40 text-yellow-400'
                    }`}
                  >
                    <AlertTriangle size={18} />
                    <span className="text-sm">{alert.message}</span>
                  </div>
                ))}
              </div>
            )}
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

            {/* Terceira linha: Biomassa e Pragas */}
            {(project.results.biomassIndexAvg != null || project.results.pestInfectionRateAvg != null) && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {project.results.biomassIndexAvg != null && (
                  <StatCard
                    title="Biomassa Media"
                    value={project.results.biomassIndexAvg.toFixed(1)}
                    unit="/100"
                    icon={<TreePine size={24} />}
                    color="green"
                  />
                )}
                {project.results.biomassDensityClass && (
                  <StatCard
                    title="Classe de Densidade"
                    value={project.results.biomassDensityClass.replace('_', ' ')}
                    icon={<Layers size={24} />}
                    color="yellow"
                  />
                )}
                {project.results.pestInfectionRateAvg != null && (
                  <StatCard
                    title="Taxa de Pragas"
                    value={project.results.pestInfectionRateAvg.toFixed(1)}
                    unit="%"
                    icon={<Bug size={24} />}
                    color={project.results.pestInfectionRateAvg > 20 ? 'red' : project.results.pestInfectionRateAvg > 10 ? 'yellow' : 'green'}
                  />
                )}
                <StatCard
                  title="Analises Realizadas"
                  value={analyses.length}
                  icon={<Cpu size={24} />}
                  color="purple"
                />
              </div>
            )}

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
            {enrichedData && (enrichedData.weather || enrichedData.soil || enrichedData.elevation || enrichedData.geocoding) ? (
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
              {enrichedData && (enrichedData.weather || enrichedData.soil || enrichedData.elevation || enrichedData.geocoding) ? (
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
              <p className="text-gray-400 text-center max-w-md mb-4">
                Delimite o perimetro de interesse no mapa e depois inicie a analise.
              </p>
              <button
                onClick={handleStartAnalysis}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
              >
                <MapPin size={16} />
                Delimitar Perimetro e Analisar
              </button>
            </div>
          )
        ) : activeTab === 'analysis' ? (
          /* Aba de Analise ML */
          <div className="space-y-6">
            {/* Analise por Imagem - Novo painel */}
            <ImageAnalysisPanel
              projectId={Number(project.id)}
              onAnalysisComplete={() => {
                fetchAnalyses()
                onRefresh?.()
              }}
            />

            {/* Separador */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-gray-700/50" />
              <span className="text-gray-500 text-xs uppercase tracking-wider">Resultados Agregados do Projeto</span>
              <div className="flex-1 h-px bg-gray-700/50" />
            </div>

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
                <p className="text-gray-500 text-sm mb-4">Delimite o perimetro no mapa e inicie a analise.</p>
                <button
                  onClick={handleStartAnalysis}
                  disabled={isReanalyzing}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <MapPin size={16} />
                  {isReanalyzing ? 'Iniciando...' : 'Delimitar e Analisar'}
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

                {/* Estimativa de Biomassa */}
                {biomassData && (
                  <div id="section-biomass" className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-6">
                    <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                      <TreePine size={18} className="text-emerald-400" />
                      Estimativa de Biomassa
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="p-3 bg-gray-800/30 rounded-lg">
                        <p className="text-xs text-gray-500">Indice de Biomassa</p>
                        <p className="text-2xl font-bold text-emerald-400">{Number((biomassData as any)?.biomass_index ?? 0).toFixed(1)}</p>
                        <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(Number((biomassData as any)?.biomass_index ?? 0), 100)}%`,
                              backgroundColor: Number((biomassData as any)?.biomass_index ?? 0) >= 75 ? '#059669' :
                                Number((biomassData as any)?.biomass_index ?? 0) >= 50 ? '#6AAF3D' :
                                Number((biomassData as any)?.biomass_index ?? 0) >= 25 ? '#F59E0B' : '#EF4444'
                            }}
                          />
                        </div>
                      </div>
                      <div className="p-3 bg-gray-800/30 rounded-lg">
                        <p className="text-xs text-gray-500">Classe de Densidade</p>
                        <p className={`text-lg font-bold ${
                          (biomassData as any)?.density_class === 'muito_densa' ? 'text-emerald-400' :
                          (biomassData as any)?.density_class === 'densa' ? 'text-green-400' :
                          (biomassData as any)?.density_class === 'moderada' ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {((biomassData as any)?.density_class ?? '').replace('_', ' ')}
                        </p>
                      </div>
                      <div className="p-3 bg-gray-800/30 rounded-lg">
                        <p className="text-xs text-gray-500">Biomassa Estimada</p>
                        <p className="text-lg font-bold text-white">
                          {Number((biomassData as any)?.estimated_biomass_kg_ha ?? 0) >= 1000
                            ? `${(Number((biomassData as any)?.estimated_biomass_kg_ha ?? 0) / 1000).toFixed(1)} t/ha`
                            : `${Number((biomassData as any)?.estimated_biomass_kg_ha ?? 0)} kg/ha`}
                        </p>
                      </div>
                      <div className="p-3 bg-gray-800/30 rounded-lg">
                        <p className="text-xs text-gray-500">Copas Detectadas</p>
                        <p className="text-lg font-bold text-white">{(biomassData as any)?.canopy_count ?? 0}</p>
                      </div>
                    </div>
                    {/* Metricas de vigor */}
                    {(biomassData as any)?.vigor_metrics && (
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="p-3 bg-gray-800/30 rounded-lg">
                          <p className="text-xs text-gray-500">Intensidade Verde</p>
                          <p className="text-sm font-bold text-white">{Number((biomassData as any).vigor_metrics.mean_green_intensity ?? 0).toFixed(1)}</p>
                        </div>
                        <div className="p-3 bg-gray-800/30 rounded-lg">
                          <p className="text-xs text-gray-500">ExG Medio</p>
                          <p className="text-sm font-bold text-white">{Number((biomassData as any).vigor_metrics.mean_exg ?? 0).toFixed(4)}</p>
                        </div>
                        <div className="p-3 bg-gray-800/30 rounded-lg">
                          <p className="text-xs text-gray-500">Variancia de Textura</p>
                          <p className="text-sm font-bold text-white">{Number((biomassData as any).vigor_metrics.texture_variance ?? 0).toFixed(1)}</p>
                        </div>
                      </div>
                    )}
                    {/* Recomendacoes */}
                    {(biomassData as any)?.recommendations && (biomassData as any).recommendations.length > 0 && (
                      <div className="space-y-2">
                        {(biomassData as any).recommendations.map((rec: string, idx: number) => (
                          <div key={idx} className="flex items-start gap-2 p-2 bg-gray-800/20 rounded text-sm">
                            <TreePine size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                            <span className="text-gray-300">{rec}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Deteccao de Pragas/Doencas */}
                {pestDisease && (
                  <div id="section-pest-disease" className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-6">
                    <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                      <Bug size={18} className="text-red-400" />
                      Deteccao de Pragas/Doencas
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="p-3 bg-gray-800/30 rounded-lg">
                        <p className="text-xs text-gray-500">Severidade</p>
                        <p className={`text-lg font-bold ${
                          (pestDisease as any)?.overall_severity === 'saudavel' ? 'text-green-400' :
                          (pestDisease as any)?.overall_severity === 'leve' ? 'text-yellow-400' :
                          (pestDisease as any)?.overall_severity === 'moderado' ? 'text-orange-400' : 'text-red-400'
                        }`}>
                          {(pestDisease as any)?.overall_severity ?? 'N/A'}
                        </p>
                      </div>
                      <div className="p-3 bg-gray-800/30 rounded-lg">
                        <p className="text-xs text-gray-500">Taxa de Infeccao</p>
                        <p className="text-lg font-bold text-white">{Number((pestDisease as any)?.infection_rate ?? 0).toFixed(1)}%</p>
                      </div>
                      <div className="p-3 bg-gray-800/30 rounded-lg">
                        <p className="text-xs text-gray-500">Vegetacao Saudavel</p>
                        <p className="text-lg font-bold text-green-400">{Number((pestDisease as any)?.healthy_percentage ?? 0).toFixed(1)}%</p>
                      </div>
                      <div className="p-3 bg-gray-800/30 rounded-lg">
                        <p className="text-xs text-gray-500">Regioes Afetadas</p>
                        <p className="text-lg font-bold text-white">{((pestDisease as any)?.affected_regions ?? []).length}</p>
                      </div>
                    </div>
                    {/* Detalhes por tipo */}
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="p-3 bg-gray-800/30 rounded-lg">
                        <p className="text-xs text-gray-500">Clorose</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
                            <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${Math.min(Number((pestDisease as any)?.chlorosis_percentage ?? 0), 100)}%` }} />
                          </div>
                          <span className="text-xs text-white">{Number((pestDisease as any)?.chlorosis_percentage ?? 0).toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="p-3 bg-gray-800/30 rounded-lg">
                        <p className="text-xs text-gray-500">Necrose</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
                            <div className="h-full bg-amber-600 rounded-full" style={{ width: `${Math.min(Number((pestDisease as any)?.necrosis_percentage ?? 0), 100)}%` }} />
                          </div>
                          <span className="text-xs text-white">{Number((pestDisease as any)?.necrosis_percentage ?? 0).toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="p-3 bg-gray-800/30 rounded-lg">
                        <p className="text-xs text-gray-500">Anomalias</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
                            <div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.min(Number((pestDisease as any)?.anomaly_percentage ?? 0), 100)}%` }} />
                          </div>
                          <span className="text-xs text-white">{Number((pestDisease as any)?.anomaly_percentage ?? 0).toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                    {/* Recomendacoes */}
                    {(pestDisease as any)?.recommendations && (pestDisease as any).recommendations.length > 0 && (
                      <div className="space-y-2">
                        {(pestDisease as any).recommendations.map((rec: string, idx: number) => (
                          <div key={idx} className="flex items-start gap-2 p-2 bg-gray-800/20 rounded text-sm">
                            <Bug size={14} className="text-red-400 mt-0.5 shrink-0" />
                            <span className="text-gray-300">{rec}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Seção NDVI/ExG */}
                {(vegetationCoverage || vegetationHealth) && (
                  <div id="section-ndvi" className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-6">
                    <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                      <Leaf size={18} className="text-green-400" />
                      Indice de Vegetacao (NDVI/ExG)
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      {vegetationCoverage && (
                        <>
                          <div className="p-3 bg-gray-800/30 rounded-lg">
                            <p className="text-xs text-gray-500">Cobertura Vegetal</p>
                            <p className="text-2xl font-bold text-green-400">{Number((vegetationCoverage as any)?.vegetation_percentage ?? 0).toFixed(1)}%</p>
                          </div>
                          <div className="p-3 bg-gray-800/30 rounded-lg">
                            <p className="text-xs text-gray-500">ExG Medio</p>
                            <p className="text-lg font-bold text-white">{Number((vegetationCoverage as any)?.mean_exg ?? (vegetationHealth as any)?.mean_exg ?? 0).toFixed(4)}</p>
                          </div>
                        </>
                      )}
                      {vegetationHealth && (
                        <>
                          <div className="p-3 bg-gray-800/30 rounded-lg">
                            <p className="text-xs text-gray-500">Indice de Saude</p>
                            <p className="text-2xl font-bold text-white">{Number((vegetationHealth as any)?.health_index ?? 0).toFixed(1)}%</p>
                          </div>
                          <div className="p-3 bg-gray-800/30 rounded-lg">
                            <p className="text-xs text-gray-500">Classificacao</p>
                            <p className={`text-lg font-bold ${
                              Number((vegetationHealth as any)?.health_index ?? 0) >= 70 ? 'text-green-400' :
                              Number((vegetationHealth as any)?.health_index ?? 0) >= 50 ? 'text-yellow-400' :
                              Number((vegetationHealth as any)?.health_index ?? 0) >= 30 ? 'text-orange-400' : 'text-red-400'
                            }`}>
                              {Number((vegetationHealth as any)?.health_index ?? 0) >= 70 ? 'Densa/Saudavel' :
                               Number((vegetationHealth as any)?.health_index ?? 0) >= 50 ? 'Moderada' :
                               Number((vegetationHealth as any)?.health_index ?? 0) >= 30 ? 'Esparsa' : 'Pouca vegetacao'}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                    {/* Barra de progresso ExG */}
                    {vegetationHealth && (
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-500">Intensidade da Vegetacao</span>
                            <span className="text-white">{Number((vegetationHealth as any)?.health_index ?? 0).toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.min(Number((vegetationHealth as any)?.health_index ?? 0), 100)}%`,
                                background: 'linear-gradient(to right, #EF4444, #F59E0B, #6AAF3D, #065F46)',
                              }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
                            <span>Pouca</span>
                            <span>Esparsa</span>
                            <span>Moderada</span>
                            <span>Densa</span>
                          </div>
                        </div>
                        {/* Distribuição de saúde */}
                        {(vegetationHealth as any)?.distribution && (
                          <div className="grid grid-cols-4 gap-3 mt-3">
                            {Object.entries((vegetationHealth as any).distribution).map(([key, val]: [string, any]) => (
                              <div key={key} className="p-2 bg-gray-800/20 rounded text-center">
                                <p className="text-xs text-gray-500">{key.replace(/_/g, ' ')}</p>
                                <p className="text-sm font-bold text-white">{typeof val === 'number' ? val.toFixed(1) : val}%</p>
                              </div>
                            ))}
                          </div>
                        )}
                        {/* GLI e ExG */}
                        <div className="grid grid-cols-2 gap-3 mt-2">
                          {(vegetationHealth as any)?.mean_gli !== undefined && (
                            <div className="p-2 bg-gray-800/20 rounded flex justify-between text-sm">
                              <span className="text-gray-500">GLI Medio</span>
                              <span className="text-white">{Number((vegetationHealth as any).mean_gli).toFixed(4)}</span>
                            </div>
                          )}
                          {(vegetationHealth as any)?.mean_exg !== undefined && (
                            <div className="p-2 bg-gray-800/20 rounded flex justify-between text-sm">
                              <span className="text-gray-500">ExG Medio</span>
                              <span className="text-white">{Number((vegetationHealth as any).mean_exg).toFixed(4)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Análise de Cores */}
                {colorAnalysis && (
                  <div id="section-colors" className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-6">
                    <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                      <Palette size={18} className="text-pink-400" />
                      Analise de Cores
                    </h3>
                    {/* Barras RGB */}
                    <div className="space-y-4 mb-4">
                      {['red', 'green', 'blue'].map(channel => {
                        const mean = Number((colorAnalysis as any)?.[`mean_${channel}`] ?? (colorAnalysis as any)?.channel_stats?.[channel]?.mean ?? 0)
                        const std = Number((colorAnalysis as any)?.[`std_${channel}`] ?? (colorAnalysis as any)?.channel_stats?.[channel]?.std ?? 0)
                        const colorMap: Record<string, string> = { red: '#EF4444', green: '#22C55E', blue: '#3B82F6' }
                        const labelMap: Record<string, string> = { red: 'Vermelho (R)', green: 'Verde (G)', blue: 'Azul (B)' }
                        return (
                          <div key={channel}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-gray-400">{labelMap[channel]}</span>
                              <span className="text-white">Media: {mean.toFixed(1)} | Desvio: {std.toFixed(1)}</span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${(mean / 255) * 100}%`, backgroundColor: colorMap[channel] }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {(colorAnalysis as any)?.brightness !== undefined && (
                        <div className="p-3 bg-gray-800/30 rounded-lg">
                          <p className="text-xs text-gray-500">Brilho Medio</p>
                          <p className="text-lg font-bold text-white">{Number((colorAnalysis as any).brightness).toFixed(1)}</p>
                        </div>
                      )}
                      {(colorAnalysis as any)?.green_dominance !== undefined && (
                        <div className="p-3 bg-gray-800/30 rounded-lg">
                          <p className="text-xs text-gray-500">Predominancia Verde</p>
                          <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-bold ${
                            (colorAnalysis as any).green_dominance ? 'bg-green-900/40 text-green-400' : 'bg-gray-700 text-gray-400'
                          }`}>
                            {(colorAnalysis as any).green_dominance ? 'Sim' : 'Nao'}
                          </span>
                        </div>
                      )}
                      {(colorAnalysis as any)?.saturation !== undefined && (
                        <div className="p-3 bg-gray-800/30 rounded-lg">
                          <p className="text-xs text-gray-500">Saturacao</p>
                          <p className="text-lg font-bold text-white">{Number((colorAnalysis as any).saturation).toFixed(1)}</p>
                        </div>
                      )}
                    </div>
                    {/* Mini histograma simplificado */}
                    {(colorAnalysis as any)?.histogram && (
                      <div className="mt-4">
                        <p className="text-xs text-gray-500 mb-2">Histograma de Intensidade (simplificado)</p>
                        <div className="flex items-end gap-px h-16">
                          {(() => {
                            const hist = (colorAnalysis as any).histogram as number[]
                            if (!Array.isArray(hist) || hist.length === 0) return null
                            // Downsample to ~32 bars
                            const step = Math.max(1, Math.floor(hist.length / 32))
                            const bars: number[] = []
                            for (let i = 0; i < hist.length; i += step) {
                              const slice = hist.slice(i, i + step)
                              bars.push(slice.reduce((s, v) => s + v, 0) / slice.length)
                            }
                            const maxVal = Math.max(...bars, 1)
                            return bars.map((val, idx) => (
                              <div
                                key={idx}
                                className="flex-1 bg-gray-500 rounded-t"
                                style={{ height: `${(val / maxVal) * 100}%`, minWidth: '2px' }}
                              />
                            ))
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Recomendacoes Consolidadas */}
                {(() => {
                  // Agregar todas as recomendações de diferentes fontes
                  const allRecs: { text: string; source: string; type: 'warning' | 'alert' | 'info' | 'success' }[] = []

                  // Do full_report
                  if (analysisResults.recommendations && Array.isArray(analysisResults.recommendations)) {
                    (analysisResults.recommendations as string[]).forEach(rec => {
                      allRecs.push({ text: rec, source: 'Geral', type: 'info' })
                    })
                  }
                  // Do biomass
                  if ((biomassData as any)?.recommendations && Array.isArray((biomassData as any).recommendations)) {
                    ((biomassData as any).recommendations as string[]).forEach((rec: string) => {
                      allRecs.push({ text: rec, source: 'Biomassa', type: rec.toLowerCase().includes('baixa') || rec.toLowerCase().includes('pouca') ? 'warning' : 'success' })
                    })
                  }
                  // Do pest_disease
                  if ((pestDisease as any)?.recommendations && Array.isArray((pestDisease as any).recommendations)) {
                    ((pestDisease as any).recommendations as string[]).forEach((rec: string) => {
                      allRecs.push({ text: rec, source: 'Pragas', type: rec.toLowerCase().includes('urgente') || rec.toLowerCase().includes('critico') ? 'alert' : 'warning' })
                    })
                  }

                  if (allRecs.length === 0) return null

                  const typeStyles = {
                    warning: { bg: 'bg-yellow-900/20', border: 'border-yellow-700/30', icon: <AlertTriangle size={14} className="text-yellow-400 mt-0.5 shrink-0" />, textColor: 'text-yellow-400' },
                    alert: { bg: 'bg-red-900/20', border: 'border-red-700/30', icon: <ShieldAlert size={14} className="text-red-400 mt-0.5 shrink-0" />, textColor: 'text-red-400' },
                    info: { bg: 'bg-blue-900/20', border: 'border-blue-700/30', icon: <Info size={14} className="text-blue-400 mt-0.5 shrink-0" />, textColor: 'text-blue-400' },
                    success: { bg: 'bg-green-900/20', border: 'border-green-700/30', icon: <CheckCircle size={14} className="text-green-400 mt-0.5 shrink-0" />, textColor: 'text-green-400' },
                  }

                  return (
                    <div id="section-recommendations" className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-6">
                      <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                        <Heart size={18} className="text-pink-400" />
                        Recomendacoes Consolidadas
                      </h3>
                      <div className="space-y-2">
                        {allRecs.map((rec, idx) => {
                          const style = typeStyles[rec.type]
                          return (
                            <div key={idx} className={`flex items-start gap-2 p-3 ${style.bg} border ${style.border} rounded-lg`}>
                              {style.icon}
                              <div className="flex-1">
                                <span className="text-gray-300 text-sm">{rec.text}</span>
                                <span className={`ml-2 text-xs ${style.textColor}`}>[{rec.source}]</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}

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
          /* ====== RELATORIO PROFISSIONAL ====== */
          <div className="bg-white text-gray-900 rounded-xl shadow-lg max-w-5xl mx-auto print:shadow-none print:rounded-none">
            {/* Cabecalho do Relatorio */}
            <div className="bg-gradient-to-r from-[#065F46] to-[#6AAF3D] text-white p-8 rounded-t-xl print:rounded-none">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold">Relatorio de Analise</h1>
                  <h2 className="text-xl mt-1 opacity-90">{project.name}</h2>
                </div>
                <button
                  onClick={handleExportPdf}
                  disabled={isExportingPdf || analyses.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 disabled:bg-white/10 rounded-lg transition-colors print:hidden"
                >
                  {isExportingPdf ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                  Baixar PDF
                </button>
              </div>
              <div className="flex gap-6 mt-4 text-sm opacity-80">
                <span>Data: {project.createdAt}</span>
                <span>Fonte: {project.sourceType === 'drone' ? 'Drone' : 'Satelite'}</span>
                <span>{project.imageCount} imagem(ns)</span>
                <span>{project.area} ha</span>
              </div>
            </div>

            <div className="p-8 space-y-8">
              {/* 1. Resumo Executivo */}
              <section>
                <h3 className="text-lg font-bold text-gray-900 border-b-2 border-[#6AAF3D] pb-2 mb-4">1. Resumo Executivo</h3>
                <p className="text-gray-700 leading-relaxed">
                  Analise realizada em {project.createdAt} para a area de {project.area} hectares.
                  {project.results && (
                    <> Foram identificadas {project.results.plantCount.toLocaleString()} arvores, com {project.results.healthyPercentage}% em estado saudavel.
                    A cobertura vegetal de {project.results.vegetationCoverage.toFixed(1)}% e o indice de saude de {project.results.healthIndex.toFixed(1)}%
                    {project.results.healthIndex >= 70 ? ' indicam vegetacao em bom estado.' : project.results.healthIndex >= 50 ? ' indicam vegetacao em estado moderado.' : ' indicam necessidade de intervencao.'}</>
                  )}
                  {analyses.length > 0 && <> Foram realizadas {analyses.length} analise(s) com algoritmos de Machine Learning.</>}
                </p>
                {project.results && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    {[
                      { label: 'Area', value: `${project.area} ha` },
                      { label: 'Arvores', value: project.results.plantCount.toLocaleString() },
                      { label: 'Saude', value: `${project.results.healthIndex.toFixed(0)}%` },
                      { label: 'Cobertura', value: `${project.results.vegetationCoverage.toFixed(0)}%` },
                    ].map((item, i) => (
                      <div key={i} className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
                        <p className="text-xs text-gray-500 uppercase">{item.label}</p>
                        <p className="text-xl font-bold text-[#065F46]">{item.value}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* 2. Informacoes Gerais */}
              <section>
                <h3 className="text-lg font-bold text-gray-900 border-b-2 border-[#6AAF3D] pb-2 mb-4">2. Informacoes Gerais</h3>
                <table className="w-full text-sm">
                  <tbody>
                    {[
                      ['Nome do Projeto', project.name],
                      ['Data da Analise', project.createdAt],
                      ['Fonte das Imagens', project.sourceType === 'drone' ? 'Drone' : 'Satelite'],
                      ['Area Total', `${project.area} hectares`],
                      ['Total de Imagens', String(project.imageCount)],
                      ['Analises Realizadas', String(analyses.length)],
                      ['Descricao', project.description || 'N/A'],
                    ].map(([label, value], i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
                        <td className="py-2 px-3 font-medium text-gray-600 w-1/3">{label}</td>
                        <td className="py-2 px-3 text-gray-900">{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              {/* 3. Cobertura Vegetal e NDVI */}
              {(vegetationCoverage || vegetationHealth) && (
                <section>
                  <h3 className="text-lg font-bold text-gray-900 border-b-2 border-[#6AAF3D] pb-2 mb-4">3. Cobertura Vegetal e NDVI</h3>
                  <div className="space-y-4">
                    {vegetationCoverage && (
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-600">Cobertura Vegetal</span>
                          <span className="font-bold">{Number((vegetationCoverage as any)?.vegetation_percentage ?? 0).toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                          <div className="h-full bg-[#6AAF3D] rounded-full" style={{ width: `${Math.min(Number((vegetationCoverage as any)?.vegetation_percentage ?? 0), 100)}%` }} />
                        </div>
                      </div>
                    )}
                    <table className="w-full text-sm">
                      <tbody>
                        {vegetationCoverage && (vegetationCoverage as any)?.mean_exg !== undefined && (
                          <tr className="bg-gray-50">
                            <td className="py-2 px-3 font-medium text-gray-600 w-1/3">ExG Medio</td>
                            <td className="py-2 px-3">{Number((vegetationCoverage as any).mean_exg).toFixed(4)}</td>
                          </tr>
                        )}
                        {vegetationHealth && (
                          <>
                            <tr>
                              <td className="py-2 px-3 font-medium text-gray-600">Indice de Saude</td>
                              <td className="py-2 px-3">{Number((vegetationHealth as any)?.health_index ?? 0).toFixed(1)}%</td>
                            </tr>
                            <tr className="bg-gray-50">
                              <td className="py-2 px-3 font-medium text-gray-600">Classificacao</td>
                              <td className="py-2 px-3">
                                <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                                  Number((vegetationHealth as any)?.health_index ?? 0) >= 70 ? 'bg-green-100 text-green-800' :
                                  Number((vegetationHealth as any)?.health_index ?? 0) >= 50 ? 'bg-yellow-100 text-yellow-800' :
                                  Number((vegetationHealth as any)?.health_index ?? 0) >= 30 ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {Number((vegetationHealth as any)?.health_index ?? 0) >= 70 ? 'Densa' :
                                   Number((vegetationHealth as any)?.health_index ?? 0) >= 50 ? 'Moderada' :
                                   Number((vegetationHealth as any)?.health_index ?? 0) >= 30 ? 'Esparsa' : 'Pouca'}
                                </span>
                              </td>
                            </tr>
                            {(vegetationHealth as any)?.mean_gli !== undefined && (
                              <tr>
                                <td className="py-2 px-3 font-medium text-gray-600">GLI Medio</td>
                                <td className="py-2 px-3">{Number((vegetationHealth as any).mean_gli).toFixed(4)}</td>
                              </tr>
                            )}
                            {(vegetationHealth as any)?.mean_exg !== undefined && (
                              <tr className="bg-gray-50">
                                <td className="py-2 px-3 font-medium text-gray-600">ExG Medio (Saude)</td>
                                <td className="py-2 px-3">{Number((vegetationHealth as any).mean_exg).toFixed(4)}</td>
                              </tr>
                            )}
                          </>
                        )}
                      </tbody>
                    </table>
                    {/* Distribuicao */}
                    {(vegetationHealth as any)?.distribution && (
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-2">Distribuicao da Vegetacao:</p>
                        <table className="w-full text-sm border border-gray-200 rounded">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="py-1.5 px-3 text-left text-gray-600 font-medium">Categoria</th>
                              <th className="py-1.5 px-3 text-right text-gray-600 font-medium">Percentual</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries((vegetationHealth as any).distribution).map(([key, val]: [string, any], i) => (
                              <tr key={key} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
                                <td className="py-1.5 px-3">{key.replace(/_/g, ' ')}</td>
                                <td className="py-1.5 px-3 text-right font-medium">{typeof val === 'number' ? val.toFixed(1) : val}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* 4. Saude da Vegetacao */}
              {project.results && (
                <section>
                  <h3 className="text-lg font-bold text-gray-900 border-b-2 border-[#6AAF3D] pb-2 mb-4">4. Saude da Vegetacao</h3>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-green-50 rounded-lg p-3 text-center border border-green-200">
                      <p className="text-xs text-gray-500">Saudavel</p>
                      <p className="text-xl font-bold text-green-700">{project.results.healthyPercentage}%</p>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-3 text-center border border-yellow-200">
                      <p className="text-xs text-gray-500">Estressada</p>
                      <p className="text-xl font-bold text-yellow-700">{project.results.stressedPercentage}%</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-3 text-center border border-red-200">
                      <p className="text-xs text-gray-500">Critica</p>
                      <p className="text-xl font-bold text-red-700">{project.results.criticalPercentage}%</p>
                    </div>
                  </div>
                </section>
              )}

              {/* 5. Biomassa */}
              {biomassData && (
                <section>
                  <h3 className="text-lg font-bold text-gray-900 border-b-2 border-[#6AAF3D] pb-2 mb-4">5. Biomassa</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">Indice de Biomassa</span>
                          <span className="font-bold">{Number((biomassData as any)?.biomass_index ?? 0).toFixed(1)} / 100</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                          <div className="h-full rounded-full" style={{
                            width: `${Math.min(Number((biomassData as any)?.biomass_index ?? 0), 100)}%`,
                            backgroundColor: Number((biomassData as any)?.biomass_index ?? 0) >= 75 ? '#059669' :
                              Number((biomassData as any)?.biomass_index ?? 0) >= 50 ? '#6AAF3D' :
                              Number((biomassData as any)?.biomass_index ?? 0) >= 25 ? '#F59E0B' : '#EF4444'
                          }} />
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        (biomassData as any)?.density_class === 'muito_densa' ? 'bg-emerald-100 text-emerald-800' :
                        (biomassData as any)?.density_class === 'densa' ? 'bg-green-100 text-green-800' :
                        (biomassData as any)?.density_class === 'moderada' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {((biomassData as any)?.density_class ?? '').replace('_', ' ')}
                      </span>
                    </div>
                    <table className="w-full text-sm">
                      <tbody>
                        <tr className="bg-gray-50">
                          <td className="py-2 px-3 font-medium text-gray-600 w-1/3">Biomassa Estimada</td>
                          <td className="py-2 px-3">{Number((biomassData as any)?.estimated_biomass_kg_ha ?? 0) >= 1000
                            ? `${(Number((biomassData as any)?.estimated_biomass_kg_ha ?? 0) / 1000).toFixed(1)} t/ha`
                            : `${Number((biomassData as any)?.estimated_biomass_kg_ha ?? 0)} kg/ha`}</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-medium text-gray-600">Copas Detectadas</td>
                          <td className="py-2 px-3">{(biomassData as any)?.canopy_count ?? 0}</td>
                        </tr>
                      </tbody>
                    </table>
                    {/* Vigor */}
                    {(biomassData as any)?.vigor_metrics && (
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-2">Metricas de Vigor:</p>
                        <table className="w-full text-sm border border-gray-200 rounded">
                          <thead><tr className="bg-gray-100">
                            <th className="py-1.5 px-3 text-left text-gray-600 font-medium">Metrica</th>
                            <th className="py-1.5 px-3 text-right text-gray-600 font-medium">Valor</th>
                          </tr></thead>
                          <tbody>
                            {[
                              ['Intensidade Verde', Number((biomassData as any).vigor_metrics.mean_green_intensity ?? 0).toFixed(1)],
                              ['ExG Medio', Number((biomassData as any).vigor_metrics.mean_exg ?? 0).toFixed(4)],
                              ['Variancia de Textura', Number((biomassData as any).vigor_metrics.texture_variance ?? 0).toFixed(1)],
                            ].map(([label, val], i) => (
                              <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
                                <td className="py-1.5 px-3">{label}</td>
                                <td className="py-1.5 px-3 text-right font-medium">{val}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {/* Recomendacoes biomassa */}
                    {(biomassData as any)?.recommendations && (biomassData as any).recommendations.length > 0 && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="text-sm font-medium text-green-800 mb-1">Recomendacoes:</p>
                        <ul className="text-sm text-green-700 space-y-1 list-disc list-inside">
                          {(biomassData as any).recommendations.map((rec: string, idx: number) => (
                            <li key={idx}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* 6. Pragas e Doencas */}
              {pestDisease && (
                <section>
                  <h3 className="text-lg font-bold text-gray-900 border-b-2 border-[#6AAF3D] pb-2 mb-4">6. Pragas e Doencas</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600">Severidade Geral:</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        (pestDisease as any)?.overall_severity === 'saudavel' ? 'bg-green-100 text-green-800' :
                        (pestDisease as any)?.overall_severity === 'leve' ? 'bg-yellow-100 text-yellow-800' :
                        (pestDisease as any)?.overall_severity === 'moderado' ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {(pestDisease as any)?.overall_severity ?? 'N/A'}
                      </span>
                    </div>
                    <table className="w-full text-sm border border-gray-200 rounded">
                      <thead><tr className="bg-gray-100">
                        <th className="py-1.5 px-3 text-left text-gray-600 font-medium">Metrica</th>
                        <th className="py-1.5 px-3 text-right text-gray-600 font-medium">Valor</th>
                      </tr></thead>
                      <tbody>
                        {[
                          ['Taxa de Infeccao', `${Number((pestDisease as any)?.infection_rate ?? 0).toFixed(1)}%`],
                          ['Vegetacao Saudavel', `${Number((pestDisease as any)?.healthy_percentage ?? 0).toFixed(1)}%`],
                          ['Clorose', `${Number((pestDisease as any)?.chlorosis_percentage ?? 0).toFixed(1)}%`],
                          ['Necrose', `${Number((pestDisease as any)?.necrosis_percentage ?? 0).toFixed(1)}%`],
                          ['Anomalias', `${Number((pestDisease as any)?.anomaly_percentage ?? 0).toFixed(1)}%`],
                          ['Regioes Afetadas', String(((pestDisease as any)?.affected_regions ?? []).length)],
                        ].map(([label, val], i) => (
                          <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
                            <td className="py-1.5 px-3">{label}</td>
                            <td className="py-1.5 px-3 text-right font-medium">{val}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {(pestDisease as any)?.recommendations && (pestDisease as any).recommendations.length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-sm font-medium text-red-800 mb-1">Recomendacoes:</p>
                        <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
                          {(pestDisease as any).recommendations.map((rec: string, idx: number) => (
                            <li key={idx}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* 7. Deteccao de Objetos */}
              {objectDetection && (
                <section>
                  <h3 className="text-lg font-bold text-gray-900 border-b-2 border-[#6AAF3D] pb-2 mb-4">7. Deteccao de Objetos</h3>
                  <table className="w-full text-sm border border-gray-200 rounded">
                    <thead><tr className="bg-gray-100">
                      <th className="py-1.5 px-3 text-left text-gray-600 font-medium">Metrica</th>
                      <th className="py-1.5 px-3 text-right text-gray-600 font-medium">Valor</th>
                    </tr></thead>
                    <tbody>
                      <tr className="bg-gray-50">
                        <td className="py-1.5 px-3">Total Detectado</td>
                        <td className="py-1.5 px-3 text-right font-bold">{(objectDetection as any)?.total_detections ?? 0}</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-3">Confianca Media</td>
                        <td className="py-1.5 px-3 text-right">{(((objectDetection as any)?.avg_confidence ?? 0) * 100).toFixed(1)}%</td>
                      </tr>
                      {(objectDetection as any)?.by_class && Object.entries((objectDetection as any).by_class).map(([cls, count]: [string, any], i) => (
                        <tr key={cls} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
                          <td className="py-1.5 px-3 pl-6">{cls}</td>
                          <td className="py-1.5 px-3 text-right">{count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              )}

              {/* 8. Classificacao de Uso do Solo */}
              {sceneClassification && (
                <section>
                  <h3 className="text-lg font-bold text-gray-900 border-b-2 border-[#6AAF3D] pb-2 mb-4">8. Classificacao de Uso do Solo</h3>
                  <div className="space-y-4">
                    {(sceneClassification as any)?.land_use_percentages && (
                      <table className="w-full text-sm border border-gray-200 rounded">
                        <thead><tr className="bg-gray-100">
                          <th className="py-1.5 px-3 text-left text-gray-600 font-medium">Categoria</th>
                          <th className="py-1.5 px-3 text-right text-gray-600 font-medium">Percentual</th>
                          <th className="py-1.5 px-3 w-1/3 text-gray-600 font-medium"></th>
                        </tr></thead>
                        <tbody>
                          {Object.entries((sceneClassification as any).land_use_percentages)
                            .sort(([, a]: any, [, b]: any) => b - a)
                            .map(([cls, pct]: [string, any], i) => (
                            <tr key={cls} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
                              <td className="py-1.5 px-3">{cls.replace(/_/g, ' ')}</td>
                              <td className="py-1.5 px-3 text-right font-medium">{typeof pct === 'number' ? pct.toFixed(1) : pct}%</td>
                              <td className="py-1.5 px-3">
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div className="h-full bg-blue-400 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                    {vegetationType && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-600">Tipo dominante:</span>
                        <span className="font-bold text-[#065F46]">{(vegetationType as any)?.vegetation_type}</span>
                        {(vegetationType as any)?.vegetation_density && (
                          <span className="text-gray-500">({(vegetationType as any).vegetation_density})</span>
                        )}
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* 9. Segmentacao DeepLabV3 */}
              {segmentation && (segmentation as any)?.category_percentages && (
                <section>
                  <h3 className="text-lg font-bold text-gray-900 border-b-2 border-[#6AAF3D] pb-2 mb-4">9. Segmentacao DeepLabV3</h3>
                  <table className="w-full text-sm border border-gray-200 rounded">
                    <thead><tr className="bg-gray-100">
                      <th className="py-1.5 px-3 text-left text-gray-600 font-medium">Categoria</th>
                      <th className="py-1.5 px-3 text-right text-gray-600 font-medium">Percentual</th>
                    </tr></thead>
                    <tbody>
                      {Object.entries((segmentation as any).category_percentages).map(([cat, pct]: [string, any], i) => (
                        <tr key={cat} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
                          <td className="py-1.5 px-3">{cat}</td>
                          <td className="py-1.5 px-3 text-right font-medium">{typeof pct === 'number' ? pct.toFixed(1) : pct}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {(segmentation as any)?.num_classes_detected && (
                    <p className="text-sm text-gray-600 mt-2">Classes detectadas: <strong>{(segmentation as any).num_classes_detected}</strong></p>
                  )}
                </section>
              )}

              {/* 10. Features Visuais */}
              {visualFeatures && (
                <section>
                  <h3 className="text-lg font-bold text-gray-900 border-b-2 border-[#6AAF3D] pb-2 mb-4">10. Features Visuais</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(visualFeatures as any)?.texture && (
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-2">Textura</p>
                        <table className="w-full text-sm border border-gray-200 rounded">
                          <tbody>
                            {Object.entries((visualFeatures as any).texture).map(([key, val]: [string, any], i) => (
                              <tr key={key} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
                                <td className="py-1 px-2 text-gray-600">{key.replace(/_/g, ' ')}</td>
                                <td className="py-1 px-2 text-right">{typeof val === 'number' ? val.toFixed(3) : String(val)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {(visualFeatures as any)?.colors && (
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-2">Cores</p>
                        <table className="w-full text-sm border border-gray-200 rounded">
                          <tbody>
                            {Object.entries((visualFeatures as any).colors).map(([key, val]: [string, any], i) => (
                              <tr key={key} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
                                <td className="py-1 px-2 text-gray-600">{key.replace(/_/g, ' ')}</td>
                                <td className="py-1 px-2 text-right">{typeof val === 'number' ? val.toFixed(3) : String(val)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {(visualFeatures as any)?.patterns && (
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-2">Padroes</p>
                        <table className="w-full text-sm border border-gray-200 rounded">
                          <tbody>
                            {Object.entries((visualFeatures as any).patterns).map(([key, val]: [string, any], i) => (
                              <tr key={key} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
                                <td className="py-1 px-2 text-gray-600">{key.replace(/_/g, ' ')}</td>
                                <td className="py-1 px-2 text-right">{typeof val === 'number' ? val.toFixed(3) : String(val)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* 11. Analise de Cores */}
              {colorAnalysis && (
                <section>
                  <h3 className="text-lg font-bold text-gray-900 border-b-2 border-[#6AAF3D] pb-2 mb-4">11. Analise de Cores</h3>
                  <table className="w-full text-sm border border-gray-200 rounded">
                    <thead><tr className="bg-gray-100">
                      <th className="py-1.5 px-3 text-left text-gray-600 font-medium">Canal</th>
                      <th className="py-1.5 px-3 text-right text-gray-600 font-medium">Media</th>
                      <th className="py-1.5 px-3 text-right text-gray-600 font-medium">Desvio</th>
                    </tr></thead>
                    <tbody>
                      {['red', 'green', 'blue'].map((ch, i) => {
                        const mean = Number((colorAnalysis as any)?.[`mean_${ch}`] ?? (colorAnalysis as any)?.channel_stats?.[ch]?.mean ?? 0)
                        const std = Number((colorAnalysis as any)?.[`std_${ch}`] ?? (colorAnalysis as any)?.channel_stats?.[ch]?.std ?? 0)
                        const labelMap: Record<string, string> = { red: 'Vermelho (R)', green: 'Verde (G)', blue: 'Azul (B)' }
                        return (
                          <tr key={ch} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
                            <td className="py-1.5 px-3">{labelMap[ch]}</td>
                            <td className="py-1.5 px-3 text-right">{mean.toFixed(1)}</td>
                            <td className="py-1.5 px-3 text-right">{std.toFixed(1)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  <div className="flex gap-4 mt-3 text-sm">
                    {(colorAnalysis as any)?.brightness !== undefined && (
                      <span className="text-gray-600">Brilho: <strong>{Number((colorAnalysis as any).brightness).toFixed(1)}</strong></span>
                    )}
                    {(colorAnalysis as any)?.green_dominance !== undefined && (
                      <span className="text-gray-600">Predominancia verde:
                        <span className={`ml-1 px-1.5 py-0.5 rounded text-xs font-bold ${(colorAnalysis as any).green_dominance ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {(colorAnalysis as any).green_dominance ? 'Sim' : 'Nao'}
                        </span>
                      </span>
                    )}
                  </div>
                </section>
              )}

              {/* 12. Dados Ambientais */}
              {enrichedData && (enrichedData.weather || enrichedData.soil || enrichedData.elevation || enrichedData.geocoding) && (
                <section>
                  <h3 className="text-lg font-bold text-gray-900 border-b-2 border-[#6AAF3D] pb-2 mb-4">12. Dados Ambientais</h3>
                  <table className="w-full text-sm">
                    <tbody>
                      {enrichedData.geocoding && !enrichedData.geocoding.error && (
                        <tr className="bg-gray-50">
                          <td className="py-2 px-3 font-medium text-gray-600 w-1/3">Localizacao</td>
                          <td className="py-2 px-3">{enrichedData.geocoding.display_name || `${enrichedData.geocoding.address?.city}, ${enrichedData.geocoding.address?.state}`}</td>
                        </tr>
                      )}
                      {enrichedData.elevation && !enrichedData.elevation.error && (
                        <>
                          <tr>
                            <td className="py-2 px-3 font-medium text-gray-600">Altitude</td>
                            <td className="py-2 px-3">{formatWeatherValue(enrichedData.elevation.elevation_m)} m</td>
                          </tr>
                          {enrichedData.elevation.terrain_classification && (
                            <tr className="bg-gray-50">
                              <td className="py-2 px-3 font-medium text-gray-600">Terreno</td>
                              <td className="py-2 px-3">{enrichedData.elevation.terrain_classification.description || enrichedData.elevation.terrain_classification.category}</td>
                            </tr>
                          )}
                        </>
                      )}
                      {enrichedData.weather && !enrichedData.weather.error && enrichedData.weather.current && (
                        <>
                          {enrichedData.weather.current.weather_description && (
                            <tr>
                              <td className="py-2 px-3 font-medium text-gray-600">Clima</td>
                              <td className="py-2 px-3">{enrichedData.weather.current.weather_description}</td>
                            </tr>
                          )}
                          <tr className="bg-gray-50">
                            <td className="py-2 px-3 font-medium text-gray-600">Temperatura</td>
                            <td className="py-2 px-3">{formatWeatherValue(enrichedData.weather.current.temperature_c)}°C</td>
                          </tr>
                          <tr>
                            <td className="py-2 px-3 font-medium text-gray-600">Umidade</td>
                            <td className="py-2 px-3">{formatWeatherValue(enrichedData.weather.current.relative_humidity_pct)}%</td>
                          </tr>
                          <tr className="bg-gray-50">
                            <td className="py-2 px-3 font-medium text-gray-600">Precipitacao</td>
                            <td className="py-2 px-3">{formatWeatherValue(enrichedData.weather.current.precipitation_mm)} mm</td>
                          </tr>
                          <tr>
                            <td className="py-2 px-3 font-medium text-gray-600">Vento</td>
                            <td className="py-2 px-3">{formatWeatherValue(enrichedData.weather.current.wind_speed_kmh)} km/h</td>
                          </tr>
                        </>
                      )}
                      {enrichedData.soil && !enrichedData.soil.error && enrichedData.soil.properties && (
                        <>
                          {['phh2o', 'nitrogen', 'soc', 'clay'].filter(k => enrichedData.soil!.properties![k]).map((key, i) => {
                            const val = enrichedData.soil!.properties![key]
                            const firstDepth = val?.depths ? Object.values(val.depths)[0] : null
                            return (
                              <tr key={key} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
                                <td className="py-2 px-3 font-medium text-gray-600">{val?.label || key}</td>
                                <td className="py-2 px-3">{firstDepth != null ? firstDepth : '-'} {val?.unit || ''}</td>
                              </tr>
                            )
                          })}
                        </>
                      )}
                    </tbody>
                  </table>
                </section>
              )}

              {/* 13. Alertas */}
              {alerts.length > 0 && (
                <section>
                  <h3 className="text-lg font-bold text-gray-900 border-b-2 border-[#6AAF3D] pb-2 mb-4">13. Alertas</h3>
                  <table className="w-full text-sm border border-gray-200 rounded">
                    <thead><tr className="bg-gray-100">
                      <th className="py-1.5 px-3 text-left text-gray-600 font-medium">Severidade</th>
                      <th className="py-1.5 px-3 text-left text-gray-600 font-medium">Mensagem</th>
                      <th className="py-1.5 px-3 text-right text-gray-600 font-medium">Valor</th>
                      <th className="py-1.5 px-3 text-right text-gray-600 font-medium">Limite</th>
                    </tr></thead>
                    <tbody>
                      {alerts.map((alert, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                          <td className="py-1.5 px-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                              alert.severity === 'critical' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {alert.severity === 'critical' ? 'CRITICO' : 'AVISO'}
                            </span>
                          </td>
                          <td className="py-1.5 px-3">{alert.message}</td>
                          <td className="py-1.5 px-3 text-right">{alert.current_value.toFixed(1)}</td>
                          <td className="py-1.5 px-3 text-right">{alert.threshold}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              )}

              {/* 14. Historico de Analises */}
              {analyses.length > 0 && (
                <section>
                  <h3 className="text-lg font-bold text-gray-900 border-b-2 border-[#6AAF3D] pb-2 mb-4">14. Historico de Analises</h3>
                  <table className="w-full text-sm border border-gray-200 rounded">
                    <thead><tr className="bg-gray-100">
                      <th className="py-1.5 px-3 text-left text-gray-600 font-medium">Tipo</th>
                      <th className="py-1.5 px-3 text-right text-gray-600 font-medium">Tempo</th>
                      <th className="py-1.5 px-3 text-right text-gray-600 font-medium">Data</th>
                    </tr></thead>
                    <tbody>
                      {analyses.map((a, idx) => (
                        <tr key={a.id} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                          <td className="py-1.5 px-3">
                            {a.analysis_type === 'full_report' ? 'Analise Completa (ML)' :
                             a.analysis_type === 'video_analysis' ? 'Analise de Video' :
                             a.analysis_type === 'vegetation_coverage' ? 'Cobertura Vegetal' :
                             a.analysis_type === 'plant_health' ? 'Saude' :
                             a.analysis_type === 'color_analysis' ? 'Cores' :
                             a.analysis_type === 'object_detection' ? 'Deteccao YOLO' :
                             a.analysis_type === 'land_use' ? 'Uso do Solo' :
                             a.analysis_type === 'feature_extraction' ? 'Features' :
                             a.analysis_type.replace(/_/g, ' ')}
                          </td>
                          <td className="py-1.5 px-3 text-right">{a.processing_time_seconds ? `${a.processing_time_seconds.toFixed(1)}s` : '-'}</td>
                          <td className="py-1.5 px-3 text-right">{new Date(a.created_at).toLocaleString('pt-BR')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              )}

              {/* Rodape */}
              <div className="border-t-2 border-gray-200 pt-4 mt-8 text-center text-xs text-gray-400">
                <p>Relatorio gerado automaticamente pelo Roboroca — {new Date().toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Edit Modal */}
      <ProjectEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSaved={() => {
          onRefresh?.()
        }}
        project={project}
        description={project.description}
        latitude={project.latitude}
        longitude={project.longitude}
      />
    </div>
  )
}
