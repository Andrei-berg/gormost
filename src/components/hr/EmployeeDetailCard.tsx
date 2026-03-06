'use client'
import { useState, useEffect } from 'react'
import { fetchEmployeeDetail } from '@/lib/api'
import { EMPLOYEE_STATUS_CONFIG } from '@/types'
import type { EmployeeDetail } from '@/types'

interface Props {
  userId: string
  currentUserId: string
  canAdmin: boolean
  onClose: () => void
  onDismiss: (userId: string) => void
  onTransfer: (userId: string) => void
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function EmployeeDetailCard({
  userId,
  currentUserId: _currentUserId,
  canAdmin,
  onClose,
  onDismiss,
  onTransfer,
}: Props) {
  const [detail, setDetail] = useState<EmployeeDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetchEmployeeDetail(userId).then(d => {
      setDetail(d)
      setLoading(false)
    })
  }, [userId])

  const statusCfg = detail ? EMPLOYEE_STATUS_CONFIG[detail.currentStatus] : null

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-slate-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header row */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="min-w-0">
            {loading ? (
              <div className="h-7 w-48 bg-white/10 rounded animate-pulse mb-2" />
            ) : (
              <>
                <h2 className="text-xl font-bold text-white leading-tight">
                  {detail?.user.full_name ?? '—'}
                </h2>
                {detail?.user.tab_number && (
                  <p className="text-xs text-white/40 mt-0.5">Таб. № {detail.user.tab_number}</p>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {statusCfg && (
              <span
                className={`text-xs px-2.5 py-1 rounded-lg border ${statusCfg.bg}`}
                style={{ color: statusCfg.color }}
              >
                {statusCfg.label}
              </span>
            )}
            <button
              onClick={onClose}
              className="text-white/40 hover:text-white/80 text-xl leading-none transition-colors"
              aria-label="Закрыть"
            >
              ✕
            </button>
          </div>
        </div>

        {loading && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-5 bg-white/10 rounded animate-pulse" style={{ width: `${60 + i * 10}%` }} />
            ))}
          </div>
        )}

        {!loading && detail && (
          <div className="space-y-4">
            {/* Contact row */}
            {(detail.user.phone || detail.user.email) && (
              <div className="flex flex-wrap gap-4 text-sm">
                {detail.user.phone && (
                  <span className="text-white/60">
                    <span className="text-white/30 mr-1">Тел:</span>{detail.user.phone}
                  </span>
                )}
                {detail.user.email && (
                  <span className="text-white/60">
                    <span className="text-white/30 mr-1">Email:</span>{detail.user.email}
                  </span>
                )}
              </div>
            )}

            {/* Profile grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              {detail.user.category && (
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-xs text-white/30 mb-1">Категория</div>
                  <div className="text-white/80 font-medium">{detail.user.category}</div>
                </div>
              )}
              {detail.currentPosition && (
                <div className="bg-white/5 rounded-lg p-3 col-span-2 sm:col-span-1">
                  <div className="text-xs text-white/30 mb-1">Должность</div>
                  <div className="text-white/80 font-medium">
                    {detail.currentPosition.profession.name}
                    {detail.currentPosition.profession.grade && ` ${detail.currentPosition.profession.grade}`}
                  </div>
                </div>
              )}
              {detail.currentAssignment && (
                <>
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="text-xs text-white/30 mb-1">График</div>
                    <div className="text-white/80 font-medium">{detail.currentAssignment.schedule.code}</div>
                  </div>
                  {detail.currentAssignment.shift_num !== null && (
                    <div className="bg-white/5 rounded-lg p-3">
                      <div className="text-xs text-white/30 mb-1">Смена</div>
                      <div className="text-white/80 font-medium">{detail.currentAssignment.shift_num}</div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Hire date */}
            <div className="text-sm">
              <span className="text-white/30 mr-2">Принят:</span>
              <span className="text-white/70">{formatDate(detail.user.date_hired)}</span>
            </div>

            {/* Probation row */}
            {detail.user.probation_end && new Date(detail.user.probation_end) >= new Date() && (
              <div className="text-sm bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
                <span className="text-yellow-400/80">Испытательный срок до: </span>
                <span className="text-yellow-300">{formatDate(detail.user.probation_end)}</span>
              </div>
            )}

            {/* Disability row */}
            {detail.user.is_disabled && (
              <div className="text-sm bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2">
                <span className="text-orange-400/80">
                  Группа {detail.user.disability_group}
                  {detail.user.disability_notes && `: ${detail.user.disability_notes}`}
                </span>
              </div>
            )}

            {/* Position history */}
            {detail.positionHistory.length > 0 && (
              <div>
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="flex items-center gap-2 text-sm text-white/50 hover:text-white/80 transition-colors mb-2"
                >
                  <span className="text-xs">{showHistory ? '▲' : '▼'}</span>
                  История должностей ({detail.positionHistory.length})
                </button>
                {showHistory && (
                  <div className="space-y-1.5 ml-4">
                    {detail.positionHistory.map(pos => (
                      <div key={pos.id} className="text-xs text-white/50 flex gap-3">
                        <span className="text-white/30 shrink-0">{formatDate(pos.started_at)}</span>
                        <span>
                          {pos.profession.name}
                          {pos.profession.grade && ` ${pos.profession.grade}`}
                          {pos.change_reason && <span className="text-white/30"> · {pos.change_reason}</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Recent requests */}
            {detail.recentRequests.length > 0 && (
              <div>
                <div className="text-xs text-white/30 mb-2 uppercase tracking-wider">Последние заявки</div>
                <div className="space-y-1">
                  {detail.recentRequests.map(ra => (
                    <div key={ra.id} className="text-xs text-white/50 flex gap-3">
                      <span className="text-white/30 shrink-0">{formatDate(ra.created_at)}</span>
                      <span className="font-mono">{ra.request_id}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ADMIN action buttons */}
            {canAdmin && (
              <div className="flex gap-3 pt-2 border-t border-white/10">
                <button
                  onClick={() => onDismiss(userId)}
                  className="flex-1 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 text-sm font-medium transition-colors"
                >
                  Уволить
                </button>
                <button
                  onClick={() => onTransfer(userId)}
                  className="flex-1 py-2 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30 text-sm font-medium transition-colors"
                >
                  Перевести
                </button>
              </div>
            )}
          </div>
        )}

        {!loading && !detail && (
          <div className="text-center text-white/30 py-8">Сотрудник не найден</div>
        )}
      </div>
    </div>
  )
}
