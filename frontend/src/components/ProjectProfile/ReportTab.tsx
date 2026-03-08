'use client'

import {
  Download,
  Loader2,
  Hexagon,
} from 'lucide-react'
import { type Analysis, type EnrichedData, type AlertItem } from '@/lib/api'
import { type ProjectData, type AnalysisResultsData, formatWeatherValue } from './types'

interface ReportTabProps {
  project: ProjectData
  analyses: Analysis[]
  analysisData: AnalysisResultsData
  enrichedData: EnrichedData | null
  alerts: AlertItem[]
  isExportingPdf: boolean
  onExportPdf: () => void
}

export default function ReportTab({
  project,
  analyses,
  analysisData,
  enrichedData,
  alerts,
  isExportingPdf,
  onExportPdf,
}: ReportTabProps) {
  const {
    analysisResults,
    segmentation,
    sceneClassification,
    vegetationType,
    visualFeatures,
    objectDetection,
    pestDisease,
    biomassData,
    vegetationCoverage,
    vegetationHealth,
    colorAnalysis,
  } = analysisData

  return (
    <div className="bg-white text-gray-900 rounded-xl shadow-lg max-w-5xl mx-auto print:shadow-none print:rounded-none">
      {/* Cabecalho do Relatorio */}
      <div className="bg-gradient-to-r from-[#065F46] to-[#6AAF3D] text-white p-8 rounded-t-xl print:rounded-none">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Relatorio de Analise</h1>
            <h2 className="text-xl mt-1 opacity-90">{project.name}</h2>
          </div>
          <button
            onClick={onExportPdf}
            disabled={isExportingPdf || analyses.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 disabled:bg-white/10 rounded-lg transition-colors print:hidden"
          >
            {isExportingPdf ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            Baixar PDF
          </button>
        </div>
        <div className="flex gap-6 mt-4 text-sm opacity-80">
          <span>Data: {project.createdAt}</span>
          <span>Fonte: {project.sourceType === 'drone' ? 'Drone' : 'Satelite'}</span>
          <span>{project.imageCount} imagem(ns)</span>
          <span>{project.area} ha</span>
        </div>
      </div>

      <div className="p-8 space-y-8">
        {/* 1. Resumo Executivo */}
        <section>
          <h3 className="text-lg font-bold text-gray-900 border-b-2 border-[#6AAF3D] pb-2 mb-4">1. Resumo Executivo</h3>
          <p className="text-gray-700 leading-relaxed">
            Analise realizada em {project.createdAt} para a area de {project.area} hectares.
            {project.results && (
              <> Foram identificadas {project.results.plantCount.toLocaleString()} arvores, com {project.results.healthyPercentage}% em estado saudavel.
              A cobertura vegetal de {project.results.vegetationCoverage.toFixed(1)}% e o indice de saude de {project.results.healthIndex.toFixed(1)}%
              {project.results.healthIndex >= 70 ? ' indicam vegetacao em bom estado.' : project.results.healthIndex >= 50 ? ' indicam vegetacao em estado moderado.' : ' indicam necessidade de intervencao.'}</>
            )}
            {analyses.length > 0 && <> Foram realizadas {analyses.length} analise(s) com algoritmos de Machine Learning.</>}
          </p>
          {project.results && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              {[
                { label: 'Area', value: `${project.area} ha` },
                { label: 'Arvores', value: project.results.plantCount.toLocaleString() },
                { label: 'Saude', value: `${project.results.healthIndex.toFixed(0)}%` },
                { label: 'Cobertura', value: `${project.results.vegetationCoverage.toFixed(0)}%` },
              ].map((item, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
                  <p className="text-xs text-gray-500 uppercase">{item.label}</p>
                  <p className="text-xl font-bold text-[#065F46]">{item.value}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 2. Informacoes Gerais */}
        <section>
          <h3 className="text-lg font-bold text-gray-900 border-b-2 border-[#6AAF3D] pb-2 mb-4">2. Informacoes Gerais</h3>
          <table className="w-full text-sm">
            <tbody>
              {[
                ['Nome do Projeto', project.name],
                ['Data da Analise', project.createdAt],
                ['Fonte das Imagens', project.sourceType === 'drone' ? 'Drone' : 'Satelite'],
                ['Area Total', `${project.area} hectares`],
                ['Total de Imagens', String(project.imageCount)],
                ['Analises Realizadas', String(analyses.length)],
                ['Descricao', project.description || 'N/A'],
              ].map(([label, value], i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
                  <td className="py-2 px-3 font-medium text-gray-600 w-1/3">{label}</td>
                  <td className="py-2 px-3 text-gray-900">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* 2.1 Área de Análise (Perímetro) */}
        {project.perimeter_polygon && project.perimeter_polygon.length >= 3 && (
          <section>
            <h3 className="text-lg font-bold text-gray-900 border-b-2 border-blue-500 pb-2 mb-4">Area de Analise (Perimetro)</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-3">
              <div className="flex items-center gap-2 mb-2">
                <Hexagon size={18} className="text-blue-600" />
                <span className="font-medium text-blue-800">Perimetro definido com {project.perimeter_polygon.length} vertices</span>
              </div>
              <p className="text-gray-600 text-sm">
                Os resultados apresentados neste relatorio referem-se exclusivamente a area delimitada pelo perimetro do projeto.
                As metricas de cobertura vegetal, saude, contagem de arvores e deteccao de pragas consideram apenas a regiao de interesse (ROI) definida.
              </p>
            </div>
          </section>
        )}

        {/* 3. Cobertura Vegetal e NDVI */}
        {(vegetationCoverage || vegetationHealth) && (
          <section>
            <h3 className="text-lg font-bold text-gray-900 border-b-2 border-[#6AAF3D] pb-2 mb-4">3. Cobertura Vegetal e NDVI</h3>
            <div className="space-y-4">
              {vegetationCoverage && (
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600">Cobertura Vegetal</span>
                    <span className="font-bold">{Number((vegetationCoverage as any)?.vegetation_percentage ?? 0).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                    <div className="h-full bg-[#6AAF3D] rounded-full" style={{ width: `${Math.min(Number((vegetationCoverage as any)?.vegetation_percentage ?? 0), 100)}%` }} />
                  </div>
                </div>
              )}
              <table className="w-full text-sm">
                <tbody>
                  {vegetationCoverage && (vegetationCoverage as any)?.mean_exg !== undefined && (
                    <tr className="bg-gray-50">
                      <td className="py-2 px-3 font-medium text-gray-600 w-1/3">ExG Medio</td>
                      <td className="py-2 px-3">{Number((vegetationCoverage as any).mean_exg).toFixed(4)}</td>
                    </tr>
                  )}
                  {vegetationHealth && (
                    <>
                      <tr>
                        <td className="py-2 px-3 font-medium text-gray-600">Indice de Saude</td>
                        <td className="py-2 px-3">{Number((vegetationHealth as any)?.health_index ?? 0).toFixed(1)}%</td>
                      </tr>
                      <tr className="bg-gray-50">
                        <td className="py-2 px-3 font-medium text-gray-600">Classificacao</td>
                        <td className="py-2 px-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                            Number((vegetationHealth as any)?.health_index ?? 0) >= 70 ? 'bg-green-100 text-green-800' :
                            Number((vegetationHealth as any)?.health_index ?? 0) >= 50 ? 'bg-yellow-100 text-yellow-800' :
                            Number((vegetationHealth as any)?.health_index ?? 0) >= 30 ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {Number((vegetationHealth as any)?.health_index ?? 0) >= 70 ? 'Densa' :
                             Number((vegetationHealth as any)?.health_index ?? 0) >= 50 ? 'Moderada' :
                             Number((vegetationHealth as any)?.health_index ?? 0) >= 30 ? 'Esparsa' : 'Pouca'}
                          </span>
                        </td>
                      </tr>
                      {(vegetationHealth as any)?.mean_gli !== undefined && (
                        <tr>
                          <td className="py-2 px-3 font-medium text-gray-600">GLI Medio</td>
                          <td className="py-2 px-3">{Number((vegetationHealth as any).mean_gli).toFixed(4)}</td>
                        </tr>
                      )}
                      {(vegetationHealth as any)?.mean_exg !== undefined && (
                        <tr className="bg-gray-50">
                          <td className="py-2 px-3 font-medium text-gray-600">ExG Medio (Saude)</td>
                          <td className="py-2 px-3">{Number((vegetationHealth as any).mean_exg).toFixed(4)}</td>
                        </tr>
                      )}
                    </>
                  )}
                </tbody>
              </table>
              {/* Distribuicao */}
              {(vegetationHealth as any)?.distribution && (
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">Distribuicao da Vegetacao:</p>
                  <table className="w-full text-sm border border-gray-200 rounded">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="py-1.5 px-3 text-left text-gray-600 font-medium">Categoria</th>
                        <th className="py-1.5 px-3 text-right text-gray-600 font-medium">Percentual</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries((vegetationHealth as any).distribution).map(([key, val]: [string, any], i) => (
                        <tr key={key} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
                          <td className="py-1.5 px-3">{key.replace(/_/g, ' ')}</td>
                          <td className="py-1.5 px-3 text-right font-medium">{typeof val === 'number' ? val.toFixed(1) : val}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}

        {/* 4. Saude da Vegetacao */}
        {project.results && (
          <section>
            <h3 className="text-lg font-bold text-gray-900 border-b-2 border-[#6AAF3D] pb-2 mb-4">4. Saude da Vegetacao</h3>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-green-50 rounded-lg p-3 text-center border border-green-200">
                <p className="text-xs text-gray-500">Saudavel</p>
                <p className="text-xl font-bold text-green-700">{project.results.healthyPercentage}%</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3 text-center border border-yellow-200">
                <p className="text-xs text-gray-500">Estressada</p>
                <p className="text-xl font-bold text-yellow-700">{project.results.stressedPercentage}%</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3 text-center border border-red-200">
                <p className="text-xs text-gray-500">Critica</p>
                <p className="text-xl font-bold text-red-700">{project.results.criticalPercentage}%</p>
              </div>
            </div>
          </section>
        )}

        {/* 5. Biomassa */}
        {biomassData && (
          <section>
            <h3 className="text-lg font-bold text-gray-900 border-b-2 border-[#6AAF3D] pb-2 mb-4">5. Biomassa</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Indice de Biomassa</span>
                    <span className="font-bold">{Number((biomassData as any)?.biomass_index ?? 0).toFixed(1)} / 100</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                    <div className="h-full rounded-full" style={{
                      width: `${Math.min(Number((biomassData as any)?.biomass_index ?? 0), 100)}%`,
                      backgroundColor: Number((biomassData as any)?.biomass_index ?? 0) >= 75 ? '#059669' :
                        Number((biomassData as any)?.biomass_index ?? 0) >= 50 ? '#6AAF3D' :
                        Number((biomassData as any)?.biomass_index ?? 0) >= 25 ? '#F59E0B' : '#EF4444'
                    }} />
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  (biomassData as any)?.density_class === 'muito_densa' ? 'bg-emerald-100 text-emerald-800' :
                  (biomassData as any)?.density_class === 'densa' ? 'bg-green-100 text-green-800' :
                  (biomassData as any)?.density_class === 'moderada' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                }`}>
                  {((biomassData as any)?.density_class ?? '').replace('_', ' ')}
                </span>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  <tr className="bg-gray-50">
                    <td className="py-2 px-3 font-medium text-gray-600 w-1/3">Biomassa Estimada</td>
                    <td className="py-2 px-3">{Number((biomassData as any)?.estimated_biomass_kg_ha ?? 0) >= 1000
                      ? `${(Number((biomassData as any)?.estimated_biomass_kg_ha ?? 0) / 1000).toFixed(1)} t/ha`
                      : `${Number((biomassData as any)?.estimated_biomass_kg_ha ?? 0)} kg/ha`}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium text-gray-600">Copas Detectadas</td>
                    <td className="py-2 px-3">{(biomassData as any)?.canopy_count ?? 0}</td>
                  </tr>
                </tbody>
              </table>
              {/* Vigor */}
              {(biomassData as any)?.vigor_metrics && (
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">Metricas de Vigor:</p>
                  <table className="w-full text-sm border border-gray-200 rounded">
                    <thead><tr className="bg-gray-100">
                      <th className="py-1.5 px-3 text-left text-gray-600 font-medium">Metrica</th>
                      <th className="py-1.5 px-3 text-right text-gray-600 font-medium">Valor</th>
                    </tr></thead>
                    <tbody>
                      {[
                        ['Intensidade Verde', Number((biomassData as any).vigor_metrics.mean_green_intensity ?? 0).toFixed(1)],
                        ['ExG Medio', Number((biomassData as any).vigor_metrics.mean_exg ?? 0).toFixed(4)],
                        ['Variancia de Textura', Number((biomassData as any).vigor_metrics.texture_variance ?? 0).toFixed(1)],
                      ].map(([label, val], i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
                          <td className="py-1.5 px-3">{label}</td>
                          <td className="py-1.5 px-3 text-right font-medium">{val}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {/* Recomendacoes biomassa */}
              {(biomassData as any)?.recommendations && (biomassData as any).recommendations.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-green-800 mb-1">Recomendacoes:</p>
                  <ul className="text-sm text-green-700 space-y-1 list-disc list-inside">
                    {(biomassData as any).recommendations.map((rec: string, idx: number) => (
                      <li key={idx}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}

        {/* 6. Pragas e Doencas */}
        {pestDisease && (
          <section>
            <h3 className="text-lg font-bold text-gray-900 border-b-2 border-[#6AAF3D] pb-2 mb-4">6. Pragas e Doencas</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">Severidade Geral:</span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  (pestDisease as any)?.overall_severity === 'saudavel' ? 'bg-green-100 text-green-800' :
                  (pestDisease as any)?.overall_severity === 'leve' ? 'bg-yellow-100 text-yellow-800' :
                  (pestDisease as any)?.overall_severity === 'moderado' ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'
                }`}>
                  {(pestDisease as any)?.overall_severity ?? 'N/A'}
                </span>
              </div>
              <table className="w-full text-sm border border-gray-200 rounded">
                <thead><tr className="bg-gray-100">
                  <th className="py-1.5 px-3 text-left text-gray-600 font-medium">Metrica</th>
                  <th className="py-1.5 px-3 text-right text-gray-600 font-medium">Valor</th>
                </tr></thead>
                <tbody>
                  {[
                    ['Taxa de Infeccao', `${Number((pestDisease as any)?.infection_rate ?? 0).toFixed(1)}%`],
                    ['Vegetacao Saudavel', `${Number((pestDisease as any)?.healthy_percentage ?? 0).toFixed(1)}%`],
                    ['Clorose', `${Number((pestDisease as any)?.chlorosis_percentage ?? 0).toFixed(1)}%`],
                    ['Necrose', `${Number((pestDisease as any)?.necrosis_percentage ?? 0).toFixed(1)}%`],
                    ['Anomalias', `${Number((pestDisease as any)?.anomaly_percentage ?? 0).toFixed(1)}%`],
                    ['Regioes Afetadas', String(((pestDisease as any)?.affected_regions ?? []).length)],
                  ].map(([label, val], i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
                      <td className="py-1.5 px-3">{label}</td>
                      <td className="py-1.5 px-3 text-right font-medium">{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(pestDisease as any)?.recommendations && (pestDisease as any).recommendations.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-red-800 mb-1">Recomendacoes:</p>
                  <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
                    {(pestDisease as any).recommendations.map((rec: string, idx: number) => (
                      <li key={idx}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}

        {/* 7. Deteccao de Objetos */}
        {objectDetection && (
          <section>
            <h3 className="text-lg font-bold text-gray-900 border-b-2 border-[#6AAF3D] pb-2 mb-4">7. Deteccao de Objetos</h3>
            <table className="w-full text-sm border border-gray-200 rounded">
              <thead><tr className="bg-gray-100">
                <th className="py-1.5 px-3 text-left text-gray-600 font-medium">Metrica</th>
                <th className="py-1.5 px-3 text-right text-gray-600 font-medium">Valor</th>
              </tr></thead>
              <tbody>
                <tr className="bg-gray-50">
                  <td className="py-1.5 px-3">Total Detectado</td>
                  <td className="py-1.5 px-3 text-right font-bold">{(objectDetection as any)?.total_detections ?? 0}</td>
                </tr>
                <tr>
                  <td className="py-1.5 px-3">Confianca Media</td>
                  <td className="py-1.5 px-3 text-right">{(((objectDetection as any)?.avg_confidence ?? 0) * 100).toFixed(1)}%</td>
                </tr>
                {(objectDetection as any)?.by_class && Object.entries((objectDetection as any).by_class).map(([cls, count]: [string, any], i) => (
                  <tr key={cls} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
                    <td className="py-1.5 px-3 pl-6">{cls}</td>
                    <td className="py-1.5 px-3 text-right">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* 8. Classificacao de Uso do Solo */}
        {sceneClassification && (
          <section>
            <h3 className="text-lg font-bold text-gray-900 border-b-2 border-[#6AAF3D] pb-2 mb-4">8. Classificacao de Uso do Solo</h3>
            <div className="space-y-4">
              {(sceneClassification as any)?.land_use_percentages && (
                <table className="w-full text-sm border border-gray-200 rounded">
                  <thead><tr className="bg-gray-100">
                    <th className="py-1.5 px-3 text-left text-gray-600 font-medium">Categoria</th>
                    <th className="py-1.5 px-3 text-right text-gray-600 font-medium">Percentual</th>
                    <th className="py-1.5 px-3 w-1/3 text-gray-600 font-medium"></th>
                  </tr></thead>
                  <tbody>
                    {Object.entries((sceneClassification as any).land_use_percentages)
                      .sort(([, a]: any, [, b]: any) => b - a)
                      .map(([cls, pct]: [string, any], i) => (
                      <tr key={cls} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
                        <td className="py-1.5 px-3">{cls.replace(/_/g, ' ')}</td>
                        <td className="py-1.5 px-3 text-right font-medium">{typeof pct === 'number' ? pct.toFixed(1) : pct}%</td>
                        <td className="py-1.5 px-3">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="h-full bg-blue-400 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {vegetationType && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">Tipo dominante:</span>
                  <span className="font-bold text-[#065F46]">{(vegetationType as any)?.vegetation_type}</span>
                  {(vegetationType as any)?.vegetation_density && (
                    <span className="text-gray-500">({(vegetationType as any).vegetation_density})</span>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {/* 9. Segmentacao DeepLabV3 */}
        {segmentation && (segmentation as any)?.category_percentages && (
          <section>
            <h3 className="text-lg font-bold text-gray-900 border-b-2 border-[#6AAF3D] pb-2 mb-4">9. Segmentacao DeepLabV3</h3>
            <table className="w-full text-sm border border-gray-200 rounded">
              <thead><tr className="bg-gray-100">
                <th className="py-1.5 px-3 text-left text-gray-600 font-medium">Categoria</th>
                <th className="py-1.5 px-3 text-right text-gray-600 font-medium">Percentual</th>
              </tr></thead>
              <tbody>
                {Object.entries((segmentation as any).category_percentages).map(([cat, pct]: [string, any], i) => (
                  <tr key={cat} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
                    <td className="py-1.5 px-3">{cat}</td>
                    <td className="py-1.5 px-3 text-right font-medium">{typeof pct === 'number' ? pct.toFixed(1) : pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(segmentation as any)?.num_classes_detected && (
              <p className="text-sm text-gray-600 mt-2">Classes detectadas: <strong>{(segmentation as any).num_classes_detected}</strong></p>
            )}
          </section>
        )}

        {/* 10. Features Visuais */}
        {visualFeatures && (
          <section>
            <h3 className="text-lg font-bold text-gray-900 border-b-2 border-[#6AAF3D] pb-2 mb-4">10. Features Visuais</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(visualFeatures as any)?.texture && (
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">Textura</p>
                  <table className="w-full text-sm border border-gray-200 rounded">
                    <tbody>
                      {Object.entries((visualFeatures as any).texture).map(([key, val]: [string, any], i) => (
                        <tr key={key} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
                          <td className="py-1 px-2 text-gray-600">{key.replace(/_/g, ' ')}</td>
                          <td className="py-1 px-2 text-right">{typeof val === 'number' ? val.toFixed(3) : String(val)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {(visualFeatures as any)?.colors && (
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">Cores</p>
                  <table className="w-full text-sm border border-gray-200 rounded">
                    <tbody>
                      {Object.entries((visualFeatures as any).colors).map(([key, val]: [string, any], i) => (
                        <tr key={key} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
                          <td className="py-1 px-2 text-gray-600">{key.replace(/_/g, ' ')}</td>
                          <td className="py-1 px-2 text-right">{typeof val === 'number' ? val.toFixed(3) : String(val)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {(visualFeatures as any)?.patterns && (
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">Padroes</p>
                  <table className="w-full text-sm border border-gray-200 rounded">
                    <tbody>
                      {Object.entries((visualFeatures as any).patterns).map(([key, val]: [string, any], i) => (
                        <tr key={key} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
                          <td className="py-1 px-2 text-gray-600">{key.replace(/_/g, ' ')}</td>
                          <td className="py-1 px-2 text-right">{typeof val === 'number' ? val.toFixed(3) : String(val)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}

        {/* 11. Analise de Cores */}
        {colorAnalysis && (
          <section>
            <h3 className="text-lg font-bold text-gray-900 border-b-2 border-[#6AAF3D] pb-2 mb-4">11. Analise de Cores</h3>
            <table className="w-full text-sm border border-gray-200 rounded">
              <thead><tr className="bg-gray-100">
                <th className="py-1.5 px-3 text-left text-gray-600 font-medium">Canal</th>
                <th className="py-1.5 px-3 text-right text-gray-600 font-medium">Media</th>
                <th className="py-1.5 px-3 text-right text-gray-600 font-medium">Desvio</th>
              </tr></thead>
              <tbody>
                {['red', 'green', 'blue'].map((ch, i) => {
                  const mean = Number((colorAnalysis as any)?.[`mean_${ch}`] ?? (colorAnalysis as any)?.channel_stats?.[ch]?.mean ?? 0)
                  const std = Number((colorAnalysis as any)?.[`std_${ch}`] ?? (colorAnalysis as any)?.channel_stats?.[ch]?.std ?? 0)
                  const labelMap: Record<string, string> = { red: 'Vermelho (R)', green: 'Verde (G)', blue: 'Azul (B)' }
                  return (
                    <tr key={ch} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
                      <td className="py-1.5 px-3">{labelMap[ch]}</td>
                      <td className="py-1.5 px-3 text-right">{mean.toFixed(1)}</td>
                      <td className="py-1.5 px-3 text-right">{std.toFixed(1)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className="flex gap-4 mt-3 text-sm">
              {(colorAnalysis as any)?.brightness !== undefined && (
                <span className="text-gray-600">Brilho: <strong>{Number((colorAnalysis as any).brightness).toFixed(1)}</strong></span>
              )}
              {(colorAnalysis as any)?.green_dominance !== undefined && (
                <span className="text-gray-600">Predominancia verde:
                  <span className={`ml-1 px-1.5 py-0.5 rounded text-xs font-bold ${(colorAnalysis as any).green_dominance ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    {(colorAnalysis as any).green_dominance ? 'Sim' : 'Nao'}
                  </span>
                </span>
              )}
            </div>
          </section>
        )}

        {/* 12. Dados Ambientais */}
        {enrichedData && (enrichedData.weather || enrichedData.soil || enrichedData.elevation || enrichedData.geocoding) && (
          <section>
            <h3 className="text-lg font-bold text-gray-900 border-b-2 border-[#6AAF3D] pb-2 mb-4">12. Dados Ambientais</h3>
            <table className="w-full text-sm">
              <tbody>
                {enrichedData.geocoding && !enrichedData.geocoding.error && (
                  <tr className="bg-gray-50">
                    <td className="py-2 px-3 font-medium text-gray-600 w-1/3">Localizacao</td>
                    <td className="py-2 px-3">{enrichedData.geocoding.display_name || `${enrichedData.geocoding.address?.city}, ${enrichedData.geocoding.address?.state}`}</td>
                  </tr>
                )}
                {enrichedData.elevation && !enrichedData.elevation.error && (
                  <>
                    <tr>
                      <td className="py-2 px-3 font-medium text-gray-600">Altitude</td>
                      <td className="py-2 px-3">{formatWeatherValue(enrichedData.elevation.elevation_m)} m</td>
                    </tr>
                    {enrichedData.elevation.terrain_classification && (
                      <tr className="bg-gray-50">
                        <td className="py-2 px-3 font-medium text-gray-600">Terreno</td>
                        <td className="py-2 px-3">{enrichedData.elevation.terrain_classification.description || enrichedData.elevation.terrain_classification.category}</td>
                      </tr>
                    )}
                  </>
                )}
                {enrichedData.weather && !enrichedData.weather.error && enrichedData.weather.current && (
                  <>
                    {enrichedData.weather.current.weather_description && (
                      <tr>
                        <td className="py-2 px-3 font-medium text-gray-600">Clima</td>
                        <td className="py-2 px-3">{enrichedData.weather.current.weather_description}</td>
                      </tr>
                    )}
                    <tr className="bg-gray-50">
                      <td className="py-2 px-3 font-medium text-gray-600">Temperatura</td>
                      <td className="py-2 px-3">{formatWeatherValue(enrichedData.weather.current.temperature_c)}°C</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-medium text-gray-600">Umidade</td>
                      <td className="py-2 px-3">{formatWeatherValue(enrichedData.weather.current.relative_humidity_pct)}%</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="py-2 px-3 font-medium text-gray-600">Precipitacao</td>
                      <td className="py-2 px-3">{formatWeatherValue(enrichedData.weather.current.precipitation_mm)} mm</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-medium text-gray-600">Vento</td>
                      <td className="py-2 px-3">{formatWeatherValue(enrichedData.weather.current.wind_speed_kmh)} km/h</td>
                    </tr>
                  </>
                )}
                {enrichedData.soil && !enrichedData.soil.error && enrichedData.soil.properties && (
                  <>
                    {['phh2o', 'nitrogen', 'soc', 'clay'].filter(k => enrichedData.soil!.properties![k]).map((key, i) => {
                      const val = enrichedData.soil!.properties![key]
                      const firstDepth = val?.depths ? Object.values(val.depths)[0] : null
                      return (
                        <tr key={key} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
                          <td className="py-2 px-3 font-medium text-gray-600">{val?.label || key}</td>
                          <td className="py-2 px-3">{firstDepth != null ? firstDepth : '-'} {val?.unit || ''}</td>
                        </tr>
                      )
                    })}
                  </>
                )}
              </tbody>
            </table>
          </section>
        )}

        {/* 13. Alertas */}
        {alerts.length > 0 && (
          <section>
            <h3 className="text-lg font-bold text-gray-900 border-b-2 border-[#6AAF3D] pb-2 mb-4">13. Alertas</h3>
            <table className="w-full text-sm border border-gray-200 rounded">
              <thead><tr className="bg-gray-100">
                <th className="py-1.5 px-3 text-left text-gray-600 font-medium">Severidade</th>
                <th className="py-1.5 px-3 text-left text-gray-600 font-medium">Mensagem</th>
                <th className="py-1.5 px-3 text-right text-gray-600 font-medium">Valor</th>
                <th className="py-1.5 px-3 text-right text-gray-600 font-medium">Limite</th>
              </tr></thead>
              <tbody>
                {alerts.map((alert, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                    <td className="py-1.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        alert.severity === 'critical' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {alert.severity === 'critical' ? 'CRITICO' : 'AVISO'}
                      </span>
                    </td>
                    <td className="py-1.5 px-3">{alert.message}</td>
                    <td className="py-1.5 px-3 text-right">{alert.current_value.toFixed(1)}</td>
                    <td className="py-1.5 px-3 text-right">{alert.threshold}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* 14. Historico de Analises */}
        {analyses.length > 0 && (
          <section>
            <h3 className="text-lg font-bold text-gray-900 border-b-2 border-[#6AAF3D] pb-2 mb-4">14. Historico de Analises</h3>
            <table className="w-full text-sm border border-gray-200 rounded">
              <thead><tr className="bg-gray-100">
                <th className="py-1.5 px-3 text-left text-gray-600 font-medium">Tipo</th>
                <th className="py-1.5 px-3 text-right text-gray-600 font-medium">Tempo</th>
                <th className="py-1.5 px-3 text-right text-gray-600 font-medium">Data</th>
              </tr></thead>
              <tbody>
                {analyses.map((a, idx) => (
                  <tr key={a.id} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                    <td className="py-1.5 px-3">
                      {a.analysis_type === 'full_report' ? 'Analise Completa (ML)' :
                       a.analysis_type === 'video_analysis' ? 'Analise de Video' :
                       a.analysis_type === 'vegetation_coverage' ? 'Cobertura Vegetal' :
                       a.analysis_type === 'plant_health' ? 'Saude' :
                       a.analysis_type === 'color_analysis' ? 'Cores' :
                       a.analysis_type === 'object_detection' ? 'Deteccao YOLO' :
                       a.analysis_type === 'land_use' ? 'Uso do Solo' :
                       a.analysis_type === 'feature_extraction' ? 'Features' :
                       a.analysis_type.replace(/_/g, ' ')}
                    </td>
                    <td className="py-1.5 px-3 text-right">{a.processing_time_seconds ? `${a.processing_time_seconds.toFixed(1)}s` : '-'}</td>
                    <td className="py-1.5 px-3 text-right">{new Date(a.created_at).toLocaleString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Rodape */}
        <div className="border-t-2 border-gray-200 pt-4 mt-8 text-center text-xs text-gray-400">
          <p>Relatorio gerado automaticamente pelo Roboroca — {new Date().toLocaleDateString('pt-BR')}</p>
        </div>
      </div>
    </div>
  )
}
