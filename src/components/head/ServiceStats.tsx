import type { Request, User } from '@/types'
import { STATUS_CONFIG } from '@/types'

interface Props {
  requests: Request[]
  users: User[]
  assignments: Record<string, string[]>
}

export default function ServiceStats({ requests, users, assignments }: Props) {
  const total = requests.length
  const approved = requests.filter(r => r.approved_by_head).length
  const inProgress = requests.filter(r => r.status === 'IN_PROGRESS').length
  const done = requests.filter(r => r.status === 'DONE').length
  const unapproved = requests.filter(r => !r.approved_by_head).length

  // People stats
  const assignedUserIds = new Set(Object.values(assignments).flat())
  const assignedCount = assignedUserIds.size
  const freeCount = users.length - assignedCount

  return (
    <div className="space-y-3 mb-4">
      {/* Requests KPI */}
      <div className="grid grid-cols-4 gap-3">
        <div className="glass rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-white font-mono">{total}</div>
          <div className="text-xs text-white/40">Заявок</div>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-amber-400 font-mono">{unapproved}</div>
          <div className="text-xs text-white/40">Не согл.</div>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-violet-400 font-mono">{inProgress}</div>
          <div className="text-xs text-white/40">В работе</div>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-green-400 font-mono">{done}</div>
          <div className="text-xs text-white/40">Выполнено</div>
        </div>
      </div>

      {/* People KPI */}
      {users.length > 0 && (
        <div className="glass rounded-xl p-4">
          <div className="text-xs text-white/40 uppercase tracking-wider mb-3">Личный состав службы</div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="text-xl font-bold text-white font-mono">{users.length}</div>
              <div className="text-xs text-white/40">Всего</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-blue-400 font-mono">{assignedCount}</div>
              <div className="text-xs text-white/40">Назначено</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-green-400 font-mono">{freeCount}</div>
              <div className="text-xs text-white/40">Свободно</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
