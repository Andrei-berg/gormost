'use client'
import type { RequestWithRelations } from '@/types'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

interface RequestCardProps {
  request: RequestWithRelations
  onClick: () => void
  isDragging?: boolean
}

const SERVICE_COLORS: Record<string, string> = {
  'SRV-STR': 'service-str',
  'SRV-ENG': 'service-eng',
  'SRV-FIRE': 'service-fire',
  'SRV-VENT': 'service-vent',
  'SRV-CCTV': 'service-cctv'
}

export default function RequestCard({ request, onClick, isDragging }: RequestCardProps) {
  const isProblem = !request.fact_finish && request.status !== 'DONE'
  const serviceColorClass = SERVICE_COLORS[request.service_id] || 'gray-500'

  return (
    <div
      onClick={onClick}
      className={`
        rounded-xl p-3 cursor-pointer transition-all duration-200
        border
        ${isDragging ? 'opacity-50 scale-95' : 'hover:scale-102 hover:shadow-lg'}
        ${isProblem 
          ? 'bg-gradient-to-br from-red-500/15 to-red-500/5 border-red-500/40' 
          : 'glass border-white/10'
        }
      `}
    >
      {/* Заголовок карточки */}
      <div className="flex items-start justify-between mb-2">
        <div className="text-[10px] text-white/50 font-mono">
          {request.request_id}
        </div>
        {isProblem && (
          <span className="text-red-500 text-sm">🔴</span>
        )}
      </div>

      {/* Локация */}
      <div className="text-white font-semibold text-sm mb-1">
        📍 {request.location_text || 'Локация не указана'}
      </div>

      {/* Описание работы */}
      <div className="text-white/70 text-xs mb-3 line-clamp-2">
        {request.work_description?.substring(0, 80)}
        {request.work_description && request.work_description.length > 80 && '...'}
      </div>

      {/* Бейджи */}
      <div className="flex flex-wrap gap-1.5">
        {/* Служба */}
        <span className={`
          px-2 py-0.5 rounded-md text-[10px] font-bold
          bg-${serviceColorClass}/20 border border-${serviceColorClass}/30 text-${serviceColorClass}
        `}>
          {request.service?.service_code || request.service_id?.replace('SRV-', '')}
        </span>

        {/* Приоритет */}
        {request.priority && (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-yellow-500/20 border border-yellow-500/30 text-yellow-500">
            ⚡ {request.priority}
          </span>
        )}

        {/* Срочность */}
        {request.urgency && request.urgency !== 'NORMAL' && (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-500/20 border border-red-500/30 text-red-500">
            🔥 {request.urgency}
          </span>
        )}

        {/* Факт старт */}
        {request.fact_start && (
          <span className="px-2 py-0.5 rounded-md text-[10px] bg-green-500/20 text-green-500">
            ▶️
          </span>
        )}

        {/* Транспорт */}
        {request.transport_type && (
          <span className="px-2 py-0.5 rounded-md text-[10px] bg-blue-500/20 text-blue-500">
            🚗 {request.transport_type}
          </span>
        )}
      </div>
    </div>
  )
}
