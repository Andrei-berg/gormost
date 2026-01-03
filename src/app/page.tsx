'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getCurrentShift, getCurrentPeriod } from '@/lib/shifts'

export default function HomePage() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [shift, setShift] = useState(getCurrentShift())
  const [period, setPeriod] = useState(getCurrentPeriod())

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date()
      setCurrentTime(now)
      setShift(getCurrentShift())
      setPeriod(getCurrentPeriod())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const panels = [
    {
      title: '📡 Диспетчерская',
      description: 'Центральный узел управления • Мониторинг смены',
      url: '/dispatcher',
      role: 'Начальник смены',
      color: 'rgba(59,130,246,0.2)',
      border: 'rgba(59,130,246,0.4)'
    },
    {
      title: '📋 Зам/Прораб',
      description: 'Планирование смены • Распределение людей',
      url: '/planner',
      role: 'Заместитель прораба',
      color: 'rgba(139,92,246,0.2)',
      border: 'rgba(139,92,246,0.4)'
    },
    {
      title: '👷 Мастер/Бригадир',
      description: 'Мои задачи • Выполнение работ',
      url: '/foreman',
      role: 'Мастер участка',
      color: 'rgba(34,197,94,0.2)',
      border: 'rgba(34,197,94,0.4)'
    },
    {
      title: '🏢 Начальник службы',
      description: 'План работ службы • Контроль выполнения',
      url: '/service-chief',
      role: 'Начальник службы',
      color: 'rgba(249,115,22,0.2)',
      border: 'rgba(249,115,22,0.4)'
    },
    {
      title: '👔 Босс (Дашборд)',
      description: 'KPI • Статистика • Проблемы • Heatmap',
      url: '/boss',
      role: 'Начальник участка',
      color: 'rgba(239,68,68,0.2)',
      border: 'rgba(239,68,68,0.4)'
    },
    {
      title: '🚗 Транспорт',
      description: 'Парк машин • Назначение транспорта',
      url: '/transport',
      role: 'Главный механик',
      color: 'rgba(234,179,8,0.2)',
      border: 'rgba(234,179,8,0.4)'
    },
    {
      title: '📞 Жалобы',
      description: 'Регистрация жалоб • Обработка обращений',
      url: '/complaints',
      role: 'Обработчик жалоб',
      color: 'rgba(167,139,250,0.2)',
      border: 'rgba(167,139,250,0.4)'
    },
    {
      title: '⚙️ Админ-панель',
      description: 'Справочники • Объекты • Пользователи',
      url: '/admin',
      role: 'Администратор',
      color: 'rgba(156,163,175,0.2)',
      border: 'rgba(156,163,175,0.4)'
    }
  ]

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      padding: '40px 20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated background */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at 20% 50%, rgba(59,130,246,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(139,92,246,0.1) 0%, transparent 50%)',
        zIndex: 0
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '1400px', margin: '0 auto' }}>
        {/* HEADER */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '20px',
          padding: '30px',
          marginBottom: '40px',
          border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '20px'
          }}>
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '15px',
                marginBottom: '15px'
              }}>
                <div style={{
                  fontSize: '48px',
                  lineHeight: 1
                }}>🏗️</div>
                <h1 style={{
                  fontSize: '42px',
                  fontWeight: 'bold',
                  color: 'white',
                  margin: 0,
                  background: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
                  Горmost
                </h1>
              </div>
              <p style={{
                color: 'rgba(255,255,255,0.7)',
                fontSize: '18px',
                margin: 0
              }}>
                Система управления работами Лефортовского тоннеля
              </p>
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid rgba(255,255,255,0.1)',
              minWidth: '280px'
            }}>
              <div style={{
                color: 'rgba(255,255,255,0.6)',
                fontSize: '13px',
                marginBottom: '8px'
              }}>
                Сейчас
              </div>
              <div style={{
                color: 'white',
                fontSize: '24px',
                fontWeight: 'bold',
                fontFamily: 'monospace',
                marginBottom: '12px'
              }}>
                {currentTime.toLocaleString('ru', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </div>
              <div style={{
                display: 'flex',
                gap: '10px',
                flexWrap: 'wrap'
              }}>
                <div style={{
                  background: 'rgba(59,130,246,0.2)',
                  border: '1px solid rgba(59,130,246,0.3)',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '13px',
                  color: 'white'
                }}>
                  👔 {shift.shiftName}
                </div>
                <div style={{
                  background: period === 'ДЕНЬ' ? 'rgba(234,179,8,0.2)' : 'rgba(139,92,246,0.2)',
                  border: period === 'ДЕНЬ' ? '1px solid rgba(234,179,8,0.3)' : '1px solid rgba(139,92,246,0.3)',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '13px',
                  color: 'white'
                }}>
                  {period === 'ДЕНЬ' ? '☀️' : '🌙'} {period}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PANELS GRID */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px'
        }}>
          {panels.map(panel => (
            <Link
              key={panel.url}
              href={panel.url}
              style={{
                textDecoration: 'none'
              }}
            >
              <div
                style={{
                  background: panel.color,
                  border: `1px solid ${panel.border}`,
                  borderRadius: '16px',
                  padding: '24px',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  height: '100%',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)'
                  e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.3)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <div style={{
                  fontSize: '32px',
                  marginBottom: '12px'
                }}>
                  {panel.title.split(' ')[0]}
                </div>

                <h2 style={{
                  color: 'white',
                  fontSize: '20px',
                  fontWeight: 'bold',
                  marginBottom: '10px',
                  margin: 0
                }}>
                  {panel.title.substring(panel.title.indexOf(' ') + 1)}
                </h2>

                <p style={{
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: '14px',
                  lineHeight: '1.5',
                  marginBottom: '16px'
                }}>
                  {panel.description}
                </p>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: '12px'
                  }}>
                    {panel.role}
                  </span>

                  <div style={{
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px'
                  }}>
                    →
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* FOOTER */}
        <div style={{
          marginTop: '60px',
          textAlign: 'center',
          color: 'rgba(255,255,255,0.4)',
          fontSize: '14px'
        }}>
          <p>
            Система управления работами • Лефортовский тоннель
          </p>
          <p style={{ marginTop: '8px', fontSize: '12px' }}>
            v1.0.0 • 2026 • Next.js 14 + Supabase
          </p>
        </div>
      </div>
    </div>
  )
}
