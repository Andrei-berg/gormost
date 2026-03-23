'use client'
import { useState } from 'react'
import type { CertType, CertCategory } from '@/types'
import { CERT_CATEGORY_CONFIG } from '@/types'
import { upsertCertType, deleteCertType } from '@/lib/api'

interface Props {
  certTypes: CertType[]
  onRefresh: () => void
}

const CATEGORIES: CertCategory[] = ['Обучение', 'Аттестация', 'Допуск', 'Удостоверение']

const EMPTY: Partial<CertType> = {
  code: '', name: '', cert_category: 'Обучение',
  period_months: 12, period_note: '1 год', target_group: '', notes: '', is_active: true, sort_order: 0,
}

export default function CatalogTab({ certTypes, onRefresh }: Props) {
  const [editing, setEditing] = useState<Partial<CertType> | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [showInactive, setShowInactive] = useState(false)

  const visible = showInactive ? certTypes : certTypes.filter((c) => c.is_active)

  async function handleSave() {
    if (!editing || !editing.name || !editing.code) return
    setSaving(true)
    await upsertCertType(editing)
    setSaving(false)
    setEditing(null)
    onRefresh()
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    await deleteCertType(id)
    setDeleting(null)
    onRefresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-white/50 cursor-pointer select-none">
            <input
              type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded"
            />
            Показать неактивные
          </label>
        </div>
        <button
          onClick={() => setEditing({ ...EMPTY, sort_order: certTypes.length + 1 })}
          className="bg-rose-600 hover:bg-rose-500 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
        >
          + Добавить вид
        </button>
      </div>

      <div className="glass-strong rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 px-4 text-white/60 font-medium">#</th>
              <th className="text-left py-3 px-4 text-white/60 font-medium">Вид</th>
              <th className="text-left py-3 px-3 text-white/60 font-medium">Тип</th>
              <th className="text-left py-3 px-3 text-white/60 font-medium">Периодичность</th>
              <th className="text-left py-3 px-3 text-white/60 font-medium">Кому</th>
              <th className="py-3 px-3" />
            </tr>
          </thead>
          <tbody>
            {visible.map((ct) => (
              <tr key={ct.id} className={`border-b border-white/5 hover:bg-white/3 transition-colors ${!ct.is_active ? 'opacity-40' : ''}`}>
                <td className="py-2.5 px-4 text-white/30 text-xs">{ct.sort_order}</td>
                <td className="py-2.5 px-4">
                  <div className="font-medium text-white/90">{ct.name}</div>
                  <div className="text-[11px] text-white/30">{ct.code}</div>
                </td>
                <td className="py-2.5 px-3">
                  <span className={`text-xs ${CERT_CATEGORY_CONFIG[ct.cert_category].color}`}>
                    {CERT_CATEGORY_CONFIG[ct.cert_category].emoji} {ct.cert_category}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-white/60 text-xs">{ct.period_note ?? '—'}</td>
                <td className="py-2.5 px-3 text-white/50 text-xs max-w-[160px] truncate">{ct.target_group ?? '—'}</td>
                <td className="py-2.5 px-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setEditing({ ...ct })}
                      className="text-xs text-white/40 hover:text-white px-2 py-1 rounded-lg hover:bg-white/5 transition-all"
                    >
                      Изменить
                    </button>
                    <button
                      onClick={() => handleDelete(ct.id)}
                      disabled={deleting === ct.id}
                      className="text-xs text-red-400/50 hover:text-red-400 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-all"
                    >
                      {deleting === ct.id ? '…' : 'Удалить'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-strong rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">{editing.id ? 'Изменить вид' : 'Новый вид'}</h2>
              <button onClick={() => setEditing(null)} className="text-white/30 hover:text-white text-2xl leading-none">×</button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-white/50 mb-1">Код *</label>
                  <input
                    value={editing.code ?? ''} onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase() })}
                    className="form-input w-full" placeholder="OT, PTM, HEIGHT…"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1">Тип *</label>
                  <select
                    value={editing.cert_category}
                    onChange={(e) => setEditing({ ...editing, cert_category: e.target.value as CertCategory })}
                    className="form-select w-full"
                  >
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-white/50 mb-1">Название *</label>
                <input
                  value={editing.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="form-input w-full" placeholder="Охрана труда"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-white/50 mb-1">Период (мес.)</label>
                  <input
                    type="number" min={0} value={editing.period_months ?? ''}
                    onChange={(e) => setEditing({ ...editing, period_months: e.target.value ? Number(e.target.value) : null })}
                    className="form-input w-full" placeholder="12 / пусто = нет срока"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1">Период (текст)</label>
                  <input
                    value={editing.period_note ?? ''} onChange={(e) => setEditing({ ...editing, period_note: e.target.value })}
                    className="form-input w-full" placeholder="1 год, По закону"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-white/50 mb-1">Кому требуется</label>
                <input
                  value={editing.target_group ?? ''} onChange={(e) => setEditing({ ...editing, target_group: e.target.value })}
                  className="form-input w-full" placeholder="Все сотрудники"
                />
              </div>

              <div>
                <label className="block text-xs text-white/50 mb-1">Примечание</label>
                <input
                  value={editing.notes ?? ''} onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                  className="form-input w-full" placeholder="Ростехнадзор, обязательно…"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-white/50 mb-1">Порядок</label>
                  <input
                    type="number" value={editing.sort_order ?? 0}
                    onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })}
                    className="form-input w-full"
                  />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 text-sm text-white/60 cursor-pointer select-none">
                    <input
                      type="checkbox" checked={editing.is_active ?? true}
                      onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                      className="rounded"
                    />
                    Активен
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={handleSave} disabled={saving || !editing.name || !editing.code}
                className="flex-1 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-semibold py-2.5 rounded-xl transition-colors"
              >
                {saving ? 'Сохранение…' : 'Сохранить'}
              </button>
              <button onClick={() => setEditing(null)} className="px-5 py-2.5 rounded-xl border border-white/10 text-white/50 hover:text-white hover:bg-white/5 transition-all text-sm">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
