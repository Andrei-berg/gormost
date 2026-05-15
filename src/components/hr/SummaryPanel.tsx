'use client'
import type { EnrichedEmployee, EmployeeStatusType, Service, UserWithAssignment } from '@/types'
import { SERVICE_META } from '@/types'
import { getCurrentShift, isWorkerOnDuty } from '@/lib/shifts'

const ABSENT_STATUSES: EmployeeStatusType[] = [
  'Otgul', 'Bolnichniy', 'Otpusk', 'Uvolen',
  'Komandirovka', 'Uchebniy_otpusk', 'Dekret',
  'Mobilizovan', 'SVO', 'Troydoustroyen_s_SVO',
]

interface Props {
  employees: EnrichedEmployee[]
  services: Service[]
  assignmentMap?: Map<string, UserWithAssignment['assignment']>
}

export default function SummaryPanel({ employees, services, assignmentMap }: Props) {
  const today = new Date().toISOString().split('T')[0]
  const shift = getCurrentShift()
  const todayDate = new Date(today)

  const total = employees.length
  const activeTotal = employees.filter(e => !ABSENT_STATUSES.includes(e.currentStatus)).length

  const onDutyTotal = assignmentMap
    ? employees.filter(e => {
        const assign = assignmentMap.get(e.user.user_id)
        if (!assign || !assign.schedule_code) return false
        return isWorkerOnDuty({ ...assign, schedule_code: assign.schedule_code }, todayDate)
      }).length
    : null

  const tiles = services
    .map(svc => {
      const svcEmps = employees.filter(e => e.user.service_id === svc.service_id)
      if (svcEmps.length === 0) return null
      const svcTotal = svcEmps.length
      const svcActive = svcEmps.filter(e => !ABSENT_STATUSES.includes(e.currentStatus)).length
      const svcOnDuty = assignmentMap
        ? svcEmps.filter(e => {
            const assign = assignmentMap.get(e.user.user_id)
            if (!assign || !assign.schedule_code) return false
            return isWorkerOnDuty({ ...assign, schedule_code: assign.schedule_code }, todayDate)
          }).length
        : null
      const meta = SERVICE_META[svc.service_id]
      return { svc, svcTotal, svcActive, svcOnDuty, meta }
    })
    .filter((t): t is NonNullable<typeof t> => t !== null)

  if (tiles.length === 0) return null

  const attendancePct = total > 0 ? ((activeTotal / total) * 100).toFixed(1) : '—'

  return (
    <div className="mb-5 space-y-3">
      {/* KPI strip — 4 cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total */}
        <div className="glass rounded-2xl p-4 border border-white/8">
          <div className="text-[10px] text-white/40 uppercase tracking-widest font-semibold mb-2">
            Всего сотрудников
          </div>
          <div className="font-mono text-[38px] font-bold text-white/90 leading-none tabular-nums">
            {total}
          </div>
          <div className="text-[10px] text-white/30 mt-2 font-mono flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-white/30" />
            штатная численность
          </div>
        </div>

        {/* On work */}
        <div
          className="rounded-2xl p-4 border"
          style={{
            background: 'linear-gradient(135deg,rgba(63,185,80,.10),rgba(255,255,255,.04))',
            borderColor: 'rgba(63,185,80,.30)',
          }}
        >
          <div className="text-[10px] text-white/40 uppercase tracking-widest font-semibold mb-2">
            На работе сегодня
          </div>
          <div className="font-mono text-[38px] font-bold leading-none tabular-nums" style={{ color: '#3FB950' }}>
            {activeTotal}
          </div>
          <div className="text-[10px] mt-2 font-mono flex items-center gap-1.5" style={{ color: 'rgba(63,185,80,.70)' }}>
            <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: '#3FB950' }} />
            {attendancePct}% присутствие
          </div>
        </div>

        {/* On duty */}
        {onDutyTotal !== null ? (
          <div
            className="rounded-2xl p-4 border"
            style={{
              background: 'linear-gradient(135deg,rgba(240,165,0,.10),rgba(255,255,255,.04))',
              borderColor: 'rgba(240,165,0,.30)',
            }}
          >
            <div className="text-[10px] text-white/40 uppercase tracking-widest font-semibold mb-2">
              На дежурстве (Смена {shift.shiftNumber})
            </div>
            <div className="font-mono text-[38px] font-bold leading-none tabular-nums" style={{ color: '#F0A500' }}>
              {onDutyTotal}
            </div>
            <div className="text-[10px] mt-2 font-mono flex items-center gap-1.5" style={{ color: 'rgba(240,165,0,.70)' }}>
              <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: '#F0A500' }} />
              текущая смена
            </div>
          </div>
        ) : (
          <div className="glass rounded-2xl p-4 border border-white/8 opacity-40">
            <div className="text-[10px] text-white/40 uppercase tracking-widest font-semibold mb-2">На дежурстве</div>
            <div className="font-mono text-[38px] font-bold text-white/30 leading-none">—</div>
          </div>
        )}

        {/* Services count */}
        <div
          className="rounded-2xl p-4 border"
          style={{
            background: 'linear-gradient(135deg,rgba(56,139,253,.10),rgba(255,255,255,.04))',
            borderColor: 'rgba(56,139,253,.30)',
          }}
        >
          <div className="text-[10px] text-white/40 uppercase tracking-widest font-semibold mb-2">
            Служб
          </div>
          <div className="font-mono text-[38px] font-bold leading-none tabular-nums" style={{ color: '#388BFD' }}>
            {tiles.length}
          </div>
          <div className="text-[10px] mt-2 font-mono text-white/30 flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: '#388BFD' }} />
            Лефортовский тоннель
          </div>
        </div>
      </div>

      {/* Service summary grid — 2×3 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {tiles.map(({ svc, svcTotal, svcActive, svcOnDuty, meta }) => {
          const accentColor = meta?.color ?? 'rgba(255,255,255,0.4)'
          return (
            <div
              key={svc.service_id}
              className="rounded-2xl p-4 border relative overflow-hidden"
              style={{ background: 'rgba(255,255,255,.03)', borderColor: 'rgba(255,255,255,.08)' }}
            >
              {/* Left color strip */}
              <div
                className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl"
                style={{ background: accentColor }}
              />
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{meta?.emoji ?? '📋'}</span>
                <span
                  className="text-[13px] font-semibold text-white flex-1 leading-tight truncate"
                  title={svc.service_name}
                >
                  {svc.service_name}
                </span>
                <span className="text-white/25 text-xs flex-shrink-0">›</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <div>
                  <div className="font-mono text-lg font-bold text-white/90 leading-none tabular-nums">
                    {svcTotal}
                  </div>
                  <div className="text-[9px] text-white/35 uppercase tracking-wider font-semibold mt-0.5">
                    Всего
                  </div>
                </div>
                <div>
                  <div className="font-mono text-lg font-bold leading-none tabular-nums" style={{ color: '#3FB950' }}>
                    {svcActive}
                  </div>
                  <div className="text-[9px] text-white/35 uppercase tracking-wider font-semibold mt-0.5">
                    На работе
                  </div>
                </div>
                {svcOnDuty !== null && (
                  <div>
                    <div className="font-mono text-lg font-bold leading-none tabular-nums" style={{ color: '#F0A500' }}>
                      {svcOnDuty}
                    </div>
                    <div className="text-[9px] text-white/35 uppercase tracking-wider font-semibold mt-0.5">
                      Дежурство
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
