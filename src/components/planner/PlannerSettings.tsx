'use client'
import type { PlannerSettings } from './types'

interface Props {
  settings: PlannerSettings
  onChange: (s: PlannerSettings) => void
  onClose: () => void
  isLight: boolean
}

interface ToggleRowProps {
  label: string
  hint?: string
  value: boolean
  onChange: (v: boolean) => void
  isLight: boolean
}

function ToggleRow({ label, hint, value, onChange, isLight }: ToggleRowProps) {
  return (
    <label className={`flex items-center justify-between gap-3 cursor-pointer group py-2 border-b last:border-0 ${isLight ? 'border-gray-100' : 'border-white/5'}`}>
      <div>
        <div className={`text-sm transition-colors ${isLight ? 'text-gray-700 group-hover:text-gray-900' : 'text-white/70 group-hover:text-white/90'}`}>{label}</div>
        {hint && <div className={`text-[10px] mt-0.5 ${isLight ? 'text-gray-400' : 'text-white/25'}`}>{hint}</div>}
      </div>
      <button
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative w-10 rounded-full transition-colors shrink-0 ${
          value ? 'bg-blue-600' : isLight ? 'bg-gray-200' : 'bg-white/10'
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

export default function PlannerSettings({ settings, onChange, onClose, isLight }: Props) {
  function set<K extends keyof PlannerSettings>(key: K, val: PlannerSettings[K]) {
    onChange({ ...settings, [key]: val })
  }

  return (
    <div className={`glass-strong rounded-2xl p-4 w-72 space-y-1 ${isLight ? 'border border-gray-200' : 'border border-white/10'}`}>
      <div className="flex items-center justify-between mb-3">
        <span className={`text-sm font-semibold ${isLight ? 'text-gray-800' : 'text-white/80'}`}>⚙️ Настройки</span>
        <button onClick={onClose} className={`text-xl leading-none ${isLight ? 'text-gray-400 hover:text-gray-600' : 'text-white/25 hover:text-white/60'}`}>×</button>
      </div>

      <ToggleRow isLight={isLight} label="Выходные дни" hint="Скрыть Сб/Вс для графиков 5/2" value={settings.showWeekends} onChange={v => set('showWeekends', v)} />
      <ToggleRow isLight={isLight} label="Компактный вид" hint="Уменьшить высоту строк" value={settings.compactRows} onChange={v => set('compactRows', v)} />
      <ToggleRow isLight={isLight} label="Группировка по службам" hint="Разделители между службами" value={settings.groupByService} onChange={v => set('groupByService', v)} />
      <ToggleRow isLight={isLight} label="Полосы фаз" hint="Цветная полоска день/ночь под строкой" value={settings.showPhaseStrips} onChange={v => set('showPhaseStrips', v)} />
      <ToggleRow isLight={isLight} label="Только с проблемами ⚠️" hint="Цикличный график, но нет фаз" value={settings.onlyWithIssues} onChange={v => set('onlyWithIssues', v)} />
      <ToggleRow isLight={isLight} label="Итоговая колонка" hint="Счётчик рабочих дней справа" value={settings.showSummaryCol} onChange={v => set('showSummaryCol', v)} />
    </div>
  )
}
