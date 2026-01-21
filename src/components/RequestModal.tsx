'use client'
import { useEffect } from 'react'
import type { RequestWithRelations } from '@/types'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

interface RequestModalProps {
  request: RequestWithRelations | null
  onClose: () => void
  onStatusChange?: (newStatus: string) => void
  onFactStart?: () => void
  onFactFinish?: () => void
}

export default function RequestModal({
  request,
  onClose,
  onStatusChange,
  onFactStart,
  onFactFinish
}: RequestModalProps) {
  useEffect(() => {
    if (!request) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [request, onClose])

  if (!request) return null

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="glass-strong rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-slide-down"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Заголовок */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="text-xs text-white/50 font-mono mb-1">
              {request.request_id}
            </div>
            <h2 className="text-2xl font-bold text-white">
              📍 {request.location_text}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Основная информация */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <InfoBlock label="Служба" value={request.service?.service_name || request.service_id} />
          <InfoBlock label="Статус" value={request.status} />
          <InfoBlock label="Категория" value={request.category?.category_name} />
          <InfoBlock label="Объект" value={request.object?.object_name} />
          <InfoBlock label="Конструктив" value={request.construction?.construction_name} />
          <InfoBlock label="Вид работ" value={request.work_type?.work_name} />
          <InfoBlock label="Приоритет" value={request.priority || '—'} />
          <InfoBlock label="Срочность" value={request.urgency || '—'} />
        </div>

        {/* Описание работы */}
        <div className="glass rounded-xl p-4 mb-6">
          <div className="text-white/60 text-xs mb-2">Описание работы:</div>
          <div className="text-white text-sm leading-relaxed">
            {request.work_description || 'Нет описания'}
          </div>
        </div>

        {/* Факт выполнения */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <InfoBlock
            label="Факт старт"
            value={request.fact_start 
              ? format(new Date(request.fact_start), 'dd.MM.yyyy HH:mm', { locale: ru })
              : '—'
            }
          />
          <InfoBlock
            label="Факт финиш"
            value={request.fact_finish
              ? format(new Date(request.fact_finish), 'dd.MM.yyyy HH:mm', { locale: ru })
              : '—'
            }
          />
        </div>

        {/* Транспорт */}
        {request.transport_type && (
          <div className="glass rounded-xl p-4 mb-6">
            <div className="text-white/60 text-xs mb-2">Транспорт:</div>
            <div className="text-white text-sm">
              🚗 {request.transport_type}
              {request.transport_note && (
                <div className="text-white/70 text-xs mt-1">{request.transport_note}</div>
              )}
            </div>
          </div>
        )}

        {/* Кнопки действий */}
        <div className="flex gap-3">
          {onFactStart && !request.fact_start && (
            <button
              onClick={onFactStart}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded-xl py-3 font-semibold transition-colors"
            >
              ▶️ Факт старт
            </button>
          )}

          {onFactFinish && request.fact_start && !request.fact_finish && (
            <button
              onClick={onFactFinish}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white rounded-xl py-3 font-semibold transition-colors"
            >
              ✅ Факт финиш
            </button>
          )}

          <button
            onClick={onClose}
            className="flex-1 glass hover:bg-white/10 text-white rounded-xl py-3 font-semibold transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  )
}

function InfoBlock({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-white/50 text-xs mb-1">{label}</div>
      <div className="text-white text-sm font-semibold">{value || '—'}</div>
    </div>
  )
}
