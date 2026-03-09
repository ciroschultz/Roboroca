'use client'

import WeatherCard from './WeatherCard'
import SoilCard from './SoilCard'
import SnapshotCard from './SnapshotCard'
import ClimateHistoryCard from './ClimateHistoryCard'

interface FieldDetailPanelProps {
  fieldId: number
  fieldName?: string
}

export default function FieldDetailPanel({ fieldId, fieldName }: FieldDetailPanelProps) {
  return (
    <div className="space-y-4">
      {fieldName && (
        <h2 className="text-white text-xl font-bold">{fieldName}</h2>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <WeatherCard fieldId={fieldId} />
        <SoilCard fieldId={fieldId} />
      </div>

      <SnapshotCard fieldId={fieldId} />
      <ClimateHistoryCard fieldId={fieldId} />
    </div>
  )
}
