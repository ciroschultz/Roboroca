'use client'

import { useEffect, useState } from 'react'
import { Calendar, RefreshCw } from 'lucide-react'
import { getFieldClimateHistory, type ClimateHistory } from '@/lib/api'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

interface ClimateHistoryCardProps {
  fieldId: number
  months?: number
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-4 bg-gray-700 rounded w-1/3" />
      <div className="h-48 bg-gray-700 rounded-lg" />
    </div>
  )
}

export default function ClimateHistoryCard({ fieldId, months = 12 }: ClimateHistoryCardProps) {
  const [data, setData] = useState<ClimateHistory | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getFieldClimateHistory(fieldId, months)
      setData(result)
    } catch (err: any) {
      setError(err.detail || 'Serviço temporariamente indisponível')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [fieldId, months])

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

  if (!data || data.error) return (
    <div className="bg-[#1a1a2e] rounded-xl p-5 border border-gray-700">
      <p className="text-gray-500 text-sm">{data?.error || 'Dados indisponíveis'}</p>
    </div>
  )

  const chartData = data.monthly_averages.map(m => ({
    month: (m.month as string)?.slice(5) || '',
    temp: m.T2M as number,
    tempMax: m.T2M_MAX as number,
    tempMin: m.T2M_MIN as number,
    precip: m.PRECTOTCORR as number,
    solar: m.ALLSKY_SFC_SW_DWN as number,
  }))

  const stats = data.period_stats || {}

  return (
    <div className="bg-[#1a1a2e] rounded-xl p-5 border border-gray-700">
      <h3 className="text-white font-semibold mb-1 flex items-center gap-2">
        <Calendar size={18} className="text-purple-400" />
        Histórico Climático (NASA POWER)
      </h3>
      <p className="text-gray-500 text-xs mb-4">
        {data.period?.start} a {data.period?.end}
      </p>

      {/* Temperature + Precipitation chart */}
      {chartData.length > 0 && (
        <div className="mb-4">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <YAxis yAxisId="precip" orientation="left" tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <YAxis yAxisId="temp" orientation="right" tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #374151', borderRadius: '8px' }}
                labelStyle={{ color: '#fff' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar yAxisId="precip" dataKey="precip" name="Precipitação (mm)" fill="#3b82f6" radius={[2, 2, 0, 0]} />
              <Line yAxisId="temp" type="monotone" dataKey="temp" name="Temp. Média (°C)" stroke="#ef4444" strokeWidth={2} dot={false} />
              <Line yAxisId="temp" type="monotone" dataKey="tempMax" name="Temp. Máx (°C)" stroke="#f59e0b" strokeWidth={1} dot={false} strokeDasharray="3 3" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Summary table */}
      {Object.keys(stats).length > 0 && (
        <div className="grid grid-cols-3 gap-2 text-center">
          {'T2M' in stats && (
            <div className="bg-[#0f0f1a] rounded-lg p-2">
              <p className="text-xs text-gray-400">Temp. Média</p>
              <p className="text-white font-bold">{(stats.T2M as any).mean?.toFixed(1)}°C</p>
            </div>
          )}
          {'PRECTOTCORR' in stats && (
            <div className="bg-[#0f0f1a] rounded-lg p-2">
              <p className="text-xs text-gray-400">Precip. Total</p>
              <p className="text-white font-bold">{(stats.PRECTOTCORR as any).total?.toFixed(0)} mm</p>
            </div>
          )}
          {'ALLSKY_SFC_SW_DWN' in stats && (
            <div className="bg-[#0f0f1a] rounded-lg p-2">
              <p className="text-xs text-gray-400">Radiação Solar</p>
              <p className="text-white font-bold">{(stats.ALLSKY_SFC_SW_DWN as any).mean?.toFixed(1)} kWh</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
