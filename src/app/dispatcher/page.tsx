'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import KPIPanel from '@/components/dispatcher/KPIPanel'
import KanbanBoard from '@/components/dispatcher/KanbanBoard'
import TableView from '@/components/dispatcher/TableView'

type ViewMode = 'kanban' | 'table'

export default function DispatcherPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('kanban')
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedShift, setSelectedShift] = useState<'DAY' | 'NIGHT'>('DAY')
  const [selectedService, setSelectedService] = useState<string>('ALL')

  useEffect(() => {
    loadRequests()
  }, [selectedDate, selectedShift, selectedService])

  async function loadRequests() {
    setLoading(true)
    
    let query = supabase
      .from('requests')
      .select('*')
      .eq('date_work', selectedDate)
      .eq('shift_type', selectedShift)
    
    if (selectedService !== 'ALL') {
      query = query.eq('service_id', selectedService)
    }
    
    const { data } = await query
    setRequests(data || [])
    setLoading(false)
  }

  const kpiData = {
    total: requests.length,
    new: requests.filter(r => r.status === 'NEW').length,
    inProgress: requests.filter(r => r.status === 'IN_PROGRESS').length,
    problems: requests.filter(r => !r.fact_finish && r.status !== 'DONE').length,
    done: requests.filter(r => r.status === 'DONE').length
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      padding: '20px'
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '20px',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '32px', color: 'white', margin: 0 }}>🎯 ДИСПЕТЧЕРСКАЯ</h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', margin: '5px 0 0 0' }}>
              Мониторинг смены в режиме реального времени
            </p>
          </div>
          <button onClick={loadRequests} style={{
            background: 'rgba(59,130,246,0.2)',
            border: '1px solid rgba(59,130,246,0.3)',
            borderRadius: '12px',
            padding: '12px 24px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '16px'
          }}>⟳ Обновить</button>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginBottom: '5px' }}>Дата</label>
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px', padding: '10px', color: 'white', fontSize: '14px'
            }}/>
          </div>

          <div>
            <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginBottom: '5px' }}>Смена</label>
            <select value={selectedShift} onChange={(e) => setSelectedShift(e.target.value as 'DAY' | 'NIGHT')} style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px', padding: '10px', color: 'white', fontSize: '14px', minWidth: '120px'
            }}>
              <option value="DAY">🌞 ДЕНЬ (7-19)</option>
              <option value="NIGHT">🌙 НОЧЬ (19-7)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginBottom: '5px' }}>Служба</label>
            <select value={selectedService} onChange={(e) => setSelectedService(e.target.value)} style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px', padding: '10px', color: 'white', fontSize: '14px', minWidth: '150px'
            }}>
              <option value="ALL">Все службы</option>
              <option value="SRV-STR">СЭИС</option>
              <option value="SRV-ENG">Энергетика</option>
              <option value="SRV-FIRE">Пожарка</option>
              <option value="SRV-VENT">Вентиляция</option>
              <option value="SRV-CCTV">Видеонаблюдение</option>
            </select>
          </div>
        </div>
      </div>

      <KPIPanel data={kpiData} />

      <div style={{
        background: 'rgba(255,255,255,0.05)', borderRadius: '16px', padding: '10px',
        marginTop: '20px', marginBottom: '20px', border: '1px solid rgba(255,255,255,0.1)',
        display: 'inline-flex', gap: '10px'
      }}>
        <button onClick={() => setViewMode('kanban')} style={{
          background: viewMode === 'kanban' ? 'rgba(59,130,246,0.3)' : 'transparent',
          border: viewMode === 'kanban' ? '1px solid rgba(59,130,246,0.5)' : '1px solid transparent',
          borderRadius: '10px', padding: '10px 20px', color: 'white', cursor: 'pointer',
          fontSize: '14px', fontWeight: viewMode === 'kanban' ? 'bold' : 'normal'
        }}>🗂️ Канбан</button>
        <button onClick={() => setViewMode('table')} style={{
          background: viewMode === 'table' ? 'rgba(59,130,246,0.3)' : 'transparent',
          border: viewMode === 'table' ? '1px solid rgba(59,130,246,0.5)' : '1px solid transparent',
          borderRadius: '10px', padding: '10px 20px', color: 'white', cursor: 'pointer',
          fontSize: '14px', fontWeight: viewMode === 'table' ? 'bold' : 'normal'
        }}>📊 Таблица</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(255,255,255,0.5)' }}>⏳ Загрузка...</div>
      ) : viewMode === 'kanban' ? (
        <KanbanBoard requests={requests} onRefresh={loadRequests} />
      ) : (
        <TableView requests={requests} />
      )}
    </div>
  )
}
