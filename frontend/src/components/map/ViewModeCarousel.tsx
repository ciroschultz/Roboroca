'use client'

interface ViewMode {
  id: string
  label: string
  /** IDs das layers que devem ficar visíveis neste modo */
  activeLayers: string[]
}

const VIEW_MODES: ViewMode[] = [
  { id: 'original', label: 'Original', activeLayers: ['original'] },
  { id: 'vegetation', label: 'Vegetacao', activeLayers: ['original', 'vegetation'] },
  { id: 'health', label: 'Saude', activeLayers: ['original', 'health'] },
  { id: 'trees', label: 'Arvores', activeLayers: ['original', 'trees'] },
  { id: 'pests', label: 'Pragas', activeLayers: ['original', 'pests'] },
  { id: 'composite', label: 'Composicao', activeLayers: ['original', 'vegetation', 'trees', 'pests'] },
]

interface ViewModeCarouselProps {
  activeMode: string
  onModeChange: (modeId: string, activeLayers: string[]) => void
}

export default function ViewModeCarousel({ activeMode, onModeChange }: ViewModeCarouselProps) {
  return (
    <div className="flex items-center gap-1 bg-gray-800/90 rounded-lg p-1 overflow-x-auto">
      {VIEW_MODES.map(mode => (
        <button
          key={mode.id}
          onClick={() => onModeChange(mode.id, mode.activeLayers)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
            activeMode === mode.id
              ? 'bg-[#6AAF3D] text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
          }`}
        >
          {mode.label}
        </button>
      ))}
    </div>
  )
}
