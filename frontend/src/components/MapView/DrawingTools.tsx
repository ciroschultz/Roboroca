'use client'

import {
  MousePointer, MapPin, PenTool, Target, Ruler, Trash2, Palette, Info,
  Globe, Save, Download, Minimize2, Maximize2, Loader2,
} from 'lucide-react'
import { Hexagon } from 'lucide-react'
import type { DrawingTool } from './types'

interface DrawingToolsProps {
  activeTool: DrawingTool
  setActiveTool: (tool: DrawingTool) => void
  selectedColor: string
  setSelectedColor: (color: string) => void
  showColorPicker: boolean
  setShowColorPicker: (show: boolean | ((v: boolean) => boolean)) => void
  colorPickerRef: React.RefObject<HTMLDivElement>
  annotationColors: string[]
  showInfoPanel: boolean
  setShowInfoPanel: (show: boolean) => void
  exportingGeoJSON: boolean
  handleExportGeoJSON: () => void
  savingScreenshot: boolean
  handleSaveScreenshot: () => void
  handleExportImage: () => void
  toggleFullscreen: () => void
  isFullscreen: boolean
  currentImageUrl: string | null
  hasSelectedImage: boolean
  onBack: () => void
}

export default function DrawingTools({
  activeTool, setActiveTool, selectedColor, setSelectedColor,
  showColorPicker, setShowColorPicker, colorPickerRef, annotationColors,
  showInfoPanel, setShowInfoPanel,
  exportingGeoJSON, handleExportGeoJSON,
  savingScreenshot, handleSaveScreenshot,
  handleExportImage, toggleFullscreen, isFullscreen,
  currentImageUrl, hasSelectedImage, onBack,
}: DrawingToolsProps) {
  return (
    <div className="absolute top-14 left-4 right-4 z-20 flex items-start justify-between gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={onBack}
          className="px-3 py-2 bg-gray-800/90 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors flex items-center gap-2 shrink-0"
        >
          ← Voltar
        </button>

        <div className="flex items-center gap-0.5 bg-gray-800/90 rounded-lg p-1 flex-wrap">
          <button
            onClick={() => setActiveTool('select')}
            className={`p-1.5 rounded transition-colors ${activeTool === 'select' ? 'bg-[#6AAF3D] text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
            title="Selecionar (S)"
          >
            <MousePointer size={16} />
          </button>
          <button
            onClick={() => setActiveTool('point')}
            className={`p-1.5 rounded transition-colors ${activeTool === 'point' ? 'bg-[#6AAF3D] text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
            title="Marcador (P)"
          >
            <MapPin size={16} />
          </button>
          <button
            onClick={() => setActiveTool('polygon')}
            className={`p-1.5 rounded transition-colors ${activeTool === 'polygon' ? 'bg-[#6AAF3D] text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
            title="Poligono"
          >
            <PenTool size={16} />
          </button>
          <button
            onClick={() => setActiveTool('roi')}
            className={`p-1.5 rounded transition-colors ${activeTool === 'roi' ? 'bg-blue-500 text-white' : 'text-blue-400 hover:text-white hover:bg-gray-700'}`}
            title="ROI"
          >
            <Target size={16} />
          </button>
          <div className="w-px h-5 bg-gray-600" />
          <button
            onClick={() => setActiveTool('zone')}
            className={`p-1.5 rounded transition-colors ${activeTool === 'zone' ? 'bg-orange-500 text-white' : 'text-orange-400 hover:text-white hover:bg-gray-700'}`}
            title="Zona de cultivo"
          >
            <Hexagon size={16} />
          </button>
          <div className="w-px h-5 bg-gray-600" />
          <button
            onClick={() => setActiveTool('measurement')}
            className={`p-1.5 rounded transition-colors ${activeTool === 'measurement' ? 'bg-[#6AAF3D] text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
            title="Medir distancia"
          >
            <Ruler size={16} />
          </button>
          <button
            onClick={() => setActiveTool('eraser')}
            className={`p-1.5 rounded transition-colors ${activeTool === 'eraser' ? 'bg-red-500 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
            title="Apagar"
          >
            <Trash2 size={16} />
          </button>

          <div className="w-px h-5 bg-gray-600" />
          <div className="relative" ref={colorPickerRef}>
            <button
              onClick={() => setShowColorPicker((v: boolean) => !v)}
              className={`p-1.5 rounded transition-colors ${showColorPicker ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
              title="Selecionar cor"
            >
              <Palette size={16} style={{ color: selectedColor }} />
            </button>
            {showColorPicker && (
              <div className="absolute top-full left-0 mt-2 p-2 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50 grid grid-cols-4 gap-1.5 min-w-[140px]">
                {annotationColors.map(color => (
                  <button
                    key={color}
                    onClick={() => { setSelectedColor(color); setShowColorPicker(false) }}
                    className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-110 ${selectedColor === color ? 'border-white scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => setShowInfoPanel(!showInfoPanel)}
          className={`p-1.5 rounded-lg transition-colors ${showInfoPanel ? 'bg-[#6AAF3D] text-white' : 'bg-gray-800/90 text-white hover:bg-gray-700'}`}
          title="Info"
        >
          <Info size={16} />
        </button>
        <button
          onClick={handleExportGeoJSON}
          disabled={exportingGeoJSON || !hasSelectedImage}
          className="p-1.5 bg-gray-800/90 hover:bg-gray-700 disabled:opacity-50 text-white rounded-lg transition-colors"
          title="Exportar GeoJSON"
        >
          {exportingGeoJSON ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16} />}
        </button>
        <button
          onClick={handleSaveScreenshot}
          disabled={savingScreenshot || !currentImageUrl}
          className="p-1.5 bg-gray-800/90 hover:bg-gray-700 disabled:opacity-50 text-white rounded-lg transition-colors"
          title="Salvar imagem com anotacoes"
        >
          {savingScreenshot ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        </button>
        <button
          onClick={handleExportImage}
          disabled={!currentImageUrl}
          className="p-1.5 bg-gray-800/90 hover:bg-gray-700 disabled:opacity-50 text-white rounded-lg transition-colors"
          title="Download imagem original"
        >
          <Download size={16} />
        </button>
        <button
          onClick={toggleFullscreen}
          className="p-1.5 bg-gray-800/90 hover:bg-gray-700 text-white rounded-lg transition-colors"
          title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
        >
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </div>
    </div>
  )
}
