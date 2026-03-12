'use client'
import { useState, useEffect, useCallback } from 'react'
import AuthGuard from '@/components/AuthGuard'
import Header from '@/components/Header'
import {
  fetchUsers, createUser, updateUser, deleteUser,
  fetchServices, createService, updateService, deleteService,
  fetchCategories, createCategory, updateCategory, deleteCategory,
  fetchObjects, createObject, updateObject, deleteObject,
  fetchConstructions, createConstruction, updateConstruction, deleteConstruction,
  fetchWorkTypes, createWorkType, updateWorkType, deleteWorkType,
  fetchChangelog
} from '@/lib/api'
import type { User, Service, Category, GObject, Construction, WorkType, ChangelogEntry, AuthSession, RoleLevel } from '@/types'

const ROLES: { value: RoleLevel; label: string; defaultPosition: string }[] = [
  { value: 'ADMIN',           label: 'Администратор',      defaultPosition: 'Администратор' },
  { value: 'BOSS',            label: 'Начальник участка',  defaultPosition: 'Начальник участка' },
  { value: 'CHIEF_ENGINEER',  label: 'Главный инженер',    defaultPosition: 'Главный инженер' },
  { value: 'ZAMPORAB',        label: 'Зам. прораба',       defaultPosition: 'Заместитель прораба' },
  { value: 'HEAD',            label: 'Нач. службы',        defaultPosition: 'Начальник службы' },
  { value: 'DISPATCHER',      label: 'Диспетчер',          defaultPosition: 'Начальник смены' },
  { value: 'FOREMAN',         label: 'Мастер/Бригадир',    defaultPosition: 'Мастер участка' },
  { value: 'TRANSPORT',       label: 'Гл. механик',        defaultPosition: 'Главный механик' },
  { value: 'COMPLAINTS',      label: 'Диспетчер жалоб',    defaultPosition: 'Диспетчер жалоб' },
  { value: 'WORKER',          label: 'Рабочий',            defaultPosition: '' },
]

type Tab = 'users' | 'services' | 'categories' | 'objects' | 'constructions' | 'work_types' | 'changelog'

export default function AdminPage() {
  return (
    <AuthGuard roles={['ADMIN']}>
      {(session) => <Content session={session} />}
    </AuthGuard>
  )
}

function Content({ session }: { session: AuthSession }) {
  const [tab, setTab] = useState<Tab>('users')

  const tabs: { id: Tab; label: string; emoji: string }[] = [
    { id: 'users', label: 'Пользователи', emoji: '👤' },
    { id: 'services', label: 'Службы', emoji: '🏢' },
    { id: 'categories', label: 'Категории', emoji: '📁' },
    { id: 'objects', label: 'Объекты', emoji: '🏗️' },
    { id: 'constructions', label: 'Конструктивы', emoji: '🧱' },
    { id: 'work_types', label: 'Виды работ', emoji: '🔧' },
    { id: 'changelog', label: 'Журнал', emoji: '📋' },
  ]

  return (
    <div className="min-h-screen p-4 max-w-7xl mx-auto">
      <Header session={session} title="Админ-панель" emoji="⚙️" />

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-2">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              tab === t.id ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'
            }`}>
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {tab === 'users' && <UsersTab session={session} />}
      {tab === 'services' && <ServicesTab />}
      {tab === 'categories' && <CategoriesTab />}
      {tab === 'objects' && <ObjectsTab />}
      {tab === 'constructions' && <ConstructionsTab />}
      {tab === 'work_types' && <WorkTypesTab />}
      {tab === 'changelog' && <ChangelogTab />}
    </div>
  )
}

// ==================== USERS ====================
function UsersTab({ session }: { session: AuthSession }) {
  const [users, setUsers] = useState<User[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [form, setForm] = useState({ tab_number: '', full_name: '', position: '', role_level: 'WORKER' as RoleLevel, service_id: '', phone: '', pin_code: '' })
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [saveError, setSaveError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [u, s] = await Promise.all([fetchUsers(false), fetchServices()])
    setUsers(u); setServices(s)
  }, [])
  useEffect(() => { load() }, [load])

  const resetForm = () => setForm({ tab_number: '', full_name: '', position: '', role_level: 'WORKER', service_id: '', phone: '', pin_code: '' })

  const handleEdit = (u: User) => {
    setEditing(u)
    setForm({
      tab_number: u.tab_number || '', full_name: u.full_name || '', position: u.position || '',
      role_level: u.role_level, service_id: u.service_id || '', phone: u.phone || '', pin_code: u.pin_code || ''
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.tab_number || !form.full_name) return
    setSaveError(null)
    if (editing) {
      const { data: updated, errorMsg } = await updateUser(editing.user_id, {
        tab_number: form.tab_number, full_name: form.full_name, position: form.position || null,
        role_level: form.role_level, service_id: form.service_id || null, phone: form.phone || null,
        pin_code: form.pin_code || null,
      })
      if (!updated) {
        setSaveError(errorMsg ?? 'Ошибка сохранения')
        return
      }
    } else {
      const result = await createUser({
        user_id: `USR-${Date.now()}`, tab_number: form.tab_number, full_name: form.full_name,
        position: form.position || null, role_level: form.role_level, service_id: form.service_id || null,
        is_active: true, phone: form.phone || null, pin_code: form.pin_code || null,
      })
      if (!result) {
        setSaveError('Ошибка создания пользователя — открой консоль (F12)')
        return
      }
    }
    setShowForm(false); setEditing(null); resetForm(); load()
  }

  const handleDelete = async (u: User) => {
    if (!confirm(`Деактивировать ${u.full_name}?`)) return
    await deleteUser(u.user_id); load()
  }

  const inp = 'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50'

  const filteredUsers = users.filter(u => {
    const q = search.toLowerCase()
    const matchSearch = !q || u.full_name.toLowerCase().includes(q) || (u.tab_number || '').includes(q)
    const matchRole = !filterRole || u.role_level === filterRole
    return matchSearch && matchRole
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-white">Пользователи ({filteredUsers.length} / {users.length})</h2>
        <button onClick={() => { resetForm(); setEditing(null); setShowForm(!showForm) }}
          className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium">
          {showForm ? 'Закрыть' : '+ Добавить'}
        </button>
      </div>

      {/* Search + filter */}
      <div className="flex gap-2 mb-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Поиск по ФИО или таб.№..."
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white/80 placeholder-white/30 focus:outline-none focus:border-blue-500/50"
        />
        <select
          value={filterRole}
          onChange={e => setFilterRole(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white/70 focus:outline-none"
        >
          <option value="">Все роли</option>
          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      {showForm && (
        <div className="glass rounded-2xl p-5 mb-4 animate-slide-down">
          <h3 className="text-sm font-bold text-white/70 mb-3">{editing ? 'Редактирование' : 'Новый пользователь'}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/50 mb-1">Табельный номер *</label>
              <input value={form.tab_number} onChange={e => setForm({ ...form, tab_number: e.target.value })} className={inp} placeholder="0001" />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">ФИО *</label>
              <input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} className={inp} placeholder="Иванов И.И." />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">
                Роль <span className="text-white/25">(определяет доступные панели)</span>
              </label>
              <select
                value={form.role_level}
                onChange={e => {
                  const role = e.target.value as RoleLevel
                  const def = ROLES.find(r => r.value === role)?.defaultPosition ?? ''
                  // auto-fill position only if it's empty or was previously auto-filled
                  setForm(f => ({ ...f, role_level: role, position: f.position || def }))
                }}
                className={inp}
              >
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">
                Должность <span className="text-white/25">(отображается в шапке)</span>
              </label>
              <input value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} className={inp} placeholder="Нач. строительной службы" />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Служба</label>
              <select value={form.service_id} onChange={e => setForm({ ...form, service_id: e.target.value })} className={inp}>
                <option value="">— Не привязан —</option>
                {services.map(s => <option key={s.service_id} value={s.service_id}>{s.service_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Телефон</label>
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className={inp} placeholder="+7..." />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">PIN-код (4 цифры)</label>
              <input value={form.pin_code} onChange={e => setForm({ ...form, pin_code: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                className={inp} placeholder="1234" maxLength={4} inputMode="numeric" />
            </div>
          </div>
          {saveError && (
            <div className="mt-3 px-3 py-2 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-sm">
              {saveError}
            </div>
          )}
          <div className="flex gap-2 mt-4">
            <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium">
              {editing ? 'Сохранить' : 'Создать'}
            </button>
            <button onClick={() => { setShowForm(false); setEditing(null); setSaveError(null) }} className="px-4 py-2 rounded-lg bg-white/5 text-white/50 text-sm">Отмена</button>
          </div>
        </div>
      )}

      <div className="glass rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="px-3 py-2 text-left text-xs text-white/40">Таб.№</th>
              <th className="px-3 py-2 text-left text-xs text-white/40">ФИО</th>
              <th className="px-3 py-2 text-left text-xs text-white/40">Должность</th>
              <th className="px-3 py-2 text-left text-xs text-white/40">Роль</th>
              <th className="px-3 py-2 text-left text-xs text-white/40">Служба</th>
              <th className="px-3 py-2 text-left text-xs text-white/40">PIN</th>
              <th className="px-3 py-2 text-left text-xs text-white/40">Статус</th>
              <th className="px-3 py-2 text-xs text-white/40"></th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(u => (
              <tr key={u.user_id} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-3 py-2 font-mono text-white/50">{u.tab_number}</td>
                <td className="px-3 py-2 text-white/90">{u.full_name}</td>
                <td className="px-3 py-2 text-white/50">{u.position || '—'}</td>
                <td className="px-3 py-2"><span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full">{u.role_level}</span></td>
                <td className="px-3 py-2 text-white/50">{services.find(s => s.service_id === u.service_id)?.service_name || '—'}</td>
                <td className="px-3 py-2">{u.pin_code ? <span className="text-green-400 text-xs">✓ Задан</span> : <span className="text-red-400 text-xs">✗ Нет</span>}</td>
                <td className="px-3 py-2">{u.is_active ? <span className="text-green-400 text-xs">Активен</span> : <span className="text-red-400 text-xs">Неактивен</span>}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    <button onClick={() => handleEdit(u)} className="px-2 py-1 rounded bg-white/5 text-white/50 hover:bg-white/10 text-xs">✏️</button>
                    <button onClick={() => handleDelete(u)} className="px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs">🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ==================== GENERIC CRUD TAB ====================
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CrudTab<T extends Record<string, any>>({
  title, items, idKey, nameKey, fields,
  onFetch, onCreate, onUpdate, onDelete,
}: {
  title: string
  items: T[]
  idKey: string
  nameKey: string
  fields: { key: string; label: string; type?: string; options?: { value: string; label: string }[] }[]
  onFetch: () => void
  onCreate: (item: Partial<T>) => Promise<unknown>
  onUpdate: (id: string, item: Partial<T>) => Promise<unknown>
  onDelete: (id: string) => Promise<unknown>
}) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<T | null>(null)
  const [form, setForm] = useState<Record<string, string>>({})

  const resetForm = () => {
    const empty: Record<string, string> = {}
    fields.forEach(f => empty[f.key] = '')
    setForm(empty)
  }

  const handleEdit = (item: T) => {
    setEditing(item)
    const vals: Record<string, string> = {}
    fields.forEach(f => vals[f.key] = String(item[f.key] || ''))
    setForm(vals)
    setShowForm(true)
  }

  const handleSave = async () => {
    const payload = { ...form } as Partial<T>
    if (editing) {
      await onUpdate(String(editing[idKey]), payload)
    } else {
      await onCreate(payload)
    }
    setShowForm(false); setEditing(null); resetForm(); onFetch()
  }

  const handleDelete = async (item: T) => {
    if (!confirm('Удалить?')) return
    await onDelete(String(item[idKey])); onFetch()
  }

  const inp = 'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50'

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white">{title} ({items.length})</h2>
        <button onClick={() => { resetForm(); setEditing(null); setShowForm(!showForm) }}
          className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium">
          {showForm ? 'Закрыть' : '+ Добавить'}
        </button>
      </div>

      {showForm && (
        <div className="glass rounded-2xl p-5 mb-4 animate-slide-down">
          <div className="grid grid-cols-2 gap-3">
            {fields.map(f => (
              <div key={f.key}>
                <label className="block text-xs text-white/50 mb-1">{f.label}</label>
                {f.options ? (
                  <select value={form[f.key] || ''} onChange={e => setForm({ ...form, [f.key]: e.target.value })} className={inp}>
                    <option value="">—</option>
                    {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : (
                  <input value={form[f.key] || ''} onChange={e => setForm({ ...form, [f.key]: e.target.value })} className={inp} />
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm">{editing ? 'Сохранить' : 'Создать'}</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-white/5 text-white/50 text-sm">Отмена</button>
          </div>
        </div>
      )}

      <div className="glass rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="px-3 py-2 text-left text-xs text-white/40">ID</th>
              {fields.map(f => <th key={f.key} className="px-3 py-2 text-left text-xs text-white/40">{f.label}</th>)}
              <th className="px-3 py-2 text-xs text-white/40"></th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={String(item[idKey])} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-3 py-2 font-mono text-white/40 text-xs">{String(item[idKey])}</td>
                {fields.map(f => <td key={f.key} className="px-3 py-2 text-white/70">{String(item[f.key] || '—')}</td>)}
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    <button onClick={() => handleEdit(item)} className="px-2 py-1 rounded bg-white/5 text-white/50 text-xs">✏️</button>
                    <button onClick={() => handleDelete(item)} className="px-2 py-1 rounded bg-red-500/10 text-red-400 text-xs">🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={fields.length + 2} className="px-3 py-12 text-center text-white/20">Нет записей</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ==================== SPECIFIC TABS ====================

function ServicesTab() {
  const [items, setItems] = useState<Service[]>([])
  const load = useCallback(async () => { setItems(await fetchServices()) }, [])
  useEffect(() => { load() }, [load])
  return <CrudTab title="Службы" items={items} idKey="service_id" nameKey="service_name"
    fields={[{ key: 'service_id', label: 'ID службы' }, { key: 'service_name', label: 'Название' }]}
    onFetch={load} onCreate={createService} onUpdate={updateService} onDelete={deleteService} />
}

function CategoriesTab() {
  const [items, setItems] = useState<Category[]>([])
  const load = useCallback(async () => { setItems(await fetchCategories()) }, [])
  useEffect(() => { load() }, [load])
  return <CrudTab title="Категории" items={items} idKey="category_id" nameKey="category_name"
    fields={[{ key: 'category_id', label: 'ID категории' }, { key: 'category_name', label: 'Название' }]}
    onFetch={load} onCreate={createCategory} onUpdate={updateCategory} onDelete={deleteCategory} />
}

function ObjectsTab() {
  const [items, setItems] = useState<GObject[]>([])
  const [cats, setCats] = useState<Category[]>([])
  const load = useCallback(async () => { const [o, c] = await Promise.all([fetchObjects(), fetchCategories()]); setItems(o); setCats(c) }, [])
  useEffect(() => { load() }, [load])
  return <CrudTab title="Объекты" items={items} idKey="object_id" nameKey="object_name"
    fields={[
      { key: 'object_id', label: 'ID объекта' },
      { key: 'category_id', label: 'Категория', options: cats.map(c => ({ value: c.category_id, label: c.category_name })) },
      { key: 'object_name', label: 'Название' },
      { key: 'location', label: 'Адрес' },
    ]}
    onFetch={load} onCreate={createObject} onUpdate={updateObject} onDelete={deleteObject} />
}

function ConstructionsTab() {
  const [items, setItems] = useState<Construction[]>([])
  const [objs, setObjs] = useState<GObject[]>([])
  const load = useCallback(async () => { const [c, o] = await Promise.all([fetchConstructions(), fetchObjects()]); setItems(c); setObjs(o) }, [])
  useEffect(() => { load() }, [load])
  return <CrudTab title="Конструктивы" items={items} idKey="construction_id" nameKey="construction_name"
    fields={[
      { key: 'construction_id', label: 'ID конструктива' },
      { key: 'object_id', label: 'Объект', options: objs.map(o => ({ value: o.object_id, label: o.object_name })) },
      { key: 'construction_name', label: 'Название' },
    ]}
    onFetch={load} onCreate={createConstruction} onUpdate={updateConstruction} onDelete={deleteConstruction} />
}

function WorkTypesTab() {
  const [items, setItems] = useState<WorkType[]>([])
  const [cons, setCons] = useState<Construction[]>([])
  const load = useCallback(async () => { const [w, c] = await Promise.all([fetchWorkTypes(), fetchConstructions()]); setItems(w); setCons(c) }, [])
  useEffect(() => { load() }, [load])
  return <CrudTab title="Виды работ" items={items} idKey="work_type_id" nameKey="work_name"
    fields={[
      { key: 'work_type_id', label: 'ID' },
      { key: 'construction_id', label: 'Конструктив', options: cons.map(c => ({ value: c.construction_id, label: c.construction_name })) },
      { key: 'work_name', label: 'Название работы' },
    ]}
    onFetch={load} onCreate={createWorkType} onUpdate={updateWorkType} onDelete={deleteWorkType} />
}

function ChangelogTab() {
  const [items, setItems] = useState<ChangelogEntry[]>([])
  const load = useCallback(async () => { setItems(await fetchChangelog(100)) }, [])
  useEffect(() => { load() }, [load])
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white">Журнал действий ({items.length})</h2>
        <button onClick={load} className="px-3 py-1.5 rounded-lg bg-white/5 text-white/50 text-sm">↻</button>
      </div>
      <div className="glass rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="px-3 py-2 text-left text-xs text-white/40">Время</th>
              <th className="px-3 py-2 text-left text-xs text-white/40">Действие</th>
              <th className="px-3 py-2 text-left text-xs text-white/40">Тип</th>
              <th className="px-3 py-2 text-left text-xs text-white/40">ID объекта</th>
              <th className="px-3 py-2 text-left text-xs text-white/40">Пользователь</th>
            </tr>
          </thead>
          <tbody>
            {items.map(e => (
              <tr key={e.id} className="border-b border-white/5">
                <td className="px-3 py-2 text-xs text-white/40 font-mono">{new Date(e.created_at).toLocaleString('ru-RU')}</td>
                <td className="px-3 py-2 text-white/70">{e.action_type}</td>
                <td className="px-3 py-2 text-white/50">{e.entity_type || '—'}</td>
                <td className="px-3 py-2 text-xs text-white/40 font-mono">{e.entity_id || '—'}</td>
                <td className="px-3 py-2 text-xs text-white/40">{e.user_id || '—'}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-12 text-center text-white/20">Нет записей</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
