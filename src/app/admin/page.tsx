'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Tab = 'objects' | 'workers' | 'services' | 'teams' | 'shifts'

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>('objects')
  
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
        <h1 style={{ color: 'white', margin: 0, fontSize: '28px' }}>⚙️ АДМИН-ПАНЕЛЬ</h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', margin: '8px 0 0 0' }}>
          Управление справочниками и настройками системы
        </p>
      </div>

      <div style={{
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '16px',
        padding: '10px',
        marginBottom: '20px',
        border: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        gap: '10px',
        flexWrap: 'wrap'
      }}>
        <TabButton active={activeTab === 'objects'} onClick={() => setActiveTab('objects')}>
          📍 Объекты
        </TabButton>
        <TabButton active={activeTab === 'workers'} onClick={() => setActiveTab('workers')}>
          👷 Работники
        </TabButton>
        <TabButton active={activeTab === 'services'} onClick={() => setActiveTab('services')}>
          🏢 Службы
        </TabButton>
        <TabButton active={activeTab === 'teams'} onClick={() => setActiveTab('teams')}>
          👥 Бригады
        </TabButton>
        <TabButton active={activeTab === 'shifts'} onClick={() => setActiveTab('shifts')}>
          🕐 Смены
        </TabButton>
      </div>

      {activeTab === 'objects' && <ObjectsManager />}
      {activeTab === 'workers' && <WorkersManager />}
      {activeTab === 'services' && <ServicesManager />}
      {activeTab === 'teams' && <TeamsManager />}
      {activeTab === 'shifts' && <ShiftsManager />}
    </div>
  )
}

function TabButton({ active, onClick, children }: any) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? 'rgba(59,130,246,0.3)' : 'transparent',
        border: active ? '1px solid rgba(59,130,246,0.5)' : '1px solid transparent',
        borderRadius: '10px',
        padding: '12px 20px',
        color: 'white',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: active ? 'bold' : 'normal'
      }}
    >
      {children}
    </button>
  )
}

function ObjectsManager() {
  const [objects, setObjects] = useState<any[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: '', type: '', description: '' })

  useEffect(() => {
    loadObjects()
  }, [])

  async function loadObjects() {
    const { data } = await supabase
      .from('objects')
      .select('*')
      .order('name')
    setObjects(data || [])
  }

  async function saveObject() {
    if (!formData.name) return alert('Укажите название объекта')

    if (editingId) {
      await supabase
        .from('objects')
        .update(formData)
        .eq('object_id', editingId)
    } else {
      await supabase
        .from('objects')
        .insert([formData])
    }

    setFormData({ name: '', type: '', description: '' })
    setEditingId(null)
    loadObjects()
  }

  async function deleteObject(id: string) {
    if (!confirm('Удалить объект?')) return
    await supabase.from('objects').delete().eq('object_id', id)
    loadObjects()
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)',
      borderRadius: '16px',
      padding: '20px',
      border: '1px solid rgba(255,255,255,0.1)'
    }}>
      <h2 style={{ color: 'white', fontSize: '18px', marginBottom: '20px' }}>
        📍 ОБЪЕКТЫ (тоннель, школа, переходники, сооружения)
      </h2>

      <div style={{ marginBottom: '30px', display: 'grid', gridTemplateColumns: '1fr 1fr 2fr auto', gap: '10px' }}>
        <input
          placeholder="Название (Камера 12)"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            padding: '12px',
            color: 'white'
          }}
        />
        <select
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            padding: '12px',
            color: 'white'
          }}
        >
          <option value="">Тип</option>
          <option value="tunnel">Тоннель</option>
          <option value="school">Школа</option>
          <option value="bridge">Переходник</option>
          <option value="building">Сооружение</option>
          <option value="other">Другое</option>
        </select>
        <input
          placeholder="Описание"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            padding: '12px',
            color: 'white'
          }}
        />
        <button
          onClick={saveObject}
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
          {editingId ? '💾 Сохранить' : '➕ Добавить'}
        </button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <th style={{ padding: '12px', textAlign: 'left', color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>
              НАЗВАНИЕ
            </th>
            <th style={{ padding: '12px', textAlign: 'left', color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>
              ТИП
            </th>
            <th style={{ padding: '12px', textAlign: 'left', color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>
              ОПИСАНИЕ
            </th>
            <th style={{ padding: '12px', textAlign: 'right', color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>
              ДЕЙСТВИЯ
            </th>
          </tr>
        </thead>
        <tbody>
          {objects.map(obj => (
            <tr key={obj.object_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <td style={{ padding: '12px', color: 'white' }}>{obj.name}</td>
              <td style={{ padding: '12px', color: 'rgba(255,255,255,0.7)' }}>{obj.type}</td>
              <td style={{ padding: '12px', color: 'rgba(255,255,255,0.7)' }}>{obj.description}</td>
              <td style={{ padding: '12px', textAlign: 'right' }}>
                <button
                  onClick={() => {
                    setEditingId(obj.object_id)
                    setFormData({ name: obj.name, type: obj.type, description: obj.description })
                  }}
                  style={{
                    background: 'rgba(59,130,246,0.2)',
                    border: '1px solid rgba(59,130,246,0.3)',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    color: 'white',
                    cursor: 'pointer',
                    marginRight: '8px'
                  }}
                >
                  ✏️
                </button>
                <button
                  onClick={() => deleteObject(obj.object_id)}
                  style={{
                    background: 'rgba(239,68,68,0.2)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    color: 'white',
                    cursor: 'pointer'
                  }}
                >
                  🗑️
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {objects.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.4)' }}>
          Объекты не добавлены
        </div>
      )}
    </div>
  )
}

function WorkersManager() {
  return <div style={{ color: 'white', padding: '20px' }}>Управление работниками (импорт из Excel позже)</div>
}

function ServicesManager() {
  return <div style={{ color: 'white', padding: '20px' }}>Управление службами</div>
}

function TeamsManager() {
  return <div style={{ color: 'white', padding: '20px' }}>Управление бригадами</div>
}

function ShiftsManager() {
  return <div style={{ color: 'white', padding: '20px' }}>Настройка смен</div>
}
