'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Search,
  Filter,
  Grid,
  List,
  Calendar,
  MapPin,
  Plane,
  Satellite,
  MoreVertical,
  Eye,
  Download,
  Trash2,
  CheckCircle,
  Clock,
  AlertTriangle,
} from 'lucide-react'
import { loadAuthToken } from '@/lib/api'

interface Project {
  id: string
  name: string
  createdAt: string
  status: 'pending' | 'processing' | 'completed' | 'error'
  sourceType: 'drone' | 'satellite'
  imageCount: number
  area: number
  thumbnail?: string
}

interface ProjectsListProps {
  projects: Project[]
  onProjectClick: (project: Project) => void
  onUploadClick: () => void
}

const PROJECTS_PER_PAGE = 12

function AuthenticatedThumbnail({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Lazy load: only fetch when visible in viewport
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '200px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!isVisible) return
    let revoke = ''
    const token = loadAuthToken()
    fetch(src, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(res => {
        if (res.ok) return res.blob()
        throw new Error('Falha ao carregar thumbnail')
      })
      .then(blob => {
        const url = URL.createObjectURL(blob)
        revoke = url
        setBlobUrl(url)
      })
      .catch(() => setBlobUrl(null))

    return () => { if (revoke) URL.revokeObjectURL(revoke) }
  }, [src, isVisible])

  return (
    <div ref={containerRef} className={className}>
      {blobUrl ? (
        <img src={blobUrl} alt={alt} className="w-full h-full object-cover" />
      ) : isVisible ? (
        <div className="w-full h-full bg-gray-800/50 animate-pulse" />
      ) : null}
    </div>
  )
}

export default function ProjectsList({ projects, onProjectClick, onUploadClick }: ProjectsListProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'processing'>('all')
  const [currentPage, setCurrentPage] = useState(1)

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1) }, [searchQuery, filterStatus])

  const allFilteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filterStatus === 'all' || project.status === filterStatus
    return matchesSearch && matchesFilter
  })

  const totalPages = Math.max(1, Math.ceil(allFilteredProjects.length / PROJECTS_PER_PAGE))
  const filteredProjects = allFilteredProjects.slice(
    (currentPage - 1) * PROJECTS_PER_PAGE,
    currentPage * PROJECTS_PER_PAGE
  )

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} className="text-green-400" />
      case 'processing':
        return <Clock size={16} className="text-yellow-400 animate-spin" />
      case 'error':
        return <AlertTriangle size={16} className="text-red-400" />
      case 'pending':
        return <Clock size={16} className="text-blue-400" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Concluido'
      case 'processing': return 'Processando'
      case 'error': return 'Erro'
      case 'pending': return 'Pendente'
      default: return status
    }
  }

  return (
    <div>
      {/* Barra de ferramentas */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Buscar projetos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#6AAF3D] transition-colors"
            />
          </div>

          {/* Filtro */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-[#6AAF3D] transition-colors"
          >
            <option value="all">Todos os status</option>
            <option value="completed">Concluidos</option>
            <option value="processing">Processando</option>
            <option value="pending">Pendentes</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle de visualização */}
          <div className="flex items-center bg-gray-800/50 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-[#6AAF3D] text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <Grid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-[#6AAF3D] text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <List size={18} />
            </button>
          </div>

          {/* Botão novo projeto */}
          <button
            onClick={onUploadClick}
            className="px-4 py-2 bg-[#6AAF3D] hover:bg-[#5a9a34] text-white rounded-lg transition-colors font-medium"
          >
            + Novo Projeto
          </button>
        </div>
      </div>

      {/* Lista de projetos */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400">Nenhum projeto encontrado.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              onClick={() => onProjectClick(project)}
              className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl overflow-hidden cursor-pointer card-hover group"
            >
              {/* Thumbnail */}
              <div className="h-36 bg-gradient-to-br from-[#6AAF3D]/20 to-[#1B3A5C]/20 relative">
                {project.thumbnail ? (
                  <AuthenticatedThumbnail src={project.thumbnail} alt={project.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    {project.sourceType === 'drone' ? (
                      <Plane size={40} className="text-gray-600" />
                    ) : (
                      <Satellite size={40} className="text-gray-600" />
                    )}
                  </div>
                )}
                {/* Badge de status */}
                <div className={`absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                  project.status === 'completed' ? 'bg-green-900/80 text-green-400' :
                  project.status === 'processing' ? 'bg-yellow-900/80 text-yellow-400' :
                  'bg-red-900/80 text-red-400'
                }`}>
                  {getStatusIcon(project.status)}
                  {getStatusText(project.status)}
                </div>
              </div>

              {/* Info */}
              <div className="p-4">
                <h3 className="text-white font-medium truncate group-hover:text-[#6AAF3D] transition-colors">
                  {project.name}
                </h3>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {project.createdAt}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin size={12} />
                    {project.area} ha
                  </span>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs px-2 py-1 bg-gray-700/50 rounded text-gray-400">
                    {project.sourceType === 'drone' ? 'Drone' : 'Satélite'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {project.imageCount} {project.imageCount === 1 ? 'imagem' : 'imagens'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700/50">
                <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">Projeto</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">Data</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">Fonte</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">Área</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">Status</th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium text-sm">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((project) => (
                <tr
                  key={project.id}
                  onClick={() => onProjectClick(project)}
                  className="border-b border-gray-700/30 hover:bg-gray-800/30 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#6AAF3D]/20 to-[#1B3A5C]/20 flex items-center justify-center overflow-hidden">
                        {project.thumbnail ? (
                          <AuthenticatedThumbnail src={project.thumbnail} alt={project.name} className="w-full h-full object-cover" />
                        ) : project.sourceType === 'drone' ? (
                          <Plane size={18} className="text-gray-500" />
                        ) : (
                          <Satellite size={18} className="text-gray-500" />
                        )}
                      </div>
                      <span className="text-white font-medium">{project.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-400 text-sm">{project.createdAt}</td>
                  <td className="py-3 px-4">
                    <span className="text-xs px-2 py-1 bg-gray-700/50 rounded text-gray-400">
                      {project.sourceType === 'drone' ? 'Drone' : 'Satélite'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-400 text-sm">{project.area} ha</td>
                  <td className="py-3 px-4">
                    <div className={`flex items-center gap-1 text-sm ${
                      project.status === 'completed' ? 'text-green-400' :
                      project.status === 'processing' ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {getStatusIcon(project.status)}
                      {getStatusText(project.status)}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      <button className="p-2 hover:bg-gray-700 rounded-lg transition-colors" title="Visualizar">
                        <Eye size={16} className="text-gray-400 hover:text-white" />
                      </button>
                      <button className="p-2 hover:bg-gray-700 rounded-lg transition-colors" title="Download">
                        <Download size={16} className="text-gray-400 hover:text-white" />
                      </button>
                      <button className="p-2 hover:bg-red-900/30 rounded-lg transition-colors" title="Excluir">
                        <Trash2 size={16} className="text-gray-400 hover:text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-gray-500">
            Mostrando {(currentPage - 1) * PROJECTS_PER_PAGE + 1}-{Math.min(currentPage * PROJECTS_PER_PAGE, allFilteredProjects.length)} de {allFilteredProjects.length} projetos
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm rounded-lg transition-colors disabled:text-gray-600 disabled:cursor-not-allowed text-gray-400 hover:text-white hover:bg-gray-700/50"
            >
              Anterior
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 text-sm rounded-lg transition-colors ${
                  page === currentPage
                    ? 'bg-[#6AAF3D] text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-sm rounded-lg transition-colors disabled:text-gray-600 disabled:cursor-not-allowed text-gray-400 hover:text-white hover:bg-gray-700/50"
            >
              Proximo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
