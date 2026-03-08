'use client'

import {
  Target, Leaf, Trees, CheckCircle, Bug, Loader2, X, Info, Play, Pencil, Trash2, Layers,
} from 'lucide-react'
import type { Annotation, ImageAnalysis, ImageGSD, ProjectImage } from './types'
import type { DrawingTool } from './types'

interface ROIPanelProps {
  roiPolygon: number[][] | null
  roiResults: Record<string, unknown> | null
  roiAnalyzing: boolean
  roiAnalyses: string[]
  setRoiAnalyses: (fn: (prev: string[]) => string[]) => void
  handleAnalyzeROI: () => void
  clearROI: () => void
  imageGSD: ImageGSD | null
}

export function ROIPanel({
  roiPolygon, roiResults, roiAnalyzing, roiAnalyses, setRoiAnalyses, handleAnalyzeROI, clearROI, imageGSD,
}: ROIPanelProps) {
  if (!roiPolygon || roiPolygon.length < 3) return null

  return (
    <div className="absolute top-[110px] left-4 z-20 w-64">
      {!roiResults ? (
        <div className="bg-gray-800/95 rounded-xl border border-blue-500/50 p-4 shadow-xl">
          <h4 className="text-blue-400 font-medium text-sm mb-3 flex items-center gap-2">
            <Target size={16} /> Analisar Area ROI
          </h4>
          <div className="space-y-2 mb-3">
            {['vegetation', 'health', 'plant_count', 'pest_disease', 'biomass'].map(a => (
              <label key={a} className="flex items-center gap-2 text-xs text-gray-300">
                <input
                  type="checkbox"
                  checked={roiAnalyses.includes(a)}
                  onChange={(e) => {
                    if (e.target.checked) setRoiAnalyses(prev => [...prev, a])
                    else setRoiAnalyses(prev => prev.filter(x => x !== a))
                  }}
                  className="rounded"
                />
                {a === 'vegetation' ? 'Vegetacao' : a === 'health' ? 'Saude' : a === 'plant_count' ? 'Contagem' : a === 'pest_disease' ? 'Pragas' : 'Biomassa'}
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={handleAnalyzeROI} disabled={roiAnalyzing} className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-sm rounded-lg transition-colors flex items-center justify-center gap-2">
              {roiAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <Target size={14} />}
              {roiAnalyzing ? 'Analisando...' : 'Analisar'}
            </button>
            <button onClick={clearROI} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors">Limpar</button>
          </div>
        </div>
      ) : (
        <div className="bg-gray-800/95 rounded-xl border border-blue-500/50 p-4 shadow-xl max-h-[50vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-blue-400 font-medium text-sm flex items-center gap-2"><Target size={16} /> Resultados ROI</h4>
            <button onClick={clearROI} className="p-1 hover:bg-gray-700 rounded"><X size={14} className="text-gray-400" /></button>
          </div>
          {(roiResults as any)?.roi_metadata && (
            <div className="p-2 bg-blue-500/10 rounded-lg mb-2">
              <p className="text-xs text-blue-300">
                Area: {((roiResults as any).roi_metadata.area_pixels * (imageGSD?.gsd_m || 0.03) * (imageGSD?.gsd_m || 0.03)).toFixed(1)} m²
                {' '}| Cobertura: {(roiResults as any).roi_metadata.coverage_pct}%
              </p>
            </div>
          )}
          {(roiResults as any)?.vegetation && !(roiResults as any).vegetation.error && (
            <div className="flex items-center gap-2 p-2 bg-gray-700/30 rounded-lg mb-1">
              <Leaf className="text-[#6AAF3D]" size={14} />
              <div className="flex-1"><p className="text-xs text-gray-500">Vegetacao</p><p className="text-white text-sm font-medium">{((roiResults as any).vegetation.vegetation_percentage ?? 0).toFixed(1)}%</p></div>
            </div>
          )}
          {(roiResults as any)?.health && !(roiResults as any).health.error && (
            <div className="flex items-center gap-2 p-2 bg-gray-700/30 rounded-lg mb-1">
              <CheckCircle className="text-yellow-400" size={14} />
              <div className="flex-1"><p className="text-xs text-gray-500">Saude</p><p className="text-white text-sm font-medium">{((roiResults as any).health.health_index ?? 0).toFixed(1)}%</p></div>
            </div>
          )}
          {(roiResults as any)?.plant_count && !(roiResults as any).plant_count.error && (
            <div className="flex items-center gap-2 p-2 bg-gray-700/30 rounded-lg mb-1">
              <Trees className="text-green-400" size={14} />
              <div className="flex-1"><p className="text-xs text-gray-500">Arvores no ROI</p><p className="text-white text-sm font-medium">{(roiResults as any).plant_count.total_count}</p></div>
            </div>
          )}
          {(roiResults as any)?.pest_disease && !(roiResults as any).pest_disease.error && (
            <div className="flex items-center gap-2 p-2 bg-gray-700/30 rounded-lg mb-1">
              <Bug className="text-red-400" size={14} />
              <div className="flex-1"><p className="text-xs text-gray-500">Pragas</p><p className="text-white text-sm font-medium">Infeccao: {((roiResults as any).pest_disease.infection_rate ?? 0).toFixed(1)}%</p></div>
            </div>
          )}
          {(roiResults as any)?.biomass && !(roiResults as any).biomass.error && (
            <div className="flex items-center gap-2 p-2 bg-gray-700/30 rounded-lg mb-1">
              <Leaf className="text-emerald-400" size={14} />
              <div className="flex-1"><p className="text-xs text-gray-500">Biomassa</p><p className="text-white text-sm font-medium">Indice: {((roiResults as any).biomass.biomass_index ?? 0).toFixed(1)}</p></div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface ToolInstructionBarProps {
  activeTool: DrawingTool
  toolInstructions: Record<string, string>
}

export function ToolInstructionBar({ activeTool, toolInstructions }: ToolInstructionBarProps) {
  if (activeTool === 'select' || !toolInstructions[activeTool]) return null
  return (
    <div className="absolute top-[110px] left-1/2 -translate-x-1/2 z-10 flex justify-center">
      <div className="px-4 py-2 bg-blue-600/90 text-white text-sm rounded-lg shadow-lg flex items-center gap-2">
        <Info size={16} />
        {toolInstructions[activeTool]}
      </div>
    </div>
  )
}

interface AnalyzeProjectButtonProps {
  roiPolygon: number[][] | null
  analysisSummary: { analyzed_images: number } | null
  analyzingProject: boolean
  handleAnalyzeProject: () => void
}

export function AnalyzeProjectButton({ roiPolygon, analysisSummary, analyzingProject, handleAnalyzeProject }: AnalyzeProjectButtonProps) {
  if (analyzingProject) {
    return (
      <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-20">
        <div className="px-6 py-3 bg-yellow-500/90 text-white font-semibold rounded-xl shadow-lg flex items-center gap-2 text-sm">
          <Loader2 size={18} className="animate-spin" /> Analise iniciada...
        </div>
      </div>
    )
  }
  if (roiPolygon || (analysisSummary && analysisSummary.analyzed_images === 0)) {
    return (
      <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-20">
        <button onClick={handleAnalyzeProject} className="px-6 py-3 bg-[#6AAF3D] hover:bg-[#5a9a34] text-white font-semibold rounded-xl shadow-lg shadow-[#6AAF3D]/30 transition-all flex items-center gap-2 text-sm">
          <Play size={18} /> Analisar Projeto Completo
        </button>
      </div>
    )
  }
  return null
}

interface InfoPanelProps {
  showInfoPanel: boolean
  setShowInfoPanel: (v: boolean) => void
  roiPolygon: number[][] | null
  projectImages: ProjectImage[]
  selectedImageIndex: number
  imageGSD: ImageGSD | null
  imageAnalysis: ImageAnalysis | null
  annotations: Annotation[]
  editingPointId: number | null
  setEditingPointId: (id: number | null) => void
  editingPointLabel: string
  setEditingPointLabel: (label: string) => void
  deleteAnnotation: (id: number) => void
  updatePointLabel: (id: number, label: string) => void
}

export function InfoPanel({
  showInfoPanel, setShowInfoPanel, roiPolygon, projectImages, selectedImageIndex,
  imageGSD, imageAnalysis, annotations,
  editingPointId, setEditingPointId, editingPointLabel, setEditingPointLabel,
  deleteAnnotation,
}: InfoPanelProps) {
  if (!showInfoPanel || roiPolygon || !projectImages[selectedImageIndex]) return null
  const img = projectImages[selectedImageIndex]

  return (
    <div className="absolute top-14 right-16 w-72 bg-gray-800/95 rounded-xl border border-gray-700/50 overflow-hidden shadow-xl z-20">
      <div className="flex items-center justify-between p-3 bg-gray-700/50 border-b border-gray-700/50">
        <h4 className="text-white font-medium text-sm">Informacoes da Imagem</h4>
        <button onClick={() => setShowInfoPanel(false)} className="p-1 hover:bg-gray-600 rounded"><X size={14} className="text-gray-400" /></button>
      </div>
      <div className="p-3 space-y-3 max-h-[60vh] overflow-y-auto">
        <div className="space-y-2">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Arquivo</p>
          <p className="text-white text-sm truncate">{img.original_filename}</p>
        </div>
        {img.width && img.height && (
          <div className="space-y-1">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Dimensoes</p>
            <p className="text-white text-sm">{img.width} x {img.height} px</p>
          </div>
        )}
        {img.center_lat && img.center_lon && (
          <div className="space-y-1">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Coordenadas GPS</p>
            <p className="text-white text-sm font-mono">{img.center_lat?.toFixed(6)}, {img.center_lon?.toFixed(6)}</p>
          </div>
        )}
        {imageGSD && (
          <div className="space-y-1">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Resolucao do Solo (GSD)</p>
            <p className="text-white text-sm">
              {imageGSD.gsd_cm.toFixed(2)} cm/pixel
              {imageGSD.is_estimated && <span className="text-yellow-400 text-xs ml-1">(estimado)</span>}
            </p>
          </div>
        )}
        {imageAnalysis && (
          <>
            <div className="border-t border-gray-700/50 pt-3 mt-3">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Analise ML</p>
            </div>
            {imageAnalysis.vegetation_coverage && (
              <div className="flex items-center gap-3 p-2 bg-gray-700/30 rounded-lg">
                <Leaf className="text-[#6AAF3D]" size={16} />
                <div className="flex-1"><p className="text-xs text-gray-500">Cobertura Vegetal</p><p className="text-white font-medium">{imageAnalysis.vegetation_coverage.vegetation_percentage.toFixed(1)}%</p></div>
              </div>
            )}
            {imageAnalysis.vegetation_health && (
              <div className="flex items-center gap-3 p-2 bg-gray-700/30 rounded-lg">
                <CheckCircle className={imageAnalysis.vegetation_health.health_index >= 70 ? 'text-green-400' : imageAnalysis.vegetation_health.health_index >= 40 ? 'text-yellow-400' : 'text-red-400'} size={16} />
                <div className="flex-1"><p className="text-xs text-gray-500">Indice de Saude</p><p className="text-white font-medium">{imageAnalysis.vegetation_health.health_index.toFixed(1)}%</p></div>
              </div>
            )}
            {imageAnalysis.object_detection && imageAnalysis.object_detection.total_detections > 0 && (
              <div className="flex items-center gap-3 p-2 bg-gray-700/30 rounded-lg">
                <Trees className="text-green-400" size={16} />
                <div className="flex-1"><p className="text-xs text-gray-500">Árvores Detectadas</p><p className="text-white font-medium">{imageAnalysis.object_detection.total_detections}</p></div>
              </div>
            )}
            {imageAnalysis.vegetation_type && (
              <div className="flex items-center gap-3 p-2 bg-gray-700/30 rounded-lg">
                <Layers className="text-purple-400" size={16} />
                <div className="flex-1">
                  <p className="text-xs text-gray-500">Tipo de Vegetacao</p>
                  <p className="text-white font-medium text-sm">{imageAnalysis.vegetation_type.vegetation_type}</p>
                  {imageAnalysis.vegetation_type.vegetation_density && <p className="text-gray-400 text-xs">{imageAnalysis.vegetation_type.vegetation_density}</p>}
                </div>
              </div>
            )}
          </>
        )}
        {!imageAnalysis && (
          <div className="text-center py-4"><p className="text-gray-500 text-sm">Sem analise ML disponivel</p></div>
        )}
        <div className="border-t border-gray-700/50 pt-3 mt-3">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Anotacoes ({annotations.length})</p>
          {annotations.length === 0 ? (
            <p className="text-gray-500 text-xs">Nenhuma anotacao</p>
          ) : (
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {annotations.map((ann, idx) => (
                <div key={ann.id || idx} className="flex items-center justify-between p-1.5 bg-gray-700/30 rounded text-xs">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: ann.data.color || '#FF0000' }} />
                    <span className="text-white truncate">{ann.data.label || ann.type}</span>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {ann.id && ann.type === 'point' && (
                      <button onClick={() => { setEditingPointId(ann.id!); setEditingPointLabel(ann.data.label || '') }} className="p-1 hover:bg-gray-600 rounded" title="Renomear ponto">
                        <Pencil size={12} className="text-gray-400" />
                      </button>
                    )}
                    {ann.id && (
                      <button onClick={() => deleteAnnotation(ann.id!)} className="p-1 hover:bg-red-500/20 rounded">
                        <Trash2 size={12} className="text-red-400" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
