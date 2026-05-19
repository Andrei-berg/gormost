'use client'
import { useState, useMemo, useEffect } from 'react'
import type { UserWithAssignment, ShiftPhase, Schedule, Service, AuthSession, EnrichedEmployee } from '@/types'
import { resolveShiftStatus } from '@/lib/shifts'
import { fetchAllCurrentStatuses } from '@/lib/api-client'
import { printRoster, printTabel, printCoverage, printStroevaiya } from './printForms'

type PrintFormType = 'roster' | 'tabel' | 'coverage' | 'stroevaya'

interface Props {
  users: UserWithAssignment[]
  phases: ShiftPhase[]
  period: { start: string; end: string }
  services: Service[]
  schedules: Schedule[]
  session: AuthSession
}

const FORM_OPTIONS: { key: PrintFormType; label: string; desc: string }[] = [
  { key: 'roster',    label: 'Список сотрудников',   desc: 'ФИО, должность, график, смена' },
  { key: 'tabel',     label: 'Табель рабочего времени', desc: 'Сетка сотрудник × дата (Д/Н/–)' },
  { key: 'coverage',  label: 'Отчёт о покрытии',     desc: 'Кол-во сотрудников по дням' },
  { key: 'stroevaya', label: 'Строевая записка',      desc: 'Сводная таблица по участкам: штат / статусы / смены' },
]

// Roster column options
const ROSTER_COLS = [
  { key: 'num',      label: '№'         },
  { key: 'name',     label: 'ФИО'       },
  { key: 'position', label: 'Должность' },
  { key: 'schedule', label: 'График'    },
  { key: 'shift',    label: 'Смена'     },
  { key: 'phone',    label: 'Телефон'   },
  { key: 'status',   label: 'Сегодня'  },
]

export default function PrintPanel({ users, phases, period, services, schedules, session }: Props) {
  const [open, setOpen]           = useState(false)
  const [formType, setFormType]   = useState<PrintFormType>('roster')
  const [orgName, setOrgName]     = useState('ГБУ "Горомст"')
  const [showSig, setShowSig]     = useState(true)
  const [showDate, setShowDate]   = useState(true)
  const [rosterCols, setRosterCols] = useState<Set<string>>(
    new Set(['num', 'name', 'position', 'schedule', 'shift'])
  )

  // Строевая записка — options
  const todayStr = new Date().toISOString().split('T')[0]
  const [stroDate, setStroDate]               = useState(todayStr)
  const [stroItrBreakdown, setStroItrBreakdown] = useState(true)
  const [stroParkovschiki, setStroParkovschiki] = useState(true)
  const [stroSvoSplit, setStroSvoSplit]         = useState(false)
  const [stroTrudSvo, setStroTrudSvo]           = useState(true)
  const [stroUvolenySvo, setStroUvolenySvo]     = useState(false)
  const [stroShiftTotals, setStroShiftTotals]   = useState(true)

  // Enriched users (with today's statuses) — fetched lazily for строевая
  const [enrichedUsers, setEnrichedUsers]   = useState<EnrichedEmployee[] | null>(null)
  const [loadingEnriched, setLoadingEnriched] = useState(false)

  useEffect(() => {
    if (formType === 'stroevaya' && !enrichedUsers && !loadingEnriched) {
      setLoadingEnriched(true)
      fetchAllCurrentStatuses().then(eu => {
        setEnrichedUsers(eu)
        setLoadingEnriched(false)
      })
    }
  }, [formType, enrichedUsers, loadingEnriched])

  // Derive service name from filtered users
  const svcName = useMemo(() => {
    const ids = [...new Set(users.map(u => u.service_id).filter(Boolean) as string[])]
    if (ids.length === 1) return services.find(s => s.service_id === ids[0])?.service_name ?? ''
    if (ids.length > 1)   return `${ids.length} служб`
    return ''
  }, [users, services])

  // Schedule breakdown for info block
  const scheduleBreakdown = useMemo(() => {
    const map = new Map<string, number>()
    users.forEach(u => {
      const code = u.assignment?.schedule_code ?? 'Без графика'
      map.set(code, (map.get(code) ?? 0) + 1)
    })
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [users])

  const toggleRosterCol = (key: string) => {
    setRosterCols(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handlePrint = () => {
    const opts = {
      orgName,
      serviceName: svcName,
      period,
      showSignatureLines: showSig,
      showDate,
      rosterCols: [...rosterCols],
    }

    let html = ''
    if (formType === 'roster')   html = printRoster(users, phases, opts)
    if (formType === 'tabel')    html = printTabel(users, phases, period, opts)
    if (formType === 'coverage') html = printCoverage(users, phases, period, schedules, opts)
    if (formType === 'stroevaya') {
      if (!enrichedUsers) { alert('Данные ещё загружаются, попробуйте через секунду'); return }
      html = printStroevaiya(enrichedUsers, users, phases, services, {
        orgName,
        dateStr: stroDate,
        showItrBreakdown: stroItrBreakdown,
        showParkovschiki: stroParkovschiki,
        showSvoSplit:     stroSvoSplit,
        showTrudSvo:      stroTrudSvo,
        showUvolenySvo:   stroUvolenySvo,
        showShiftTotals:  stroShiftTotals,
        showSignatureLines: showSig,
        showDate,
      })
    }

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const win = window.open(url, '_blank')
    if (!win) { URL.revokeObjectURL(url); alert('Разрешите всплывающие окна в браузере'); return }
    win.focus()
    setTimeout(() => { win.print(); setTimeout(() => URL.revokeObjectURL(url), 60000) }, 800)
  }

  const inp = 'bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white/70 focus:outline-none focus:border-blue-500/50 w-full'
  const chk = 'accent-blue-500'

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
          open
            ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
            : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
        }`}
      >
        🖨 Печать
        <span className="text-[10px] opacity-60">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 z-30 w-[440px] rounded-2xl shadow-2xl p-4 space-y-4 border border-white/15" style={{ background: 'rgba(15, 20, 40, 0.97)', backdropFilter: 'blur(20px)' }}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-white">🖨 Настройка печати</span>
            <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white text-sm">✕</button>
          </div>

          {/* Context info block */}
          {formType !== 'stroevaya' && (
            <div className="rounded-xl p-3 space-y-2 border border-white/15" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div className="text-[10px] text-white/80 uppercase tracking-wider mb-1">Что будет напечатано</div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30">
                  👥 {users.length} сотр.
                </span>
                {svcName && (
                  <span className="text-xs bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full border border-violet-500/30">
                    🏢 {svcName}
                  </span>
                )}
                <span className="text-xs bg-white/5 text-white/50 px-2 py-0.5 rounded-full border border-white/10">
                  📅 {period.start} — {period.end}
                </span>
              </div>
              {scheduleBreakdown.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {scheduleBreakdown.map(([code, cnt]) => (
                    <span key={code} className="text-[10px] bg-white/5 text-white/40 px-1.5 py-0.5 rounded">
                      {code}: {cnt}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Form type selector */}
          <div className="space-y-1.5">
            <div className="text-[10px] text-white/80 uppercase tracking-wider">Тип документа</div>
            {FORM_OPTIONS.map(f => (
              <label key={f.key} className={`flex items-start gap-3 p-2.5 rounded-xl cursor-pointer border transition-colors ${
                formType === f.key
                  ? 'border-blue-500/50 bg-blue-500/15'
                  : 'border-gray-700 hover:border-gray-600 bg-gray-800/60'
              }`}>
                <input
                  type="radio"
                  name="formType"
                  value={f.key}
                  checked={formType === f.key}
                  onChange={() => setFormType(f.key)}
                  className="mt-0.5 accent-blue-500"
                />
                <div>
                  <div className="text-xs font-medium text-white/80">{f.label}</div>
                  <div className="text-[10px] text-white/60 mt-0.5">{f.desc}</div>
                </div>
              </label>
            ))}
          </div>

          {/* Common settings */}
          <div className="space-y-2">
            <div className="text-[10px] text-white/80 uppercase tracking-wider">Шапка документа</div>
            <input
              value={orgName}
              onChange={e => setOrgName(e.target.value)}
              placeholder="Организация"
              className={inp}
            />
          </div>

          {/* Roster-specific: column picker */}
          {formType === 'roster' && (
            <div className="space-y-2">
              <div className="text-[10px] text-white/80 uppercase tracking-wider">Колонки в списке</div>
              <div className="grid grid-cols-2 gap-1">
                {ROSTER_COLS.map(c => (
                  <label key={c.key} className="flex items-center gap-2 cursor-pointer text-xs text-white/80 hover:text-white">
                    <input type="checkbox" checked={rosterCols.has(c.key)} onChange={() => toggleRosterCol(c.key)} className={chk} />
                    {c.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Строевая записка settings */}
          {formType === 'stroevaya' && (
            <div className="space-y-3">
              <div className="text-[10px] text-white/80 uppercase tracking-wider">Настройки строевой</div>

              {/* Date */}
              <div>
                <div className="text-[10px] text-white/50 mb-1">Дата строевой записки</div>
                <input type="date" value={stroDate} onChange={e => setStroDate(e.target.value)} className={inp} />
              </div>

              {/* Status of enriched data */}
              {loadingEnriched && (
                <div className="text-[10px] text-amber-400/80">Загрузка актуальных статусов...</div>
              )}
              {enrichedUsers && !loadingEnriched && (
                <div className="text-[10px] text-teal-400/80">✓ Статусы загружены ({enrichedUsers.length} чел.)</div>
              )}

              {/* Column toggles */}
              <div className="text-[10px] text-white/50 mb-1">Колонки</div>
              <div className="space-y-1.5">
                {[
                  { state: stroItrBreakdown, set: setStroItrBreakdown, label: 'Разбивка ИТР / Рабочие' },
                  { state: stroParkovschiki,  set: setStroParkovschiki,  label: 'Парковщики / Водители' },
                  { state: stroSvoSplit,      set: setStroSvoSplit,      label: 'СВО: Москва / Регионы отдельно' },
                  { state: stroTrudSvo,       set: setStroTrudSvo,       label: 'Труд.СВО (вернулся с СВО)' },
                  { state: stroUvolenySvo,    set: setStroUvolenySvo,    label: 'Уволены СВО' },
                  { state: stroShiftTotals,   set: setStroShiftTotals,   label: 'ИТОГО День / Ночь' },
                ].map(({ state, set, label }) => (
                  <label key={label} className="flex items-center gap-2 cursor-pointer text-xs text-white/70 hover:text-white">
                    <input type="checkbox" checked={state} onChange={e => set(e.target.checked)} className={chk} />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Footer options */}
          <div className="space-y-1.5">
            <div className="text-[10px] text-white/80 uppercase tracking-wider">Нижний колонтитул</div>
            <label className="flex items-center gap-2 cursor-pointer text-xs text-white/60">
              <input type="checkbox" checked={showSig} onChange={e => setShowSig(e.target.checked)} className={chk} />
              Строки для подписей
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-xs text-white/60">
              <input type="checkbox" checked={showDate} onChange={e => setShowDate(e.target.checked)} className={chk} />
              Дата печати
            </label>
          </div>

          {/* Print button */}
          <button
            onClick={handlePrint}
            disabled={formType !== 'stroevaya' ? users.length === 0 : loadingEnriched}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors"
          >
            {formType === 'stroevaya'
              ? loadingEnriched ? 'Загрузка...' : '🖨 Строевая записка'
              : `🖨 Распечатать (${users.length} сотр.)`}
          </button>
        </div>
      )}
    </div>
  )
}
