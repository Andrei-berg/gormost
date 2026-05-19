'use client'
import { useState } from 'react'
import { fireEmployee } from '@/lib/api-client'

interface Props {
  userId: string
  employeeName: string
  currentUserId: string
  onClose: () => void
  onSuccess: () => void
}

export default function DismissModal({
  userId,
  employeeName,
  currentUserId,
  onClose,
  onSuccess,
}: Props) {
  const [dateFired, setDateFired] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async () => {
    if (!dateFired) return
    setSaving(true)
    setError(null)
    const ok = await fireEmployee(userId, dateFired, currentUserId)
    setSaving(false)
    if (!ok) {
      setError('Не удалось уволить сотрудника. Попробуйте снова.')
      return
    }
    onSuccess()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-red-400">Уволить сотрудника</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white/80 text-xl leading-none transition-colors">✕</button>
        </div>

        <div className="mb-4">
          <p className="text-white/80 font-medium mb-2">{employeeName}</p>
          <p className="text-sm text-white/40">
            Сотрудник будет помечен как уволенный. Действие необратимо.
          </p>
        </div>

        <div className="mb-5">
          <label className="block text-xs text-white/40 mb-1">Дата увольнения *</label>
          <input
            type="date"
            value={dateFired}
            onChange={e => setDateFired(e.target.value)}
            required
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/80 text-sm focus:outline-none focus:border-red-500/50"
          />
        </div>

        {error && (
          <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-4">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg bg-white/5 border border-white/10 text-white/40 hover:bg-white/10 text-sm transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving || !dateFired}
            className="flex-1 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {saving ? 'Увольнение...' : 'Уволить'}
          </button>
        </div>
      </div>
    </div>
  )
}
