'use client'

import {
  FolderOpen, Loader2, AlertCircle, RefreshCw, ChevronRight,
  Image as ImageIcon,
} from 'lucide-react'
import ViewModeCarousel from '@/components/map/ViewModeCarousel'
import CoordinateGrid from '@/components/map/CoordinateGrid'
import ZonePropertiesDialog from '@/components/map/ZonePropertiesDialog'
import { useMapState } from './hooks/useMapState'
import DrawingTools from './DrawingTools'
import MapLayers from './MapLayers'
import MapControls from './MapControls'
import MapSidebar from './MapSidebar'
import { ROIPanel, ToolInstructionBar, AnalyzeProjectButton, InfoPanel } from './MapPopups'
import type { MapViewProps } from './types'

export default function MapView({ projectId }: MapViewProps) {
  const state = useMapState(projectId)

  return (
    <div ref={state.mapContainerRef} className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl overflow-hidden h-full flex flex-col">
      {/* Tab header */}
      <div className="flex border-b border-gray-700/50">
        <button
          onClick={() => state.setSelectedProject(null)}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 transition-colors bg-[#6AAF3D]/20 text-[#6AAF3D] border-b-2 border-[#6AAF3D]"
        >
          <FolderOpen size={18} />
          <span className="font-medium">Ver Projeto</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {!state.selectedProject ? (
          /* ─── Project selection list ─── */
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-white text-lg font-semibold">Selecione um Projeto</h3>
                <button onClick={state.fetchProjects} disabled={state.loading} className="p-2 hover:bg-gray-700 rounded-lg transition-colors" title="Atualizar lista">
                  <RefreshCw size={18} className={`text-gray-400 ${state.loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <p className="text-gray-400 text-sm mb-6">Escolha um projeto para visualizar as imagens e análises no mapa</p>

              {state.loading && (
                <div className="flex items-center justify-center py-12"><Loader2 size={32} className="text-[#6AAF3D] animate-spin" /></div>
              )}
              {state.error && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle size={48} className="text-red-400 mb-4" />
                  <p className="text-red-400 mb-4">{state.error}</p>
                  <button onClick={state.fetchProjects} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors">Tentar novamente</button>
                </div>
              )}
              {!state.loading && !state.error && state.projects.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FolderOpen size={48} className="text-gray-600 mb-4" />
                  <p className="text-gray-400 mb-2">Nenhum projeto encontrado</p>
                  <p className="text-gray-500 text-sm">Crie um novo projeto na seção de Upload</p>
                </div>
              )}
              {!state.loading && !state.error && state.projects.length > 0 && (
                <div className="space-y-3">
                  {state.projects.map(project => (
                    <div
                      key={project.id}
                      onClick={() => state.setSelectedProject(project)}
                      className="flex items-center gap-4 p-4 bg-gray-800/50 hover:bg-gray-800 rounded-xl cursor-pointer transition-colors border border-gray-700/50 hover:border-[#6AAF3D]/50"
                    >
                      <div className="w-16 h-16 bg-gradient-to-br from-[#6AAF3D]/30 to-green-900/30 rounded-lg flex items-center justify-center">
                        <ImageIcon size={28} className="text-[#6AAF3D]" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-white font-medium">{project.name}</h4>
                        <p className="text-gray-500 text-sm">{project.image_count} imagem(ns) • {state.formatDate(project.created_at)}</p>
                        <div className="flex items-center gap-4 mt-1">
                          {project.total_area_ha && <span className="text-xs text-gray-400">Área: <span className="text-[#6AAF3D]">{project.total_area_ha} ha</span></span>}
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            project.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                            project.status === 'processing' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            {project.status === 'completed' ? 'Analisado' : project.status === 'processing' ? 'Processando' : 'Pendente'}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="text-gray-500" size={20} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ─── Project visualization ─── */
          <>
            <div className="flex-1 relative bg-gray-900">
              {/* View Mode Carousel */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30">
                <ViewModeCarousel activeMode={state.activeViewMode} onModeChange={state.handleViewModeChange} />
              </div>

              {/* Drawing toolbar */}
              <DrawingTools
                activeTool={state.activeTool}
                setActiveTool={state.setActiveTool}
                selectedColor={state.selectedColor}
                setSelectedColor={state.setSelectedColor}
                showColorPicker={state.showColorPicker}
                setShowColorPicker={state.setShowColorPicker}
                colorPickerRef={state.colorPickerRef}
                annotationColors={state.annotationColors}
                showInfoPanel={state.showInfoPanel}
                setShowInfoPanel={state.setShowInfoPanel}
                exportingGeoJSON={state.exportingGeoJSON}
                handleExportGeoJSON={state.handleExportGeoJSON}
                savingScreenshot={state.savingScreenshot}
                handleSaveScreenshot={state.handleSaveScreenshot}
                handleExportImage={state.handleExportImage}
                toggleFullscreen={state.toggleFullscreen}
                isFullscreen={state.isFullscreen}
                currentImageUrl={state.currentImageUrl}
                hasSelectedImage={!!state.projectImages[state.selectedImageIndex]}
                onBack={() => state.setSelectedProject(null)}
              />

              {/* Tool instruction */}
              <ToolInstructionBar activeTool={state.activeTool} toolInstructions={state.toolInstructions} />

              {/* ROI panel */}
              <ROIPanel
                roiPolygon={state.roiPolygon}
                roiResults={state.roiResults}
                roiAnalyzing={state.roiAnalyzing}
                roiAnalyses={state.roiAnalyses}
                setRoiAnalyses={state.setRoiAnalyses}
                handleAnalyzeROI={state.handleAnalyzeROI}
                clearROI={state.clearROI}
                imageGSD={state.imageGSD}
              />

              {/* Analyze project button */}
              <AnalyzeProjectButton
                roiPolygon={state.roiPolygon}
                analysisSummary={state.analysisSummary}
                analyzingProject={state.analyzingProject}
                handleAnalyzeProject={state.handleAnalyzeProject}
              />

              {/* Image display area */}
              {state.projectImages.length > 0 ? (
                <div
                  ref={state.imageContainerRef}
                  className="absolute inset-0 overflow-hidden"
                  onClick={state.handleCanvasClick}
                  onDoubleClick={state.handleCanvasDoubleClick}
                  onMouseDown={state.handlePanStart}
                  onMouseMove={(e) => { state.draggingVertex ? state.handleVertexMouseMove(e) : state.handlePanMove(e) }}
                  onMouseUp={() => { state.draggingVertex ? state.handleVertexMouseUp() : state.handlePanEnd() }}
                  onMouseLeave={() => { if (state.draggingVertex) state.handleVertexMouseUp(); state.handlePanEnd() }}
                  style={{ cursor: state.draggingVertex ? 'grabbing' : state.activeTool === 'select' ? (state.isPanning ? 'grabbing' : 'grab') : state.activeTool === 'eraser' ? 'not-allowed' : 'crosshair' }}
                >
                  <div
                    ref={state.zoomableRef}
                    className="relative min-w-full min-h-full"
                    style={{
                      transform: `translate(${state.panOffset.x}px, ${state.panOffset.y}px) scale(${state.zoom / 100})`,
                      transformOrigin: 'center center',
                    }}
                  >
                    {state.imageLoading ? (
                      <div className="flex items-center justify-center h-full" style={{ minHeight: '100vh' }}>
                        <Loader2 size={48} className="text-[#6AAF3D] animate-spin" />
                      </div>
                    ) : state.currentImageUrl ? (
                      <img
                        src={state.currentImageUrl}
                        alt={state.projectImages[state.selectedImageIndex]?.original_filename || 'Imagem do projeto'}
                        className="w-full h-full object-contain bg-black"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full" style={{ minHeight: '100vh' }}>
                        <div className="text-center">
                          <AlertCircle size={48} className="text-gray-600 mx-auto mb-4" />
                          <p className="text-gray-400 mb-3">Erro ao carregar imagem</p>
                          <button
                            onClick={() => state.projectImages[state.selectedImageIndex] && state.loadImage(state.projectImages[state.selectedImageIndex])}
                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors flex items-center gap-2 mx-auto"
                          >
                            <RefreshCw size={14} /> Tentar novamente
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Map overlays and annotations */}
                    <MapLayers
                      layers={state.layers}
                      imageAnalysis={state.imageAnalysis}
                      fullReportData={state.fullReportData}
                      projectImages={state.projectImages}
                      selectedImageIndex={state.selectedImageIndex}
                      selectedProject={state.selectedProject}
                      roiPolygon={state.roiPolygon}
                      annotations={state.annotations}
                      currentAnnotation={state.currentAnnotation}
                      activeTool={state.activeTool}
                      selectedColor={state.selectedColor}
                      activeViewMode={state.activeViewMode}
                      zones={state.zones}
                      selectedZoneId={state.selectedZoneId}
                      editingVertices={state.editingVertices}
                      draggingVertex={state.draggingVertex}
                      zoneVisibility={state.zoneVisibility}
                      deleteAnnotation={state.deleteAnnotation}
                      handleVertexMouseDown={state.handleVertexMouseDown}
                      calculatePolygonCentroid={state.calculatePolygonCentroid}
                      setSelectedZoneId={state.setSelectedZoneId}
                      setEditingVertices={state.setEditingVertices}
                    />

                    {/* UTM Coordinate Grid */}
                    {state.utmInfo && state.utmInfo.has_gps && state.projectImages[state.selectedImageIndex]?.width && state.projectImages[state.selectedImageIndex]?.height && (
                      <CoordinateGrid
                        utmInfo={state.utmInfo}
                        imageWidth={state.projectImages[state.selectedImageIndex].width!}
                        imageHeight={state.projectImages[state.selectedImageIndex].height!}
                      />
                    )}
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <ImageIcon size={64} className="text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">Nenhuma imagem neste projeto</p>
                    <p className="text-gray-500 text-sm mt-2">Faça upload de imagens na seção de Upload</p>
                  </div>
                </div>
              )}

              {/* Image navigation */}
              {state.projectImages.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-gray-800/90 rounded-lg z-10">
                  <button onClick={() => state.setSelectedImageIndex(Math.max(0, state.selectedImageIndex - 1))} disabled={state.selectedImageIndex === 0} className="p-1 hover:bg-gray-700 rounded disabled:opacity-50">←</button>
                  <span className="text-white text-sm px-2">{state.selectedImageIndex + 1} / {state.projectImages.length}</span>
                  <button onClick={() => state.setSelectedImageIndex(Math.min(state.projectImages.length - 1, state.selectedImageIndex + 1))} disabled={state.selectedImageIndex === state.projectImages.length - 1} className="p-1 hover:bg-gray-700 rounded disabled:opacity-50">→</button>
                </div>
              )}

              {/* Map controls */}
              <MapControls
                zoom={state.zoom}
                setZoom={state.setZoom}
                resetView={state.resetView}
                layers={state.layers}
                selectedProject={state.selectedProject}
                utmInfo={state.utmInfo}
                imageGSD={state.imageGSD}
                formatDate={state.formatDate}
              />

              {/* Info panel */}
              <InfoPanel
                showInfoPanel={state.showInfoPanel}
                setShowInfoPanel={state.setShowInfoPanel}
                roiPolygon={state.roiPolygon}
                projectImages={state.projectImages}
                selectedImageIndex={state.selectedImageIndex}
                imageGSD={state.imageGSD}
                imageAnalysis={state.imageAnalysis}
                annotations={state.annotations}
                editingPointId={state.editingPointId}
                setEditingPointId={state.setEditingPointId}
                editingPointLabel={state.editingPointLabel}
                setEditingPointLabel={state.setEditingPointLabel}
                deleteAnnotation={state.deleteAnnotation}
                updatePointLabel={state.updatePointLabel}
              />
            </div>

            {/* Sidebar */}
            <MapSidebar
              layers={state.layers}
              showLayers={state.showLayers}
              setShowLayers={state.setShowLayers}
              showOriginalImage={state.showOriginalImage}
              setShowOriginalImage={state.setShowOriginalImage}
              toggleLayer={state.toggleLayer}
              updateOpacity={state.updateOpacity}
              selectedProject={state.selectedProject}
              analysisSummary={state.analysisSummary}
              fullReportData={state.fullReportData}
              zones={state.zones}
              selectedZoneId={state.selectedZoneId}
              setSelectedZoneId={state.setSelectedZoneId}
              zoneAnalyzing={state.zoneAnalyzing}
              zoneVisibility={state.zoneVisibility}
              editingVertices={state.editingVertices}
              setEditingVertices={state.setEditingVertices}
              toggleZoneVisibility={state.toggleZoneVisibility}
              analyzeZone={state.analyzeZone}
              analyzeAllZones={state.analyzeAllZones}
              editZone={state.editZone}
              deleteZone={state.deleteZone}
              getHealthColor={state.getHealthColor}
              getHealthLabel={state.getHealthLabel}
            />
          </>
        )}
      </div>

      {/* Zone Properties Dialog */}
      {state.showZoneDialog && state.pendingZonePoints && (
        <ZonePropertiesDialog
          points={state.pendingZonePoints}
          areaM2={state.calculatePolygonArea(state.pendingZonePoints)}
          initialData={state.selectedZoneId ? state.zones.find(z => z.id === state.selectedZoneId)?.data : undefined}
          onSave={state.selectedZoneId ? state.handleUpdateZone : state.handleSaveZone}
          onCancel={state.handleCancelZoneDialog}
        />
      )}

      {/* Point rename dialog */}
      {state.editingPointId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-gray-800 rounded-xl border border-gray-600 shadow-2xl w-[320px] p-4">
            <h3 className="text-white font-semibold mb-3">Renomear Ponto</h3>
            <input
              type="text"
              value={state.editingPointLabel}
              onChange={e => state.setEditingPointLabel(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') state.updatePointLabel(state.editingPointId!, state.editingPointLabel)
                if (e.key === 'Escape') { state.setEditingPointId(null); state.setEditingPointLabel('') }
              }}
              placeholder="Nome do ponto"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-[#6AAF3D] mb-3"
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={() => { state.setEditingPointId(null); state.setEditingPointLabel('') }} className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg">Cancelar</button>
              <button onClick={() => state.updatePointLabel(state.editingPointId!, state.editingPointLabel)} className="flex-1 px-4 py-2 bg-[#6AAF3D] hover:bg-[#5a9a34] text-white text-sm font-medium rounded-lg">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
