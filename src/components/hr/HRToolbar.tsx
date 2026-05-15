import { SERVICE_META, EMPLOYEE_STATUS_CONFIG } from '@/types'
import type { EmployeeStatusType, Service } from '@/types'

const ALL_FILTER_STATUSES: EmployeeStatusType[] = [
  'Na_rabote', 'Otgul', 'Bolnichniy', 'Otpusk',
  'Komandirovka', 'Uchebniy_otpusk', 'Dekret', 'Mobilizovan',
  'SVO', 'Troydoustroyen_s_SVO', 'Voennie_sbory',
]

interface Props {
  view: 'cards' | 'table'
  onViewChange: (v: 'cards' | 'table') => void
  search: string
  onSearchChange: (v: string) => void
  filterService: string
  onFilterChange: (v: string) => void
  filterStatus: string
  onFilterStatusChange: (v: string) => void
  services: Service[]
  canAdmin: boolean
  onHire: () => void
}

const selectStyle = {
  background: 'rgba(0,0,0,0.25)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 10,
  padding: '7px 12px',
  color: 'rgba(255,255,255,0.75)',
  fontSize: 12,
  fontWeight: 500,
  outline: 'none',
  cursor: 'pointer',
  colorScheme: 'dark' as const,
}

export default function HRToolbar({
  view, onViewChange,
  search, onSearchChange,
  filterService, onFilterChange,
  filterStatus, onFilterStatusChange,
  services,
  canAdmin, onHire,
}: Props) {
  return (
    <div
      className="flex items-center gap-2 mb-4 flex-wrap rounded-2xl border px-3 py-2"
      style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}
    >
      {/* Segmented view toggle */}
      <div
        className="flex p-0.5 rounded-xl flex-shrink-0"
        style={{ background: 'rgba(0,0,0,0.30)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {(['cards', 'table'] as const).map(v => (
          <button
            key={v}
            onClick={() => onViewChange(v)}
            className="px-3 py-1.5 rounded-[9px] text-xs font-medium transition-all"
            style={
              view === v
                ? { background: 'rgba(255,255,255,0.10)', color: '#fff' }
                : { color: 'rgba(255,255,255,0.45)' }
            }
          >
            {v === 'cards' ? 'Карточки' : 'Таблица'}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative flex-1 min-w-[160px] max-w-xs">
        <svg
          viewBox="0 0 24 24"
          className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ width: 14, height: 14, stroke: 'rgba(255,255,255,0.30)', fill: 'none', strokeWidth: 2 }}
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Поиск по имени..."
          className="w-full pl-8 pr-3 py-1.5 text-xs text-white/75 placeholder-white/25 focus:outline-none focus:border-white/25 transition-colors"
          style={{
            background: 'rgba(0,0,0,0.25)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 10,
          }}
        />
      </div>

      {/* Service filter */}
      <select
        value={filterService}
        onChange={e => onFilterChange(e.target.value)}
        style={selectStyle}
      >
        <option value="">Все службы</option>
        {services.map(s => {
          const meta = SERVICE_META[s.service_id]
          return (
            <option key={s.service_id} value={s.service_id}>
              {meta ? `${meta.emoji} ${s.service_name}` : s.service_name}
            </option>
          )
        })}
      </select>

      {/* Status filter */}
      <select
        value={filterStatus}
        onChange={e => onFilterStatusChange(e.target.value)}
        style={selectStyle}
      >
        <option value="">Все статусы</option>
        {ALL_FILTER_STATUSES.map(s => (
          <option key={s} value={s}>{EMPLOYEE_STATUS_CONFIG[s].label}</option>
        ))}
      </select>

      <div className="flex-1" />

      {/* Hire button */}
      {canAdmin && (
        <button
          onClick={onHire}
          className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all"
          style={{
            background: '#F0A500',
            color: '#0D1117',
            border: '1px solid #F0A500',
          }}
        >
          + Нанять сотрудника
        </button>
      )}
    </div>
  )
}
