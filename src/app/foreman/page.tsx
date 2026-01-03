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
  fact_start?: string
  fact_finish?: string
  date_work: string
  shift_type: string
}

export default function ForemanPage() {
  const [myTasks, setMyTasks] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMyTasks()

    // Real-time обновления
    const channel = supabase
      .channel('foreman-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'requests'
      }, () => {
        loadMyTasks()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  async function loadMyTasks() {
    setLoading(true)

    // TODO: фильтр по текущему пользователю (assigned_users)
    const { data } = await supabase
      .from('requests')
      .select('*')
      .in('status', ['PLANNED', 'IN_PROGRESS', 'CHECKING'])
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })

    setMyTasks(data || [])
    setLoading(false)
  }

  async function startTask(requestId: string) {
    const now = new Date().toISOString()

    await supabase
      .from('requests')
      .update({
        status: 'IN_PROGRESS',
        fact_start: now
      })
      .eq('request_id', requestId)

    loadMyTasks()
  }

  async function finishTask(requestId: string) {
    const now = new Date().toISOString()

    await supabase
      .from('requests')
      .update({
        status: 'DONE',
        fact_finish: now
      })
      .eq('request_id', requestId)

    loadMyTasks()
  }

  const statusGroups: Record<string, Request[]> = {
    'PLANNED': [],
    'IN_PROGRESS': [],
    'CHECKING': []
  }

  myTasks.forEach(task => {
    const status = task.status || 'PLANNED'
    if (statusGroups[status]) {
      statusGroups[status].push(task)
    }
  })

  const statusLabels: Record<string, string> = {
    'PLANNED': '📋 Запланировано',
    'IN_PROGRESS': '⚙️ В работе',
    'CHECKING': '🔍 На проверке'
  }

  const statusColors: Record<string, string> = {
    'PLANNED': 'rgba(59,130,246,0.2)',
    'IN_PROGRESS': 'rgba(139,92,246,0.2)',
    'CHECKING': 'rgba(249,115,22,0.2)'
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      padding: '20px'
    }}>
      {/* HEADER */}
      <Header
        title="👷 МАСТЕР / БРИГАДИР"
        subtitle="Мои задачи • Выполнение работ • Отчёты"
        userRole="Мастер"
        userName="Бригада"
      />

      {/* KPI */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '15px',
        marginBottom: '20px'
      }}>
        {Object.entries(statusLabels).map(([status, label]) => (
          <div key={status} style={{
            background: statusColors[status],
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: 'white',
              marginBottom: '8px'
            }}>
              {statusGroups[status].length}
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

      {/* ЗАДАЧИ */}
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '16px',
        padding: '20px',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h2 style={{ color: 'white', fontSize: '18px', margin: 0 }}>
            📝 Мои задачи
          </h2>
          <button
            onClick={loadMyTasks}
            style={{
              background: 'rgba(59,130,246,0.2)',
              border: '1px solid rgba(59,130,246,0.3)',
              borderRadius: '10px',
              padding: '8px 16px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            🔄 Обновить
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(255,255,255,0.5)' }}>
            ⏳ Загрузка...
          </div>
        ) : myTasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(255,255,255,0.4)' }}>
            ✅ Активных задач нет
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {myTasks.map(task => (
              <div
                key={task.request_id}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  padding: '16px'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '12px'
                }}>
                  <div>
                    <div style={{
                      color: 'white',
                      fontWeight: 'bold',
                      marginBottom: '6px',
                      fontSize: '14px',
                      fontFamily: 'monospace'
                    }}>
                      {task.request_id}
                    </div>
                    <div style={{
                      color: 'rgba(255,255,255,0.6)',
                      fontSize: '12px'
                    }}>
                      {task.service_id} • {task.date_work} • {task.shift_type === 'DAY' ? '🌞 День' : '🌙 Ночь'}
                    </div>
                  </div>

                  <div style={{
                    background: statusColors[task.status] || 'rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    color: 'white'
                  }}>
                    {statusLabels[task.status] || task.status}
                  </div>
                </div>

                <div style={{
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: '14px',
                  marginBottom: '8px'
                }}>
                  📍 {task.location_text}
                </div>

                <div style={{
                  color: 'rgba(255,255,255,0.9)',
                  fontSize: '14px',
                  marginBottom: '16px',
                  lineHeight: '1.5'
                }}>
                  {task.work_description}
                </div>

                {task.priority === 'HIGH' && (
                  <div style={{
                    display: 'inline-block',
                    background: 'rgba(239,68,68,0.2)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '12px',
                    color: 'white',
                    marginBottom: '12px'
                  }}>
                    🔥 Высокий приоритет
                  </div>
                )}

                <div style={{
                  display: 'flex',
                  gap: '10px',
                  marginTop: '12px'
                }}>
                  {task.status === 'PLANNED' && (
                    <button
                      onClick={() => startTask(task.request_id)}
                      style={{
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                        border: 'none',
                        borderRadius: '10px',
                        padding: '10px 20px',
                        color: 'white',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '14px'
                      }}
                    >
                      ▶️ Начать работу
                    </button>
                  )}

                  {task.status === 'IN_PROGRESS' && (
                    <button
                      onClick={() => finishTask(task.request_id)}
                      style={{
                        background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                        border: 'none',
                        borderRadius: '10px',
                        padding: '10px 20px',
                        color: 'white',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '14px'
                      }}
                    >
                      ✅ Завершить задачу
                    </button>
                  )}

                  {task.fact_start && (
                    <div style={{
                      color: 'rgba(255,255,255,0.6)',
                      fontSize: '12px',
                      alignSelf: 'center'
                    }}>
                      🕒 Начало: {new Date(task.fact_start).toLocaleString('ru')}
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
