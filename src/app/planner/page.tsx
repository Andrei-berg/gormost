'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'

interface Request {
  request_id: string
  service_id: string
  location_text: string
  work_description: string
  status: string
  priority?: string
  urgency?: string
  assigned_users?: string
  date_work: string
  shift_type: string
  created_at: string
}

export default function PlannerPage() {
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedShift, setSelectedShift] = useState<'DAY' | 'NIGHT'>('DAY')

  useEffect(() => {
    loadRequests()
  }, [selectedDate, selectedShift])

  async function loadRequests() {
    setLoading(true)
    
    const { data } = await supabase
      .from('requests')
      .select('*')
      .eq('date_work', selectedDate)
      .eq('shift_type', selectedShift)
      .order('created_at', { ascending: false })

    setRequests(data || [])
    setLoading(false)
  }

  // Группировка по службам
  const groupedByService: Record<string, Request[]> = {}
  requests.forEach(req => {
    const serviceId = req.service_id || 'UNKNOWN'
    if (!groupedByService[serviceId]) {
      groupedByService[serviceId] = []
    }
    groupedByService[serviceId].push(req)
  })

  const serviceNames: Record<string, string> = {
    'SRV-STR': '🔧 СЭИС',
    'SRV-ENG': '⚡ Энергетика',
    'SRV-FIRE': '🔥 Пожарка/Сантехника',
    'SRV-VENT': '💨 Вентиляция',
    'SRV-CCTV': '📹 Видеонаблюдение'
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      padding: '20px'
    }}>
      {/* HEADER */}
      <Header
        title="📋 ЗАМ/ПРОРАБ · ПЛАНИРОВАНИЕ"
        subtitle="Сбор планов от служб • Утверждение • Распределение людей • ДЕНЬ+НОЧЬ"
        userRole="Зам/прораб"
        userName="Планирование смены"
      />

      {/* ФИЛЬТРЫ */}
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '20px',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginBottom: '5px' }}>
              Дата работ
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                padding: '10px',
                color: 'white',
                fontSize: '14px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginBottom: '5px' }}>
              Период смены
            </label>
            <select
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value as 'DAY' | 'NIGHT')}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                padding: '10px',
                color: 'white',
                fontSize: '14px',
                minWidth: '150px'
              }}
            >
              <option value="DAY">🌞 ДЕНЬ (7:00-19:00)</option>
              <option value="NIGHT">🌙 НОЧЬ (19:00-7:00)</option>
            </select>
          </div>

          <button
            onClick={loadRequests}
            style={{
              background: 'rgba(59,130,246,0.2)',
              border: '1px solid rgba(59,130,246,0.3)',
              borderRadius: '10px',
              padding: '10px 20px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            🔄 Обновить
          </button>
        </div>
      </div>

      {/* СВОДКА */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '15px',
        marginBottom: '20px'
      }}>
        <div style={{
          background: 'rgba(59,130,246,0.2)',
          border: '1px solid rgba(59,130,246,0.3)',
          borderRadius: '12px',
          padding: '20px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'white' }}>
            {requests.length}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', marginTop: '8px' }}>
            Всего заявок в плане
          </div>
        </div>

        <div style={{
          background: 'rgba(234,179,8,0.2)',
          border: '1px solid rgba(234,179,8,0.3)',
          borderRadius: '12px',
          padding: '20px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'white' }}>
            {Object.keys(groupedByService).length}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', marginTop: '8px' }}>
            Служб задействовано
          </div>
        </div>

        <div style={{
          background: 'rgba(139,92,246,0.2)',
          border: '1px solid rgba(139,92,246,0.3)',
          borderRadius: '12px',
          padding: '20px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'white' }}>
            {requests.filter(r => r.priority === 'HIGH').length}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', marginTop: '8px' }}>
            Высокий приоритет
          </div>
        </div>
      </div>

      {/* ПЛАН ПО СЛУЖБАМ */}
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '16px',
        padding: '20px',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <h2 style={{ color: 'white', marginBottom: '20px', fontSize: '18px' }}>
          📊 План работ по службам
        </h2>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.5)' }}>
            ⏳ Загрузка...
          </div>
        ) : Object.keys(groupedByService).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.4)' }}>
            Нет запланированных работ
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {Object.entries(groupedByService).map(([serviceId, serviceRequests]) => (
              <div key={serviceId} style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '16px'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '15px'
                }}>
                  <h3 style={{ color: 'white', fontSize: '16px', margin: 0 }}>
                    {serviceNames[serviceId] || serviceId}
                  </h3>
                  <div style={{
                    background: 'rgba(59,130,246,0.2)',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    color: 'white',
                    fontSize: '13px',
                    fontWeight: 'bold'
                  }}>
                    {serviceRequests.length} заявок
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {serviceRequests.map(req => (
                    <div key={req.request_id} style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '10px',
                      padding: '12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          color: 'white',
                          fontSize: '13px',
                          fontWeight: 'bold',
                          marginBottom: '6px',
                          fontFamily: 'monospace'
                        }}>
                          {req.request_id}
                        </div>
                        <div style={{
                          color: 'rgba(255,255,255,0.7)',
                          fontSize: '13px',
                          marginBottom: '6px'
                        }}>
                          📍 {req.location_text}
                        </div>
                        <div style={{
                          color: 'rgba(255,255,255,0.9)',
                          fontSize: '13px'
                        }}>
                          {req.work_description}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '6px', flexDirection: 'column', alignItems: 'flex-end' }}>
                        {req.priority === 'HIGH' && (
                          <span style={{
                            background: 'rgba(239,68,68,0.2)',
                            border: '1px solid rgba(239,68,68,0.3)',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            fontSize: '11px',
                            color: 'white'
                          }}>
                            🔥 Приоритет
                          </span>
                        )}
                        {req.assigned_users && (
                          <span style={{
                            background: 'rgba(34,197,94,0.2)',
                            border: '1px solid rgba(34,197,94,0.3)',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            fontSize: '11px',
                            color: 'white'
                          }}>
                            👤 {req.assigned_users}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
