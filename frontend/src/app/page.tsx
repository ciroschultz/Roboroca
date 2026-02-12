'use client'

import { useState, useEffect, useRef } from 'react'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import AuthScreen from '@/components/AuthScreen'
import {
  getProjects,
  getImages,
  getImageThumbnailUrl,
  loadAuthToken,
  getCurrentUser,
  logout as apiLogout,
  getProjectAnalysisSummary,
  Project as ApiProject,
  User,
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
import SettingsPage from '@/components/SettingsPage'
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
  Menu,
  X,
} from 'lucide-react'

// Tipo de projeto
interface Project {
  id: string
  name: string
  createdAt: string
  status: 'pending' | 'processing' | 'completed' | 'error'
  sourceType: 'drone' | 'satellite'
  imageCount: number
  area: number
  thumbnail?: string
  results?: {
    vegetationCoverage: number  // % de cobertura vegetal (era ndviMean)
    healthIndex: number         // % índice de saúde (era ndwiMean)
    plantCount: number          // Total de árvores detectadas
    healthyPercentage: number
    stressedPercentage: number
    criticalPercentage: number
    landUse: { name: string; value: number; color: string }[]
    heightDistribution: { altura: string; quantidade: number }[]
  }
}

// Array vazio - projetos serão carregados do backend ou criados via upload
const initialProjects: Project[] = []

export default function Home() {
  const [activeItem, setActiveItem] = useState('dashboard')
  const [activeView, setActiveView] = useState<'dashboard' | 'upload' | 'map' | 'reports' | 'projects' | 'project-detail' | 'settings' | 'help'>('dashboard')
  const [projects, setProjects] = useState<Project[]>(initialProjects)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [isCreatingProject, setIsCreatingProject] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [projectInitialTab, setProjectInitialTab] = useState<'overview' | 'map' | 'analysis' | 'report' | undefined>(undefined)
  const [analysisSection, setAnalysisSection] = useState<string | undefined>(undefined)

  // Carregar usuário e projetos do backend (se autenticado)
  useEffect(() => {
    const checkAuth = async () => {
      const token = loadAuthToken()
      if (token) {
        try {
          const user = await getCurrentUser()
          setCurrentUser(user)
          setIsAuthenticated(true)
          await loadProjectsFromApi()
        } catch (error) {
          // Token inválido ou expirado
          apiLogout()
          setIsAuthenticated(false)
        }
      } else {
        setIsAuthenticated(false)
      }
      setIsLoading(false)
    }
    checkAuth()
  }, [])

  // Handler para login/cadastro bem-sucedido
  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user)
    setIsAuthenticated(true)
    loadProjectsFromApi()
  }

  // Handler para logout
  const handleLogout = () => {
    apiLogout()
    setCurrentUser(null)
    setIsAuthenticated(false)
    setProjects(initialProjects)
  }

  const loadProjectsFromApi = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true)
      const response = await getProjects(0, 100)

      // Converter projetos da API para o formato local
      const apiProjects: Project[] = await Promise.all(
        response.projects.map(async (p: ApiProject) => {
          // Tentar carregar resumo de análise para projetos completos ou em processamento
          // (para manter dados anteriores enquanto re-analisa)
          let results: Project['results'] = undefined
          let summary: { analyzed_images: number; vegetation_coverage_avg: number; health_index_avg: number; total_objects_detected: number; healthy_percentage: number; stressed_percentage: number; critical_percentage: number; land_use_summary: Record<string, number>; total_area_ha: number } | null = null

          if (p.status === 'completed' || p.status === 'processing') {
            try {
              summary = await getProjectAnalysisSummary(p.id)
              if (summary.analyzed_images > 0) {
                // Usar dados reais do backend
                results = {
                  vegetationCoverage: summary.vegetation_coverage_avg || 0,
                  healthIndex: summary.health_index_avg || 0,
                  plantCount: summary.total_objects_detected || 0,
                  healthyPercentage: Math.round(summary.healthy_percentage || 0),
                  stressedPercentage: Math.round(summary.stressed_percentage || 0),
                  criticalPercentage: Math.round(summary.critical_percentage || 0),
                  landUse: Object.entries(summary.land_use_summary || {}).map(([name, value]) => ({
                    name,
                    value: Math.round(value as number),
                    color: getLandUseColor(name)
                  })),
                  heightDistribution: [], // Placeholder - não implementado ainda
                }
              }
            } catch {
              // Ignorar erro ao carregar resumo
            }
          }

          // Buscar thumbnail da primeira imagem do projeto
          let thumbnail: string | undefined
          try {
            if (p.image_count > 0) {
              const imagesResponse = await getImages(p.id, 0, 1)
              if (imagesResponse.images.length > 0) {
                thumbnail = getImageThumbnailUrl(imagesResponse.images[0].id)
              }
            }
          } catch {
            // Ignorar erro ao buscar thumbnail
          }

          // Usar área do projeto (calculada das dimensões da imagem ou GPS)
          // Prioridade: total_area_ha do projeto > area_hectares > summary area > 0
          let projectArea = p.total_area_ha || p.area_hectares || 0

          // Reuse summary from above to get area (avoid duplicate API call)
          if (projectArea === 0 && summary && summary.total_area_ha > 0) {
            projectArea = summary.total_area_ha
          }

          return {
            id: String(p.id),
            name: p.name,
            createdAt: new Date(p.created_at).toLocaleDateString('pt-BR'),
            status: p.status === 'completed' ? 'completed' : p.status === 'error' ? 'error' : p.status === 'processing' ? 'processing' : 'pending',
            sourceType: (p as any).source_type || 'drone',
            imageCount: p.image_count || 0,
            area: projectArea,
            thumbnail,
            results,
          }
        })
      )

      setProjects(apiProjects)
    } catch (error) {
      console.error('Erro ao carregar projetos:', error)
      // Em caso de erro, mantém lista vazia
      setProjects([])
    } finally {
      if (!silent) setIsLoading(false)
    }
  }

  // Função auxiliar para cores de uso do solo
  const getLandUseColor = (name: string): string => {
    const colors: Record<string, string> = {
      'vegetacao': '#6AAF3D',
      'Agricultura': '#6AAF3D',
      'solo_exposto': '#92400E',
      'Solo Exposto': '#92400E',
      'agua': '#3B82F6',
      'Água': '#3B82F6',
      'construcao': '#6B7280',
      'Construção': '#6B7280',
      'sombra': '#1F2937',
      'Sombra': '#1F2937',
      'Floresta': '#065F46',
      'Pastagem': '#F59E0B',
    }
    return colors[name] || '#6AAF3D'
  }

  // Ref para acessar projects no polling sem causar re-criação do interval
  const projectsRef = useRef(projects)
  useEffect(() => {
    projectsRef.current = projects
  }, [projects])

  // Polling para verificar status de projetos em processamento
  useEffect(() => {
    if (!isAuthenticated) return

    const interval = setInterval(async () => {
      const hasProcessing = projectsRef.current.some(p => p.status === 'processing')
      if (hasProcessing) {
        await loadProjectsFromApi(true)
      }
    }, 10000) // Verificar a cada 10 segundos

    return () => clearInterval(interval)
  }, [isAuthenticated])

  // Calcula estatísticas agregadas de todos os projetos
  const completedProjects = projects.filter(p => p.status === 'completed' && p.results)
  const totalArea = completedProjects.reduce((sum, p) => sum + p.area, 0)
  const totalPlants = completedProjects.reduce((sum, p) => sum + (p.results?.plantCount || 0), 0)
  const avgVegetationCoverage = completedProjects.length > 0
    ? completedProjects.reduce((sum, p) => sum + (p.results?.vegetationCoverage || 0), 0) / completedProjects.length
    : 0
  const avgHealthIndex = completedProjects.length > 0
    ? completedProjects.reduce((sum, p) => sum + (p.results?.healthIndex || 0), 0) / completedProjects.length
    : 0
  const avgHealthyPct = completedProjects.length > 0
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

  // IDs dos submenus de análise na sidebar
  const analysisSubmenuIds = ['cobertura', 'saude-indice', 'uso-solo', 'contagem', 'saude', 'altura']

  const handleMenuClick = (id: string) => {
    setActiveItem(id)
    if (analysisSubmenuIds.includes(id)) {
      // Navigate to analysis tab - use current project if already viewing one
      const targetProject = selectedProject || projects.find(p => p.status === 'completed') || projects[0]
      if (targetProject) {
        setSelectedProject(targetProject as any)
        setProjectInitialTab('analysis')
        setAnalysisSection(id)
        setActiveView('project-detail')
      } else {
        setActiveView('projects')
      }
    } else {
      setSelectedProject(null)
      if (id === 'dashboard') setActiveView('dashboard')
      else if (id === 'upload') setActiveView('upload')
      else if (id === 'mapa') setActiveView('map')
      else if (id === 'relatorios') setActiveView('reports')
      else if (id === 'projetos') setActiveView('projects')
      else if (id === 'configuracoes') setActiveView('settings')
      else if (id === 'ajuda') setActiveView('help')
    }
  }

  const handleUploadClick = () => {
    setActiveItem('upload')
    setActiveView('upload')
  }

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project as any)
    setProjectInitialTab(undefined)
    setAnalysisSection(undefined)
    setActiveView('project-detail')
  }

  // Handler chamado após upload bem-sucedido (modo demo)
  const handleFilesUploaded = (uploadedFiles: File[], sourceType: 'drone' | 'satellite' | null, projectName: string) => {
    if (!sourceType) return

    // Em modo demo (não autenticado), criar projeto local temporário
    const newProject: Project = {
      id: `demo-${Date.now()}`,
      name: projectName,
      createdAt: new Date().toLocaleDateString('pt-BR'),
      status: 'processing',
      sourceType,
      imageCount: uploadedFiles.length,
      area: 0, // Será calculado pelo backend quando autenticado
    }

    setProjects(prev => [newProject, ...prev])
    setIsCreatingProject(true)

    // Em modo demo, simular conclusão após alguns segundos
    setTimeout(() => {
      setProjects(prev => prev.map(p => {
        if (p.id === newProject.id) {
          return { ...p, status: 'completed' }
        }
        return p
      }))
      setIsCreatingProject(false)
      // Ir para a página de projetos
      setActiveItem('projetos')
      setActiveView('projects')
    }, 3000)
  }

  // Handler para quando o upload real for concluído (modo autenticado)
  const handleUploadComplete = async (projectId: number) => {
    setIsCreatingProject(true)

    // Recarregar projetos do backend
    await loadProjectsFromApi()

    setIsCreatingProject(false)

    // Ir para a página de projetos
    setActiveItem('projetos')
    setActiveView('projects')
  }

  const renderContent = () => {
    // Se tem um projeto selecionado, mostra o perfil dele
    if (activeView === 'project-detail' && selectedProject) {
      return (
        <ProjectProfile
          project={selectedProject as any}
          initialTab={projectInitialTab}
          analysisSection={analysisSection}
          onBack={() => {
            setSelectedProject(null)
            setProjectInitialTab(undefined)
            setAnalysisSection(undefined)
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
              onUploadComplete={handleUploadComplete}
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

      case 'settings':
        return <SettingsPage currentUser={currentUser} />

      case 'help':
        return (
          <div className="max-w-4xl mx-auto">
            <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-8">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-[#6AAF3D]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-[#6AAF3D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Central de Ajuda</h2>
                <p className="text-gray-400">Como podemos ajudar você hoje?</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {[
                  { title: 'Primeiros Passos', desc: 'Aprenda a usar o Roboroça', icon: '🚀' },
                  { title: 'Upload de Imagens', desc: 'Como enviar imagens de drone/satélite', icon: '📤' },
                  { title: 'Análises', desc: 'Entenda os tipos de análise disponíveis', icon: '📊' },
                  { title: 'Relatórios', desc: 'Como gerar e exportar relatórios', icon: '📄' },
                ].map((item, i) => (
                  <button
                    key={i}
                    className="flex items-center gap-4 p-4 bg-gray-800/30 rounded-xl border border-gray-700/30 hover:border-[#6AAF3D]/30 transition-colors text-left group"
                  >
                    <span className="text-3xl">{item.icon}</span>
                    <div>
                      <p className="text-white font-medium group-hover:text-[#6AAF3D] transition-colors">{item.title}</p>
                      <p className="text-gray-500 text-sm">{item.desc}</p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="p-6 bg-gradient-to-br from-[#6AAF3D]/10 to-transparent rounded-xl border border-[#6AAF3D]/20">
                <h3 className="text-white font-semibold mb-2">Precisa de mais ajuda?</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Nossa equipe de suporte está disponível para ajudar você com qualquer dúvida.
                </p>
                <button className="px-4 py-2 bg-[#6AAF3D] hover:bg-[#5a9a34] text-white font-medium rounded-lg transition-colors">
                  Entrar em contato
                </button>
              </div>
            </div>
          </div>
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
                title="Area Total Analisada"
                value={totalArea}
                unit="ha"
                icon={<MapPin size={24} />}
                color="green"
              />
              <StatCard
                title="Árvores Detectadas"
                value={totalPlants}
                unit="árvores"
                icon={<Trees size={24} />}
                color="blue"
              />
              <StatCard
                title="Cobertura Vegetal"
                value={avgVegetationCoverage.toFixed(1)}
                unit="%"
                icon={<Leaf size={24} />}
                color="green"
              />
              <StatCard
                title="Indice de Saude"
                value={Math.round(avgHealthIndex)}
                unit="%"
                icon={<Thermometer size={24} />}
                color={avgHealthIndex >= 70 ? 'green' : avgHealthIndex >= 50 ? 'yellow' : 'red'}
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
                title="Analises Concluidas"
                value={completedProjects.length}
                icon={<TrendingUp size={24} />}
                color="blue"
              />
              <StatCard
                title="Area Agricultavel"
                value={Math.round(aggregatedLandUse.find(l => l.name === 'Agricultura')?.value || 0)}
                unit="%"
                icon={<Mountain size={24} />}
                color="green"
              />
              <StatCard
                title="Vegetacao Saudavel"
                value={Math.round(avgHealthyPct)}
                unit="%"
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
                    title="Saude das Plantas (Media)"
                    centerValue={`${Math.round(avgHealthyPct)}%`}
                    centerLabel="saudaveis"
                  />
                  <GaugeChart
                    value={Math.round(avgHealthIndex)}
                    maxValue={100}
                    title="Indice Geral de Saude"
                    label="saudavel"
                    color={avgHealthIndex >= 70 ? '#6AAF3D' : avgHealthIndex >= 50 ? '#F59E0B' : '#EF4444'}
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
      case 'settings': return { title: 'Configurações', subtitle: 'Gerencie sua conta e preferências' }
      case 'help': return { title: 'Ajuda', subtitle: 'Central de suporte e documentação' }
      default: return {
        title: 'Dashboard',
        subtitle: projects.length > 0
          ? `Visão geral de ${projects.length} projeto${projects.length !== 1 ? 's' : ''}`
          : 'Comece fazendo upload de imagens'
      }
    }
  }

  // Mostrar loading enquanto verifica autenticação
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0f1a] via-[#1a1a2e] to-[#0f2027] flex items-center justify-center">
        <div className="text-center">
          <img
            src="/logo-icon.png"
            alt="Roboroça"
            className="w-24 h-24 mx-auto mb-4 animate-pulse"
          />
          <p className="text-gray-400">Carregando...</p>
        </div>
      </div>
    )
  }

  // Fechar menu mobile ao mudar de página
  const handleMenuClickWithMobile = (id: string) => {
    handleMenuClick(id)
    setMobileMenuOpen(false)
  }

  // Mostrar tela de autenticação se não estiver autenticado
  if (!isAuthenticated) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />
  }

  return (
    <div className="min-h-screen bg-[#0f0f1a]">
      {/* Sidebar Desktop - oculta em mobile */}
      <div className="hidden lg:block">
        <Sidebar
          activeItem={activeItem}
          onItemClick={handleMenuClick}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
      </div>

      {/* Menu Mobile Overlay */}
      <div
        className={`
          fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden
          transition-opacity duration-300
          ${mobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Sidebar Mobile - deslizante */}
      <div
        className={`
          fixed top-0 left-0 h-full w-[280px] z-50 lg:hidden
          transform transition-transform duration-300 ease-out
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <Sidebar
          activeItem={activeItem}
          onItemClick={handleMenuClickWithMobile}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
        {/* Botão de fechar no mobile */}
        <button
          onClick={() => setMobileMenuOpen(false)}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors lg:hidden"
        >
          <X size={20} />
        </button>
      </div>

      {/* Conteúdo Principal */}
      <main className="lg:ml-[280px] min-h-screen">
        {activeView !== 'project-detail' && (
          <header className="h-16 bg-gradient-to-r from-[#1a1a2e]/95 to-[#1a1a2e]/90 backdrop-blur-md border-b border-gray-700/30 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
            {/* Botão Menu Mobile */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-xl transition-colors"
              >
                <Menu size={24} />
              </button>
              <div>
                <h1 className="text-lg lg:text-xl font-bold text-white">{getPageTitle().title}</h1>
                {getPageTitle().subtitle && (
                  <p className="text-xs lg:text-sm text-gray-400 hidden sm:block">{getPageTitle().subtitle}</p>
                )}
              </div>
            </div>

            {/* Header Actions - versão compacta */}
            <Header
              title=""
              subtitle=""
              currentUser={currentUser}
              onLogout={handleLogout}
              compact
            />
          </header>
        )}

        <div className={activeView === 'project-detail' ? '' : 'p-4 lg:p-6'}>
          {renderContent()}
        </div>
      </main>
    </div>
  )
}
