'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AuthSession, JournalShiftHeader, SpecialtyCount, DailyPlanItemFlag } from '@/types'
import {
  fetchJournalObjects, fetchDailyPlanItems, createJournalObject,
  createDailyPlanItem, updateDailyPlanItem, deleteDailyPlanItem,
  fetchShiftHeader, upsertShiftHeader,
} from '@/lib/api-client'
import { useLoadData } from '@/lib/useLoadData'
import { useConfirm } from '@/components/ConfirmDialog'
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
import ShiftHeaderBar, { type ShiftHeaderPatch } from './ShiftHeaderBar'
import WorkPermitModal from '@/components/head/WorkPermitModal'
import { journalItemToWorkPlan, buildPermitDefaults } from './journalPermit'

type View = 'feed' | 'board' | 'table'
type Pivot = 'service' | 'object'

const VIEWS: { id: View; label: string }[] = [
  { id: 'feed',  label: 'Лента' },
  { id: 'board', label: 'Доска' },
  { id: 'table', label: 'Таблица' },
]

// Quick slice presets — each sets (date, period).
const PRESETS: { date: string; period: Period; label: string }[] = [
  { date: TODAY_ISO,    period: 'DAY',    label: 'Сегодня день' },
  { date: TODAY_ISO,    period: 'NIGHT',  label: '🌙 Сегодня ночь' },
  { date: TODAY_ISO,    period: 'AROUND', label: '🌗 Сегодня сутки' },
  { date: TOMORROW_ISO, period: 'DAY',    label: 'Завтра день' },
  { date: TOMORROW_ISO, period: 'NIGHT',  label: '🌙 Завтра ночь' },
  { date: TOMORROW_ISO, period: 'AROUND', label: '🌗 Завтра сутки' },
]

export default function JournalApp({ session }: { session: AuthSession }) {
  const notify = useConfirm()
  const [objects, setObjects] = useState<ObjectRef[]>([])
  const [items, setItems]     = useState<PlanItem[]>([])
  const [view, setView]       = useState<View>('feed')
  const [pivot, setPivot]     = useState<Pivot>('service')
  const [addCtx, setAddCtx]   = useState<AddCtx | null>(null)
  const [permitItem, setPermitItem] = useState<PlanItem | null>(null)

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

  // ── шапка дня (per date × period) ───────────────────────────────────────────
  // Fetched independently of the items reload since period is a client-side
  // filter; hidden when both shifts are shown (the slice is ambiguous).
  const [header, setHeader] = useState<JournalShiftHeader | null>(null)
  useEffect(() => {
    if (bothShifts) return
    let alive = true
    fetchShiftHeader(date, period).then(h => { if (alive) setHeader(h) })
    return () => { alive = false }
  }, [date, period, bothShifts])

  // Run a mutation, surfacing any thrown error to the user instead of failing
  // silently (an unhandled rejection in an onClick handler shows nothing).
  const guard = async (fn: () => Promise<void>) => {
    try {
      await fn()
    } catch (e) {
      await notify(e instanceof Error ? e.message : 'Не удалось выполнить операцию', { alert: true })
    }
  }

  const saveHeader = (patch: ShiftHeaderPatch) => guard(async () => {
    const saved = await upsertShiftHeader({
      plan_date: date, shift_type: period, created_by: session.user_id, ...patch,
    })
    setHeader(saved)
  })

  // ── mutations ───────────────────────────────────────────────────────────
  const addItem = (inp: AddInput) => guard(async () => {
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
      required_itr: inp.itr, required_vehicles: inp.vehicles, specialties: inp.specialties,
      vehicle_numbers: inp.vehicleNumbers, item_flag: inp.flag, created_by: session.user_id,
    })
    await reload()
  })
  const deleteItem = (id: string) => guard(async () => { await deleteDailyPlanItem(id); await reload() })
  const reassign = (id: string, serviceId: string) => guard(async () => {
    await updateDailyPlanItem(id, { service_id: serviceId }); await reload()
  })
  const updateSpecialties = (id: string, specialties: SpecialtyCount[]) => guard(async () => {
    await updateDailyPlanItem(id, { specialties }); await reload()
  })
  const updateVehicleNumbers = (id: string, vehicle_numbers: string[]) => guard(async () => {
    await updateDailyPlanItem(id, { vehicle_numbers }); await reload()
  })
  const updateFlag = (id: string, item_flag: DailyPlanItemFlag | null) => guard(async () => {
    await updateDailyPlanItem(id, { item_flag }); await reload()
  })

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
              {bothShifts ? '◫' : tone.em} ПЛАН НА: {fmtDateRu(date)} · {bothShifts ? 'все смены' : tone.label}
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
            title="Показать день, ночь и сутки вместе"
          >
            ◫ все смены
          </button>
        </div>

        {/* Шапка дня — деж. мастер / водитель / Отв. (1 раз на смену → в наряд) */}
        {!bothShifts && (
          <ShiftHeaderBar
            key={`${date}|${period}|${header?.id ?? 'new'}`}
            header={header} ui={S} onSave={saveHeader}
          />
        )}

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
            items={visible} objects={objects} services={SERVICES} ui={S} header={header}
            onAdd={addItem} onDelete={deleteItem} onReassign={reassign}
            onOpenAdd={setAddCtx} onOpenPermit={setPermitItem}
            onUpdateSpecialties={updateSpecialties} onUpdateVehicleNumbers={updateVehicleNumbers}
            onUpdateFlag={updateFlag}
          />
        )}
        {view === 'board' && (
          <BoardView
            items={visible} objects={objects} services={SERVICES} ui={S} header={header} pivot={pivot}
            onDelete={deleteItem} onReassign={reassign} onOpenAdd={setAddCtx} onOpenPermit={setPermitItem}
          />
        )}
        {view === 'table' && (
          <TableView
            items={visible} objects={objects} services={SERVICES} ui={S} header={header}
            onDelete={deleteItem} onReassign={reassign} onOpenAdd={setAddCtx} onOpenPermit={setPermitItem}
            onUpdateSpecialties={updateSpecialties} onUpdateVehicleNumbers={updateVehicleNumbers}
            onUpdateFlag={updateFlag}
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

      {permitItem && (
        <WorkPermitModal
          plan={journalItemToWorkPlan(
            permitItem,
            objects.find(o => o.id === permitItem.objectId)?.name ?? '',
            session,
          )}
          session={session}
          permitDefaults={buildPermitDefaults(bothShifts ? null : header, permitItem)}
          onClose={() => setPermitItem(null)}
        />
      )}
    </div>
  )
}
