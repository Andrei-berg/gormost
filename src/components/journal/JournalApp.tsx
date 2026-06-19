'use client'
import { useCallback, useMemo, useState } from 'react'
import type { AuthSession } from '@/types'
import {
  fetchJournalObjects, fetchDailyPlanItems, createJournalObject,
  createDailyPlanItem, updateDailyPlanItem, deleteDailyPlanItem,
} from '@/lib/api-client'
import { useLoadData } from '@/lib/useLoadData'
import { PanelLoader, DataErrorBanner } from '@/components/DataState'
import {
  SERVICES, fmtDateRu, TODAY_ISO, TOMORROW_ISO, PERIOD_META,
  toObjectRef, toPlanItem,
  type ObjectRef, type PlanItem, type AddInput, type Period,
} from './data'
import { S } from './ui'
import FeedView from './FeedView'
import BoardView from './BoardView'
import TableView from './TableView'
import AddItemModal, { type AddCtx } from './AddItemModal'

type View = 'feed' | 'board' | 'table'
type Pivot = 'service' | 'object'

const VIEWS: { id: View; label: string }[] = [
  { id: 'feed',  label: 'Лента' },
  { id: 'board', label: 'Доска' },
  { id: 'table', label: 'Таблица' },
]

// Quick slice presets — each sets (date, period).
const PRESETS: { date: string; period: Period; label: string }[] = [
  { date: TODAY_ISO,    period: 'DAY',   label: 'Сегодня день' },
  { date: TODAY_ISO,    period: 'NIGHT', label: '🌙 Сегодня ночь' },
  { date: TOMORROW_ISO, period: 'DAY',   label: 'Завтра день' },
  { date: TOMORROW_ISO, period: 'NIGHT', label: '🌙 Завтра ночь' },
]

export default function JournalApp({ session }: { session: AuthSession }) {
  const [objects, setObjects] = useState<ObjectRef[]>([])
  const [items, setItems]     = useState<PlanItem[]>([])
  const [view, setView]       = useState<View>('feed')
  const [pivot, setPivot]     = useState<Pivot>('service')
  const [addCtx, setAddCtx]   = useState<AddCtx | null>(null)

  // ── active slice (date × period) ──────────────────────────────────────────
  const [date, setDate]             = useState<string>(TODAY_ISO)
  const [period, setPeriod]         = useState<Period>('DAY')
  const [bothShifts, setBothShifts] = useState(false)

  // Plan items are fetched per selected date; period/bothShifts filter client-side.
  const loadData = useCallback(async () => {
    const [objs, rows] = await Promise.all([fetchJournalObjects(), fetchDailyPlanItems(date)])
    setObjects(objs.map(toObjectRef))
    setItems(rows.map(toPlanItem))
  }, [date])
  const { loading, error, reload } = useLoadData(loadData)

  const visible = useMemo(
    () => items.filter(i => bothShifts || i.period === period),
    [items, period, bothShifts],
  )

  // ── mutations ───────────────────────────────────────────────────────────
  const addItem = async (inp: AddInput) => {
    let objectId: string
    if ('id' in inp.object) {
      objectId = inp.object.id
    } else {
      const created = await createJournalObject({
        name: inp.object.newName, category_id: inp.object.categoryId,
        address: inp.object.address, created_by: session.user_id,
      })
      if (!created) return
      objectId = created.id
    }
    await createDailyPlanItem({
      plan_date: date, shift_type: period, object_id: objectId, service_id: inp.serviceId,
      work_text: inp.work, required_workers: inp.workers, required_foremen: inp.foremen,
      required_itr: inp.itr, required_vehicles: inp.vehicles, created_by: session.user_id,
    })
    await reload()
  }
  const deleteItem = async (id: string) => { await deleteDailyPlanItem(id); await reload() }
  const reassign = async (id: string, serviceId: string) => {
    await updateDailyPlanItem(id, { service_id: serviceId }); await reload()
  }

  // KPIs (over the visible slice)
  const objectsTouched  = new Set(visible.map(i => i.objectId)).size
  const servicesTouched = new Set(visible.map(i => i.serviceId)).size

  const seg = (active: boolean) =>
    `px-3 py-1.5 ${S.radiusSm} text-sm font-medium transition-all ${active ? S.segActive : S.segIdle}`

  const presetActive = (p: { date: string; period: Period }) =>
    !bothShifts && date === p.date && period === p.period

  const tone = PERIOD_META[period]

  if (loading) return <PanelLoader />

  return (
    <div className="min-h-[calc(100vh-64px)]">
      <div className="max-w-6xl mx-auto px-4 py-6">

        {error && <DataErrorBanner error={error} onRetry={reload} />}

        {/* Title row */}
        <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <h1 className={`text-xl font-bold ${S.text}`}>📒 Журнал планов</h1>
            {/* Active slice badge — highlights which day/shift we plan for */}
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border capitalize"
              style={bothShifts
                ? { color: 'var(--text-secondary)', borderColor: 'var(--border-strong)' }
                : { color: tone.color, borderColor: tone.color + '66', background: tone.bg }}
            >
              {bothShifts ? '◫' : tone.em} ПЛАН НА: {fmtDateRu(date)} · {bothShifts ? 'обе смены' : tone.label}
            </span>
          </div>
        </div>

        {/* Slice bar — date × period */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <div className={`inline-flex flex-wrap p-0.5 ${S.inset} ${S.radiusSm}`}>
            {PRESETS.map(p => {
              const active = presetActive(p)
              const t = PERIOD_META[p.period]
              return (
                <button
                  key={p.label}
                  onClick={() => { setDate(p.date); setPeriod(p.period); setBothShifts(false) }}
                  className={`px-3 py-1.5 ${S.radiusSm} text-sm font-medium transition-all ${active ? '' : S.segIdle}`}
                  style={active ? { color: t.color, background: t.bg } : undefined}
                >
                  {p.label}
                </button>
              )
            })}
          </div>

          <label className={`inline-flex items-center gap-2 ${S.inset} ${S.radiusSm} px-3 py-1.5`}>
            <span className={S.label}>дата</span>
            <input
              type="date" value={date} onChange={e => setDate(e.target.value)}
              className={`bg-transparent text-sm ${S.text} outline-none`}
            />
          </label>

          <button
            onClick={() => setBothShifts(b => !b)}
            className={seg(bothShifts)}
            title="Показать день и ночь вместе"
          >
            ◫ обе смены
          </button>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { v: visible.length,  l: 'записей в плане' },
            { v: objectsTouched,  l: 'объектов задействовано' },
            { v: servicesTouched, l: 'служб задействовано' },
          ].map((k, i) => (
            <div key={i} className={`${S.card} px-4 py-3 flex items-baseline gap-2`}>
              <span className={`text-2xl font-bold ${S.text} font-mono`}>{k.v}</span>
              <span className={`text-[11px] ${S.textSub} leading-tight`}>{k.l}</span>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className={`inline-flex p-0.5 ${S.inset} ${S.radiusSm}`}>
            {VIEWS.map(v => (
              <button key={v.id} onClick={() => setView(v.id)} className={seg(view === v.id)}>{v.label}</button>
            ))}
          </div>

          {view === 'board' && (
            <div className="flex items-center gap-2">
              <span className={S.label}>пивот</span>
              <div className={`inline-flex p-0.5 ${S.inset} ${S.radiusSm}`}>
                <button onClick={() => setPivot('service')} className={seg(pivot === 'service')}>по службам</button>
                <button onClick={() => setPivot('object')}  className={seg(pivot === 'object')}>по объектам</button>
              </div>
            </div>
          )}
        </div>

        {/* Active view */}
        {view === 'feed' && (
          <FeedView
            items={visible} objects={objects} services={SERVICES} ui={S}
            onAdd={addItem} onDelete={deleteItem} onReassign={reassign}
            onOpenAdd={setAddCtx}
          />
        )}
        {view === 'board' && (
          <BoardView
            items={visible} objects={objects} services={SERVICES} ui={S} pivot={pivot}
            onDelete={deleteItem} onReassign={reassign} onOpenAdd={setAddCtx}
          />
        )}
        {view === 'table' && (
          <TableView
            items={visible} objects={objects} services={SERVICES} ui={S}
            onDelete={deleteItem} onReassign={reassign} onOpenAdd={setAddCtx}
          />
        )}

        <div className={`mt-6 text-center text-[11px] ${S.textMuted}`}>
          журнал ежедневного планирования · {fmtDateRu(date)}
        </div>
      </div>

      {addCtx && (
        <AddItemModal
          ctx={addCtx} objects={objects} services={SERVICES} ui={S}
          onClose={() => setAddCtx(null)} onAdd={addItem}
        />
      )}
    </div>
  )
}
