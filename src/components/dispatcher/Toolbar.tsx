import type { Service } from '@/types'

interface Props {
  view: 'kanban' | 'table'
  onViewChange: (v: 'kanban' | 'table') => void
  filterService: string
  onFilterChange: (v: string) => void
  services: Service[]
  onRefresh: () => void
  onNewRequest: () => void
}

export default function Toolbar({ view, onViewChange, filterService, onFilterChange, services, onRefresh, onNewRequest }: Props) {
  const btnBase = 'px-3 py-1.5 rounded-lg text-sm font-medium transition-all'
  const btnActive = 'bg-blue-600 text-white'
  const btnIdle = 'bg-white/5 text-white/50 hover:bg-white/10'

  return (
    <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <button onClick={() => onViewChange('kanban')} className={`${btnBase} ${view === 'kanban' ? btnActive : btnIdle}`}>
          Канбан
        </button>
        <button onClick={() => onViewChange('table')} className={`${btnBase} ${view === 'table' ? btnActive : btnIdle}`}>
          Таблица
        </button>
        <select
          value={filterService}
          onChange={e => onFilterChange(e.target.value)}
          className="form-select text-sm px-3 py-1.5"
        >
          <option value="">Все службы</option>
          {services.map(s => <option key={s.service_id} value={s.service_id}>{s.service_name}</option>)}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onRefresh} className={`${btnBase} ${btnIdle}`}>
          ↻ Обновить
        </button>
        <button onClick={onNewRequest} className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium">
          + Новая заявка
        </button>
      </div>
    </div>
  )
}
