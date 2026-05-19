'use client'
import { useState, useEffect } from 'react'
import { fetchProfessions, transferEmployee } from '@/lib/api-client'
import type { Profession } from '@/types'

interface Props {
  userId: string
  employeeName: string
  currentUserId: string
  onClose: () => void
  onSuccess: () => void
}

const CHANGE_REASONS = [
  { value: 'перевод', label: 'Перевод' },
  { value: 'повышение', label: 'Повышение' },
  { value: 'понижение', label: 'Понижение' },
  { value: 'совмещение', label: 'Совмещение' },
] as const

export default function TransferModal({
  userId,
  employeeName,
  currentUserId,
  onClose,
  onSuccess,
}: Props) {
  const [professions, setProfessions] = useState<Profession[]>([])
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [professionId, setProfessionId] = useState('')
  const [changeReason, setChangeReason] = useState<string>('перевод')
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchProfessions().then(profs => {
      setProfessions(profs)
      if (profs.length > 0) setProfessionId(profs[0].id)
      setLoadingOptions(false)
    })
  }, [])

  const handleConfirm = async () => {
    if (!professionId || !changeReason || !transferDate) {
      setError('Заполните все поля')
      return
    }
    setSaving(true)
    setError(null)
    const ok = await transferEmployee(userId, professionId, changeReason, transferDate, currentUserId)
    setSaving(false)
    if (!ok) {
      setError('Не удалось выполнить перевод. Попробуйте снова.')
      return
    }
    onSuccess()
    onClose()
  }

  const inputClass = "form-input w-full text-sm px-3 py-2"
  const selClass   = "form-select w-full text-sm px-3 py-2"
  const labelClass = "block text-xs text-white/40 mb-1"

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="glass-popup rounded-xl p-6 max-w-lg w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-blue-400">Перевод сотрудника</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white/80 text-xl leading-none transition-colors">✕</button>
        </div>

        <p className="text-white/70 font-medium mb-5">{employeeName}</p>

        {loadingOptions ? (
          <div className="text-center text-white/30 py-8">Загрузка...</div>
        ) : (
          <div className="space-y-4">
            {/* New profession */}
            <div>
              <label className={labelClass}>Новая должность *</label>
              <select
                className={selClass}
                value={professionId}
                onChange={e => setProfessionId(e.target.value)}
              >
                {professions.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.grade ? ` ${p.grade}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Change reason */}
            <div>
              <label className={labelClass}>Основание *</label>
              <select
                className={selClass}
                value={changeReason}
                onChange={e => setChangeReason(e.target.value)}
              >
                {CHANGE_REASONS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            {/* Transfer date */}
            <div>
              <label className={labelClass}>Дата перевода</label>
              <input
                type="date"
                className={inputClass}
                value={transferDate}
                onChange={e => setTransferDate(e.target.value)}
              />
            </div>

            {error && (
              <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 py-2 rounded-lg bg-white/5 border border-white/10 text-white/40 hover:bg-white/10 text-sm transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleConfirm}
                disabled={saving}
                className="flex-1 py-2 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {saving ? 'Перевод...' : 'Перевести'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
