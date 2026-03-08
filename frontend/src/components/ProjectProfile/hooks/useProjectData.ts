'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
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
  type TimelineEntry,
  type AlertItem,
} from '@/lib/api'
import { useToast } from '../../Toast'
import { useConfirmDialog } from '../../ConfirmDialog'
import { type ProjectData, type AnalysisProgress, analysisStages } from '../types'

export function useProjectData(project: ProjectData, onRefresh?: () => void, onBack?: () => void) {
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
      const result = await analyzeProject(Number(project.id), true)
      if (result.analyses_started === 0) {
        toast.info('Analise ja realizada', 'Nenhum arquivo para analisar neste projeto.')
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

  const handleDeleteProject = () => {
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
          onBack?.()
        } catch (err: any) {
          toast.error('Erro ao excluir', err?.detail || 'Falha ao excluir o projeto')
        } finally {
          setIsDeleting(false)
        }
      },
    })
  }

  return {
    analyses,
    enrichedData,
    timelineData,
    timelineLoading,
    alerts,
    loadingAnalyses,
    analysisProgress,
    isEditModalOpen,
    setIsEditModalOpen,
    isDeleting,
    showProjectSwitcher,
    setShowProjectSwitcher,
    loadingEnriched,
    isExportingPdf,
    isReanalyzing,
    isExportingJson,
    fetchAnalyses,
    handleRunAnalysis,
    handleReanalyze,
    handleExportJson,
    handleExportPdf,
    handleDeleteProject,
  }
}
