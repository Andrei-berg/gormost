'use client'
import type { EnrichedEmployee, UserWithAssignment } from '@/types'
import { SERVICE_META } from '@/types'
import EmployeeCard from './EmployeeCard'

interface Props {
  serviceId: string
  serviceName: string
  employees: EnrichedEmployee[]
  canEdit: boolean
  currentUserId: string
  onRefresh: () => void
  onNameClick: (userId: string) => void
  assignmentMap?: Map<string, UserWithAssignment['assignment']>
}

export default function ServiceSection({
  serviceId, serviceName, employees, canEdit, currentUserId, onRefresh, onNameClick, assignmentMap,
}: Props) {
  const meta = SERVICE_META[serviceId]
  const accentColor = meta?.color ?? 'rgba(255,255,255,0.4)'

  return (
    <div className="mb-6">
      {/* Section header */}
      <div className="flex items-center gap-2.5 mb-3 px-0.5">
        <span className="text-base">{meta?.emoji ?? '📋'}</span>
        <span
          className="text-[11px] font-bold uppercase tracking-widest"
          style={{ color: 'rgba(255,255,255,0.55)' }}
        >
          {serviceName}
        </span>
        <span
          className="font-mono text-[11px] px-2 py-px rounded-full border"
          style={{
            color: 'rgba(255,255,255,0.35)',
            background: 'rgba(255,255,255,0.04)',
            borderColor: 'rgba(255,255,255,0.08)',
          }}
        >
          {employees.length} чел.
        </span>
        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {employees.map(emp => (
          <EmployeeCard
            key={emp.user.user_id}
            employee={emp}
            canEdit={canEdit}
            currentUserId={currentUserId}
            onRefresh={onRefresh}
            onNameClick={onNameClick}
            assignment={assignmentMap?.get(emp.user.user_id) ?? null}
          />
        ))}
      </div>
    </div>
  )
}
