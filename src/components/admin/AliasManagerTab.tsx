'use client'
import { useCallback, useMemo, useState } from 'react'
import type { EntityAlias, CanonicalType, JournalObject, WorkType, Service } from '@/types'
import {
  fetchEntityAliases, createEntityAlias, updateEntityAlias, deleteEntityAlias, findAliasCollisions,
  fetchJournalObjects, fetchWorkTypes, fetchServices,
} from '@/lib/api-client'
import { useLoadData } from '@/lib/useLoadData'
import { PanelLoader, DataErrorBanner } from '@/components/DataState'
import { useConfirm } from '@/components/ConfirmDialog'
import { preprocess } from '@/lib/kb/preprocess'

// D-19: the «Синонимы» alias manager. An ADMIN teaches the deterministic Russian
// resolver the irregular surface forms no stemmer reaches («БК», «ЭВ №3»,
// «тт №3 КТР») — the alias table is the resolver's primary mechanism, fuzzy
// matching is only the fallback. Search by surface or by canonical entity name;
// each row shows a `source` badge (seed / manual / voice / correction), its
// `weight` and the resolved canonical entity name.
//
// D-13: adding a surface that already resolves to a DIFFERENT canonical of the
// SAME type shows a soft warning through useConfirm(); the ADMIN confirms past
// it, BOTH rows live, and that surface then resolves `ambiguous`. Never a hard
// block, never a `conflicted` flag column, the existing row is never touched.
//
// D-16: scope_object_id is settable here, but resolveEntity ignores scope in
// v3.0 — scope-aware resolution is v3.x. Setting it changes nothing about how a
// phrase resolves today.
//
// D-20: createEntityAlias / updateEntityAlias / deleteEntityAlias are ADMIN-only
// in ROLE_RESTRICTED (src/app/api/db/route.ts); this tab lives inside
// <AuthGuard roles={['ADMIN']}> on /admin.
//
// surface_raw is stored verbatim for display and audit and is rendered as React
// text only — it never reaches a raw-HTML render path (ASVS V5).

// The alias manager picks canonicals from objects, work types and services.
// `construction` aliases can exist in the table but are not creatable here in
// v3.0; such rows render with an explicit dangling marker.
type PickableType = Extract<CanonicalType, 'object' | 'work_type' | 'service'>
const PICKABLE_TYPES: PickableType[] = ['object', 'work_type', 'service']

const TYPE_LABELS: Record<CanonicalType, string> = {
  object: 'Объект',
  construction: 'Конструктив',
  work_type: 'Вид работ',
  service: 'Служба',
}

// All four entity_aliases.source values, rendered as badge labels.
const SOURCE_LABELS: Record<EntityAlias['source'], string> = {
  seed: 'из справочника',
  manual: 'вручную',
  voice: 'из диктовки',
  correction: 'из исправления',
}
const SOURCE_BADGE: Record<EntityAlias['source'], string> = {
  seed: 'bg-white/10 text-white/50 border-white/15',
  manual: 'bg-blue-500/15 text-blue-300 border-blue-500/25',
  voice: 'bg-purple-500/15 text-purple-300 border-purple-500/25',
  correction: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
}

const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'Неизвестная ошибка')

// Lightweight display-only fold for the search box and the entity picker — the
// stored surface_norm is what the resolver actually keys on (computed server-side
// from preprocess); this is just so a search for «тоннел» finds «Тоннель».
const softFold = (s: string) => s.toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim()

interface AddInput {
  canonicalType: PickableType
  canonicalId: string
  surfaceRaw: string
  weight: number
  scopeObjectId: string
}

export default function AliasManagerTab() {
  const confirmDialog = useConfirm()
  const [aliases, setAliases] = useState<EntityAlias[]>([])
  const [objects, setObjects] = useState<JournalObject[]>([])
  const [workTypes, setWorkTypes] = useState<WorkType[]>([])
  const [services, setServices] = useState<Service[]>([])

  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const loadFn = useCallback(async () => {
    // One Promise.all on tab mount — every alias row's canonical_id resolves to a
    // display name from these already-loaded arrays, no per-row fetch (D-19).
    const [a, o, w, s] = await Promise.all([
      fetchEntityAliases(), fetchJournalObjects(), fetchWorkTypes(), fetchServices(),
    ])
    setAliases(a)
    setObjects(o)
    setWorkTypes(w)
    setServices(s)
  }, [])
  const { loading, error, reload } = useLoadData(loadFn)

  const objName = useMemo(() => new Map(objects.map(o => [o.id, o.name])), [objects])
  const wtName = useMemo(() => new Map(workTypes.map(w => [w.work_type_id, w.work_name])), [workTypes])
  const svcName = useMemo(() => new Map(services.map(s => [s.service_id, s.service_name])), [services])

  // canonical_id -> display name, or null when the reference is dangling
  // (buildKbIndex skips those; the list shows an explicit marker instead of a blank).
  const canonicalName = useCallback(
    (type: CanonicalType, id: string): string | null => {
      if (type === 'object') return objName.get(id) ?? null
      if (type === 'work_type') return wtName.get(id) ?? null
      if (type === 'service') return svcName.get(id) ?? null
      return null
    },
    [objName, wtName, svcName],
  )

  const filtered = useMemo(() => {
    const q = softFold(search)
    if (!q) return aliases
    return aliases.filter(a => {
      const cn = canonicalName(a.canonical_type, a.canonical_id) ?? ''
      return (
        softFold(a.surface_raw).includes(q) ||
        a.surface_norm.includes(q) ||
        softFold(cn).includes(q)
      )
    })
  }, [aliases, search, canonicalName])

  const handleAdd = async (input: AddInput) => {
    setAddError(null)
    const surfaceRaw = input.surfaceRaw.trim()
    if (!surfaceRaw) {
      setAddError('Введите исходную форму синонима.')
      return
    }
    // Same key the server derives (preprocess -> normalized) so the collision
    // check uses the resolver's exact index key (D-09, D-14).
    const surfaceNorm = preprocess(surfaceRaw).normalized
    if (!surfaceNorm) {
      setAddError('Исходная форма пуста после нормализации.')
      return
    }

    // D-13 soft collision check — runs BEFORE the write and only drives the
    // confirmation banner. It never blocks or mutates anything.
    let collisions: EntityAlias[] = []
    try {
      collisions = await findAliasCollisions(surfaceNorm, input.canonicalType, input.canonicalId)
    } catch (e) {
      setAddError(errMsg(e))
      return
    }

    if (collisions.length > 0) {
      const names = collisions
        .map(c => canonicalName(c.canonical_type, c.canonical_id) ?? c.canonical_id)
        .join(', ')
      const ok = await confirmDialog(
        `«${surfaceRaw}» уже привязан к «${names}». Всё равно добавить?\n\n` +
          'Обе записи останутся — существующая не удаляется и не блокируется, ' +
          'но эта фраза после этого будет разрешаться неоднозначно (ambiguous).',
        { confirmLabel: 'Всё равно добавить', danger: false },
      )
      if (!ok) return
    }

    try {
      await createEntityAlias({
        surface_raw: surfaceRaw,
        canonical_type: input.canonicalType,
        canonical_id: input.canonicalId,
        scope_object_id: input.scopeObjectId || null,
        weight: input.weight,
        source: 'manual',
      })
    } catch (e) {
      // Surfaces the unique-expression-index rejection (same surface_norm +
      // canonical_type + scope) as a readable Russian message, not a silent no-op.
      setAddError(errMsg(e))
      return
    }

    setShowCreate(false)
    await reload()
  }

  if (loading) return <PanelLoader />

  const objectOptions = objects.map(o => ({ id: o.id, name: o.name }))

  return (
    <div>
      {error && <DataErrorBanner error={error} onRetry={reload} />}

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-white">
          Синонимы ({filtered.length} / {aliases.length})
        </h2>
        <button
          onClick={() => { setShowCreate(v => !v); setAddError(null) }}
          className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium"
        >
          {showCreate ? 'Закрыть' : '+ Добавить'}
        </button>
      </div>

      <p className="text-xs text-white/40 mb-3 max-w-3xl">
        Синоним учит распознавание нестандартным формам, до которых не доберётся стеммер
        («БК», «ЭВ №3», «тт №3 КТР»). Область (объект) можно задать, но в v3.0 распознавание
        её игнорирует.
      </p>

      {showCreate && (
        <AddAliasForm
          objects={objectOptions}
          workTypes={workTypes.map(w => ({ id: w.work_type_id, name: w.work_name }))}
          services={services.map(s => ({ id: s.service_id, name: s.service_name }))}
          onAdd={handleAdd}
          error={addError}
        />
      )}

      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Поиск по исходной форме или по названию сущности…"
        className="w-full mb-4 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white/80 placeholder-white/30 focus:outline-none focus:border-blue-500/50"
      />

      <div className="glass rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="px-3 py-2 text-left text-xs text-white/40">Исходная форма</th>
              <th className="px-3 py-2 text-left text-xs text-white/40">Канонная сущность</th>
              <th className="px-3 py-2 text-left text-xs text-white/40">Источник</th>
              <th className="px-3 py-2 text-left text-xs text-white/40">Вес</th>
              <th className="px-3 py-2 text-left text-xs text-white/40">Область (объект)</th>
              <th className="px-3 py-2 text-xs text-white/40"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(a => (
              <AliasRow
                // Key on the mutable fields so the row remounts (local edit state
                // re-seeds from props) after any save — the house seed-from-props
                // idiom, no setState-in-effect.
                key={`${a.id}:${a.weight}:${a.scope_object_id ?? ''}`}
                alias={a}
                canonicalName={canonicalName(a.canonical_type, a.canonical_id)}
                objects={objectOptions}
                onReload={reload}
              />
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-12 text-center text-white/20">
                  {aliases.length === 0 ? 'Нет синонимов' : 'Ничего не найдено'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Per-row: source badge, in-place weight + scope editing, delete ───────────
function AliasRow({
  alias,
  canonicalName,
  objects,
  onReload,
}: {
  alias: EntityAlias
  canonicalName: string | null
  objects: { id: string; name: string }[]
  onReload: () => Promise<void>
}) {
  const confirmDialog = useConfirm()
  const [weight, setWeight] = useState(String(alias.weight))
  const [busy, setBusy] = useState(false)
  const [rowError, setRowError] = useState<string | null>(null)

  const weightDirty = weight.trim() !== String(alias.weight)

  const saveWeight = async () => {
    const n = Math.round(Number(weight))
    if (!Number.isFinite(n) || n < 0) {
      setWeight(String(alias.weight))
      setRowError('Вес должен быть неотрицательным числом.')
      return
    }
    if (n === alias.weight) return
    setBusy(true)
    setRowError(null)
    try {
      await updateEntityAlias(alias.id, { weight: n })
      await onReload()
    } catch (e) {
      setRowError(errMsg(e))
      setBusy(false)
    }
  }

  const saveScope = async (scopeObjectId: string) => {
    setBusy(true)
    setRowError(null)
    try {
      await updateEntityAlias(alias.id, { scope_object_id: scopeObjectId || null })
      await onReload()
    } catch (e) {
      setRowError(errMsg(e))
      setBusy(false)
    }
  }

  const del = async () => {
    const ok = await confirmDialog(`Удалить синоним «${alias.surface_raw}»?`, { confirmLabel: 'Удалить' })
    if (!ok) return
    setBusy(true)
    setRowError(null)
    try {
      await deleteEntityAlias(alias.id)
      await onReload()
    } catch (e) {
      setRowError(errMsg(e))
      setBusy(false)
    }
  }

  return (
    <tr className="border-b border-white/5 align-top hover:bg-white/3">
      <td className="px-3 py-3">
        <div className="text-white/90">{alias.surface_raw}</div>
        <div className="text-[11px] text-white/30 font-mono">{alias.surface_norm}</div>
        {rowError && <div className="text-[11px] text-red-400 mt-0.5">{rowError}</div>}
      </td>

      <td className="px-3 py-3">
        {canonicalName ? (
          <>
            <div className="text-white/80">{canonicalName}</div>
            <div className="text-[11px] text-white/35">{TYPE_LABELS[alias.canonical_type]}</div>
          </>
        ) : (
          <div className="text-[11px] text-amber-400">
            ⚠ битая ссылка · {TYPE_LABELS[alias.canonical_type]} · <span className="font-mono">{alias.canonical_id}</span>
          </div>
        )}
      </td>

      <td className="px-3 py-3">
        <span className={`text-[9px] px-1.5 py-0.5 rounded border ${SOURCE_BADGE[alias.source]}`}>
          {SOURCE_LABELS[alias.source]}
        </span>
      </td>

      <td className="px-3 py-3">
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={0}
            step={1}
            disabled={busy}
            value={weight}
            onChange={e => setWeight(e.target.value)}
            onBlur={saveWeight}
            onKeyDown={e => { if (e.key === 'Enter') saveWeight() }}
            className="w-16 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white text-center focus:outline-none focus:border-blue-500/50"
          />
          {weightDirty && !busy && <span className="text-[10px] text-white/30">↵</span>}
        </div>
      </td>

      <td className="px-3 py-3">
        <select
          value={alias.scope_object_id ?? ''}
          disabled={busy}
          onChange={e => saveScope(e.target.value)}
          className="form-select text-xs px-2 py-1 max-w-[180px]"
        >
          <option value="">— нет —</option>
          {objects.map(o => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
      </td>

      <td className="px-3 py-3">
        <div className="flex justify-end">
          <button
            onClick={del}
            disabled={busy}
            className="text-[11px] text-white/40 hover:text-red-400 transition-colors disabled:opacity-50"
          >
            {busy ? '…' : 'удалить'}
          </button>
        </div>
      </td>
    </tr>
  )
}

// ── Collapsible add form: type selector + entity picker + surface input ──────
function AddAliasForm({
  objects,
  workTypes,
  services,
  onAdd,
  error,
}: {
  objects: { id: string; name: string }[]
  workTypes: { id: string; name: string }[]
  services: { id: string; name: string }[]
  onAdd: (input: AddInput) => Promise<void>
  error: string | null
}) {
  const [canonicalType, setCanonicalType] = useState<PickableType>('object')
  const [canonicalId, setCanonicalId] = useState('')
  const [entityText, setEntityText] = useState('')
  const [surfaceRaw, setSurfaceRaw] = useState('')
  const [weight, setWeight] = useState('100')
  const [scopeObjectId, setScopeObjectId] = useState('')
  const [saving, setSaving] = useState(false)

  const pool = canonicalType === 'object' ? objects : canonicalType === 'work_type' ? workTypes : services

  const resetEntity = () => { setCanonicalId(''); setEntityText('') }

  const canSubmit = canonicalId && surfaceRaw.trim() && !saving

  const submit = async () => {
    if (!canSubmit) return
    setSaving(true)
    const n = Math.round(Number(weight))
    await onAdd({
      canonicalType,
      canonicalId,
      surfaceRaw,
      weight: Number.isFinite(n) && n >= 0 ? n : 100,
      scopeObjectId,
    })
    setSaving(false)
    // On success the parent closes the form; on error it stays open with `error`
    // shown. Keep the typed values either way.
  }

  const inp = 'form-select w-full text-sm px-3 py-2'

  return (
    <div className="glass rounded-2xl p-5 mb-4 animate-slide-down">
      <h3 className="text-sm font-bold text-white/70 mb-3">Новый синоним</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-white/50 mb-1">Тип сущности *</label>
          <select
            value={canonicalType}
            onChange={e => { setCanonicalType(e.target.value as PickableType); resetEntity() }}
            className={inp}
          >
            {PICKABLE_TYPES.map(t => (
              <option key={t} value={t}>{TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-white/50 mb-1">Сущность *</label>
          <EntityPicker
            pool={pool}
            text={entityText}
            selectedId={canonicalId}
            onText={t => { setEntityText(t); setCanonicalId('') }}
            onSelect={(id, name) => { setCanonicalId(id); setEntityText(name) }}
          />
        </div>

        <div>
          <label className="block text-xs text-white/50 mb-1">Исходная форма *</label>
          <input
            value={surfaceRaw}
            onChange={e => setSurfaceRaw(e.target.value)}
            placeholder="напр. ЭВ №3"
            className={inp}
          />
        </div>

        <div>
          <label className="block text-xs text-white/50 mb-1">Вес</label>
          <input
            type="number"
            min={0}
            step={1}
            value={weight}
            onChange={e => setWeight(e.target.value)}
            className={inp}
          />
        </div>

        <div>
          <label className="block text-xs text-white/50 mb-1">Область — объект (v3.0: без эффекта)</label>
          <select value={scopeObjectId} onChange={e => setScopeObjectId(e.target.value)} className={inp}>
            <option value="">— нет —</option>
            {objects.map(o => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="mt-3 px-3 py-2 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-2 mt-4">
        <button
          onClick={submit}
          disabled={!canSubmit}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium disabled:opacity-40"
        >
          {saving ? '…' : 'Создать'}
        </button>
      </div>
    </div>
  )
}

// Free-text-plus-suggest entity picker, mirroring the ObjectCombobox pattern:
// type to filter, click a suggestion to bind an id; an unbound text is not a
// valid canonical (unlike ObjectCombobox there is no "create new" affordance
// here — aliases only ever point at existing catalog rows).
function EntityPicker({
  pool,
  text,
  selectedId,
  onText,
  onSelect,
}: {
  pool: { id: string; name: string }[]
  text: string
  selectedId: string
  onText: (t: string) => void
  onSelect: (id: string, name: string) => void
}) {
  const [open, setOpen] = useState(false)

  const matches = useMemo(() => {
    const q = softFold(text)
    if (!q) return pool.slice(0, 8)
    return pool.filter(p => softFold(p.name).includes(q)).slice(0, 8)
  }, [pool, text])

  return (
    <div className="relative">
      <input
        value={text}
        onChange={e => { onText(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        placeholder="введите название и выберите…"
        className={`form-select w-full text-sm px-3 py-2 ${selectedId ? '' : 'border-amber-500/40'}`}
      />
      {open && matches.length > 0 && (
        <div className="absolute z-20 mt-1 w-full glass-popup rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
          {matches.map(m => (
            <button
              key={m.id}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => { onSelect(m.id, m.name); setOpen(false) }}
              className={`w-full text-left px-3 py-2 text-sm text-white/80 hover:bg-white/10 transition-colors ${
                selectedId === m.id ? 'bg-white/10' : ''
              }`}
            >
              {m.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
