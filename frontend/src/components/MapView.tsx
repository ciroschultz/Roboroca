'use client'

import { useState } from 'react'
import {
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Navigation,
  Ruler,
  Download,
  Eye,
  EyeOff,
  MapPin
} from 'lucide-react'

interface Layer {
  id: string
  name: string
  type: 'ndvi' | 'ndwi' | 'rgb' | 'classification' | 'height'
  visible: boolean
  opacity: number
  color: string
}

export default function MapView() {
  const [zoom, setZoom] = useState(100)
  const [showLayers, setShowLayers] = useState(true)
  const [layers, setLayers] = useState<Layer[]>([
    { id: '1', name: 'Imagem RGB', type: 'rgb', visible: true, opacity: 100, color: '#ffffff' },
    { id: '2', name: 'NDVI', type: 'ndvi', visible: false, opacity: 80, color: '#6AAF3D' },
    { id: '3', name: 'NDWI', type: 'ndwi', visible: false, opacity: 80, color: '#3B82F6' },
    { id: '4', name: 'Classificação', type: 'classification', visible: false, opacity: 70, color: '#F59E0B' },
    { id: '5', name: 'Altura', type: 'height', visible: false, opacity: 70, color: '#8B5CF6' },
  ])

  const toggleLayer = (id: string) => {
    setLayers(prev =>
      prev.map(layer =>
        layer.id === id ? { ...layer, visible: !layer.visible } : layer
      )
    )
  }

  const updateOpacity = (id: string, opacity: number) => {
    setLayers(prev =>
      prev.map(layer =>
        layer.id === id ? { ...layer, opacity } : layer
      )
    )
  }

  return (
    <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl overflow-hidden h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50">
        <h3 className="text-white font-semibold">Visualização do Mapa</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLayers(!showLayers)}
            className={`p-2 rounded-lg transition-colors ${
              showLayers ? 'bg-[#6AAF3D] text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            title="Camadas"
          >
            <Layers size={18} />
          </button>
          <button
            className="p-2 bg-gray-700 text-gray-300 hover:bg-gray-600 rounded-lg transition-colors"
            title="Medir distância"
          >
            <Ruler size={18} />
          </button>
          <button
            className="p-2 bg-gray-700 text-gray-300 hover:bg-gray-600 rounded-lg transition-colors"
            title="Adicionar marcador"
          >
            <MapPin size={18} />
          </button>
          <button
            className="p-2 bg-gray-700 text-gray-300 hover:bg-gray-600 rounded-lg transition-colors"
            title="Exportar"
          >
            <Download size={18} />
          </button>
          <button
            className="p-2 bg-gray-700 text-gray-300 hover:bg-gray-600 rounded-lg transition-colors"
            title="Tela cheia"
          >
            <Maximize2 size={18} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Área do mapa */}
        <div className="flex-1 relative bg-gray-900">
          {/* Mapa placeholder - imagem de fundo simulando mapa */}
          <div
            className="absolute inset-0 bg-cover bg-center opacity-50"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect fill='%23111827' width='100' height='100'/%3E%3Cg fill='%231f2937'%3E%3Crect width='50' height='50'/%3E%3Crect x='50' y='50' width='50' height='50'/%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />

          {/* Simulação de camadas de análise */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-64 h-64 rounded-lg bg-gradient-to-br from-[#6AAF3D]/30 via-[#87bf4f]/20 to-[#F59E0B]/30 flex items-center justify-center border border-gray-700">
                <div className="text-center">
                  <Navigation size={48} className="text-gray-500 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">Área de visualização</p>
                  <p className="text-gray-600 text-xs mt-1">Faça upload de uma imagem para visualizar</p>
                </div>
              </div>
            </div>
          </div>

          {/* Controles de zoom */}
          <div className="absolute right-4 top-4 flex flex-col gap-2">
            <button
              onClick={() => setZoom(prev => Math.min(prev + 10, 200))}
              className="p-2 bg-gray-800/80 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              <ZoomIn size={18} />
            </button>
            <div className="px-2 py-1 bg-gray-800/80 text-white text-xs text-center rounded-lg">
              {zoom}%
            </div>
            <button
              onClick={() => setZoom(prev => Math.max(prev - 10, 10))}
              className="p-2 bg-gray-800/80 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              <ZoomOut size={18} />
            </button>
          </div>

          {/* Coordenadas */}
          <div className="absolute left-4 bottom-4 px-3 py-2 bg-gray-800/80 rounded-lg text-xs text-gray-300">
            <span>Lat: -23.5505° | Lon: -46.6333°</span>
          </div>

          {/* Escala */}
          <div className="absolute right-4 bottom-4 flex items-center gap-2">
            <div className="h-1 w-20 bg-white rounded"></div>
            <span className="text-xs text-gray-300">100m</span>
          </div>
        </div>

        {/* Painel de camadas */}
        {showLayers && (
          <div className="w-64 border-l border-gray-700/50 bg-[#12121e] p-4 overflow-y-auto">
            <h4 className="text-white font-medium mb-4">Camadas</h4>
            <div className="space-y-3">
              {layers.map(layer => (
                <div
                  key={layer.id}
                  className={`p-3 rounded-lg transition-colors ${
                    layer.visible ? 'bg-gray-800/50' : 'bg-gray-900/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: layer.color }}
                      />
                      <span className={`text-sm ${layer.visible ? 'text-white' : 'text-gray-500'}`}>
                        {layer.name}
                      </span>
                    </div>
                    <button
                      onClick={() => toggleLayer(layer.id)}
                      className="p-1 hover:bg-gray-700 rounded transition-colors"
                    >
                      {layer.visible ? (
                        <Eye size={16} className="text-[#6AAF3D]" />
                      ) : (
                        <EyeOff size={16} className="text-gray-500" />
                      )}
                    </button>
                  </div>
                  {layer.visible && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Opacidade</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={layer.opacity}
                        onChange={(e) => updateOpacity(layer.id, parseInt(e.target.value))}
                        className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="text-xs text-gray-400 w-8">{layer.opacity}%</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Legenda de cores NDVI */}
            <div className="mt-6 pt-4 border-t border-gray-700/50">
              <h5 className="text-white text-sm font-medium mb-3">Legenda NDVI</h5>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#d73027' }}></div>
                  <span className="text-xs text-gray-400">Solo exposto / Sem vegetação</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#fc8d59' }}></div>
                  <span className="text-xs text-gray-400">Vegetação baixa</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#fee08b' }}></div>
                  <span className="text-xs text-gray-400">Vegetação moderada</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#d9ef8b' }}></div>
                  <span className="text-xs text-gray-400">Vegetação saudável</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#1a9850' }}></div>
                  <span className="text-xs text-gray-400">Vegetação densa</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
