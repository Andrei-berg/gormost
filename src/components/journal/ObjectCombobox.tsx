'use client'
import { useMemo, useState } from 'react'
import { norm, type ObjectRef } from './data'
import type { UI } from './ui'

interface Props {
  objects: ObjectRef[]
  ui: UI
  /** Current text in the field. */
  value: string
  onChange: (text: string) => void
  /** id of the picked existing object, or null when text is a new name. */
  selectedId: string | null
  onSelect: (id: string | null) => void
  placeholder?: string
  autoFocus?: boolean
  className?: string
}

// Free-text object entry with suggestions of similar existing objects.
// Picking a suggestion = reuse; otherwise the typed name becomes a new object.
export default function ObjectCombobox({
  objects, ui, value, onChange, selectedId, onSelect, placeholder, autoFocus, className,
}: Props) {
  const [open, setOpen] = useState(false)

  const matches = useMemo(() => {
    const q = norm(value)
    if (!q) return objects.slice(0, 6)
    return objects.filter(o => norm(o.name).includes(q) || norm(o.address).includes(q)).slice(0, 6)
  }, [objects, value])

  // Existing object with exactly this name? then it's not "new".
  const exact = useMemo(
    () => objects.find(o => norm(o.name) === norm(value)),
    [objects, value],
  )
  const isNew = value.trim().length > 0 && !exact

  return (
    <div className={`relative ${className ?? ''}`}>
      <input
        value={value}
        autoFocus={autoFocus}
        onChange={e => { onChange(e.target.value); onSelect(null); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        placeholder={placeholder ?? 'объект — введите или выберите…'}
        className={ui.input}
      />

      {open && (value.trim() || matches.length > 0) && (
        <div className={`absolute z-20 mt-1 w-full ${ui.card} shadow-2xl overflow-hidden`}>
          {matches.map(o => (
            <button
              key={o.id}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => { onSelect(o.id); onChange(o.name); setOpen(false) }}
              className={`w-full text-left px-3 py-2 hover:bg-[var(--bg-card-strong)] transition-colors ${
                selectedId === o.id ? 'bg-[var(--bg-card-strong)]' : ''
              }`}
            >
              <div className={`text-sm ${ui.text}`}>{o.name}</div>
              <div className={`text-[11px] ${ui.textMuted}`}>{o.address}</div>
            </button>
          ))}

          {isNew && (
            <div className={`px-3 py-2 text-[12px] ${ui.textSub} border-t ${ui.border}`}>
              ↳ создать новый объект «{value.trim()}»
            </div>
          )}
          {matches.length === 0 && !isNew && (
            <div className={`px-3 py-2 text-[12px] ${ui.textMuted}`}>ничего не найдено</div>
          )}
        </div>
      )}
    </div>
  )
}
