'use client'

import { useState } from 'react'
import {
  Leaf,
  Trees,
  Droplets,
  Mountain,
  AlertTriangle,
  CheckCircle,
  Info,
  Download,
  ChevronDown,
  ChevronUp,
  Eye,
  BarChart3,
  PieChart,
  Grid,
  Loader2,
} from 'lucide-react'
import type { Analysis } from '@/lib/api'

interface AnalysisResultsProps {
  analysis: Analysis
  onExportPDF?: () => void
  isExporting?: boolean
}

interface DetectionBoxProps {
  detection: {
    class: string
    confidence: number
    bbox: [number, number, number, number]
  }
  imageWidth: number
  imageHeight: number
  containerWidth: number
  containerHeight: number
}

// Componente para renderizar bounding box de detecção
function DetectionBox({ detection, imageWidth, imageHeight, containerWidth, containerHeight }: DetectionBoxProps) {
  const [x1, y1, x2, y2] = detection.bbox

  // Calcular posição relativa
  const scaleX = containerWidth / imageWidth
  const scaleY = containerHeight / imageHeight

  const style = {
    left: `${x1 * scaleX}px`,
    top: `${y1 * scaleY}px`,
    width: `${(x2 - x1) * scaleX}px`,
    height: `${(y2 - y1) * scaleY}px`,
  }

  return (
    <div
      className="absolute border-2 border-[#6AAF3D] bg-[#6AAF3D]/10 pointer-events-none"
      style={style}
    >
      <span className="absolute -top-5 left-0 text-xs bg-[#6AAF3D] text-white px-1 rounded whitespace-nowrap">
        {detection.class} ({(detection.confidence * 100).toFixed(0)}%)
      </span>
    </div>
  )
}

// Componente para gráfico de barras simples
function SimpleBarChart({ data, title }: { data: Record<string, number>; title?: string }) {
  const maxValue = Math.max(...Object.values(data), 1)

  return (
    <div className="space-y-2">
      {title && <h4 className="text-sm font-medium text-gray-400">{title}</h4>}
      {Object.entries(data).map(([label, value]) => (
        <div key={label} className="flex items-center gap-2">
          <span className="text-xs text-gray-400 w-24 truncate" title={label}>
            {label}
          </span>
          <div className="flex-1 bg-gray-700 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#6AAF3D] to-green-400 rounded-full transition-all duration-500"
              style={{ width: `${(value / maxValue) * 100}%` }}
            />
          </div>
          <span className="text-xs text-white w-12 text-right">{value.toFixed(1)}%</span>
        </div>
      ))}
    </div>
  )
}

// Componente para métrica com ícone
function MetricCard({
  icon: Icon,
  label,
  value,
  subValue,
  color = 'green',
}: {
  icon: React.ElementType
  label: string
  value: string | number
  subValue?: string
  color?: 'green' | 'yellow' | 'red' | 'blue'
}) {
  const colorClasses = {
    green: 'text-[#6AAF3D] bg-[#6AAF3D]/20',
    yellow: 'text-yellow-400 bg-yellow-400/20',
    red: 'text-red-400 bg-red-400/20',
    blue: 'text-blue-400 bg-blue-400/20',
  }

  return (
    <div className="p-4 bg-gray-800/50 rounded-xl">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon size={20} />
        </div>
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-lg font-semibold text-white">{value}</p>
          {subValue && <p className="text-xs text-gray-400">{subValue}</p>}
        </div>
      </div>
    </div>
  )
}

// Componente para recomendação
function RecommendationCard({
  type,
  message,
  category,
}: {
  type: string
  message: string
  category?: string
}) {
  const typeConfig = {
    success: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/30' },
    warning: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30' },
    alert: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/30' },
    info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/30' },
  }

  const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.info
  const Icon = config.icon

  return (
    <div className={`p-4 rounded-xl border ${config.bg}`}>
      <div className="flex items-start gap-3">
        <Icon size={20} className={`${config.color} mt-0.5 flex-shrink-0`} />
        <div>
          {category && (
            <span className={`text-xs font-medium ${config.color} uppercase`}>{category}</span>
          )}
          <p className="text-sm text-gray-300">{message}</p>
        </div>
      </div>
    </div>
  )
}

// Types for analysis results
interface VegetationCoverage {
  vegetation_percentage?: number
  soil_percentage?: number
  mean_exg?: number
}

interface VegetationHealth {
  health_index?: number
  healthy_percentage?: number
  moderate_percentage?: number
  stressed_percentage?: number
}

interface DetectionResults {
  total_detections?: number
  by_class?: Record<string, number>
  avg_confidence?: number
  detections?: Array<{
    class: string
    confidence: number
    bbox: [number, number, number, number]
  }>
}

interface TemporalSummary {
  total_frames_analyzed?: number
  vegetation?: {
    mean_percentage?: number
    min_percentage?: number
    max_percentage?: number
    trend?: string
  }
  health?: {
    mean_index?: number
  }
  land_use_average?: Record<string, number>
}

interface Recommendation {
  type: string
  message: string
  category?: string
}

export default function AnalysisResults({
  analysis,
  onExportPDF,
  isExporting = false,
}: AnalysisResultsProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['summary', 'vegetation', 'recommendations'])
  )

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  const results = analysis.results || {}

  // Extrair dados com tipos adequados
  const coverage: VegetationCoverage = (results.vegetation_coverage || results.coverage || {}) as VegetationCoverage
  const health: VegetationHealth = (results.vegetation_health || results.health || {}) as VegetationHealth
  const landUse = (results.land_use || results.land_use_percentages || {}) as Record<string, number>
  const summary = (results.summary || {}) as Record<string, unknown>
  const recommendations = (results.recommendations || []) as Recommendation[]
  const detections: DetectionResults = (results.detections || {}) as DetectionResults
  const temporalSummary = results.temporal_summary as TemporalSummary | undefined

  // Determinar cor da saúde
  const healthIndex = health.health_index || (summary.health_index as number) || 0
  const healthColor = healthIndex >= 70 ? 'green' : healthIndex >= 40 ? 'yellow' : 'red'

  return (
    <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
        <div>
          <h3 className="text-white font-semibold">Resultados da Análise</h3>
          <p className="text-sm text-gray-400">
            {analysis.analysis_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
          </p>
        </div>
        {onExportPDF && (
          <button
            onClick={onExportPDF}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-[#6AAF3D] hover:bg-[#5a9a34] disabled:bg-gray-600 text-white rounded-lg transition-colors"
          >
            {isExporting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <Download size={16} />
                Exportar PDF
              </>
            )}
          </button>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Resumo */}
        <div className="border border-gray-700/50 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection('summary')}
            className="w-full flex items-center justify-between p-4 bg-gray-800/30 hover:bg-gray-800/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <BarChart3 size={18} className="text-[#6AAF3D]" />
              <span className="text-white font-medium">Resumo</span>
            </div>
            {expandedSections.has('summary') ? (
              <ChevronUp size={18} className="text-gray-400" />
            ) : (
              <ChevronDown size={18} className="text-gray-400" />
            )}
          </button>

          {expandedSections.has('summary') && (
            <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                icon={Leaf}
                label="Vegetação"
                value={`${(coverage.vegetation_percentage || (summary.vegetation_percentage as number) || 0).toFixed(1)}%`}
                color="green"
              />
              <MetricCard
                icon={Trees}
                label="Saúde"
                value={`${healthIndex.toFixed(0)}%`}
                color={healthColor}
              />
              {health.healthy_percentage !== undefined && (
                <MetricCard
                  icon={CheckCircle}
                  label="Saudável"
                  value={`${health.healthy_percentage.toFixed(1)}%`}
                  color="green"
                />
              )}
              {health.stressed_percentage !== undefined && health.stressed_percentage > 0 && (
                <MetricCard
                  icon={AlertTriangle}
                  label="Estressada"
                  value={`${health.stressed_percentage.toFixed(1)}%`}
                  color="red"
                />
              )}
            </div>
          )}
        </div>

        {/* Vegetação */}
        {(Object.keys(coverage).length > 0 || Object.keys(health).length > 0) && (
          <div className="border border-gray-700/50 rounded-xl overflow-hidden">
            <button
              onClick={() => toggleSection('vegetation')}
              className="w-full flex items-center justify-between p-4 bg-gray-800/30 hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Trees size={18} className="text-green-400" />
                <span className="text-white font-medium">Análise de Vegetação</span>
              </div>
              {expandedSections.has('vegetation') ? (
                <ChevronUp size={18} className="text-gray-400" />
              ) : (
                <ChevronDown size={18} className="text-gray-400" />
              )}
            </button>

            {expandedSections.has('vegetation') && (
              <div className="p-4 space-y-4">
                {/* Cobertura */}
                {Object.keys(coverage).length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-3">Cobertura</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-gray-800/30 rounded-lg">
                        <p className="text-xs text-gray-500">Vegetação</p>
                        <p className="text-xl font-bold text-[#6AAF3D]">
                          {(coverage.vegetation_percentage || 0).toFixed(1)}%
                        </p>
                      </div>
                      <div className="p-3 bg-gray-800/30 rounded-lg">
                        <p className="text-xs text-gray-500">Solo Exposto</p>
                        <p className="text-xl font-bold text-amber-400">
                          {(coverage.soil_percentage || 0).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Saúde */}
                {Object.keys(health).length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-3">Saúde da Vegetação</h4>
                    <SimpleBarChart
                      data={{
                        'Saudável': health.healthy_percentage || 0,
                        'Moderada': health.moderate_percentage || 0,
                        'Estressada': health.stressed_percentage || 0,
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Uso do Solo */}
        {Object.keys(landUse).length > 0 && (
          <div className="border border-gray-700/50 rounded-xl overflow-hidden">
            <button
              onClick={() => toggleSection('landUse')}
              className="w-full flex items-center justify-between p-4 bg-gray-800/30 hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <PieChart size={18} className="text-purple-400" />
                <span className="text-white font-medium">Uso do Solo</span>
              </div>
              {expandedSections.has('landUse') ? (
                <ChevronUp size={18} className="text-gray-400" />
              ) : (
                <ChevronDown size={18} className="text-gray-400" />
              )}
            </button>

            {expandedSections.has('landUse') && (
              <div className="p-4">
                <SimpleBarChart data={landUse as Record<string, number>} />
              </div>
            )}
          </div>
        )}

        {/* Detecções */}
        {detections.detections && detections.detections.length > 0 && (
          <div className="border border-gray-700/50 rounded-xl overflow-hidden">
            <button
              onClick={() => toggleSection('detections')}
              className="w-full flex items-center justify-between p-4 bg-gray-800/30 hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Eye size={18} className="text-blue-400" />
                <span className="text-white font-medium">
                  Detecções ({detections.total_detections || detections.detections.length})
                </span>
              </div>
              {expandedSections.has('detections') ? (
                <ChevronUp size={18} className="text-gray-400" />
              ) : (
                <ChevronDown size={18} className="text-gray-400" />
              )}
            </button>

            {expandedSections.has('detections') && (
              <div className="p-4">
                {detections.by_class && (
                  <SimpleBarChart
                    data={detections.by_class}
                    title="Contagem por Classe"
                  />
                )}
                <p className="text-xs text-gray-500 mt-3">
                  Confiança média: {((detections.avg_confidence || 0) * 100).toFixed(1)}%
                </p>
              </div>
            )}
          </div>
        )}

        {/* Resumo Temporal (Vídeo) */}
        {temporalSummary && (
          <div className="border border-gray-700/50 rounded-xl overflow-hidden">
            <button
              onClick={() => toggleSection('temporal')}
              className="w-full flex items-center justify-between p-4 bg-gray-800/30 hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Grid size={18} className="text-cyan-400" />
                <span className="text-white font-medium">Análise Temporal</span>
              </div>
              {expandedSections.has('temporal') ? (
                <ChevronUp size={18} className="text-gray-400" />
              ) : (
                <ChevronDown size={18} className="text-gray-400" />
              )}
            </button>

            {expandedSections.has('temporal') && (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="p-3 bg-gray-800/30 rounded-lg">
                    <p className="text-xs text-gray-500">Frames Analisados</p>
                    <p className="text-xl font-bold text-white">
                      {temporalSummary.total_frames_analyzed || 0}
                    </p>
                  </div>
                  {temporalSummary.vegetation && (
                    <>
                      <div className="p-3 bg-gray-800/30 rounded-lg">
                        <p className="text-xs text-gray-500">Vegetação Média</p>
                        <p className="text-xl font-bold text-[#6AAF3D]">
                          {(temporalSummary.vegetation.mean_percentage || 0).toFixed(1)}%
                        </p>
                      </div>
                      <div className="p-3 bg-gray-800/30 rounded-lg">
                        <p className="text-xs text-gray-500">Tendência</p>
                        <p className="text-xl font-bold text-white capitalize">
                          {temporalSummary.vegetation.trend === 'increasing'
                            ? 'Crescente'
                            : temporalSummary.vegetation.trend === 'decreasing'
                            ? 'Decrescente'
                            : 'Estável'}
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {temporalSummary.land_use_average && (
                  <SimpleBarChart
                    data={temporalSummary.land_use_average}
                    title="Uso do Solo (Média)"
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* Recomendações */}
        {recommendations.length > 0 && (
          <div className="border border-gray-700/50 rounded-xl overflow-hidden">
            <button
              onClick={() => toggleSection('recommendations')}
              className="w-full flex items-center justify-between p-4 bg-gray-800/30 hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Info size={18} className="text-yellow-400" />
                <span className="text-white font-medium">Recomendações</span>
              </div>
              {expandedSections.has('recommendations') ? (
                <ChevronUp size={18} className="text-gray-400" />
              ) : (
                <ChevronDown size={18} className="text-gray-400" />
              )}
            </button>

            {expandedSections.has('recommendations') && (
              <div className="p-4 space-y-3">
                {recommendations.map((rec: Recommendation, i: number) => (
                  <RecommendationCard
                    key={i}
                    type={rec.type}
                    message={rec.message}
                    category={rec.category}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Informações de Processamento */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-2">
          <span>
            Análise #{analysis.id} - {analysis.status}
          </span>
          {analysis.processing_time_seconds && (
            <span>Processado em {analysis.processing_time_seconds.toFixed(2)}s</span>
          )}
        </div>
      </div>
    </div>
  )
}

// Exportar componentes auxiliares
export { DetectionBox, SimpleBarChart, MetricCard, RecommendationCard }
