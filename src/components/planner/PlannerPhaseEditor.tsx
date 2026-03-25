'use client'
import { useState, useEffect, useRef } from 'react'
import type { ShiftPhase, AuthSession } from '@/types'
import { saveShiftPhase, deleteShiftPhase } from '@/lib/api'

interface Props {
  userId: string
  userName: string
  scheduleCode: string
  rotationGroup: string | null
  clickedDate: string
  existingPhase: ShiftPhase | null
  posX: number
  posY: number
  session: AuthSession
  onClose: () => void
  onSaved: () => void
}


export default function PlannerPhaseEditor({
  userId, userName, scheduleCode, rotationGroup, clickedDate,
  existingPhase, posX, posY, session, onClose, onSaved,
}: Props) {
  const [phase, setPhase]               = useState<'day' | 'night'>(existingPhase?.phase ?? 'day')
  const [anchorDate, setAnchorDate]     = useState(existingPhase?.anchor_date ?? clickedDate)
  const [validFrom, setValidFrom]       = useState(existingPhase?.valid_from ?? clickedDate)

  // Keep validFrom in sync with anchorDate unless user changed them independently
  function handleAnchorChange(val: string) {
    if (validFrom === anchorDate) setValidFrom(val)
    setAnchorDate(val)
  }
  const [ongoing, setOngoing]           = useState(existingPhase ? !existingPhase.valid_to : true)
  const [validTo, setValidTo]           = useState(existingPhase?.valid_to ?? '')
  const [isAlternating, setIsAlternating] = useState(existingPhase?.is_alternating ?? false)
  const [saving, setSaving]             = useState(false)
  const [deleting, setDeleting]         = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  // Keep popup within viewport
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const style: React.CSSProperties = {
    position: 'fixed',
    zIndex: 9999,
    top: Math.min(posY + 8, vh - 420),
    left: Math.min(posX + 8, vw - 300),
  }

  async function handleSave() {
    if (!validFrom || !anchorDate) return
    setSaving(true)
    const result = await saveShiftPhase(
      userId,
      {
        phase,
        anchor_date: anchorDate,
        valid_from: validFrom,
        valid_to: ongoing ? null : (validTo || null),
        schedule_code: scheduleCode,
        is_alternating: scheduleCode === '15/15' ? isAlternating : false,
      },
      session.user_id,
      existingPhase?.id,
    )
    setSaving(false)
    if (result.ok) onSaved()
  }

  async function handleDelete() {
    if (!existingPhase) return
    setDeleting(true)
    await deleteShiftPhase(existingPhase.id, session.user_id)
    setDeleting(false)
    onSaved()
  }

  const is1515 = scheduleCode === '15/15'

  // For 15/15: calendar-based work window description
  const workRange1515 = is1515
    ? (rotationGroup === '2' ? '16-е — конец месяца' : '1-е — 15-е')
    : null

  return (
    <div
      ref={ref}
      style={style}
      className="w-72 glass-popup rounded-2xl shadow-2xl p-4 space-y-3"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-white/80 font-medium text-xs truncate max-w-[200px]">{userName}</div>
          <div className="text-white/30 text-[10px] mt-0.5">
            {existingPhase ? 'Редактировать фазу' : 'Создать фазу'} · {scheduleCode}
          </div>
        </div>
        <button onClick={onClose} className="text-white/25 hover:text-white/60 text-xl leading-none ml-2 shrink-0">×</button>
      </div>

      {/* Phase type */}
      <div>
        <div className="text-white/35 text-[10px] mb-1.5 uppercase tracking-wide">Тип фазы</div>
        <div className="flex gap-1.5">
          <button
            onClick={() => setPhase('day')}
            className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
              phase === 'day'
                ? 'bg-amber-500/25 text-amber-200 border border-amber-500/40 shadow-inner'
                : 'bg-white/5 text-white/40 hover:bg-white/10 border border-transparent'
            }`}
          >☀️ День</button>
          <button
            onClick={() => setPhase('night')}
            className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
              phase === 'night'
                ? 'bg-blue-500/25 text-blue-200 border border-blue-500/40 shadow-inner'
                : 'bg-white/5 text-white/40 hover:bg-white/10 border border-transparent'
            }`}
          >🌙 Ночь</button>
        </div>
      </div>

      {/* Anchor date */}
      <div>
        <label className="text-white/35 text-[10px] block mb-1 uppercase tracking-wide">
          Опорная дата{' '}
          <span className="normal-case text-white/20">
            {is1515 ? '(только для чередования день/ночь)' : '(начало цикла)'}
          </span>
        </label>
        <input
          type="date"
          value={anchorDate}
          onChange={e => handleAnchorChange(e.target.value)}
          className="form-input text-xs w-full"
        />
        {/* 15/15: show calendar work window */}
        {workRange1515 && (
          <div className="mt-1.5 px-2 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="text-[10px] text-amber-300/70">
              Группа {rotationGroup ?? '1'} — рабочие дни каждого месяца:
            </div>
            <div className="text-[11px] text-amber-200 font-medium mt-0.5">
              {workRange1515}
            </div>
          </div>
        )}
      </div>

      {/* Valid from */}
      <div>
        <label className="text-white/35 text-[10px] block mb-1 uppercase tracking-wide">Начало действия записи</label>
        <input
          type="date"
          value={validFrom}
          onChange={e => setValidFrom(e.target.value)}
          className="form-input text-xs w-full"
        />
      </div>

      {/* Valid to */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-white/35 text-[10px] uppercase tracking-wide">Конец действия</span>
          <label className="flex items-center gap-1.5 text-[10px] text-white/50 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={ongoing}
              onChange={e => setOngoing(e.target.checked)}
              className="w-3 h-3 accent-blue-500"
            />
            Бессрочно
          </label>
        </div>
        {!ongoing && (
          <input
            type="date"
            value={validTo}
            min={validFrom}
            onChange={e => setValidTo(e.target.value)}
            className="form-input text-xs w-full"
          />
        )}
      </div>

      {/* 15/15 alternating */}
      {is1515 && (
        <label className="flex items-center gap-2 text-xs text-white/50 cursor-pointer select-none p-2 rounded-lg bg-white/5">
          <input
            type="checkbox"
            checked={isAlternating}
            onChange={e => setIsAlternating(e.target.checked)}
            className="w-3.5 h-3.5 accent-violet-500"
          />
          <span>Автоматическое чередование (15/15)</span>
        </label>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-white/5">
        {existingPhase && (
          <button
            onClick={handleDelete}
            disabled={deleting || saving}
            className="px-3 py-1.5 rounded-lg text-xs bg-red-500/10 text-red-300 hover:bg-red-500/20 border border-red-500/15 transition-colors disabled:opacity-40"
          >
            {deleting ? '…' : '🗑'}
          </button>
        )}
        <div className="flex-1" />
        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded-lg text-xs bg-white/5 text-white/35 hover:bg-white/10 transition-colors"
        >Отмена</button>
        <button
          onClick={handleSave}
          disabled={saving || !validFrom || !anchorDate || (!ongoing && !validTo)}
          className="px-4 py-1.5 rounded-lg text-xs bg-blue-600/35 text-blue-100 hover:bg-blue-600/50 border border-blue-500/25 transition-colors disabled:opacity-40"
        >
          {saving ? '…' : 'Сохранить'}
        </button>
      </div>
    </div>
  )
}
