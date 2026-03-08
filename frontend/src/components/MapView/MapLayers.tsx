'use client'

import type { Layer, ImageAnalysis, Annotation, ProjectImage, Project } from './types'
import type { ZoneData } from '@/components/map/ZoneLayerItem'
import type { DrawingTool } from './types'

interface MapLayersProps {
  layers: Layer[]
  imageAnalysis: ImageAnalysis | null
  fullReportData: Record<string, unknown> | null
  projectImages: ProjectImage[]
  selectedImageIndex: number
  selectedProject: Project | null
  roiPolygon: number[][] | null
  annotations: Annotation[]
  currentAnnotation: Annotation | null
  activeTool: DrawingTool
  selectedColor: string
  activeViewMode: string
  zones: ZoneData[]
  selectedZoneId: number | null
  editingVertices: boolean
  draggingVertex: { zoneId: number; vertexIndex: number } | null
  zoneVisibility: Record<number, boolean>
  deleteAnnotation: (id: number) => void
  handleVertexMouseDown: (zoneId: number, vertexIndex: number, e: React.MouseEvent) => void
  calculatePolygonCentroid: (points: number[][]) => { x: number; y: number }
  setSelectedZoneId: (id: number | null) => void
  setEditingVertices: (v: boolean) => void
}

export default function MapLayers({
  layers, imageAnalysis, fullReportData, projectImages, selectedImageIndex,
  selectedProject, roiPolygon, annotations, currentAnnotation,
  activeTool, selectedColor, activeViewMode, zones, selectedZoneId,
  editingVertices, draggingVertex, zoneVisibility,
  deleteAnnotation, handleVertexMouseDown, calculatePolygonCentroid,
  setSelectedZoneId, setEditingVertices,
}: MapLayersProps) {
  const currentImage = projectImages[selectedImageIndex]

  return (
    <>
      {/* Vegetation overlay */}
      {layers.find(l => l.type === 'vegetation')?.visible && (() => {
        const vegLayer = layers.find(l => l.type === 'vegetation')!
        const vegPct = imageAnalysis?.vegetation_coverage?.vegetation_percentage
        const intensity = vegPct != null ? Math.min(vegPct / 100, 1) * 0.5 : 0.3
        return (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: vegPct != null
                ? `radial-gradient(ellipse at center, rgba(106,175,61,${intensity}) 0%, rgba(106,175,61,${intensity * 0.3}) 70%, transparent 100%)`
                : 'linear-gradient(135deg, rgba(106,175,61,0.3) 0%, rgba(245,158,11,0.2) 50%, rgba(239,68,68,0.15) 100%)',
              mixBlendMode: 'overlay',
              opacity: vegLayer.opacity / 100,
            }}
          />
        )
      })()}

      {/* Health overlay */}
      {layers.find(l => l.type === 'health')?.visible && (() => {
        const healthLayer = layers.find(l => l.type === 'health')!
        const healthIdx = imageAnalysis?.vegetation_health?.health_index
        const healthColor = healthIdx != null
          ? healthIdx >= 70 ? 'rgba(34,197,94,0.35)' : healthIdx >= 50 ? 'rgba(245,158,11,0.35)' : 'rgba(239,68,68,0.35)'
          : 'rgba(245,158,11,0.25)'
        return (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ backgroundColor: healthColor, mixBlendMode: 'overlay', opacity: healthLayer.opacity / 100 }}
          />
        )
      })()}

      {/* Heatmap overlay */}
      {layers.find(l => l.type === 'heatmap')?.visible && (() => {
        const heatLayer = layers.find(l => l.type === 'heatmap')!
        const vegPct = imageAnalysis?.vegetation_coverage?.vegetation_percentage ?? 50
        const hue = Math.round((vegPct / 100) * 120)
        return (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse at 30% 30%, hsla(${hue},80%,50%,0.4) 0%, hsla(${Math.max(0, hue - 60)},80%,50%,0.3) 50%, hsla(0,80%,50%,0.2) 100%)`,
              mixBlendMode: 'overlay',
              opacity: heatLayer.opacity / 100,
            }}
          />
        )
      })()}

      {/* SVG overlays and annotations */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {/* Trees overlay */}
        {layers.find(l => l.type === 'trees')?.visible && fullReportData && (() => {
          const treesLayer = layers.find(l => l.type === 'trees')!
          const plantCount = (fullReportData as any)?.plant_count || (fullReportData as any)?.tree_count
          const treeList = plantCount?.locations || plantCount?.trees || []
          const totalTrees = plantCount?.total_trees || plantCount?.estimated_count || 0
          const hasLocations = treeList.length > 0 && treeList.some((t: any) => t.center)
          if (hasLocations) {
            return treeList.map((tree: any, i: number) => {
              const center = tree.center
              if (!center) return null
              const radius = Math.max(4, Math.sqrt((tree.area || 200)) / 3)
              return <circle key={`tree-${i}`} cx={center[0]} cy={center[1]} r={radius} fill="rgba(34,197,94,0.5)" stroke="#22C55E" strokeWidth={1.5} opacity={treesLayer.opacity / 100} />
            })
          }
          if (totalTrees > 0) {
            const imgW = currentImage?.width || 800
            const imgH = currentImage?.height || 600
            return (
              <g opacity={treesLayer.opacity / 100}>
                <rect x={imgW/2 - 70} y={imgH/2 - 18} width={140} height={36} rx={18} fill="rgba(34,197,94,0.85)" />
                <text x={imgW/2} y={imgH/2 + 6} textAnchor="middle" fill="white" fontSize={14} fontWeight="bold">{totalTrees} árvores</text>
              </g>
            )
          }
          return null
        })()}

        {/* Pests overlay */}
        {layers.find(l => l.type === 'pests')?.visible && fullReportData && (() => {
          const pestsLayer = layers.find(l => l.type === 'pests')!
          const pestData = (fullReportData as any)?.pest_disease
          const regions = pestData?.affected_regions || []
          const infectionRate = pestData?.infection_rate || 0
          const hasRegions = regions.length > 0 && regions.some((r: any) => r.bbox && r.bbox.length >= 4)
          if (hasRegions) {
            return regions.map((region: any, i: number) => {
              const bbox = region.bbox
              if (!bbox || bbox.length < 4) return null
              return <rect key={`pest-${i}`} x={bbox[0]} y={bbox[1]} width={bbox[2] - bbox[0]} height={bbox[3] - bbox[1]} fill="rgba(239,68,68,0.3)" stroke="#EF4444" strokeWidth={1.5} strokeDasharray="4,2" opacity={pestsLayer.opacity / 100} />
            })
          }
          if (infectionRate > 0) {
            const imgW = currentImage?.width || 800
            const imgH = currentImage?.height || 600
            return (
              <g opacity={pestsLayer.opacity / 100}>
                <rect x={imgW/2 - 80} y={imgH/2 + 25} width={160} height={36} rx={18} fill="rgba(239,68,68,0.85)" />
                <text x={imgW/2} y={imgH/2 + 49} textAnchor="middle" fill="white" fontSize={14} fontWeight="bold">{infectionRate.toFixed(1)}% infecção</text>
              </g>
            )
          }
          return null
        })()}

        {/* Saved perimeter polygon */}
        {!roiPolygon && selectedProject?.perimeter_polygon && selectedProject.perimeter_polygon.length >= 3 &&
          layers.find(l => l.type === 'roi')?.visible &&
          currentImage?.width && currentImage?.height && (() => {
          const imgW = currentImage.width!
          const imgH = currentImage.height!
          const perimLayer = layers.find(l => l.type === 'roi')!
          const perimPts = selectedProject.perimeter_polygon!
          return (
            <>
              <defs>
                <mask id="perimeter-mask">
                  <rect x="0" y="0" width={imgW} height={imgH} fill="white" />
                  <polygon points={perimPts.map(p => `${p[0] * imgW},${p[1] * imgH}`).join(' ')} fill="black" />
                </mask>
              </defs>
              <rect x="0" y="0" width={imgW} height={imgH} fill="rgba(0, 0, 0, 0.45)" mask="url(#perimeter-mask)" opacity={perimLayer.opacity / 100} />
              <polygon points={perimPts.map(p => `${p[0] * imgW},${p[1] * imgH}`).join(' ')} fill="none" stroke="rgba(220, 60, 60, 0.9)" strokeWidth={3} opacity={perimLayer.opacity / 100} />
              {perimPts.map((p, i) => (
                <circle key={`vertex-${i}`} cx={p[0] * imgW} cy={p[1] * imgH} r={6} fill="white" stroke="rgba(220, 60, 60, 0.9)" strokeWidth={2} opacity={perimLayer.opacity / 100} />
              ))}
            </>
          )
        })()}

        {/* Interactive ROI polygon */}
        {roiPolygon && roiPolygon.length >= 3 && layers.find(l => l.type === 'roi')?.visible && (
          <polygon points={roiPolygon.map(p => p.join(',')).join(' ')} fill="rgba(59,130,246,0.15)" stroke="#3B82F6" strokeWidth={2.5} strokeDasharray="8,4" />
        )}

        {/* Saved annotations */}
        {annotations.map((ann, idx) => {
          if (ann.type === 'point' && ann.data.x && ann.data.y) {
            return (
              <g key={ann.id || `new-${idx}`}>
                <circle cx={ann.data.x} cy={ann.data.y} r={8} fill={ann.data.color || '#FF0000'} stroke="white" strokeWidth={2}
                  style={{ pointerEvents: activeTool === 'eraser' || activeTool === 'select' ? 'auto' : 'none', cursor: activeTool === 'eraser' ? 'pointer' : activeTool === 'select' ? 'pointer' : 'default' }}
                  onClick={(e) => { e.stopPropagation(); if (activeTool === 'eraser' && ann.id) deleteAnnotation(ann.id) }}
                />
                {ann.data.label && (
                  <>
                    <rect x={(ann.data.x || 0) + 10} y={(ann.data.y || 0) - 9} width={Math.max(60, ann.data.label.length * 7 + 12)} height={20} fill="rgba(0,0,0,0.75)" rx={4} style={{ pointerEvents: 'none' }} />
                    <text x={(ann.data.x || 0) + 16} y={(ann.data.y || 0) + 5} fill="white" fontSize={12} fontWeight="bold" style={{ pointerEvents: 'none' }}>{ann.data.label}</text>
                  </>
                )}
              </g>
            )
          }
          if (ann.type === 'measurement' && ann.data.start && ann.data.end) {
            return (
              <g key={ann.id || `new-${idx}`}>
                <line x1={ann.data.start.x} y1={ann.data.start.y} x2={ann.data.end.x} y2={ann.data.end.y} stroke={ann.data.color || '#0000FF'} strokeWidth={3}
                  style={{ pointerEvents: activeTool === 'eraser' ? 'auto' : 'none', cursor: activeTool === 'eraser' ? 'pointer' : 'default' }}
                  onClick={(e) => { e.stopPropagation(); if (activeTool === 'eraser' && ann.id) deleteAnnotation(ann.id) }}
                />
                <circle cx={ann.data.start.x} cy={ann.data.start.y} r={5} fill={ann.data.color || '#0000FF'} stroke="white" strokeWidth={2} />
                <circle cx={ann.data.end.x} cy={ann.data.end.y} r={5} fill={ann.data.color || '#0000FF'} stroke="white" strokeWidth={2} />
                {ann.data.label && (
                  <>
                    <rect x={(ann.data.start.x + ann.data.end.x) / 2 - 35} y={(ann.data.start.y + ann.data.end.y) / 2 - 22} width={70} height={18} fill="rgba(0,0,0,0.7)" rx={4} />
                    <text x={(ann.data.start.x + ann.data.end.x) / 2} y={(ann.data.start.y + ann.data.end.y) / 2 - 8} fill="white" fontSize={12} fontWeight="bold" textAnchor="middle">{ann.data.label}</text>
                  </>
                )}
              </g>
            )
          }
          if (ann.type === 'polygon' && ann.data.points && ann.data.points.length >= 3) {
            const svgPoints = ann.data.points.map(p => p.join(',')).join(' ')
            const centroid = calculatePolygonCentroid(ann.data.points)
            return (
              <g key={ann.id || `new-${idx}`}>
                <polygon points={svgPoints} fill={`${ann.data.color || '#00FF00'}40`} stroke={ann.data.color || '#00FF00'} strokeWidth={2}
                  style={{ pointerEvents: activeTool === 'eraser' ? 'auto' : 'none', cursor: activeTool === 'eraser' ? 'pointer' : 'default' }}
                  onClick={(e) => { e.stopPropagation(); if (activeTool === 'eraser' && ann.id) deleteAnnotation(ann.id) }}
                />
                {ann.data.label && (
                  <>
                    <rect x={centroid.x - 35} y={centroid.y - 10} width={70} height={20} fill="rgba(0,0,0,0.7)" rx={4} />
                    <text x={centroid.x} y={centroid.y + 5} fill="white" fontSize={12} fontWeight="bold" textAnchor="middle">{ann.data.label}</text>
                  </>
                )}
              </g>
            )
          }
          return null
        })}

        {/* Drawing in progress */}
        {currentAnnotation?.type === 'measurement' && currentAnnotation.data.start && (
          <circle cx={currentAnnotation.data.start.x} cy={currentAnnotation.data.start.y} r={6} fill={selectedColor} stroke="white" strokeWidth={2} />
        )}
        {currentAnnotation?.type === 'polygon' && currentAnnotation.data.points && currentAnnotation.data.points.length > 0 && (
          <>
            <polyline points={currentAnnotation.data.points.map(p => p.join(',')).join(' ')} fill="none" stroke={selectedColor} strokeWidth={2} strokeDasharray="5,5" />
            {currentAnnotation.data.points.map((p, i) => (
              <circle key={`poly-pt-${i}`} cx={p[0]} cy={p[1]} r={6} fill={selectedColor} stroke="white" strokeWidth={2} />
            ))}
          </>
        )}
        {currentAnnotation?.type === 'roi' && currentAnnotation.data.points && currentAnnotation.data.points.length > 0 && (
          <>
            <polyline points={currentAnnotation.data.points.map(p => p.join(',')).join(' ')} fill="none" stroke="#3B82F6" strokeWidth={2.5} strokeDasharray="8,4" />
            {currentAnnotation.data.points.map((p, i) => (
              <circle key={`roi-pt-${i}`} cx={p[0]} cy={p[1]} r={6} fill="#3B82F6" stroke="white" strokeWidth={2} />
            ))}
          </>
        )}
        {currentAnnotation?.type === 'zone' && currentAnnotation.data.points && currentAnnotation.data.points.length > 0 && (
          <>
            <polyline points={currentAnnotation.data.points.map(p => p.join(',')).join(' ')} fill="none" stroke="#FF6B35" strokeWidth={2.5} strokeDasharray="6,3" />
            {currentAnnotation.data.points.map((p, i) => (
              <circle key={`zone-pt-${i}`} cx={p[0]} cy={p[1]} r={6} fill="#FF6B35" stroke="white" strokeWidth={2} />
            ))}
          </>
        )}

        {/* Saved cultivation zones */}
        {(activeViewMode === 'zones' || activeViewMode === 'original' || activeViewMode === 'composite') && (
          <>
            <defs>
              {zones.map(zone => (
                zone.data.pattern === 'hatched' && (
                  <pattern key={`hatch-${zone.id}`} id={`hatch-${zone.id}`} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                    <line x1="0" y1="0" x2="0" y2="8" stroke={zone.data.color} strokeWidth="2" />
                  </pattern>
                )
              ))}
              {zones.map(zone => (
                zone.data.pattern === 'dashed' && (
                  <pattern key={`dash-${zone.id}`} id={`dash-${zone.id}`} width="12" height="12" patternUnits="userSpaceOnUse">
                    <rect x="0" y="0" width="6" height="6" fill={zone.data.color} opacity={zone.data.fill_opacity} />
                  </pattern>
                )
              ))}
            </defs>
            {zones.map(zone => {
              if (!(zoneVisibility[zone.id] ?? true)) return null
              const pts = zone.data.points
              if (!pts || pts.length < 3) return null
              const svgPts = pts.map(p => p.join(',')).join(' ')
              const isSelected = selectedZoneId === zone.id
              const centroid = calculatePolygonCentroid(pts)
              const fillValue = zone.data.pattern === 'hatched'
                ? `url(#hatch-${zone.id})`
                : zone.data.pattern === 'dashed'
                ? `url(#dash-${zone.id})`
                : zone.data.color
              return (
                <g key={`zone-${zone.id}`}>
                  <polygon
                    points={svgPts}
                    fill={fillValue}
                    fillOpacity={zone.data.pattern === 'solid' ? zone.data.fill_opacity : 1}
                    stroke={zone.data.color}
                    strokeWidth={isSelected ? 3 : 2}
                    style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                    onClick={(e) => { e.stopPropagation(); setSelectedZoneId(isSelected ? null : zone.id); setEditingVertices(false) }}
                  />
                  <rect x={centroid.x - 40} y={centroid.y - 10} width={80} height={20} fill="rgba(0,0,0,0.75)" rx={4} style={{ pointerEvents: 'none' }} />
                  <text x={centroid.x} y={centroid.y + 5} fill="white" fontSize={11} fontWeight="bold" textAnchor="middle" style={{ pointerEvents: 'none' }}>
                    {zone.data.label.length > 12 ? zone.data.label.substring(0, 12) + '...' : zone.data.label}
                  </text>
                  {isSelected && editingVertices && pts.map((p, vi) => (
                    <circle key={`vertex-${zone.id}-${vi}`} cx={p[0]} cy={p[1]} r={7} fill="white" stroke={zone.data.color} strokeWidth={2}
                      style={{ pointerEvents: 'auto', cursor: draggingVertex ? 'grabbing' : 'grab' }}
                      onMouseDown={(e) => handleVertexMouseDown(zone.id, vi, e)}
                    />
                  ))}
                  {isSelected && !editingVertices && pts.map((p, vi) => (
                    <circle key={`svertex-${zone.id}-${vi}`} cx={p[0]} cy={p[1]} r={5} fill="white" stroke={zone.data.color} strokeWidth={2} style={{ pointerEvents: 'none' }} />
                  ))}
                </g>
              )
            })}
          </>
        )}
      </svg>
    </>
  )
}
