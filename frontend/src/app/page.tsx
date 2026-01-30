'use client'

import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import StatCard from '@/components/StatCard'
import {
  DonutChart,
  BarChartComponent,
  LineChartComponent,
  AreaChartComponent,
  HorizontalBarChart,
  GaugeChart,
} from '@/components/Charts'
import UploadZone from '@/components/UploadZone'
import MapView from '@/components/MapView'
import EmptyState from '@/components/EmptyState'
import ProjectsList from '@/components/ProjectsList'
import ProjectProfile from '@/components/ProjectProfile'
import {
  Leaf,
  Trees,
  MapPin,
  Thermometer,
  Droplets,
  Mountain,
  TrendingUp,
  FileText,
} from 'lucide-react'

// Tipo de projeto
interface Project {
  id: string
  name: string
  createdAt: string
  status: 'processing' | 'completed' | 'error'
  sourceType: 'drone' | 'satellite'
  imageCount: number
  area: number
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

// Estado inicial - sem projetos (primeira vez)
// Para testar com projetos, descomente o array abaixo
const initialProjects: Project[] = [
  // Descomente para testar com dados:
  /*
  {
    id: '1',
    name: 'Fazenda São João',
    createdAt: '28/01/2026',
    status: 'completed',
    sourceType: 'drone',
    imageCount: 45,
    area: 450,
    results: {
      ndviMean: 0.72,
      ndwiMean: 0.45,
      plantCount: 125000,
      healthyPercentage: 72,
      stressedPercentage: 20,
      criticalPercentage: 8,
      landUse: [
        { name: 'Agricultura', value: 320, color: '#6AAF3D' },
        { name: 'Floresta', value: 80, color: '#065F46' },
        { name: 'Pastagem', value: 35, color: '#F59E0B' },
        { name: 'Água', value: 10, color: '#3B82F6' },
        { name: 'Solo Exposto', value: 5, color: '#92400E' },
      ],
      heightDistribution: [
        { altura: '0-1m', quantidade: 12000 },
        { altura: '1-2m', quantidade: 35000 },
        { altura: '2-3m', quantidade: 52000 },
        { altura: '3-4m', quantidade: 21000 },
        { altura: '>4m', quantidade: 5000 },
      ],
    },
  },
  {
    id: '2',
    name: 'Sítio Esperança',
    createdAt: '25/01/2026',
    status: 'processing',
    sourceType: 'satellite',
    imageCount: 12,
    area: 120,
  },
  {
    id: '3',
    name: 'Propriedade Rural XYZ',
    createdAt: '20/01/2026',
    status: 'completed',
    sourceType: 'drone',
    imageCount: 32,
    area: 280,
    results: {
      ndviMean: 0.65,
      ndwiMean: 0.38,
      plantCount: 78000,
      healthyPercentage: 68,
      stressedPercentage: 24,
      criticalPercentage: 8,
      landUse: [
        { name: 'Agricultura', value: 200, color: '#6AAF3D' },
        { name: 'Floresta', value: 50, color: '#065F46' },
        { name: 'Pastagem', value: 20, color: '#F59E0B' },
        { name: 'Água', value: 5, color: '#3B82F6' },
        { name: 'Solo Exposto', value: 5, color: '#92400E' },
      ],
      heightDistribution: [
        { altura: '0-1m', quantidade: 8000 },
        { altura: '1-2m', quantidade: 22000 },
        { altura: '2-3m', quantidade: 30000 },
        { altura: '3-4m', quantidade: 14000 },
        { altura: '>4m', quantidade: 4000 },
      ],
    },
  },
  */
]

export default function Home() {
  const [activeItem, setActiveItem] = useState('dashboard')
  const [activeView, setActiveView] = useState<'dashboard' | 'upload' | 'map' | 'reports' | 'projects' | 'project-detail'>('dashboard')
  const [projects, setProjects] = useState<Project[]>(initialProjects)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [isCreatingProject, setIsCreatingProject] = useState(false)

  // Calcula estatísticas agregadas de todos os projetos
  const completedProjects = projects.filter(p => p.status === 'completed' && p.results)
  const totalArea = completedProjects.reduce((sum, p) => sum + p.area, 0)
  const totalPlants = completedProjects.reduce((sum, p) => sum + (p.results?.plantCount || 0), 0)
  const avgNdvi = completedProjects.length > 0
    ? completedProjects.reduce((sum, p) => sum + (p.results?.ndviMean || 0), 0) / completedProjects.length
    : 0
  const avgHealth = completedProjects.length > 0
    ? completedProjects.reduce((sum, p) => sum + (p.results?.healthyPercentage || 0), 0) / completedProjects.length
    : 0

  // Agrega dados de uso do solo de todos os projetos
  const aggregatedLandUse = completedProjects.reduce((acc, project) => {
    project.results?.landUse.forEach(item => {
      const existing = acc.find(a => a.name === item.name)
      if (existing) {
        existing.value += item.value
      } else {
        acc.push({ ...item })
      }
    })
    return acc
  }, [] as { name: string; value: number; color: string }[])

  // Agrega dados de saúde de todos os projetos
  const aggregatedHealth = completedProjects.length > 0 ? [
    {
      name: 'Saudável',
      value: Math.round(completedProjects.reduce((sum, p) => sum + (p.results?.healthyPercentage || 0), 0) / completedProjects.length),
      color: '#6AAF3D'
    },
    {
      name: 'Estressada',
      value: Math.round(completedProjects.reduce((sum, p) => sum + (p.results?.stressedPercentage || 0), 0) / completedProjects.length),
      color: '#F59E0B'
    },
    {
      name: 'Crítica',
      value: Math.round(completedProjects.reduce((sum, p) => sum + (p.results?.criticalPercentage || 0), 0) / completedProjects.length),
      color: '#EF4444'
    },
  ] : []

  const handleMenuClick = (id: string) => {
    setActiveItem(id)
    setSelectedProject(null)
    if (id === 'dashboard') setActiveView('dashboard')
    else if (id === 'upload') setActiveView('upload')
    else if (id === 'mapa') setActiveView('map')
    else if (id === 'relatorios') setActiveView('reports')
    else if (id === 'projetos') setActiveView('projects')
  }

  const handleUploadClick = () => {
    setActiveItem('upload')
    setActiveView('upload')
  }

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project as any)
    setActiveView('project-detail')
  }

  const handleFilesUploaded = (files: File[], sourceType: 'drone' | 'satellite' | null) => {
    if (!sourceType) return

    // Simula criação de um novo projeto
    const newProject: Project = {
      id: Date.now().toString(),
      name: `Novo Projeto - ${new Date().toLocaleDateString('pt-BR')}`,
      createdAt: new Date().toLocaleDateString('pt-BR'),
      status: 'processing',
      sourceType,
      imageCount: files.length,
      area: Math.floor(Math.random() * 500) + 50, // área aleatória para simulação
    }

    setProjects(prev => [newProject, ...prev])
    setIsCreatingProject(true)

    // Simula processamento (após 5 segundos, atualiza para completo)
    setTimeout(() => {
      setProjects(prev => prev.map(p => {
        if (p.id === newProject.id) {
          return {
            ...p,
            status: 'completed',
            results: {
              ndviMean: 0.65 + Math.random() * 0.15,
              ndwiMean: 0.35 + Math.random() * 0.15,
              plantCount: Math.floor(Math.random() * 100000) + 20000,
              healthyPercentage: 65 + Math.floor(Math.random() * 20),
              stressedPercentage: 15 + Math.floor(Math.random() * 10),
              criticalPercentage: 5 + Math.floor(Math.random() * 5),
              landUse: [
                { name: 'Agricultura', value: Math.floor(p.area * 0.7), color: '#6AAF3D' },
                { name: 'Floresta', value: Math.floor(p.area * 0.15), color: '#065F46' },
                { name: 'Pastagem', value: Math.floor(p.area * 0.08), color: '#F59E0B' },
                { name: 'Água', value: Math.floor(p.area * 0.04), color: '#3B82F6' },
                { name: 'Solo Exposto', value: Math.floor(p.area * 0.03), color: '#92400E' },
              ],
              heightDistribution: [
                { altura: '0-1m', quantidade: Math.floor(Math.random() * 10000) + 5000 },
                { altura: '1-2m', quantidade: Math.floor(Math.random() * 20000) + 15000 },
                { altura: '2-3m', quantidade: Math.floor(Math.random() * 30000) + 20000 },
                { altura: '3-4m', quantidade: Math.floor(Math.random() * 15000) + 10000 },
                { altura: '>4m', quantidade: Math.floor(Math.random() * 5000) + 2000 },
              ],
            },
          }
        }
        return p
      }))
      setIsCreatingProject(false)
    }, 5000)
  }

  const renderContent = () => {
    // Se tem um projeto selecionado, mostra o perfil dele
    if (activeView === 'project-detail' && selectedProject) {
      return (
        <ProjectProfile
          project={selectedProject as any}
          onBack={() => {
            setSelectedProject(null)
            setActiveView('projects')
            setActiveItem('projetos')
          }}
        />
      )
    }

    switch (activeView) {
      case 'upload':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <UploadZone onFilesUploaded={handleFilesUploaded} />
            <div className="space-y-6">
              <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-6">
                <h3 className="text-white font-semibold mb-4">Como funciona</h3>
                <div className="space-y-4 text-gray-400 text-sm">
                  <div className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#6AAF3D] text-white flex items-center justify-center text-xs font-bold shrink-0">1</span>
                    <p>Selecione se as imagens são de <strong className="text-white">Drone</strong> ou <strong className="text-white">Satélite</strong></p>
                  </div>
                  <div className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#6AAF3D] text-white flex items-center justify-center text-xs font-bold shrink-0">2</span>
                    <p>Arraste os arquivos ou clique para selecioná-los</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#6AAF3D] text-white flex items-center justify-center text-xs font-bold shrink-0">3</span>
                    <p>Clique em <strong className="text-[#6AAF3D]">"Processar e Gerar Relatório"</strong></p>
                  </div>
                  <div className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#6AAF3D] text-white flex items-center justify-center text-xs font-bold shrink-0">4</span>
                    <p>Um <strong className="text-white">novo projeto</strong> será criado automaticamente em "Meus Projetos"</p>
                  </div>
                </div>
              </div>
              <div className="bg-blue-900/20 border border-blue-700/30 rounded-xl p-6">
                <h4 className="text-blue-400 font-medium mb-2">Dica</h4>
                <p className="text-gray-400 text-sm">
                  Para melhores resultados com imagens de drone, use resolução mínima de 4K.
                  Para satélite, prefira imagens Sentinel-2 ou Landsat 8 com todas as bandas espectrais.
                </p>
              </div>
            </div>
          </div>
        )

      case 'map':
        return (
          <div className="h-[calc(100vh-120px)]">
            <MapView />
          </div>
        )

      case 'reports':
        if (projects.length === 0) {
          return (
            <EmptyState type="reports" onUploadClick={handleUploadClick} />
          )
        }
        return (
          <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-6">
            <h3 className="text-white font-semibold mb-6">Relatórios Gerados</h3>
            <div className="space-y-4">
              {projects.filter(p => p.status === 'completed').map(project => (
                <div key={project.id} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-[#6AAF3D]/20 rounded-lg">
                      <FileText className="text-[#6AAF3D]" size={24} />
                    </div>
                    <div>
                      <p className="text-white font-medium">{project.name}</p>
                      <p className="text-gray-500 text-sm">{project.area} ha • {project.createdAt}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleProjectClick(project)}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
                    >
                      Ver Detalhes
                    </button>
                    <button className="px-4 py-2 bg-[#6AAF3D] hover:bg-[#5a9a34] text-white rounded-lg text-sm transition-colors">
                      Baixar PDF
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )

      case 'projects':
        if (projects.length === 0) {
          return (
            <EmptyState type="projects" onUploadClick={handleUploadClick} />
          )
        }
        return (
          <ProjectsList
            projects={projects}
            onProjectClick={handleProjectClick}
            onUploadClick={handleUploadClick}
          />
        )

      default: // dashboard
        if (projects.length === 0) {
          return (
            <EmptyState type="dashboard" onUploadClick={handleUploadClick} />
          )
        }

        return (
          <>
            {/* Cards de estatísticas agregadas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard
                title="Área Total Analisada"
                value={totalArea.toLocaleString()}
                unit="ha"
                icon={<MapPin size={24} />}
                color="green"
              />
              <StatCard
                title="Total de Plantas"
                value={(totalPlants / 1000).toFixed(1)}
                unit="mil"
                icon={<Trees size={24} />}
                color="blue"
              />
              <StatCard
                title="NDVI Médio"
                value={avgNdvi.toFixed(2)}
                icon={<Leaf size={24} />}
                color="green"
              />
              <StatCard
                title="Saúde Média"
                value={Math.round(avgHealth)}
                unit="%"
                icon={<Thermometer size={24} />}
                color={avgHealth >= 70 ? 'green' : avgHealth >= 50 ? 'yellow' : 'red'}
              />
            </div>

            {/* Segunda linha de cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard
                title="Projetos Ativos"
                value={projects.length}
                icon={<FileText size={24} />}
                color="purple"
              />
              <StatCard
                title="Análises Concluídas"
                value={completedProjects.length}
                icon={<TrendingUp size={24} />}
                color="blue"
              />
              <StatCard
                title="Área Agriculturável"
                value={Math.round(aggregatedLandUse.find(l => l.name === 'Agricultura')?.value || 0)}
                unit="ha"
                icon={<Mountain size={24} />}
                color="green"
              />
              <StatCard
                title="NDWI Médio"
                value={(completedProjects.reduce((sum, p) => sum + (p.results?.ndwiMean || 0), 0) / (completedProjects.length || 1)).toFixed(2)}
                icon={<Droplets size={24} />}
                color="blue"
              />
            </div>

            {/* Gráficos principais */}
            {completedProjects.length > 0 && (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                  <DonutChart
                    data={aggregatedLandUse}
                    title="Classificação de Uso do Solo (Total)"
                    centerValue={`${totalArea}`}
                    centerLabel="hectares"
                  />
                  <DonutChart
                    data={aggregatedHealth}
                    title="Saúde das Plantas (Média)"
                    centerValue={`${Math.round(avgHealth)}%`}
                    centerLabel="saudáveis"
                  />
                  <GaugeChart
                    value={Math.round(avgHealth)}
                    maxValue={100}
                    title="Índice Geral de Saúde"
                    label="saudável"
                    color={avgHealth >= 70 ? '#6AAF3D' : avgHealth >= 50 ? '#F59E0B' : '#EF4444'}
                  />
                </div>

                {/* Lista de projetos recentes */}
                <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-semibold">Projetos Recentes</h3>
                    <button
                      onClick={() => {
                        setActiveItem('projetos')
                        setActiveView('projects')
                      }}
                      className="text-[#6AAF3D] text-sm hover:underline"
                    >
                      Ver todos
                    </button>
                  </div>
                  <div className="space-y-3">
                    {projects.slice(0, 5).map(project => (
                      <div
                        key={project.id}
                        onClick={() => handleProjectClick(project)}
                        className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-[#6AAF3D]/20 rounded-lg">
                            <MapPin className="text-[#6AAF3D]" size={18} />
                          </div>
                          <div>
                            <p className="text-white text-sm font-medium">{project.name}</p>
                            <p className="text-gray-500 text-xs">{project.area} ha</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-1 rounded text-xs ${
                            project.status === 'completed'
                              ? 'bg-green-900/30 text-green-400'
                              : 'bg-yellow-900/30 text-yellow-400'
                          }`}>
                            {project.status === 'completed' ? 'Concluído' : 'Processando'}
                          </span>
                          <p className="text-gray-500 text-xs mt-1">{project.createdAt}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        )
    }
  }

  const getPageTitle = () => {
    if (activeView === 'project-detail' && selectedProject) {
      return { title: selectedProject.name, subtitle: 'Detalhes do projeto' }
    }
    switch (activeView) {
      case 'upload': return { title: 'Upload de Imagens', subtitle: 'Envie imagens de drone ou satélite para criar um novo projeto' }
      case 'map': return { title: 'Visualizar Mapa', subtitle: 'Visualize e analise as camadas geoespaciais' }
      case 'reports': return { title: 'Relatórios', subtitle: 'Gerencie e baixe seus relatórios' }
      case 'projects': return { title: 'Meus Projetos', subtitle: `${projects.length} projeto${projects.length !== 1 ? 's' : ''} cadastrado${projects.length !== 1 ? 's' : ''}` }
      default: return {
        title: 'Dashboard',
        subtitle: projects.length > 0
          ? `Visão geral de ${projects.length} projeto${projects.length !== 1 ? 's' : ''}`
          : 'Comece fazendo upload de imagens'
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f1a]">
      <Sidebar activeItem={activeItem} onItemClick={handleMenuClick} />

      <main className="ml-[280px]">
        {activeView !== 'project-detail' && <Header {...getPageTitle()} />}

        <div className={activeView === 'project-detail' ? '' : 'p-6'}>
          {renderContent()}
        </div>
      </main>
    </div>
  )
}
