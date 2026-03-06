'use client'
import type { EnrichedEmployee } from '@/types'
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
}

export default function ServiceSection({
  serviceId,
  serviceName,
  employees,
  canEdit,
  currentUserId,
  onRefresh,
  onNameClick,
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
          <EmployeeCard
            key={emp.user.user_id}
            employee={emp}
            canEdit={canEdit}
            currentUserId={currentUserId}
            onRefresh={onRefresh}
            onNameClick={onNameClick}
          />
        ))}
      </div>
    </div>
  )
}
