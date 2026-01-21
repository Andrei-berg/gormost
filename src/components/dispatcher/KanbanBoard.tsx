'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const STATUSES = [
  { code: 'NEW', label: 'НОВАЯ', color: '#eab308' },
  { code: 'PLANNED', label: 'ПЛАН', color: '#3b82f6' },
  { code: 'IN_PROGRESS', label: 'В РАБОТЕ', color: '#8b5cf6' },
  { code: 'CHECKING', label: 'ПРОВЕРКА', color: '#f97316' },
  { code: 'DONE', label: 'ВЫПОЛНЕНО', color: '#22c55e' }
]

const SERVICE_COLORS: any = {
  'SRV-STR': '#8b5cf6',
  'SRV-ENG': '#eab308',
  'SRV-FIRE': '#ef4444',
  'SRV-VENT': '#06b6d4',
  'SRV-CCTV': '#22c55e'
}

export default function KanbanBoard({ requests, onRefresh }: any) {
  const [draggedCard, setDraggedCard] = useState<any>(null)
  const [selectedCard, setSelectedCard] = useState<any>(null)

  async function handleDrop(newStatus: string) {
    if (!draggedCard) return
    
    if (!confirm(`Изменить статус на "${STATUSES.find(s => s.code === newStatus)?.label}"?`)) {
      setDraggedCard(null)
      return
    }

    await supabase
      .from('requests')
      .update({ status: newStatus })
      .eq('request_id', draggedCard.request_id)
    
    setDraggedCard(null)
    onRefresh()
  }

  return (
    <>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '15px',
        minHeight: '600px'
      }}>
        {STATUSES.map(status => {
          const cards = requests.filter((r: any) => r.status === status.code)
          
          return (
            <div
              key={status.code}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(status.code)}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '16px',
                padding: '15px',
                minHeight: '500px'
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '15px',
                paddingBottom: '12px',
                borderBottom: `2px solid ${status.color}40`
              }}>
                <span style={{ color: 'white', fontWeight: 'bold', fontSize: '14px' }}>
                  {status.label}
                </span>
                <span style={{
                  background: `${status.color}40`,
                  color: status.color,
                  padding: '4px 10px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  {cards.length}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {cards.map((card: any) => (
                  <RequestCard
                    key={card.request_id}
                    card={card}
                    onDragStart={() => setDraggedCard(card)}
                    onClick={() => setSelectedCard(card)}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {selectedCard && (
        <CardModal card={selectedCard} onClose={() => setSelectedCard(null)} />
      )}
    </>
  )
}

function RequestCard({ card, onDragStart, onClick }: any) {
  const isProblem = !card.fact_finish && card.status !== 'DONE'
  const serviceColor = SERVICE_COLORS[card.service_id] || '#64748b'

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      style={{
        background: isProblem 
          ? 'linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(239,68,68,0.05) 100%)'
          : 'rgba(255,255,255,0.05)',
        border: isProblem ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        padding: '12px',
        cursor: 'pointer',
        transition: 'all 0.2s'
      }}
    >
      <div style={{
        fontSize: '10px',
        color: 'rgba(255,255,255,0.5)',
        fontFamily: 'monospace',
        marginBottom: '6px'
      }}>
        {card.request_id}
        {isProblem && <span style={{ marginLeft: '6px', color: '#ef4444' }}>🔴</span>}
      </div>

      <div style={{
        fontSize: '13px',
        color: 'white',
        fontWeight: 'bold',
        marginBottom: '6px'
      }}>
        📍 {card.location_text}
      </div>

      <div style={{
        fontSize: '11px',
        color: 'rgba(255,255,255,0.7)',
        marginBottom: '8px',
        lineHeight: '1.4'
      }}>
        {card.work_description?.substring(0, 60)}...
      </div>

      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        <span style={{
          background: `${serviceColor}30`,
          border: `1px solid ${serviceColor}50`,
          color: serviceColor,
          padding: '3px 8px',
          borderRadius: '6px',
          fontSize: '10px',
          fontWeight: 'bold'
        }}>
          {card.service_id?.replace('SRV-', '')}
        </span>

        {card.priority && (
          <span style={{
            background: 'rgba(234,179,8,0.2)',
            border: '1px solid rgba(234,179,8,0.3)',
            color: '#eab308',
            padding: '3px 8px',
            borderRadius: '6px',
            fontSize: '10px',
            fontWeight: 'bold'
          }}>
            ⚡ {card.priority}
          </span>
        )}

        {card.fact_start && (
          <span style={{
            background: 'rgba(34,197,94,0.2)',
            color: '#22c55e',
            padding: '3px 8px',
            borderRadius: '6px',
            fontSize: '10px'
          }}>
            ▶️
          </span>
        )}
      </div>
    </div>
  )
}

function CardModal({ card, onClose }: any) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '20px',
          padding: '30px',
          maxWidth: '600px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto'
        }}
      >
        <div style={{
          fontSize: '12px',
          color: 'rgba(255,255,255,0.5)',
          fontFamily: 'monospace',
          marginBottom: '10px'
        }}>
          {card.request_id}
        </div>

        <h2 style={{ color: 'white', fontSize: '24px', margin: '0 0 20px 0' }}>
          📍 {card.location_text}
        </h2>

        <div style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '12px',
          padding: '15px',
          marginBottom: '20px'
        }}>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginBottom: '6px' }}>
            Описание работы:
          </div>
          <div style={{ color: 'white', fontSize: '14px', lineHeight: '1.6' }}>
            {card.work_description}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
          <InfoRow label="Служба" value={card.service_id} />
          <InfoRow label="Статус" value={card.status} />
          <InfoRow label="Приоритет" value={card.priority || '—'} />
          <InfoRow label="Срочность" value={card.urgency || '—'} />
          <InfoRow label="Факт старт" value={card.fact_start ? new Date(card.fact_start).toLocaleString('ru') : '—'} />
          <InfoRow label="Факт финиш" value={card.fact_finish ? new Date(card.fact_finish).toLocaleString('ru') : '—'} />
        </div>

        <button
          onClick={onClose}
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '12px',
            padding: '12px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Закрыть
        </button>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: any) {
  return (
    <div>
      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginBottom: '4px' }}>
        {label}
      </div>
      <div style={{ color: 'white', fontSize: '13px', fontWeight: 'bold' }}>
        {value}
      </div>
    </div>
  )
}
