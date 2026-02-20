'use client'

interface ScaleBarProps {
  gsdM: number  // metros por pixel
  zoom: number  // zoom percentage (100 = 1:1)
}

/**
 * Barra de escala cartográfica que se ajusta ao GSD e zoom.
 */
export default function ScaleBar({ gsdM, zoom }: ScaleBarProps) {
  // Pixels na tela por pixel da imagem
  const screenScale = zoom / 100

  // Escolher "nice" distance para a barra
  const niceDistances = [0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000]

  // Queremos uma barra entre 80 e 200px na tela
  const targetMinPx = 80
  const targetMaxPx = 200

  let distance = 10  // metros
  let barPx = 100

  for (const d of niceDistances) {
    const px = (d / gsdM) * screenScale
    if (px >= targetMinPx && px <= targetMaxPx) {
      distance = d
      barPx = px
      break
    }
  }

  // Se nenhum encaixa perfeitamente, usar o primeiro acima do mínimo
  if (barPx < targetMinPx) {
    for (const d of niceDistances) {
      const px = (d / gsdM) * screenScale
      if (px >= targetMinPx) {
        distance = d
        barPx = Math.min(px, targetMaxPx)
        break
      }
    }
  }

  const label = distance >= 1000 ? `${distance / 1000} km` : `${distance} m`

  // 4 marcas intermediárias
  const ticks = [0, 0.25, 0.5, 0.75, 1]

  return (
    <div className="flex items-end gap-2 px-3 py-2 bg-gray-800/90 rounded-lg">
      <div className="relative" style={{ width: barPx }}>
        {/* Barra principal */}
        <div className="h-2 flex">
          {ticks.slice(0, -1).map((_, i) => (
            <div
              key={i}
              className={`flex-1 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-500'}`}
              style={{ height: 6 }}
            />
          ))}
        </div>
        {/* Ticks e labels */}
        <div className="relative h-4 mt-0.5">
          {ticks.map((t, i) => (
            <div
              key={i}
              className="absolute top-0 flex flex-col items-center"
              style={{ left: `${t * 100}%`, transform: 'translateX(-50%)' }}
            >
              <div className="w-px h-1.5 bg-white/80" />
              {(i === 0 || i === ticks.length - 1) && (
                <span className="text-[9px] text-gray-300 mt-0.5 whitespace-nowrap">
                  {i === 0 ? '0' : label}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
