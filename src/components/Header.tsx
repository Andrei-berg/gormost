'use client'
import { useEffect, useState } from 'react'
import { getCurrentShift, getCurrentPeriod, formatDate, formatTime, getPeriodText, ShiftInfo } from '@/lib/shifts'

interface HeaderProps {
  title?: string
  subtitle?: string
  userRole?: string
  userName?: string
}

export default function Header({ title, subtitle, userRole, userName }: HeaderProps) {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [shift, setShift] = useState<ShiftInfo | null>(null)
  const [period, setPeriod] = useState<'day' | 'night'>('day')

  useEffect(() => {
    // Обновляем время каждую секунду
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    // Обновляем смену каждую минуту
    const updateShift = () => {
      setShift(getCurrentShift())
      setPeriod(getCurrentPeriod())
    }
    updateShift()
    const shiftTimer = setInterval(updateShift, 60000)

    return () => {
      clearInterval(timer)
      clearInterval(shiftTimer)
    }
  }, [])

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(59,130,246,0.15) 100%)',
      borderRadius: '16px',
      padding: '20px 24px',
      marginBottom: '20px',
      border: '1px solid rgba(255,255,255,0.15)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '16px'
    }}>
      {/* Левая часть: название панели */}
      <div>
        <h1 style={{
          color: 'white',
          margin: 0,
          fontSize: '28px',
          fontWeight: 'bold',
          marginBottom: subtitle ? '8px' : 0
        }}>
          {title || 'Лефортовский тоннель'}
        </h1>
        {subtitle && (
          <p style={{
            color: 'rgba(255,255,255,0.7)',
            margin: 0,
            fontSize: '14px'
          }}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Правая часть: дата, время, смена */}
      <div style={{
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        {/* Дата и время */}
        <div style={{
          background: 'rgba(0,0,0,0.3)',
          borderRadius: '12px',
          padding: '10px 16px',
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
          <div style={{
            color: 'rgba(255,255,255,0.6)',
            fontSize: '11px',
            marginBottom: '4px'
          }}>
            ДАТА И ВРЕМЯ
          </div>
          <div style={{
            color: 'white',
            fontSize: '16px',
            fontWeight: 'bold',
            fontFamily: 'monospace'
          }}>
            {formatDate(currentTime)} • {formatTime(currentTime)}
          </div>
        </div>

        {/* Смена */}
        {shift && (
          <div style={{
            background: 'rgba(139,92,246,0.25)',
            borderRadius: '12px',
            padding: '10px 16px',
            border: '1px solid rgba(139,92,246,0.4)'
          }}>
            <div style={{
              color: 'rgba(255,255,255,0.6)',
              fontSize: '11px',
              marginBottom: '4px'
            }}>
              ТЕКУЩАЯ СМЕНА
            </div>
            <div style={{
              color: 'white',
              fontSize: '16px',
              fontWeight: 'bold'
            }}>
              {shift.shiftName} • {shift.chiefName}
            </div>
          </div>
        )}

        {/* День/Ночь */}
        <div style={{
          background: period === 'day' 
            ? 'rgba(234,179,8,0.25)' 
            : 'rgba(59,130,246,0.25)',
          borderRadius: '12px',
          padding: '10px 16px',
          border: period === 'day'
            ? '1px solid rgba(234,179,8,0.4)'
            : '1px solid rgba(59,130,246,0.4)'
        }}>
          <div style={{
            color: 'rgba(255,255,255,0.6)',
            fontSize: '11px',
            marginBottom: '4px'
          }}>
            ПЕРИОД
          </div>
          <div style={{
            color: 'white',
            fontSize: '16px',
            fontWeight: 'bold'
          }}>
            {period === 'day' ? '☀️ ДЕНЬ' : '🌙 НОЧЬ'}
          </div>
        </div>

        {/* Пользователь (если передан) */}
        {userName && (
          <div style={{
            background: 'rgba(34,197,94,0.25)',
            borderRadius: '12px',
            padding: '10px 16px',
            border: '1px solid rgba(34,197,94,0.4)'
          }}>
            <div style={{
              color: 'rgba(255,255,255,0.6)',
              fontSize: '11px',
              marginBottom: '4px'
            }}>
              {userRole?.toUpperCase() || 'ПОЛЬЗОВАТЕЛЬ'}
            </div>
            <div style={{
              color: 'white',
              fontSize: '16px',
              fontWeight: 'bold'
            }}>
              {userName}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
