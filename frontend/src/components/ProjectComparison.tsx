'use client'

import { useState, useEffect } from 'react'
import { Loader2, BarChart3, Trees, Leaf, MapPin } from 'lucide-react'
import { getProjectsComparison } from '@/lib/api'
import { BarChartComponent } from './Charts'

interface ProjectComparisonData {
  id: number
  name: string
  status: string
  image_count: number
  total_area_ha: number
  vegetation_coverage_avg: number
  health_index_avg: number
  total_trees: number
  created_at: string
}

interface ProjectComparisonProps {
  onProjectClick?: (projectId: number) => void
}

export default function ProjectComparison({ onProjectClick }: ProjectComparisonProps) {
  const [projects, setProjects] = useState<ProjectComparisonData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchComparison()
  }, [])

  const fetchComparison = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getProjectsComparison()
      setProjects(data.projects)
    } catch (err: any) {
      console.error('Erro ao carregar comparação:', err)
      setError(err.message || 'Erro ao carregar dados de comparação')
    } finally {
      setLoading(false)
    }
  }

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

  // Preparar dados para o gráfico
  const chartData = projects.map((p) => ({
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

  return (
    <div className="space-y-6">
      {/* Gráfico de comparação */}
      <BarChartComponent
        data={chartData}
        title="Comparação de Vegetação e Saúde"
        dataKeys={[
          { key: 'vegetacao', name: 'Vegetação (%)', color: '#6AAF3D' },
          { key: 'saude', name: 'Saúde (%)', color: '#3B82F6' },
        ]}
        xAxisKey="name"
      />

      {/* Tabela comparativa */}
      <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700/50">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#6AAF3D]" />
            Comparação Detalhada de Projetos
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#0f0f1e] border-b border-gray-700/50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Projeto
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Imagens
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Área (ha)
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                  <div className="flex items-center justify-center gap-1">
                    <Leaf className="w-4 h-4" />
                    Vegetação
                  </div>
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                  <div className="flex items-center justify-center gap-1">
                    <Trees className="w-4 h-4" />
                    Saúde
                  </div>
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                  <div className="flex items-center justify-center gap-1">
                    <Trees className="w-4 h-4" />
                    Árvores
                  </div>
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {projects.map((project) => (
                <tr
                  key={project.id}
                  onClick={() => onProjectClick?.(project.id)}
                  className={`hover:bg-[#0f0f1e] transition-colors ${
                    onProjectClick ? 'cursor-pointer' : ''
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#6AAF3D]" />
                      <span className="text-white font-medium">{project.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-gray-300">
                    {project.image_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-gray-300">
                    {project.total_area_ha > 0 ? project.total_area_ha.toFixed(2) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-[#6AAF3D] font-semibold">
                      {project.vegetation_coverage_avg.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-[#3B82F6] font-semibold">
                      {project.health_index_avg.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-gray-300">
                    {project.total_trees > 0 ? project.total_trees.toLocaleString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {getStatusBadge(project.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Resumo */}
        <div className="px-6 py-4 bg-[#0f0f1e] border-t border-gray-700/50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-gray-400 text-xs mb-1">Total de Projetos</p>
              <p className="text-white font-semibold">{projects.length}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-1">Total de Imagens</p>
              <p className="text-white font-semibold">
                {projects.reduce((sum, p) => sum + p.image_count, 0)}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-1">Área Total (ha)</p>
              <p className="text-white font-semibold">
                {projects.reduce((sum, p) => sum + p.total_area_ha, 0).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-1">Árvores Totais</p>
              <p className="text-white font-semibold">
                {projects.reduce((sum, p) => sum + p.total_trees, 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
