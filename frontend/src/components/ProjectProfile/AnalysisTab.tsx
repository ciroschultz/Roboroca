'use client'

import {
  MapPin,
  Leaf,
  Trees,
  Layers,
  Loader2,
  Video,
  Cpu,
  Bug,
  TreePine,
  Palette,
  Info,
  ShieldAlert,
  Heart,
  Download,
  FileText,
  Eye,
  BarChart3,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react'
import ImageAnalysisPanel from '../ImageAnalysisPanel'
import { type Analysis } from '@/lib/api'
import { type ProjectData, type AnalysisResultsData } from './types'

interface AnalysisTabProps {
  project: ProjectData
  analyses: Analysis[]
  analysisData: AnalysisResultsData
  loadingAnalyses: boolean
  isReanalyzing: boolean
  isExportingJson: boolean
  isExportingPdf: boolean
  onStartAnalysis: () => void
  onReanalyze: () => void
  onExportJson: () => void
  onExportPdf: () => void
  onAnalysisComplete: () => void
}

export default function AnalysisTab({
  project,
  analyses,
  analysisData,
  loadingAnalyses,
  isReanalyzing,
  isExportingJson,
  isExportingPdf,
  onStartAnalysis,
  onReanalyze,
  onExportJson,
  onExportPdf,
  onAnalysisComplete,
}: AnalysisTabProps) {
  const {
    analysisResults,
    fullAnalysis,
    videoAnalysis,
    segmentation,
    sceneClassification,
    vegetationType,
    visualFeatures,
    objectDetection,
    pestDisease,
    biomassData,
    vegetationCoverage,
    vegetationHealth,
    colorAnalysis,
    temporalSummary,
    videoInfo,
  } = analysisData

  return (
    <div className="space-y-6">
      {/* Analise por Imagem - Novo painel */}
      <ImageAnalysisPanel
        projectId={Number(project.id)}
        onAnalysisComplete={onAnalysisComplete}
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
          onClick={onReanalyze}
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
          onClick={onExportJson}
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
          onClick={onExportPdf}
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
            onClick={onStartAnalysis}
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
                  {(fullAnalysis || videoAnalysis)?.processing_time_seconds ? `${((fullAnalysis || videoAnalysis)!.processing_time_seconds!).toFixed(1)}s` : 'N/A'}
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

              {/* Resultados ML dos keyframes (árvores, pragas, biomassa) */}
              {(() => {
                const kfMl = videoAnalysis?.results?.keyframe_ml_analysis as Record<string, unknown> | undefined
                if (!kfMl) return null
                return (
                  <div className="mt-4">
                    <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Analise ML dos Keyframes</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {(kfMl.total_trees_detected as number) > 0 && (
                        <div className="p-3 bg-green-900/20 border border-green-700/30 rounded-lg">
                          <p className="text-xs text-gray-500">Arvores Detectadas</p>
                          <p className="text-lg font-bold text-[#6AAF3D]">{kfMl.total_trees_detected as number}</p>
                          <p className="text-[10px] text-gray-600">~{kfMl.avg_trees_per_frame as number}/frame</p>
                        </div>
                      )}
                      {(kfMl.total_pest_anomalies as number) > 0 && (
                        <div className="p-3 bg-red-900/20 border border-red-700/30 rounded-lg">
                          <p className="text-xs text-gray-500">Anomalias de Pragas</p>
                          <p className="text-lg font-bold text-red-400">{kfMl.total_pest_anomalies as number}</p>
                        </div>
                      )}
                      {kfMl.avg_biomass_index != null && (
                        <div className="p-3 bg-emerald-900/20 border border-emerald-700/30 rounded-lg">
                          <p className="text-xs text-gray-500">Biomassa Media</p>
                          <p className="text-lg font-bold text-emerald-400">{kfMl.avg_biomass_index as number}</p>
                        </div>
                      )}
                      <div className="p-3 bg-gray-800/30 rounded-lg">
                        <p className="text-xs text-gray-500">Keyframes Analisados</p>
                        <p className="text-lg font-bold text-white">{kfMl.keyframes_analyzed as number}</p>
                      </div>
                    </div>
                    {(kfMl.total_trees_detected as number) === 0 && (kfMl.total_pest_anomalies as number) === 0 && kfMl.avg_biomass_index == null && (
                      <p className="text-xs text-gray-500 mt-2 italic">
                        Nenhum resultado ML disponivel. Re-analise o projeto para gerar resultados dos keyframes.
                      </p>
                    )}
                  </div>
                )
              })()}
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
  )
}
