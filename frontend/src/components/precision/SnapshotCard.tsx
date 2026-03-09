'use client'

import { useEffect, useState } from 'react'
import { Satellite, Camera, RefreshCw } from 'lucide-react'
import { getFieldSnapshots, captureFieldSnapshot, type FieldSnapshot } from '@/lib/api'

interface SnapshotCardProps {
  fieldId: number
}

function NdviBar({ value, label }: { value: number; label: string }) {
  const pct = Math.max(0, Math.min(100, value * 100))
  const color = value > 0.6 ? '#6AAF3D' : value > 0.3 ? '#f59e0b' : '#ef4444'

  return (
    <div>
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>{label}</span>
        <span className="text-white font-medium">{value.toFixed(3)}</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div
          className="h-2 rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-4 bg-gray-700 rounded w-1/3" />
      <div className="h-24 bg-gray-700 rounded-lg" />
    </div>
  )
}

export default function SnapshotCard({ fieldId }: SnapshotCardProps) {
  const [snapshots, setSnapshots] = useState<FieldSnapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [capturing, setCapturing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getFieldSnapshots(fieldId)
      setSnapshots(result)
    } catch (err: any) {
      setError(err.detail || 'Erro ao carregar snapshots')
    } finally {
      setLoading(false)
    }
  }

  const handleCapture = async () => {
    setCapturing(true)
    try {
      await captureFieldSnapshot(fieldId)
      await fetchData()
    } catch (err: any) {
      setError(err.detail || 'Erro ao capturar snapshot')
    } finally {
      setCapturing(false)
    }
  }

  useEffect(() => { fetchData() }, [fieldId])

  if (loading) return (
    <div className="bg-[#1a1a2e] rounded-xl p-5 border border-gray-700">
      <Skeleton />
    </div>
  )

  const latest = snapshots[0]

  return (
    <div className="bg-[#1a1a2e] rounded-xl p-5 border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <Satellite size={18} className="text-green-400" />
          Índice de Vegetação
        </h3>
        <button
          onClick={handleCapture}
          disabled={capturing}
          className="text-xs bg-[#6AAF3D] hover:bg-[#5a9a34] text-white px-3 py-1.5 rounded-lg flex items-center gap-1 disabled:opacity-50 transition-colors"
          aria-busy={capturing}
        >
          {capturing ? <RefreshCw size={12} className="animate-spin" /> : <Camera size={12} />}
          {capturing ? 'Capturando...' : 'Capturar'}
        </button>
      </div>

      {error && (
        <div className="mb-3">
          <p className="text-red-400 text-sm">{error}</p>
          <button onClick={fetchData} className="mt-1 text-sm text-[#6AAF3D] hover:underline flex items-center gap-1">
            <RefreshCw size={14} /> Tentar novamente
          </button>
        </div>
      )}

      {latest && latest.vegetation_index_mean !== null && latest.vegetation_index_mean !== undefined ? (
        <div className="space-y-3">
          <NdviBar value={latest.vegetation_index_mean} label="Média" />
          {latest.vegetation_index_min !== null && latest.vegetation_index_min !== undefined && (
            <NdviBar value={latest.vegetation_index_min} label="Mínimo" />
          )}
          {latest.vegetation_index_max !== null && latest.vegetation_index_max !== undefined && (
            <NdviBar value={latest.vegetation_index_max} label="Máximo" />
          )}

          <div className="flex items-center justify-between text-xs text-gray-400 mt-2">
            <span>Fonte: {latest.ndvi_source === 'sentinel' ? 'Sentinel NDVI' : 'ExG (RGB)'}</span>
            <span>{new Date(latest.snapshot_date).toLocaleDateString('pt-BR')}</span>
          </div>

          {snapshots.length > 1 && (
            <div className="mt-3 pt-3 border-t border-gray-700">
              <p className="text-xs text-gray-400 mb-2">Histórico ({snapshots.length} snapshots)</p>
              <div className="flex gap-1 items-end h-12">
                {snapshots.slice(0, 20).reverse().map((snap, i) => {
                  const val = snap.vegetation_index_mean ?? 0
                  const height = Math.max(4, val * 48)
                  const color = val > 0.6 ? '#6AAF3D' : val > 0.3 ? '#f59e0b' : '#ef4444'
                  return (
                    <div
                      key={snap.id}
                      className="flex-1 rounded-t transition-all"
                      style={{ height: `${height}px`, backgroundColor: color }}
                      title={`${new Date(snap.snapshot_date).toLocaleDateString('pt-BR')}: ${val.toFixed(3)}`}
                    />
                  )
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-gray-500 text-sm">
          Nenhum snapshot disponível. Clique em &quot;Capturar&quot; para obter dados de satélite.
        </p>
      )}
    </div>
  )
}
