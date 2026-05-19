'use client'
import { useState } from 'react'
import { cancelWorkPlan } from '@/lib/api-client'
import type { AuthSession } from '@/types'

interface Props {
  planId: string | null
  onClose: () => void
  onCancelled: () => void
  session: AuthSession
}

export default function CancelPlanModal({ planId, onClose, onCancelled, session }: Props) {
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  if (!planId) return null

  const handleCancel = async () => {
    if (!reason.trim()) { setError('Укажите причину отмены'); return }
    setSaving(true)
    setError('')
    try {
      await cancelWorkPlan(planId, reason.trim(), session.user_id)
      onCancelled()
    } catch {
      setError('Ошибка при отмене плана')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass rounded-2xl p-6 w-full max-w-md border border-white/10 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">✕ Отменить план</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white text-xl transition-colors">✕</button>
        </div>

        <p className="text-sm text-white/50 mb-4">
          План будет переведён в статус «Отменён». Действие необратимо.
        </p>

        <div>
          <label className="text-xs text-white/45 mb-1.5 block">Причина отмены *</label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Например: план создан по ошибке, работы перенесены..."
            rows={3}
            className="form-input w-full resize-none"
            autoFocus
          />
        </div>

        {error && (
          <div className="mt-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex gap-3 mt-5">
          <button
            onClick={handleCancel}
            disabled={!reason.trim() || saving}
            className="flex-1 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 disabled:opacity-40 text-white font-medium text-sm transition-all"
          >
            {saving ? 'Отмена...' : '✕ Отменить план'}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/55 text-sm transition-all"
          >
            Назад
          </button>
        </div>
      </div>
    </div>
  )
}
