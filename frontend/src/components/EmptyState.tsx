'use client'

import { Upload, FolderOpen, BarChart3, FileText, Sparkles, ArrowRight, Leaf, Satellite, Bot } from 'lucide-react'

interface EmptyStateProps {
  type: 'dashboard' | 'projects' | 'reports' | 'map' | 'analysis'
  onUploadClick?: () => void
}

export default function EmptyState({ type, onUploadClick }: EmptyStateProps) {
  const content = {
    dashboard: {
      icon: BarChart3,
      title: 'Seu dashboard está vazio',
      description: 'Faça upload de imagens de drone ou satélite para começar a analisar suas propriedades e ver os dados aqui.',
      buttonText: 'Fazer Primeiro Upload',
      illustration: 'dashboard',
    },
    projects: {
      icon: FolderOpen,
      title: 'Nenhum projeto ainda',
      description: 'Seus projetos aparecerão aqui após você fazer upload de imagens. Cada upload cria um novo projeto automaticamente.',
      buttonText: 'Criar Primeiro Projeto',
      illustration: 'projects',
    },
    reports: {
      icon: FileText,
      title: 'Nenhum relatório gerado',
      description: 'Os relatórios são gerados automaticamente após o processamento das imagens. Faça um upload para começar.',
      buttonText: 'Fazer Upload',
      illustration: 'reports',
    },
    map: {
      icon: Satellite,
      title: 'Mapa aguardando dados',
      description: 'Faça upload de imagens georreferenciadas para visualizá-las no mapa interativo.',
      buttonText: 'Adicionar Imagens',
      illustration: 'map',
    },
    analysis: {
      icon: Bot,
      title: 'Sem análises ainda',
      description: 'As análises de vegetação, saúde e uso do solo aparecem aqui após o processamento.',
      buttonText: 'Iniciar Análise',
      illustration: 'analysis',
    },
  }

  const { icon: Icon, title, description, buttonText, illustration } = content[type]

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 animate-fade-in">
      {/* Ilustração animada */}
      <div className="relative mb-8">
        {/* Círculos de fundo animados */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-48 h-48 rounded-full bg-[#6AAF3D]/5 animate-pulse" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-36 h-36 rounded-full bg-[#6AAF3D]/10 animate-pulse" style={{ animationDelay: '0.5s' }} />
        </div>

        {/* Container principal do ícone */}
        <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-gray-800/80 to-gray-900/80 border border-gray-700/50 flex items-center justify-center shadow-xl">
          <Icon size={48} className="text-gray-500" />

          {/* Partículas decorativas */}
          <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#6AAF3D]/20 flex items-center justify-center animate-bounce" style={{ animationDuration: '2s' }}>
            <Sparkles size={12} className="text-[#6AAF3D]" />
          </div>
          <div className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center animate-bounce" style={{ animationDuration: '2.5s', animationDelay: '0.3s' }}>
            <Leaf size={10} className="text-blue-400" />
          </div>
        </div>
      </div>

      {/* Texto */}
      <h3 className="text-2xl font-semibold text-white mb-3 animate-slide-in-bottom" style={{ animationDelay: '0.1s' }}>
        {title}
      </h3>
      <p className="text-gray-400 text-center max-w-md mb-8 animate-slide-in-bottom" style={{ animationDelay: '0.2s' }}>
        {description}
      </p>

      {/* Botão principal */}
      <button
        onClick={onUploadClick}
        className="group flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-[#6AAF3D] to-[#5a9a34] hover:from-[#5a9a34] hover:to-[#4a8a2a] text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-[#6AAF3D]/20 hover:shadow-[#6AAF3D]/30 btn-press btn-primary-glow animate-slide-in-bottom"
        style={{ animationDelay: '0.3s' }}
      >
        <Upload size={20} className="transition-transform group-hover:-translate-y-0.5" />
        {buttonText}
        <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
      </button>

      {/* Passos do processo */}
      <div className="mt-16 w-full max-w-4xl">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="h-px flex-1 max-w-[100px] bg-gradient-to-r from-transparent to-gray-700" />
          <span className="text-gray-500 text-sm font-medium">Como funciona</span>
          <div className="h-px flex-1 max-w-[100px] bg-gradient-to-l from-transparent to-gray-700" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 stagger-children">
          {/* Passo 1 */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-[#6AAF3D]/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative p-6 rounded-2xl border border-gray-700/50 bg-gray-800/30 hover:border-[#6AAF3D]/30 transition-colors">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-[#6AAF3D]/20 flex items-center justify-center shrink-0">
                  <span className="text-[#6AAF3D] font-bold text-lg">1</span>
                </div>
                <div className="h-px flex-1 bg-gradient-to-r from-[#6AAF3D]/30 to-transparent md:hidden" />
                <Upload className="text-gray-600 md:hidden" size={20} />
              </div>
              <h4 className="text-white font-medium mb-2">Upload de Imagens</h4>
              <p className="text-sm text-gray-500">
                Envie imagens de drone (alta resolução) ou satélite (Sentinel, Landsat) do seu terreno
              </p>
            </div>
            {/* Conector */}
            <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-px bg-gradient-to-r from-gray-600 to-gray-700" />
          </div>

          {/* Passo 2 */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative p-6 rounded-2xl border border-gray-700/50 bg-gray-800/30 hover:border-blue-500/30 transition-colors">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
                  <span className="text-blue-400 font-bold text-lg">2</span>
                </div>
                <div className="h-px flex-1 bg-gradient-to-r from-blue-500/30 to-transparent md:hidden" />
                <Bot className="text-gray-600 md:hidden" size={20} />
              </div>
              <h4 className="text-white font-medium mb-2">Análise com IA</h4>
              <p className="text-sm text-gray-500">
                Nossa IA processa as imagens detectando vegetação, saúde das plantas e uso do solo
              </p>
            </div>
            {/* Conector */}
            <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-px bg-gradient-to-r from-gray-600 to-gray-700" />
          </div>

          {/* Passo 3 */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative p-6 rounded-2xl border border-gray-700/50 bg-gray-800/30 hover:border-purple-500/30 transition-colors">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
                  <span className="text-purple-400 font-bold text-lg">3</span>
                </div>
                <div className="h-px flex-1 bg-gradient-to-r from-purple-500/30 to-transparent md:hidden" />
                <FileText className="text-gray-600 md:hidden" size={20} />
              </div>
              <h4 className="text-white font-medium mb-2">Relatório Completo</h4>
              <p className="text-sm text-gray-500">
                Receba um relatório detalhado com gráficos, mapas de calor e recomendações práticas
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Call to action secundário */}
      <div className="mt-12 text-center">
        <p className="text-gray-500 text-sm">
          Formatos suportados: <span className="text-gray-400">JPG, PNG, TIFF, GeoTIFF, MP4, MOV</span>
        </p>
      </div>
    </div>
  )
}
