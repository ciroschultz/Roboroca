'use client'

import { useState } from 'react'
import {
  ArrowLeft,
  Download,
  Share2,
  Trash2,
  Calendar,
  MapPin,
  Leaf,
  Trees,
  Droplets,
  Mountain,
  Thermometer,
  FileText,
  Image,
  Clock,
  CheckCircle,
  AlertTriangle,
  Eye,
} from 'lucide-react'
import {
  DonutChart,
  BarChartComponent,
  AreaChartComponent,
  GaugeChart,
} from './Charts'
import StatCard from './StatCard'
import MapView from './MapView'

interface ProjectData {
  id: string
  name: string
  createdAt: string
  status: 'processing' | 'completed' | 'error'
  sourceType: 'drone' | 'satellite'
  imageCount: number
  area: number // hectares
  location?: string
  results?: {
    ndviMean: number
    ndwiMean: number
    plantCount: number
    healthyPercentage: number
    stressedPercentage: number
    criticalPercentage: number
    landUse: { name: string; value: number; color: string }[]
    heightDistribution: { altura: string; quantidade: number }[]
  }
}

interface ProjectProfileProps {
  project: ProjectData
  onBack: () => void
}

export default function ProjectProfile({ project, onBack }: ProjectProfileProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'map' | 'report'>('overview')

  const getStatusBadge = () => {
    switch (project.status) {
      case 'completed':
        return (
          <span className="flex items-center gap-1 px-3 py-1 bg-green-900/30 text-green-400 rounded-full text-sm">
            <CheckCircle size={14} />
            Concluído
          </span>
        )
      case 'processing':
        return (
          <span className="flex items-center gap-1 px-3 py-1 bg-yellow-900/30 text-yellow-400 rounded-full text-sm">
            <Clock size={14} className="animate-spin" />
            Processando
          </span>
        )
      case 'error':
        return (
          <span className="flex items-center gap-1 px-3 py-1 bg-red-900/30 text-red-400 rounded-full text-sm">
            <AlertTriangle size={14} />
            Erro
          </span>
        )
    }
  }

  // Dados de exemplo para os gráficos do projeto
  const plantHealthData = project.results ? [
    { name: 'Saudável', value: project.results.healthyPercentage, color: '#6AAF3D' },
    { name: 'Estressada', value: project.results.stressedPercentage, color: '#F59E0B' },
    { name: 'Crítica', value: project.results.criticalPercentage, color: '#EF4444' },
  ] : []

  const ndviTimeData = [
    { periodo: 'Semana 1', ndvi: 0.62, ndwi: 0.35 },
    { periodo: 'Semana 2', ndvi: 0.65, ndwi: 0.38 },
    { periodo: 'Semana 3', ndvi: 0.68, ndwi: 0.41 },
    { periodo: 'Semana 4', ndvi: 0.71, ndwi: 0.44 },
  ]

  return (
    <div className="min-h-screen">
      {/* Header do Projeto */}
      <div className="bg-[#1a1a2e] border-b border-gray-700/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-400" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white">{project.name}</h1>
                {getStatusBadge()}
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  {project.createdAt}
                </span>
                <span className="flex items-center gap-1">
                  <Image size={14} />
                  {project.imageCount} {project.imageCount === 1 ? 'imagem' : 'imagens'}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin size={14} />
                  {project.area} hectares
                </span>
                <span className="px-2 py-0.5 bg-gray-700 rounded text-xs">
                  {project.sourceType === 'drone' ? 'Drone' : 'Satélite'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors">
              <Share2 size={18} />
              Compartilhar
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-[#6AAF3D] hover:bg-[#5a9a34] text-white rounded-lg transition-colors">
              <Download size={18} />
              Baixar Relatório
            </button>
            <button className="p-2 hover:bg-red-900/30 text-gray-400 hover:text-red-400 rounded-lg transition-colors">
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4">
          {[
            { id: 'overview', label: 'Visão Geral', icon: <BarChart3 size={16} /> },
            { id: 'map', label: 'Mapa', icon: <MapPin size={16} /> },
            { id: 'report', label: 'Relatório', icon: <FileText size={16} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#0f0f1a] text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="p-6">
        {project.status === 'processing' ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-24 h-24 rounded-full bg-yellow-900/20 flex items-center justify-center mb-6">
              <div className="w-16 h-16 rounded-full border-4 border-yellow-500/30 border-t-yellow-500 animate-spin" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Processando imagens...</h3>
            <p className="text-gray-400 text-center max-w-md mb-4">
              O sistema está analisando suas imagens. Isso pode levar alguns minutos dependendo do tamanho dos arquivos.
            </p>
            <div className="w-64 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-yellow-500 rounded-full animate-pulse" style={{ width: '60%' }} />
            </div>
            <p className="text-sm text-gray-500 mt-2">Calculando índices de vegetação...</p>
          </div>
        ) : activeTab === 'overview' && project.results ? (
          <>
            {/* Cards de estatísticas do projeto */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard
                title="Área Analisada"
                value={project.area}
                unit="ha"
                icon={<MapPin size={24} />}
                color="green"
              />
              <StatCard
                title="Plantas Detectadas"
                value={project.results.plantCount.toLocaleString()}
                icon={<Trees size={24} />}
                color="blue"
              />
              <StatCard
                title="NDVI Médio"
                value={project.results.ndviMean.toFixed(2)}
                icon={<Leaf size={24} />}
                color="green"
              />
              <StatCard
                title="Saúde Geral"
                value={project.results.healthyPercentage}
                unit="%"
                icon={<Thermometer size={24} />}
                color={project.results.healthyPercentage >= 70 ? 'green' : project.results.healthyPercentage >= 50 ? 'yellow' : 'red'}
              />
            </div>

            {/* Segunda linha de cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard
                title="NDWI Médio"
                value={project.results.ndwiMean.toFixed(2)}
                icon={<Droplets size={24} />}
                color="blue"
              />
              <StatCard
                title="Plantas Estressadas"
                value={project.results.stressedPercentage}
                unit="%"
                icon={<AlertTriangle size={24} />}
                color="yellow"
              />
              <StatCard
                title="Plantas Críticas"
                value={project.results.criticalPercentage}
                unit="%"
                icon={<AlertTriangle size={24} />}
                color="red"
              />
              <StatCard
                title="Plantas/Hectare"
                value={Math.round(project.results.plantCount / project.area)}
                icon={<Mountain size={24} />}
                color="purple"
              />
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <DonutChart
                data={project.results.landUse}
                title="Classificação de Uso do Solo"
                centerValue={`${project.area}`}
                centerLabel="hectares"
              />
              <DonutChart
                data={plantHealthData}
                title="Saúde das Plantas"
                centerValue={`${project.results.healthyPercentage}%`}
                centerLabel="saudáveis"
              />
              <GaugeChart
                value={project.results.healthyPercentage}
                maxValue={100}
                title="Índice de Saúde"
                label="saudável"
                color={project.results.healthyPercentage >= 70 ? '#6AAF3D' : project.results.healthyPercentage >= 50 ? '#F59E0B' : '#EF4444'}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <AreaChartComponent
                data={ndviTimeData}
                title="Evolução dos Índices"
                dataKeys={[
                  { key: 'ndvi', name: 'NDVI', color: '#6AAF3D' },
                  { key: 'ndwi', name: 'NDWI', color: '#3B82F6' },
                ]}
                xAxisKey="periodo"
              />
              <BarChartComponent
                data={project.results.heightDistribution}
                title="Distribuição de Altura das Plantas"
                dataKeys={[{ key: 'quantidade', name: 'Quantidade', color: '#8B5CF6' }]}
                xAxisKey="altura"
              />
            </div>

            {/* Alertas e Recomendações */}
            <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-6">
              <h3 className="text-white font-semibold mb-4">Alertas e Recomendações</h3>
              <div className="space-y-3">
                {project.results.criticalPercentage > 5 && (
                  <div className="flex items-start gap-3 p-4 bg-red-900/20 border border-red-700/30 rounded-lg">
                    <AlertTriangle className="text-red-400 mt-0.5" size={20} />
                    <div>
                      <p className="text-red-400 font-medium">Atenção: Plantas em estado crítico</p>
                      <p className="text-gray-400 text-sm mt-1">
                        {project.results.criticalPercentage}% das plantas estão em estado crítico. Recomenda-se verificação imediata da área afetada.
                      </p>
                    </div>
                  </div>
                )}
                {project.results.stressedPercentage > 15 && (
                  <div className="flex items-start gap-3 p-4 bg-yellow-900/20 border border-yellow-700/30 rounded-lg">
                    <AlertTriangle className="text-yellow-400 mt-0.5" size={20} />
                    <div>
                      <p className="text-yellow-400 font-medium">Aviso: Plantas estressadas</p>
                      <p className="text-gray-400 text-sm mt-1">
                        {project.results.stressedPercentage}% das plantas apresentam sinais de estresse. Verifique irrigação e nutrientes.
                      </p>
                    </div>
                  </div>
                )}
                {project.results.healthyPercentage >= 70 && (
                  <div className="flex items-start gap-3 p-4 bg-green-900/20 border border-green-700/30 rounded-lg">
                    <CheckCircle className="text-green-400 mt-0.5" size={20} />
                    <div>
                      <p className="text-green-400 font-medium">Bom estado geral</p>
                      <p className="text-gray-400 text-sm mt-1">
                        A maioria das plantas ({project.results.healthyPercentage}%) está saudável. Continue com o manejo atual.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : activeTab === 'map' ? (
          <div className="h-[calc(100vh-250px)]">
            <MapView />
          </div>
        ) : activeTab === 'report' ? (
          <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-semibold">Relatório Completo</h3>
              <button className="flex items-center gap-2 px-4 py-2 bg-[#6AAF3D] hover:bg-[#5a9a34] text-white rounded-lg transition-colors">
                <Download size={18} />
                Baixar PDF
              </button>
            </div>

            <div className="prose prose-invert max-w-none">
              <div className="bg-gray-800/50 rounded-lg p-6 mb-6">
                <h4 className="text-lg font-semibold text-white mb-4">Resumo Executivo</h4>
                <p className="text-gray-400">
                  Análise realizada em {project.createdAt} para a área de {project.area} hectares.
                  Foram identificadas {project.results?.plantCount.toLocaleString()} plantas, com {project.results?.healthyPercentage}% em estado saudável.
                  O índice NDVI médio de {project.results?.ndviMean.toFixed(2)} indica vegetação em bom estado.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-800/50 rounded-lg p-6">
                  <h5 className="text-white font-medium mb-3">Informações Gerais</h5>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Nome do Projeto</dt>
                      <dd className="text-white">{project.name}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Data da Análise</dt>
                      <dd className="text-white">{project.createdAt}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Fonte das Imagens</dt>
                      <dd className="text-white">{project.sourceType === 'drone' ? 'Drone' : 'Satélite'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Área Total</dt>
                      <dd className="text-white">{project.area} hectares</dd>
                    </div>
                  </dl>
                </div>

                <div className="bg-gray-800/50 rounded-lg p-6">
                  <h5 className="text-white font-medium mb-3">Índices de Vegetação</h5>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-500">NDVI Médio</dt>
                      <dd className="text-white">{project.results?.ndviMean.toFixed(2)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">NDWI Médio</dt>
                      <dd className="text-white">{project.results?.ndwiMean.toFixed(2)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Total de Plantas</dt>
                      <dd className="text-white">{project.results?.plantCount.toLocaleString()}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Densidade</dt>
                      <dd className="text-white">{project.results ? Math.round(project.results.plantCount / project.area) : 0} plantas/ha</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
