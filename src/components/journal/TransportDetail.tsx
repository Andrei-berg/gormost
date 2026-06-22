'use client'
import { useState } from 'react'
import type { UI } from './ui'
import type { PlanItem } from './data'
import VehicleNumberBadge from '@/components/VehicleNumberBadge'
import VehicleNumbersEditor from './VehicleNumbersEditor'

// Transport on a plan row — prominent garage-number badges (read-only) or, when
// an onUpdate handler is given, an inline editor opened on demand. Mirrors
// CrewDetail: edits buffer locally and commit on «Готово».

interface Props {
  item: PlanItem
  ui: UI
  onUpdate?: (id: string, numbers: string[]) => void
}

export default function TransportDetail({ item, ui, onUpdate }: Props) {
  const [editing, setEditing] = useState(false)
  const [buf, setBuf] = useState<string[]>(item.vehicleNumbers)
  const nums = item.vehicleNumbers
  const editable = !!onUpdate

  const open = () => { setBuf(item.vehicleNumbers); setEditing(true) }
  const save = () => { onUpdate?.(item.id, buf); setEditing(false) }

  const badges = nums.length > 0 && (
    <span className="inline-flex flex-wrap items-center gap-1">
      {nums.map(n => <VehicleNumberBadge key={n} number={n} size="sm" />)}
    </span>
  )

  if (!editable) return badges || null

  if (editing) {
    return (
      <div className={`mt-1.5 w-full ${ui.inset} ${ui.radiusSm} p-2.5`}>
        <div className={`${ui.label} mb-2`}>№ машин (гаражные)</div>
        <VehicleNumbersEditor value={buf} onChange={setBuf} ui={ui} />
        <div className="flex justify-end gap-2 mt-2.5">
          <button onClick={() => setEditing(false)} className={ui.ghostBtn}>Отмена</button>
          <button onClick={save} className="px-3 py-1.5 rounded-xl text-sm font-semibold text-white" style={{ background: '#2563eb' }}>Готово</button>
        </div>
      </div>
    )
  }

  return (
    <button onClick={open} className="inline-flex items-center gap-1.5 text-left" title="изменить № машин">
      {badges || <span className={`text-[11px] ${ui.textMuted} ${ui.hoverText} transition-colors`}>＋ № машин</span>}
      {nums.length > 0 && <span className={`text-[11px] ${ui.textMuted}`}>✎</span>}
    </button>
  )
}
