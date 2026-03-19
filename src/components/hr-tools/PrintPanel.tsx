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

  const svcName = useMemo(() => {
    if (session.service_id) {
      return services.find(s => s.service_id === session.service_id)?.service_name ?? ''
    }
    return ''
  }, [services, session.service_id])

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
        <div className="absolute top-full right-0 mt-2 z-30 w-[420px] glass rounded-2xl border border-white/10 shadow-2xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-white/80">Настройка печати</span>
            <button onClick={() => setOpen(false)} className="text-white/30 hover:text-white/60 text-sm">✕</button>
          </div>

          {/* Form type selector */}
          <div className="space-y-1.5">
            <div className="text-[10px] text-white/40 uppercase tracking-wider">Тип документа</div>
            {FORM_OPTIONS.map(f => (
              <label key={f.key} className={`flex items-start gap-3 p-2.5 rounded-xl cursor-pointer border transition-colors ${
                formType === f.key
                  ? 'border-blue-500/40 bg-blue-500/10'
                  : 'border-white/5 hover:border-white/15 bg-white/3'
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
            <div className="text-[10px] text-white/40 uppercase tracking-wider">Шапка документа</div>
            <input
              value={orgName}
              onChange={e => setOrgName(e.target.value)}
              placeholder="Организация"
              className={inp}
            />
            {svcName && (
              <div className="text-xs text-white/30 px-1">Служба: {svcName}</div>
            )}
          </div>

          {/* Roster-specific: column picker */}
          {formType === 'roster' && (
            <div className="space-y-2">
              <div className="text-[10px] text-white/40 uppercase tracking-wider">Колонки в списке</div>
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
            <div className="text-[10px] text-white/40 uppercase tracking-wider">Нижний колонтитул</div>
            <label className="flex items-center gap-2 cursor-pointer text-xs text-white/60">
              <input type="checkbox" checked={showSig} onChange={e => setShowSig(e.target.checked)} className="accent-blue-500" />
              Строки для подписей
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-xs text-white/60">
              <input type="checkbox" checked={showDate} onChange={e => setShowDate(e.target.checked)} className="accent-blue-500" />
              Дата печати
            </label>
          </div>

          {/* Info */}
          <div className="text-[10px] text-white/25 border-t border-white/5 pt-3">
            Период: {period.start} — {period.end} · {users.length} сотрудников
          </div>

          {/* Print button */}
          <button
            onClick={handlePrint}
            className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
          >
            🖨 Распечатать
          </button>
        </div>
      )}
    </div>
  )
}
