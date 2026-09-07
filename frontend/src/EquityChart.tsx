import { useMemo, useRef, useState } from 'react'
import type { EquityPoint } from './api'

const VB_WIDTH = 1000
const VB_HEIGHT = 360
const PLOT_LEFT = 150
const PLOT_RIGHT = 980
const PLOT_TOP = 20
const PLOT_BOTTOM = 300

function formatMoney(value: number): string {
  return (
    value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' $'
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

function niceTicks(min: number, max: number, count = 7): number[] {
  let range = max - min
  if (range === 0) range = Math.abs(min) || 1
  const roughStep = range / (count - 1)
  const mag = 10 ** Math.floor(Math.log10(roughStep))
  const residual = roughStep / mag
  const niceResidual = residual < 1.5 ? 1 : residual < 3 ? 2 : residual < 7 ? 5 : 10
  const step = niceResidual * mag
  const niceMin = Math.floor(min / step) * step
  const niceMax = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let v = niceMin; v <= niceMax + step * 0.5; v += step) ticks.push(v)
  return ticks
}

export function EquityChart({
  points,
  initialBalance,
}: {
  points: EquityPoint[]
  initialBalance: number
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const plot = useMemo(() => {
    if (points.length === 0) return null

    const balancePoints = [
      { date: null as string | null, balance: initialBalance },
      ...points.map((p) => ({ date: p.closed_at, balance: initialBalance + p.cumulative_pnl })),
    ]

    const balances = balancePoints.map((p) => p.balance)
    const dataMin = Math.min(...balances)
    const dataMax = Math.max(...balances)
    const ticks = niceTicks(dataMin, dataMax).reverse()
    const yMin = ticks[ticks.length - 1]
    const yMax = ticks[0]

    const xScale = (i: number) =>
      balancePoints.length === 1
        ? PLOT_LEFT
        : PLOT_LEFT + (i / (balancePoints.length - 1)) * (PLOT_RIGHT - PLOT_LEFT)
    const yScale = (v: number) => PLOT_BOTTOM - ((v - yMin) / (yMax - yMin)) * (PLOT_BOTTOM - PLOT_TOP)

    const coords = balancePoints.map((p, i) => ({ x: xScale(i), y: yScale(p.balance), point: p }))
    const startY = yScale(initialBalance)
    const last = coords[coords.length - 1]

    const linePoints = coords.map((c) => `${c.x},${c.y}`).join(' ')
    const areaPoints = `${linePoints} ${last.x},${startY} ${coords[0].x},${startY}`

    const midIndex = Math.floor((coords.length - 1) / 2)

    return { coords, ticks, yMin, yMax, startY, linePoints, areaPoints, last, midIndex }
  }, [points, initialBalance])

  if (!plot) {
    return (
      <div className="chart-card">
        <p className="chart-empty">Pas encore de trade clôturé pour tracer une courbe d'équity.</p>
      </div>
    )
  }

  const { coords, ticks, startY, linePoints, areaPoints, last, midIndex } = plot
  const hovered = hoverIndex !== null ? coords[hoverIndex] : null

  function handlePointerMove(e: React.PointerEvent<SVGRectElement>) {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const relX = ((e.clientX - rect.left) / rect.width) * VB_WIDTH
    let nearest = 0
    let nearestDist = Infinity
    coords.forEach((c, i) => {
      const dist = Math.abs(c.x - relX)
      if (dist < nearestDist) {
        nearestDist = dist
        nearest = i
      }
    })
    setHoverIndex(nearest)
  }

  return (
    <div className="chart-card">
      <div className="chart-plot">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VB_WIDTH} ${VB_HEIGHT}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={`Solde du compte de ${formatMoney(initialBalance)} à ${formatMoney(last.point.balance)}`}
        >
          {ticks.map((t) => {
            const y = PLOT_BOTTOM - ((t - plot.yMin) / (plot.yMax - plot.yMin)) * (PLOT_BOTTOM - PLOT_TOP)
            return <line key={t} className="chart-grid" x1={PLOT_LEFT} y1={y} x2={PLOT_RIGHT} y2={y} />
          })}
          <line className="chart-axis-line" x1={PLOT_LEFT} y1={PLOT_TOP - 10} x2={PLOT_LEFT} y2={PLOT_BOTTOM + 10} />

          <line className="chart-refline start" x1={0} y1={startY} x2={VB_WIDTH} y2={startY} />
          <line className="chart-refline now" x1={0} y1={last.y} x2={VB_WIDTH} y2={last.y} />

          <polygon className="chart-area" points={areaPoints} />
          <polyline className="chart-line" points={linePoints} />
          <circle className="chart-dot" cx={last.x} cy={last.y} r={4.5} />

          {hovered && (
            <>
              <line
                x1={hovered.x}
                y1={PLOT_TOP - 10}
                x2={hovered.x}
                y2={PLOT_BOTTOM + 10}
                stroke="var(--ink-faint)"
                strokeWidth={1}
              />
              <circle cx={hovered.x} cy={hovered.y} r={4.5} fill="var(--chart-line)" stroke="var(--surface-raised)" strokeWidth={2} />
            </>
          )}

          <rect
            x={PLOT_LEFT}
            y={PLOT_TOP - 10}
            width={PLOT_RIGHT - PLOT_LEFT}
            height={PLOT_BOTTOM - PLOT_TOP + 20}
            fill="transparent"
            onPointerMove={handlePointerMove}
            onPointerLeave={() => setHoverIndex(null)}
          />
        </svg>

        <div className="chart-y-axis">
          {ticks.map((t) => {
            const topPct = ((PLOT_BOTTOM - PLOT_TOP - ((t - plot.yMin) / (plot.yMax - plot.yMin)) * (PLOT_BOTTOM - PLOT_TOP)) / (PLOT_BOTTOM - PLOT_TOP)) * 100
            const isStart = Math.abs(t - initialBalance) < (plot.yMax - plot.yMin) / 200
            return (
              <span
                key={t}
                className={`tick mono tabular${isStart ? ' highlight' : ''}`}
                style={{ top: `${topPct}%` }}
              >
                {formatMoney(t)}
              </span>
            )
          })}
        </div>

        <div className="chart-x-axis mono">
          <span>Départ</span>
          {coords.length > 2 && <span>{coords[midIndex].point.date ? formatDate(coords[midIndex].point.date) : ''}</span>}
          <span>{last.point.date ? formatDate(last.point.date) : ''}</span>
        </div>

        <div className="chart-refbadge now" style={{ top: `${(last.y / VB_HEIGHT) * 100}%` }}>
          <span className="val mono tabular">{formatMoney(last.point.balance)}</span>
          <span className="lbl">Solde</span>
        </div>

        {hovered && hoverIndex !== 0 && (
          <div
            className="mono tabular"
            style={{
              position: 'absolute',
              left: `${(hovered.x / VB_WIDTH) * 100}%`,
              top: `${(hovered.y / VB_HEIGHT) * 100}%`,
              transform: 'translate(-50%, calc(-100% - 12px))',
              background: 'var(--surface-raised)',
              border: '1px solid var(--hairline)',
              borderRadius: 6,
              padding: '5px 9px',
              fontSize: 12,
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
          >
            <strong>{formatMoney(hovered.point.balance)}</strong>
            {hovered.point.date && <span style={{ color: 'var(--ink-muted)', marginLeft: 6 }}>{formatDate(hovered.point.date)}</span>}
          </div>
        )}
      </div>

      <div className="chart-legend">
        <span className="swatch"></span>
        Taille du compte de départ
      </div>
    </div>
  )
}
