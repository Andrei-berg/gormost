'use client'
import { useState, useEffect, useCallback } from 'react'
import AuthGuard from '@/components/AuthGuard'
import Header from '@/components/Header'
import { fetchRemarks, createRemark, fetchRequests } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { logAction } from '@/lib/logger'
import EmptyState from '@/components/EmptyState'
import type { AuthSession, Remark } from '@/types'

interface Complaint {
  id: string
  source: string
  description: string
  status: 'NEW' | 'IN_PROGRESS' | 'RESOLVED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  created_by: string
  assigned_to: string | null
  resolution: string | null
  created_at: string
}

export default function ComplaintsPage() {
  return (
    <AuthGuard roles={['COMPLAINTS', 'ADMIN', 'BOSS', 'DISPATCHER']}>
      {(session) => <Content session={session} />}
    </AuthGuard>
  )
}

function Content({ session }: { session: AuthSession }) {
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [showForm, setShowForm] = useState(false)
  const [source, setSource] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM')
  const [filter, setFilter] = useState<'all' | 'NEW' | 'IN_PROGRESS' | 'RESOLVED'>('all')
  const [saving, setSaving] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const loadData = useCallback(async () => {
    // Using remarks table as complaints storage
    const { data } = await supabase.from('remarks')
      .select('*')
      .order('created_at', { ascending: false })
    // Map remarks to complaint-like structure
    const mapped: Complaint[] = (data || []).map((r: any) => ({
      id: r.id,
      source: r.remark_text?.split('|')[0] || '',
      description: r.remark_text?.split('|').slice(1).join('|') || r.remark_text || '',
      status: r.is_critical ? 'NEW' : 'RESOLVED',
      priority: r.is_critical ? 'HIGH' : 'MEDIUM',
      created_by: r.user_id || '',
      assigned_to: null,
      resolution: null,
      created_at: r.created_at,
    }))
    setComplaints(mapped)
    setLastUpdated(new Date())
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleSubmit = async () => {
    if (!description.trim()) return
    setSaving(true)
    try {
      await createRemark({
        request_id: 'COMPLAINT',
        user_id: session.user_id,
        remark_text: `${source}|${description}`,
        is_critical: priority === 'HIGH',
      })
      await logAction(session.user_id, 'CREATE_COMPLAINT', 'complaint', null, { source, description, priority })
      setShowForm(false)
      setSource('')
      setDescription('')
      setPriority('MEDIUM')
      loadData()
    } finally {
      setSaving(false)
    }
  }

  const filtered = filter === 'all' ? complaints : complaints.filter(c => c.status === filter)

  return (
    <div className="min-h-screen p-4 max-w-5xl mx-auto">
      <Header session={session} title="Жалобы" emoji="📞" mode="LIVE" lastUpdated={lastUpdated} />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="glass rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white font-mono">{complaints.length}</div>
          <div className="text-xs text-white/40">Всего</div>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-amber-400 font-mono">{complaints.filter(c => c.status === 'NEW').length}</div>
          <div className="text-xs text-white/40">Новые</div>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-400 font-mono">{complaints.filter(c => c.status === 'RESOLVED').length}</div>
          <div className="text-xs text-white/40">Решено</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {(['all', 'NEW', 'IN_PROGRESS', 'RESOLVED'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm ${filter === f ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/50'}`}>
            {f === 'all' ? 'Все' : f === 'NEW' ? 'Новые' : f === 'IN_PROGRESS' ? 'В работе' : 'Решено'}
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          <button onClick={loadData} className="px-3 py-1.5 rounded-lg bg-white/5 text-white/50 hover:bg-white/10 text-sm">↻</button>
          <button onClick={() => setShowForm(!showForm)}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium">
            + Новая жалоба
          </button>
        </div>
      </div>

      {/* New complaint form */}
      {showForm && (
        <div className="glass rounded-2xl p-5 mb-4 animate-slide-down">
          <h3 className="text-lg font-bold text-white mb-4">Регистрация жалобы</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-white/50 mb-1">Источник (телефон, ФИО, организация)</label>
              <input value={source} onChange={e => setSource(e.target.value)} placeholder="Откуда поступила жалоба"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50" />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Описание</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Подробное описание жалобы..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50 resize-none" />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Приоритет</label>
              <select value={priority} onChange={e => setPriority(e.target.value as any)}
                className="form-select text-sm px-3 py-2">
                <option value="LOW">Низкий</option>
                <option value="MEDIUM">Средний</option>
                <option value="HIGH">Высокий</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSubmit} disabled={saving || !description.trim()}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium disabled:opacity-50">
                {saving ? 'Сохранение...' : 'Зарегистрировать'}
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-white/5 text-white/50 text-sm">Отмена</button>
            </div>
          </div>
        </div>
      )}

      {/* Complaints list */}
      <div className="space-y-3">
        {filtered.map(c => (
          <div key={c.id} className="glass rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    c.status === 'NEW' ? 'bg-amber-500/20 text-amber-400' :
                    c.status === 'IN_PROGRESS' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                  }`}>
                    {c.status === 'NEW' ? 'Новая' : c.status === 'IN_PROGRESS' ? 'В работе' : 'Решено'}
                  </span>
                  <span className={`text-xs ${c.priority === 'HIGH' ? 'text-red-400' : c.priority === 'MEDIUM' ? 'text-yellow-400' : 'text-white/40'}`}>
                    {c.priority === 'HIGH' ? '🔴 Высокий' : c.priority === 'MEDIUM' ? '🟡 Средний' : '⚪ Низкий'}
                  </span>
                </div>
                {c.source && <div className="text-xs text-white/40 mb-1">Источник: {c.source}</div>}
                <div className="text-white/80">{c.description}</div>
              </div>
              <div className="text-xs text-white/30 shrink-0">{new Date(c.created_at).toLocaleString('ru-RU')}</div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <EmptyState message="Нет жалоб" />}
      </div>
    </div>
  )
}
