'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestPage() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: requests } = await supabase.from('requests').select('*')
      setData(requests || [])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div style={{ padding: '40px', fontFamily: 'system-ui', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '32px', marginBottom: '30px' }}>🚀 Тест Supabase</h1>
      
      {loading && <p>⏳ Загрузка...</p>}
      
      {!loading && data.length === 0 && <p>⚠️ Нет данных</p>}
      
      {!loading && data.length > 0 && (
        <div>
          <p style={{ color: '#4caf50', fontWeight: 'bold', marginBottom: '20px' }}>
            ✅ УСПЕХ! Найдено заявок: {data.length}
          </p>
          {data.map(r => (
            <div key={r.id} style={{ 
              padding: '20px', 
              background: '#f5f5f5', 
              marginBottom: '15px',
              borderRadius: '8px',
              border: '1px solid #ddd'
            }}>
              <strong style={{ color: '#1976d2', fontSize: '18px' }}>{r.request_id}</strong>
              <p>📍 {r.location_text}</p>
              <p>📝 {r.work_description}</p>
              <p style={{ fontSize: '13px', color: '#666', marginTop: '10px' }}>
                🏢 {r.service_id} | 📅 {r.date_work} | 🌙 {r.shift_type}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
