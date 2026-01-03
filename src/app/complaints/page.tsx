'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'

export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState<any[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({
    source: 'phone',
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    description: '',
    location: '',
    service_id: ''
  })

  useEffect(() => {
    loadComplaints()

    const channel = supabase
      .channel('complaints-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'complaints' }, () => {
        loadComplaints()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  async function loadComplaints() {
    const { data } = await supabase
      .from('complaints')
      .select('*, requests(*)')
      .order('created_at', { ascending: false })
      .limit(50)

    setComplaints(data || [])
  }

  async function createComplaint() {
    if (!formData.description || !formData.contact_name) {
      alert('Заполните описание и контакт')
      return
    }

    const { data, error } = await supabase
      .from('complaints')
      .insert([{
        ...formData,
        status: 'new',
        received_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (error) {
      alert('Ошибка: ' + error.message)
      return
    }

    setFormData({
      source: 'phone',
      contact_name: '',
      contact_phone: '',
      contact_email: '',
      description: '',
      location: '',
      service_id: ''
    })
    setShowCreateForm(false)
    loadComplaints()
  }

  async function createRequestFromComplaint(complaint: any) {
    // Создаём заявку из жалобы
    const { data: request, error } = await supabase
      .from('requests')
      .insert([{
        service_id: complaint.service_id || 'SRV-STR',
        date_work: new Date().toISOString().split('T')[0],
        location_text: complaint.location || 'Не указано',
        work_description: `ЖАЛОБА: ${complaint.description}`,
        priority: 'urgent',
        status: 'new',
        created_by: 'complaints-handler'
      }])
      .select()
      .single()

    if (error) {
      alert('Ошибка создания заявки: ' + error.message)
      return
    }

    // Связываем жалобу с заявкой
    await supabase
      .from('complaints')
      .update({
        request_id: request.request_id,
        status: 'request_created'
      })
      .eq('complaint_id', complaint.complaint_id)

    loadComplaints()
    alert(`Создана заявка ${request.request_id}`)
  }

  async function markResolved(complaintId: string) {
    await supabase
      .from('complaints')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('complaint_id', complaintId)

    loadComplaints()
  }

  const stats = {
    total: complaints.length,
    new: complaints.filter(c => c.status === 'new').length,
    inProgress: complaints.filter(c => c.status === 'request_created').length,
    resolved: complaints.filter(c => c.status === 'resolved').length
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      padding: '20px'
    }}>
      <Header
        title="📞 ОБРАБОТКА ЖАЛОБ И ОБРАЩЕНИЙ"
        subtitle="Приём звонков • Email • Создание заявок • Контроль исполнения"
        userRole="Обработчик жалоб"
        userName="Операторский отдел"
      />

      {/* Статистика */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        marginBottom: '20px'
      }}>
        <StatCard title="Всего жалоб" value={stats.total} color="#8b5cf6" />
        <StatCard title="Новые" value={stats.new} color="#ef4444" />
        <StatCard title="В работе" value={stats.inProgress} color="#eab308" />
        <StatCard title="Решены" value={stats.resolved} color="#22c55e" />
      </div>

      {/* Кнопка создания */}
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          style={{
            background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
            border: 'none',
            borderRadius: '12px',
            padding: '14px 24px',
            color: 'white',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '16px'
          }}
        >
          ➕ Зарегистрировать жалобу
        </button>
      </div>

      {/* Форма создания */}
      {showCreateForm && (
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '20px',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <h3 style={{ color: 'white', fontSize: '18px', marginBottom: '16px' }}>
            Регистрация новой жалобы
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', display: 'block', marginBottom: '6px' }}>
                Источник
              </label>
              <select
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                  padding: '10px',
                  color: 'white'
                }}
              >
                <option value="phone">📞 Телефон</option>
                <option value="email">📧 Email</option>
                <option value="other">📝 Другое</option>
              </select>
            </div>

            <div>
              <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', display: 'block', marginBottom: '6px' }}>
                Имя контакта *
              </label>
              <input
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                placeholder="Иванов Иван Иванович"
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                  padding: '10px',
                  color: 'white'
                }}
              />
            </div>

            <div>
              <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', display: 'block', marginBottom: '6px' }}>
                Телефон
              </label>
              <input
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                placeholder="+7 (999) 123-45-67"
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                  padding: '10px',
                  color: 'white'
                }}
              />
            </div>

            <div>
              <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', display: 'block', marginBottom: '6px' }}>
                Email
              </label>
              <input
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                placeholder="example@mail.ru"
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                  padding: '10px',
                  color: 'white'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', display: 'block', marginBottom: '6px' }}>
              Описание жалобы *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Что случилось? Суть проблемы..."
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px',
                padding: '12px',
                color: 'white',
                minHeight: '100px',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', display: 'block', marginBottom: '6px' }}>
                Место (если известно)
              </label>
              <input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Камера 12, выход СВАК-7..."
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                  padding: '10px',
                  color: 'white'
                }}
              />
            </div>

            <div>
              <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', display: 'block', marginBottom: '6px' }}>
                Служба (если очевидно)
              </label>
              <select
                value={formData.service_id}
                onChange={(e) => setFormData({ ...formData, service_id: e.target.value })}
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                  padding: '10px',
                  color: 'white'
                }}
              >
                <option value="">Не определена</option>
                <option value="SRV-STR">СЭИС (STR)</option>
                <option value="SRV-ENG">Энергетика (ENG)</option>
                <option value="SRV-FIRE">Пожарка (FIRE)</option>
                <option value="SRV-VENT">Вентиляция (VENT)</option>
                <option value="SRV-CCTV">Видеонаблюдение (CCTV)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={createComplaint}
              style={{
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                border: 'none',
                borderRadius: '10px',
                padding: '12px 24px',
                color: 'white',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              💾 Сохранить жалобу
            </button>
            <button
              onClick={() => setShowCreateForm(false)}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '10px',
                padding: '12px 24px',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              ✖ Отмена
            </button>
          </div>
        </div>
      )}

      {/* Список жалоб */}
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '16px',
        padding: '20px',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <h3 style={{ color: 'white', fontSize: '18px', marginBottom: '16px' }}>
          Список жалоб
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {complaints.map(c => (
            <ComplaintCard
              key={c.complaint_id}
              complaint={c}
              onCreateRequest={createRequestFromComplaint}
              onResolve={markResolved}
            />
          ))}

          {complaints.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.4)' }}>
              Жалоб пока нет
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, color }: any) {
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
      <div style={{ color, fontSize: '32px', fontWeight: 'bold' }}>
        {value}
      </div>
    </div>
  )
}

function ComplaintCard({ complaint, onCreateRequest, onResolve }: any) {
  const statusColor = {
    new: '#ef4444',
    request_created: '#eab308',
    resolved: '#22c55e'
  }[complaint.status] || '#6b7280'

  const statusText = {
    new: 'Новая',
    request_created: 'Заявка создана',
    resolved: 'Решена'
  }[complaint.status] || complaint.status

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: `1px solid ${statusColor}40`,
      borderRadius: '12px',
      padding: '16px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div>
          <div style={{ color: 'white', fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>
            {complaint.complaint_id} • {new Date(complaint.received_at).toLocaleString('ru-RU')}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>
            {complaint.source === 'phone' ? '📞' : '📧'} {complaint.contact_name} • {complaint.contact_phone}
          </div>
        </div>
        <div style={{
          background: `${statusColor}30`,
          borderRadius: '8px',
          padding: '6px 12px',
          height: 'fit-content',
          color: statusColor,
          fontSize: '12px',
          fontWeight: 'bold'
        }}>
          {statusText}
        </div>
      </div>

      <div style={{
        background: 'rgba(0,0,0,0.3)',
        borderRadius: '8px',
        padding: '12px',
        marginBottom: '12px',
        color: 'rgba(255,255,255,0.9)',
        fontSize: '13px'
      }}>
        {complaint.description}
      </div>

      {complaint.location && (
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginBottom: '12px' }}>
          📍 {complaint.location}
        </div>
      )}

      {complaint.request_id && (
        <div style={{
          background: 'rgba(234,179,8,0.2)',
          borderRadius: '8px',
          padding: '8px 12px',
          marginBottom: '12px',
          color: 'white',
          fontSize: '12px'
        }}>
          🔗 Связана с заявкой: <strong>{complaint.request_id}</strong>
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px' }}>
        {complaint.status === 'new' && (
          <button
            onClick={() => onCreateRequest(complaint)}
            style={{
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold'
            }}
          >
            ➕ Создать заявку
          </button>
        )}

        {complaint.status !== 'resolved' && (
          <button
            onClick={() => onResolve(complaint.complaint_id)}
            style={{
              background: 'rgba(59,130,246,0.2)',
              border: '1px solid rgba(59,130,246,0.4)',
              borderRadius: '8px',
              padding: '8px 16px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            ✅ Отметить решённой
          </button>
        )}
      </div>
    </div>
  )
}
