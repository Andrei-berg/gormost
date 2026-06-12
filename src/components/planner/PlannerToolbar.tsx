'use client'
import type { PlannerFilters, PlannerMode, SpanMonths } from './types'
import type { Service, Schedule } from '@/types'
import { RU_MONTHS, addMonths } from './utils'

interface Props {
  startYear: number
  startMonth: number
  span: SpanMonths
  onSpanChange: (s: SpanMonths) => void
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  filters: PlannerFilters
  onFilterChange: (f: PlannerFilters) => void
  services: Service[]
  schedules: Schedule[]
  userCount: number
  totalCount: number
  mode: PlannerMode
  canEdit: boolean
  onModeToggle: () => void
  showSettings: boolean
  onSettingsToggle: () => void
  onRefresh: () => void
}

export default function PlannerToolbar({
  startYear, startMonth, span, onSpanChange, onPrev, onNext, onToday,
  filters, onFilterChange, services, schedules, userCount, totalCount,
  mode, canEdit, onModeToggle,
  showSettings, onSettingsToggle,
  onRefresh,
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

  // ── Theme tokens ──────────────────────────────────────────────────────────
  const segBg    = 'bg-white/[0.05]'
  const segOn    = 'bg-white/10 text-white font-semibold'
  const segOff   = 'text-white/40 hover:text-white/70'
  const navBtn   = 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
  const monthPill = 'bg-white/5 border-white/10 text-white/80'
  const todayBtn = 'bg-amber-500/10 border-amber-500/30 text-amber-500'
  const iconBtn  = 'bg-white/5 border-white/10 text-white/35 hover:text-white/70'
  const inputCls = 'bg-black/30 border border-white/10 rounded-xl px-3 py-1.5 text-sm text-white/80 focus:outline-none focus:border-amber-500/50 placeholder-white/25 min-w-0'
  const selectCls = inputCls
  const countPill = 'bg-white/5 border border-white/10 text-white/40'

  return (
    <div className={`rounded-2xl border bg-white/5 border-white/10 p-3 space-y-2.5`}>

      {/* ── Row 1: Controls ── */}
      <div className="flex items-center gap-2 flex-wrap">

        {/* Span toggle */}
        <div className={`flex gap-0.5 rounded-xl p-0.5 ${segBg}`}>
          {([1, 2, 3] as SpanMonths[]).map(s => (
            <button
              key={s}
              onClick={() => onSpanChange(s)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${span === s ? segOn : segOff}`}
            >
              {s} мес
            </button>
          ))}
        </div>

        {/* Month navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={onPrev}
            className={`w-8 h-8 rounded-lg border flex items-center justify-center text-sm transition-colors ${navBtn}`}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 2L4 6l4 4"/></svg>
          </button>
          <div className={`px-4 h-8 rounded-lg border flex items-center justify-center text-[13px] font-semibold min-w-[148px] ${monthPill}`}>
            {endLabel}
          </div>
          <button
            onClick={onNext}
            className={`w-8 h-8 rounded-lg border flex items-center justify-center text-sm transition-colors ${navBtn}`}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 2l4 4-4 4"/></svg>
          </button>
          <button
            onClick={onToday}
            className={`px-3 h-8 rounded-lg border text-xs font-semibold transition-colors ${todayBtn}`}
          >
            Сег.
          </button>
        </div>

        {/* Right icons */}
        <div className="flex items-center gap-1.5 ml-auto">
          {canEdit && (
            <button
              onClick={onModeToggle}
              className={`h-8 px-3 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all ${
                mode === 'edit'
                  ? 'bg-green-600/20 border-green-500/40 text-green-400'
                  : iconBtn
              }`}
            >
              {mode === 'edit'
                ? <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Правка
                  </>
                : <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
                    Просмотр
                  </>
              }
            </button>
          )}

          <button
            onClick={onSettingsToggle}
            className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors ${
              showSettings
                ? 'bg-white/15 border-white/20 text-white'
                : iconBtn
            }`}
            title="Настройки"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
          </button>

          <button
            onClick={onRefresh}
            className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors ${iconBtn}`}
            title="Обновить"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/>
              <polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>
          </button>

          <button
            className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors bg-amber-500/10 border-amber-500/30 text-amber-500 hover:bg-amber-500/20`}
            title="Экспорт"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── Row 2: Filters ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[160px] max-w-[280px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
          <input
            type="text"
            placeholder="Поиск по имени…"
            value={filters.search}
            onChange={e => setFilter('search', e.target.value)}
            className={`w-full pl-8 ${inputCls}`}
          />
        </div>

        <select value={filters.serviceId} onChange={e => setFilter('serviceId', e.target.value)} className={selectCls}>
          <option value="">Все службы</option>
          {services.map(s => <option key={s.service_id} value={s.service_id}>{s.service_name}</option>)}
        </select>

        <select value={filters.scheduleCode} onChange={e => setFilter('scheduleCode', e.target.value)} className={selectCls}>
          <option value="">Все графики</option>
          {scheduleCodes.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select value={filters.shiftNum} onChange={e => setFilter('shiftNum', e.target.value)} className={selectCls}>
          <option value="">Все смены</option>
          {[1, 2, 3, 4].map(n => <option key={n} value={n}>Смена {n}</option>)}
        </select>

        <div className={`ml-auto px-3 py-1.5 rounded-full text-xs font-mono ${countPill}`}>
          <span className="text-amber-400 font-bold">{userCount}</span>
          <span> из {totalCount} сотр.</span>
        </div>
      </div>

      {/* ── Row 3: Legend ── */}
      <div className={`flex items-center gap-3 flex-wrap text-[11px] text-white/30`}>
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-sm inline-block flex-shrink-0" style={{ background: 'rgba(249,115,22,0.85)' }} />
          день (авто)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-sm inline-block flex-shrink-0" style={{ background: 'rgba(240,165,0,0.92)', outline: '1px dashed rgba(255,255,255,0.5)', outlineOffset: -2 }} />
          день (вручную)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-sm inline-block flex-shrink-0" style={{ background: 'rgba(56,139,253,0.78)' }} />
          ночь (авто)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-sm inline-block flex-shrink-0" style={{ background: 'rgba(111,168,255,0.92)', outline: '1px dashed rgba(255,255,255,0.5)', outlineOffset: -2 }} />
          ночь (вручную)
        </span>
        <span className={`w-px h-3.5 bg-white/10 mx-1`} />
        <span className="flex items-center gap-1.5">
          <span className="w-7 h-2 rounded-sm inline-block flex-shrink-0 bg-amber-500/35" />
          фаза день
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-7 h-2 rounded-sm inline-block flex-shrink-0 bg-blue-500/35" />
          фаза ночь
        </span>
        {mode === 'edit' && (
          <span className={`ml-auto text-green-400/60`}>
            Клик по ячейке — ручная правка · Клик по полоске — редактор фаз · ✎ — назначить график
          </span>
        )}
      </div>
    </div>
  )
}
