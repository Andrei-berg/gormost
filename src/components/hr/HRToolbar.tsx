import { SERVICE_META } from '@/types'
import type { Service } from '@/types'

interface Props {
  view: 'cards' | 'table'
  onViewChange: (v: 'cards' | 'table') => void
  search: string
  onSearchChange: (v: string) => void
  filterService: string          // '' means Все службы
  onFilterChange: (v: string) => void
  services: Service[]
}

const btnBase = 'px-3 py-1.5 rounded-lg text-sm font-medium transition-all border'
const btnActive = 'bg-teal-600/30 text-teal-300 border-teal-500/30'
const btnIdle = 'bg-white/5 text-white/50 hover:bg-white/10 border-white/10'

export default function HRToolbar({
  view,
  onViewChange,
  search,
  onSearchChange,
  filterService,
  onFilterChange,
  services,
}: Props) {
  return (
    <div className="flex items-center gap-2 mb-4 flex-wrap">
      {/* View toggle */}
      <button
        onClick={() => onViewChange('cards')}
        className={`${btnBase} ${view === 'cards' ? btnActive : btnIdle}`}
      >
        Карточки
      </button>
      <button
        onClick={() => onViewChange('table')}
        className={`${btnBase} ${view === 'table' ? btnActive : btnIdle}`}
      >
        Таблица
      </button>

      {/* Divider */}
      <div className="w-px h-5 bg-white/10 mx-1" />

      {/* Search input */}
      <input
        type="text"
        value={search}
        onChange={e => onSearchChange(e.target.value)}
        placeholder="Поиск по имени..."
        className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white/70 placeholder-white/30 focus:outline-none focus:border-white/30 w-48"
      />

      {/* Service filter */}
      <select
        value={filterService}
        onChange={e => onFilterChange(e.target.value)}
        className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white/70 focus:outline-none"
        style={{ colorScheme: 'dark' }}
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
    </div>
  )
}
