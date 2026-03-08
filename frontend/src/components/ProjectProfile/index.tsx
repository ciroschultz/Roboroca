'use client'

import { useState, useEffect } from 'react'
import {
  ArrowLeft,
  Download,
  Share2,
  Trash2,
  Calendar,
  MapPin,
  Image,
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Loader2,
  Cpu,
  Pencil,
  ChevronDown,
} from 'lucide-react'
import PerimeterEditor from '../PerimeterEditor'
import ProjectEditModal from '../ProjectEditModal'
import { type ProjectProfileProps, sectionMap, analysisStages, extractAnalysisResults } from './types'
import { useProjectData } from './hooks/useProjectData'
import OverviewTab from './OverviewTab'
import AnalysisTab from './AnalysisTab'
import MapTab from './MapTab'
import ReportTab from './ReportTab'

export default function ProjectProfile({ project, onBack, onRefresh, initialTab, analysisSection, allProjects, onProjectChange, openPerimeterEditor }: ProjectProfileProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'map' | 'analysis' | 'report'>(initialTab || 'overview')
  const [showPerimeterEditor, setShowPerimeterEditor] = useState(
    (openPerimeterEditor && project.status !== 'completed') || false
  )

  const data = useProjectData(project, onRefresh, onBack)

  // Reagir a mudanças de openPerimeterEditor (ex: após upload ou captura GPS)
  // Não abrir automaticamente se o projeto já foi analisado (completed)
  useEffect(() => {
    if (openPerimeterEditor && project.status !== 'completed') {
      setShowPerimeterEditor(true)
    }
  }, [openPerimeterEditor, project.status])

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

  const analysisData = extractAnalysisResults(data.analyses)

  const handleStartAnalysis = () => {
    if (project.status === 'completed') {
      setActiveTab('analysis')
    } else {
      setShowPerimeterEditor(true)
    }
  }

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

  if (showPerimeterEditor) {
    return (
      <PerimeterEditor
        projectId={Number(project.id)}
        onComplete={() => {
          setShowPerimeterEditor(false)
          onRefresh?.()
          data.fetchAnalyses()
        }}
        onCancel={() => setShowPerimeterEditor(false)}
      />
    )
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
                    onClick={() => allProjects && allProjects.length > 1 ? data.setShowProjectSwitcher(!data.showProjectSwitcher) : undefined}
                    className={`flex items-center gap-1 text-2xl font-bold text-white ${allProjects && allProjects.length > 1 ? 'hover:text-[#6AAF3D] cursor-pointer' : ''}`}
                  >
                    {project.name}
                    {allProjects && allProjects.length > 1 && <ChevronDown size={20} className="text-gray-400" />}
                  </button>
                  {data.showProjectSwitcher && allProjects && (
                    <div className="absolute top-full left-0 mt-1 w-64 bg-[#1a1a2e] border border-gray-700 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
                      {allProjects.filter(p => p.id !== project.id).map(p => (
                        <button
                          key={p.id}
                          onClick={() => {
                            data.setShowProjectSwitcher(false)
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
                  onClick={() => data.setIsEditModalOpen(true)}
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
              onClick={data.handleExportPdf}
              disabled={data.isExportingPdf || data.analyses.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-[#6AAF3D] hover:bg-[#5a9a34] disabled:bg-gray-600 text-white rounded-lg transition-colors"
            >
              {data.isExportingPdf ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Download size={18} />
              )}
              Baixar Relatorio
            </button>
            <button
              onClick={data.handleDeleteProject}
              disabled={data.isDeleting}
              className="p-2 hover:bg-red-900/30 text-gray-400 hover:text-red-400 rounded-lg transition-colors disabled:opacity-50"
            >
              {data.isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
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
        {activeTab === 'map' ? (
          <MapTab projectId={Number(project.id)} />
        ) : project.status === 'processing' || data.analysisProgress ? (
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
            {data.analysisProgress ? (
              <div className="w-80 mb-4">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Imagem {data.analysisProgress.analyzedImages} de {data.analysisProgress.totalImages}</span>
                  <span>{data.analysisProgress.totalImages > 0 ? Math.round((data.analysisProgress.analyzedImages / data.analysisProgress.totalImages) * 100) : 0}%</span>
                </div>
                <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-500 rounded-full transition-all duration-500"
                    style={{ width: `${data.analysisProgress.totalImages > 0 ? Math.max(5, (data.analysisProgress.analyzedImages / data.analysisProgress.totalImages) * 100) : 5}%` }}
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
              {data.analysisProgress?.stage || 'Analisando vegetacao, solo e objetos...'}
            </p>

            {/* Pipeline stages */}
            {data.analysisProgress && (
              <div className="w-80 mt-4 space-y-2">
                {analysisStages.map((stage, idx) => {
                  const currentIdx = analysisStages.indexOf(data.analysisProgress!.stage)
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
            {data.analysisProgress && (
              <p className="text-xs text-gray-500 mt-4">
                Tempo decorrido: {Math.round((Date.now() - data.analysisProgress.startedAt) / 1000)}s
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
              onClick={data.handleRunAnalysis}
              disabled={data.isReanalyzing}
              className="px-6 py-3 bg-[#6AAF3D] hover:bg-[#5a9a34] disabled:bg-gray-600 text-white rounded-lg transition-colors font-medium"
            >
              {data.isReanalyzing ? 'Iniciando...' : 'Tentar Novamente'}
            </button>
          </div>
        ) : activeTab === 'overview' ? (
          <OverviewTab
            project={project}
            analyses={data.analyses}
            analysisResults={analysisData.analysisResults}
            videoAnalysis={analysisData.videoAnalysis}
            enrichedData={data.enrichedData}
            loadingEnriched={data.loadingEnriched}
            timelineData={data.timelineData}
            timelineLoading={data.timelineLoading}
            alerts={data.alerts}
            onSetActiveTab={setActiveTab}
            onStartAnalysis={handleStartAnalysis}
          />
        ) : activeTab === 'analysis' ? (
          <AnalysisTab
            project={project}
            analyses={data.analyses}
            analysisData={analysisData}
            loadingAnalyses={data.loadingAnalyses}
            isReanalyzing={data.isReanalyzing}
            isExportingJson={data.isExportingJson}
            isExportingPdf={data.isExportingPdf}
            onStartAnalysis={handleStartAnalysis}
            onReanalyze={data.handleReanalyze}
            onExportJson={data.handleExportJson}
            onExportPdf={data.handleExportPdf}
            onAnalysisComplete={() => {
              data.fetchAnalyses()
              onRefresh?.()
            }}
          />
        ) : activeTab === 'report' ? (
          <ReportTab
            project={project}
            analyses={data.analyses}
            analysisData={analysisData}
            enrichedData={data.enrichedData}
            alerts={data.alerts}
            isExportingPdf={data.isExportingPdf}
            onExportPdf={data.handleExportPdf}
          />
        ) : null}
      </div>

      {/* Edit Modal */}
      <ProjectEditModal
        isOpen={data.isEditModalOpen}
        onClose={() => data.setIsEditModalOpen(false)}
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
