'use client'
import { useState, useEffect, useCallback } from 'react'
import AuthGuard from '@/components/AuthGuard'
import Header from '@/components/Header'
import { fetchRequests, fetchServices, fetchRequestStats, approveRequest, fetchChangelog } from '@/lib/api'
import type { Request, Service, ChangelogEntry, AuthSession } from '@/types'
import { STATUS_CONFIG, SERVICE_META } from '@/types'

export default function BossPage() {
  return (
    <AuthGuard roles={['BOSS', 'ADMIN']}>
      {(session) => <Content session={session} />}
    </AuthGuard>
  )
}

function Content({ session }: { session: AuthSession }) {
  const [requests, setRequests] = useState<Request[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [stats, setStats] = useState<{ total: number; byStatus: Record<string, number>; byService: Record<string, number>; byPriority: Record<string, number> }>({ total: 0, byStatus: {}, byService: {}, byPriority: {} })
  const [changelog, setChangelog] = useState<ChangelogEntry[]>([])
  const [tab, setTab] = useState<'overview' | 'approve' | 'log'>('overview')

  const loadData = useCallback(async () => {
    const [reqs, svcs, st, log] = await Promise.all([
      fetchRequests(), fetchServices(), fetchRequestStats(), fetchChangelog(30)
    ])
    setRequests(reqs); setServices(svcs); setStats(st); setChangelog(log)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const pendingApproval = requests.filter(r => r.approved_by_zamporab && !r.approved_by_boss)
  const donePercent = stats.total > 0 ? Math.round(((stats.byStatus['DONE'] || 0) / stats.total) * 100) : 0
  const criticalCount = requests.filter(r => r.priority === 'CRITICAL' || r.urgency === 'EMERGENCY').length

  const handleApprove = async (reqId: string) => {
    await approveRequest(reqId, 'boss', session.user_id)
    loadData()
  }

  // Health indicator
  const health = criticalCount === 0 && donePercent >= 50 ? 'green' : criticalCount > 3 ? 'red' : 'yellow'
  const healthEmoji = health === 'green' ? '🟢' : health === 'yellow' ? '🟡' : '🔴'

  return (
    <div className="min-h-screen p-4 max-w-6xl mx-auto">
      <Header session={session} title="Босс (Дашборд)" emoji="🏠" mode="REVIEW" />

      {/* KPI row */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        <div className="glass rounded-xl p-4 text-center">
          <div className="text-3xl mb-1">{healthEmoji}</div>
          <div className="text-xs text-white/40">Здоровье</div>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white font-mono">{stats.total}</div>
          <div className="text-xs text-white/40">Всего</div>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-400 font-mono">{donePercent}%</div>
          <div className="text-xs text-white/40">Выполнено</div>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-red-400 font-mono">{criticalCount}</div>
          <div className="text-xs text-white/40">Критические</div>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-amber-400 font-mono">{pendingApproval.length}</div>
          <div className="text-xs text-white/40">На утверждении</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => setTab('overview')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'overview' ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/50'}`}>
          Обзор
        </button>
        <button onClick={() => setTab('approve')} className={`px-4 py-2 rounded-lg text-sm font-medium relative ${tab === 'approve' ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/50'}`}>
          Утверждение
          {pendingApproval.length > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white font-bold">{pendingApproval.length}</span>}
        </button>
        <button onClick={() => setTab('log')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'log' ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/50'}`}>
          Журнал
        </button>
        <button onClick={loadData} className="ml-auto px-3 py-1.5 rounded-lg bg-white/5 text-white/50 hover:bg-white/10 text-sm">↻</button>
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-2 gap-4">
          {/* By Status */}
          <div className="glass rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white/70 mb-4">По статусам</h3>
            <div className="space-y-3">
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                const count = stats.byStatus[key] || 0
                const pct = stats.total > 0 ? (count / stats.total) * 100 : 0
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-white/70">{cfg.label}</span>
                      <span className="font-mono text-white/50">{count}</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: cfg.color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* By Service */}
          <div className="glass rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white/70 mb-4">По службам</h3>
            <div className="space-y-3">
              {services.map(svc => {
                const count = stats.byService[svc.service_id] || 0
                const meta = SERVICE_META[svc.service_id]
                const pct = stats.total > 0 ? (count / stats.total) * 100 : 0
                return (
                  <div key={svc.service_id}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-white/70">{meta?.emoji} {svc.service_name}</span>
                      <span className="font-mono text-white/50">{count}</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: meta?.color || '#64748b' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {tab === 'approve' && (
        <div className="space-y-3">
          {pendingApproval.map(r => (
            <div key={r.request_id} className="glass rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs font-mono text-white/30 mr-2">{r.request_id}</span>
                <span className="text-white/80">{r.description || 'Без описания'}</span>
                <div className="text-xs text-white/40 mt-1">
                  {r.approved_by_head && <span className="text-green-400 mr-2">✓ НС</span>}
                  {r.approved_by_zamporab && <span className="text-green-400 mr-2">✓ Прораб</span>}
                </div>
              </div>
              <button onClick={() => handleApprove(r.request_id)}
                className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-bold">
                ✓ Утвердить
              </button>
            </div>
          ))}
          {pendingApproval.length === 0 && (
            <div className="text-center text-white/20 py-20">Нет заявок на утверждение</div>
          )}
        </div>
      )}

      {tab === 'log' && (
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 text-left text-xs text-white/40">Время</th>
                <th className="px-4 py-3 text-left text-xs text-white/40">Действие</th>
                <th className="px-4 py-3 text-left text-xs text-white/40">Объект</th>
                <th className="px-4 py-3 text-left text-xs text-white/40">Пользователь</th>
              </tr>
            </thead>
            <tbody>
              {changelog.map(e => (
                <tr key={e.id} className="border-b border-white/5">
                  <td className="px-4 py-2 text-xs text-white/40 font-mono">{new Date(e.created_at).toLocaleString('ru-RU')}</td>
                  <td className="px-4 py-2 text-white/70">{e.action_type}</td>
                  <td className="px-4 py-2 text-xs text-white/50">{e.entity_type} {e.entity_id}</td>
                  <td className="px-4 py-2 text-xs text-white/40">{e.user_id}</td>
                </tr>
              ))}
              {changelog.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-12 text-center text-white/20">Нет записей</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
