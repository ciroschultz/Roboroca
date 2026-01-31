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
  MapPin,
  FolderOpen,
  Satellite,
  Crosshair,
  Circle,
  PenTool,
  Play,
  Plus,
  ChevronRight,
  Leaf,
  Droplets,
  Mountain,
  Trees,
  AlertTriangle,
  CheckCircle,
  Loader2,
} from 'lucide-react'

type MapMode = 'project' | 'gps'

interface Layer {
  id: string
  name: string
  type: 'original' | 'ndvi' | 'ndwi' | 'classification' | 'detection' | 'heatmap'
  visible: boolean
  opacity: number
  color: string
}

interface FakeProject {
  id: string
  name: string
  area: number
  date: string
  thumbnail: string
  ndviMean: number
  plantCount: number
  healthPercentage: number
}

// Projetos fake para demonstração (sincronizado com page.tsx)
const fakeProjects: FakeProject[] = [
  { id: '1', name: 'Fazenda São João - Talhão Norte', area: 450, date: '28/01/2026', thumbnail: '🌾', ndviMean: 0.72, plantCount: 125000, healthPercentage: 72 },
  { id: '3', name: 'Propriedade Rural XYZ', area: 280, date: '25/01/2026', thumbnail: '🌱', ndviMean: 0.65, plantCount: 78000, healthPercentage: 68 },
  { id: '4', name: 'Fazenda Boa Vista - Soja', area: 850, date: '22/01/2026', thumbnail: '🫘', ndviMean: 0.78, plantCount: 340000, healthPercentage: 85 },
  { id: '5', name: 'Chácara do Vale - Hortaliças', area: 15, date: '20/01/2026', thumbnail: '🥬', ndviMean: 0.58, plantCount: 8500, healthPercentage: 45 },
  { id: '6', name: 'Fazenda Santa Rita - Café', area: 180, date: '18/01/2026', thumbnail: '☕', ndviMean: 0.69, plantCount: 95000, healthPercentage: 78 },
]

// Plantas detectadas fake
const fakeDetections = [
  { id: 1, x: 25, y: 30, health: 92, height: 2.3, type: 'Saudável' },
  { id: 2, x: 45, y: 50, health: 78, height: 1.8, type: 'Saudável' },
  { id: 3, x: 65, y: 35, health: 45, height: 1.2, type: 'Estressada' },
  { id: 4, x: 35, y: 70, health: 88, height: 2.1, type: 'Saudável' },
  { id: 5, x: 75, y: 65, health: 23, height: 0.8, type: 'Crítica' },
]

export default function MapView() {
  const [mode, setMode] = useState<MapMode>('project')
  const [zoom, setZoom] = useState(100)
  const [showLayers, setShowLayers] = useState(true)
  const [selectedProject, setSelectedProject] = useState<FakeProject | null>(null)
  const [selectedDetection, setSelectedDetection] = useState<typeof fakeDetections[0] | null>(null)
  const [layers, setLayers] = useState<Layer[]>([
    { id: '1', name: 'Imagem Original', type: 'original', visible: true, opacity: 100, color: '#ffffff' },
    { id: '2', name: 'NDVI', type: 'ndvi', visible: false, opacity: 80, color: '#6AAF3D' },
    { id: '3', name: 'NDWI', type: 'ndwi', visible: false, opacity: 80, color: '#3B82F6' },
    { id: '4', name: 'Classificação Solo', type: 'classification', visible: false, opacity: 70, color: '#F59E0B' },
    { id: '5', name: 'Detecção Plantas', type: 'detection', visible: true, opacity: 100, color: '#EC4899' },
    { id: '6', name: 'Mapa de Calor', type: 'heatmap', visible: false, opacity: 60, color: '#EF4444' },
  ])

  // GPS Mode states
  const [gpsActive, setGpsActive] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [areaMode, setAreaMode] = useState<'radius' | 'draw'>('radius')
  const [radius, setRadius] = useState(500)
  const [satelliteSource, setSatelliteSource] = useState<'sentinel' | 'landsat'>('sentinel')
  const [areaSelected, setAreaSelected] = useState(false)

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

  const handleActivateGPS = () => {
    setGpsLoading(true)
    // Simula carregamento do GPS
    setTimeout(() => {
      setGpsActive(true)
      setGpsLoading(false)
    }, 1500)
  }

  const handleSelectArea = () => {
    setAreaSelected(true)
  }

  return (
    <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl overflow-hidden h-full flex flex-col">
      {/* Tabs de modo */}
      <div className="flex border-b border-gray-700/50">
        <button
          onClick={() => { setMode('project'); setSelectedProject(null); }}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 transition-colors ${
            mode === 'project'
              ? 'bg-[#6AAF3D]/20 text-[#6AAF3D] border-b-2 border-[#6AAF3D]'
              : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
          }`}
        >
          <FolderOpen size={18} />
          <span className="font-medium">Ver Projeto</span>
        </button>
        <button
          onClick={() => { setMode('gps'); setGpsActive(false); setAreaSelected(false); }}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 transition-colors ${
            mode === 'gps'
              ? 'bg-blue-500/20 text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
          }`}
        >
          <Satellite size={18} />
          <span className="font-medium">Captura GPS</span>
          <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 text-[10px] font-bold rounded">NOVO</span>
        </button>
      </div>

      {/* Conteúdo baseado no modo */}
      {mode === 'project' ? (
        // ========== MODO 1: VER PROJETO ==========
        <div className="flex flex-1 overflow-hidden">
          {/* Lista de projetos ou visualização */}
          {!selectedProject ? (
            // Lista de projetos para selecionar
            <div className="flex-1 p-6">
              <div className="max-w-2xl mx-auto">
                <h3 className="text-white text-lg font-semibold mb-2">Selecione um Projeto</h3>
                <p className="text-gray-400 text-sm mb-6">Escolha um projeto para visualizar as imagens e análises no mapa</p>

                <div className="space-y-3">
                  {fakeProjects.map(project => (
                    <div
                      key={project.id}
                      onClick={() => setSelectedProject(project)}
                      className="flex items-center gap-4 p-4 bg-gray-800/50 hover:bg-gray-800 rounded-xl cursor-pointer transition-colors border border-gray-700/50 hover:border-[#6AAF3D]/50"
                    >
                      <div className="w-16 h-16 bg-gradient-to-br from-[#6AAF3D]/30 to-green-900/30 rounded-lg flex items-center justify-center text-3xl">
                        {project.thumbnail}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-white font-medium">{project.name}</h4>
                        <p className="text-gray-500 text-sm">{project.area} ha • {project.date}</p>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-xs text-gray-400">NDVI: <span className="text-[#6AAF3D]">{project.ndviMean}</span></span>
                          <span className="text-xs text-gray-400">Plantas: <span className="text-blue-400">{(project.plantCount/1000).toFixed(0)}k</span></span>
                        </div>
                      </div>
                      <ChevronRight className="text-gray-500" size={20} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            // Visualização do projeto selecionado
            <>
              {/* Área do mapa */}
              <div className="flex-1 relative bg-gray-900">
                {/* Toolbar do mapa */}
                <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
                  <button
                    onClick={() => setSelectedProject(null)}
                    className="px-3 py-2 bg-gray-800/90 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
                  >
                    ← Voltar
                  </button>
                  <div className="flex items-center gap-2">
                    <button className="p-2 bg-gray-800/90 hover:bg-gray-700 text-white rounded-lg transition-colors" title="Medir">
                      <Ruler size={18} />
                    </button>
                    <button className="p-2 bg-gray-800/90 hover:bg-gray-700 text-white rounded-lg transition-colors" title="Exportar">
                      <Download size={18} />
                    </button>
                    <button className="p-2 bg-gray-800/90 hover:bg-gray-700 text-white rounded-lg transition-colors" title="Tela cheia">
                      <Maximize2 size={18} />
                    </button>
                  </div>
                </div>

                {/* Imagem fake do projeto com gradient representando NDVI */}
                <div className="absolute inset-0 bg-gradient-to-br from-green-900/80 via-green-700/60 to-yellow-700/40" />

                {/* Grid simulando parcelas */}
                <div className="absolute inset-0 opacity-30" style={{
                  backgroundImage: `
                    linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
                  `,
                  backgroundSize: '50px 50px'
                }} />

                {/* Detecções de plantas (pontos clicáveis) */}
                {layers.find(l => l.type === 'detection')?.visible && fakeDetections.map(det => (
                  <div
                    key={det.id}
                    onClick={() => setSelectedDetection(det)}
                    className={`absolute w-8 h-8 -ml-4 -mt-4 rounded-full cursor-pointer transition-all hover:scale-125 flex items-center justify-center ${
                      selectedDetection?.id === det.id ? 'ring-2 ring-white scale-125' : ''
                    } ${
                      det.health >= 70 ? 'bg-green-500/80' :
                      det.health >= 40 ? 'bg-yellow-500/80' : 'bg-red-500/80'
                    }`}
                    style={{ left: `${det.x}%`, top: `${det.y}%` }}
                  >
                    <Trees size={16} className="text-white" />
                  </div>
                ))}

                {/* Popup de detecção selecionada */}
                {selectedDetection && (
                  <div
                    className="absolute z-20 bg-gray-900/95 border border-gray-700 rounded-xl p-4 w-56 shadow-xl"
                    style={{
                      left: `${Math.min(selectedDetection.x, 70)}%`,
                      top: `${Math.min(selectedDetection.y + 5, 60)}%`
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-white font-medium">Planta #{selectedDetection.id}</span>
                      <button onClick={() => setSelectedDetection(null)} className="text-gray-500 hover:text-white">×</button>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Status:</span>
                        <span className={`font-medium ${
                          selectedDetection.type === 'Saudável' ? 'text-green-400' :
                          selectedDetection.type === 'Estressada' ? 'text-yellow-400' : 'text-red-400'
                        }`}>{selectedDetection.type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Saúde:</span>
                        <span className="text-white">{selectedDetection.health}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Altura:</span>
                        <span className="text-white">{selectedDetection.height}m</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                        <div
                          className={`h-2 rounded-full ${
                            selectedDetection.health >= 70 ? 'bg-green-500' :
                            selectedDetection.health >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${selectedDetection.health}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Controles de zoom */}
                <div className="absolute right-4 bottom-20 flex flex-col gap-2">
                  <button
                    onClick={() => setZoom(prev => Math.min(prev + 10, 200))}
                    className="p-2 bg-gray-800/90 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    <ZoomIn size={18} />
                  </button>
                  <div className="px-2 py-1 bg-gray-800/90 text-white text-xs text-center rounded-lg">
                    {zoom}%
                  </div>
                  <button
                    onClick={() => setZoom(prev => Math.max(prev - 10, 10))}
                    className="p-2 bg-gray-800/90 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    <ZoomOut size={18} />
                  </button>
                </div>

                {/* Info do projeto */}
                <div className="absolute left-4 bottom-4 px-4 py-3 bg-gray-800/90 rounded-lg">
                  <p className="text-white font-medium text-sm">{selectedProject.name}</p>
                  <p className="text-gray-400 text-xs">{selectedProject.area} ha • {selectedProject.plantCount.toLocaleString()} plantas detectadas</p>
                </div>

                {/* Escala */}
                <div className="absolute right-4 bottom-4 flex items-center gap-2 px-3 py-2 bg-gray-800/90 rounded-lg">
                  <div className="h-1 w-16 bg-white rounded"></div>
                  <span className="text-xs text-gray-300">100m</span>
                </div>
              </div>

              {/* Painel lateral de camadas */}
              <div className="w-72 border-l border-gray-700/50 bg-[#12121e] p-4 overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-white font-medium">Camadas</h4>
                  <button
                    onClick={() => setShowLayers(!showLayers)}
                    className="p-1 hover:bg-gray-700 rounded transition-colors"
                  >
                    <Layers size={16} className="text-gray-400" />
                  </button>
                </div>

                <div className="space-y-2">
                  {layers.map(layer => (
                    <div
                      key={layer.id}
                      className={`p-3 rounded-lg transition-colors ${
                        layer.visible ? 'bg-gray-800/50' : 'bg-gray-900/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
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
                        <div className="flex items-center gap-2 mt-2">
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

                {/* Informações do projeto */}
                <div className="mt-6 pt-4 border-t border-gray-700/50">
                  <h5 className="text-white text-sm font-medium mb-3">Informações</h5>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-2 bg-gray-800/30 rounded-lg">
                      <Leaf className="text-[#6AAF3D]" size={18} />
                      <div>
                        <p className="text-xs text-gray-500">NDVI Médio</p>
                        <p className="text-white font-medium">{selectedProject.ndviMean}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-2 bg-gray-800/30 rounded-lg">
                      <Trees className="text-blue-400" size={18} />
                      <div>
                        <p className="text-xs text-gray-500">Plantas Detectadas</p>
                        <p className="text-white font-medium">{selectedProject.plantCount.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-2 bg-gray-800/30 rounded-lg">
                      <CheckCircle className="text-green-400" size={18} />
                      <div>
                        <p className="text-xs text-gray-500">Saúde Geral</p>
                        <p className="text-white font-medium">{selectedProject.healthPercentage}%</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Legenda */}
                <div className="mt-6 pt-4 border-t border-gray-700/50">
                  <h5 className="text-white text-sm font-medium mb-3">Legenda</h5>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-green-500"></div>
                      <span className="text-xs text-gray-400">Saudável (≥70%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                      <span className="text-xs text-gray-400">Estressada (40-69%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-red-500"></div>
                      <span className="text-xs text-gray-400">Crítica (&lt;40%)</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        // ========== MODO 2: CAPTURA GPS ==========
        <div className="flex flex-1 overflow-hidden">
          {/* Área do mapa GPS */}
          <div className="flex-1 relative bg-gray-900">
            {!gpsActive ? (
              // Tela inicial do GPS
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center max-w-md px-6">
                  <div className="w-24 h-24 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Satellite size={48} className="text-blue-400" />
                  </div>
                  <h3 className="text-white text-xl font-semibold mb-2">Captura via GPS</h3>
                  <p className="text-gray-400 mb-6">
                    Ative sua localização para buscar imagens de satélite da região ao seu redor e criar novos projetos de análise.
                  </p>
                  <button
                    onClick={handleActivateGPS}
                    disabled={gpsLoading}
                    className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white font-medium rounded-xl transition-colors flex items-center gap-2 mx-auto"
                  >
                    {gpsLoading ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        Obtendo localização...
                      </>
                    ) : (
                      <>
                        <Crosshair size={20} />
                        Ativar Localização GPS
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              // Mapa com GPS ativo
              <>
                {/* Mapa de satélite fake */}
                <div className="absolute inset-0 bg-gradient-to-br from-green-900/50 via-emerald-800/40 to-teal-900/50" />

                {/* Textura de terreno */}
                <div className="absolute inset-0 opacity-40" style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                }} />

                {/* Marcador de localização central */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="relative">
                    {/* Área selecionada (círculo) */}
                    {areaSelected && (
                      <div
                        className="absolute rounded-full border-2 border-blue-400 bg-blue-400/20 animate-pulse"
                        style={{
                          width: `${radius / 2}px`,
                          height: `${radius / 2}px`,
                          left: `${-(radius / 4)}px`,
                          top: `${-(radius / 4)}px`,
                        }}
                      />
                    )}
                    {/* Pin de localização */}
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/50 relative z-10">
                      <MapPin size={24} className="text-white" />
                    </div>
                    {/* Pulso */}
                    <div className="absolute inset-0 w-12 h-12 bg-blue-500 rounded-full animate-ping opacity-30" />
                  </div>
                </div>

                {/* Toolbar */}
                <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
                  <div className="px-4 py-2 bg-green-500/90 text-white rounded-lg flex items-center gap-2">
                    <CheckCircle size={16} />
                    <span className="text-sm font-medium">GPS Ativo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 bg-gray-800/90 hover:bg-gray-700 text-white rounded-lg transition-colors" title="Centralizar">
                      <Crosshair size={18} />
                    </button>
                    <button className="p-2 bg-gray-800/90 hover:bg-gray-700 text-white rounded-lg transition-colors" title="Tela cheia">
                      <Maximize2 size={18} />
                    </button>
                  </div>
                </div>

                {/* Controles de zoom */}
                <div className="absolute right-4 bottom-20 flex flex-col gap-2">
                  <button className="p-2 bg-gray-800/90 hover:bg-gray-700 text-white rounded-lg transition-colors">
                    <ZoomIn size={18} />
                  </button>
                  <button className="p-2 bg-gray-800/90 hover:bg-gray-700 text-white rounded-lg transition-colors">
                    <ZoomOut size={18} />
                  </button>
                </div>

                {/* Coordenadas */}
                <div className="absolute left-4 bottom-4 px-4 py-2 bg-gray-800/90 rounded-lg">
                  <p className="text-white text-sm font-medium">Sua Localização</p>
                  <p className="text-gray-400 text-xs">Lat: -23.5505° | Lon: -46.6333°</p>
                </div>
              </>
            )}
          </div>

          {/* Painel lateral GPS */}
          <div className="w-80 border-l border-gray-700/50 bg-[#12121e] p-4 overflow-y-auto">
            {gpsActive ? (
              <>
                {/* Localização */}
                <div className="mb-6">
                  <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                    <MapPin size={16} className="text-blue-400" />
                    Sua Localização
                  </h4>
                  <div className="p-3 bg-gray-800/50 rounded-lg space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Latitude:</span>
                      <span className="text-white font-mono">-23.5505°</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Longitude:</span>
                      <span className="text-white font-mono">-46.6333°</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Precisão:</span>
                      <span className="text-green-400">±5m</span>
                    </div>
                  </div>
                </div>

                {/* Fonte de Imagem */}
                <div className="mb-6">
                  <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                    <Satellite size={16} className="text-purple-400" />
                    Fonte de Imagem
                  </h4>
                  <div className="space-y-2">
                    <label className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      satelliteSource === 'sentinel' ? 'bg-purple-500/20 border border-purple-500/50' : 'bg-gray-800/50 hover:bg-gray-800'
                    }`}>
                      <input
                        type="radio"
                        name="satellite"
                        checked={satelliteSource === 'sentinel'}
                        onChange={() => setSatelliteSource('sentinel')}
                        className="hidden"
                      />
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        satelliteSource === 'sentinel' ? 'border-purple-400' : 'border-gray-500'
                      }`}>
                        {satelliteSource === 'sentinel' && <div className="w-2 h-2 rounded-full bg-purple-400" />}
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">Sentinel-2</p>
                        <p className="text-gray-500 text-xs">10m resolução • Gratuito</p>
                      </div>
                    </label>
                    <label className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      satelliteSource === 'landsat' ? 'bg-purple-500/20 border border-purple-500/50' : 'bg-gray-800/50 hover:bg-gray-800'
                    }`}>
                      <input
                        type="radio"
                        name="satellite"
                        checked={satelliteSource === 'landsat'}
                        onChange={() => setSatelliteSource('landsat')}
                        className="hidden"
                      />
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        satelliteSource === 'landsat' ? 'border-purple-400' : 'border-gray-500'
                      }`}>
                        {satelliteSource === 'landsat' && <div className="w-2 h-2 rounded-full bg-purple-400" />}
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">Landsat 8</p>
                        <p className="text-gray-500 text-xs">30m resolução • Gratuito</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Definir Área */}
                <div className="mb-6">
                  <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                    <Circle size={16} className="text-green-400" />
                    Definir Área
                  </h4>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setAreaMode('radius')}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                          areaMode === 'radius'
                            ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                            : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800'
                        }`}
                      >
                        <Circle size={14} />
                        Raio
                      </button>
                      <button
                        onClick={() => setAreaMode('draw')}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                          areaMode === 'draw'
                            ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                            : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800'
                        }`}
                      >
                        <PenTool size={14} />
                        Desenhar
                      </button>
                    </div>

                    {areaMode === 'radius' && (
                      <div className="p-3 bg-gray-800/50 rounded-lg">
                        <div className="flex justify-between mb-2">
                          <span className="text-gray-400 text-sm">Raio:</span>
                          <span className="text-white text-sm font-medium">{radius}m</span>
                        </div>
                        <input
                          type="range"
                          min="100"
                          max="2000"
                          step="100"
                          value={radius}
                          onChange={(e) => setRadius(parseInt(e.target.value))}
                          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between mt-1">
                          <span className="text-xs text-gray-500">100m</span>
                          <span className="text-xs text-gray-500">2km</span>
                        </div>
                      </div>
                    )}

                    {areaMode === 'draw' && (
                      <div className="p-3 bg-gray-800/50 rounded-lg text-center">
                        <PenTool size={24} className="text-gray-500 mx-auto mb-2" />
                        <p className="text-gray-400 text-sm">Clique no mapa para desenhar a área de interesse</p>
                      </div>
                    )}

                    <button
                      onClick={handleSelectArea}
                      className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                        areaSelected
                          ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                          : 'bg-gray-700 text-white hover:bg-gray-600'
                      }`}
                    >
                      {areaSelected ? '✓ Área Selecionada' : 'Selecionar Área'}
                    </button>
                  </div>
                </div>

                {/* Área estimada */}
                {areaSelected && (
                  <div className="mb-6 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <p className="text-blue-400 text-sm font-medium mb-1">Área Estimada</p>
                    <p className="text-white text-2xl font-bold">{(Math.PI * Math.pow(radius/1000, 2)).toFixed(2)} ha</p>
                    <p className="text-gray-400 text-xs mt-1">Baseado no raio de {radius}m</p>
                  </div>
                )}

                {/* Botões de ação */}
                <div className="space-y-3">
                  <button
                    disabled={!areaSelected}
                    className={`w-full py-3 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                      areaSelected
                        ? 'bg-blue-500 hover:bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <Play size={18} />
                    Analisar Área
                  </button>
                  <button
                    disabled={!areaSelected}
                    className={`w-full py-3 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                      areaSelected
                        ? 'bg-[#6AAF3D] hover:bg-[#5a9a34] text-white'
                        : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <Plus size={18} />
                    Criar Projeto
                  </button>
                </div>
              </>
            ) : (
              // Estado inicial - GPS não ativo
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <Crosshair size={48} className="text-gray-600 mb-4" />
                <p className="text-gray-400 text-sm">
                  Ative sua localização GPS para começar a capturar imagens de satélite
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
