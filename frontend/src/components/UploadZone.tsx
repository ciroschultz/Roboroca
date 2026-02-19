'use client'

import { useState, useCallback, useEffect } from 'react'
import { Upload, Image, Video, Satellite, Plane, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import {
  createProject,
  uploadMultipleImages,
  loadAuthToken,
  analyzeProject,
  ApiError,
} from '@/lib/api'

type SourceType = 'drone' | 'satellite' | null

// Validação de upload
const MAX_IMAGE_SIZE = 50 * 1024 * 1024   // 50MB
const MAX_VIDEO_SIZE = 500 * 1024 * 1024  // 500MB
const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.tif', '.tiff', '.geotiff']
const ALLOWED_VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.mkv']
const ALLOWED_EXTENSIONS = [...ALLOWED_IMAGE_EXTENSIONS, ...ALLOWED_VIDEO_EXTENSIONS]

function getFileExtension(filename: string): string {
  return filename.slice(filename.lastIndexOf('.')).toLowerCase()
}

function isVideoExtension(ext: string): boolean {
  return ALLOWED_VIDEO_EXTENSIONS.includes(ext)
}

function validateFile(file: File): string | null {
  const ext = getFileExtension(file.name)

  // Validar formato
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return `Formato "${ext}" não suportado. Use: ${ALLOWED_EXTENSIONS.join(', ')}`
  }

  // Validar tamanho
  if (isVideoExtension(ext)) {
    if (file.size > MAX_VIDEO_SIZE) {
      return `Vídeo muito grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo: 500MB`
    }
  } else {
    if (file.size > MAX_IMAGE_SIZE) {
      return `Imagem muito grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo: 50MB`
    }
  }

  return null
}

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  preview?: string
  file: File
  errorMessage?: string
}

interface UploadZoneProps {
  onUploadComplete?: (projectId: number) => void
  onFilesUploaded?: (files: File[], source: SourceType, projectName: string) => void
}

export default function UploadZone({ onUploadComplete, onFilesUploaded }: UploadZoneProps) {
  const [sourceType, setSourceType] = useState<SourceType>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [projectName, setProjectName] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [createdProjectId, setCreatedProjectId] = useState<number | null>(null)

  // Verificar autenticação ao montar
  useEffect(() => {
    const token = loadAuthToken()
    setIsAuthenticated(!!token)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const processFiles = useCallback((fileList: FileList) => {
    const newFiles: UploadedFile[] = []
    const errors: string[] = []

    Array.from(fileList).forEach((file) => {
      const validationError = validateFile(file)
      if (validationError) {
        errors.push(`${file.name}: ${validationError}`)
        return
      }

      newFiles.push({
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'pending' as const,
        progress: 0,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
        file,
      })
    })

    if (errors.length > 0) {
      setUploadError(errors.join('\n'))
    } else {
      setUploadError(null)
    }

    if (newFiles.length > 0) {
      setFiles((prev) => [...prev, ...newFiles])
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && sourceType) {
      processFiles(e.dataTransfer.files)
    }
  }, [sourceType, processFiles])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && sourceType) {
      processFiles(e.target.files)
    }
  }, [sourceType, processFiles])

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const file = prev.find(f => f.id === id)
      if (file?.preview) {
        URL.revokeObjectURL(file.preview)
      }
      return prev.filter((f) => f.id !== id)
    })
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  // Upload real usando a API
  const handleUpload = async () => {
    if (!projectName.trim() || files.length === 0) return

    setIsProcessing(true)
    setUploadError(null)

    try {
      // 1. Criar projeto primeiro
      const project = await createProject({
        name: projectName.trim(),
        description: `Projeto criado via upload - ${sourceType === 'drone' ? 'Imagens de Drone' : 'Imagens de Satélite'}`,
      })

      // 2. Upload em lote (batch)
      const filesToUpload = files.filter(f => f.status !== 'success')

      // Marcar todos como uploading
      setFiles(prev => prev.map(f =>
        filesToUpload.some(u => u.id === f.id)
          ? { ...f, status: 'uploading' as const }
          : f
      ))

      const result = await uploadMultipleImages(
        filesToUpload.map(f => f.file),
        project.id,
        sourceType as 'drone' | 'satellite',
        (totalProgress) => {
          setFiles(prev => prev.map(f =>
            filesToUpload.some(u => u.id === f.id)
              ? { ...f, progress: totalProgress }
              : f
          ))
        }
      )

      // Marcar sucesso
      setFiles(prev => prev.map(f =>
        filesToUpload.some(u => u.id === f.id)
          ? { ...f, status: 'success' as const, progress: 100 }
          : f
      ))

      // Marcar erros individuais (se houver)
      if (result.errors) {
        for (const err of result.errors) {
          setFiles(prev => prev.map(f =>
            f.name === err.filename
              ? { ...f, status: 'error' as const, errorMessage: err.error }
              : f
          ))
        }
      }

      // 3. Disparar análise automática
      try {
        await analyzeProject(project.id)
      } catch (analysisError) {
        // Continuar mesmo se a análise falhar - pode ser executada depois
        console.warn('Análise automática não iniciada:', analysisError)
      }

      // Marcar sucesso
      setUploadSuccess(true)
      setCreatedProjectId(project.id)

      // 4. Chamar callback se fornecido (após pequeno delay para mostrar sucesso)
      setTimeout(() => {
        if (onUploadComplete) {
          onUploadComplete(project.id)
        }

        // Se também tiver o callback legado
        if (onFilesUploaded) {
          onFilesUploaded(files.map(f => f.file), sourceType, projectName)
        }
      }, 2000)

    } catch (err) {
      const errorMsg = err instanceof ApiError ? err.detail : 'Erro ao criar projeto'
      setUploadError(errorMsg)
    } finally {
      setIsProcessing(false)
    }
  }

  // Upload simulado (para quando não estiver autenticado - modo demo)
  const handleDemoUpload = () => {
    const filesToUpload = files.filter(f => f.status !== 'success')

    filesToUpload.forEach((file) => {
      let progress = 0
      const interval = setInterval(() => {
        progress += Math.random() * 30
        if (progress >= 100) {
          progress = 100
          clearInterval(interval)
          setFiles((prev) =>
            prev.map((f) =>
              f.id === file.id ? { ...f, progress: 100, status: 'success' as const } : f
            )
          )
        } else {
          setFiles((prev) =>
            prev.map((f) => (f.id === file.id ? { ...f, progress, status: 'uploading' as const } : f))
          )
        }
      }, 200)
    })

    // Callback para modo demo
    if (onFilesUploaded && projectName.trim()) {
      setTimeout(() => {
        onFilesUploaded(files.map(f => f.file), sourceType, projectName.trim())
      }, 2000)
    }
  }

  const allUploaded = files.length > 0 && files.every(f => f.status === 'success')
  const hasErrors = files.some(f => f.status === 'error')
  const canUpload = files.length > 0 && projectName.trim() && !isProcessing

  return (
    <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-6">
      <h2 className="text-xl font-bold text-white mb-6">Upload de Imagens</h2>

      {/* Aviso de autenticação */}
      {!isAuthenticated && (
        <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-center gap-2">
          <AlertCircle size={18} className="text-yellow-500" />
          <span className="text-yellow-400 text-sm">
            Modo demonstração - faça login para salvar dados no servidor
          </span>
        </div>
      )}

      {/* Seleção de fonte */}
      <div className="mb-6">
        <p className="text-gray-400 mb-3">Selecione a fonte das imagens:</p>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setSourceType('drone')}
            className={`p-4 rounded-xl border-2 transition-all duration-300 flex flex-col items-center gap-3
              ${sourceType === 'drone'
                ? 'border-[#6AAF3D] bg-[#6AAF3D]/10'
                : 'border-gray-700 hover:border-gray-600 bg-gray-800/30'
              }`}
          >
            <div className={`p-3 rounded-full ${sourceType === 'drone' ? 'bg-[#6AAF3D]/20' : 'bg-gray-700'}`}>
              <Plane size={32} className={sourceType === 'drone' ? 'text-[#6AAF3D]' : 'text-gray-400'} />
            </div>
            <div className="text-center">
              <p className={`font-semibold ${sourceType === 'drone' ? 'text-[#6AAF3D]' : 'text-white'}`}>
                Imagens de Drone
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Fotos ou vídeos capturados por UAV
              </p>
            </div>
          </button>

          <button
            onClick={() => setSourceType('satellite')}
            className={`p-4 rounded-xl border-2 transition-all duration-300 flex flex-col items-center gap-3
              ${sourceType === 'satellite'
                ? 'border-[#6AAF3D] bg-[#6AAF3D]/10'
                : 'border-gray-700 hover:border-gray-600 bg-gray-800/30'
              }`}
          >
            <div className={`p-3 rounded-full ${sourceType === 'satellite' ? 'bg-[#6AAF3D]/20' : 'bg-gray-700'}`}>
              <Satellite size={32} className={sourceType === 'satellite' ? 'text-[#6AAF3D]' : 'text-gray-400'} />
            </div>
            <div className="text-center">
              <p className={`font-semibold ${sourceType === 'satellite' ? 'text-[#6AAF3D]' : 'text-white'}`}>
                Imagens de Satélite
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Sentinel, Landsat, etc.
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Nome do projeto */}
      {sourceType && (
        <div className="mb-6">
          <label htmlFor="project-name" className="block text-gray-400 mb-2">
            Nome do Projeto <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            id="project-name"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Ex: Fazenda São João - Talhão 5"
            disabled={isProcessing}
            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#6AAF3D] focus:ring-1 focus:ring-[#6AAF3D] transition-colors disabled:opacity-50"
          />
          <p className="text-gray-600 text-xs mt-2">
            Escolha um nome descritivo para identificar facilmente o projeto
          </p>
        </div>
      )}

      {/* Área de drop */}
      {sourceType && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`drop-zone rounded-xl p-8 text-center transition-all duration-300
            ${isDragging ? 'active' : ''}
            ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
        >
          <input
            type="file"
            id="file-upload"
            multiple
            accept=".jpg,.jpeg,.png,.tif,.tiff,.geotiff,.mp4,.mov,.avi,.mkv"
            onChange={handleFileSelect}
            disabled={isProcessing}
            className="hidden"
          />
          <label htmlFor="file-upload" className={`${isProcessing ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
            <div className="flex flex-col items-center gap-4">
              <div className={`p-4 rounded-full ${isDragging ? 'bg-[#6AAF3D]/20' : 'bg-gray-800'}`}>
                <Upload size={40} className={isDragging ? 'text-[#6AAF3D]' : 'text-gray-500'} />
              </div>
              <div>
                <p className="text-white font-medium">
                  Arraste arquivos aqui ou{' '}
                  <span className="text-[#6AAF3D] underline">clique para selecionar</span>
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  Formatos suportados: JPEG, PNG, TIFF, GeoTIFF, MP4, MOV, AVI, MKV
                </p>
                <p className="text-gray-600 text-xs mt-1">
                  Imagens: máx. 50MB | Vídeos: máx. 500MB
                </p>
              </div>
            </div>
          </label>
        </div>
      )}

      {/* Lista de arquivos */}
      {files.length > 0 && (
        <div className="mt-6 space-y-3">
          <p className="text-gray-400 text-sm">Arquivos ({files.length})</p>
          {files.map((file) => (
            <div
              key={file.id}
              className={`flex items-center gap-4 p-3 rounded-lg ${
                file.status === 'error' ? 'bg-red-900/20 border border-red-500/30' : 'bg-gray-800/50'
              }`}
            >
              {/* Preview ou ícone */}
              <div className="w-12 h-12 rounded-lg bg-gray-700 flex items-center justify-center overflow-hidden">
                {file.preview ? (
                  <img src={file.preview} alt="" className="w-full h-full object-cover" />
                ) : file.type.startsWith('video/') ? (
                  <Video size={24} className="text-gray-500" />
                ) : (
                  <Image size={24} className="text-gray-500" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{file.name}</p>
                <p className="text-gray-500 text-xs">{formatSize(file.size)}</p>
                {file.status === 'uploading' && (
                  <div className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#6AAF3D] transition-all duration-300"
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                )}
                {file.status === 'error' && file.errorMessage && (
                  <p className="text-red-400 text-xs mt-1">{file.errorMessage}</p>
                )}
              </div>

              {/* Status */}
              <div className="flex items-center gap-2">
                {file.status === 'uploading' && (
                  <span className="text-gray-400 text-sm">{Math.round(file.progress)}%</span>
                )}
                {file.status === 'success' && (
                  <CheckCircle size={20} className="text-[#6AAF3D]" />
                )}
                {file.status === 'error' && (
                  <AlertCircle size={20} className="text-red-500" />
                )}
                {file.status === 'pending' && (
                  <span className="text-gray-500 text-xs">Aguardando</span>
                )}
                <button
                  onClick={() => removeFile(file.id)}
                  disabled={isProcessing}
                  className="p-1 hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
                >
                  <X size={18} className="text-gray-500 hover:text-white" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Erro global */}
      {uploadError && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
          <AlertCircle size={18} className="text-red-500" />
          <span className="text-red-400 text-sm">{uploadError}</span>
        </div>
      )}

      {/* Botão de processar */}
      {files.length > 0 && !allUploaded && (
        <div className="mt-6">
          {!projectName.trim() && (
            <p className="text-yellow-400 text-sm mb-3 flex items-center gap-2">
              <AlertCircle size={16} />
              Digite um nome para o projeto antes de processar
            </p>
          )}
          <button
            onClick={isAuthenticated ? handleUpload : handleDemoUpload}
            disabled={!canUpload}
            className={`w-full py-3 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2
              ${canUpload
                ? 'bg-[#6AAF3D] hover:bg-[#5a9a34] text-white cursor-pointer'
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
          >
            {isProcessing ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span>Enviando arquivos...</span>
              </>
            ) : (
              <>
                <span>Enviar e Processar</span>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </button>
        </div>
      )}

      {/* Sucesso */}
      {allUploaded && (
        <div className="mt-6 p-4 bg-[#6AAF3D]/10 border border-[#6AAF3D]/30 rounded-lg">
          <div className="flex items-center gap-2 text-[#6AAF3D]">
            <CheckCircle size={20} />
            <span className="font-medium">Upload concluído com sucesso!</span>
          </div>
          <p className="text-gray-400 text-sm mt-2">
            {files.length} arquivo(s) enviado(s).
            {uploadSuccess && isAuthenticated ? (
              <span className="block mt-1">
                A análise está sendo processada. Você será redirecionado para seus projetos...
              </span>
            ) : (
              <span className="block mt-1">
                O processamento está sendo realizado.
              </span>
            )}
          </p>
          {uploadSuccess && (
            <div className="mt-3 flex items-center gap-2 text-[#6AAF3D]">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm">Preparando visualização...</span>
            </div>
          )}
        </div>
      )}

      {/* Retry para erros */}
      {hasErrors && !isProcessing && (
        <button
          onClick={isAuthenticated ? handleUpload : handleDemoUpload}
          className="mt-3 w-full py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
        >
          Tentar novamente arquivos com erro
        </button>
      )}

      {/* Botão para novo upload após sucesso */}
      {allUploaded && !uploadSuccess && (
        <button
          onClick={() => {
            setFiles([])
            setProjectName('')
            setSourceType(null)
            setUploadError(null)
          }}
          className="mt-3 w-full py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
        >
          Fazer novo upload
        </button>
      )}
    </div>
  )
}
