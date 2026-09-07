import type { TradeExit } from './api'

export function TradeExitsTable({ exits }: { exits: TradeExit[] }) {
  if (exits.length === 0) return null

  return (
    <div className="partial-exits">
      <table>
        <thead>
          <tr>
            <th>Sortie</th>
            <th>% du restant</th>
            <th>Lot fermé</th>
            <th>Prix</th>
            <th>PnL</th>
          </tr>
        </thead>
        <tbody>
          {exits.map((exit) => (
            <tr key={exit.id}>
              <td className="mono">TP{exit.sequence}</td>
              <td className="mono tabular">{exit.percent_of_remaining}&nbsp;%</td>
              <td className="mono tabular">{exit.size_closed}</td>
              <td className="mono tabular">{exit.exit_price}</td>
              <td className={`mono tabular ${exit.pnl >= 0 ? 'gain' : 'loss'}`}>{exit.pnl}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ fontSize: '11.5px', color: 'var(--ink-faint)', margin: '8px 0 0' }}>
        Chaque % s'applique au lot restant au moment de la sortie.
      </p>
    </div>
  )
}
