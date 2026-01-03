'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type GroupBy = 'status' | 'worker' | 'date'

export default function ServiceChiefPage() {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [groupBy, setGroupBy] = useState<GroupBy>('status')
  const [selectedService] = useState('SRV-STR') // TODO: из auth
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
      .eq('service_id', selectedService)
      .eq('date_work', selectedDate)
      .eq('shift_type', selectedShift)
    
    setRequests(data || [])
    setLoading(false)
  }

  const grouped = groupRequests(requests, groupBy)

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ color: 'white', margin: 0, fontSize: '28px' }}>⚡ СЛУЖБА СЭИС</h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', margin: '8px 0 0 0' }}>
              Контроль работ и распределение персонала
            </p>
          </div>
          <button
            onClick={loadRequests}
            style={{
              background: 'rgba(59,130,246,0.2)',
              border: '1px solid rgba(59,130,246,0.3)',
              borderRadius: '12px',
              padding: '12px 24px',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            ⟳ Обновить
          </button>
        </div>

        {/* FILTERS */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '15px', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginBottom: '5px' }}>
              Дата
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
                color: 'white'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginBottom: '5px' }}>
              Смена
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
                minWidth: '120px'
              }}
            >
              <option value="DAY">🌞 ДЕНЬ</option>
              <option value="NIGHT">🌙 НОЧЬ</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginBottom: '5px' }}>
              Группировка
            </label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupBy)}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                padding: '10px',
                color: 'white',
                minWidth: '150px'
              }}
            >
              <option value="status">По статусу</option>
              <option value="worker">По исполнителю</option>
              <option value="date">По дате</option>
            </select>
          </div>
        </div>
      </div>

      {/* STATS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '15px',
        marginBottom: '20px'
      }}>
        <StatCard title="Всего" value={requests.length} color="#3b82f6" />
        <StatCard title="Новых" value={requests.filter(r => r.status === 'NEW').length} color="#eab308" />
        <StatCard title="В работе" value={requests.filter(r => r.status === 'IN_PROGRESS').length} color="#8b5cf6" />
        <StatCard title="Проблемы" value={requests.filter(r => !r.fact_finish && r.status !== 'DONE').length} color="#ef4444" />
        <StatCard title="Готово" value={requests.filter(r => r.status === 'DONE').length} color="#22c55e" />
      </div>

      {/* GROUPED LIST */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(255,255,255,0.5)' }}>
          ⏳ Загрузка...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {Object.entries(grouped).map(([groupName, groupRequests]) => (
            <GroupSection 
              key={groupName}
              title={groupName}
              requests={groupRequests}
              count={groupRequests.length}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function StatCard({ title, value, color }: any) {
  return (
    <div style={{
      background: `linear-gradient(135deg, ${color}20 0%, ${color}10 100%)`,
      border: `1px solid ${color}40`,
      borderRadius: '12px',
      padding: '15px',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginBottom: '6px' }}>
        {title}
      </div>
      <div style={{ fontSize: '28px', fontWeight: 'bold', color }}>
        {value}
      </div>
    </div>
  )
}

function GroupSection({ title, requests, count }: any) {
  const [collapsed, setCollapsed] = useState(false)
  
  const statusColors: any = {
    'NEW': '#eab308',
    'PLANNED': '#3b82f6',
    'IN_PROGRESS': '#8b5cf6',
    'CHECKING': '#f97316',
    'DONE': '#22c55e'
  }

  const getGroupColor = () => {
    if (title === 'NEW' || title === 'НОВАЯ') return '#eab308'
    if (title === 'PLANNED' || title === 'ПЛАН') return '#3b82f6'
    if (title === 'IN_PROGRESS' || title === 'В РАБОТЕ') return '#8b5cf6'
    if (title === 'CHECKING' || title === 'ПРОВЕРКА') return '#f97316'
    if (title === 'DONE' || title === 'ВЫПОЛНЕНО') return '#22c55e'
    return '#64748b'
  }

  const color = getGroupColor()

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '16px',
      overflow: 'hidden'
    }}>
      {/* GROUP HEADER */}
      <div
        onClick={() => setCollapsed(!collapsed)}
        style={{
          background: `linear-gradient(135deg, ${color}20 0%, ${color}10 100%)`,
          padding: '15px 20px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: collapsed ? 'none' : '1px solid rgba(255,255,255,0.1)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '18px' }}>
            {collapsed ? '▶️' : '🔽'}
          </span>
          <span style={{ color: 'white', fontWeight: 'bold', fontSize: '16px' }}>
            {title}
          </span>
          <span style={{
            background: `${color}40`,
            color,
            padding: '4px 10px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            {count}
          </span>
        </div>
      </div>

      {/* GROUP CONTENT */}
      {!collapsed && (
        <div style={{ padding: '15px' }}>
          {requests.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '30px', 
              color: 'rgba(255,255,255,0.4)',
              fontSize: '14px'
            }}>
              Нет заявок
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {requests.map((req: any) => (
                <RequestRow key={req.request_id} request={req} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function RequestRow({ request }: any) {
  const isProblem = !request.fact_finish && request.status !== 'DONE'
  
  return (
    <div style={{
      background: isProblem ? 'rgba(239,68,68,0.05)' : 'rgba(255,255,255,0.02)',
      border: isProblem ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(255,255,255,0.05)',
      borderRadius: '10px',
      padding: '15px',
      cursor: 'pointer',
      transition: 'all 0.2s'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ 
            fontSize: '11px', 
            color: 'rgba(255,255,255,0.5)',
            fontFamily: 'monospace',
            marginBottom: '6px'
          }}>
            {request.request_id}
            {isProblem && <span style={{ marginLeft: '8px', color: '#ef4444' }}>🔴</span>}
          </div>
          
          <div style={{ fontSize: '15px', color: 'white', fontWeight: 'bold', marginBottom: '6px' }}>
            📍 {request.location_text}
          </div>
          
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginBottom: '10px' }}>
            {request.work_description}
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {request.assigned_users && request.assigned_users.length > 0 && (
              <span style={{
                background: 'rgba(59,130,246,0.2)',
                color: '#3b82f6',
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '11px'
              }}>
                👤 {request.assigned_users.length} чел.
              </span>
            )}
            
            {request.priority && (
              <span style={{
                background: 'rgba(234,179,8,0.2)',
                color: '#eab308',
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 'bold'
              }}>
                ⚡ {request.priority}
              </span>
            )}

            {request.fact_start && (
              <span style={{
                background: 'rgba(34,197,94,0.2)',
                color: '#22c55e',
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '11px'
              }}>
                ▶️ {new Date(request.fact_start).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function groupRequests(requests: any[], groupBy: GroupBy) {
  const groups: any = {}
  
  requests.forEach(req => {
    let key = ''
    
    if (groupBy === 'status') {
      key = req.status || 'NEW'
    } else if (groupBy === 'worker') {
      key = req.assigned_users?.[0] || 'Не назначено'
    } else if (groupBy === 'date') {
      key = req.date_work || 'Без даты'
    }
    
    if (!groups[key]) groups[key] = []
    groups[key].push(req)
  })
  
  return groups
}
