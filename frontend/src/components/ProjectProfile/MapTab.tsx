'use client'

import MapView from '../MapView'

interface MapTabProps {
  projectId: number
}

export default function MapTab({ projectId }: MapTabProps) {
  return (
    <div className="h-[calc(100vh-250px)]">
      <MapView projectId={projectId} />
    </div>
  )
}
