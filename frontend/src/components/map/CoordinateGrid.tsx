'use client'

import type { UTMInfo } from '@/lib/api'

interface CoordinateGridProps {
  utmInfo: UTMInfo
  imageWidth: number
  imageHeight: number
}

/**
 * Grid UTM com labels nos 4 lados e linhas pontilhadas.
 * Só renderiza se utmInfo.has_gps === true e corners existem.
 */
export default function CoordinateGrid({ utmInfo, imageWidth, imageHeight }: CoordinateGridProps) {
  if (!utmInfo.has_gps || !utmInfo.corners) return null

  const { top_left, bottom_right } = utmInfo.corners

  const minE = top_left.easting
  const maxE = bottom_right.easting
  const minN = bottom_right.northing
  const maxN = top_left.northing

  const rangeE = maxE - minE
  const rangeN = maxN - minN

  if (rangeE <= 0 || rangeN <= 0) return null

  // Calcular "nice" tick spacing
  const tickSpacingE = niceNumber(rangeE / 4)
  const tickSpacingN = niceNumber(rangeN / 4)

  // Gerar ticks
  const eastingTicks = generateTicks(minE, maxE, tickSpacingE)
  const northingTicks = generateTicks(minN, maxN, tickSpacingN)

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox={`0 0 ${imageWidth} ${imageHeight}`}
      preserveAspectRatio="none"
    >
      {/* Linhas verticais (Easting) */}
      {eastingTicks.map((e) => {
        const x = ((e - minE) / rangeE) * imageWidth
        return (
          <g key={`e-${e}`}>
            <line
              x1={x} y1={0} x2={x} y2={imageHeight}
              stroke="rgba(255,255,255,0.2)" strokeWidth={1} strokeDasharray="8,8"
            />
            {/* Label topo */}
            <text
              x={x} y={14}
              fill="rgba(255,255,255,0.7)" fontSize={10} textAnchor="middle"
              fontFamily="monospace"
            >
              {formatUTM(e)}
            </text>
            {/* Label base */}
            <text
              x={x} y={imageHeight - 4}
              fill="rgba(255,255,255,0.7)" fontSize={10} textAnchor="middle"
              fontFamily="monospace"
            >
              {formatUTM(e)}
            </text>
          </g>
        )
      })}

      {/* Linhas horizontais (Northing) */}
      {northingTicks.map((n) => {
        const y = ((maxN - n) / rangeN) * imageHeight
        return (
          <g key={`n-${n}`}>
            <line
              x1={0} y1={y} x2={imageWidth} y2={y}
              stroke="rgba(255,255,255,0.2)" strokeWidth={1} strokeDasharray="8,8"
            />
            {/* Label esquerda */}
            <text
              x={4} y={y - 3}
              fill="rgba(255,255,255,0.7)" fontSize={10} textAnchor="start"
              fontFamily="monospace"
            >
              {formatUTM(n)}
            </text>
            {/* Label direita */}
            <text
              x={imageWidth - 4} y={y - 3}
              fill="rgba(255,255,255,0.7)" fontSize={10} textAnchor="end"
              fontFamily="monospace"
            >
              {formatUTM(n)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function niceNumber(range: number): number {
  const exponent = Math.floor(Math.log10(range))
  const fraction = range / Math.pow(10, exponent)

  let nice: number
  if (fraction <= 1.5) nice = 1
  else if (fraction <= 3) nice = 2
  else if (fraction <= 7) nice = 5
  else nice = 10

  return nice * Math.pow(10, exponent)
}

function generateTicks(min: number, max: number, spacing: number): number[] {
  const ticks: number[] = []
  const start = Math.ceil(min / spacing) * spacing
  for (let v = start; v <= max; v += spacing) {
    ticks.push(Math.round(v * 100) / 100)
  }
  return ticks
}

function formatUTM(value: number): string {
  // Mostrar abreviado: ex 499800 → 499.8k ou simplesmente último bloco
  if (value >= 1000000) {
    return `${(value / 1000).toFixed(1)}k`
  }
  return value.toFixed(0)
}
