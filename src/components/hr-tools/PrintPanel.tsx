'use client'
import { useState, useMemo } from 'react'
import type { UserWithAssignment, ShiftPhase, Schedule, Service, AuthSession } from '@/types'
import { resolveShiftStatus } from '@/lib/shifts'
import { printRoster, printTabel, printCoverage } from './printForms'

type PrintFormType = 'roster' | 'tabel' | 'coverage'

interface Props {
  users: UserWithAssignment[]
  phases: ShiftPhase[]
  period: { start: string; end: string }
  services: Service[]
  schedules: Schedule[]
  session: AuthSession
}

const FORM_OPTIONS: { key: PrintFormType; label: string; desc: string }[] = [
  { key: 'roster',   label: 'Список сотрудников',            desc: 'ФИО, должность, график, смена' },
  { key: 'tabel',    label: 'Табель рабочего времени',        desc: 'Сетка сотрудник × дата (Д/Н/–)' },
  { key: 'coverage', label: 'Отчёт о покрытии',              desc: 'Кол-во сотрудников по дням' },
]

// Roster column options
const ROSTER_COLS = [
  { key: 'num',      label: '№'          },
  { key: 'name',     label: 'ФИО'        },
  { key: 'position', label: 'Должность'  },
  { key: 'schedule', label: 'График'     },
  { key: 'shift',    label: 'Смена'      },
  { key: 'phone',    label: 'Телефон'    },
  { key: 'status',   label: 'Сегодня'   },
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

  // Derive service name from filtered users (reflects active filter, not just session)
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

  // Shift breakdown
  const shiftBreakdown = useMemo(() => {
    const map = new Map<string, number>()
    users.forEach(u => {
      const key = u.assignment?.shift_num ? `Смена ${u.assignment.shift_num}` : '—'
      map.set(key, (map.get(key) ?? 0) + 1)
    })
    return [...map.entries()].sort()
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

    const win = window.open('', '_blank')
    if (!win) { alert('Разрешите всплывающие окна в браузере'); return }
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 400)
  }

  const inp = 'bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white/70 focus:outline-none focus:border-blue-500/50 w-full'

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
        <div className="absolute top-full right-0 mt-2 z-30 w-[440px] bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-white">🖨 Настройка печати</span>
            <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white text-sm">✕</button>
          </div>

          {/* Context info block */}
          <div className="bg-gray-800 rounded-xl p-3 space-y-2 border border-gray-700">
            <div className="text-[10px] text-white/50 uppercase tracking-wider mb-1">Что будет напечатано</div>
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

          {/* Form type selector */}
          <div className="space-y-1.5">
            <div className="text-[10px] text-white/50 uppercase tracking-wider">Тип документа</div>
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
                  <div className="text-[10px] text-white/40 mt-0.5">{f.desc}</div>
                </div>
              </label>
            ))}
          </div>

          {/* Common settings */}
          <div className="space-y-2">
            <div className="text-[10px] text-white/50 uppercase tracking-wider">Шапка документа</div>
            <input
              value={orgName}
              onChange={e => setOrgName(e.target.value)}
              placeholder="Организация"
              className={inp}
            />
            {svcName && (
              <div className="text-xs text-white/50 px-1 flex items-center gap-1">
                <span className="text-white/30">Служба:</span> {svcName}
              </div>
            )}
          </div>

          {/* Roster-specific: column picker */}
          {formType === 'roster' && (
            <div className="space-y-2">
              <div className="text-[10px] text-white/50 uppercase tracking-wider">Колонки в списке</div>
              <div className="grid grid-cols-2 gap-1">
                {ROSTER_COLS.map(c => (
                  <label key={c.key} className="flex items-center gap-2 cursor-pointer text-xs text-white/60 hover:text-white/80">
                    <input
                      type="checkbox"
                      checked={rosterCols.has(c.key)}
                      onChange={() => toggleRosterCol(c.key)}
                      className="accent-blue-500"
                    />
                    {c.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Footer options */}
          <div className="space-y-1.5">
            <div className="text-[10px] text-white/50 uppercase tracking-wider">Нижний колонтитул</div>
            <label className="flex items-center gap-2 cursor-pointer text-xs text-white/60">
              <input type="checkbox" checked={showSig} onChange={e => setShowSig(e.target.checked)} className="accent-blue-500" />
              Строки для подписей
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-xs text-white/60">
              <input type="checkbox" checked={showDate} onChange={e => setShowDate(e.target.checked)} className="accent-blue-500" />
              Дата печати
            </label>
          </div>

          {/* Print button */}
          <button
            onClick={handlePrint}
            disabled={users.length === 0}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors"
          >
            🖨 Распечатать ({users.length} сотр.)
          </button>
        </div>
      )}
    </div>
  )
}
