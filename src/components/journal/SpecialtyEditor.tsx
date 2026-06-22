'use client'
import { useState } from 'react'
import type { SpecialtyCount } from '@/types'
import type { UI } from './ui'
import { SPECIALTIES } from './data'

// Состав по специальностям — optional detailed crew breakdown editor.
// Reused by the detailed add form and by inline row editing. Keeps the journal
// light: this is shown only when the operator chooses to detail the crew.

interface Props {
  value: SpecialtyCount[]
  onChange: (v: SpecialtyCount[]) => void
  ui: UI
}

const labelOf = (code: string) => SPECIALTIES.find(s => s.code === code)?.label ?? code

export default function SpecialtyEditor({ value, onChange, ui }: Props) {
  const [custom, setCustom] = useState('')

  const present = new Set(value.map(v => v.code))
  const available = SPECIALTIES.filter(s => !present.has(s.code))

  const add = (code: string) => {
    const c = code.trim()
    if (!c || present.has(c)) return
    onChange([...value, { code: c, count: 1 }])
  }
  const setCount = (code: string, count: number) =>
    onChange(value.map(v => (v.code === code ? { ...v, count: Math.max(0, count) } : v)))
  const remove = (code: string) => onChange(value.filter(v => v.code !== code))

  const addCustom = () => {
    const c = custom.trim()
    if (!c) return
    add(c)
    setCustom('')
  }

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map(s => (
            <div
              key={s.code}
              className={`inline-flex items-center gap-1 ${ui.inset} ${ui.radiusSm} pl-2 pr-1 py-0.5`}
              title={labelOf(s.code)}
            >
              <span className={`text-xs ${ui.text}`}>
                <span className="font-mono font-semibold">{s.count}</span>
                <span className={ui.textSub}> {s.code}</span>
              </span>
              <span className="inline-flex items-center">
                <button onClick={() => setCount(s.code, s.count - 1)} className={`px-1 text-sm ${ui.textMuted} ${ui.hoverText}`}>−</button>
                <button onClick={() => setCount(s.code, s.count + 1)} className={`px-1 text-sm ${ui.textMuted} ${ui.hoverText}`}>+</button>
                <button onClick={() => remove(s.code)} className={`px-1 text-xs ${ui.textMuted} hover:text-red-400`}>✕</button>
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        {available.map(s => (
          <button
            key={s.code}
            onClick={() => add(s.code)}
            title={s.label}
            className={`text-[11px] px-2 py-1 ${ui.radiusSm} border border-dashed ${ui.border} ${ui.textMuted} ${ui.hoverText} transition-colors`}
          >
            ＋ {s.code}
          </button>
        ))}
        <span className={`inline-flex items-center ${ui.inset} ${ui.radiusSm} overflow-hidden`}>
          <input
            value={custom}
            onChange={e => setCustom(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom() } }}
            placeholder="свой код"
            className={`w-20 bg-transparent text-[11px] px-2 py-1 outline-none ${ui.text} placeholder:text-[var(--text-faint)]`}
          />
          <button onClick={addCustom} className={`px-2 py-1 text-sm ${ui.textMuted} ${ui.hoverText}`} title="Добавить специальность">＋</button>
        </span>
      </div>
    </div>
  )
}
