'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function ForemanPage() {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState('USR-0051') // TODO: из auth

  useEffect(() => {
    loadMyRequests()
  }, [])

  async function loadMyRequests() {
    setLoading(true)
    const { data } = await supabase
      .from('requests')
      .select('*')
      .contains('assigned_users', [userId])
      .order('date_work', { ascending: true })
    
    setRequests(data || [])
    setLoading(false)
  }

  async function startWork(requestId: string) {
    await supabase
      .from('requests')
      .update({ 
        fact_start: new Date().toISOString(),
        status: 'IN_PROGRESS'
      })
      .eq('request_id', requestId)
    
    loadMyRequests()
  }

  async function finishWork(requestId: string) {
    await supabase
      .from('requests')
      .update({ 
        fact_finish: new Date().toISOString(),
        status: 'DONE'
      })
      .eq('request_id', requestId)
    
    loadMyRequests()
  }

  const today = new Date().toISOString().split('T')[0]
  const myToday = requests.filter(r => r.date_work === today)
  const upcoming = requests.filter(r => r.date_work > today)
  const completed = requests.filter(r => r.fact_finish)

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      padding: '20px'
    }}>
      {/* HEADER */}
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '20px',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <h1 style={{ color: 'white', margin: 0, fontSize: '28px' }}>👷 МОИ ЗАЯВКИ</h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', margin: '8px 0 0 0' }}>
          Иванов П.И. • ДЕНЬ ({new Date().toLocaleDateString('ru')})
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(255,255,255,0.5)' }}>
          ⏳ Загрузка...
        </div>
      ) : (
        <>
          {/* СЕГОДНЯ */}
          <div style={{ marginBottom: '30px' }}>
            <h2 style={{ color: 'white', fontSize: '18px', marginBottom: '15px' }}>
              📋 СЕГОДНЯ ({myToday.length})
            </h2>
            
            {myToday.length === 0 ? (
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '30px',
                textAlign: 'center',
                color: 'rgba(255,255,255,0.5)'
              }}>
                Нет заявок на сегодня
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {myToday.map(req => (
                  <RequestCard 
                    key={req.request_id} 
                    request={req} 
                    onStart={startWork}
                    onFinish={finishWork}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ЗАПЛАНИРОВАНО */}
          {upcoming.length > 0 && (
            <div style={{ marginBottom: '30px' }}>
              <h2 style={{ color: 'white', fontSize: '18px', marginBottom: '15px' }}>
                ⏰ ЗАПЛАНИРОВАНО ({upcoming.length})
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {upcoming.map(req => (
                  <RequestCard 
                    key={req.request_id} 
                    request={req}
                    onStart={startWork}
                    onFinish={finishWork}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ВЫПОЛНЕНО */}
          {completed.length > 0 && (
            <div>
              <h2 style={{ color: 'white', fontSize: '18px', marginBottom: '15px' }}>
                ✅ ВЫПОЛНЕНО ({completed.length})
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {completed.slice(0, 5).map(req => (
                  <RequestCard 
                    key={req.request_id} 
                    request={req}
                    onStart={startWork}
                    onFinish={finishWork}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function RequestCard({ request, onStart, onFinish }: any) {
  const isStarted = !!request.fact_start
  const isFinished = !!request.fact_finish
  const isProblem = !request.fact_finish && request.status !== 'DONE'

  return (
    <div style={{
      background: isProblem 
        ? 'linear-gradient(135deg, rgba(239,68,68,0.1) 0%, rgba(239,68,68,0.05) 100%)'
        : isFinished
        ? 'linear-gradient(135deg, rgba(34,197,94,0.1) 0%, rgba(34,197,94,0.05) 100%)'
        : 'rgba(255,255,255,0.05)',
      border: isProblem 
        ? '1px solid rgba(239,68,68,0.3)'
        : isFinished
        ? '1px solid rgba(34,197,94,0.3)'
        : '1px solid rgba(255,255,255,0.1)',
      borderRadius: '16px',
      padding: '20px'
    }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
        <div>
          <div style={{ 
            fontSize: '12px', 
            color: 'rgba(255,255,255,0.5)',
            fontFamily: 'monospace',
            marginBottom: '6px'
          }}>
            {request.request_id}
          </div>
          
          {isFinished ? (
            <span style={{
              background: 'rgba(34,197,94,0.3)',
              color: '#22c55e',
              padding: '4px 10px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 'bold',
              border: '1px solid rgba(34,197,94,0.4)'
            }}>
              ✅ ВЫПОЛНЕНО
            </span>
          ) : isStarted ? (
            <span style={{
              background: 'rgba(59,130,246,0.3)',
              color: '#3b82f6',
              padding: '4px 10px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 'bold',
              border: '1px solid rgba(59,130,246,0.4)'
            }}>
              ⏳ В РАБОТЕ
            </span>
          ) : (
            <span style={{
              background: 'rgba(234,179,8,0.3)',
              color: '#eab308',
              padding: '4px 10px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 'bold',
              border: '1px solid rgba(234,179,8,0.4)'
            }}>
              ⏰ ПЛАН
            </span>
          )}
        </div>

        {isProblem && (
          <span style={{ fontSize: '24px' }}>🔴</span>
        )}
      </div>

      {/* LOCATION */}
      <div style={{ 
        fontSize: '18px', 
        color: 'white',
        fontWeight: 'bold',
        marginBottom: '10px'
      }}>
        📍 {request.location_text}
      </div>

      {/* DESCRIPTION */}
      <div style={{ 
        fontSize: '14px', 
        color: 'rgba(255,255,255,0.8)',
        lineHeight: '1.6',
        marginBottom: '15px'
      }}>
        🔧 {request.work_description}
      </div>

      {/* META */}
      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        marginBottom: '20px',
        flexWrap: 'wrap'
      }}>
        <span style={{
          background: 'rgba(255,255,255,0.1)',
          padding: '6px 12px',
          borderRadius: '8px',
          fontSize: '12px',
          color: 'rgba(255,255,255,0.7)'
        }}>
          ⏰ {request.date_work}
        </span>
        
        {request.priority && (
          <span style={{
            background: 'rgba(234,179,8,0.2)',
            border: '1px solid rgba(234,179,8,0.3)',
            color: '#eab308',
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            ⚡ {request.priority}
          </span>
        )}
      </div>

      {/* TIMING */}
      {(isStarted || isFinished) && (
        <div style={{ 
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '10px',
          padding: '12px',
          marginBottom: '15px'
        }}>
          {isStarted && (
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginBottom: '6px' }}>
              ▶️ Начало: {new Date(request.fact_start).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
          {isFinished && (
            <div style={{ fontSize: '13px', color: '#22c55e' }}>
              ✅ Окончание: {new Date(request.fact_finish).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>
      )}

      {/* BUTTONS */}
      <div style={{ display: 'flex', gap: '10px' }}>
        {!isStarted && !isFinished && (
          <button
            onClick={() => onStart(request.request_id)}
            style={{
              flex: 1,
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              border: 'none',
              borderRadius: '12px',
              padding: '16px',
              color: 'white',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'transform 0.2s'
            }}
          >
            ▶️ Начать работу
          </button>
        )}
        
        {isStarted && !isFinished && (
          <button
            onClick={() => onFinish(request.request_id)}
            style={{
              flex: 1,
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              border: 'none',
              borderRadius: '12px',
              padding: '16px',
              color: 'white',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'transform 0.2s'
            }}
          >
            ✅ Завершить
          </button>
        )}

        {!isFinished && (
          <button
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '12px',
              padding: '16px 20px',
              color: 'white',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            📝
          </button>
        )}
      </div>
    </div>
  )
}
