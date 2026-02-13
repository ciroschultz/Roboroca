'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, Save } from 'lucide-react'
import { updateProject, type CreateProjectData } from '@/lib/api'
import { useToast } from './Toast'

interface ProjectEditModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
  project: {
    id: string
    name: string
    area: number
  }
  /** Extra fields from the backend project if available */
  description?: string
  latitude?: number
  longitude?: number
}

export default function ProjectEditModal({
  isOpen,
  onClose,
  onSaved,
  project,
  description: initialDescription,
  latitude: initialLat,
  longitude: initialLon,
}: ProjectEditModalProps) {
  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState(initialDescription || '')
  const [latitude, setLatitude] = useState(initialLat?.toString() || '')
  const [longitude, setLongitude] = useState(initialLon?.toString() || '')
  const [area, setArea] = useState(project.area?.toString() || '')
  const [saving, setSaving] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const toast = useToast()

  useEffect(() => {
    if (isOpen) {
      setName(project.name)
      setDescription(initialDescription || '')
      setLatitude(initialLat?.toString() || '')
      setLongitude(initialLon?.toString() || '')
      setArea(project.area?.toString() || '')
      document.body.style.overflow = 'hidden'
    }
    return () => { document.body.style.overflow = 'unset' }
  }, [isOpen, project])

  const handleClose = () => {
    if (saving) return
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      onClose()
    }, 200)
  }

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Nome obrigatorio', 'Informe um nome para o projeto')
      return
    }
    setSaving(true)
    try {
      const data: Partial<CreateProjectData> = { name: name.trim() }
      if (description.trim()) data.description = description.trim()
      if (latitude) data.latitude = parseFloat(latitude)
      if (longitude) data.longitude = parseFloat(longitude)
      if (area) data.area_hectares = parseFloat(area)

      await updateProject(Number(project.id), data)
      toast.success('Projeto atualizado', 'As alteracoes foram salvas com sucesso')
      onSaved()
      handleClose()
    } catch (err: any) {
      toast.error('Erro ao salvar', err?.detail || 'Falha ao atualizar o projeto')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${
        isClosing ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      <div
        className={`
          relative bg-[#1a1a2e] border border-gray-700/50 rounded-2xl shadow-2xl
          max-w-lg w-full transform transition-all duration-200
          ${isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}
        `}
      >
        <button
          onClick={handleClose}
          disabled={saving}
          className="absolute top-4 right-4 p-1 text-gray-500 hover:text-white transition-colors rounded-lg hover:bg-gray-700/50"
        >
          <X size={20} />
        </button>

        <div className="p-6">
          <h3 className="text-xl font-semibold text-white mb-6">Editar Projeto</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Nome *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-[#6AAF3D] focus:outline-none transition-colors"
                placeholder="Nome do projeto"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Descricao</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-[#6AAF3D] focus:outline-none transition-colors resize-none"
                placeholder="Descricao do projeto"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={latitude}
                  onChange={e => setLatitude(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-[#6AAF3D] focus:outline-none transition-colors"
                  placeholder="-23.5505"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={longitude}
                  onChange={e => setLongitude(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-[#6AAF3D] focus:outline-none transition-colors"
                  placeholder="-46.6333"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Area (ha)</label>
              <input
                type="number"
                step="any"
                value={area}
                onChange={e => setArea(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-[#6AAF3D] focus:outline-none transition-colors"
                placeholder="10.5"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleClose}
              disabled={saving}
              className="flex-1 py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-xl transition-all disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="flex-1 py-3 px-4 bg-[#6AAF3D] hover:bg-[#5a9a34] text-white font-medium rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Salvar
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
