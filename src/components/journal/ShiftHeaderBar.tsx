'use client'
import { useState } from 'react'
import type { JournalShiftHeader } from '@/types'
import type { UI } from './ui'
import { MasterIcon, TruckIcon } from './icons'

// Шапка дня — one ribbon per (date × period). Дежурный мастер + водитель смены
// + Отв. entered once and reused across every наряд of that shift. Amber accent
// ties it to the наряд-допуск world; the Отв. field carries a «→ наряд» hint
// because it pre-fills «наряд-допуск выдал».
//
// State is initialized from the header prop; the parent remounts this via `key`
// (date|period|header.id) when the slice or the loaded header changes, so there
// is no setState-from-props effect.

export type ShiftHeaderPatch = Pick<JournalShiftHeader, 'duty_master' | 'shift_driver' | 'issuer'>

interface Props {
  header: JournalShiftHeader | null
  ui: UI
  onSave: (patch: ShiftHeaderPatch) => void
}

const ACCENT = '#f59e0b' // янтарь — мир наряда-допуска

export default function ShiftHeaderBar({ header, ui, onSave }: Props) {
  const [dutyMaster, setDutyMaster] = useState(header?.duty_master ?? '')
  const [shiftDriver, setShiftDriver] = useState(header?.shift_driver ?? '')
  const [issuer, setIssuer] = useState(header?.issuer ?? '')

  const saveIfChanged = () => {
    const patch: ShiftHeaderPatch = {
      duty_master: dutyMaster.trim() || null,
      shift_driver: shiftDriver.trim() || null,
      issuer: issuer.trim() || null,
    }
    if (
      patch.duty_master === (header?.duty_master ?? null) &&
      patch.shift_driver === (header?.shift_driver ?? null) &&
      patch.issuer === (header?.issuer ?? null)
    ) return
    onSave(patch)
  }

  const fieldInput =
    `bg-transparent text-sm ${ui.text} outline-none placeholder:text-[var(--text-faint)] ` +
    `border-b border-transparent focus:border-[var(--border-strong)] transition-colors`

  // Called as a function (not <Field/>) so the inputs are not remounted on each
  // keystroke — a JSX-rendered local component would steal focus every render.
  const field = (
    icon: React.ReactNode, label: string, value: string,
    set: (v: string) => void, placeholder: string, width: string, hint?: string,
  ) => (
    <label className="flex items-center gap-2 min-w-0">
      <span className="inline-flex w-4 justify-center shrink-0 opacity-80">{icon}</span>
      <span className={`${ui.label} shrink-0`}>{label}</span>
      <input
        value={value}
        onChange={e => set(e.target.value)}
        onBlur={saveIfChanged}
        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
        placeholder={placeholder}
        className={`${fieldInput} ${width}`}
      />
      {hint && value.trim() && (
        <span
          className="shrink-0 text-[9px] px-1 py-0.5 rounded"
          style={{ color: ACCENT, background: ACCENT + '1f', border: `1px solid ${ACCENT}40` }}
        >
          {hint}
        </span>
      )}
    </label>
  )

  return (
    <div
      className={`${ui.card} px-4 py-2.5 mb-5 flex flex-wrap items-center gap-x-6 gap-y-2`}
      style={{ borderLeft: `3px solid ${ACCENT}` }}
    >
      <span className={`${ui.label} shrink-0`} style={{ color: ACCENT }}>шапка дня</span>
      {field(<MasterIcon className="w-4 h-4" />, 'деж. мастер', dutyMaster, setDutyMaster, 'фамилия И.О.', 'w-40')}
      {field(<TruckIcon className="w-4 h-4" />, 'водитель', shiftDriver, setShiftDriver, 'напр. 8/11', 'w-24')}
      {field(<span style={{ fontSize: 13 }}>🖊</span>, 'Отв.', issuer, setIssuer, 'кто выдаёт наряд', 'w-44', '→ наряд')}
    </div>
  )
}
