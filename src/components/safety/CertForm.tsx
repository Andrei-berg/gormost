'use client'
import { useState, useEffect } from 'react'
import type { CertType, EmployeeCert, User, RenewalType, ReturnStatus } from '@/types'
import { upsertLinkedCert, deleteEmployeeCert } from '@/lib/api'

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

const RENEWAL_OPTIONS: { value: RenewalType; label: string }[] = [
  { value: 'первичное',  label: 'Первичное' },
  { value: 'очередное',  label: 'Очередное' },
  { value: 'повторное',  label: 'Повторное' },
  { value: 'бессрочное', label: 'Бессрочное' },
]

const RETURN_OPTIONS: { value: ReturnStatus; label: string }[] = [
  { value: 'сдал',    label: 'Сдал удостоверение' },
  { value: 'не сдал', label: 'Не сдал' },
  { value: 'забрал',  label: 'Забрал обратно' },
]

export default function CertForm({ employee, certType, existing, createdBy, onClose, onSaved, onDeleted }: Props) {
  const [issuedAt, setIssuedAt]       = useState(existing?.issued_at ?? new Date().toISOString().split('T')[0])
  const [expiresAt, setExpiresAt]     = useState(existing?.expires_at ?? '')
  const [isIndefinite, setIsIndefin]  = useState(existing?.is_indefinite ?? false)
  const [docNumber, setDocNumber]     = useState(existing?.doc_number ?? '')
  const [protocol, setProtocol]       = useState(existing?.protocol_number ?? '')
  const [obPaDate, setObPaDate]       = useState(existing?.ob_pa_date ?? '')
  const [renewal, setRenewal]         = useState<RenewalType | ''>(existing?.renewal_type ?? '')
  const [returnSt, setReturnSt]       = useState<ReturnStatus | ''>(existing?.return_status ?? '')
  const [issuer, setIssuer]           = useState(existing?.issuer ?? '')
  const [notes, setNotes]             = useState(existing?.notes ?? '')
  const [saving, setSaving]           = useState(false)
  const [deleting, setDeleting]       = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Auto-fill expires_at when issued_at changes and period is known
  useEffect(() => {
    if (!isIndefinite && certType.period_months && issuedAt) {
      setExpiresAt(addMonths(new Date(issuedAt), certType.period_months))
    }
    if (isIndefinite) {
      setExpiresAt('')
    }
  }, [issuedAt, certType.period_months, isIndefinite])

  async function handleSave() {
    setSaving(true)
    const result = await upsertLinkedCert({
      id: existing?.id,
      employee_id: employee.user_id,
      cert_type_id: certType.id,
      issued_at: issuedAt || null,
      expires_at: isIndefinite ? null : (expiresAt || null),
      is_indefinite: isIndefinite,
      doc_number: docNumber || null,
      protocol_number: protocol || null,
      ob_pa_date: obPaDate || null,
      renewal_type: (renewal as RenewalType) || null,
      return_status: (returnSt as ReturnStatus) || null,
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
      <div className="glass-strong rounded-2xl p-6 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-white">{certType.name}</h2>
            <p className="text-sm text-white/50">{employee.full_name}</p>
            {certType.period_note && (
              <p className="text-xs text-white/30 mt-0.5">
                Срок: {certType.period_note}
                {certType.target_group && ` · ${certType.target_group}`}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white text-2xl leading-none ml-4">×</button>
        </div>

        <div className="space-y-4">
          {/* Indefinite toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setIsIndefin(v => !v)}
              className={`w-10 h-5 rounded-full transition-colors relative ${isIndefinite ? 'bg-emerald-500' : 'bg-white/20'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${isIndefinite ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-sm text-white/80">
              Бессрочно
              <span className="ml-1 text-white/30 text-xs">∞ — срок не ограничен</span>
            </span>
          </label>

          {/* Dates row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/50 mb-1">Дата выдачи</label>
              <input
                type="date" value={issuedAt ?? ''} onChange={(e) => setIssuedAt(e.target.value)}
                className="form-input w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">
                Действителен до
                {certType.period_months && !isIndefinite && (
                  <span className="ml-1 text-white/30">({certType.period_note})</span>
                )}
              </label>
              <input
                type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)}
                disabled={isIndefinite}
                className="form-input w-full disabled:opacity-30"
                placeholder={isIndefinite ? '∞ бессрочно' : ''}
              />
            </div>
          </div>

          {/* Doc number + Protocol */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/50 mb-1">№ удостоверения</label>
              <input
                type="text" value={docNumber} onChange={(e) => setDocNumber(e.target.value)}
                className="form-input w-full" placeholder="691-02"
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">№ протокола</label>
              <input
                type="text" value={protocol} onChange={(e) => setProtocol(e.target.value)}
                className="form-input w-full" placeholder="82/25"
              />
            </div>
          </div>

          {/* Renewal type + Return status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/50 mb-1">Вид обучения</label>
              <select value={renewal} onChange={(e) => setRenewal(e.target.value as RenewalType | '')} className="form-select w-full">
                <option value="">— не указано</option>
                {RENEWAL_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Удостоверение</label>
              <select value={returnSt} onChange={(e) => setReturnSt(e.target.value as ReturnStatus | '')} className="form-select w-full">
                <option value="">— на руках</option>
                {RETURN_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* OB/PA date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/50 mb-1">
                Плановый ОБ / ПА
                <span className="ml-1 text-white/20 text-[10px]">обучение / проверка аттестации</span>
              </label>
              <input
                type="date" value={obPaDate} onChange={(e) => setObPaDate(e.target.value)}
                className="form-input w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Кем выдано</label>
              <input
                type="text" value={issuer} onChange={(e) => setIssuer(e.target.value)}
                className="form-input w-full" placeholder="Ростехнадзор, комиссия…"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs text-white/50 mb-1">Примечание</label>
            <input
              type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
              className="form-input w-full" placeholder="Группа допуска, категория, особые условия…"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={handleSave} disabled={saving}
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
