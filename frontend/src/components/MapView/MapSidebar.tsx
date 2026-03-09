'use client'

import {
  Layers, Eye, EyeOff, Loader2, Leaf, Trees, CheckCircle, Play, Image as ImageIcon,
} from 'lucide-react'
import { Hexagon } from 'lucide-react'
import ZoneLayerItem from '@/components/map/ZoneLayerItem'
import type { Layer, AnalysisSummary, Project } from './types'
import type { ZoneData } from '@/components/map/ZoneLayerItem'

interface MapSidebarProps {
  layers: Layer[]
  showLayers: boolean
  setShowLayers: (v: boolean) => void
  showOriginalImage: boolean
  setShowOriginalImage: (v: boolean) => void
  toggleLayer: (id: string) => void
  updateOpacity: (id: string, opacity: number) => void
  selectedProject: Project | null
  analysisSummary: AnalysisSummary | null
  fullReportData: Record<string, unknown> | null
  zones: ZoneData[]
  selectedZoneId: number | null
  setSelectedZoneId: (id: number | null) => void
  zoneAnalyzing: Set<number>
  zoneVisibility: Record<number, boolean>
  editingVertices: boolean
  setEditingVertices: (v: boolean) => void
  toggleZoneVisibility: (id: number) => void
  analyzeZone: (zone: ZoneData) => void
  analyzeAllZones: () => void
  editZone: (zone: ZoneData) => void
  deleteZone: (id: number) => void
  getHealthColor: (health: number) => string
  getHealthLabel: (health: number) => string
}

export default function MapSidebar({
  layers, showLayers, setShowLayers, showOriginalImage, setShowOriginalImage,
  toggleLayer, updateOpacity, selectedProject, analysisSummary, fullReportData,
  zones, selectedZoneId, setSelectedZoneId, zoneAnalyzing, zoneVisibility,
  editingVertices, setEditingVertices, toggleZoneVisibility,
  analyzeZone, analyzeAllZones, editZone, deleteZone,
  getHealthColor, getHealthLabel,
}: MapSidebarProps) {
  const getLayerSummary = (layer: Layer): string | null => {
    if (layer.id === 'perimeter' && selectedProject?.perimeter_polygon) return `${selectedProject.perimeter_polygon.length} vértices`
    if (layer.id === 'vegetation' && analysisSummary && analysisSummary.vegetation_coverage_avg > 0) return `${analysisSummary.vegetation_coverage_avg.toFixed(1)}%`
    if (layer.id === 'health' && analysisSummary && analysisSummary.health_index_avg > 0) return `${analysisSummary.health_index_avg.toFixed(1)} índice`
    if (layer.id === 'trees' && fullReportData) {
      const pc = (fullReportData as any)?.plant_count || (fullReportData as any)?.tree_count
      const total = pc?.total_trees || pc?.estimated_count || 0
      if (total > 0) return `${total} árvores`
    }
    if (layer.id === 'pests' && fullReportData) {
      const pd = (fullReportData as any)?.pest_disease
      const rate = pd?.infection_rate || 0
      if (rate > 0) return `${rate.toFixed(1)}% infecção`
    }
    return null
  }

  return (
    <div className="w-72 border-l border-gray-700/50 bg-[#12121e] p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-white font-medium">Camadas</h4>
        <button onClick={() => setShowLayers(!showLayers)} className="p-1 hover:bg-gray-700 rounded transition-colors">
          <Layers size={16} className="text-gray-400" />
        </button>
      </div>

      <button
        onClick={() => setShowOriginalImage(!showOriginalImage)}
        className={`w-full mb-3 flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
          showOriginalImage
            ? 'bg-blue-600/20 border border-blue-500/40 text-blue-400'
            : 'bg-gray-800/50 border border-gray-700/50 text-gray-400 hover:bg-gray-700/50'
        }`}
      >
        <ImageIcon size={14} />
        {showOriginalImage ? 'Ver com Perimetro' : 'Ver Original (sem overlay)'}
      </button>

      <div className="space-y-2">
        {layers.map(layer => {
          const summary = getLayerSummary(layer)
          return (
            <div key={layer.id} className={`p-3 rounded-lg transition-colors ${layer.visible ? 'bg-gray-800/50' : 'bg-gray-900/30'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: layer.color }} />
                  <span className={`text-sm truncate ${layer.visible ? 'text-white' : 'text-gray-500'}`}>{layer.name}</span>
                  {summary && layer.visible && (
                    <span className="text-[10px] text-gray-400 bg-gray-700/50 px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0">{summary}</span>
                  )}
                </div>
                <button onClick={() => toggleLayer(layer.id)} className="p-1 hover:bg-gray-700 rounded transition-colors shrink-0" aria-pressed={layer.visible} aria-label={`Visibilidade: ${layer.name}`}>
                  {layer.visible ? <Eye size={16} className="text-[#6AAF3D]" /> : <EyeOff size={16} className="text-gray-500" />}
                </button>
              </div>
              {layer.visible && (
                <div className="flex items-center gap-2 mt-2">
                  <input type="range" min="0" max="100" value={layer.opacity} onChange={(e) => updateOpacity(layer.id, parseInt(e.target.value))} className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer" aria-label={`Opacidade: ${layer.name}`} />
                  <span className="text-xs text-gray-400 w-8">{layer.opacity}%</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Zones */}
      <div className="mt-4 pt-4 border-t border-gray-700/50">
        <div className="flex items-center justify-between mb-2">
          <h5 className="text-white text-sm font-medium flex items-center gap-2">
            <Hexagon size={14} className="text-orange-400" />
            Zonas de Cultivo
            {zones.length > 0 && <span className="text-[10px] text-gray-400 bg-gray-700/50 px-1.5 py-0.5 rounded-full">{zones.length}</span>}
          </h5>
        </div>
        {zones.length === 0 ? (
          <p className="text-gray-500 text-xs mb-2">
            Use a ferramenta <Hexagon size={12} className="inline text-orange-400" /> para desenhar zonas
          </p>
        ) : (
          <div className="space-y-1 mb-2">
            {zones.map(zone => (
              <ZoneLayerItem
                key={zone.id}
                zone={zone}
                isSelected={selectedZoneId === zone.id}
                isVisible={zoneVisibility[zone.id] ?? true}
                isAnalyzing={zoneAnalyzing.has(zone.id)}
                onSelect={() => { setSelectedZoneId(selectedZoneId === zone.id ? null : zone.id); setEditingVertices(false) }}
                onToggleVisibility={() => toggleZoneVisibility(zone.id)}
                onAnalyze={() => analyzeZone(zone)}
                onEdit={() => editZone(zone)}
                onDelete={() => deleteZone(zone.id)}
              />
            ))}
          </div>
        )}
        {selectedZoneId && (
          <button
            onClick={() => setEditingVertices(!editingVertices)}
            className={`w-full mb-2 px-3 py-1.5 text-xs rounded-lg transition-colors flex items-center justify-center gap-1 ${
              editingVertices ? 'bg-orange-500/20 border border-orange-500/40 text-orange-400' : 'bg-gray-800/50 border border-gray-700/50 text-gray-400 hover:bg-gray-700/50'
            }`}
          >
            {editingVertices ? 'Finalizar Edicao' : 'Editar Vertices'}
          </button>
        )}
        {zones.length > 0 && zones.some(z => !z.data.analysis_results) && (
          <button
            onClick={analyzeAllZones}
            disabled={zoneAnalyzing.size > 0}
            className="w-full px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-400 text-xs rounded-lg transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
          >
            {zoneAnalyzing.size > 0 ? (<><Loader2 size={12} className="animate-spin" /> Analisando...</>) : (<><Play size={12} /> Analisar Todas as Zonas</>)}
          </button>
        )}
      </div>

      {/* Analysis summary */}
      <div className="mt-6 pt-4 border-t border-gray-700/50">
        <h5 className="text-white text-sm font-medium mb-3 flex items-center gap-2">
          Análise do Projeto
          {analysisSummary && (analysisSummary.pending_images > 0 || analysisSummary.status === 'processing') && (
            <span className="flex items-center gap-1 text-xs text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-full">
              <Loader2 size={12} className="animate-spin" /> Processando...
            </span>
          )}
        </h5>
        {analysisSummary ? (
          <div className="space-y-3">
            {analysisSummary.pending_images > 0 && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-yellow-400 text-xs font-medium">Análise em andamento</span>
                  <span className="text-yellow-300 text-xs">{analysisSummary.analyzed_images}/{analysisSummary.total_images}</span>
                </div>
                <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-500 transition-all duration-500" style={{ width: `${analysisSummary.total_images > 0 ? (analysisSummary.analyzed_images / analysisSummary.total_images) * 100 : 0}%` }} />
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 p-2 bg-gray-800/30 rounded-lg">
              <Leaf className="text-[#6AAF3D]" size={18} />
              <div><p className="text-xs text-gray-500">Cobertura Vegetal</p><p className="text-white font-medium">{analysisSummary.vegetation_coverage_avg > 0 ? `${analysisSummary.vegetation_coverage_avg.toFixed(1)}%` : 'N/A'}</p></div>
            </div>
            <div className="flex items-center gap-3 p-2 bg-gray-800/30 rounded-lg">
              <Trees className="text-blue-400" size={18} />
              <div><p className="text-xs text-gray-500">Imagens Analisadas</p><p className="text-white font-medium">{analysisSummary.analyzed_images} / {analysisSummary.total_images}</p></div>
            </div>
            <div className="flex items-center gap-3 p-2 bg-gray-800/30 rounded-lg">
              <CheckCircle className={getHealthColor(analysisSummary.health_index_avg)} size={18} />
              <div><p className="text-xs text-gray-500">Índice de Saúde</p><p className={`font-medium ${getHealthColor(analysisSummary.health_index_avg)}`}>{analysisSummary.health_index_avg > 0 ? `${analysisSummary.health_index_avg.toFixed(0)}% - ${getHealthLabel(analysisSummary.health_index_avg)}` : 'N/A'}</p></div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-gray-500 text-sm">Nenhuma análise disponível</p>
            <p className="text-gray-600 text-xs mt-1">Execute uma análise nas imagens do projeto</p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-gray-700/50">
        <h5 className="text-white text-sm font-medium mb-3">Legenda - Saúde</h5>
        <div className="space-y-2">
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-green-500" /><span className="text-xs text-gray-400">Saudável (≥70%)</span></div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-yellow-500" /><span className="text-xs text-gray-400">Moderado (40-69%)</span></div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-red-500" /><span className="text-xs text-gray-400">Crítico (&lt;40%)</span></div>
        </div>
      </div>
    </div>
  )
}
