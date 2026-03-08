'use client'

import {
  MapPin,
  Leaf,
  Trees,
  Mountain,
  Thermometer,
  Image,
  AlertTriangle,
  BarChart3,
  Cloud,
  Globe,
  Layers,
  Loader2,
  Video,
  CheckCircle,
  Cpu,
  Bug,
  TreePine,
} from 'lucide-react'
import {
  DonutChart,
  BarChartComponent,
  AreaChartComponent,
  GaugeChart,
} from '../Charts'
import StatCard from '../StatCard'
import { type Analysis, type EnrichedData, type TimelineEntry, type AlertItem } from '@/lib/api'
import { type ProjectData, formatWeatherValue } from './types'

interface OverviewTabProps {
  project: ProjectData
  analyses: Analysis[]
  analysisResults: Record<string, unknown>
  videoAnalysis: Analysis | undefined
  enrichedData: EnrichedData | null
  loadingEnriched: boolean
  timelineData: TimelineEntry[]
  timelineLoading: boolean
  alerts: AlertItem[]
  onSetActiveTab: (tab: 'overview' | 'map' | 'analysis' | 'report') => void
  onStartAnalysis: () => void
}

export default function OverviewTab({
  project,
  analyses,
  analysisResults,
  videoAnalysis,
  enrichedData,
  loadingEnriched,
  timelineData,
  timelineLoading,
  alerts,
  onSetActiveTab,
  onStartAnalysis,
}: OverviewTabProps) {
  const plantHealthData = project.results ? [
    { name: 'Saudavel', value: project.results.healthyPercentage, color: '#6AAF3D' },
    { name: 'Estressada', value: project.results.stressedPercentage, color: '#F59E0B' },
    { name: 'Critica', value: project.results.criticalPercentage, color: '#EF4444' },
  ] : []

  const vegetationTimeData = timelineData.length > 0
    ? timelineData.map(entry => ({
        periodo: entry.periodo,
        cobertura: entry.cobertura ?? 0,
        saude: entry.saude ?? 0,
      }))
    : []

  if (project.results) {
    return (
      <>
        {/* Banner de alertas */}
        {alerts.length > 0 && (
          <div className="mb-6 space-y-2">
            {alerts.map((alert, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  alert.severity === 'critical'
                    ? 'bg-red-900/20 border-red-500/40 text-red-400'
                    : 'bg-yellow-900/20 border-yellow-500/40 text-yellow-400'
                }`}
              >
                <AlertTriangle size={18} />
                <span className="text-sm">{alert.message}</span>
              </div>
            ))}
          </div>
        )}
        {/* Cards de estatisticas do projeto */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Area Analisada"
            value={project.area}
            unit="ha"
            icon={<MapPin size={24} />}
            color="green"
          />
          <StatCard
            title="Árvores Detectadas"
            value={project.results.plantCount.toLocaleString()}
            unit="árvores"
            icon={<Trees size={24} />}
            color="green"
          />
          <StatCard
            title="Cobertura Vegetal"
            value={project.results.vegetationCoverage.toFixed(1)}
            unit="%"
            icon={<Leaf size={24} />}
            color="green"
          />
          <StatCard
            title="Indice de Saude"
            value={project.results.healthIndex.toFixed(1)}
            unit="%"
            icon={<Thermometer size={24} />}
            color={project.results.healthIndex >= 70 ? 'green' : project.results.healthIndex >= 50 ? 'yellow' : 'red'}
          />
        </div>

        {/* Segunda linha de cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Vegetação Saudável"
            value={project.results.healthyPercentage}
            unit="%"
            icon={<Leaf size={24} />}
            color="green"
          />
          <StatCard
            title="Vegetação Estressada"
            value={project.results.stressedPercentage}
            unit="%"
            icon={<AlertTriangle size={24} />}
            color="yellow"
          />
          <StatCard
            title="Solo Exposto"
            value={project.results.criticalPercentage}
            unit="%"
            icon={<Mountain size={24} />}
            color="purple"
          />
          <StatCard
            title="Árvores/Hectare"
            value={project.area > 0 ? Math.round(project.results.plantCount / project.area) : 0}
            unit="árv/ha"
            icon={<Trees size={24} />}
            color="green"
          />
        </div>

        {/* Terceira linha: Biomassa e Pragas */}
        {(project.results.biomassIndexAvg != null || project.results.pestInfectionRateAvg != null) && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {project.results.biomassIndexAvg != null && (
              <StatCard
                title="Biomassa Media"
                value={project.results.biomassIndexAvg.toFixed(1)}
                unit="/100"
                icon={<TreePine size={24} />}
                color="green"
              />
            )}
            {project.results.biomassDensityClass && (
              <StatCard
                title="Classe de Densidade"
                value={project.results.biomassDensityClass.replace('_', ' ')}
                icon={<Layers size={24} />}
                color="yellow"
              />
            )}
            {project.results.pestInfectionRateAvg != null && (
              <StatCard
                title="Taxa de Pragas"
                value={project.results.pestInfectionRateAvg.toFixed(1)}
                unit="%"
                icon={<Bug size={24} />}
                color={project.results.pestInfectionRateAvg > 20 ? 'red' : project.results.pestInfectionRateAvg > 10 ? 'yellow' : 'green'}
              />
            )}
            <StatCard
              title="Analises Realizadas"
              value={analyses.length}
              icon={<Cpu size={24} />}
              color="purple"
            />
          </div>
        )}

        {/* Graficos */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <DonutChart
            data={project.results.landUse}
            title="Classificacao de Uso do Solo"
            centerValue={`${project.area}`}
            centerLabel="hectares"
          />
          <DonutChart
            data={plantHealthData}
            title="Saude das Plantas"
            centerValue={`${project.results.healthyPercentage}%`}
            centerLabel="saudaveis"
          />
          <GaugeChart
            value={project.results.healthyPercentage}
            maxValue={100}
            title="Indice de Saude"
            label="saudavel"
            color={project.results.healthyPercentage >= 70 ? '#6AAF3D' : project.results.healthyPercentage >= 50 ? '#F59E0B' : '#EF4444'}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {timelineLoading ? (
            <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-6 flex items-center justify-center min-h-[200px]">
              <Loader2 size={24} className="animate-spin text-gray-400" />
            </div>
          ) : vegetationTimeData.length > 0 ? (
            <AreaChartComponent
              data={vegetationTimeData}
              title="Evolução da Vegetação"
              dataKeys={[
                { key: 'cobertura', name: 'Cobertura Vegetal (%)', color: '#6AAF3D' },
                { key: 'saude', name: 'Índice de Saúde (%)', color: '#3B82F6' },
              ]}
              xAxisKey="periodo"
            />
          ) : (
            <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-6 flex flex-col items-center justify-center min-h-[200px] text-center">
              <BarChart3 size={32} className="text-gray-600 mb-2" />
              <p className="text-gray-400 text-sm">Sem dados temporais disponíveis</p>
              <p className="text-gray-500 text-xs mt-1">Realize análises em diferentes datas para ver a evolução</p>
            </div>
          )}
          {project.results.heightDistribution.length > 0 && (
            <BarChartComponent
              data={project.results.heightDistribution}
              title="Distribuicao de Altura das Plantas"
              dataKeys={[{ key: 'quantidade', name: 'Quantidade', color: '#8B5CF6' }]}
              xAxisKey="altura"
            />
          )}
        </div>

        {/* Dados Enriquecidos */}
        {enrichedData && (enrichedData.weather || enrichedData.soil || enrichedData.elevation || enrichedData.geocoding) ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Clima */}
            {enrichedData.weather && !enrichedData.weather.error && (
              <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Cloud size={18} className="text-blue-400" />
                  <h4 className="text-white font-medium text-sm">Clima</h4>
                </div>
                <div className="space-y-2 text-sm">
                  {enrichedData.weather.current?.weather_description && (
                    <p className="text-blue-300 font-medium mb-1">{enrichedData.weather.current.weather_description}</p>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">Temperatura</span>
                    <span className="text-white">{formatWeatherValue(enrichedData.weather.current?.temperature_c)}°C</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Umidade</span>
                    <span className="text-white">{formatWeatherValue(enrichedData.weather.current?.relative_humidity_pct)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Precipitacao</span>
                    <span className="text-white">{formatWeatherValue(enrichedData.weather.current?.precipitation_mm)} mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Vento</span>
                    <span className="text-white">{formatWeatherValue(enrichedData.weather.current?.wind_speed_kmh)} km/h</span>
                  </div>
                </div>
              </div>
            )}

            {/* Solo */}
            {enrichedData.soil && !enrichedData.soil.error && (
              <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Layers size={18} className="text-amber-400" />
                  <h4 className="text-white font-medium text-sm">Solo</h4>
                </div>
                <div className="space-y-2 text-sm">
                  {enrichedData.soil.properties && ['phh2o', 'nitrogen', 'soc', 'clay']
                    .filter(k => enrichedData.soil!.properties![k])
                    .map(key => {
                      const val = enrichedData.soil!.properties![key]
                      const firstDepth = val?.depths ? Object.values(val.depths)[0] : null
                      return (
                        <div key={key} className="flex justify-between">
                          <span className="text-gray-500 truncate mr-2">{val?.label || key}</span>
                          <span className="text-white">{firstDepth != null ? firstDepth : '-'} {val?.unit || ''}</span>
                        </div>
                      )
                    })
                  }
                  {enrichedData.soil.interpretation && (
                    <p className="text-xs text-gray-400 mt-1">
                      {typeof enrichedData.soil.interpretation === 'object'
                        ? Object.values(enrichedData.soil.interpretation).join(' | ')
                        : String(enrichedData.soil.interpretation)}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Elevacao */}
            {enrichedData.elevation && !enrichedData.elevation.error && (
              <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Mountain size={18} className="text-green-400" />
                  <h4 className="text-white font-medium text-sm">Elevacao</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Altitude</span>
                    <span className="text-white">{formatWeatherValue(enrichedData.elevation.elevation_m)} m</span>
                  </div>
                  {enrichedData.elevation.terrain_classification && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Terreno</span>
                      <span className="text-white">{enrichedData.elevation.terrain_classification.description || enrichedData.elevation.terrain_classification.category}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Localizacao */}
            {enrichedData.geocoding && !enrichedData.geocoding.error && (
              <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Globe size={18} className="text-purple-400" />
                  <h4 className="text-white font-medium text-sm">Localizacao</h4>
                </div>
                <div className="space-y-2 text-sm">
                  {enrichedData.geocoding.address?.city && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Cidade</span>
                      <span className="text-white truncate ml-2">{enrichedData.geocoding.address.city}</span>
                    </div>
                  )}
                  {enrichedData.geocoding.address?.state && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Estado</span>
                      <span className="text-white">{enrichedData.geocoding.address.state}</span>
                    </div>
                  )}
                  {enrichedData.geocoding.address?.country && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Pais</span>
                      <span className="text-white">{enrichedData.geocoding.address.country}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : loadingEnriched ? (
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-6">
            <Loader2 size={14} className="animate-spin" />
            Carregando dados ambientais...
          </div>
        ) : null}

        {/* Tabela comparativa multi-imagem */}
        {project.imageCount > 1 && analyses.length > 0 && (() => {
          // Group full_report analyses by image_id
          const imageReports = analyses
            .filter(a => a.analysis_type === 'full_report' && a.results)
            .reduce((acc, a) => {
              acc[a.image_id] = a.results as Record<string, any>
              return acc
            }, {} as Record<number, Record<string, any>>)
          const imageIds = Object.keys(imageReports).map(Number)
          if (imageIds.length <= 1) return null

          return (
            <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-6 mb-6">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Image size={18} className="text-blue-400" />
                Comparativo por Imagem ({imageIds.length} imagens)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left text-gray-400 py-2 px-3">Imagem</th>
                      <th className="text-right text-gray-400 py-2 px-3">Vegetação %</th>
                      <th className="text-right text-gray-400 py-2 px-3">Saúde</th>
                      <th className="text-right text-gray-400 py-2 px-3">Árvores</th>
                      <th className="text-right text-gray-400 py-2 px-3">Pragas %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {imageIds.map((imgId, idx) => {
                      const r = imageReports[imgId]
                      const veg = r?.vegetation_coverage?.vegetation_percentage ?? 0
                      const health = r?.vegetation_health?.health_index ?? 0
                      const trees = r?.plant_count?.total_trees || r?.tree_count?.estimated_count || 0
                      const pests = r?.pest_disease?.infection_rate ?? 0
                      return (
                        <tr key={imgId} className={idx % 2 === 0 ? 'bg-gray-800/20' : ''}>
                          <td className="py-2 px-3 text-gray-300">Imagem #{imgId}</td>
                          <td className="py-2 px-3 text-right text-green-400">{Number(veg).toFixed(1)}%</td>
                          <td className={`py-2 px-3 text-right ${Number(health) >= 70 ? 'text-green-400' : Number(health) >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {Number(health).toFixed(1)}
                          </td>
                          <td className="py-2 px-3 text-right text-blue-400">{trees}</td>
                          <td className={`py-2 px-3 text-right ${Number(pests) > 10 ? 'text-red-400' : 'text-green-400'}`}>
                            {Number(pests).toFixed(1)}%
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })()}

        {/* Alertas e Recomendacoes */}
        <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4">Alertas e Recomendacoes</h3>
          <div className="space-y-3">
            {project.results.criticalPercentage > 5 && (
              <div className="flex items-start gap-3 p-4 bg-red-900/20 border border-red-700/30 rounded-lg">
                <AlertTriangle className="text-red-400 mt-0.5" size={20} />
                <div>
                  <p className="text-red-400 font-medium">Atencao: Plantas em estado critico</p>
                  <p className="text-gray-400 text-sm mt-1">
                    {project.results.criticalPercentage}% das plantas estao em estado critico. Recomenda-se verificacao imediata da area afetada.
                  </p>
                </div>
              </div>
            )}
            {project.results.stressedPercentage > 15 && (
              <div className="flex items-start gap-3 p-4 bg-yellow-900/20 border border-yellow-700/30 rounded-lg">
                <AlertTriangle className="text-yellow-400 mt-0.5" size={20} />
                <div>
                  <p className="text-yellow-400 font-medium">Aviso: Plantas estressadas</p>
                  <p className="text-gray-400 text-sm mt-1">
                    {project.results.stressedPercentage}% das plantas apresentam sinais de estresse. Verifique irrigacao e nutrientes.
                  </p>
                </div>
              </div>
            )}
            {project.results.healthyPercentage >= 70 && (
              <div className="flex items-start gap-3 p-4 bg-green-900/20 border border-green-700/30 rounded-lg">
                <CheckCircle className="text-green-400 mt-0.5" size={20} />
                <div>
                  <p className="text-green-400 font-medium">Bom estado geral</p>
                  <p className="text-gray-400 text-sm mt-1">
                    A maioria das plantas ({project.results.healthyPercentage}%) esta saudavel. Continue com o manejo atual.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </>
    )
  }

  if (analyses.length > 0) {
    return (
      /* Projeto concluido sem dados de resumo (ex: video-only) - mostrar dados disponíveis das análises */
      <div className="space-y-6">
        {/* Resumo das analises disponíveis */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {analysisResults.vegetation_coverage && (
            <StatCard
              title="Cobertura Vegetal"
              value={Number((analysisResults.vegetation_coverage as any)?.vegetation_percentage || 0).toFixed(1)}
              unit="%"
              icon={<Leaf size={24} />}
              color="green"
            />
          )}
          {analysisResults.vegetation_health && (
            <StatCard
              title="Indice de Saude"
              value={Number((analysisResults.vegetation_health as any)?.health_index || 0).toFixed(1)}
              unit="%"
              icon={<Thermometer size={24} />}
              color={(analysisResults.vegetation_health as any)?.health_index >= 70 ? 'green' : 'yellow'}
            />
          )}
          {videoAnalysis?.results?.video_info && (
            <StatCard
              title="Duracao do Video"
              value={Number((videoAnalysis.results.video_info as any)?.duration_seconds || 0).toFixed(1)}
              unit="s"
              icon={<Video size={24} />}
              color="blue"
            />
          )}
          {videoAnalysis?.results?.temporal_summary && (
            <StatCard
              title="Frames Analisados"
              value={(videoAnalysis.results.temporal_summary as any)?.total_frames_analyzed || 0}
              icon={<Image size={24} />}
              color="purple"
            />
          )}
          {(videoAnalysis?.results?.temporal_summary as any)?.vegetation && (
            <StatCard
              title="Vegetacao Media (Video)"
              value={Number(((videoAnalysis?.results?.temporal_summary as any)?.vegetation as any)?.mean_percentage || 0).toFixed(1)}
              unit="%"
              icon={<Trees size={24} />}
              color="green"
            />
          )}
        </div>

        {/* Dados Enriquecidos */}
        {enrichedData && (enrichedData.weather || enrichedData.soil || enrichedData.elevation || enrichedData.geocoding) ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {enrichedData.weather && !enrichedData.weather.error && (
              <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Cloud size={18} className="text-blue-400" />
                  <h4 className="text-white font-medium text-sm">Clima</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Temperatura</span>
                    <span className="text-white">{formatWeatherValue(enrichedData.weather.current?.temperature_c)}C</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Umidade</span>
                    <span className="text-white">{formatWeatherValue(enrichedData.weather.current?.relative_humidity_pct)}%</span>
                  </div>
                </div>
              </div>
            )}
            {enrichedData.geocoding && !enrichedData.geocoding.error && (
              <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Globe size={18} className="text-purple-400" />
                  <h4 className="text-white font-medium text-sm">Localizacao</h4>
                </div>
                <p className="text-white text-sm">{enrichedData.geocoding.display_name}</p>
              </div>
            )}
            {enrichedData.elevation && !enrichedData.elevation.error && (
              <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Mountain size={18} className="text-green-400" />
                  <h4 className="text-white font-medium text-sm">Elevacao</h4>
                </div>
                <p className="text-white text-2xl font-bold">{formatWeatherValue(enrichedData.elevation.elevation_m)} m</p>
              </div>
            )}
          </div>
        ) : null}

        <div className="text-center mt-4">
          <button
            onClick={() => onSetActiveTab('analysis')}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
          >
            Ver detalhes da Analise ML
          </button>
        </div>
      </div>
    )
  }

  if (project.status === 'completed') {
    return (
      /* Projeto completed mas results não carregados no frontend */
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-24 h-24 rounded-full bg-green-900/20 flex items-center justify-center mb-6">
          <CheckCircle size={48} className="text-green-400" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">Analise concluida</h3>
        <p className="text-gray-400 text-center max-w-md mb-4">
          A analise deste projeto foi concluida. Visualize os resultados nas abas abaixo.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => onSetActiveTab('map')}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
          >
            <Globe size={16} />
            Visualizar Mapa
          </button>
          <button
            onClick={() => onSetActiveTab('analysis')}
            className="px-4 py-2 bg-[#6AAF3D] hover:bg-[#5a9a34] text-white rounded-lg transition-colors font-medium flex items-center gap-2"
          >
            <Cpu size={16} />
            Analise ML
          </button>
        </div>
      </div>
    )
  }

  // Sem resultados nenhum — projeto pendente
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-24 h-24 rounded-full bg-blue-900/20 flex items-center justify-center mb-6">
        <BarChart3 size={48} className="text-blue-400" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">Sem dados de analise</h3>
      <p className="text-gray-400 text-center max-w-md mb-4">
        Delimite o perimetro de interesse no mapa e depois inicie a analise.
      </p>
      <button
        onClick={onStartAnalysis}
        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
      >
        <MapPin size={16} />
        Delimitar Perimetro e Analisar
      </button>
    </div>
  )
}
