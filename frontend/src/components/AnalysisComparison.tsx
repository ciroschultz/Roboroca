'use client'

import { useEffect, useState } from 'react'
import { getDetailedComparison } from '@/lib/api'
import { BarChartComponent } from './Charts'
import {
  Leaf,
  HeartPulse,
  MapPin,
  TreePine,
  Activity,
  Bug,
  Wheat,
  BarChart3,
  Palette,
  Loader2,
  AlertTriangle,
  Trophy,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'

interface AnalysisComparisonProps {
  analysisType: string
  onProjectClick?: (projectId: number) => void
}

interface ProjectData {
  id: number
  name: string
  [key: string]: any
}

// Map analysis types to icons and labels
const ANALYSIS_CONFIG: Record<string, { icon: any; label: string; color: string }> = {
  cobertura: { icon: Leaf, label: 'Cobertura Vegetal', color: '#6AAF3D' },
  'saude-indice': { icon: HeartPulse, label: 'Indice de Saude', color: '#3B82F6' },
  'uso-solo': { icon: MapPin, label: 'Uso do Solo', color: '#F59E0B' },
  contagem: { icon: TreePine, label: 'Contagem de Arvores', color: '#10B981' },
  saude: { icon: Activity, label: 'Saude Detalhada', color: '#8B5CF6' },
  pragas: { icon: Bug, label: 'Pragas e Doencas', color: '#EF4444' },
  biomassa: { icon: Wheat, label: 'Biomassa', color: '#F97316' },
  ndvi: { icon: BarChart3, label: 'Indice ExG (NDVI)', color: '#06B6D4' },
  cores: { icon: Palette, label: 'Distribuicao de Cores', color: '#EC4899' },
}

export default function AnalysisComparison({ analysisType, onProjectClick }: AnalysisComparisonProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        setError(null)
        const result = await getDetailedComparison()
        setData(result)
      } catch (err: any) {
        setError(err.detail || err.message || 'Erro ao carregar dados de comparacao')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const config = ANALYSIS_CONFIG[analysisType] || {
    icon: BarChart3,
    label: analysisType,
    color: '#6AAF3D',
  }
  const Icon = config.icon

  if (loading) {
    return (
      <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-8 flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin mb-3" />
        <p className="text-gray-400 text-sm">Carregando dados de comparacao...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-8 flex flex-col items-center justify-center min-h-[400px]">
        <AlertTriangle className="w-8 h-8 text-yellow-400 mb-3" />
        <p className="text-gray-400 text-sm">{error}</p>
      </div>
    )
  }

  // Flatten nested data from backend into flat format for charts/tables
  const projects: ProjectData[] = (data?.projects || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    status: p.status,
    image_count: p.image_count,
    total_area_ha: p.total_area_ha,
    created_at: p.created_at,
    // Flatten nested metrics
    vegetation_coverage_avg: p.vegetation_coverage?.percentage ?? 0,
    health_index_avg: p.health_index?.health_index ?? 0,
    healthy_percentage: p.health_index?.healthy_pct ?? 0,
    stressed_percentage: p.health_index?.stressed_pct ?? p.plant_health?.stressed_percentage ?? 0,
    critical_percentage: Math.max(0, 100 - (p.health_index?.healthy_pct ?? 0) - (p.health_index?.stressed_pct ?? 0)),
    gli_mean: p.health_index?.gli_mean ?? 0,
    land_use_summary: p.land_use?.distribution ?? {},
    dominant_vegetation_type: p.land_use?.distribution
      ? Object.entries(p.land_use.distribution).sort(([, a]: any, [, b]: any) => b - a)[0]?.[0] ?? 'N/A'
      : 'N/A',
    total_trees: p.plant_count?.total_trees ?? 0,
    tree_coverage_pct: p.plant_count?.coverage_pct ?? 0,
    avg_tree_area: p.plant_count?.avg_tree_area ?? 0,
    pest_infection_rate_avg: p.pest_disease?.infection_rate ?? 0,
    pest_severity: p.pest_disease?.severity ?? 'N/A',
    biomass_index_avg: p.biomass?.biomass_index ?? 0,
    biomass_density_class: p.biomass?.density_class ?? 'N/A',
    biomass_kg_ha: p.biomass?.estimated_kg_ha ?? 0,
    exg_mean: p.ndvi_exg?.mean ?? p.vegetation_coverage?.percentage ?? 0,
    color_distribution: p.color_analysis?.dominant_colors
      ? Object.fromEntries(
          (p.color_analysis.dominant_colors as any[]).map((c: any) => [c.name || c.color || 'other', c.percentage || c.count || 1])
        )
      : {},
    dominant_color: p.color_analysis?.dominant_colors?.[0]?.name ?? 'N/A',
  }))

  if (projects.length === 0) {
    return (
      <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-8 flex flex-col items-center justify-center min-h-[400px]">
        <BarChart3 className="w-8 h-8 text-gray-500 mb-3" />
        <p className="text-gray-400 text-sm">Nenhum projeto com dados de analise encontrado.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg" style={{ backgroundColor: `${config.color}20` }}>
          <Icon className="w-5 h-5" style={{ color: config.color }} />
        </div>
        <h2 className="text-xl font-bold text-white">{config.label} - Comparacao entre Projetos</h2>
      </div>

      {/* Chart Section */}
      <div>{renderChart(analysisType, projects, config)}</div>

      {/* Detailed Table */}
      <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-400" />
          Ranking Detalhado
        </h3>
        <div className="overflow-x-auto">
          {renderTable(analysisType, projects, onProjectClick)}
        </div>
      </div>

      {/* Summary Footer */}
      <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-3">Resumo</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {renderSummary(analysisType, projects, config)}
        </div>
      </div>
    </div>
  )
}

// ============================================
// Chart Renderers
// ============================================

function renderChart(type: string, projects: ProjectData[], config: { color: string; label: string }) {
  switch (type) {
    case 'cobertura': {
      const chartData = projects.map((p) => ({
        name: truncateName(p.name),
        cobertura: roundVal(p.vegetation_coverage_avg),
      }))
      return (
        <BarChartComponent
          data={chartData}
          title="Cobertura Vegetal por Projeto (%)"
          dataKeys={[{ key: 'cobertura', name: 'Cobertura %', color: '#6AAF3D' }]}
          xAxisKey="name"
        />
      )
    }

    case 'saude-indice': {
      const chartData = projects.map((p) => ({
        name: truncateName(p.name),
        saude: roundVal(p.health_index_avg),
        estresse: roundVal(p.stressed_percentage || 0),
      }))
      return (
        <BarChartComponent
          data={chartData}
          title="Indice de Saude e Estresse por Projeto (%)"
          dataKeys={[
            { key: 'saude', name: 'Saude %', color: '#3B82F6' },
            { key: 'estresse', name: 'Estresse %', color: '#EF4444' },
          ]}
          xAxisKey="name"
        />
      )
    }

    case 'uso-solo': {
      const chartData = projects.map((p) => {
        const landUse = p.land_use_summary || {}
        return {
          name: truncateName(p.name),
          ...Object.fromEntries(
            Object.entries(landUse).map(([k, v]) => [k, roundVal(v as number)])
          ),
        }
      })
      // Collect all land use keys
      const allKeys = new Set<string>()
      projects.forEach((p) => {
        if (p.land_use_summary) {
          Object.keys(p.land_use_summary).forEach((k) => allKeys.add(k))
        }
      })
      const landUseColors = ['#6AAF3D', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316']
      const dataKeys = Array.from(allKeys).map((key, i) => ({
        key,
        name: key,
        color: landUseColors[i % landUseColors.length],
      }))
      return (
        <BarChartComponent
          data={chartData}
          title="Distribuicao de Uso do Solo por Projeto"
          dataKeys={dataKeys}
          xAxisKey="name"
        />
      )
    }

    case 'contagem': {
      const chartData = projects.map((p) => ({
        name: truncateName(p.name),
        arvores: p.total_trees || 0,
      }))
      return (
        <BarChartComponent
          data={chartData}
          title="Contagem de Arvores por Projeto"
          dataKeys={[{ key: 'arvores', name: 'Arvores', color: '#10B981' }]}
          xAxisKey="name"
        />
      )
    }

    case 'saude': {
      const chartData = projects.map((p) => ({
        name: truncateName(p.name),
        saudavel: roundVal(p.healthy_percentage || 0),
        estressado: roundVal(p.stressed_percentage || 0),
        critico: roundVal(p.critical_percentage || 0),
      }))
      return (
        <BarChartComponent
          data={chartData}
          title="Saude Detalhada por Projeto (%)"
          dataKeys={[
            { key: 'saudavel', name: 'Saudavel %', color: '#6AAF3D' },
            { key: 'estressado', name: 'Estressado %', color: '#F59E0B' },
            { key: 'critico', name: 'Critico %', color: '#EF4444' },
          ]}
          xAxisKey="name"
        />
      )
    }

    case 'pragas': {
      const chartData = projects.map((p) => ({
        name: truncateName(p.name),
        infeccao: roundVal(p.pest_infection_rate_avg || 0),
      }))
      return (
        <BarChartComponent
          data={chartData}
          title="Taxa de Infeccao por Projeto (%)"
          dataKeys={[{ key: 'infeccao', name: 'Infeccao %', color: '#EF4444' }]}
          xAxisKey="name"
        />
      )
    }

    case 'biomassa': {
      const chartData = projects.map((p) => ({
        name: truncateName(p.name),
        biomassa: roundVal(p.biomass_index_avg || 0),
      }))
      return (
        <BarChartComponent
          data={chartData}
          title="Indice de Biomassa por Projeto"
          dataKeys={[{ key: 'biomassa', name: 'Biomassa', color: '#F97316' }]}
          xAxisKey="name"
        />
      )
    }

    case 'ndvi': {
      const chartData = projects.map((p) => ({
        name: truncateName(p.name),
        exg: roundVal(p.exg_mean || p.vegetation_coverage_avg || 0),
      }))
      return (
        <BarChartComponent
          data={chartData}
          title="Media ExG por Projeto"
          dataKeys={[{ key: 'exg', name: 'ExG Medio', color: '#06B6D4' }]}
          xAxisKey="name"
        />
      )
    }

    case 'cores': {
      const chartData = projects.map((p) => {
        const colors = p.color_distribution || {}
        return {
          name: truncateName(p.name),
          ...Object.fromEntries(
            Object.entries(colors).map(([k, v]) => [k, roundVal(v as number)])
          ),
        }
      })
      const allColorKeys = new Set<string>()
      projects.forEach((p) => {
        if (p.color_distribution) {
          Object.keys(p.color_distribution).forEach((k) => allColorKeys.add(k))
        }
      })
      const colorPalette = ['#6AAF3D', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899']
      const dataKeys = Array.from(allColorKeys).map((key, i) => ({
        key,
        name: key,
        color: colorPalette[i % colorPalette.length],
      }))
      return (
        <BarChartComponent
          data={chartData}
          title="Distribuicao de Cores por Projeto"
          dataKeys={dataKeys.length > 0 ? dataKeys : [{ key: 'value', name: 'Valor', color: '#EC4899' }]}
          xAxisKey="name"
        />
      )
    }

    default:
      return (
        <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-5 text-gray-400 text-center">
          Tipo de analise nao reconhecido: {type}
        </div>
      )
  }
}

// ============================================
// Table Renderers
// ============================================

function renderTable(
  type: string,
  projects: ProjectData[],
  onProjectClick?: (projectId: number) => void
) {
  const columns = getTableColumns(type)
  const sorted = getSortedProjects(type, projects)

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-700">
          <th className="text-left py-2 px-3 text-gray-400 font-medium">#</th>
          <th className="text-left py-2 px-3 text-gray-400 font-medium">Projeto</th>
          {columns.map((col) => (
            <th key={col.key} className="text-right py-2 px-3 text-gray-400 font-medium">
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sorted.map((project, index) => (
          <tr
            key={project.id}
            className="border-b border-gray-800 hover:bg-white/5 transition-colors cursor-pointer"
            onClick={() => onProjectClick?.(project.id)}
          >
            <td className="py-2 px-3">
              {index === 0 ? (
                <Trophy className="w-4 h-4 text-yellow-400" />
              ) : index === 1 ? (
                <Trophy className="w-4 h-4 text-gray-300" />
              ) : index === 2 ? (
                <Trophy className="w-4 h-4 text-amber-600" />
              ) : (
                <span className="text-gray-500">{index + 1}</span>
              )}
            </td>
            <td className="py-2 px-3 text-white font-medium">{project.name}</td>
            {columns.map((col) => (
              <td key={col.key} className="py-2 px-3 text-right text-gray-300">
                {col.format ? col.format(project[col.key]) : roundVal(project[col.key] ?? 0)}
                {col.suffix || ''}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

interface TableColumn {
  key: string
  label: string
  suffix?: string
  format?: (value: any) => string
}

function getTableColumns(type: string): TableColumn[] {
  switch (type) {
    case 'cobertura':
      return [
        { key: 'vegetation_coverage_avg', label: 'Cobertura (%)', suffix: '%' },
        { key: 'total_area_ha', label: 'Area (ha)', suffix: ' ha' },
      ]
    case 'saude-indice':
      return [
        { key: 'health_index_avg', label: 'Indice Saude (%)', suffix: '%' },
        { key: 'stressed_percentage', label: 'Estresse (%)', suffix: '%' },
      ]
    case 'uso-solo':
      return [
        { key: 'dominant_vegetation_type', label: 'Tipo Dominante', format: (v) => v || 'N/A' },
        { key: 'total_area_ha', label: 'Area (ha)', suffix: ' ha' },
      ]
    case 'contagem':
      return [
        { key: 'total_trees', label: 'Total Arvores', format: (v) => String(v || 0) },
        { key: 'total_area_ha', label: 'Area (ha)', suffix: ' ha' },
        {
          key: '_density',
          label: 'Densidade (arv/ha)',
          format: (_v) => 'N/A',
        },
      ]
    case 'saude':
      return [
        { key: 'healthy_percentage', label: 'Saudavel (%)', suffix: '%' },
        { key: 'stressed_percentage', label: 'Estressado (%)', suffix: '%' },
        { key: 'critical_percentage', label: 'Critico (%)', suffix: '%' },
      ]
    case 'pragas':
      return [
        { key: 'pest_infection_rate_avg', label: 'Infeccao (%)', suffix: '%' },
      ]
    case 'biomassa':
      return [
        { key: 'biomass_index_avg', label: 'Indice Biomassa', format: (v) => String(roundVal(v || 0)) },
        { key: 'biomass_density_class', label: 'Classe Densidade', format: (v) => v || 'N/A' },
      ]
    case 'ndvi':
      return [
        { key: 'exg_mean', label: 'ExG Medio', format: (v) => String(roundVal(v || 0)) },
        { key: 'vegetation_coverage_avg', label: 'Cobertura (%)', suffix: '%' },
      ]
    case 'cores':
      return [
        { key: 'dominant_color', label: 'Cor Dominante', format: (v) => v || 'N/A' },
      ]
    default:
      return []
  }
}

function getSortedProjects(type: string, projects: ProjectData[]): ProjectData[] {
  const sortKey = getSortKey(type)
  const ascending = type === 'pragas' // Lower infection is better
  return [...projects].sort((a, b) => {
    const va = a[sortKey] ?? 0
    const vb = b[sortKey] ?? 0
    return ascending ? va - vb : vb - va
  })
}

function getSortKey(type: string): string {
  switch (type) {
    case 'cobertura': return 'vegetation_coverage_avg'
    case 'saude-indice': return 'health_index_avg'
    case 'uso-solo': return 'total_area_ha'
    case 'contagem': return 'total_trees'
    case 'saude': return 'healthy_percentage'
    case 'pragas': return 'pest_infection_rate_avg'
    case 'biomassa': return 'biomass_index_avg'
    case 'ndvi': return 'exg_mean'
    case 'cores': return 'total_area_ha'
    default: return 'name'
  }
}

// ============================================
// Summary Renderers
// ============================================

function renderSummary(type: string, projects: ProjectData[], config: { color: string }) {
  const stats = computeStats(type, projects)

  return (
    <>
      <div className="bg-[#16213e] rounded-lg p-4">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="w-4 h-4" style={{ color: config.color }} />
          <span className="text-gray-400 text-xs">Melhor</span>
        </div>
        <p className="text-white font-bold text-lg">{stats.bestName}</p>
        <p className="text-sm" style={{ color: config.color }}>
          {stats.bestValue}
        </p>
      </div>
      <div className="bg-[#16213e] rounded-lg p-4">
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="w-4 h-4 text-gray-400" />
          <span className="text-gray-400 text-xs">Media Geral</span>
        </div>
        <p className="text-white font-bold text-lg">{stats.average}</p>
        <p className="text-gray-400 text-sm">{projects.length} projetos</p>
      </div>
      <div className="bg-[#16213e] rounded-lg p-4">
        <div className="flex items-center gap-2 mb-1">
          <TrendingDown className="w-4 h-4 text-red-400" />
          <span className="text-gray-400 text-xs">Menor</span>
        </div>
        <p className="text-white font-bold text-lg">{stats.worstName}</p>
        <p className="text-red-400 text-sm">{stats.worstValue}</p>
      </div>
    </>
  )
}

function computeStats(type: string, projects: ProjectData[]) {
  const sortKey = getSortKey(type)
  const isLowerBetter = type === 'pragas'
  const suffix = ['cobertura', 'saude-indice', 'saude', 'pragas'].includes(type) ? '%' : ''

  const values = projects.map((p) => ({
    name: p.name,
    value: p[sortKey] ?? 0,
  }))

  if (values.length === 0) {
    return {
      bestName: 'N/A',
      bestValue: 'N/A',
      average: 'N/A',
      worstName: 'N/A',
      worstValue: 'N/A',
    }
  }

  const sorted = [...values].sort((a, b) =>
    isLowerBetter ? a.value - b.value : b.value - a.value
  )

  const avg = values.reduce((sum, v) => sum + v.value, 0) / values.length

  return {
    bestName: sorted[0].name,
    bestValue: `${roundVal(sorted[0].value)}${suffix}`,
    average: `${roundVal(avg)}${suffix}`,
    worstName: sorted[sorted.length - 1].name,
    worstValue: `${roundVal(sorted[sorted.length - 1].value)}${suffix}`,
  }
}

// ============================================
// Helpers
// ============================================

function truncateName(name: string, maxLen = 15): string {
  if (name.length <= maxLen) return name
  return name.slice(0, maxLen - 2) + '..'
}

function roundVal(value: number): number {
  return Math.round(value * 100) / 100
}
