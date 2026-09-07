import { useMemo, useRef, useState } from 'react'
import type { EquityPoint } from './api'

const WIDTH = 640
const HEIGHT = 220
const PADDING = { top: 16, right: 16, bottom: 24, left: 56 }

function formatMoney(value: number): string {
  return value.toLocaleString('fr-FR', { maximumFractionDigits: 0 })
}

export function EquityChart({ points }: { points: EquityPoint[] }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const plot = useMemo(() => {
    if (points.length === 0) return null

    const xs = points.map((p) => new Date(p.closed_at).getTime())
    const ys = points.map((p) => p.cumulative_pnl)
    const xMin = xs[0]
    const xMax = xs[xs.length - 1]
    const yDataMin = Math.min(0, ...ys)
    const yDataMax = Math.max(0, ...ys)
    const yPad = (yDataMax - yDataMin) * 0.1 || 1
    const yMin = yDataMin - yPad
    const yMax = yDataMax + yPad

    const innerW = WIDTH - PADDING.left - PADDING.right
    const innerH = HEIGHT - PADDING.top - PADDING.bottom

    const xScale = (t: number) => (xMax === xMin ? innerW / 2 : ((t - xMin) / (xMax - xMin)) * innerW) + PADDING.left
    const yScale = (v: number) => PADDING.top + innerH - ((v - yMin) / (yMax - yMin)) * innerH

    const coords = points.map((p, i) => ({ x: xScale(xs[i]), y: yScale(p.cumulative_pnl), point: p }))
    const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ')
    const zeroY = yScale(0)

    return { coords, path, zeroY, innerW, innerH }
  }, [points])

  if (!plot || points.length === 0) {
    return <p>Pas encore de trade clôturé pour tracer une courbe d'équity.</p>
  }

  const { coords, path, zeroY } = plot
  const hovered = hoverIndex !== null ? coords[hoverIndex] : null
  const last = coords[coords.length - 1]

  function handlePointerMove(e: React.PointerEvent<SVGRectElement>) {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * WIDTH
    let nearest = 0
    let nearestDist = Infinity
    coords.forEach((c, i) => {
      const dist = Math.abs(c.x - x)
      if (dist < nearestDist) {
        nearestDist = dist
        nearest = i
      }
    })
    setHoverIndex(nearest)
  }

  return (
    <div className="viz-root" style={{ position: 'relative' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        role="img"
        aria-label="Courbe d'équity cumulée"
      >
        <line
          x1={PADDING.left}
          y1={zeroY}
          x2={WIDTH - PADDING.right}
          y2={zeroY}
          stroke="var(--baseline)"
          strokeWidth={1}
        />
        <path d={path} fill="none" stroke="var(--series-1)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        <circle cx={last.x} cy={last.y} r={4} fill="var(--series-1)" stroke="var(--surface-1)" strokeWidth={2} />
        <text x={last.x - 6} y={last.y - 10} textAnchor="end" fontSize={11} fill="var(--text-secondary)">
          {formatMoney(last.point.cumulative_pnl)}
        </text>

        {hovered && (
          <>
            <line
              x1={hovered.x}
              y1={PADDING.top}
              x2={hovered.x}
              y2={HEIGHT - PADDING.bottom}
              stroke="var(--muted)"
              strokeWidth={1}
            />
            <circle cx={hovered.x} cy={hovered.y} r={4} fill="var(--series-1)" stroke="var(--surface-1)" strokeWidth={2} />
          </>
        )}

        <rect
          x={PADDING.left}
          y={PADDING.top}
          width={WIDTH - PADDING.left - PADDING.right}
          height={HEIGHT - PADDING.top - PADDING.bottom}
          fill="transparent"
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoverIndex(null)}
        />
      </svg>

      {hovered && (
        <div
          style={{
            position: 'absolute',
            left: `${(hovered.x / WIDTH) * 100}%`,
            top: 0,
            transform: 'translateX(-50%)',
            background: 'var(--surface-1)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '4px 8px',
            fontSize: 12,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          <strong style={{ color: 'var(--text-primary)' }}>{formatMoney(hovered.point.cumulative_pnl)}</strong>{' '}
          <span style={{ color: 'var(--text-secondary)' }}>
            {new Date(hovered.point.closed_at).toLocaleDateString('fr-FR')}
          </span>
        </div>
      )}
    </div>
  )
}
