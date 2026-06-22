'use client'
import { useState } from 'react'
import type { UI } from './ui'
import VehicleNumberBadge from '@/components/VehicleNumberBadge'

// Editor for a journal item's garage numbers (335, 196, 533с …). Free text —
// the journal plans transport before vehicles are bound to fleet records. Accepts
// comma/space separated input and paste; each number renders as the shared badge.

interface Props {
  value: string[]
  onChange: (v: string[]) => void
  ui: UI
}

const splitInput = (raw: string): string[] =>
  raw.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean)

export default function VehicleNumbersEditor({ value, onChange, ui }: Props) {
  const [draft, setDraft] = useState('')

  const addFrom = (raw: string) => {
    const parts = splitInput(raw)
    if (parts.length === 0) return
    const next = [...value]
    for (const p of parts) if (!next.includes(p)) next.push(p)
    onChange(next)
    setDraft('')
  }
  const remove = (n: string) => onChange(value.filter(v => v !== n))

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map(n => (
            <span key={n} className="inline-flex items-center gap-1">
              <VehicleNumberBadge number={n} size="sm" />
              <button onClick={() => remove(n)} className={`text-xs ${ui.textMuted} hover:text-red-400`} title="убрать">✕</button>
            </span>
          ))}
        </div>
      )}
      <span className={`inline-flex items-center ${ui.inset} ${ui.radiusSm} overflow-hidden`}>
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addFrom(draft) }
          }}
          onBlur={() => addFrom(draft)}
          onPaste={e => { e.preventDefault(); addFrom(e.clipboardData.getData('text')) }}
          placeholder="№ машины (335, 196…)"
          className={`w-40 bg-transparent text-xs px-2 py-1 outline-none ${ui.text} placeholder:text-[var(--text-faint)]`}
        />
        <button onClick={() => addFrom(draft)} className={`px-2 py-1 text-sm ${ui.textMuted} ${ui.hoverText}`} title="Добавить">＋</button>
      </span>
    </div>
  )
}
