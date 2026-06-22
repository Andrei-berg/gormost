'use client'
import type { DailyPlanItemFlag } from '@/types'
import type { UI } from './ui'
import { FLAG_META, FLAG_OPTIONS } from './data'

// Compact selector for a row's тип строки (обычная / по распоряжению / дежурство
// / важное). The closed control shows the current flag in its colour.

interface Props {
  flag: DailyPlanItemFlag | null
  ui: UI
  onChange: (flag: DailyPlanItemFlag | null) => void
}

export default function FlagSelect({ flag, ui, onChange }: Props) {
  const m = flag ? FLAG_META[flag] : null
  return (
    <select
      value={flag ?? ''}
      onChange={e => onChange((e.target.value || null) as DailyPlanItemFlag | null)}
      className={`text-[11px] bg-transparent outline-none cursor-pointer ${ui.textMuted}`}
      style={m ? { color: m.color } : undefined}
      title="Тип строки плана"
    >
      <option value="" className="text-black">обычная</option>
      {FLAG_OPTIONS.map(f => (
        <option key={f} value={f} className="text-black">{FLAG_META[f].em} {FLAG_META[f].label}</option>
      ))}
    </select>
  )
}
