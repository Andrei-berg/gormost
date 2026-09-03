'use client'
import { useCallback, useMemo, useState } from 'react'
import type { WorkType, Construction, GObject, Service, TypicalCrew, TypicalPeriod } from '@/types'
import {
  fetchWorkTypes, fetchConstructions, fetchObjects, fetchServices,
  createWorkType, deleteWorkType, updateWorkTypeAttributes,
} from '@/lib/api-client'
import { useLoadData } from '@/lib/useLoadData'
import { PanelLoader, DataErrorBanner } from '@/components/DataState'
import { useConfirm } from '@/components/ConfirmDialog'
import { SHIFT_HOURS } from '@/lib/workSchedule'

// D-17: dedicated per-row attribute editor for work_types — NOT the generic
// CrudTab. An ADMIN teaches the resolver which service owns a work type and what
// its unit, typical period and typical crew are; buildKbIndex only loads rows
// whose service_id is non-null, so this tab is what grows the agent vocabulary.
// Persistence goes through the ADMIN-gated updateWorkTypeAttributes (Plan 08-04).
// D-18: search, «Без службы»/«Не заполнено» chips, a construction→object
// breadcrumb per row and a single «Проставить службу выбранным» bulk action keep
// a long catalog navigable; anything richer is v3.x.

const UNIT_SUGGESTIONS = ['м²', 'п.м.', 'шт.', 'м³', 'компл.', 'т']
const PERIODS: TypicalPeriod[] = ['DAY', 'NIGHT', 'AROUND']

// Locked jsonb keys — mirror the journal PlanItem counters 1:1 (D-17, RESEARCH
// Pitfall 5). Phase 11 EXT-05 prefill reads exactly these names. Never the
// daily_plan_items required_* column spelling.
const CREW_KEYS = ['workers', 'foremen', 'itr', 'vehicles'] as const
const CREW_LABELS: Record<(typeof CREW_KEYS)[number], string> = {
  workers: 'Рабочие',
  foremen: 'Мастера',
  itr: 'ИТР',
  vehicles: 'Техника',
}
const EMPTY_CREW: TypicalCrew = { workers: 0, foremen: 0, itr: 0, vehicles: 0 }

const clampInt = (v: number) => Math.max(0, Math.floor(Number.isFinite(v) ? v : 0))

const normCrew = (c: TypicalCrew): TypicalCrew => ({
  workers: clampInt(c.workers),
  foremen: clampInt(c.foremen),
  itr: clampInt(c.itr),
  vehicles: clampInt(c.vehicles),
})

const crewEqual = (a: TypicalCrew | null | undefined, b: TypicalCrew) =>
  !!a && a.workers === b.workers && a.foremen === b.foremen && a.itr === b.itr && a.vehicles === b.vehicles

const chipCls = (active: boolean) =>
  `px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
    active ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'
  }`

export default function WorkTypeAttributesTab() {
  const [workTypes, setWorkTypes] = useState<WorkType[]>([])
  const [constructions, setConstructions] = useState<Construction[]>([])
  const [objects, setObjects] = useState<GObject[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [showCreate, setShowCreate] = useState(false)

  const [search, setSearch] = useState('')
  const [chipNoService, setChipNoService] = useState(false)
  const [chipIncomplete, setChipIncomplete] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkService, setBulkService] = useState('')
  const [bulkRunning, setBulkRunning] = useState(false)
  const [bulkProgress, setBulkProgress] = useState(0)

  const loadFn = useCallback(async () => {
    // fetchObjects joins in for the row breadcrumb — constructions carry only
    // object_id, so a meaningful construction→object breadcrumb (D-18) needs the
    // object names. Still one Promise.all on tab mount.
    const [w, c, o, s] = await Promise.all([
      fetchWorkTypes(), fetchConstructions(), fetchObjects(), fetchServices(),
    ])
    setWorkTypes(w)
    setConstructions(c)
    setObjects(o)
    setServices(s)
  }, [])
  const { loading, error, reload } = useLoadData(loadFn)

  const consById = useMemo(
    () => new Map(constructions.map(c => [c.construction_id, c])),
    [constructions],
  )
  const objById = useMemo(() => new Map(objects.map(o => [o.object_id, o])), [objects])

  const crumb = useCallback(
    (wt: WorkType): { construction: string; object: string } => {
      const c = consById.get(wt.construction_id)
      const o = c ? objById.get(c.object_id) : undefined
      return {
        construction: c?.construction_name ?? wt.construction_id,
        object: o?.object_name ?? '',
      }
    },
    [consById, objById],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return workTypes.filter(wt => {
      if (chipNoService && wt.service_id) return false
      if (chipIncomplete && wt.typical_period && wt.typical_crew) return false
      if (!q) return true
      const bc = crumb(wt)
      return (
        wt.work_name.toLowerCase().includes(q) ||
        wt.work_type_id.toLowerCase().includes(q) ||
        bc.construction.toLowerCase().includes(q) ||
        bc.object.toLowerCase().includes(q)
      )
    })
  }, [workTypes, search, chipNoService, chipIncomplete, crumb])

  const allVisibleSelected = filtered.length > 0 && filtered.every(wt => selected.has(wt.work_type_id))
  const toggleAllVisible = () =>
    setSelected(prev => {
      const next = new Set(prev)
      if (allVisibleSelected) filtered.forEach(wt => next.delete(wt.work_type_id))
      else filtered.forEach(wt => next.add(wt.work_type_id))
      return next
    })
  const toggleOne = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const runBulkService = async () => {
    if (!bulkService || selected.size === 0) return
    setBulkRunning(true)
    setBulkProgress(0)
    const ids = [...selected]
    for (let i = 0; i < ids.length; i++) {
      await updateWorkTypeAttributes(ids[i], { service_id: bulkService })
      setBulkProgress(i + 1)
    }
    setBulkRunning(false)
    setSelected(new Set())
    setBulkService('')
    await reload()
  }

  if (loading) return <PanelLoader />

  return (
    <div>
      {error && <DataErrorBanner error={error} onRetry={reload} />}

      <datalist id="wt-unit-suggestions">
        {UNIT_SUGGESTIONS.map(u => (
          <option key={u} value={u} />
        ))}
      </datalist>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-white">
          Виды работ ({filtered.length} / {workTypes.length})
        </h2>
        <button
          onClick={() => setShowCreate(v => !v)}
          className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium"
        >
          {showCreate ? 'Закрыть' : '+ Добавить'}
        </button>
      </div>

      {showCreate && (
        <CreateWorkTypeForm
          constructions={constructions}
          onCreated={async () => {
            setShowCreate(false)
            await reload()
          }}
        />
      )}

      {/* Search + filter chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Поиск по названию, ID, конструктиву или объекту…"
          className="flex-1 min-w-[220px] bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white/80 placeholder-white/30 focus:outline-none focus:border-blue-500/50"
        />
        <button onClick={() => setChipNoService(v => !v)} className={chipCls(chipNoService)}>
          Без службы
        </button>
        <button onClick={() => setChipIncomplete(v => !v)} className={chipCls(chipIncomplete)}>
          Не заполнено
        </button>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-3 p-3 glass rounded-xl">
          <span className="text-sm text-white/70">Выбрано: {selected.size}</span>
          <select
            value={bulkService}
            onChange={e => setBulkService(e.target.value)}
            disabled={bulkRunning}
            className="form-select text-sm px-3 py-1.5"
          >
            <option value="">Выберите службу…</option>
            {services.map(s => (
              <option key={s.service_id} value={s.service_id}>
                {s.service_name}
              </option>
            ))}
          </select>
          <button
            onClick={runBulkService}
            disabled={!bulkService || bulkRunning}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium disabled:opacity-50"
          >
            {bulkRunning
              ? `Проставить службу выбранным… ${bulkProgress}/${selected.size}`
              : 'Проставить службу выбранным'}
          </button>
          <button
            onClick={() => setSelected(new Set())}
            disabled={bulkRunning}
            className="text-xs text-white/40 hover:text-white/70 disabled:opacity-50"
          >
            Сбросить
          </button>
        </div>
      )}

      <div className="glass rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="px-3 py-2 text-left text-xs text-white/40">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleAllVisible}
                  aria-label="Выбрать все видимые"
                />
              </th>
              <th className="px-3 py-2 text-left text-xs text-white/40">Вид работ</th>
              <th className="px-3 py-2 text-left text-xs text-white/40">Служба</th>
              <th className="px-3 py-2 text-left text-xs text-white/40">Ед. изм.</th>
              <th className="px-3 py-2 text-left text-xs text-white/40">Типовой период</th>
              <th className="px-3 py-2 text-left text-xs text-white/40">Типовая бригада</th>
              <th className="px-3 py-2 text-xs text-white/40"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(wt => (
              <AttrRow
                // Key on the persisted attributes so the row remounts (and its
                // local edit state re-seeds from props) after any save or the
                // bulk service action — the precedent's seed-from-props idiom,
                // no setState-in-effect.
                key={`${wt.work_type_id}:${wt.service_id ?? ''}:${wt.unit ?? ''}:${wt.typical_period ?? ''}:${JSON.stringify(wt.typical_crew ?? null)}`}
                wt={wt}
                services={services}
                crumb={crumb(wt)}
                checked={selected.has(wt.work_type_id)}
                onToggle={() => toggleOne(wt.work_type_id)}
                onReload={reload}
              />
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-12 text-center text-white/20">
                  {workTypes.length === 0 ? 'Нет видов работ' : 'Ничего не найдено'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Per-row editor: service / unit / typical period / typical crew ──────────
function AttrRow({
  wt,
  services,
  crumb,
  checked,
  onToggle,
  onReload,
}: {
  wt: WorkType
  services: Service[]
  crumb: { construction: string; object: string }
  checked: boolean
  onToggle: () => void
  onReload: () => Promise<void>
}) {
  const confirmDialog = useConfirm()
  const [serviceId, setServiceId] = useState(wt.service_id ?? '')
  const [unit, setUnit] = useState(wt.unit ?? '')
  const [period, setPeriod] = useState<TypicalPeriod | ''>(wt.typical_period ?? '')
  const [crew, setCrew] = useState<TypicalCrew>(wt.typical_crew ?? EMPTY_CREW)
  const [busy, setBusy] = useState(false)

  const setCrewKey = (k: (typeof CREW_KEYS)[number], v: number) =>
    setCrew(c => ({ ...c, [k]: clampInt(v) }))

  const serviceDirty = (serviceId || null) !== (wt.service_id ?? null)
  const unitDirty = (unit.trim() || null) !== (wt.unit ?? null)
  const periodDirty = (period || null) !== (wt.typical_period ?? null)
  const crewDirty = !crewEqual(wt.typical_crew, normCrew(crew))
  const dirty = serviceDirty || unitDirty || periodDirty || crewDirty

  const save = async () => {
    setBusy(true)
    // Save-diff idiom: send only the fields that actually changed, so an
    // unchanged save is a no-op scalar overwrite, never an append.
    const attrs: Parameters<typeof updateWorkTypeAttributes>[1] = {}
    if (serviceDirty) attrs.service_id = serviceId || null
    if (unitDirty) attrs.unit = unit.trim() || null
    if (periodDirty) attrs.typical_period = period || null
    if (crewDirty) attrs.typical_crew = normCrew(crew)
    await updateWorkTypeAttributes(wt.work_type_id, attrs)
    await onReload()
    setBusy(false)
  }

  const del = async () => {
    if (!(await confirmDialog(`Удалить вид работ «${wt.work_name}»?`, { confirmLabel: 'Удалить' }))) return
    setBusy(true)
    await deleteWorkType(wt.work_type_id)
    await onReload()
    setBusy(false)
  }

  return (
    <tr className="border-b border-white/5 align-top hover:bg-white/3">
      <td className="px-3 py-3">
        <input type="checkbox" checked={checked} onChange={onToggle} aria-label={`Выбрать ${wt.work_name}`} />
      </td>

      <td className="px-3 py-3">
        <div className="text-white/90">{wt.work_name}</div>
        <div className="text-[11px] text-white/30 font-mono">{wt.work_type_id}</div>
        <div className="text-[11px] text-white/40 mt-0.5">
          {crumb.construction}
          {crumb.object && <span className="text-white/25"> → {crumb.object}</span>}
        </div>
      </td>

      <td className="px-3 py-3">
        <select
          value={serviceId}
          disabled={busy}
          onChange={e => setServiceId(e.target.value)}
          className="form-select text-xs px-2 py-1 max-w-[170px]"
        >
          <option value="">— нет —</option>
          {services.map(s => (
            <option key={s.service_id} value={s.service_id}>
              {s.service_name}
            </option>
          ))}
        </select>
      </td>

      <td className="px-3 py-3">
        <input
          list="wt-unit-suggestions"
          value={unit}
          disabled={busy}
          onChange={e => setUnit(e.target.value)}
          placeholder="ед."
          className="w-20 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white placeholder-white/25 focus:outline-none focus:border-blue-500/50"
        />
      </td>

      <td className="px-3 py-3">
        <div className="flex gap-1">
          {PERIODS.map(p => (
            <button
              key={p}
              type="button"
              disabled={busy}
              onClick={() => setPeriod(prev => (prev === p ? '' : p))}
              className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                period === p ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'
              }`}
            >
              {SHIFT_HOURS[p].emoji} {SHIFT_HOURS[p].label}
            </button>
          ))}
        </div>
      </td>

      <td className="px-3 py-3">
        <div className="flex gap-2">
          {CREW_KEYS.map(k => (
            <label key={k} className="flex flex-col items-center gap-0.5">
              <span className="text-[9px] text-white/40 uppercase tracking-wider">{CREW_LABELS[k]}</span>
              <input
                type="number"
                min={0}
                step={1}
                disabled={busy}
                value={crew[k]}
                onChange={e => setCrewKey(k, e.target.valueAsNumber)}
                className="w-14 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white text-center focus:outline-none focus:border-blue-500/50"
              />
            </label>
          ))}
        </div>
      </td>

      <td className="px-3 py-3">
        <div className="flex flex-col items-end gap-1.5">
          <button
            onClick={save}
            disabled={busy || !dirty}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-all disabled:opacity-40"
          >
            {busy ? '…' : 'Сохранить'}
          </button>
          <button
            onClick={del}
            disabled={busy}
            className="text-[11px] text-white/40 hover:text-red-400 transition-colors disabled:opacity-50"
          >
            удалить
          </button>
        </div>
      </td>
    </tr>
  )
}

// ── Create a new work type (id + construction + name) ──────────────────────
function CreateWorkTypeForm({
  constructions,
  onCreated,
}: {
  constructions: Construction[]
  onCreated: () => Promise<void>
}) {
  const [id, setId] = useState('')
  const [constructionId, setConstructionId] = useState('')
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  const canSubmit = id.trim() && constructionId && name.trim()

  const submit = async () => {
    if (!canSubmit) return
    setSaving(true)
    await createWorkType({
      work_type_id: id.trim(),
      construction_id: constructionId,
      work_name: name.trim(),
    })
    setSaving(false)
    setId('')
    setConstructionId('')
    setName('')
    await onCreated()
  }

  const inp = 'form-select w-full text-sm px-3 py-2'

  return (
    <div className="glass rounded-2xl p-5 mb-4 animate-slide-down">
      <h3 className="text-sm font-bold text-white/70 mb-3">Новый вид работ</h3>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-white/50 mb-1">ID *</label>
          <input value={id} onChange={e => setId(e.target.value)} className={inp} placeholder="WORK-..." />
        </div>
        <div>
          <label className="block text-xs text-white/50 mb-1">Конструктив *</label>
          <select value={constructionId} onChange={e => setConstructionId(e.target.value)} className={inp}>
            <option value="">—</option>
            {constructions.map(c => (
              <option key={c.construction_id} value={c.construction_id}>
                {c.construction_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-white/50 mb-1">Название работы *</label>
          <input value={name} onChange={e => setName(e.target.value)} className={inp} placeholder="напр. Замена лампы" />
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button
          onClick={submit}
          disabled={saving || !canSubmit}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium disabled:opacity-40"
        >
          {saving ? '…' : 'Создать'}
        </button>
      </div>
    </div>
  )
}
