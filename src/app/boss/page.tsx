'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'

export default function BossPage() {
  const [stats, setStats] = useState<any>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<'shift' | 'week' | 'month'>('shift')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    loadStats()

    // Real-time обновления каждые 10 секунд
    const interval = setInterval(loadStats, 10000)

    const channel = supabase
      .channel('boss-monitoring')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, () => {
        loadStats()
      })
      .subscribe()

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [selectedDate, selectedPeriod])

  async function loadStats() {
    const { data: requests } = await supabase
      .from('requests')
      .select('*')
      .eq('date_work', selectedDate)

    if (!requests) return

    // Группировка по службам
    const byService = {
      'SRV-STR': { total: 0, done: 0, inProgress: 0, problems: 0 },
      'SRV-ENG': { total: 0, done: 0, inProgress: 0, problems: 0 },
      'SRV-FIRE': { total: 0, done: 0, inProgress: 0, problems: 0 },
      'SRV-VENT': { total: 0, done: 0, inProgress: 0, problems: 0 },
      'SRV-CCTV': { total: 0, done: 0, inProgress: 0, problems: 0 },
      'SRV-OTHER': { total: 0, done: 0, inProgress: 0, problems: 0 }
    }

    requests.forEach(r => {
      const service = r.service_id || 'SRV-OTHER'
      if (byService[service]) {
        byService[service].total++
        if (r.status === 'done') byService[service].done++
        if (r.status === 'in_progress') byService[service].inProgress++
        if (r.priority === 'urgent' && r.status !== 'done') byService[service].problems++
      }
    })

    // KPI
    const totalRequests = requests.length
    const doneRequests = requests.filter(r => r.status === 'done').length
    const urgentRequests = requests.filter(r => r.priority === 'urgent').length
    const problemRequests = requests.filter(r => r.priority === 'urgent' && r.status !== 'done').length
    const completionRate = totalRequests > 0 ? Math.round((doneRequests / totalRequests) * 100) : 0

    // Средняя скорость (mock)
    const avgSpeed = '2.5 часа'

    setStats({
      byService,
      totalRequests,
      doneRequests,
      urgentRequests,
      problemRequests,
      completionRate,
      avgSpeed
    })
  }

  async function exportReport() {
    alert('Экспорт отчёта в Excel (функция в разработке)')
    // TODO: Генерация Excel через библиотеку
  }

  if (!stats) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white'
      }}>
        Загрузка дашборда...
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      padding: '20px'
    }}>
      <Header
        title="👔 ДАШБОРД НАЧАЛЬНИКА УЧАСТКА"
        subtitle="Мониторинг всех служб • KPI • Проблемы • Аналитика"
        userRole="Начальник участка"
        userName="Лефортовский тоннель"
      />

      {/* Фильтры */}
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '16px',
        padding: '16px',
        marginBottom: '20px',
        border: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value as any)}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '10px',
            padding: '10px 16px',
            color: 'white',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          <option value="shift">За смену</option>
          <option value="week">За неделю</option>
          <option value="month">За месяц</option>
        </select>

        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '10px',
            padding: '10px 16px',
            color: 'white',
            fontSize: '14px'
          }}
        />

        <button
          onClick={exportReport}
          style={{
            marginLeft: 'auto',
            background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
            border: 'none',
            borderRadius: '10px',
            padding: '10px 20px',
            color: 'white',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          📥 Экспорт отчёта
        </button>
      </div>

      {/* KPI БЛОК */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '16px',
        marginBottom: '20px'
      }}>
        <KPICard
          title="Всего заявок"
          value={stats.totalRequests}
          color="#8b5cf6"
          trend="+12%"
        />
        <KPICard
          title="Выполнено"
          value={stats.doneRequests}
          color="#22c55e"
          percentage={stats.completionRate}
        />
        <KPICard
          title="Проблемы"
          value={stats.problemRequests}
          color="#ef4444"
          trend={stats.problemRequests > 0 ? '🚨' : '✅'}
        />
        <KPICard
          title="Срочные"
          value={stats.urgentRequests}
          color="#eab308"
        />
        <KPICard
          title="Средняя скорость"
          value={stats.avgSpeed}
          color="#3b82f6"
          isText
        />
      </div>

      {/* ОСНОВНАЯ СЕТКА */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '20px',
        marginBottom: '20px'
      }}>
        {/* REAL-TIME МОНИТОРИНГ СЛУЖБ */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '16px',
          padding: '20px',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <h2 style={{ color: 'white', fontSize: '20px', marginBottom: '20px' }}>
            📊 Мониторинг служб (LIVE)
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {Object.entries(stats.byService).map(([serviceId, data]: any) => (
              <ServiceMonitor
                key={serviceId}
                serviceId={serviceId}
                data={data}
              />
            ))}
          </div>
        </div>

        {/* ПРОБЛЕМЫ И РИСКИ */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '16px',
          padding: '20px',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <h2 style={{
            color: 'white',
            fontSize: '20px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            🚨 Проблемы и риски
            {stats.problemRequests > 0 && (
              <span style={{
                background: 'rgba(239,68,68,0.3)',
                borderRadius: '999px',
                padding: '4px 12px',
                fontSize: '14px',
                animation: 'pulse 2s infinite'
              }}>
                {stats.problemRequests}
              </span>
            )}
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {stats.problemRequests > 0 ? (
              <ProblemAlert
                type="urgent"
                message={`${stats.problemRequests} срочных заявок не выполнены`}
              />
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: 'rgba(255,255,255,0.4)'
              }}>
                ✅ Критических проблем нет
              </div>
            )}

            {stats.totalRequests === 0 && (
              <ProblemAlert
                type="warning"
                message="Нет заявок на сегодня"
              />
            )}
          </div>
        </div>
      </div>

      {/* ГРАФИКИ И СТАТИСТИКА */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px'
      }}>
        {/* График по дням недели (mock) */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '16px',
          padding: '20px',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <h3 style={{ color: 'white', fontSize: '16px', marginBottom: '16px' }}>
            📈 Динамика выполнения
          </h3>
          <div style={{
            height: '200px',
            display: 'flex',
            alignItems: 'flex-end',
            gap: '8px',
            padding: '20px 0'
          }}>
            {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day, i) => (
              <div key={day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '100%',
                  height: `${Math.random() * 150 + 50}px`,
                  background: 'linear-gradient(180deg, #8b5cf6 0%, #3b82f6 100%)',
                  borderRadius: '8px 8px 0 0',
                  transition: 'all 0.3s'
                }} />
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>{day}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Heatmap загрузки (mock) */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '16px',
          padding: '20px',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <h3 style={{ color: 'white', fontSize: '16px', marginBottom: '16px' }}>
            🔥 Heatmap загрузки служб
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {Object.entries(stats.byService).map(([serviceId, data]: any) => {
              const load = data.total > 0 ? Math.round((data.inProgress / data.total) * 100) : 0
              return (
                <div key={serviceId} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', width: '80px' }}>
                    {serviceId}
                  </div>
                  <div style={{
                    flex: 1,
                    height: '24px',
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '999px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${load}%`,
                      height: '100%',
                      background: load > 70 ? 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)'
                              : load > 40 ? 'linear-gradient(90deg, #eab308 0%, #ca8a04 100%)'
                              : 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)',
                      transition: 'width 0.5s'
                    }} />
                  </div>
                  <div style={{ color: 'white', fontSize: '14px', fontWeight: 'bold', width: '50px', textAlign: 'right' }}>
                    {load}%
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}

function KPICard({ title, value, color, trend, percentage, isText }: any) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)',
      borderRadius: '12px',
      padding: '16px',
      border: `1px solid ${color}40`
    }}>
      <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginBottom: '8px' }}>
        {title}
      </div>
      <div style={{
        color: isText ? color : color,
        fontSize: isText ? '20px' : '32px',
        fontWeight: 'bold',
        marginBottom: '8px'
      }}>
        {value}
      </div>
      {trend && (
        <div style={{
          color: trend.startsWith('+') ? '#22c55e' : trend === '🚨' ? '#ef4444' : '#6b7280',
          fontSize: '12px'
        }}>
          {trend}
        </div>
      )}
      {percentage !== undefined && (
        <div style={{
          marginTop: '8px',
          height: '4px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '999px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${percentage}%`,
            height: '100%',
            background: color,
            transition: 'width 0.5s'
          }} />
        </div>
      )}
    </div>
  )
}

function ServiceMonitor({ serviceId, data }: any) {
  const serviceColors: any = {
    'SRV-STR': '#8b5cf6',
    'SRV-ENG': '#eab308',
    'SRV-FIRE': '#ef4444',
    'SRV-VENT': '#06b6d4',
    'SRV-CCTV': '#22c55e'
  }

  const color = serviceColors[serviceId] || '#6b7280'
  const completionRate = data.total > 0 ? Math.round((data.done / data.total) * 100) : 0

  return (
    <div style={{
      background: 'rgba(0,0,0,0.2)',
      borderRadius: '12px',
      padding: '16px',
      border: `1px solid ${color}30`
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div>
          <div style={{ color: 'white', fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' }}>
            {serviceId}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>
            Всего: {data.total} • Выполнено: {data.done} • В работе: {data.inProgress}
          </div>
        </div>
        {data.problems > 0 && (
          <div style={{
            background: 'rgba(239,68,68,0.3)',
            borderRadius: '8px',
            padding: '6px 12px',
            color: '#ef4444',
            fontSize: '12px',
            fontWeight: 'bold',
            height: 'fit-content'
          }}>
            🚨 {data.problems}
          </div>
        )}
      </div>

      <div style={{
        height: '8px',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '999px',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${completionRate}%`,
          height: '100%',
          background: `linear-gradient(90deg, ${color} 0%, ${color}dd 100%)`,
          transition: 'width 0.5s'
        }} />
      </div>

      <div style={{
        marginTop: '8px',
        color: color,
        fontSize: '14px',
        fontWeight: 'bold'
      }}>
        {completionRate}% выполнено
      </div>
    </div>
  )
}

function ProblemAlert({ type, message }: any) {
  const colors: any = {
    urgent: { bg: 'rgba(239,68,68,0.2)', border: '#ef4444', icon: '🚨' },
    warning: { bg: 'rgba(234,179,8,0.2)', border: '#eab308', icon: '⚠️' }
  }

  const c = colors[type] || colors.warning

  return (
    <div style={{
      background: c.bg,
      border: `1px solid ${c.border}`,
      borderRadius: '10px',
      padding: '12px',
      color: 'white',
      fontSize: '13px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    }}>
      <span style={{ fontSize: '20px' }}>{c.icon}</span>
      <span>{message}</span>
    </div>
  )
}
