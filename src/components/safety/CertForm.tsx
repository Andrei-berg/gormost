'use client'
import { useState, useEffect } from 'react'
import type { CertType, EmployeeCert, User } from '@/types'
import { upsertEmployeeCert, deleteEmployeeCert } from '@/lib/api'

interface Props {
  employee: User
  certType: CertType
  existing: EmployeeCert | null
  createdBy: string
  onClose: () => void
  onSaved: (cert: EmployeeCert) => void
  onDeleted: () => void
}

function addMonths(date: Date, months: number): string {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().split('T')[0]
}

export default function CertForm({ employee, certType, existing, createdBy, onClose, onSaved, onDeleted }: Props) {
  const [issuedAt, setIssuedAt] = useState(existing?.issued_at ?? new Date().toISOString().split('T')[0])
  const [expiresAt, setExpiresAt] = useState(existing?.expires_at ?? '')
  const [docNumber, setDocNumber] = useState(existing?.doc_number ?? '')
  const [issuer, setIssuer] = useState(existing?.issuer ?? '')
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Auto-fill expires_at when issued_at changes and period is known
  useEffect(() => {
    if (certType.period_months && issuedAt) {
      setExpiresAt(addMonths(new Date(issuedAt), certType.period_months))
    }
  }, [issuedAt, certType.period_months])

  async function handleSave() {
    setSaving(true)
    const result = await upsertEmployeeCert({
      id: existing?.id,
      employee_id: employee.user_id,
      cert_type_id: certType.id,
      issued_at: issuedAt,
      expires_at: expiresAt || null,
      doc_number: docNumber || null,
      issuer: issuer || null,
      notes: notes || null,
      created_by: createdBy,
    })
    setSaving(false)
    if (result) onSaved(result)
  }

  async function handleDelete() {
    if (!existing) return
    setDeleting(true)
    await deleteEmployeeCert(existing.id)
    setDeleting(false)
    onDeleted()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass-strong rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-white">{certType.name}</h2>
            <p className="text-sm text-white/50">{employee.full_name}</p>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white text-2xl leading-none">×</button>
        </div>

        <div className="space-y-4">
          {/* Dates row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/50 mb-1">Дата выдачи</label>
              <input
                type="date" value={issuedAt} onChange={(e) => setIssuedAt(e.target.value)}
                className="form-input w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">
                Срок действия
                {certType.period_months && (
                  <span className="ml-1 text-white/30">({certType.period_note})</span>
                )}
              </label>
              <input
                type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)}
                className="form-input w-full"
                placeholder={certType.period_months ? 'Авто' : 'Бессрочно'}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-white/50 mb-1">Номер документа</label>
            <input
              type="text" value={docNumber} onChange={(e) => setDocNumber(e.target.value)}
              className="form-input w-full" placeholder="№ удостоверения / протокола"
            />
          </div>

          <div>
            <label className="block text-xs text-white/50 mb-1">Кем выдано</label>
            <input
              type="text" value={issuer} onChange={(e) => setIssuer(e.target.value)}
              className="form-input w-full" placeholder="Ростехнадзор, внутренняя комиссия…"
            />
          </div>

          <div>
            <label className="block text-xs text-white/50 mb-1">Примечание</label>
            <input
              type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
              className="form-input w-full" placeholder="Группа допуска, категория и т.д."
            />
          </div>
        </div>

        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={handleSave} disabled={saving || !issuedAt}
            className="flex-1 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-semibold py-2.5 rounded-xl transition-colors"
          >
            {saving ? 'Сохранение…' : existing ? 'Сохранить' : 'Добавить'}
          </button>
          {existing && !confirmDelete && (
            <button
              onClick={() => setConfirmDelete(true)}
              className="px-4 py-2.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors text-sm"
            >
              Удалить
            </button>
          )}
          {confirmDelete && (
            <button
              onClick={handleDelete} disabled={deleting}
              className="px-4 py-2.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 transition-colors text-sm font-semibold"
            >
              {deleting ? '…' : 'Точно удалить?'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
