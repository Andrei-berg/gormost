'use client'
import { useState, useEffect, useCallback } from 'react'
import AuthGuard from '@/components/AuthGuard'
import Header from '@/components/Header'
import VehicleGrid, { type Vehicle } from '@/components/transport/VehicleGrid'
import TransportRequests from '@/components/transport/TransportRequests'
import { fetchRequests, fetchServices, updateRequest } from '@/lib/api'
import type { Request, Service, AuthSession } from '@/types'

const VEHICLES: Vehicle[] = [
  { id: 'V-01', name: 'ГАЗель фургон', plate: 'А001МО77', type: 'Грузовой' },
  { id: 'V-02', name: 'КамАЗ самосвал', plate: 'В002РА77', type: 'Спецтехника' },
  { id: 'V-03', name: 'УАЗ Патриот', plate: 'С003ЕН77', type: 'Легковой' },
  { id: 'V-04', name: 'Автовышка', plate: 'К004ТТ77', type: 'Спецтехника' },
  { id: 'V-05', name: 'Водовоз', plate: 'М005ОО77', type: 'Спецтехника' },
]

export default function TransportPage() {
  return (
    <AuthGuard roles={['TRANSPORT', 'ADMIN', 'BOSS', 'ZAMPORAB']}>
      {(session) => <Content session={session} />}
    </AuthGuard>
  )
}

function Content({ session }: { session: AuthSession }) {
  const [requests, setRequests] = useState<Request[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [tab, setTab] = useState<'vehicles' | 'requests'>('vehicles')

  const loadData = useCallback(async () => {
    const [reqs, svcs] = await Promise.all([fetchRequests(), fetchServices()])
    setRequests(reqs); setServices(svcs)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const needTransport = requests.filter(r => !r.transport_type && r.status !== 'DONE')
  const withTransport = requests.filter(r => r.transport_type)

  const handleAssignVehicle = async (reqId: string, vehicle: string) => {
    await updateRequest(reqId, { transport_type: vehicle }, session.user_id)
    loadData()
  }

  return (
    <div className="min-h-screen p-4 max-w-6xl mx-auto">
      <Header session={session} title="Транспорт" emoji="🚗" mode="LIVE" />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="glass rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white font-mono">{VEHICLES.length}</div>
          <div className="text-xs text-white/40">Единиц техники</div>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-amber-400 font-mono">{needTransport.length}</div>
          <div className="text-xs text-white/40">Ожидают транспорт</div>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-400 font-mono">{withTransport.length}</div>
          <div className="text-xs text-white/40">Назначено</div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => setTab('vehicles')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'vehicles' ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/50'}`}>
          Парк машин
        </button>
        <button onClick={() => setTab('requests')} className={`px-4 py-2 rounded-lg text-sm font-medium relative ${tab === 'requests' ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/50'}`}>
          Заявки на транспорт
          {needTransport.length > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white font-bold">{needTransport.length}</span>}
        </button>
        <button onClick={loadData} className="ml-auto px-3 py-1.5 rounded-lg bg-white/5 text-white/50 hover:bg-white/10 text-sm">↻</button>
      </div>

      {tab === 'vehicles' && <VehicleGrid vehicles={VEHICLES} requests={requests} />}
      {tab === 'requests' && <TransportRequests requests={needTransport} services={services} vehicles={VEHICLES} onAssign={handleAssignVehicle} />}
    </div>
  )
}
