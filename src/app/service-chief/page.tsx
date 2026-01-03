'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'

// Тип для заявки
interface Request {
  request_id: string
  service_id: string
  location_text: string
  work_description: string
  status: string
  created_at: string
  priority?: string
  urgency?: string
  assigned_users?: string
  date_work: string
  shift_type: string
  fact_start?: string
  fact_finish?: string
}

export default function ServiceChiefPage() {
  const [serviceRequests, setServiceRequests] = useState<Request[]>([])
  const [selectedService, setSelectedService] = useState('SRV-STR')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadServiceRequests()

    // Real-time обновления
    const channel = supabase
      .channel('service-chief-updates')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'requests',
        filter: `service_id=eq.${selectedService}`
      }, () => {
        loadServiceRequests()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [selectedService])

  async function loadServiceRequests() {
    setLoading(true)

    const { data, error } = await supabase
      .from('requests')
      .select('*')
      .eq('service_id', selectedService)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Ошибка загрузки заявок:', error)
      setLoading(false)
      return
    }

    setServiceRequests(data || [])
    setLoading(false)
  }

  // Группировка по статусам (с явной типизацией)
  const groupedRequests: Record<string, Request[]> = {
    'NEW': [],
    'PLANNED': [],
    'IN_PROGRESS': [],
    'CHECKING': [],
    'DONE': []
  }

  serviceRequests.forEach(req => {
    const status = req.status || 'NEW'
    if (groupedRequests[status]) {
      groupedRequests[status].push(req)
    } else {
      groupedRequests['NEW'].push(req)
    }
  })

  const statusLabels: Record<string, string> = {
    'NEW': '🆕 Новые',
    'PLANNED': '📋 Запланированные',
    'IN_PROGRESS': '⚙️ В работе',
    'CHECKING': '🔍 На проверке',
    'DONE': '✅ Выполнено'
  }

  const statusColors: Record<string, string> = {
    'NEW': 'rgba(234,179,8,0.2)',
    'PLANNED': 'rgba(59,130,246,0.2)',
    'IN_PROGRESS': 'rgba(139,92,246,0.2)',
    'CHECKING': 'rgba(249,115,22,0.2)',
    'DONE': 'rgba(34,197,94,0.2)'
  }

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
        title="🏢 НАЧАЛЬНИК СЛУЖБЫ"
        subtitle="План работ • Назначение людей • Контроль выполнения"
        userRole="Начальник службы"
        userName={serviceNames[selectedService] || selectedService}
      />

      {/* ФИЛЬТР ПО СЛУЖБЕ */}
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '16px',
        padding: '16px',
        marginBottom: '20px',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ 
              color: 'rgba(255,255,255,0.7)', 
              display: 'block', 
              marginBottom: '8px',
              fontSize: '14px'
            }}>
              Выберите службу:
            </label>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px',
                padding: '10px',
                color: 'white',
                fontSize: '14px',
                width: '100%',
                maxWidth: '300px',
                cursor: 'pointer'
              }}
            >
              <option value="SRV-STR">🔧 СЭИС (STR)</option>
              <option value="SRV-ENG">⚡ Энергетика (ENG)</option>
              <option value="SRV-FIRE">🔥 Пожарка/Сантехника (FIRE)</option>
              <option value="SRV-VENT">💨 Вентиляция (VENT)</option>
              <option value="SRV-CCTV">📹 Видеонаблюдение/СКС (CCTV)</option>
            </select>
          </div>

          <button
            onClick={loadServiceRequests}
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

      {/* KPI */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '16px',
        marginBottom: '20px'
      }}>
        {Object.entries(statusLabels).map(([status, label]) => (
          <div
            key={status}
            style={{
              background: statusColors[status],
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center'
            }}
          >
            <div style={{ 
              fontSize: '28px', 
              fontWeight: 'bold', 
              color: 'white',
              marginBottom: '8px'
            }}>
              {groupedRequests[status].length}
            </div>
            <div style={{ 
              fontSize: '13px', 
              color: 'rgba(255,255,255,0.7)' 
            }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* КАНБАН-ДОСКА */}
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '16px',
        padding: '20px',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <h2 style={{ color: 'white', marginBottom: '20px', fontSize: '18px' }}>
          📊 Заявки службы {serviceNames[selectedService]} ({serviceRequests.length})
        </h2>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(255,255,255,0.5)' }}>
            ⏳ Загрузка...
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '16px'
          }}>
            {Object.entries(groupedRequests).map(([status, requests]) => (
              <div key={status}>
                <h3 style={{ 
                  color: 'white', 
                  marginBottom: '12px',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}>
                  {statusLabels[status]} ({requests.length})
                </h3>

                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '12px',
                  minHeight: '200px'
                }}>
                  {requests.map(req => (
                    <div
                      key={req.request_id}
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        padding: '16px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                      }}
                    >
                      <div style={{ 
                        color: 'white', 
                        fontWeight: 'bold', 
                        marginBottom: '8px',
                        fontSize: '13px',
                        fontFamily: 'monospace'
                      }}>
                        {req.request_id}
                      </div>

                      <div style={{ 
                        color: 'rgba(255,255,255,0.6)', 
                        fontSize: '11px',
                        marginBottom: '8px'
                      }}>
                        {req.date_work} • {req.shift_type === 'DAY' ? '🌞 День' : '🌙 Ночь'}
                      </div>

                      <div style={{ 
                        color: 'rgba(255,255,255,0.7)', 
                        fontSize: '13px',
                        marginBottom: '8px'
                      }}>
                        📍 {req.location_text}
                      </div>

                      <div style={{ 
                        color: 'rgba(255,255,255,0.9)', 
                        fontSize: '13px',
                        marginBottom: '12px',
                        lineHeight: '1.4'
                      }}>
                        {req.work_description}
                      </div>

                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {req.priority === 'HIGH' && (
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 8px',
                            background: 'rgba(239,68,68,0.2)',
                            border: '1px solid rgba(239,68,68,0.3)',
                            borderRadius: '6px',
                            fontSize: '11px',
                            color: 'white'
                          }}>
                            🔥 Приоритет
                          </span>
                        )}

                        {req.assigned_users && (
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 8px',
                            background: 'rgba(59,130,246,0.2)',
                            border: '1px solid rgba(59,130,246,0.3)',
                            borderRadius: '6px',
                            fontSize: '11px',
                            color: 'white'
                          }}>
                            👤 {req.assigned_users}
                          </span>
                        )}

                        {req.fact_start && (
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 8px',
                            background: 'rgba(139,92,246,0.2)',
                            border: '1px solid rgba(139,92,246,0.3)',
                            borderRadius: '6px',
                            fontSize: '11px',
                            color: 'white'
                          }}>
                            ▶️ Начато
                          </span>
                        )}
                      </div>
                    </div>
                  ))}

                  {requests.length === 0 && (
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '40px 20px', 
                      color: 'rgba(255,255,255,0.3)',
                      fontSize: '13px'
                    }}>
                      Нет заявок
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
