'use client'

interface CompassRoseProps {
  size?: number
}

export default function CompassRose({ size = 60 }: CompassRoseProps) {
  const half = size / 2
  const arrowLen = half * 0.65
  const labelOffset = half * 0.88

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-lg">
      {/* Outer ring */}
      <circle cx={half} cy={half} r={half - 2} fill="rgba(0,0,0,0.6)" stroke="white" strokeWidth={1.5} />

      {/* North arrow (red) */}
      <polygon
        points={`${half},${half - arrowLen} ${half - 5},${half} ${half + 5},${half}`}
        fill="#EF4444"
        stroke="white"
        strokeWidth={0.5}
      />
      {/* South arrow (white) */}
      <polygon
        points={`${half},${half + arrowLen} ${half - 5},${half} ${half + 5},${half}`}
        fill="white"
        stroke="white"
        strokeWidth={0.5}
        opacity={0.6}
      />

      {/* Cardinal labels */}
      <text x={half} y={half * 0.3} fill="white" fontSize={10} fontWeight="bold" textAnchor="middle" dominantBaseline="central">N</text>
      <text x={half} y={size - half * 0.22} fill="white" fontSize={8} textAnchor="middle" dominantBaseline="central" opacity={0.7}>S</text>
      <text x={size - half * 0.2} y={half} fill="white" fontSize={8} textAnchor="middle" dominantBaseline="central" opacity={0.7}>E</text>
      <text x={half * 0.22} y={half} fill="white" fontSize={8} textAnchor="middle" dominantBaseline="central" opacity={0.7}>W</text>
    </svg>
  )
}
