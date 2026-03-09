'use client'

import { useEffect, useState } from 'react'
import { Layers, RefreshCw } from 'lucide-react'
import { getFieldSoil, type PrecisionSoilData } from '@/lib/api'

interface SoilCardProps {
  fieldId: number
}

const DEPTH_LABELS: Record<string, string> = {
  '0-5cm': '0-5 cm',
  '5-15cm': '5-15 cm',
  '15-30cm': '15-30 cm',
  '30-60cm': '30-60 cm',
  '60-100cm': '60-100 cm',
}

function getPhLabel(ph: number): { text: string; color: string } {
  if (ph < 5.5) return { text: 'Ácido', color: 'text-red-400' }
  if (ph < 6.5) return { text: 'Levemente ácido', color: 'text-yellow-400' }
  if (ph < 7.5) return { text: 'Neutro', color: 'text-green-400' }
  return { text: 'Alcalino', color: 'text-blue-400' }
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-4 bg-gray-700 rounded w-1/3" />
      <div className="h-32 bg-gray-700 rounded-lg" />
    </div>
  )
}

export default function SoilCard({ fieldId }: SoilCardProps) {
  const [data, setData] = useState<PrecisionSoilData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getFieldSoil(fieldId)
      setData(result)
    } catch (err: any) {
      setError(err.detail || 'Erro ao carregar dados de solo')
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

  const properties = data?.properties

  return (
    <div className="bg-[#1a1a2e] rounded-xl p-5 border border-gray-700">
      <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
        <Layers size={18} className="text-amber-400" />
        Dados do Solo
      </h3>

      {properties && Object.keys(properties).length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-gray-700">
                <th className="text-left py-2 pr-3">Propriedade</th>
                {Object.keys(DEPTH_LABELS).slice(0, 3).map(depth => (
                  <th key={depth} className="text-right py-2 px-2">{DEPTH_LABELS[depth]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(properties).map(([key, prop]) => (
                <tr key={key} className="border-b border-gray-800">
                  <td className="py-2 pr-3">
                    <span className="text-gray-300">{prop.label || key}</span>
                    {prop.unit && <span className="text-gray-500 text-xs ml-1">({prop.unit})</span>}
                  </td>
                  {Object.keys(DEPTH_LABELS).slice(0, 3).map(depth => {
                    const value = prop.depths?.[depth]
                    return (
                      <td key={depth} className="text-right py-2 px-2 text-white">
                        {value !== undefined ? value.toFixed(1) : '—'}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-500 text-sm">Dados de solo indisponíveis</p>
      )}

      {data?.interpretation && typeof data.interpretation === 'object' && (
        <div className="mt-3 space-y-1">
          {Object.entries(data.interpretation).map(([key, value]) => (
            <p key={key} className="text-gray-400 text-xs">
              <span className="text-gray-300 font-medium">{key}:</span> {value}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
