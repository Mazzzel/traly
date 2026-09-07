import { useState } from 'react'
import { addTradeExit, upsertSymbolSpec, type SymbolSpec, type Trade } from './api'

function remainingSize(trade: Trade): number {
  const closed = trade.exits.reduce((sum, e) => sum + e.size_closed, 0)
  return Math.max(trade.size - closed, 0)
}

function computePnl(trade: Trade, exitPrice: number, sizeClosed: number, contractSize: number): number {
  const diff = trade.direction === 'buy' ? exitPrice - trade.entry_price : trade.entry_price - exitPrice
  return Math.round(diff * sizeClosed * contractSize * 100) / 100
}

export function CloseTradeForm({
  trade,
  symbolSpecs,
  onSpecSaved,
  onUpdated,
}: {
  trade: Trade
  symbolSpecs: SymbolSpec[]
  onSpecSaved: (spec: SymbolSpec) => void
  onUpdated: (trade: Trade) => void
}) {
  const knownSpec = symbolSpecs.find((s) => s.symbol === trade.symbol)
  const remaining = remainingSize(trade)

  const [percent, setPercent] = useState('100')
  const [exitPrice, setExitPrice] = useState('')
  const [contractSize, setContractSize] = useState(String(knownSpec?.contract_size ?? 1))
  const [pnl, setPnl] = useState('')
  const [pnlTouched, setPnlTouched] = useState(false)
  const [isBreakeven, setIsBreakeven] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function recomputeSuggestion(nextExitPrice: string, nextPercent: string, nextContractSize: string) {
    if (pnlTouched || nextExitPrice === '') return
    const sizeClosed = remaining * (Math.min(Number(nextPercent) || 0, 100) / 100)
    setPnl(String(computePnl(trade, Number(nextExitPrice), sizeClosed, Number(nextContractSize) || 0)))
  }

  function toggleBreakeven() {
    const next = !isBreakeven
    setIsBreakeven(next)
    if (next) {
      setPnl('0')
      setPnlTouched(true)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      if (!knownSpec || Number(contractSize) !== knownSpec.contract_size) {
        const spec = await upsertSymbolSpec(trade.symbol, Number(contractSize))
        onSpecSaved(spec)
      }
      const updated = await addTradeExit(trade.id, Number(percent), Number(exitPrice), Number(pnl), isBreakeven)
      onUpdated(updated)
      setExitPrice('')
      setPnl('')
      setPnlTouched(false)
      setIsBreakeven(false)
      setPercent('100')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div>
      <form className="inline-form" onSubmit={handleSubmit}>
        {error && <span role="alert">{error}</span>}
        <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>Restant: {remaining}</span>
        <input
          type="number"
          min="0"
          max="100"
          step="any"
          title="% du lot restant à clôturer sur cette sortie (100 = clôture totale)"
          placeholder="%"
          value={percent}
          onChange={(e) => {
            setPercent(e.target.value)
            recomputeSuggestion(exitPrice, e.target.value, contractSize)
          }}
          required
          style={{ width: '4.5rem' }}
        />
        <input
          type="number"
          step="0.00001"
          placeholder="Prix de sortie"
          value={exitPrice}
          onChange={(e) => {
            setExitPrice(e.target.value)
            recomputeSuggestion(e.target.value, percent, contractSize)
          }}
          required
        />
        {!knownSpec && (
          <input
            type="number"
            step="0.0001"
            title={`Taille de contrat pour ${trade.symbol} (ex: 100 pour XAUUSD, 100000 pour une paire forex, 1 pour une action/crypto). Enregistrée pour la prochaine fois.`}
            placeholder="Taille contrat"
            value={contractSize}
            onChange={(e) => {
              setContractSize(e.target.value)
              recomputeSuggestion(exitPrice, percent, e.target.value)
            }}
            required
          />
        )}
        <input
          type="number"
          step="0.01"
          title="PnL réel — calculé automatiquement, corrige-le si besoin"
          placeholder="PnL réel"
          value={pnl}
          onChange={(e) => {
            setPnl(e.target.value)
            setPnlTouched(true)
          }}
          required
        />
        <button
          type="button"
          className="be-toggle"
          aria-pressed={isBreakeven}
          title="Marquer cette clôture comme un break-even (PnL à 0)"
          onClick={toggleBreakeven}
        >
          BE
        </button>
        <button className="btn-accent" type="submit">
          {Number(percent) >= 100 ? 'Clôturer' : 'Clôturer partiellement'}
        </button>
      </form>
    </div>
  )
}
