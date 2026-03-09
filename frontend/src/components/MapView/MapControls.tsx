'use client'

import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import CompassRose from '@/components/map/CompassRose'
import ScaleBar from '@/components/map/ScaleBar'
import LegendPanel from '@/components/map/LegendPanel'
import type { Layer, Project, ImageGSD, UTMInfo } from './types'

interface MapControlsProps {
  zoom: number
  setZoom: (fn: (prev: number) => number) => void
  resetView: () => void
  layers: Layer[]
  selectedProject: Project
  utmInfo: UTMInfo | null
  imageGSD: ImageGSD | null
  formatDate: (dateStr: string) => string
}

export default function MapControls({
  zoom, setZoom, resetView, layers, selectedProject, utmInfo, imageGSD, formatDate,
}: MapControlsProps) {
  return (
    <>
      {/* Zoom controls */}
      <div className="absolute right-20 bottom-4 flex items-center gap-1 z-10">
        <button
          onClick={() => setZoom(prev => Math.min(prev + 10, 300))}
          className="p-2 bg-gray-800/90 hover:bg-gray-700 text-white rounded-lg transition-colors"
          title="Zoom in"
          aria-label="Aumentar zoom"
        >
          <ZoomIn size={18} />
        </button>
        <div className="px-2 py-1 bg-gray-800/90 text-white text-xs text-center rounded-lg min-w-[42px]">
          {zoom}%
        </div>
        <button
          onClick={() => setZoom(prev => Math.max(prev - 10, 25))}
          className="p-2 bg-gray-800/90 hover:bg-gray-700 text-white rounded-lg transition-colors"
          title="Zoom out"
          aria-label="Diminuir zoom"
        >
          <ZoomOut size={18} />
        </button>
        <button
          onClick={resetView}
          className="p-2 bg-gray-800/90 hover:bg-gray-700 text-white rounded-lg transition-colors ml-1"
          title="Resetar zoom e posicao"
          aria-label="Resetar visualização"
        >
          <Maximize2 size={18} />
        </button>
      </div>

      {/* Compass Rose */}
      <div className="absolute top-3 right-3 z-20">
        <CompassRose size={48} />
      </div>

      {/* Project info */}
      <div className="absolute left-4 bottom-14 px-4 py-3 bg-gray-800/90 rounded-lg z-10">
        <p className="text-white font-medium text-sm">{selectedProject.name}</p>
        <p className="text-gray-400 text-xs">
          {selectedProject.image_count} imagem(ns) • {formatDate(selectedProject.created_at)}
        </p>
        {utmInfo?.has_gps && utmInfo.utm_zone && (
          <p className="text-blue-300 text-xs mt-1 font-mono">
            UTM {utmInfo.utm_zone} | E{utmInfo.center?.easting?.toFixed(0)} N{utmInfo.center?.northing?.toFixed(0)}
          </p>
        )}
      </div>

      {/* ScaleBar + LegendPanel */}
      <div className="absolute right-4 bottom-14 flex items-end gap-2 z-10">
        <LegendPanel items={layers.map(l => ({ id: l.id, name: l.name, color: l.color, visible: l.visible }))} />
        {imageGSD && <ScaleBar gsdM={imageGSD.gsd_m} zoom={zoom} />}
      </div>
    </>
  )
}
