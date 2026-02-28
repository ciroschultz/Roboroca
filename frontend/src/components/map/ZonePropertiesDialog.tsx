'use client'

import { useState } from 'react'
import { X, Palette } from 'lucide-react'

const CROP_TYPES = [
  { value: 'corn', label: 'Milho' },
  { value: 'soy', label: 'Soja' },
  { value: 'cotton', label: 'Algodao' },
  { value: 'coffee', label: 'Cafe' },
  { value: 'sugarcane', label: 'Cana' },
  { value: 'rice', label: 'Arroz' },
  { value: 'wheat', label: 'Trigo' },
  { value: 'pasture', label: 'Pastagem' },
  { value: 'forest', label: 'Floresta' },
  { value: 'other', label: 'Outro' },
]

const FILL_PATTERNS = [
  { value: 'solid', label: 'Solido' },
  { value: 'hatched', label: 'Hachurado' },
  { value: 'dashed', label: 'Tracejado' },
]

const ZONE_COLORS = ['#FF6B35', '#00B4D8', '#06D6A0', '#FFD166', '#EF476F', '#118AB2', '#8338EC', '#3A86FF']

export interface ZoneFormData {
  label: string
  crop_type: string
  color: string
  fill_opacity: number
  pattern: string
  points: number[][]
  area_m2: number
  area_ha: number
}

interface ZonePropertiesDialogProps {
  points: number[][]
  areaM2: number
  initialData?: Partial<ZoneFormData>
  onSave: (data: ZoneFormData) => void
  onCancel: () => void
}

export default function ZonePropertiesDialog({
  points,
  areaM2,
  initialData,
  onSave,
  onCancel,
}: ZonePropertiesDialogProps) {
  const [label, setLabel] = useState(initialData?.label || '')
  const [cropType, setCropType] = useState(initialData?.crop_type || 'corn')
  const [color, setColor] = useState(initialData?.color || ZONE_COLORS[0])
  const [pattern, setPattern] = useState(initialData?.pattern || 'solid')
  const [fillOpacity, setFillOpacity] = useState(initialData?.fill_opacity ?? 0.3)

  const areaHa = areaM2 / 10000

  const handleSave = () => {
    const finalLabel = label.trim() || `Zona - ${CROP_TYPES.find(c => c.value === cropType)?.label || cropType}`
    onSave({
      label: finalLabel,
      crop_type: cropType,
      color,
      fill_opacity: fillOpacity,
      pattern,
      points,
      area_m2: areaM2,
      area_ha: areaHa,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-gray-800 rounded-xl border border-gray-600 shadow-2xl w-[380px] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h3 className="text-white font-semibold">Nova Zona de Cultivo</h3>
          <button onClick={onCancel} className="p-1 hover:bg-gray-700 rounded">
            <X size={16} className="text-gray-400" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Nome */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Nome da Zona</label>
            <input
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="Ex: Talhao 1 - Milho"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-[#6AAF3D]"
              autoFocus
            />
          </div>

          {/* Tipo de cultura */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Tipo de Cultura</label>
            <select
              value={cropType}
              onChange={e => setCropType(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-[#6AAF3D]"
            >
              {CROP_TYPES.map(ct => (
                <option key={ct.value} value={ct.value}>{ct.label}</option>
              ))}
            </select>
          </div>

          {/* Cor */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Cor</label>
            <div className="flex items-center gap-2">
              {ZONE_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-110 ${
                    color === c ? 'border-white scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Padrao de preenchimento */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Padrao de Preenchimento</label>
            <select
              value={pattern}
              onChange={e => setPattern(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-[#6AAF3D]"
            >
              {FILL_PATTERNS.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Opacidade */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Opacidade: {Math.round(fillOpacity * 100)}%</label>
            <input
              type="range"
              min="0.1"
              max="0.8"
              step="0.05"
              value={fillOpacity}
              onChange={e => setFillOpacity(parseFloat(e.target.value))}
              className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Area calculada */}
          <div className="p-3 bg-gray-700/50 rounded-lg">
            <p className="text-xs text-gray-400">Area Calculada</p>
            <p className="text-white font-medium">
              {areaM2 >= 10000
                ? `${areaHa.toFixed(2)} ha`
                : `${areaM2.toFixed(1)} m²`}
              {areaM2 >= 10000 && (
                <span className="text-gray-400 text-xs ml-2">({areaM2.toFixed(0)} m²)</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex gap-2 p-4 border-t border-gray-700">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-[#6AAF3D] hover:bg-[#5a9a34] text-white text-sm font-medium rounded-lg transition-colors"
          >
            Salvar Zona
          </button>
        </div>
      </div>
    </div>
  )
}
