'use client'
import { useMemo, useState } from 'react'
import type { UserWithAssignment, Service } from '@/types'
import { resolveShiftStatus, getShiftForDate } from '@/lib/shifts'

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
  const [viewDate, setViewDate] = useState(() => new Date().toISOString().split('T')[0])
  const [filterService, setFilterService] = useState('')
  const [showOffDuty, setShowOffDuty] = useState(false)

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

  // Group on-duty workers by service, in SERVICE_EMOJI order
  const byService = services
    .map(svc => ({
      svc,
      workers: onDuty.filter(e => e.user.service_id === svc.service_id),
    }))
    .filter(g => g.workers.length > 0)

  const totalDay   = onDuty.filter(e => e.phase === 'day').length
  const totalNight = onDuty.filter(e => e.phase === 'night').length

  return (
    <div className="glass rounded-2xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isToday ? 'bg-green-400 animate-pulse' : 'bg-white/30'}`} />
          {isToday ? 'Кто на смене сейчас' : 'Состав смены на дату'}
        </h3>
        {isToday && (
          <span className="text-xs text-white/30">
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

      {/* Summary chips */}
      <div className="grid grid-cols-4 gap-2">
        <div className="glass rounded-xl p-3 border border-green-500/25">
          <div className="text-2xl font-bold text-green-400">{onDuty.length}</div>
          <div className="text-xs text-white/40 mt-0.5">На смене</div>
        </div>
        <div
          className="glass rounded-xl p-3 border border-white/10 cursor-pointer hover:border-white/20 transition-colors"
          onClick={() => setShowOffDuty(v => !v)}
          title="Нажмите, чтобы показать/скрыть список"
        >
          <div className="text-2xl font-bold text-white/30">{offToday.length}</div>
          <div className="text-xs text-white/30 mt-0.5">Выходной</div>
        </div>
        <div className="glass rounded-xl p-3 border border-amber-500/15 opacity-50" title="Будет доступно после migration 025">
          <div className="text-2xl font-bold text-amber-400/50">—</div>
          <div className="text-xs text-white/25 mt-0.5">Больничный</div>
        </div>
        <div className="glass rounded-xl p-3 border border-blue-500/15 opacity-50" title="Будет доступно после migration 025">
          <div className="text-2xl font-bold text-blue-400/50">—</div>
          <div className="text-xs text-white/25 mt-0.5">Отпуск</div>
        </div>
      </div>

      {/* On-duty: service card grid */}
      {onDuty.length === 0 ? (
        <div className="text-center text-white/20 py-4 text-sm">
          По выбранным фильтрам никто не работает в этот день
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {byService.map(({ svc, workers }) => {
              const dayCount   = workers.filter(e => e.phase === 'day').length
              const nightCount = workers.filter(e => e.phase === 'night').length
              return (
                <div key={svc.service_id} className="rounded-xl border border-white/10 bg-white/3 overflow-hidden">
                  {/* Card header */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-white/3 border-b border-white/5">
                    <span className="text-base">{SERVICE_EMOJI[svc.service_id] ?? '🏢'}</span>
                    <span className="text-xs font-semibold text-white/85 flex-1 truncate">{svc.service_name}</span>
                    <span className="text-[10px] font-bold bg-green-500/15 text-green-400 rounded-full px-1.5 py-0.5 shrink-0">
                      {workers.length}
                    </span>
                  </div>

                  {/* Worker rows */}
                  <div className="divide-y divide-white/[0.04]">
                    {workers.map(e => (
                      <div key={e.user.user_id} className="flex items-center gap-2 px-3 py-1.5">
                        {e.phase ? (
                          <span
                            className={`text-xs w-4 shrink-0 leading-none ${e.phase === 'day' ? 'text-amber-300' : 'text-blue-300'}`}
                            title={e.shiftStart && e.shiftEnd ? `${e.shiftStart}–${e.shiftEnd}` : undefined}
                          >
                            {e.phase === 'day' ? '☀' : '🌙'}
                          </span>
                        ) : (
                          <span className="w-4 shrink-0" />
                        )}
                        <span className="text-xs text-white/80 flex-1 truncate">{e.user.full_name}</span>
                        <span className="text-[10px] text-white/25 shrink-0 truncate max-w-[90px]">
                          {e.user.position ?? e.user.assignment?.schedule_code ?? ''}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Card footer: day/night split */}
                  {(dayCount > 0 || nightCount > 0) && (
                    <div className="px-3 py-1 border-t border-white/5 flex gap-3 bg-black/10">
                      {dayCount > 0 && (
                        <span className="text-[10px] text-amber-300/60">☀ {dayCount} дн.</span>
                      )}
                      {nightCount > 0 && (
                        <span className="text-[10px] text-blue-300/60">🌙 {nightCount} ноч.</span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Totals line */}
          <div className="flex items-center gap-4 pt-1 text-[10px] text-white/30">
            <span>
              Итого: <span className="text-white/60 font-semibold">{onDuty.length} чел.</span>
            </span>
            {totalDay > 0 && <span className="text-amber-300/50">☀ дн. {totalDay}</span>}
            {totalNight > 0 && <span className="text-blue-300/50">🌙 ноч. {totalNight}</span>}
            {onDuty.filter(e => !e.phase).length > 0 && (
              <span>{onDuty.filter(e => !e.phase).length} без фазы</span>
            )}
          </div>
        </>
      )}

      {/* Off-duty list (collapsible) */}
      {showOffDuty && offToday.length > 0 && (
        <div>
          <div className="text-xs text-white/20 mb-2">Выходной сегодня</div>
          <div className="flex flex-wrap gap-1.5">
            {offToday.map(e => (
              <div key={e.user.user_id} className="flex items-center gap-1.5 bg-white/3 rounded-lg px-2.5 py-1.5 border border-white/5">
                <span className="text-xs text-white/30">{e.user.full_name}</span>
                <span className="text-[10px] text-white/15">{e.user.assignment?.schedule_code}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer notes */}
      <div className="flex items-center gap-4 pt-1">
        {noSchedule.length > 0 && (
          <span className="text-[10px] text-white/20">{noSchedule.length} сотр. без графика</span>
        )}
        <span className="text-[10px] text-white/15 ml-auto">
          Больничный / отпуск — после migration 025
        </span>
      </div>
    </div>
  )
}
