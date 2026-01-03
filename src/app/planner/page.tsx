'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type ShiftType = 'DAY' | 'NIGHT'

export default function PlannerPage() {
  const [plans, setPlans] = useState<any[]>([])
  const [staffRequests, setStaffRequests] = useState<any[]>([])
  const [workers, setWorkers] = useState<any[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [shiftType, setShiftType] = useState<ShiftType>('DAY')
  const [selectedPlan, setSelectedPlan] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [selectedDate, shiftType])

  async function loadData() {
    setLoading(true)
    
    // Планы от начальников служб
    const { data: plansData } = await supabase
      .from('requests')
      .select('*')
      .eq('date_work', selectedDate)
      .eq('shift_type', shiftType)
      .is('approved_by', null) // Неутверждённые
    
    // Запросы персонала
    const { data: staffReqData } = await supabase
      .from('staff_requests')
      .select('*')
      .eq('date_work', selectedDate)
      .eq('shift_no', shiftType === 'DAY' ? 1 : 2)
    
    // Сотрудники
    const { data: workersData } = await supabase
      .from('users')
      .select('*')
      .eq('is_active', true)
      .order('full_name')
    
    setPlans(plansData || [])
    setStaffRequests(staffReqData || [])
    setWorkers(workersData || [])
    setLoading(false)
  }

  async function assignWorkers(planId: string, workerIds: string[]) {
    await supabase
      .from('requests')
      .update({ 
        assigned_users: workerIds,
        status: 'PLANNED'
      })
      .eq('request_id', planId)
    
    loadData()
  }

  async function approvePlan(planId: string) {
    const userId = 'USR-BOSS' // TODO: из auth
    
    await supabase
      .from('requests')
      .update({ 
        approved_by: userId,
        approved_at: new Date().toISOString(),
        status: 'PLANNED'
      })
      .eq('request_id', planId)
    
    loadData()
  }

  const plansByService = plans.reduce((acc: any, plan) => {
    const service = plan.service_id || 'OTHER'
    if (!acc[service]) acc[service] = []
    acc[service].push(plan)
    return acc
  }, {})

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
            <h1 style={{ color: 'white', margin: 0, fontSize: '28px' }}>📋 ПЛАНИРОВАНИЕ СМЕНЫ</h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', margin: '8px 0 0 0' }}>
              Сбор планов от служб • Распределение персонала • Утверждение работ
            </p>
          </div>
          <button
            onClick={loadData}
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
        <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
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
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShiftType('DAY')}
                style={{
                  background: shiftType === 'DAY' ? 'rgba(234,179,8,0.3)' : 'rgba(255,255,255,0.05)',
                  border: shiftType === 'DAY' ? '1px solid rgba(234,179,8,0.5)' : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: shiftType === 'DAY' ? 'bold' : 'normal'
                }}
              >
                🌞 ДЕНЬ (7-19)
              </button>
              <button
                onClick={() => setShiftType('NIGHT')}
                style={{
                  background: shiftType === 'NIGHT' ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.05)',
                  border: shiftType === 'NIGHT' ? '1px solid rgba(139,92,246,0.5)' : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: shiftType === 'NIGHT' ? 'bold' : 'normal'
                }}
              >
                🌙 НОЧЬ (19-7)
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(255,255,255,0.5)' }}>
          ⏳ Загрузка...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
          {/* LEFT: ПЛАНЫ ОТ СЛУЖБ */}
          <div>
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '16px',
              padding: '20px',
              border: '1px solid rgba(255,255,255,0.1)',
              marginBottom: '20px'
            }}>
              <h2 style={{ color: 'white', fontSize: '18px', margin: '0 0 15px 0' }}>
                📥 ПЛАНЫ ОТ СЛУЖБ ({plans.length})
              </h2>
              
              {Object.entries(plansByService).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.4)' }}>
                  Нет планов на эту смену
                </div>
              ) : (
                Object.entries(plansByService).map(([service, servicePlans]: any) => (
                  <ServicePlansGroup
                    key={service}
                    service={service}
                    plans={servicePlans}
                    workers={workers}
                    onSelect={setSelectedPlan}
                    onAssign={assignWorkers}
                    onApprove={approvePlan}
                  />
                ))
              )}
            </div>

            {/* ЗАПРОСЫ ПЕРСОНАЛА */}
            {staffRequests.length > 0 && (
              <div style={{
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '16px',
                padding: '20px',
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                <h2 style={{ color: 'white', fontSize: '18px', margin: '0 0 15px 0' }}>
                  📨 ЗАПРОСЫ ПЕРСОНАЛА ({staffRequests.length})
                </h2>
                
                {staffRequests.map(req => (
                  <StaffRequestCard key={req.staff_request_id} request={req} />
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: ДЕТАЛИ ВЫБРАННОГО ПЛАНА */}
          <div>
            {selectedPlan ? (
              <PlanDetails 
                plan={selectedPlan} 
                workers={workers}
                onAssign={assignWorkers}
                onApprove={approvePlan}
              />
            ) : (
              <div style={{
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '16px',
                padding: '40px',
                border: '1px solid rgba(255,255,255,0.1)',
                textAlign: 'center',
                color: 'rgba(255,255,255,0.4)'
              }}>
                Выберите план для назначения людей
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ServicePlansGroup({ service, plans, workers, onSelect, onAssign, onApprove }: any) {
  const [collapsed, setCollapsed] = useState(false)
  
  const serviceColors: any = {
    'SRV-STR': '#8b5cf6',
    'SRV-ENG': '#eab308',
    'SRV-FIRE': '#ef4444',
    'SRV-VENT': '#06b6d4',
    'SRV-CCTV': '#22c55e'
  }
  
  const color = serviceColors[service] || '#64748b'

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '12px',
      marginBottom: '15px',
      overflow: 'hidden'
    }}>
      <div
        onClick={() => setCollapsed(!collapsed)}
        style={{
          background: `linear-gradient(135deg, ${color}20 0%, ${color}10 100%)`,
          padding: '12px 15px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>{collapsed ? '▶️' : '🔽'}</span>
          <span style={{ color: 'white', fontWeight: 'bold' }}>
            {service.replace('SRV-', '')}
          </span>
          <span style={{
            background: `${color}40`,
            color,
            padding: '3px 8px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 'bold'
          }}>
            {plans.length}
          </span>
        </div>
      </div>

      {!collapsed && (
        <div style={{ padding: '10px' }}>
          {plans.map((plan: any) => (
            <div
              key={plan.request_id}
              onClick={() => onSelect(plan)}
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px', fontFamily: 'monospace' }}>
                {plan.request_id}
              </div>
              <div style={{ fontSize: '14px', color: 'white', fontWeight: 'bold', marginBottom: '4px' }}>
                📍 {plan.location_text}
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}>
                {plan.work_description}
              </div>
              
              {plan.assigned_users && plan.assigned_users.length > 0 ? (
                <div style={{ fontSize: '11px', color: '#22c55e' }}>
                  ✅ Назначено: {plan.assigned_users.length} чел.
                </div>
              ) : (
                <div style={{ fontSize: '11px', color: '#eab308' }}>
                  ⚠️ Не назначено
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StaffRequestCard({ request }: any) {
  return (
    <div style={{
      background: 'rgba(59,130,246,0.05)',
      border: '1px solid rgba(59,130,246,0.2)',
      borderRadius: '10px',
      padding: '15px',
      marginBottom: '10px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ color: 'white', fontWeight: 'bold' }}>
          {request.from_service_id} → {request.to_service_id}
        </span>
        <span style={{
          background: 'rgba(234,179,8,0.3)',
          color: '#eab308',
          padding: '3px 8px',
          borderRadius: '6px',
          fontSize: '11px',
          fontWeight: 'bold'
        }}>
          {request.needed_count} чел.
        </span>
      </div>
      <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginBottom: '10px' }}>
        {request.comment || 'Нужны люди на работу'}
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button style={{
          flex: 1,
          background: 'rgba(34,197,94,0.2)',
          border: '1px solid rgba(34,197,94,0.3)',
          borderRadius: '6px',
          padding: '8px',
          color: '#22c55e',
          cursor: 'pointer',
          fontSize: '12px'
        }}>
          ✅ Одобрить
        </button>
        <button style={{
          flex: 1,
          background: 'rgba(239,68,68,0.2)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '6px',
          padding: '8px',
          color: '#ef4444',
          cursor: 'pointer',
          fontSize: '12px'
        }}>
          ❌ Отклонить
        </button>
      </div>
    </div>
  )
}

function PlanDetails({ plan, workers, onAssign, onApprove }: any) {
  const [selected, setSelected] = useState<string[]>(plan.assigned_users || [])
  
  const serviceWorkers = workers.filter((w: any) => w.service_id === plan.service_id)
  const otherWorkers = workers.filter((w: any) => w.service_id !== plan.service_id)

  const handleAssign = () => {
    onAssign(plan.request_id, selected)
  }

  const handleApprove = () => {
    if (selected.length === 0) {
      alert('Сначала назначьте людей!')
      return
    }
    onApprove(plan.request_id)
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)',
      borderRadius: '16px',
      padding: '20px',
      border: '1px solid rgba(255,255,255,0.1)'
    }}>
      <h3 style={{ color: 'white', margin: '0 0 15px 0', fontSize: '16px' }}>
        👥 НАЗНАЧЕНИЕ ЛЮДЕЙ
      </h3>

      <div style={{
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '10px',
        padding: '15px',
        marginBottom: '15px'
      }}>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px', fontFamily: 'monospace' }}>
          {plan.request_id}
        </div>
        <div style={{ fontSize: '15px', color: 'white', fontWeight: 'bold', marginBottom: '6px' }}>
          📍 {plan.location_text}
        </div>
        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
          {plan.work_description}
        </div>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', marginBottom: '10px', fontWeight: 'bold' }}>
          ИЗ СВОЕЙ СЛУЖБЫ ({plan.service_id}):
        </div>
        {serviceWorkers.map((worker: any) => (
          <WorkerCheckbox
            key={worker.user_id}
            worker={worker}
            selected={selected}
            onToggle={(id) => {
              setSelected(prev => 
                prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
              )
            }}
          />
        ))}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', marginBottom: '10px', fontWeight: 'bold' }}>
          ИЗ ДРУГИХ СЛУЖБ:
        </div>
        {otherWorkers.slice(0, 10).map((worker: any) => (
          <WorkerCheckbox
            key={worker.user_id}
            worker={worker}
            selected={selected}
            onToggle={(id) => {
              setSelected(prev => 
                prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
              )
            }}
          />
        ))}
      </div>

      <div style={{
        background: 'rgba(59,130,246,0.1)',
        borderRadius: '10px',
        padding: '12px',
        marginBottom: '15px',
        textAlign: 'center'
      }}>
        <div style={{ color: 'white', fontSize: '14px' }}>
          Выбрано: <strong>{selected.length}</strong> чел.
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button
          onClick={handleAssign}
          style={{
            background: 'rgba(59,130,246,0.3)',
            border: '1px solid rgba(59,130,246,0.5)',
            borderRadius: '10px',
            padding: '14px',
            color: 'white',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          💾 Назначить людей
        </button>
        
        <button
          onClick={handleApprove}
          style={{
            background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
            border: 'none',
            borderRadius: '10px',
            padding: '14px',
            color: 'white',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          ✅ УТВЕРДИТЬ ПЛАН
        </button>
      </div>
    </div>
  )
}

function WorkerCheckbox({ worker, selected, onToggle }: any) {
  const isSelected = selected.includes(worker.user_id)
  
  return (
    <div
      onClick={() => onToggle(worker.user_id)}
      style={{
        background: isSelected ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.02)',
        border: isSelected ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(255,255,255,0.05)',
        borderRadius: '8px',
        padding: '10px',
        marginBottom: '6px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        transition: 'all 0.2s'
      }}
    >
      <input
        type="checkbox"
        checked={isSelected}
        readOnly
        style={{ cursor: 'pointer' }}
      />
      <div style={{ flex: 1 }}>
        <div style={{ color: 'white', fontSize: '13px' }}>
          {worker.full_name}
        </div>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
          {worker.service_id} • {worker.is_brigadier ? '🧡 Бригадир' : '👷 Рабочий'}
        </div>
      </div>
    </div>
  )
}
