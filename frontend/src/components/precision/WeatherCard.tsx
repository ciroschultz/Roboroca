'use client'

import { useEffect, useState } from 'react'
import { Cloud, Droplets, Thermometer, Wind, RefreshCw } from 'lucide-react'
import { getFieldWeather, type PrecisionWeatherData } from '@/lib/api'

interface WeatherCardProps {
  fieldId: number
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-4 bg-gray-700 rounded w-1/3" />
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-16 bg-gray-700 rounded-lg" />
        ))}
      </div>
    </div>
  )
}

export default function WeatherCard({ fieldId }: WeatherCardProps) {
  const [data, setData] = useState<PrecisionWeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getFieldWeather(fieldId)
      setData(result)
    } catch (err: any) {
      setError(err.detail || 'Erro ao carregar dados climáticos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [fieldId])

  if (loading) return (
    <div className="bg-[#1a1a2e] rounded-xl p-5 border border-gray-700">
      <Skeleton />
    </div>
  )

  if (error) return (
    <div className="bg-[#1a1a2e] rounded-xl p-5 border border-gray-700">
      <p className="text-red-400 text-sm">{error}</p>
      <button onClick={fetchData} className="mt-2 text-sm text-[#6AAF3D] hover:underline flex items-center gap-1">
        <RefreshCw size={14} /> Tentar novamente
      </button>
    </div>
  )

  const current = data?.current

  return (
    <div className="bg-[#1a1a2e] rounded-xl p-5 border border-gray-700">
      <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
        <Cloud size={18} className="text-blue-400" />
        Clima Atual
      </h3>

      {current ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#0f0f1a] rounded-lg p-3">
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
              <Thermometer size={14} /> Temperatura
            </div>
            <p className="text-white text-lg font-bold">{current.temperature_c?.toFixed(1)}°C</p>
          </div>
          <div className="bg-[#0f0f1a] rounded-lg p-3">
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
              <Droplets size={14} /> Umidade
            </div>
            <p className="text-white text-lg font-bold">{current.relative_humidity_pct?.toFixed(0)}%</p>
          </div>
          <div className="bg-[#0f0f1a] rounded-lg p-3">
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
              <Wind size={14} /> Vento
            </div>
            <p className="text-white text-lg font-bold">{current.wind_speed_kmh?.toFixed(1)} km/h</p>
          </div>
          <div className="bg-[#0f0f1a] rounded-lg p-3">
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
              <Droplets size={14} /> Precipitação
            </div>
            <p className="text-white text-lg font-bold">{current.precipitation_mm?.toFixed(1)} mm</p>
          </div>
        </div>
      ) : (
        <p className="text-gray-500 text-sm">Dados climáticos indisponíveis</p>
      )}

      {current?.weather_description && (
        <p className="text-gray-400 text-sm mt-3 capitalize">{current.weather_description}</p>
      )}
    </div>
  )
}
