'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'

export default function TransportPage() {
  const [requests, setRequests] = useState<any[]>([])
  const [fleet, setFleet] = useState<any[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    loadData()
    
    // Real-time обновления
    const channel = supabase
      .channel('transport-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, () => {
        loadData()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [selectedDate])

  async function loadData() {
    // Заявки с потребностью в транспорте
    const { data: reqs } = await supabase
      .from('requests')
      .select('*, users(*)')
      .eq('date_work', selectedDate)
      .not('transport_type', 'is', null)
      .order('created_at', { ascending: false })

    setRequests(reqs || [])

    // Весь транспорт
    const { data: vehicles } = await supabase
      .from('transport')
      .select('*')
      .eq('is_active', true)
      .order('vehicle_number')

    setFleet(vehicles || [])
  }

  async function assignTransport(requestId: string, note: string) {
    await supabase
      .from('requests')
      .update({ transport_note: note })
      .eq('request_id', requestId)

    loadData()
  }

  const needingTransport = requests.filter(r => !r.transport_note)
  const assigned = requests.filter(r => r.transport_note)

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      padding: '20px'
    }}>
      <Header
        title="🚗 ПАНЕЛЬ ГЛАВНОГО МЕХАНИКА"
        subtitle="Управление транспортом и спецтехникой"
        userRole="Главный механик"
        userName="Транспортный отдел"
      />

      {/* Фильтр по дате */}
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '16px',
        padding: '16px',
        marginBottom: '20px',
        border: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        gap: '12px',
        alignItems: 'center'
      }}>
        <label style={{ color: 'rgba(255,255,255,0.7)' }}>Дата:</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '8px',
            padding: '10px',
            color: 'white',
            fontSize: '14px'
          }}
        />
        <div style={{
          marginLeft: 'auto',
          color: 'rgba(255,255,255,0.7)',
          fontSize: '14px'
        }}>
          Заявок с транспортом: <strong style={{ color: 'white' }}>{requests.length}</strong>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '20px'
      }}>
        {/* Заявки требующие транспорт */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '16px',
          padding: '20px',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <h2 style={{
            color: 'white',
            fontSize: '18px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            🚨 Требуется транспорт
            <span style={{
              background: 'rgba(239,68,68,0.3)',
              borderRadius: '999px',
              padding: '4px 10px',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              {needingTransport.length}
            </span>
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {needingTransport.map(req => (
              <TransportRequestCard
                key={req.request_id}
                request={req}
                onAssign={assignTransport}
              />
            ))}
            {needingTransport.length === 0 && (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: 'rgba(255,255,255,0.4)'
              }}>
                ✅ Все заявки обработаны
              </div>
            )}
          </div>
        </div>

        {/* Назначенный транспорт */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '16px',
          padding: '20px',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <h2 style={{
            color: 'white',
            fontSize: '18px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            ✅ Назначено
            <span style={{
              background: 'rgba(34,197,94,0.3)',
              borderRadius: '999px',
              padding: '4px 10px',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              {assigned.length}
            </span>
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {assigned.map(req => (
              <div
                key={req.request_id}
                style={{
                  background: 'rgba(34,197,94,0.1)',
                  border: '1px solid rgba(34,197,94,0.3)',
                  borderRadius: '12px',
                  padding: '12px'
                }}
              >
                <div style={{ color: 'white', fontSize: '14px', fontWeight: 'bold', marginBottom: '6px' }}>
                  {req.request_id}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', marginBottom: '8px' }}>
                  {req.location_text}
                </div>
                <div style={{
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: '8px',
                  padding: '8px',
                  color: 'rgba(255,255,255,0.9)',
                  fontSize: '12px',
                  fontFamily: 'monospace'
                }}>
                  🚗 {req.transport_note}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Парк техники */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '16px',
          padding: '20px',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <h2 style={{
            color: 'white',
            fontSize: '18px',
            marginBottom: '16px'
          }}>
            🚛 Парк техники
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {fleet.map(v => (
              <div
                key={v.transport_id}
                style={{
                  background: 'rgba(59,130,246,0.1)',
                  border: '1px solid rgba(59,130,246,0.3)',
                  borderRadius: '10px',
                  padding: '12px'
                }}
              >
                <div style={{
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  marginBottom: '4px'
                }}>
                  {v.vehicle_number}
                </div>
                <div style={{
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: '12px'
                }}>
                  {v.vehicle_type} • {v.model}
                </div>
                <div style={{
                  marginTop: '8px',
                  padding: '6px 10px',
                  background: v.status === 'available'
                    ? 'rgba(34,197,94,0.2)'
                    : 'rgba(239,68,68,0.2)',
                  borderRadius: '6px',
                  fontSize: '11px',
                  color: 'white',
                  textAlign: 'center'
                }}>
                  {v.status === 'available' ? '✅ Доступен' : '🚫 Занят'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function TransportRequestCard({ request, onAssign }: any) {
  const [note, setNote] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div style={{
      background: 'rgba(239,68,68,0.1)',
      border: '1px solid rgba(239,68,68,0.3)',
      borderRadius: '12px',
      padding: '12px'
    }}>
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ cursor: 'pointer' }}
      >
        <div style={{ color: 'white', fontSize: '14px', fontWeight: 'bold', marginBottom: '6px' }}>
          {request.request_id}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', marginBottom: '6px' }}>
          📍 {request.location_text}
        </div>
        <div style={{
          display: 'inline-block',
          background: 'rgba(234,179,8,0.3)',
          borderRadius: '6px',
          padding: '4px 8px',
          fontSize: '11px',
          color: 'white'
        }}>
          🚗 {request.transport_type}
        </div>
      </div>

      {isExpanded && (
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <textarea
            placeholder="Какой транспорт назначен? (ГАЗель А123ВС, КамАЗ В456КМ...)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '8px',
              padding: '10px',
              color: 'white',
              fontSize: '12px',
              resize: 'vertical',
              minHeight: '60px',
              marginBottom: '8px'
            }}
          />
          <button
            onClick={() => {
              if (note.trim()) {
                onAssign(request.request_id, note)
                setNote('')
                setIsExpanded(false)
              }
            }}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              border: 'none',
              borderRadius: '8px',
              padding: '10px',
              color: 'white',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '13px'
            }}
          >
            ✅ Назначить транспорт
          </button>
        </div>
      )}
    </div>
  )
}
