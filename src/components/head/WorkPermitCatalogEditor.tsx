'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AuthSession, Service, WorkPermitType, WorkPermitServiceType } from '@/types'
import {
  fetchWorkPermitTypes, fetchWorkPermitServiceTypes,
  setServiceWorkPermitType, removeServiceWorkPermitType, createWorkPermitType,
} from '@/lib/api-client'

interface Props {
  session: AuthSession
  services: Service[]
}

// Per-service curation of the work-permit catalog: enable/remove types for a
// service, override their wording, or create a new type. Global hard-delete is
// out of scope here (ОТ/админ via DB).
export default function WorkPermitCatalogEditor({ session, services }: Props) {
  const [open, setOpen]       = useState(false)
  const [serviceId, setSvc]   = useState<string>(session.service_id ?? services[0]?.service_id ?? '')
  const [types, setTypes]     = useState<WorkPermitType[]>([])
  const [links, setLinks]     = useState<WorkPermitServiceType[]>([])
  const [loadedFor, setLoadedFor] = useState<string | null>(null)
  const [busy, setBusy]       = useState<string | null>(null)

  const apply = useCallback((t: WorkPermitType[], l: WorkPermitServiceType[]) => {
    setTypes(t); setLinks(l); setLoadedFor(serviceId)
  }, [serviceId])

  // Reload used by mutations (event handlers — fine to setState).
  const load = useCallback(async () => {
    if (!serviceId) return
    const [t, l] = await Promise.all([fetchWorkPermitTypes(), fetchWorkPermitServiceTypes(serviceId)])
    apply(t, l)
  }, [serviceId, apply])

  // Effect loads inline (setState only inside .then, after await) so it does not
  // trigger set-state-synchronously-in-effect.
  useEffect(() => {
    if (!open || !serviceId) return
    let alive = true
    Promise.all([fetchWorkPermitTypes(), fetchWorkPermitServiceTypes(serviceId)]).then(([t, l]) => {
      if (alive) apply(t, l)
    })
    return () => { alive = false }
  }, [open, serviceId, apply])

  const loading = open && loadedFor !== serviceId

  const linkByType = useMemo(() => new Map(links.map(l => [l.type_id, l])), [links])
  const enabled   = types.filter(t => linkByType.get(t.id)?.enabled)
  const available = types.filter(t => !linkByType.get(t.id)?.enabled)

  const addToService = async (t: WorkPermitType) => {
    setBusy(t.id)
    await setServiceWorkPermitType({
      service_id: serviceId, type_id: t.id, enabled: true,
      factors_override: null, instruction_nums_override: null, during_measure_2_override: null,
      sort_order: t.sort_order,
    })
    await load()
    setBusy(null)
  }

  const removeFromService = async (typeId: string) => {
    setBusy(typeId)
    await removeServiceWorkPermitType(serviceId, typeId)
    await load()
    setBusy(null)
  }

  const saveOverride = async (t: WorkPermitType, ov: Partial<WorkPermitServiceType>) => {
    setBusy(t.id)
    const link = linkByType.get(t.id)
    await setServiceWorkPermitType({
      service_id: serviceId, type_id: t.id, enabled: true,
      factors_override: ov.factors_override ?? null,
      instruction_nums_override: ov.instruction_nums_override ?? null,
      during_measure_2_override: ov.during_measure_2_override ?? null,
      sort_order: link?.sort_order ?? t.sort_order,
    })
    await load()
    setBusy(null)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-white/60 hover:bg-white/[0.08] hover:text-white/90 transition-all"
        title="Виды работ для наряда-допуска"
      >
        ⚙ Виды работ
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative z-10 w-full max-w-2xl max-h-[88vh] flex flex-col bg-[rgba(15,20,40,0.97)] border border-white/15 rounded-2xl shadow-2xl overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div>
                <div className="text-sm font-bold text-white">⚙ Каталог видов работ — наряд-допуск</div>
                <div className="text-[11px] text-white/40 mt-0.5">Курирование по службе: включить, убрать, переопределить формулировки</div>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/30 hover:text-white text-lg transition-colors">✕</button>
            </div>

            {/* Service picker */}
            <div className="px-5 pt-4">
              <label className="block text-[10px] text-white/40 uppercase tracking-wider mb-1.5">Служба</label>
              <select
                value={serviceId}
                onChange={e => setSvc(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
              >
                {services.map(s => <option key={s.service_id} value={s.service_id}>{s.service_name}</option>)}
              </select>
            </div>

            <div className="px-5 py-4 space-y-5 overflow-y-auto flex-1 min-h-0">
              {loading && <div className="text-center text-white/30 py-8 text-sm">Загрузка…</div>}

              {!loading && (
                <>
                  {/* Enabled types */}
                  <section>
                    <div className="text-[10px] text-emerald-400/80 uppercase tracking-wider mb-2">
                      Включённые виды ({enabled.length})
                    </div>
                    {enabled.length === 0 && (
                      <div className="text-[12px] text-white/30 italic py-2">Нет включённых видов. Добавьте из каталога ниже.</div>
                    )}
                    <div className="space-y-2">
                      {enabled.map(t => (
                        <EnabledRow
                          key={t.id} type={t} link={linkByType.get(t.id)!}
                          busy={busy === t.id}
                          onRemove={() => removeFromService(t.id)}
                          onSave={ov => saveOverride(t, ov)}
                        />
                      ))}
                    </div>
                  </section>

                  {/* Available catalog types */}
                  {available.length > 0 && (
                    <section>
                      <div className="text-[10px] text-white/40 uppercase tracking-wider mb-2">
                        Доступно в каталоге ({available.length})
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {available.map(t => (
                          <button
                            key={t.id}
                            disabled={busy === t.id}
                            onClick={() => addToService(t)}
                            className="px-2.5 py-1 rounded-lg text-xs border border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/90 transition-all disabled:opacity-50"
                          >
                            + {t.label}
                          </button>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Create new type */}
                  <CreateTypeForm
                    onCreate={async draft => {
                      const created = await createWorkPermitType(draft)
                      if (created) await addToService(created)
                    }}
                  />
                </>
              )}
            </div>

            <div className="px-5 py-3 border-t border-white/8 text-[10px] text-white/25">
              № инструкций — из внутреннего реестра службы. Факторы — типовой дефолт, правьте под себя.
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Enabled type row with collapsible overrides ─────────────────────────────
function EnabledRow({ type, link, busy, onRemove, onSave }: {
  type: WorkPermitType
  link: WorkPermitServiceType
  busy: boolean
  onRemove: () => void
  onSave: (ov: Partial<WorkPermitServiceType>) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [factors, setFactors] = useState(link.factors_override ?? type.factors)
  const [instr, setInstr]     = useState(link.instruction_nums_override ?? type.instruction_nums)
  const [during, setDuring]   = useState(link.during_measure_2_override ?? type.during_measure_2)

  // store override only when it differs from the catalog default
  const ovOrNull = (val: string, def: string) => (val.trim() && val.trim() !== def.trim() ? val.trim() : null)
  const hasOverride = link.factors_override || link.instruction_nums_override || link.during_measure_2_override

  const ta = 'w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/50'
  const lbl = 'block text-[10px] text-white/40 mb-1'

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03]">
      <div className="flex items-center gap-2 px-3 py-2">
        <button onClick={() => setExpanded(e => !e)} className="flex-1 text-left text-sm text-white/85 flex items-center gap-2">
          <span className="text-white/30 text-xs">{expanded ? '▾' : '▸'}</span>
          {type.label}
          {hasOverride && <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/20">правлено</span>}
        </button>
        <button
          onClick={onRemove} disabled={busy}
          className="text-[11px] text-white/40 hover:text-red-400 transition-colors disabled:opacity-50"
        >
          убрать
        </button>
      </div>

      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-white/[0.06] pt-2">
          <div>
            <label className={lbl}>Опасные факторы</label>
            <textarea value={factors} onChange={e => setFactors(e.target.value)} rows={2} className={ta} />
          </div>
          <div>
            <label className={lbl}>№ инструкций</label>
            <input value={instr} onChange={e => setInstr(e.target.value)} placeholder="напр. 10, 14, 65…" className={ta} />
          </div>
          <div>
            <label className={lbl}>Мера «в процессе» (СИЗ)</label>
            <textarea value={during} onChange={e => setDuring(e.target.value)} rows={2} className={ta} />
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => onSave({
                factors_override: ovOrNull(factors, type.factors),
                instruction_nums_override: ovOrNull(instr, type.instruction_nums),
                during_measure_2_override: ovOrNull(during, type.during_measure_2),
              })}
              disabled={busy}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-all disabled:opacity-50"
            >
              {busy ? '…' : 'Сохранить'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Create new catalog type ─────────────────────────────────────────────────
function CreateTypeForm({ onCreate }: { onCreate: (draft: Partial<WorkPermitType>) => Promise<void> }) {
  const [openForm, setOpenForm] = useState(false)
  const [label, setLabel]   = useState('')
  const [factors, setFactors] = useState('')
  const [instr, setInstr]   = useState('')
  const [road, setRoad]     = useState(false)
  const [during, setDuring] = useState('Соблюдать технологию выполнения работ.')
  const [saving, setSaving] = useState(false)

  const slug = () => 'wt_' + Math.random().toString(36).slice(2, 9)
  const ta = 'w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/50'
  const lbl = 'block text-[10px] text-white/40 mb-1'

  const submit = async () => {
    if (!label.trim()) return
    setSaving(true)
    await onCreate({
      id: slug(), label: label.trim(), factors: factors.trim(),
      instruction_nums: instr.trim(), is_road_work: road, during_measure_2: during.trim(),
    })
    setSaving(false)
    setOpenForm(false)
    setLabel(''); setFactors(''); setInstr(''); setRoad(false)
    setDuring('Соблюдать технологию выполнения работ.')
  }

  if (!openForm) {
    return (
      <button
        onClick={() => setOpenForm(true)}
        className="w-full py-2 rounded-xl border border-dashed border-white/15 text-xs text-white/50 hover:text-white/80 hover:border-white/30 transition-all"
      >
        + Создать новый вид работ
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-white/12 bg-white/[0.03] p-3 space-y-2">
      <div className="text-[10px] text-white/50 uppercase tracking-wider">Новый вид работ</div>
      <div>
        <label className={lbl}>Название *</label>
        <input value={label} onChange={e => setLabel(e.target.value)} placeholder="напр. Работы в коллекторе" className={ta} />
      </div>
      <div>
        <label className={lbl}>Опасные факторы</label>
        <textarea value={factors} onChange={e => setFactors(e.target.value)} rows={2} className={ta} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={lbl}>№ инструкций</label>
          <input value={instr} onChange={e => setInstr(e.target.value)} className={ta} />
        </div>
        <label className="flex items-center gap-2 text-xs text-white/60 mt-5">
          <input type="checkbox" checked={road} onChange={e => setRoad(e.target.checked)} />
          Работы на проезжей части
        </label>
      </div>
      <div>
        <label className={lbl}>Мера «в процессе» (СИЗ)</label>
        <textarea value={during} onChange={e => setDuring(e.target.value)} rows={2} className={ta} />
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={() => setOpenForm(false)} className="px-3 py-1.5 rounded-lg text-xs text-white/50 hover:text-white/80">Отмена</button>
        <button
          onClick={submit} disabled={saving || !label.trim()}
          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-all disabled:opacity-40"
        >
          {saving ? '…' : 'Создать и включить'}
        </button>
      </div>
    </div>
  )
}
