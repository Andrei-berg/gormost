'use client'
import { useMemo, useState } from 'react'
import type { UserWithAssignment, Service } from '@/types'
import { resolveShiftStatus, getShiftForDate } from '@/lib/shifts'
import { useTheme } from '@/lib/ThemeContext'
import ShiftRotationStrip from '@/components/ShiftRotationStrip'

// Absence types (sick/vacation) require migration 025 — currently only schedule-based
type DutyStatus = 'on_duty' | 'off_today' | 'no_schedule'

interface Entry {
  user: UserWithAssignment
  status: DutyStatus
  phase: 'day' | 'night' | null
  shiftStart: string | null
  shiftEnd: string | null
}

interface Props {
  users: UserWithAssignment[]
  services: Service[]
}

const SERVICE_EMOJI: Record<string, string> = {
  'SRV-ENG':  '⚡',
  'SRV-STR':  '🏗️',
  'SRV-FIRE': '🚒',
  'SRV-VENT': '💨',
  'SRV-CCTV': '📹',
}

export default function OnDutyMonitor({ users, services }: Props) {
  const { theme } = useTheme()
  const isLight = theme === 'light'

  const [viewDate, setViewDate] = useState(() => new Date().toISOString().split('T')[0])
  const [filterService, setFilterService] = useState('')
  const [showOffDuty, setShowOffDuty] = useState(false)
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set())

  const date = new Date(viewDate + 'T12:00:00')
  const shift = getShiftForDate(date)
  const isToday = viewDate === new Date().toISOString().split('T')[0]

  const entries = useMemo<Entry[]>(() => {
    return users.map(u => {
      if (!u.assignment || !u.assignment.schedule_code) {
        return { user: u, status: 'no_schedule', phase: null, shiftStart: null, shiftEnd: null }
      }
      const result = resolveShiftStatus(u.assignment as Parameters<typeof resolveShiftStatus>[0], date)
      return {
        user: u,
        status: result.working ? 'on_duty' : 'off_today',
        phase: result.phase,
        shiftStart: result.shift_start,
        shiftEnd: result.shift_end,
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, viewDate])

  const filtered = filterService
    ? entries.filter(e => e.user.service_id === filterService)
    : entries

  const onDuty     = filtered.filter(e => e.status === 'on_duty')
  const offToday   = filtered.filter(e => e.status === 'off_today')
  const noSchedule = filtered.filter(e => e.status === 'no_schedule')

  // Group on-duty workers by service
  const byService = services
    .map(svc => ({
      svc,
      workers: onDuty.filter(e => e.user.service_id === svc.service_id),
    }))
    .filter(g => g.workers.length > 0)

  const totalDay   = onDuty.filter(e => e.phase === 'day').length
  const totalNight = onDuty.filter(e => e.phase === 'night').length

  function toggleService(id: string) {
    setExpandedServices(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ── Theming tokens ─────────────────────────────────────────────────────────
  const wrapBdr  = isLight ? 'border-gray-200'         : 'border-white/10'
  const rowBg    = isLight ? 'hover:bg-gray-50'         : 'hover:bg-white/[0.03]'
  const rowBdr   = isLight ? 'border-gray-100'          : 'border-white/[0.06]'
  const svcTxt   = isLight ? 'text-gray-800'            : 'text-white/85'
  const mutedTxt = isLight ? 'text-gray-400'            : 'text-white/30'
  const dimTxt   = isLight ? 'text-gray-300'            : 'text-white/20'
  const expandBg = isLight ? 'bg-gray-50'               : 'bg-white/[0.02]'
  const workerTxt= isLight ? 'text-gray-700'            : 'text-white/75'
  const posTxt   = isLight ? 'text-gray-400'            : 'text-white/25'
  const chipBg   = isLight ? 'bg-white border-gray-200' : 'bg-white/3 border-white/[0.07]'
  const hdrTxt   = isLight ? 'text-gray-900'            : 'text-white'
  const shiftTxt = isLight ? 'text-gray-400'            : 'text-white/30'
  const cntGreen = isLight ? 'bg-green-100 text-green-700'  : 'bg-green-500/15 text-green-400'
  const cntGray  = isLight ? 'bg-gray-100 text-gray-500'    : 'bg-white/5 text-white/30'

  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <h3 className={`text-sm font-bold flex items-center gap-2 ${hdrTxt}`}>
          <span className={`w-2 h-2 rounded-full shrink-0 ${isToday ? 'bg-green-400 animate-pulse' : isLight ? 'bg-gray-300' : 'bg-white/30'}`} />
          {isToday ? 'Кто на смене сейчас' : 'Состав смены на дату'}
        </h3>
        {isToday && (
          <span className={`text-xs ${shiftTxt}`}>
            Смена №{shift.shiftNumber} · {shift.chiefName}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <input
            type="date"
            value={viewDate}
            onChange={e => setViewDate(e.target.value)}
            className="form-input"
          />
          <select
            value={filterService}
            onChange={e => setFilterService(e.target.value)}
            className="form-select"
          >
            <option value="">Все службы</option>
            {services.map(s => (
              <option key={s.service_id} value={s.service_id}>{s.service_name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 3-day shift rotation strip */}
      <ShiftRotationStrip referenceDate={date} />

      {/* Summary chips */}
      <div className="grid grid-cols-4 gap-2">
        <div className="glass rounded-xl p-2.5 border border-green-500/25">
          <div className={`text-xl font-bold ${isLight ? 'text-green-600' : 'text-green-400'}`}>{onDuty.length}</div>
          <div className={`text-[11px] ${mutedTxt} mt-0.5`}>На смене</div>
        </div>
        <div
          className={`glass rounded-xl p-2.5 border cursor-pointer transition-colors ${isLight ? 'border-gray-200 hover:border-gray-300' : 'border-white/10 hover:border-white/20'}`}
          onClick={() => setShowOffDuty(v => !v)}
          title="Нажмите, чтобы показать/скрыть"
        >
          <div className={`text-xl font-bold ${mutedTxt}`}>{offToday.length}</div>
          <div className={`text-[11px] ${dimTxt} mt-0.5`}>Выходной</div>
        </div>
        <div className={`glass rounded-xl p-2.5 border opacity-40 ${isLight ? 'border-gray-200' : 'border-amber-500/15'}`} title="Будет доступно после migration 025">
          <div className={`text-xl font-bold ${isLight ? 'text-amber-500' : 'text-amber-400/50'}`}>—</div>
          <div className={`text-[11px] ${dimTxt} mt-0.5`}>Больничный</div>
        </div>
        <div className={`glass rounded-xl p-2.5 border opacity-40 ${isLight ? 'border-gray-200' : 'border-blue-500/15'}`} title="Будет доступно после migration 025">
          <div className={`text-xl font-bold ${isLight ? 'text-blue-500' : 'text-blue-400/50'}`}>—</div>
          <div className={`text-[11px] ${dimTxt} mt-0.5`}>Отпуск</div>
        </div>
      </div>

      {/* Service table — variant C: inline expand */}
      {onDuty.length === 0 ? (
        <div className={`text-center py-4 text-sm ${dimTxt}`}>
          По выбранным фильтрам никто не работает в этот день
        </div>
      ) : (
        <div className={`rounded-xl border overflow-hidden ${wrapBdr}`}>
          {byService.map(({ svc, workers }, idx) => {
            const isExpanded = expandedServices.has(svc.service_id)
            const dayCount   = workers.filter(e => e.phase === 'day').length
            const nightCount = workers.filter(e => e.phase === 'night').length
            const isLast     = idx === byService.length - 1

            return (
              <div key={svc.service_id}>
                {/* Service row */}
                <button
                  onClick={() => toggleService(svc.service_id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${rowBg} ${!isLast || isExpanded ? `border-b ${rowBdr}` : ''}`}
                >
                  <span className="text-sm shrink-0">{SERVICE_EMOJI[svc.service_id] ?? '🏢'}</span>
                  <span className={`text-xs font-medium flex-1 ${svcTxt}`}>{svc.service_name}</span>

                  {/* Day/night breakdown */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {dayCount > 0 && (
                      <span className={`text-[10px] ${isLight ? 'text-amber-600' : 'text-amber-400/70'}`}>
                        ☀ {dayCount}
                      </span>
                    )}
                    {nightCount > 0 && (
                      <span className={`text-[10px] ${isLight ? 'text-blue-600' : 'text-blue-400/70'}`}>
                        🌙 {nightCount}
                      </span>
                    )}
                  </div>

                  {/* Total count */}
                  <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 shrink-0 ${workers.length > 0 ? cntGreen : cntGray}`}>
                    {workers.length}
                  </span>

                  {/* Expand arrow */}
                  <span className={`text-[10px] transition-transform shrink-0 ${mutedTxt} ${isExpanded ? 'rotate-180' : ''}`}>▾</span>
                </button>

                {/* Expanded worker list */}
                {isExpanded && (
                  <div className={`${expandBg} border-b ${rowBdr} last:border-0`}>
                    {workers.map((e, wi) => (
                      <div
                        key={e.user.user_id}
                        className={`flex items-center gap-2 px-4 py-1.5 ${wi < workers.length - 1 ? `border-b ${rowBdr}` : ''}`}
                      >
                        {e.phase ? (
                          <span
                            className={`text-xs w-4 shrink-0 leading-none ${e.phase === 'day' ? (isLight ? 'text-amber-500' : 'text-amber-300') : (isLight ? 'text-blue-500' : 'text-blue-300')}`}
                            title={e.shiftStart && e.shiftEnd ? `${e.shiftStart}–${e.shiftEnd}` : undefined}
                          >
                            {e.phase === 'day' ? '☀' : '🌙'}
                          </span>
                        ) : (
                          <span className="w-4 shrink-0" />
                        )}
                        <span className={`text-xs flex-1 ${workerTxt}`}>{e.user.full_name}</span>
                        <span className={`text-[10px] shrink-0 truncate max-w-[100px] ${posTxt}`}>
                          {e.user.position ?? e.user.assignment?.schedule_code ?? ''}
                        </span>
                        {e.shiftStart && e.shiftEnd && (
                          <span className={`text-[10px] shrink-0 ${dimTxt}`}>{e.shiftStart}–{e.shiftEnd}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {/* Totals footer row */}
          <div className={`flex items-center gap-4 px-3 py-2 ${isLight ? 'bg-gray-50' : 'bg-white/[0.02]'}`}>
            <span className={`text-[10px] ${mutedTxt}`}>
              Итого: <span className={`font-semibold ${isLight ? 'text-gray-600' : 'text-white/60'}`}>{onDuty.length} чел.</span>
            </span>
            {totalDay > 0 && <span className={`text-[10px] ${isLight ? 'text-amber-600/70' : 'text-amber-300/50'}`}>☀ дн. {totalDay}</span>}
            {totalNight > 0 && <span className={`text-[10px] ${isLight ? 'text-blue-600/70' : 'text-blue-300/50'}`}>🌙 ноч. {totalNight}</span>}
            {onDuty.filter(e => !e.phase).length > 0 && (
              <span className={`text-[10px] ${dimTxt}`}>{onDuty.filter(e => !e.phase).length} без фазы</span>
            )}
          </div>
        </div>
      )}

      {/* Off-duty list (collapsible) */}
      {showOffDuty && offToday.length > 0 && (
        <div>
          <div className={`text-xs mb-2 ${dimTxt}`}>Выходной сегодня</div>
          <div className="flex flex-wrap gap-1.5">
            {offToday.map(e => (
              <div key={e.user.user_id} className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 border ${chipBg}`}>
                <span className={`text-xs ${mutedTxt}`}>{e.user.full_name}</span>
                <span className={`text-[10px] ${dimTxt}`}>{e.user.assignment?.schedule_code}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer notes */}
      {(noSchedule.length > 0) && (
        <div className={`text-[10px] ${dimTxt}`}>{noSchedule.length} сотр. без графика</div>
      )}
    </div>
  )
}
