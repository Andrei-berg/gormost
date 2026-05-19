'use client'
import { useState, useEffect } from 'react'
import { fetchCategories, fetchObjects, fetchConstructions, fetchWorkTypes, fetchServices, fetchUsersByService, createRequest, updateRequest, assignUsers, fetchAssignments } from '@/lib/api-client'
import type { Request, Category, GObject, Construction, WorkType, Service, User, RequestStatus, Priority, Urgency, AuthSession } from '@/types'

interface Props {
  session: AuthSession
  existingRequest?: Request | null
  defaultServiceId?: string | null
  onClose: () => void
  onSaved: () => void
}

export default function RequestModal({ session, existingRequest, defaultServiceId, onClose, onSaved }: Props) {
  const isEdit = !!existingRequest

  // Reference data
  const [categories, setCategories] = useState<Category[]>([])
  const [objects, setObjects] = useState<GObject[]>([])
  const [constructions, setConstructions] = useState<Construction[]>([])
  const [workTypes, setWorkTypes] = useState<WorkType[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [availableUsers, setAvailableUsers] = useState<User[]>([])

  // Form state
  const [serviceId, setServiceId] = useState(existingRequest?.service_id || defaultServiceId || '')
  const [categoryId, setCategoryId] = useState(existingRequest?.category_id || '')
  const [objectId, setObjectId] = useState(existingRequest?.object_id || '')
  const [constructionId, setConstructionId] = useState(existingRequest?.construction_id || '')
  const [workTypeId, setWorkTypeId] = useState(existingRequest?.work_type_id || '')
  const [description, setDescription] = useState(existingRequest?.description || '')
  const [priority, setPriority] = useState<Priority>(existingRequest?.priority || 'MEDIUM')
  const [urgency, setUrgency] = useState<Urgency>(existingRequest?.urgency || 'NORMAL')
  const [transportType, setTransportType] = useState(existingRequest?.transport_type || '')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load reference data
  useEffect(() => {
    fetchCategories().then(setCategories)
    fetchServices().then(setServices)
  }, [])

  // Load existing assignments
  useEffect(() => {
    if (existingRequest) {
      fetchAssignments(existingRequest.request_id).then(a => setSelectedUsers(a.map(x => x.user_id)))
    }
  }, [existingRequest])

  // Cascade: Category → Objects
  useEffect(() => {
    if (categoryId) fetchObjects(categoryId).then(setObjects)
    else setObjects([])
    setObjectId('')
    setConstructionId('')
    setWorkTypeId('')
  }, [categoryId])

  // Cascade: Object → Constructions
  useEffect(() => {
    if (objectId) fetchConstructions(objectId).then(setConstructions)
    else setConstructions([])
    setConstructionId('')
    setWorkTypeId('')
  }, [objectId])

  // Cascade: Construction → Work Types
  useEffect(() => {
    if (constructionId) fetchWorkTypes(constructionId).then(setWorkTypes)
    else setWorkTypes([])
    setWorkTypeId('')
  }, [constructionId])

  // Load users for selected service
  useEffect(() => {
    if (serviceId) fetchUsersByService(serviceId).then(setAvailableUsers)
    else setAvailableUsers([])
  }, [serviceId])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const payload: Partial<Request> = {
        service_id: serviceId || null,
        category_id: categoryId || null,
        object_id: objectId || null,
        construction_id: constructionId || null,
        work_type_id: workTypeId || null,
        description: description || null,
        priority,
        urgency,
        transport_type: transportType || null,
      }

      let reqId: string | null = null

      if (isEdit && existingRequest) {
        const updated = await updateRequest(existingRequest.request_id, payload, session.user_id)
        reqId = updated?.request_id || null
      } else {
        payload.status = 'NEW'
        payload.date_work = new Date().toISOString().slice(0, 10)
        const created = await createRequest(payload, session.user_id)
        reqId = created?.request_id || null
      }

      if (reqId && selectedUsers.length > 0) {
        await assignUsers(reqId, selectedUsers, session.user_id)
      }

      onSaved()
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Неизвестная ошибка'
      setError(msg)
      console.error('Save error:', err)
    } finally {
      setSaving(false)
    }
  }

  const toggleUser = (uid: string) => {
    setSelectedUsers(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid])
  }

  const selectClass = 'form-select w-full text-sm px-3 py-2'
  const labelClass = 'block text-xs text-white/50 mb-1'

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass-strong rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-lg font-bold text-white">{isEdit ? 'Редактирование заявки' : 'Новая заявка'}</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white text-2xl leading-none">&times;</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Service */}
          <div>
            <label className={labelClass}>Служба</label>
            <select value={serviceId} onChange={e => setServiceId(e.target.value)} className={selectClass}>
              <option value="">-- Выберите службу --</option>
              {services.map(s => <option key={s.service_id} value={s.service_id}>{s.service_name}</option>)}
            </select>
          </div>

          {/* Cascading: Category → Object → Construction → WorkType */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Категория</label>
              <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className={selectClass}>
                <option value="">-- Категория --</option>
                {categories.map(c => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Объект</label>
              <select value={objectId} onChange={e => setObjectId(e.target.value)} className={selectClass} disabled={!categoryId}>
                <option value="">-- Объект --</option>
                {objects.map(o => <option key={o.object_id} value={o.object_id}>{o.object_name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Конструктив</label>
              <select value={constructionId} onChange={e => setConstructionId(e.target.value)} className={selectClass} disabled={!objectId}>
                <option value="">-- Конструктив --</option>
                {constructions.map(c => <option key={c.construction_id} value={c.construction_id}>{c.construction_name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Вид работ</label>
              <select value={workTypeId} onChange={e => setWorkTypeId(e.target.value)} className={selectClass} disabled={!constructionId}>
                <option value="">-- Вид работ --</option>
                {workTypes.map(w => <option key={w.work_type_id} value={w.work_type_id}>{w.work_name}</option>)}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={labelClass}>Описание</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              className={`${selectClass} resize-none`} placeholder="Описание работ..." />
          </div>

          {/* Priority + Urgency + Transport */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Приоритет</label>
              <select value={priority} onChange={e => setPriority(e.target.value as Priority)} className={selectClass}>
                <option value="LOW">Низкий</option>
                <option value="MEDIUM">Средний</option>
                <option value="HIGH">Высокий</option>
                <option value="CRITICAL">Критический</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Срочность</label>
              <select value={urgency} onChange={e => setUrgency(e.target.value as Urgency)} className={selectClass}>
                <option value="NORMAL">Обычная</option>
                <option value="URGENT">Срочная</option>
                <option value="EMERGENCY">Аварийная</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Транспорт</label>
              <input value={transportType} onChange={e => setTransportType(e.target.value)}
                className={selectClass} placeholder="Тип транспорта" />
            </div>
          </div>

          {/* Assign users */}
          {availableUsers.length > 0 && (
            <div>
              <label className={labelClass}>Назначить людей ({selectedUsers.length} выбрано)</label>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {availableUsers.map(u => (
                  <label key={u.user_id} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                    selectedUsers.includes(u.user_id) ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-white/5 border border-white/5 hover:bg-white/10'
                  }`}>
                    <input type="checkbox" checked={selectedUsers.includes(u.user_id)} onChange={() => toggleUser(u.user_id)} className="sr-only" />
                    <div className={`w-4 h-4 rounded flex items-center justify-center text-xs ${
                      selectedUsers.includes(u.user_id) ? 'bg-blue-500 text-white' : 'bg-white/10'
                    }`}>
                      {selectedUsers.includes(u.user_id) && '✓'}
                    </div>
                    <div>
                      <div className="text-sm text-white">{u.full_name}</div>
                      <div className="text-[10px] text-white/40">{u.position || u.tab_number}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-5 mb-2 px-4 py-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm">
            ⚠ {error}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-white/10">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 text-sm">
            Отмена
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm disabled:opacity-50 transition-all">
            {saving ? 'Сохранение...' : isEdit ? 'Сохранить' : 'Создать заявку'}
          </button>
        </div>
      </div>
    </div>
  )
}
