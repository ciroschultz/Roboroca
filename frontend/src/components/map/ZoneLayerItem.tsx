'use client'

import { Eye, EyeOff, Play, Pencil, Trash2, Loader2, Leaf, Trees, CheckCircle, Bug } from 'lucide-react'

export interface ZoneData {
  id: number
  annotation_type: string
  data: {
    points: number[][]
    label: string
    color: string
    fill_opacity: number
    pattern: string
    crop_type: string
    area_m2: number
    area_ha: number
    analysis_results?: {
      vegetation?: { vegetation_percentage?: number }
      health?: { health_index?: number }
      plant_count?: { total_count?: number }
      pest_disease?: { infection_rate?: number }
      biomass?: { biomass_index?: number }
    }
  }
}

interface ZoneLayerItemProps {
  zone: ZoneData
  isSelected: boolean
  isVisible: boolean
  isAnalyzing: boolean
  onSelect: () => void
  onToggleVisibility: () => void
  onAnalyze: () => void
  onEdit: () => void
  onDelete: () => void
}

const CROP_LABELS: Record<string, string> = {
  corn: 'Milho',
  soy: 'Soja',
  cotton: 'Algodao',
  coffee: 'Cafe',
  sugarcane: 'Cana',
  rice: 'Arroz',
  wheat: 'Trigo',
  pasture: 'Pastagem',
  forest: 'Floresta',
  other: 'Outro',
}

export default function ZoneLayerItem({
  zone,
  isSelected,
  isVisible,
  isAnalyzing,
  onSelect,
  onToggleVisibility,
  onAnalyze,
  onEdit,
  onDelete,
}: ZoneLayerItemProps) {
  const results = zone.data.analysis_results
  const cropLabel = CROP_LABELS[zone.data.crop_type] || zone.data.crop_type

  return (
    <div
      className={`rounded-lg transition-colors cursor-pointer ${
        isSelected
          ? 'bg-gray-700/70 border border-gray-500'
          : 'bg-gray-800/40 border border-transparent hover:bg-gray-800/60'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center gap-2 p-2">
        {/* Color dot */}
        <div
          className="w-3 h-3 rounded-full shrink-0 border border-white/30"
          style={{ backgroundColor: zone.data.color }}
        />

        {/* Name + crop badge */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm truncate ${isVisible ? 'text-white' : 'text-gray-500'}`}>
            {zone.data.label}
          </p>
          <span className="text-[10px] text-gray-400 bg-gray-700/60 px-1.5 py-0.5 rounded-full">
            {cropLabel}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={e => { e.stopPropagation(); onToggleVisibility() }}
            className="p-1 hover:bg-gray-600 rounded"
            title={isVisible ? 'Ocultar' : 'Mostrar'}
          >
            {isVisible ? (
              <Eye size={14} className="text-[#6AAF3D]" />
            ) : (
              <EyeOff size={14} className="text-gray-500" />
            )}
          </button>
          <button
            onClick={e => { e.stopPropagation(); onAnalyze() }}
            className="p-1 hover:bg-gray-600 rounded"
            title="Analisar zona"
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <Loader2 size={14} className="text-blue-400 animate-spin" />
            ) : (
              <Play size={14} className="text-blue-400" />
            )}
          </button>
          <button
            onClick={e => { e.stopPropagation(); onEdit() }}
            className="p-1 hover:bg-gray-600 rounded"
            title="Editar zona"
          >
            <Pencil size={14} className="text-gray-400" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete() }}
            className="p-1 hover:bg-red-500/20 rounded"
            title="Excluir zona"
          >
            <Trash2 size={14} className="text-red-400" />
          </button>
        </div>
      </div>

      {/* Inline results when analyzed */}
      {results && isVisible && (
        <div className="px-2 pb-2 grid grid-cols-2 gap-1">
          {results.vegetation && (
            <div className="flex items-center gap-1 text-[10px] text-gray-300 bg-gray-700/30 px-1.5 py-1 rounded">
              <Leaf size={10} className="text-[#6AAF3D] shrink-0" />
              {(results.vegetation.vegetation_percentage ?? 0).toFixed(0)}% veg
            </div>
          )}
          {results.health && (
            <div className="flex items-center gap-1 text-[10px] text-gray-300 bg-gray-700/30 px-1.5 py-1 rounded">
              <CheckCircle size={10} className="text-yellow-400 shrink-0" />
              {(results.health.health_index ?? 0).toFixed(0)}% saude
            </div>
          )}
          {results.plant_count && (
            <div className="flex items-center gap-1 text-[10px] text-gray-300 bg-gray-700/30 px-1.5 py-1 rounded">
              <Trees size={10} className="text-green-400 shrink-0" />
              {results.plant_count.total_count ?? 0} arv
            </div>
          )}
          {results.pest_disease && (
            <div className="flex items-center gap-1 text-[10px] text-gray-300 bg-gray-700/30 px-1.5 py-1 rounded">
              <Bug size={10} className="text-red-400 shrink-0" />
              {(results.pest_disease.infection_rate ?? 0).toFixed(1)}%
            </div>
          )}
        </div>
      )}
    </div>
  )
}
