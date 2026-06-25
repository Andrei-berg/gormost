'use client'
// DayPlanView — read-only mirror of the journal's "План дня" for one date.
// Used by boss (all services, all rows) and by dispatcher / zamporab / head
// (filtered to published rows; the last two to their own service).
import { useCallback, useMemo, useState } from 'react'
import { fetchDailyPlanItems, fetchJournalObjects } from '@/lib/api-client'
import type { DailyPlanItem, JournalObject } from '@/types'
import { useLoadData } from '@/lib/useLoadData'
import { PanelLoader, DataErrorBanner } from '@/components/DataState'
import { aggregateJournal } from '@/lib/journalStats'
import { SERVICES, PERIOD_META, FLAG_META, isoOf } from '@/components/journal/data'
import VehicleNumberBadge from '@/components/VehicleNumberBadge'
import { WorkerIcon, TruckIcon } from '@/components/RoleIcons'
import EmptyState from '@/components/EmptyState'

const SVC = new Map(SERVICES.map(s => [s.id, s]))
const AMBER = '#F0A500'

interface Props {
  // Restrict to one service (zamporab / head); undefined = all services (boss, dispatcher).
  serviceId?: string
  // Only show rows the journal operator has published (dispatcher / zamporab / head).
  onlyPublished?: boolean
  title?: string
}

export default function DayPlanView({ serviceId, onlyPublished = false, title = '📒 План дня · из журнала' }: Props) {
  const [date, setDate] = useState(isoOf(new Date()))
  const [allItems, setAllItems] = useState<DailyPlanItem[]>([])
  const [objects, setObjects] = useState<JournalObject[]>([])

  const loadData = useCallback(async () => {
    const [rows, objs] = await Promise.all([fetchDailyPlanItems(date), fetchJournalObjects()])
    setAllItems(rows)
    setObjects(objs)
  }, [date])
  const { loading, error, reload } = useLoadData(loadData)

  const items = useMemo(
    () => allItems.filter(i =>
      (!serviceId || i.service_id === serviceId) &&
      (!onlyPublished || i.published === true),
    ),
    [allItems, serviceId, onlyPublished],
  )

  const stats = useMemo(() => aggregateJournal(items), [items])
  const objName = useMemo(() => new Map(objects.map(o => [o.id, o.name])), [objects])

  const byObject = useMemo(() => {
    const m = new Map<string, DailyPlanItem[]>()
    for (const it of items) {
      const list = m.get(it.object_id) ?? []
      list.push(it)
      m.set(it.object_id, list)
    }
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length)
  }, [items])

  const standing = items.filter(i => i.item_flag)

  const kpis = [
    { label: 'пунктов плана', value: stats.totalItems, color: '#fff' },
    { label: 'объектов',      value: stats.objects, color: '#fff' },
    { label: 'служб',         value: stats.services, color: '#fff' },
    { label: 'людей',         value: stats.people, color: '#388BFD' },
    { label: 'техники',       value: stats.vehiclesCount, color: '#3FB950' },
    { label: 'нарядов п.15',  value: stats.permitsRequired, color: stats.permitsRequired > 0 ? AMBER : '#fff' },
  ]

  const emptyMsg = onlyPublished
    ? 'На эту дату опубликованных планов нет'
    : 'На эту дату планов в журнале нет'

  return (
    <div className="space-y-3">
      {/* Title + date */}
      <div className="glass rounded-xl px-4 py-3 flex flex-wrap items-center gap-3">
        <span className="text-sm font-bold text-white">{title}</span>
        {onlyPublished && <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/40 uppercase tracking-wider">только чтение</span>}
        <label className="inline-flex items-center gap-2 ml-auto text-xs text-white/50">
          дата
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white text-sm outline-none" />
        </label>
        <div className="inline-flex items-center gap-2 text-[11px] font-mono text-white/50">
          {(['DAY', 'NIGHT', 'AROUND'] as const).map(p => (
            <span key={p} title={PERIOD_META[p].label} style={{ color: PERIOD_META[p].color }}>
              {PERIOD_META[p].em} {stats.byShift[p]}
            </span>
          ))}
        </div>
        <button onClick={reload} className="px-2 py-1 rounded-lg text-xs text-white/40 hover:text-white hover:bg-white/10 transition-all">🔄</button>
      </div>

      {error && <DataErrorBanner error={error} onRetry={reload} />}
      {loading ? <PanelLoader /> : items.length === 0 ? (
        <EmptyState message={emptyMsg} />
      ) : (
        <>
          {/* KPI strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {kpis.map((k, i) => (
              <div key={i} className="glass rounded-xl p-4">
                <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-2">{k.label}</div>
                <div className="font-mono text-[28px] font-bold leading-none" style={{ color: k.color }}>{k.value}</div>
              </div>
            ))}
          </div>

          {/* Per-service breakdown */}
          <div className="glass rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-white/10 text-[11px] font-bold uppercase tracking-[0.10em] text-white/40 font-mono">
              Объёмы по службам
            </div>
            <div className="divide-y divide-white/5">
              {stats.byService.map(s => {
                const meta = SVC.get(s.serviceId)
                return (
                  <div key={s.serviceId} className="flex items-center gap-3 px-5 py-2.5">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: meta?.color ?? '#888' }} />
                    <span className="text-sm text-white/85 flex-1 min-w-0 truncate">{meta?.em} {meta?.name ?? s.serviceId}</span>
                    <span className="font-mono text-xs text-white/50 w-16 text-right">{s.items} пункт.</span>
                    <span className="font-mono text-xs text-[#388BFD] w-14 text-right inline-flex items-center justify-end gap-1"><WorkerIcon className="w-3 h-3" />{s.people}</span>
                    <span className="font-mono text-xs text-[#3FB950] w-12 text-right inline-flex items-center justify-end gap-1"><TruckIcon className="w-3 h-3" />{s.vehicles}</span>
                    <span className="font-mono text-xs w-20 text-right" style={{ color: s.permits > 0 ? AMBER : 'rgba(255,255,255,0.25)' }}>
                      {s.permits > 0 ? `🔺 ${s.permits}` : '—'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Standing / conditional items */}
          {standing.length > 0 && (
            <div className="glass rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-white/10 text-[11px] font-bold uppercase tracking-[0.10em] text-white/40 font-mono">
                Стоячие / условные пункты
              </div>
              <div className="divide-y divide-white/5">
                {standing.map(it => {
                  const m = FLAG_META[it.item_flag!]
                  return (
                    <div key={it.id} className="flex items-center gap-2.5 px-5 py-2.5 text-sm">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full border font-medium shrink-0"
                        style={{ color: m.color, borderColor: m.color + '55', background: m.bg }}>
                        {m.em} {m.short}
                      </span>
                      <span className="font-semibold" style={{ color: m.color }}>{it.work_text}</span>
                      <span className="text-white/35 text-xs ml-auto truncate">{objName.get(it.object_id) ?? ''}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Objects + aggregated resources */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="glass rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-white/10 text-[11px] font-bold uppercase tracking-[0.10em] text-white/40 font-mono">
                Объекты в работе · {stats.objects}
              </div>
              <div className="divide-y divide-white/5 max-h-72 overflow-y-auto">
                {byObject.map(([oid, list]) => {
                  const services = [...new Set(list.map(i => i.service_id))]
                  return (
                    <div key={oid} className="flex items-center gap-2 px-5 py-2.5">
                      <span className="text-sm text-white/85 flex-1 min-w-0 truncate">{objName.get(oid) ?? oid}</span>
                      <span className="inline-flex gap-1 shrink-0">
                        {services.map(sid => (
                          <span key={sid} title={SVC.get(sid)?.name} className="text-xs">{SVC.get(sid)?.em ?? '•'}</span>
                        ))}
                      </span>
                      <span className="font-mono text-[11px] text-white/35 w-10 text-right">{list.length}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="glass rounded-2xl p-5 space-y-4">
              {stats.specialties.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.10em] text-white/40 font-mono mb-2">Состав по специальностям</div>
                  <div className="flex flex-wrap gap-1.5">
                    {stats.specialties.map(s => (
                      <span key={s.code} className="text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-white/80 font-mono">
                        <b className="text-white">{s.count}</b> {s.code}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.10em] text-white/40 font-mono mb-2">
                  Транспорт по номерам · {stats.vehicleNumbers.length}
                </div>
                {stats.vehicleNumbers.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {stats.vehicleNumbers.map(n => <VehicleNumberBadge key={n} number={n} size="sm" />)}
                  </div>
                ) : (
                  <div className="text-xs text-white/30">Номера машин не заданы (только счётчик: {stats.vehiclesCount})</div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
