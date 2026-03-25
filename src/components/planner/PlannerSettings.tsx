'use client'
import type { PlannerSettings } from './types'

interface Props {
  settings: PlannerSettings
  onChange: (s: PlannerSettings) => void
  onClose: () => void
}

interface ToggleRowProps {
  label: string
  hint?: string
  value: boolean
  onChange: (v: boolean) => void
}

function ToggleRow({ label, hint, value, onChange }: ToggleRowProps) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer group py-2 border-b border-white/5 last:border-0">
      <div>
        <div className="text-sm text-white/70 group-hover:text-white/90 transition-colors">{label}</div>
        {hint && <div className="text-[10px] text-white/25 mt-0.5">{hint}</div>}
      </div>
      <button
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative w-10 h-5.5 rounded-full transition-colors shrink-0 ${
          value ? 'bg-blue-600' : 'bg-white/10'
        }`}
        style={{ height: 22 }}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
            value ? 'translate-x-[18px]' : 'translate-x-0'
          }`}
        />
      </button>
    </label>
  )
}

export default function PlannerSettings({ settings, onChange, onClose }: Props) {
  function set<K extends keyof PlannerSettings>(key: K, val: PlannerSettings[K]) {
    onChange({ ...settings, [key]: val })
  }

  return (
    <div className="glass-strong rounded-2xl border border-white/10 p-4 w-72 space-y-1">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-white/80">⚙️ Настройки</span>
        <button onClick={onClose} className="text-white/25 hover:text-white/60 text-xl leading-none">×</button>
      </div>

      <ToggleRow
        label="Выходные дни"
        hint="Скрыть Сб/Вс для графиков 5/2"
        value={settings.showWeekends}
        onChange={v => set('showWeekends', v)}
      />
      <ToggleRow
        label="Компактный вид"
        hint="Уменьшить высоту строк"
        value={settings.compactRows}
        onChange={v => set('compactRows', v)}
      />
      <ToggleRow
        label="Группировка по службам"
        hint="Разделители между службами"
        value={settings.groupByService}
        onChange={v => set('groupByService', v)}
      />
      <ToggleRow
        label="Полосы фаз"
        hint="Цветная полоска день/ночь под строкой"
        value={settings.showPhaseStrips}
        onChange={v => set('showPhaseStrips', v)}
      />
      <ToggleRow
        label="Только с проблемами ⚠️"
        hint="Цикличный график, но нет фаз"
        value={settings.onlyWithIssues}
        onChange={v => set('onlyWithIssues', v)}
      />
      <ToggleRow
        label="Итоговая колонка"
        hint="Счётчик рабочих дней справа"
        value={settings.showSummaryCol}
        onChange={v => set('showSummaryCol', v)}
      />
    </div>
  )
}
