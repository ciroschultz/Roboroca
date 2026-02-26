'use client'

import { useState } from 'react'
import { captureFromCoordinates } from '@/lib/api'
import {
  MapPin,
  Navigation,
  Download,
  Loader2,
  Satellite,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  PenTool,
  Eye,
} from 'lucide-react'

interface CoordinateCaptureProps {
  projectId?: number
  onCaptureComplete?: (imageData: any) => void
  onNavigateToPerimeter?: (projectId: number) => void
  onNavigateToProject?: (projectId: number) => void
  onClose?: () => void
}

const PROVIDERS = [
  { id: 'esri', name: 'Esri World Imagery', description: 'Imagens satelitais de alta resolução (gratuito)' },
  { id: 'osm', name: 'OpenStreetMap', description: 'Mapa base com detalhes geográficos (gratuito)' },
]

const RADIUS_OPTIONS = [
  { value: 100, label: '100m' },
  { value: 250, label: '250m' },
  { value: 500, label: '500m' },
  { value: 1000, label: '1km' },
  { value: 2000, label: '2km' },
  { value: 5000, label: '5km' },
]

export default function CoordinateCapture({ projectId, onCaptureComplete, onNavigateToPerimeter, onNavigateToProject, onClose }: CoordinateCaptureProps) {
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [radius, setRadius] = useState(500)
  const [provider, setProvider] = useState('esri')
  const [loading, setLoading] = useState(false)
  const [gettingLocation, setGettingLocation] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<any>(null)

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocalização não suportada pelo navegador')
      return
    }

    setGettingLocation(true)
    setError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6))
        setLongitude(position.coords.longitude.toFixed(6))
        setGettingLocation(false)
      },
      (err) => {
        setGettingLocation(false)
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError('Permissão de localização negada. Habilite nas configurações do navegador.')
            break
          case err.POSITION_UNAVAILABLE:
            setError('Localização indisponível.')
            break
          case err.TIMEOUT:
            setError('Tempo esgotado ao obter localização.')
            break
          default:
            setError('Erro ao obter localização.')
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleCapture = async () => {
    const lat = parseFloat(latitude)
    const lon = parseFloat(longitude)

    if (isNaN(lat) || lat < -90 || lat > 90) {
      setError('Latitude inválida. Use valores entre -90 e 90.')
      return
    }
    if (isNaN(lon) || lon < -180 || lon > 180) {
      setError('Longitude inválida. Use valores entre -180 e 180.')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await captureFromCoordinates({
        latitude: lat,
        longitude: lon,
        radius_m: radius,
        ...(projectId ? { project_id: projectId } : {}),
        provider,
      })
      setSuccess(result)
      onCaptureComplete?.(result)
    } catch (err: any) {
      setError(err.detail || err.message || 'Erro ao capturar imagem')
    } finally {
      setLoading(false)
    }
  }

  const isValid = latitude && longitude && !isNaN(parseFloat(latitude)) && !isNaN(parseFloat(longitude))

  return (
    <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Satellite className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold">Captura por Coordenadas GPS</h3>
            <p className="text-gray-400 text-xs">Busque imagens de satélite a partir de coordenadas</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors text-sm">
            Fechar
          </button>
        )}
      </div>

      {/* Coordenadas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Latitude</label>
          <input
            type="text"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            placeholder="-23.5505"
            className="w-full bg-[#0f0f1e] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Longitude</label>
          <input
            type="text"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            placeholder="-46.6333"
            className="w-full bg-[#0f0f1e] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Botão Minha Localização */}
      <button
        onClick={handleGetLocation}
        disabled={gettingLocation}
        className="flex items-center gap-2 px-4 py-2 bg-[#16213e] hover:bg-[#1a2744] border border-gray-700 rounded-lg text-sm text-gray-300 hover:text-white transition-all"
      >
        {gettingLocation ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Navigation className="w-4 h-4" />
        )}
        {gettingLocation ? 'Obtendo localização...' : 'Usar minha localização'}
      </button>

      {/* Raio e Provedor */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Raio da área</label>
          <select
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="w-full bg-[#0f0f1e] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none appearance-none"
          >
            {RADIUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Provedor de imagem</label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="w-full bg-[#0f0f1e] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none appearance-none"
          >
            {PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Info do provedor */}
      <div className="bg-[#0f0f1e] rounded-lg p-3 text-xs text-gray-400">
        <MapPin className="w-3 h-3 inline mr-1" />
        {PROVIDERS.find((p) => p.id === provider)?.description}
      </div>

      {/* Erro */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Sucesso */}
      {success && (
        <div className="space-y-3">
          <div className="flex items-start gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-green-400 text-sm font-medium">{success.message}</p>
              <p className="text-green-400/70 text-xs mt-1">
                Resolução: {(success.gsd_m * 100).toFixed(1)} cm/pixel · {success.provider}
              </p>
            </div>
          </div>
          {/* Botões de ação pós-captura */}
          <div className="flex gap-3">
            {onNavigateToPerimeter && success.project_id && (
              <button
                onClick={() => onNavigateToPerimeter(success.project_id)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#6AAF3D] to-[#5a9a34] text-white rounded-lg font-medium text-sm hover:shadow-lg hover:shadow-[#6AAF3D]/20 transition-all"
              >
                <PenTool className="w-4 h-4" />
                Delimitar Perímetro e Analisar
              </button>
            )}
            {onNavigateToProject && success.project_id && (
              <button
                onClick={() => onNavigateToProject(success.project_id)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#16213e] hover:bg-[#1a2744] border border-gray-700 text-gray-300 hover:text-white rounded-lg font-medium text-sm transition-all"
              >
                <Eye className="w-4 h-4" />
                Ver Projeto
              </button>
            )}
          </div>
        </div>
      )}

      {/* Botão Capturar */}
      <button
        onClick={handleCapture}
        disabled={!isValid || loading}
        className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium text-sm transition-all ${
          isValid && !loading
            ? 'bg-gradient-to-r from-[#6AAF3D] to-[#5a9a34] text-white hover:shadow-lg hover:shadow-[#6AAF3D]/20'
            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
        }`}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Capturando imagem...
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            Capturar Imagem de Satélite
          </>
        )}
      </button>
    </div>
  )
}
