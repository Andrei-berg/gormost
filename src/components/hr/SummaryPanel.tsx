'use client'
import type { EnrichedEmployee, EmployeeStatusType, Service } from '@/types'
import { SERVICE_META } from '@/types'

// Statuses that mean the employee is NOT physically at work
const ABSENT_STATUSES: EmployeeStatusType[] = ['Otgul', 'Bolnichniy', 'Otpusk', 'Uvolen']

interface Props {
  employees: EnrichedEmployee[]
  services: Service[]   // needed for service_name display (SERVICE_META has no name)
}

export default function SummaryPanel({ employees, services }: Props) {
  // Build tiles only for services that have at least one employee in the visible set
  const tiles = services
    .map(svc => {
      const svcEmployees = employees.filter(e => e.user.service_id === svc.service_id)
      if (svcEmployees.length === 0) return null
      const total = svcEmployees.length
      const working = svcEmployees.filter(e => !ABSENT_STATUSES.includes(e.currentStatus)).length
      return { svc, total, working }
    })
    .filter((t): t is NonNullable<typeof t> => t !== null)

  if (tiles.length === 0) return null

  return (
    <div className="mb-6">
      <div className="text-xs text-white/40 uppercase tracking-widest mb-3">Сводка на сегодня</div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {tiles.map(({ svc, total, working }) => (
          <div key={svc.service_id} className="glass rounded-xl p-3 text-center min-w-[100px] shrink-0">
            <div className="text-xl mb-1">{SERVICE_META[svc.service_id]?.emoji ?? '📋'}</div>
            <div className="text-xs text-white/60 mb-2 truncate">{svc.service_name}</div>
            <div className="text-lg font-bold font-mono text-green-400">{working}</div>
            <div className="text-[10px] text-white/40">На работе</div>
            <div className="text-[10px] text-white/30">из {total}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
