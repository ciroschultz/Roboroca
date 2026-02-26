'use client'

import { useState, useEffect, useMemo } from 'react'
import { Loader2, BarChart3, Trees, Leaf, MapPin, Bug, Sprout, Download, Filter } from 'lucide-react'
import { getDetailedComparison } from '@/lib/api'
import { BarChartComponent } from './Charts'
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'

interface ProjectComparisonData {
  id: number
  name: string
  status: string
  image_count: number
  total_area_ha: number
  vegetation_coverage_avg: number
  health_index_avg: number
  total_trees: number
  biomass_index_avg: number | null
  pest_infection_rate_avg: number | null
  created_at: string
}

interface ProjectComparisonProps {
  onProjectClick?: (projectId: number) => void
}

type StatusFilter = 'all' | 'completed' | 'pending' | 'analyzing' | 'error'

/**
 * Normalize raw detailed-comparison project entry into a flat shape.
 */
function normalizeProject(raw: any): ProjectComparisonData {
  return {
    id: raw.id,
    name: raw.name,
    status: raw.status,
    image_count: raw.image_count ?? 0,
    total_area_ha: raw.total_area_ha ?? 0,
    vegetation_coverage_avg: raw.vegetation_coverage?.percentage ?? raw.vegetation_coverage_avg ?? 0,
    health_index_avg: raw.health_index?.health_index ?? raw.health_index_avg ?? 0,
    total_trees: raw.plant_count?.total_trees ?? raw.total_trees ?? 0,
    biomass_index_avg: raw.biomass?.biomass_index ?? raw.biomass_index_avg ?? null,
    pest_infection_rate_avg: raw.pest_disease?.infection_rate ?? raw.pest_infection_rate_avg ?? null,
    created_at: raw.created_at ?? '',
  }
}

export default function ProjectComparison({ onProjectClick }: ProjectComparisonProps) {
  const [projects, setProjects] = useState<ProjectComparisonData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  useEffect(() => {
    fetchComparison()
  }, [])

  const fetchComparison = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getDetailedComparison()
      const normalized = (data.projects || []).map(normalizeProject)
      setProjects(normalized)
    } catch (err: any) {
      console.error('Erro ao carregar comparação:', err)
      setError(err.message || 'Erro ao carregar dados de comparação')
    } finally {
      setLoading(false)
    }
  }

  // Filtered projects based on status
  const filteredProjects = useMemo(() => {
    if (statusFilter === 'all') return projects
    return projects.filter((p) => p.status === statusFilter)
  }, [projects, statusFilter])

  // CSV export
  const handleExportCSV = () => {
    if (filteredProjects.length === 0) return

    const headers = [
      'Projeto',
      'Status',
      'Imagens',
      'Area (ha)',
      'Vegetacao (%)',
      'Saude (%)',
      'Arvores',
      'Biomassa (indice)',
      'Infeccao Pragas (%)',
      'Criado em',
    ]

    const rows = filteredProjects.map((p) => [
      `"${p.name.replace(/"/g, '""')}"`,
      p.status,
      p.image_count,
      p.total_area_ha.toFixed(2),
      p.vegetation_coverage_avg.toFixed(1),
      p.health_index_avg.toFixed(1),
      p.total_trees,
      p.biomass_index_avg != null ? p.biomass_index_avg.toFixed(2) : '',
      p.pest_infection_rate_avg != null ? p.pest_infection_rate_avg.toFixed(1) : '',
      p.created_at ? new Date(p.created_at).toLocaleDateString('pt-BR') : '',
    ])

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `comparacao_projetos_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  // Radar chart data: top 3 projects by vegetation + health
  const radarData = useMemo(() => {
    const sorted = [...filteredProjects]
      .filter((p) => p.status === 'completed' || p.vegetation_coverage_avg > 0 || p.health_index_avg > 0)
      .sort(
        (a, b) =>
          b.vegetation_coverage_avg + b.health_index_avg - (a.vegetation_coverage_avg + a.health_index_avg)
      )
      .slice(0, 3)

    if (sorted.length === 0) return { subjects: [], projects: [] }

    const subjects = [
      { key: 'vegetacao', label: 'Vegetação' },
      { key: 'saude', label: 'Saúde' },
      { key: 'arvores', label: 'Árvores' },
      { key: 'biomassa', label: 'Biomassa' },
      { key: 'pragas_inv', label: 'Resistência a Pragas' },
    ]

    // Normalize values to 0-100 scale for radar
    const maxTrees = Math.max(...sorted.map((p) => p.total_trees), 1)
    const maxBiomass = Math.max(...sorted.map((p) => p.biomass_index_avg ?? 0), 0.01)

    const data = subjects.map((s) => {
      const entry: any = { subject: s.label }
      sorted.forEach((p) => {
        const shortName = p.name.length > 12 ? p.name.substring(0, 12) + '...' : p.name
        switch (s.key) {
          case 'vegetacao':
            entry[shortName] = Number(p.vegetation_coverage_avg.toFixed(1))
            break
          case 'saude':
            entry[shortName] = Number(p.health_index_avg.toFixed(1))
            break
          case 'arvores':
            entry[shortName] = Number(((p.total_trees / maxTrees) * 100).toFixed(1))
            break
          case 'biomassa':
            entry[shortName] = Number(
              (((p.biomass_index_avg ?? 0) / maxBiomass) * 100).toFixed(1)
            )
            break
          case 'pragas_inv':
            // Inverted: low infection = high resistance
            entry[shortName] = Number(
              (100 - (p.pest_infection_rate_avg ?? 0)).toFixed(1)
            )
            break
        }
      })
      return entry
    })

    return {
      subjects: data,
      projects: sorted.map((p) =>
        p.name.length > 12 ? p.name.substring(0, 12) + '...' : p.name
      ),
    }
  }, [filteredProjects])

  const RADAR_COLORS = ['#6AAF3D', '#3B82F6', '#F59E0B']

  // Estado de loading
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-[#6AAF3D] animate-spin" />
      </div>
    )
  }

  // Estado de erro
  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    )
  }

  // Estado vazio
  if (projects.length === 0) {
    return (
      <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-8 text-center">
        <BarChart3 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <h3 className="text-white font-semibold mb-2">Nenhum Projeto para Comparar</h3>
        <p className="text-gray-400 text-sm">
          Crie projetos e adicione imagens para visualizar a comparação.
        </p>
      </div>
    )
  }

  // Preparar dados para o gráfico de barras
  const chartData = filteredProjects.map((p) => ({
    name: p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name,
    vegetacao: Number(p.vegetation_coverage_avg.toFixed(1)),
    saude: Number(p.health_index_avg.toFixed(1)),
  }))

  // Função para formatar status
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      pending: { label: 'Pendente', className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
      analyzing: { label: 'Analisando', className: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
      completed: { label: 'Completo', className: 'bg-green-500/10 text-green-400 border-green-500/20' },
      error: { label: 'Erro', className: 'bg-red-500/10 text-red-400 border-red-500/20' },
    }
    const config = statusConfig[status] || statusConfig.pending
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${config.className}`}>
        {config.label}
      </span>
    )
  }

  // Helpers for coloring metric cells
  const getPestColor = (rate: number | null) => {
    if (rate == null) return 'text-gray-500'
    if (rate < 10) return 'text-green-400'
    if (rate < 30) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getBiomassColor = (index: number | null) => {
    if (index == null) return 'text-gray-500'
    if (index >= 0.6) return 'text-green-400'
    if (index >= 0.3) return 'text-yellow-400'
    return 'text-orange-400'
  }

  return (
    <div className="space-y-6">
      {/* Toolbar: filter + export */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Status filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-gray-400 text-sm">Filtrar:</span>
          {(['all', 'completed', 'pending', 'analyzing', 'error'] as StatusFilter[]).map((f) => {
            const labels: Record<StatusFilter, string> = {
              all: 'Todos',
              completed: 'Completos',
              pending: 'Pendentes',
              analyzing: 'Analisando',
              error: 'Erro',
            }
            return (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === f
                    ? 'bg-[#6AAF3D] text-white'
                    : 'bg-[#1a1a2e] text-gray-400 hover:text-white border border-gray-700/50 hover:border-gray-600'
                }`}
              >
                {labels[f]}
                {f !== 'all' && (
                  <span className="ml-1 opacity-70">
                    ({projects.filter((p) => p.status === f).length})
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* CSV Export button */}
        <button
          onClick={handleExportCSV}
          disabled={filteredProjects.length === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#1a1a2e] text-gray-300 hover:text-white border border-gray-700/50 hover:border-[#6AAF3D] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          Exportar CSV
        </button>
      </div>

      {/* Gráfico de barras */}
      <BarChartComponent
        data={chartData}
        title="Comparação de Vegetação e Saúde"
        dataKeys={[
          { key: 'vegetacao', name: 'Vegetação (%)', color: '#6AAF3D' },
          { key: 'saude', name: 'Saúde (%)', color: '#3B82F6' },
        ]}
        xAxisKey="name"
      />

      {/* Radar chart - top 3 projects */}
      {radarData.subjects.length > 0 && radarData.projects.length >= 2 && (
        <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700/50">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Sprout className="w-5 h-5 text-[#6AAF3D]" />
              Radar Comparativo — Top {radarData.projects.length} Projetos
            </h3>
            <p className="text-gray-500 text-xs mt-1">
              Valores normalizados de 0 a 100. Árvores e biomassa são relativos ao maior valor entre os projetos.
            </p>
          </div>
          <div className="p-4" style={{ height: 380 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData.subjects}>
                <PolarGrid stroke="#374151" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: '#9CA3AF', fontSize: 12 }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fill: '#6B7280', fontSize: 10 }}
                  tickCount={5}
                />
                {radarData.projects.map((name, i) => (
                  <Radar
                    key={name}
                    name={name}
                    dataKey={name}
                    stroke={RADAR_COLORS[i]}
                    fill={RADAR_COLORS[i]}
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                ))}
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1a2e',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                />
                <Legend
                  wrapperStyle={{ color: '#d1d5db', fontSize: 12 }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tabela comparativa */}
      <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700/50">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#6AAF3D]" />
            Comparação Detalhada de Projetos
            {statusFilter !== 'all' && (
              <span className="text-xs text-gray-500 font-normal ml-2">
                ({filteredProjects.length} de {projects.length})
              </span>
            )}
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#0f0f1e] border-b border-gray-700/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Projeto
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Imagens
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Área (ha)
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                  <div className="flex items-center justify-center gap-1">
                    <Leaf className="w-3.5 h-3.5" />
                    Vegetação
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                  <div className="flex items-center justify-center gap-1">
                    <Trees className="w-3.5 h-3.5" />
                    Saúde
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                  <div className="flex items-center justify-center gap-1">
                    <Trees className="w-3.5 h-3.5" />
                    Árvores
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                  <div className="flex items-center justify-center gap-1">
                    <Sprout className="w-3.5 h-3.5" />
                    Biomassa
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                  <div className="flex items-center justify-center gap-1">
                    <Bug className="w-3.5 h-3.5" />
                    Pragas
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {filteredProjects.map((project) => (
                <tr
                  key={project.id}
                  onClick={() => onProjectClick?.(project.id)}
                  className={`hover:bg-[#0f0f1e] transition-colors ${
                    onProjectClick ? 'cursor-pointer' : ''
                  }`}
                >
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#6AAF3D] flex-shrink-0" />
                      <span className="text-white font-medium truncate max-w-[180px]" title={project.name}>
                        {project.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center text-gray-300">
                    {project.image_count}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center text-gray-300">
                    {project.total_area_ha > 0 ? project.total_area_ha.toFixed(2) : '-'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    <span className="text-[#6AAF3D] font-semibold">
                      {project.vegetation_coverage_avg.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    <span className="text-[#3B82F6] font-semibold">
                      {project.health_index_avg.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center text-gray-300">
                    {project.total_trees > 0 ? project.total_trees.toLocaleString() : '-'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    <span className={`font-semibold ${getBiomassColor(project.biomass_index_avg)}`}>
                      {project.biomass_index_avg != null
                        ? project.biomass_index_avg.toFixed(2)
                        : '-'}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    <span className={`font-semibold ${getPestColor(project.pest_infection_rate_avg)}`}>
                      {project.pest_infection_rate_avg != null
                        ? `${project.pest_infection_rate_avg.toFixed(1)}%`
                        : '-'}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    {getStatusBadge(project.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Resumo */}
        <div className="px-6 py-4 bg-[#0f0f1e] border-t border-gray-700/50">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-center">
            <div>
              <p className="text-gray-400 text-xs mb-1">Total de Projetos</p>
              <p className="text-white font-semibold">{filteredProjects.length}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-1">Total de Imagens</p>
              <p className="text-white font-semibold">
                {filteredProjects.reduce((sum, p) => sum + p.image_count, 0)}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-1">Área Total (ha)</p>
              <p className="text-white font-semibold">
                {filteredProjects.reduce((sum, p) => sum + p.total_area_ha, 0).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-1">Árvores Totais</p>
              <p className="text-white font-semibold">
                {filteredProjects.reduce((sum, p) => sum + p.total_trees, 0).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-1">Biomassa Média</p>
              <p className="text-white font-semibold">
                {(() => {
                  const vals = filteredProjects.filter((p) => p.biomass_index_avg != null)
                  return vals.length > 0
                    ? (vals.reduce((s, p) => s + (p.biomass_index_avg ?? 0), 0) / vals.length).toFixed(2)
                    : '-'
                })()}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-1">Infecção Média</p>
              <p className="text-white font-semibold">
                {(() => {
                  const vals = filteredProjects.filter((p) => p.pest_infection_rate_avg != null)
                  return vals.length > 0
                    ? (vals.reduce((s, p) => s + (p.pest_infection_rate_avg ?? 0), 0) / vals.length).toFixed(1) + '%'
                    : '-'
                })()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
