'use client'
import type { PlannerFilters, PlannerMode, SpanMonths } from './types'
import type { Service, Schedule } from '@/types'
import { RU_MONTHS, addMonths } from './utils'

interface Props {
  // Period
  startYear: number
  startMonth: number
  span: SpanMonths
  onSpanChange: (s: SpanMonths) => void
  onPrev: () => void
  onNext: () => void
  onToday: () => void

  // Filters
  filters: PlannerFilters
  onFilterChange: (f: PlannerFilters) => void
  services: Service[]
  schedules: Schedule[]
  userCount: number
  totalCount: number

  // Mode
  mode: PlannerMode
  canEdit: boolean
  onModeToggle: () => void

  // Settings panel toggle
  showSettings: boolean
  onSettingsToggle: () => void

  // Refresh
  onRefresh: () => void

  isLight: boolean
}

export default function PlannerToolbar({
  startYear, startMonth, span, onSpanChange, onPrev, onNext, onToday,
  filters, onFilterChange, services, schedules, userCount, totalCount,
  mode, canEdit, onModeToggle,
  showSettings, onSettingsToggle,
  onRefresh,
  isLight,
}: Props) {
  const scheduleCodes = [...new Set(schedules.map(s => s.code))].sort()

  const endLabel = span === 1
    ? `${RU_MONTHS[startMonth]} ${startYear}`
    : (() => {
        const e = addMonths(startYear, startMonth, span - 1)
        return `${RU_MONTHS[startMonth]} – ${RU_MONTHS[e.month]} ${e.year}`
      })()

  function setFilter<K extends keyof PlannerFilters>(key: K, val: string) {
    onFilterChange({ ...filters, [key]: val })
  }

  return (
    <div className="glass rounded-2xl p-3 space-y-2.5">
      {/* Row 1: span + navigation + mode + settings */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Span */}
        <div className={`flex gap-0.5 rounded-lg p-0.5 ${isLight ? 'bg-gray-100' : 'bg-white/5'}`}>
          {([1, 2, 3] as SpanMonths[]).map(s => (
            <button
              key={s}
              onClick={() => onSpanChange(s)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                span === s ? 'bg-blue-600 text-white' : isLight ? 'text-gray-500 hover:text-gray-700' : 'text-white/40 hover:text-white/70'
              }`}
            >{s} мес</button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-1">
          <button onClick={onPrev} className={`px-2 py-1 rounded-lg text-sm transition-colors ${isLight ? 'bg-gray-100 hover:bg-gray-200 text-gray-500' : 'bg-white/5 hover:bg-white/10 text-white/60'}`}>‹</button>
          <span className={`text-sm font-medium min-w-[180px] text-center ${isLight ? 'text-gray-700' : 'text-white/75'}`}>{endLabel}</span>
          <button onClick={onNext} className={`px-2 py-1 rounded-lg text-sm transition-colors ${isLight ? 'bg-gray-100 hover:bg-gray-200 text-gray-500' : 'bg-white/5 hover:bg-white/10 text-white/60'}`}>›</button>
          <button onClick={onToday} className={`px-2 py-1 rounded-lg text-xs transition-colors ${isLight ? 'bg-gray-100 hover:bg-gray-200 text-gray-400' : 'bg-white/5 hover:bg-white/10 text-white/35'}`}>сег.</button>
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          {/* Edit mode toggle */}
          {canEdit && (
            <button
              onClick={onModeToggle}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                mode === 'edit'
                  ? 'bg-green-600/30 text-green-700 border border-green-500/40'
                  : isLight
                    ? 'bg-gray-100 text-gray-500 hover:text-gray-700 border border-transparent'
                    : 'bg-white/5 text-white/35 hover:text-white/60 border border-transparent'
              }`}
            >
              {mode === 'edit' ? '✏️ Режим правки' : '👁 Просмотр'}
            </button>
          )}

          {/* Settings */}
          <button
            onClick={onSettingsToggle}
            className={`p-2 rounded-xl text-sm transition-colors ${
              showSettings
                ? isLight ? 'bg-gray-200 text-gray-700' : 'bg-white/15 text-white'
                : isLight ? 'bg-gray-100 text-gray-400 hover:text-gray-600' : 'bg-white/5 text-white/35 hover:text-white/60'
            }`}
            title="Настройки"
          >⚙️</button>

          {/* Refresh */}
          <button
            onClick={onRefresh}
            className={`p-2 rounded-xl text-sm transition-colors ${isLight ? 'bg-gray-100 text-gray-400 hover:text-gray-600' : 'bg-white/5 text-white/30 hover:text-white/60'}`}
            title="Обновить"
          >↻</button>
        </div>
      </div>

      {/* Row 2: filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="text"
          placeholder="Поиск по имени…"
          value={filters.search}
          onChange={e => setFilter('search', e.target.value)}
          className="form-input text-xs w-44"
        />

        <select value={filters.serviceId} onChange={e => setFilter('serviceId', e.target.value)} className="form-select text-xs">
          <option value="">Все службы</option>
          {services.map(s => <option key={s.service_id} value={s.service_id}>{s.service_name}</option>)}
        </select>

        <select value={filters.scheduleCode} onChange={e => setFilter('scheduleCode', e.target.value)} className="form-select text-xs">
          <option value="">Все графики</option>
          {scheduleCodes.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select value={filters.shiftNum} onChange={e => setFilter('shiftNum', e.target.value)} className="form-select text-xs">
          <option value="">Все смены</option>
          {[1, 2, 3, 4].map(n => <option key={n} value={n}>Смена {n}</option>)}
        </select>

        <span className={`text-xs ml-auto ${isLight ? 'text-gray-400' : 'text-white/25'}`}>
          {userCount} из {totalCount} сотр.
        </span>
      </div>

      {/* Legend */}
      <div className={`flex items-center gap-4 text-[11px] flex-wrap ${isLight ? 'text-gray-400' : 'text-white/30'}`}>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-amber-500/25 inline-block border border-amber-500/20" /> I день (авто)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-amber-500/55 inline-block border border-amber-500/40" /> I день (вручную)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-blue-500/25 inline-block border border-blue-500/20" /> II ночь (авто)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-blue-500/55 inline-block border border-blue-500/40" /> II ночь (вручную)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-8 h-2 rounded bg-amber-500/40 inline-block" /> фаза день
        </span>
        <span className="flex items-center gap-1">
          <span className="w-8 h-2 rounded bg-blue-500/40 inline-block" /> фаза ночь
        </span>
        {mode === 'edit' && (
          <span className={`ml-auto ${isLight ? 'text-green-700/70' : 'text-green-400/60'}`}>
            ✏️ Клик по ячейке — ручная правка · Клик по полоске — редактор фаз · ✎ — назначить график
          </span>
        )}
      </div>
    </div>
  )
}
