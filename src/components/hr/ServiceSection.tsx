'use client'
import type { EnrichedEmployee } from '@/types'
import { SERVICE_META, EMPLOYEE_STATUS_CONFIG } from '@/types'

interface Props {
  serviceId: string
  serviceName: string
  employees: EnrichedEmployee[]
  canEdit: boolean
  currentUserId: string
  onRefresh: () => void
}

// Stub card — will be replaced by EmployeeCard import in Plan 02
function EmployeeCardStub({ employee, canEdit }: { employee: EnrichedEmployee; canEdit: boolean }) {
  const cfg = EMPLOYEE_STATUS_CONFIG[employee.currentStatus]
  return (
    <div className="glass rounded-xl p-4 border border-transparent">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <div className="text-sm font-medium text-white/90">{employee.user.full_name}</div>
          {employee.user.position && (
            <div className="text-xs text-white/40 mt-0.5">{employee.user.position}</div>
          )}
        </div>
        <span
          className={`text-xs px-2 py-1 rounded-lg border shrink-0 ${cfg.bg}`}
          style={{ color: cfg.color }}
        >
          {cfg.label}
        </span>
      </div>
      {canEdit && (
        <div className="text-xs text-white/30 mt-2">Кнопки статусов — Plan 02</div>
      )}
    </div>
  )
}

export default function ServiceSection({
  serviceId,
  serviceName,
  employees,
  canEdit,
  currentUserId: _currentUserId,
  onRefresh: _onRefresh,
}: Props) {
  const meta = SERVICE_META[serviceId] ?? { emoji: '📋', color: '#ffffff', bg: 'bg-white/10' }

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{meta.emoji}</span>
        <h2 className="text-sm font-bold text-white/70 uppercase tracking-wider">{serviceName}</h2>
        <span className="text-xs text-white/30 ml-1">({employees.length} чел.)</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {employees.map(emp => (
          <EmployeeCardStub key={emp.user.user_id} employee={emp} canEdit={canEdit} />
        ))}
      </div>
    </div>
  )
}
