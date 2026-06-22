'use client'
import { useState } from 'react'
import type { SpecialtyCount } from '@/types'
import type { UI } from './ui'
import type { PlanItem } from './data'
import { formatSpecialties } from './data'
import SpecialtyEditor from './SpecialtyEditor'

// Состав по специальностям on a plan row — read-only summary chip, or (when an
// onUpdate handler is given) an inline editor opened on demand. Edits buffer
// locally and commit on «Готово», so stepper clicks don't each trigger a reload.

interface Props {
  item: PlanItem
  ui: UI
  onUpdate?: (id: string, specialties: SpecialtyCount[]) => void
}

export default function CrewDetail({ item, ui, onUpdate }: Props) {
  const [editing, setEditing] = useState(false)
  const [buf, setBuf] = useState<SpecialtyCount[]>(item.specialties)
  const summary = formatSpecialties(item.specialties)
  const editable = !!onUpdate

  const open = () => { setBuf(item.specialties); setEditing(true) }
  const save = () => { onUpdate?.(item.id, buf.filter(s => s.count > 0)); setEditing(false) }

  if (!editable) {
    return summary
      ? <span className={`text-[11px] font-mono ${ui.textSub}`} title="состав по специальностям">🔧 {summary}</span>
      : null
  }

  if (editing) {
    return (
      <div className={`mt-1.5 w-full ${ui.inset} ${ui.radiusSm} p-2.5`}>
        <div className={`${ui.label} mb-2`}>состав по специальностям</div>
        <SpecialtyEditor value={buf} onChange={setBuf} ui={ui} />
        <div className="flex justify-end gap-2 mt-2.5">
          <button onClick={() => setEditing(false)} className={ui.ghostBtn}>Отмена</button>
          <button onClick={save} className="px-3 py-1.5 rounded-xl text-sm font-semibold text-white" style={{ background: '#2563eb' }}>Готово</button>
        </div>
      </div>
    )
  }

  return summary
    ? <button onClick={open} className={`text-[11px] font-mono ${ui.textSub} ${ui.hoverText} transition-colors`} title="изменить состав по специальностям">🔧 {summary} ✎</button>
    : <button onClick={open} className={`text-[11px] ${ui.textMuted} ${ui.hoverText} transition-colors`}>＋ состав по спец.</button>
}
