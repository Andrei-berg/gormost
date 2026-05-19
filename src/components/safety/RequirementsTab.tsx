'use client'
import { useState } from 'react'
import type { CertType, CertRequirement, Service, RoleLevel } from '@/types'
import { CERT_CATEGORY_CONFIG } from '@/types'
import { upsertCertRequirement, deleteCertRequirement } from '@/lib/api-client'

interface Props {
  certTypes: CertType[]
  requirements: CertRequirement[]
  services: Service[]
  onRefresh: () => void
}

// Roles that typically need safety certs
const ROLES: { value: RoleLevel; label: string }[] = [
  { value: 'WORKER', label: 'Рабочий' },
  { value: 'FOREMAN', label: 'Мастер/Бригадир' },
  { value: 'ZAMPORAB', label: 'Зам.прораба' },
  { value: 'HEAD', label: 'Начальник службы' },
  { value: 'CHIEF_ENGINEER', label: 'Главный инженер' },
  { value: 'SPECIALIST', label: 'Специалист' },
  { value: 'DRIVER', label: 'Водитель' },
  { value: 'DISPATCHER', label: 'Диспетчер' },
  { value: 'TRANSPORT', label: 'Транспорт' },
]

const EMPTY_REQ: Partial<CertRequirement> = {
  cert_type_id: '', role_level: null, service_id: null, position_pattern: null, notes: null,
}

export default function RequirementsTab({ certTypes, requirements, services, onRefresh }: Props) {
  const [editing, setEditing] = useState<Partial<CertRequirement> | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Group requirements by cert type for display
  const grouped = certTypes
    .filter((ct) => ct.is_active)
    .map((ct) => ({
      certType: ct,
      reqs: requirements.filter((r) => r.cert_type_id === ct.id),
    }))
    .filter((g) => g.reqs.length > 0 || false)

  const allWithReqs = requirements.length

  async function handleSave() {
    if (!editing?.cert_type_id) return
    setSaving(true)
    await upsertCertRequirement(editing)
    setSaving(false)
    setEditing(null)
    onRefresh()
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    await deleteCertRequirement(id)
    setDeleting(null)
    onRefresh()
  }

  function describeReq(req: CertRequirement): string {
    const parts: string[] = []
    if (req.role_level) parts.push(ROLES.find((r) => r.value === req.role_level)?.label ?? req.role_level)
    if (req.service_id) parts.push(services.find((s) => s.service_id === req.service_id)?.service_name ?? req.service_id)
    if (req.position_pattern) parts.push(`должность: ${req.position_pattern}`)
    if (req.notes) parts.push(req.notes)
    return parts.join(' · ') || '(все)'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-white/40">
          {allWithReqs} правил — определяют кому какой допуск обязателен
        </p>
        <button
          onClick={() => setEditing({ ...EMPTY_REQ })}
          className="bg-rose-600 hover:bg-rose-500 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
        >
          + Добавить правило
        </button>
      </div>

      {requirements.length === 0 ? (
        <div className="glass-strong rounded-2xl p-12 text-center">
          <p className="text-white/30 mb-2">Правила не настроены</p>
          <p className="text-xs text-white/20">Правила определяют кому автоматически требуется тот или иной вид допуска/аттестации</p>
        </div>
      ) : (
        <div className="glass-strong rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-white/60 font-medium">Вид допуска</th>
                <th className="text-left py-3 px-3 text-white/60 font-medium">Кому требуется</th>
                <th className="py-3 px-3" />
              </tr>
            </thead>
            <tbody>
              {requirements.map((req) => {
                const ct = certTypes.find((c) => c.id === req.cert_type_id)
                return (
                  <tr key={req.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                    <td className="py-2.5 px-4">
                      {ct ? (
                        <div>
                          <span className="mr-1">{CERT_CATEGORY_CONFIG[ct.cert_category].emoji}</span>
                          <span className="text-white/90">{ct.name}</span>
                        </div>
                      ) : (
                        <span className="text-white/30">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-white/60 text-xs">{describeReq(req)}</td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditing({ ...req })}
                          className="text-xs text-white/40 hover:text-white px-2 py-1 rounded-lg hover:bg-white/5 transition-all"
                        >
                          Изменить
                        </button>
                        <button
                          onClick={() => handleDelete(req.id)}
                          disabled={deleting === req.id}
                          className="text-xs text-red-400/50 hover:text-red-400 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-all"
                        >
                          {deleting === req.id ? '…' : 'Удалить'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-strong rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">Правило требования</h2>
              <button onClick={() => setEditing(null)} className="text-white/30 hover:text-white text-2xl leading-none">×</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-white/50 mb-1">Вид допуска/аттестации *</label>
                <select
                  value={editing.cert_type_id}
                  onChange={(e) => setEditing({ ...editing, cert_type_id: e.target.value })}
                  className="form-select w-full"
                >
                  <option value="">— выберите —</option>
                  {certTypes.filter((c) => c.is_active).map((ct) => (
                    <option key={ct.id} value={ct.id}>
                      {CERT_CATEGORY_CONFIG[ct.cert_category].emoji} {ct.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-white/50 mb-1">Применяется к роли</label>
                <select
                  value={editing.role_level ?? ''}
                  onChange={(e) => setEditing({ ...editing, role_level: e.target.value || null })}
                  className="form-select w-full"
                >
                  <option value="">— любая роль —</option>
                  {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs text-white/50 mb-1">Применяется к службе</label>
                <select
                  value={editing.service_id ?? ''}
                  onChange={(e) => setEditing({ ...editing, service_id: e.target.value || null })}
                  className="form-select w-full"
                >
                  <option value="">— любая служба —</option>
                  {services.map((s) => <option key={s.service_id} value={s.service_id}>{s.service_name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs text-white/50 mb-1">
                  Фильтр по должности (часть названия)
                </label>
                <input
                  value={editing.position_pattern ?? ''}
                  onChange={(e) => setEditing({ ...editing, position_pattern: e.target.value || null })}
                  className="form-input w-full" placeholder="электрик, сварщик, стропальщик…"
                />
              </div>

              <div>
                <label className="block text-xs text-white/50 mb-1">Примечание</label>
                <input
                  value={editing.notes ?? ''}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value || null })}
                  className="form-input w-full"
                />
              </div>
            </div>

            <p className="text-xs text-white/30 mt-4">
              Правило сработает для сотрудников, у которых совпадают все заполненные условия (AND).
            </p>

            <div className="flex gap-3 mt-5">
              <button
                onClick={handleSave} disabled={saving || !editing.cert_type_id}
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
