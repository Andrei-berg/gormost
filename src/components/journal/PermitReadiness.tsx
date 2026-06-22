'use client'
import type { JournalShiftHeader } from '@/types'
import type { UI } from './ui'
import type { PlanItem } from './data'
import { permitReadiness } from './journalPermit'

// Полоса «готовности наряда» — shown on п.15 rows (works requiring a наряд-допуск).
// Encodes the бланк's structure as a segmented checklist so the operator sees at
// a glance what is already satisfied vs what still needs filling:
//   место · работа · факторы  → auto (row + catalog видов работ)
//   Отв.                       → from шапка дня
//   состав                     → counts entered on the row
//   имена · № машин            → deferred, filled by the master at issue time
// The whole strip is a button that opens the permit editor.

const ACCENT = '#f59e0b' // янтарь — мир наряда

interface Props {
  item: PlanItem
  header: JournalShiftHeader | null
  ui: UI
  onOpen: () => void
  size?: 'sm' | 'xs'
}

export default function PermitReadiness({ item, header, onOpen, size = 'sm' }: Props) {
  const { segments: segs, ready, total, done, missing } = permitReadiness(item, header)

  const title = done
    ? 'К наряду готово — имена и № машин впишет мастер при выдаче'
    : `Для наряда не хватает: ${missing.join(', ')} — имена и № машин впишет мастер при выдаче`

  const pipH = size === 'xs' ? 'h-2.5' : 'h-3'
  const textSz = size === 'xs' ? 'text-[9px]' : 'text-[10px]'

  return (
    <button
      onClick={onOpen}
      title={title}
      className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded border transition-colors hover:bg-amber-500/10`}
      style={{ borderColor: ACCENT + '40' }}
    >
      <span className={textSz}>🔺</span>
      <span className="inline-flex items-center gap-[2px]">
        {segs.map((s, i) => (
          <span
            key={i}
            className={`w-[5px] ${pipH} rounded-[1px]`}
            style={{
              background: s.ok ? ACCENT : 'transparent',
              border: `1px solid ${ACCENT}${s.ok ? '' : '66'}`,
            }}
          />
        ))}
        {/* deferred: имена · № машин — мастер при выдаче */}
        <span
          className={`w-[5px] ${pipH} rounded-[1px] opacity-50`}
          style={{ borderLeft: `1px dashed ${ACCENT}`, borderTop: `1px dashed ${ACCENT}`, borderBottom: `1px dashed ${ACCENT}`, borderRight: `1px dashed ${ACCENT}` }}
        />
      </span>
      <span className={`${textSz} font-mono`} style={{ color: ACCENT }}>{ready}/{total}</span>
      <span className={textSz} style={{ color: ACCENT }}>наряд</span>
    </button>
  )
}
