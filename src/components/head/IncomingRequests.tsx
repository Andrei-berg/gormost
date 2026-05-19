'use client'
import { useState, useEffect, useCallback } from 'react'
import { fetchCrossServiceRequests, respondToCrossServiceRequest } from '@/lib/api-client'
import type { CrossServiceRequest, AuthSession } from '@/types'
import { CROSS_SERVICE_STATUS_CONFIG, SERVICE_META } from '@/types'

const SERVICE_NAMES: Record<string, string> = {
  'SRV-ENG':  'Инженерные системы',
  'SRV-STR':  'Строительная служба',
  'SRV-FIRE': 'Пожарная безопасность',
  'SRV-VENT': 'Вентиляция',
  'SRV-CCTV': 'Видеонаблюдение',
}

interface Props {
  session: AuthSession
}

export default function IncomingRequests({ session }: Props) {
  const [requests, setRequests] = useState<CrossServiceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [responding, setResponding] = useState<string | null>(null)
  const [noteValues, setNoteValues] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    if (!session.service_id) return
    const data = await fetchCrossServiceRequests({ toServiceId: session.service_id })
    setRequests(data)
    setLoading(false)
  }, [session.service_id])

  useEffect(() => { load() }, [load])

  const respond = async (id: string, status: 'CONFIRMED' | 'DECLINED') => {
    setResponding(id)
    const note = noteValues[id]?.trim() || null
    await respondToCrossServiceRequest(id, status, note, session.user_id)
    await load()
    setResponding(null)
  }

  const pending = requests.filter(r => r.status === 'PENDING')
  const answered = requests.filter(r => r.status !== 'PENDING')

  if (loading) return <div className="text-center text-white/30 py-8 text-sm">Загрузка...</div>

  return (
    <div className="space-y-6">
      {/* Pending */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="text-xs text-white/40 uppercase tracking-widest">Ожидают ответа</div>
          {pending.length > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">
              {pending.length}
            </span>
          )}
        </div>
        {pending.length === 0 ? (
          <div className="text-center text-white/20 py-6 text-sm border-2 border-dashed border-white/5 rounded-xl">
            Нет входящих запросов
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map(req => (
              <RequestCard
                key={req.id}
                req={req}
                responding={responding === req.id}
                noteValue={noteValues[req.id] ?? ''}
                onNoteChange={val => setNoteValues(prev => ({ ...prev, [req.id]: val }))}
                onConfirm={() => respond(req.id, 'CONFIRMED')}
                onDecline={() => respond(req.id, 'DECLINED')}
              />
            ))}
          </div>
        )}
      </div>

      {/* Answered */}
      {answered.length > 0 && (
        <div>
          <div className="text-xs text-white/40 uppercase tracking-widest mb-3">Отвеченные</div>
          <div className="space-y-2">
            {answered.map(req => (
              <AnsweredCard key={req.id} req={req} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Pending request card ───────────────────────────────────────────────────

interface RequestCardProps {
  req: CrossServiceRequest
  responding: boolean
  noteValue: string
  onNoteChange: (v: string) => void
  onConfirm: () => void
  onDecline: () => void
}

function RequestCard({ req, responding, noteValue, onNoteChange, onConfirm, onDecline }: RequestCardProps) {
  const fromMeta = SERVICE_META[req.from_service_id]
  const timeLabel = req.time_start
    ? `${req.time_start}${req.time_end ? `–${req.time_end}` : ''}`
    : null

  return (
    <div className="glass rounded-xl p-4 border border-orange-500/20">
      {/* From service */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{fromMeta?.emoji ?? '📋'}</span>
        <div>
          <div className="text-sm font-medium text-white">{SERVICE_NAMES[req.from_service_id] ?? req.from_service_id}</div>
          <div className="text-xs text-white/40">
            {new Date(req.created_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}{' '}
            {new Date(req.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {timeLabel && (
            <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-lg">
              {timeLabel}
            </span>
          )}
          <span className="text-xs bg-blue-500/20 border border-blue-500/30 text-blue-300 px-2 py-0.5 rounded-lg">
            {req.needed_count} чел.
          </span>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-white/80 mb-3 leading-relaxed">{req.description}</p>

      {/* Note input */}
      <input
        type="text"
        value={noteValue}
        onChange={e => onNoteChange(e.target.value)}
        placeholder="Комментарий (опционально)"
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 mb-3"
      />

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onConfirm}
          disabled={responding}
          className="flex-1 py-2 rounded-lg bg-green-600/30 border border-green-500/40 text-green-300 hover:bg-green-600/50 text-sm font-medium transition-all disabled:opacity-40"
        >
          ✓ Подтвердить
        </button>
        <button
          onClick={onDecline}
          disabled={responding}
          className="flex-1 py-2 rounded-lg bg-red-600/20 border border-red-500/30 text-red-300 hover:bg-red-600/30 text-sm font-medium transition-all disabled:opacity-40"
        >
          ✕ Отклонить
        </button>
      </div>
    </div>
  )
}

// ── Answered card ──────────────────────────────────────────────────────────

function AnsweredCard({ req }: { req: CrossServiceRequest }) {
  const cfg = CROSS_SERVICE_STATUS_CONFIG[req.status as keyof typeof CROSS_SERVICE_STATUS_CONFIG]
  const fromMeta = SERVICE_META[req.from_service_id]

  return (
    <div className="glass rounded-xl px-4 py-3 border border-white/5 flex items-center gap-3">
      <span className="text-base">{fromMeta?.emoji ?? '📋'}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-white/70 truncate">{req.description}</div>
        {req.response_note && (
          <div className="text-xs text-white/40 truncate">Ответ: {req.response_note}</div>
        )}
      </div>
      <span className={`text-xs px-2 py-0.5 rounded-lg border shrink-0 ${cfg.bg}`} style={{ color: cfg.color }}>
        {cfg.label}
      </span>
    </div>
  )
}
