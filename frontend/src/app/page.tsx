'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import {
  getProjects,
  getImages,
  loadAuthToken,
  Project as ApiProject,
} from '@/lib/api'
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
  AlertTriangle,
  Clock,
  ArrowRight,
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

// Dados fake para demonstração do sistema
const initialProjects: Project[] = [
  {
    id: '1',
    name: 'Fazenda São João - Talhão Norte',
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
    name: 'Sítio Esperança - Área de Milho',
    createdAt: '27/01/2026',
    status: 'processing',
    sourceType: 'satellite',
    imageCount: 12,
    area: 120,
  },
  {
    id: '3',
    name: 'Propriedade Rural XYZ',
    createdAt: '25/01/2026',
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
  {
    id: '4',
    name: 'Fazenda Boa Vista - Soja',
    createdAt: '22/01/2026',
    status: 'completed',
    sourceType: 'satellite',
    imageCount: 8,
    area: 850,
    results: {
      ndviMean: 0.78,
      ndwiMean: 0.52,
      plantCount: 340000,
      healthyPercentage: 85,
      stressedPercentage: 12,
      criticalPercentage: 3,
      landUse: [
        { name: 'Agricultura', value: 720, color: '#6AAF3D' },
        { name: 'Floresta', value: 60, color: '#065F46' },
        { name: 'Pastagem', value: 40, color: '#F59E0B' },
        { name: 'Água', value: 20, color: '#3B82F6' },
        { name: 'Solo Exposto', value: 10, color: '#92400E' },
      ],
      heightDistribution: [
        { altura: '0-1m', quantidade: 85000 },
        { altura: '1-2m', quantidade: 170000 },
        { altura: '2-3m', quantidade: 68000 },
        { altura: '3-4m', quantidade: 12000 },
        { altura: '>4m', quantidade: 5000 },
      ],
    },
  },
  {
    id: '5',
    name: 'Chácara do Vale - Hortaliças',
    createdAt: '20/01/2026',
    status: 'completed',
    sourceType: 'drone',
    imageCount: 28,
    area: 15,
    results: {
      ndviMean: 0.58,
      ndwiMean: 0.62,
      plantCount: 8500,
      healthyPercentage: 45,
      stressedPercentage: 35,
      criticalPercentage: 20,
      landUse: [
        { name: 'Agricultura', value: 12, color: '#6AAF3D' },
        { name: 'Floresta', value: 1, color: '#065F46' },
        { name: 'Pastagem', value: 1, color: '#F59E0B' },
        { name: 'Água', value: 0.5, color: '#3B82F6' },
        { name: 'Solo Exposto', value: 0.5, color: '#92400E' },
      ],
      heightDistribution: [
        { altura: '0-1m', quantidade: 6800 },
        { altura: '1-2m', quantidade: 1200 },
        { altura: '2-3m', quantidade: 400 },
        { altura: '3-4m', quantidade: 80 },
        { altura: '>4m', quantidade: 20 },
      ],
    },
  },
  {
    id: '6',
    name: 'Fazenda Santa Rita - Café',
    createdAt: '18/01/2026',
    status: 'completed',
    sourceType: 'drone',
    imageCount: 62,
    area: 180,
    results: {
      ndviMean: 0.69,
      ndwiMean: 0.41,
      plantCount: 95000,
      healthyPercentage: 78,
      stressedPercentage: 18,
      criticalPercentage: 4,
      landUse: [
        { name: 'Agricultura', value: 150, color: '#6AAF3D' },
        { name: 'Floresta', value: 15, color: '#065F46' },
        { name: 'Pastagem', value: 8, color: '#F59E0B' },
        { name: 'Água', value: 4, color: '#3B82F6' },
        { name: 'Solo Exposto', value: 3, color: '#92400E' },
      ],
      heightDistribution: [
        { altura: '0-1m', quantidade: 9500 },
        { altura: '1-2m', quantidade: 47500 },
        { altura: '2-3m', quantidade: 28500 },
        { altura: '3-4m', quantidade: 7600 },
        { altura: '>4m', quantidade: 1900 },
      ],
    },
  },
  {
    id: '7',
    name: 'Sítio Recanto - Fruticultura',
    createdAt: '15/01/2026',
    status: 'error',
    sourceType: 'drone',
    imageCount: 15,
    area: 45,
  },
]

export default function Home() {
  const [activeItem, setActiveItem] = useState('dashboard')
  const [activeView, setActiveView] = useState<'dashboard' | 'upload' | 'map' | 'reports' | 'projects' | 'project-detail'>('dashboard')
  const [projects, setProjects] = useState<Project[]>(initialProjects)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [isCreatingProject, setIsCreatingProject] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Carregar projetos do backend (se autenticado)
  useEffect(() => {
    const token = loadAuthToken()
    setIsAuthenticated(!!token)

    if (token) {
      loadProjectsFromApi()
    } else {
      setIsLoading(false)
    }
  }, [])

  const loadProjectsFromApi = async () => {
    try {
      setIsLoading(true)
      const response = await getProjects(0, 100)

      // Converter projetos da API para o formato local
      const apiProjects: Project[] = response.projects.map((p: ApiProject) => ({
        id: String(p.id),
        name: p.name,
        createdAt: new Date(p.created_at).toLocaleDateString('pt-BR'),
        status: p.status === 'completed' ? 'completed' : p.status === 'error' ? 'error' : 'processing',
        sourceType: 'drone' as const,
        imageCount: p.image_count || 0,
        area: p.area_hectares || 0,
        // Resultados serão carregados quando clicar no projeto
        results: p.status === 'completed' ? {
          ndviMean: 0.70,
          ndwiMean: 0.42,
          plantCount: 0,
          healthyPercentage: 75,
          stressedPercentage: 18,
          criticalPercentage: 7,
          landUse: [
            { name: 'Agricultura', value: Math.floor((p.area_hectares || 100) * 0.7), color: '#6AAF3D' },
            { name: 'Floresta', value: Math.floor((p.area_hectares || 100) * 0.15), color: '#065F46' },
            { name: 'Pastagem', value: Math.floor((p.area_hectares || 100) * 0.08), color: '#F59E0B' },
            { name: 'Água', value: Math.floor((p.area_hectares || 100) * 0.04), color: '#3B82F6' },
            { name: 'Solo Exposto', value: Math.floor((p.area_hectares || 100) * 0.03), color: '#92400E' },
          ],
          heightDistribution: [
            { altura: '0-1m', quantidade: 10000 },
            { altura: '1-2m', quantidade: 25000 },
            { altura: '2-3m', quantidade: 35000 },
            { altura: '3-4m', quantidade: 15000 },
            { altura: '>4m', quantidade: 5000 },
          ],
        } : undefined,
      }))

      // Combinar com projetos fake se não houver projetos reais
      if (apiProjects.length > 0) {
        setProjects(apiProjects)
      }
    } catch (error) {
      console.error('Erro ao carregar projetos:', error)
      // Manter projetos fake em caso de erro
    } finally {
      setIsLoading(false)
    }
  }

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

  const handleFilesUploaded = (uploadedFiles: File[], sourceType: 'drone' | 'satellite' | null, projectName: string) => {
    if (!sourceType) return

    // Simula criação de um novo projeto
    const newProject: Project = {
      id: Date.now().toString(),
      name: projectName,
      createdAt: new Date().toLocaleDateString('pt-BR'),
      status: 'processing',
      sourceType,
      imageCount: uploadedFiles.length,
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
            <UploadZone
              onFilesUploaded={handleFilesUploaded}
              onUploadComplete={(projectId) => {
                // Recarregar projetos após upload bem-sucedido
                if (isAuthenticated) {
                  loadProjectsFromApi()
                }
              }}
            />
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

            {/* Cards de alertas e acesso rápido */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {/* Card de Alertas */}
              {(() => {
                const criticalProjects = completedProjects.filter(p =>
                  p.results && p.results.criticalPercentage > 10
                )
                if (criticalProjects.length > 0) {
                  return (
                    <div className="bg-red-900/20 border border-red-700/50 rounded-xl p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-red-500/20 rounded-lg">
                          <AlertTriangle className="text-red-400" size={20} />
                        </div>
                        <div>
                          <h4 className="text-red-400 font-semibold">Alertas Críticos</h4>
                          <p className="text-red-300/70 text-xs">{criticalProjects.length} projeto(s) requer(em) atenção</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {criticalProjects.slice(0, 2).map(project => (
                          <div
                            key={project.id}
                            onClick={() => handleProjectClick(project)}
                            className="flex items-center justify-between p-2 bg-red-950/30 rounded-lg cursor-pointer hover:bg-red-950/50 transition-colors"
                          >
                            <span className="text-white text-sm truncate">{project.name}</span>
                            <span className="text-red-400 text-xs font-medium">
                              {project.results?.criticalPercentage}% crítico
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                }
                return (
                  <div className="bg-green-900/20 border border-green-700/50 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500/20 rounded-lg">
                        <Leaf className="text-green-400" size={20} />
                      </div>
                      <div>
                        <h4 className="text-green-400 font-semibold">Tudo em Ordem</h4>
                        <p className="text-green-300/70 text-xs">Nenhum alerta crítico no momento</p>
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* Card de Acesso Rápido - Último Projeto */}
              {projects.length > 0 && (
                <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                      <Clock className="text-blue-400" size={20} />
                    </div>
                    <div>
                      <h4 className="text-white font-semibold">Acesso Rápido</h4>
                      <p className="text-gray-500 text-xs">Último projeto acessado</p>
                    </div>
                  </div>
                  <div
                    onClick={() => handleProjectClick(projects[0])}
                    className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg cursor-pointer hover:bg-gray-800/50 transition-colors"
                  >
                    <div>
                      <p className="text-white text-sm font-medium">{projects[0].name}</p>
                      <p className="text-gray-500 text-xs">{projects[0].area} ha • {projects[0].createdAt}</p>
                    </div>
                    <ArrowRight className="text-gray-500" size={18} />
                  </div>
                </div>
              )}

              {/* Card de Processamento */}
              {(() => {
                const processingProjects = projects.filter(p => p.status === 'processing')
                if (processingProjects.length > 0) {
                  return (
                    <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-xl p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-yellow-500/20 rounded-lg animate-pulse">
                          <TrendingUp className="text-yellow-400" size={20} />
                        </div>
                        <div>
                          <h4 className="text-yellow-400 font-semibold">Em Processamento</h4>
                          <p className="text-yellow-300/70 text-xs">{processingProjects.length} projeto(s) sendo analisado(s)</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {processingProjects.slice(0, 2).map(project => (
                          <div
                            key={project.id}
                            className="flex items-center justify-between p-2 bg-yellow-950/30 rounded-lg"
                          >
                            <span className="text-white text-sm truncate">{project.name}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                <div className="h-full bg-yellow-400 rounded-full animate-pulse" style={{ width: '60%' }} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                }
                return null
              })()}
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
                    {projects.slice(0, 5).map(project => {
                      const isCritical = project.results && project.results.criticalPercentage > 10
                      return (
                        <div
                          key={project.id}
                          onClick={() => handleProjectClick(project)}
                          className={`flex items-center justify-between p-3 rounded-lg hover:bg-gray-800/50 transition-colors cursor-pointer ${
                            isCritical ? 'bg-red-900/20 border border-red-700/30' : 'bg-gray-800/30'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${isCritical ? 'bg-red-500/20' : 'bg-[#6AAF3D]/20'}`}>
                              {isCritical ? (
                                <AlertTriangle className="text-red-400" size={18} />
                              ) : (
                                <MapPin className="text-[#6AAF3D]" size={18} />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-white text-sm font-medium">{project.name}</p>
                                {isCritical && (
                                  <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded">
                                    CRÍTICO
                                  </span>
                                )}
                              </div>
                              <p className="text-gray-500 text-xs">{project.area} ha</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`px-2 py-1 rounded text-xs ${
                              project.status === 'completed'
                                ? isCritical
                                  ? 'bg-red-900/30 text-red-400'
                                  : 'bg-green-900/30 text-green-400'
                                : 'bg-yellow-900/30 text-yellow-400'
                            }`}>
                              {project.status === 'completed' ? (isCritical ? 'Atenção' : 'Concluído') : 'Processando'}
                            </span>
                            <p className="text-gray-500 text-xs mt-1">{project.createdAt}</p>
                          </div>
                        </div>
                      )
                    })}
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
