'use client'

import { useState, useCallback } from 'react'
import { Upload, Image, Video, Satellite, Plane, X, CheckCircle, AlertCircle } from 'lucide-react'

type SourceType = 'drone' | 'satellite' | null

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  status: 'uploading' | 'success' | 'error'
  progress: number
  preview?: string
}

interface UploadZoneProps {
  onFilesUploaded?: (files: File[], source: SourceType) => void
}

export default function UploadZone({ onFilesUploaded }: UploadZoneProps) {
  const [sourceType, setSourceType] = useState<SourceType>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [files, setFiles] = useState<UploadedFile[]>([])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const processFiles = useCallback((fileList: FileList) => {
    const newFiles: UploadedFile[] = Array.from(fileList).map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'uploading' as const,
      progress: 0,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    }))

    setFiles((prev) => [...prev, ...newFiles])

    // Simular upload
    newFiles.forEach((file) => {
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
            prev.map((f) => (f.id === file.id ? { ...f, progress } : f))
          )
        }
      }, 200)
    })

    if (onFilesUploaded) {
      onFilesUploaded(Array.from(fileList), sourceType)
    }
  }, [sourceType, onFilesUploaded])

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
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-6">
      <h2 className="text-xl font-bold text-white mb-6">Upload de Imagens</h2>

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

      {/* Área de drop */}
      {sourceType && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`drop-zone rounded-xl p-8 text-center transition-all duration-300
            ${isDragging ? 'active' : ''}`}
        >
          <input
            type="file"
            id="file-upload"
            multiple
            accept="image/*,video/*,.tif,.tiff,.geotiff"
            onChange={handleFileSelect}
            className="hidden"
          />
          <label htmlFor="file-upload" className="cursor-pointer">
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
                  Formatos suportados: JPEG, PNG, TIFF, GeoTIFF, MP4, MOV
                </p>
                <p className="text-gray-600 text-xs mt-1">
                  Tamanho máximo: 500MB por arquivo
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
              className="flex items-center gap-4 p-3 bg-gray-800/50 rounded-lg"
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
                <button
                  onClick={() => removeFile(file.id)}
                  className="p-1 hover:bg-gray-700 rounded transition-colors"
                >
                  <X size={18} className="text-gray-500 hover:text-white" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Botão de processar */}
      {files.length > 0 && files.every((f) => f.status === 'success') && (
        <button className="mt-6 w-full py-3 bg-[#6AAF3D] hover:bg-[#5a9a34] text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
          <span>Processar e Gerar Relatório</span>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      )}
    </div>
  )
}
