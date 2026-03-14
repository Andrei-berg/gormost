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
import ShiftTab from '@/components/admin/ShiftTab'

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
  { value: 'HR',              label: 'Кадровик (HR)',       defaultPosition: 'Специалист по кадрам' },
  { value: 'SPECIALIST',      label: 'Специалист (ИТР)',    defaultPosition: 'Специалист' },
  { value: 'WORKER',          label: 'Рабочий',            defaultPosition: '' },
]

type Tab = 'users' | 'shifts' | 'services' | 'categories' | 'objects' | 'constructions' | 'work_types' | 'changelog'

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
    { id: 'shifts', label: 'Смены', emoji: '🔄' },
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
      {tab === 'shifts' && <ShiftTab session={session} />}
      {tab === 'services' && <ServicesTab />}
      {tab === 'categories' && <CategoriesTab />}
      {tab === 'objects' && <ObjectsTab />}
      {tab === 'constructions' && <ConstructionsTab />}
      {tab === 'work_types' && <WorkTypesTab />}
      {tab === 'changelog' && <ChangelogTab />}
    </div>
  )
}

// ==================== INLINE CELL COMPONENTS ====================

/** Кликабельная ячейка с текстовым вводом. Enter/blur = сохранить, Esc = отмена */
function InlineText({ value, placeholder, onSave, mono, pin }: {
  value: string
  placeholder?: string
  onSave: (v: string | null) => Promise<void>
  mono?: boolean
  pin?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)

  const save = async () => {
    setEditing(false)
    if (val === value) return
    await onSave(val || null)
  }

  if (!editing) {
    return (
      <span
        onClick={() => { setVal(value); setEditing(true) }}
        title="Нажмите для редактирования"
        className={`cursor-pointer block rounded px-1 -mx-1 transition-colors hover:bg-white/8 hover:text-white ${mono ? 'font-mono' : ''} ${!value ? 'text-white/20' : ''}`}
      >
        {pin
          ? (value ? <span className="text-green-400 text-xs">✓ ••••</span> : <span className="text-red-400 text-xs">✗ нет PIN</span>)
          : (value || placeholder || '—')
        }
      </span>
    )
  }

  return (
    <input
      autoFocus
      value={val}
      onChange={e => setVal(pin ? e.target.value.replace(/\D/g, '').slice(0, 4) : e.target.value)}
      onBlur={save}
      onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setVal(value); setEditing(false) } }}
      inputMode={pin ? 'numeric' : undefined}
      maxLength={pin ? 4 : undefined}
      className={`w-full min-w-[70px] bg-white/10 border border-blue-500/50 rounded px-1.5 py-0.5 text-white text-sm focus:outline-none ${mono ? 'font-mono' : ''}`}
    />
  )
}

/** Кликабельная ячейка с выпадающим списком. Выбор = сохранить сразу */
function InlineSelect({ value, options, emptyLabel, displayValue, onSave }: {
  value: string
  options: { value: string; label: string }[]
  emptyLabel?: string
  displayValue?: string
  onSave: (v: string | null) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)

  if (!editing) {
    return (
      <span
        onClick={() => setEditing(true)}
        title="Нажмите для редактирования"
        className="cursor-pointer block rounded px-1 -mx-1 transition-colors hover:bg-white/8 hover:text-white"
      >
        {displayValue || value || <span className="text-white/20">—</span>}
        <span className="text-white/30 ml-1 text-xs">▾</span>
      </span>
    )
  }

  return (
    <select
      autoFocus
      defaultValue={value}
      onChange={async e => {
        setEditing(false)
        await onSave(e.target.value || null)
      }}
      onBlur={() => setEditing(false)}
      className="bg-gray-900 border border-blue-500/50 rounded px-1.5 py-0.5 text-white text-sm focus:outline-none max-w-[180px]"
    >
      {emptyLabel && <option value="">{emptyLabel}</option>}
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

// ==================== USERS ====================
function UsersTab({ session }: { session: AuthSession }) {
  const [users, setUsers] = useState<User[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ tab_number: '', full_name: '', position: '', role_level: 'WORKER' as RoleLevel, service_id: '', pin_code: '' })
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [rowError, setRowError] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    const [u, s] = await Promise.all([fetchUsers(false), fetchServices()])
    setUsers(u); setServices(s)
  }, [])
  useEffect(() => { load() }, [load])

  const resetForm = () => setForm({ tab_number: '', full_name: '', position: '', role_level: 'WORKER', service_id: '', pin_code: '' })

  // Save a single field for an existing user inline
  const handleInlineSave = async (userId: string, patch: Partial<User>) => {
    setRowError(prev => ({ ...prev, [userId]: '' }))
    const { data: updated, errorMsg } = await updateUser(userId, patch)
    if (!updated) {
      setRowError(prev => ({ ...prev, [userId]: errorMsg ?? 'Ошибка' }))
      return
    }
    setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, ...patch } : u))
  }

  // Create new user
  const handleCreate = async () => {
    if (!form.tab_number || !form.full_name) return
    setSaveError(null)
    const result = await createUser({
      user_id: `USR-${Date.now()}`, tab_number: form.tab_number, full_name: form.full_name,
      position: form.position || null, role_level: form.role_level, service_id: form.service_id || null,
      is_active: true, pin_code: form.pin_code || null,
    })
    if (!result) { setSaveError('Ошибка создания — открой консоль (F12)'); return }
    setShowForm(false); resetForm(); load()
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
        <button onClick={() => { resetForm(); setShowForm(!showForm) }}
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

      {/* Add new user form */}
      {showForm && (
        <div className="glass rounded-2xl p-5 mb-4 animate-slide-down">
          <h3 className="text-sm font-bold text-white/70 mb-3">Новый пользователь</h3>
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
              <label className="block text-xs text-white/50 mb-1">Роль</label>
              <select
                value={form.role_level}
                onChange={e => {
                  const role = e.target.value as RoleLevel
                  const def = ROLES.find(r => r.value === role)?.defaultPosition ?? ''
                  setForm(f => ({ ...f, role_level: role, position: f.position || def }))
                }}
                className={inp}
              >
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Должность</label>
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
            <button onClick={handleCreate} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium">Создать</button>
            <button onClick={() => { setShowForm(false); setSaveError(null) }} className="px-4 py-2 rounded-lg bg-white/5 text-white/50 text-sm">Отмена</button>
          </div>
        </div>
      )}

      {/* Inline-editable table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-3 py-2 border-b border-white/10 text-xs text-white/30 italic">
          Нажмите на любую ячейку — роль, должность, служба, PIN — чтобы изменить прямо в таблице
        </div>
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
              <tr key={u.user_id} className="border-b border-white/5 hover:bg-white/3 group">
                <td className="px-3 py-2 text-white/50">
                  <InlineText
                    value={u.tab_number || ''}
                    mono
                    onSave={v => handleInlineSave(u.user_id, { tab_number: v ?? '' })}
                  />
                </td>
                <td className="px-3 py-2 text-white/90">
                  <InlineText
                    value={u.full_name}
                    onSave={v => handleInlineSave(u.user_id, { full_name: v ?? u.full_name })}
                  />
                </td>
                <td className="px-3 py-2 text-white/60">
                  <InlineText
                    value={u.position || ''}
                    placeholder="—"
                    onSave={v => handleInlineSave(u.user_id, { position: v })}
                  />
                </td>
                <td className="px-3 py-2">
                  <InlineSelect
                    value={u.role_level}
                    options={ROLES.map(r => ({ value: r.value, label: r.label }))}
                    displayValue={ROLES.find(r => r.value === u.role_level)?.label ?? u.role_level}
                    onSave={v => handleInlineSave(u.user_id, { role_level: (v ?? 'WORKER') as RoleLevel })}
                  />
                </td>
                <td className="px-3 py-2 text-white/60">
                  <InlineSelect
                    value={u.service_id || ''}
                    options={services.map(s => ({ value: s.service_id, label: s.service_name }))}
                    emptyLabel="— Не привязан —"
                    displayValue={services.find(s => s.service_id === u.service_id)?.service_name}
                    onSave={v => handleInlineSave(u.user_id, { service_id: v })}
                  />
                </td>
                <td className="px-3 py-2">
                  <InlineText
                    value={u.pin_code || ''}
                    pin
                    onSave={v => handleInlineSave(u.user_id, { pin_code: v })}
                  />
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => handleInlineSave(u.user_id, { is_active: !u.is_active })}
                    title="Нажмите чтобы переключить статус"
                    className="cursor-pointer"
                  >
                    {u.is_active
                      ? <span className="text-green-400 text-xs hover:text-green-300">✓ Активен</span>
                      : <span className="text-red-400 text-xs hover:text-red-300">✗ Неактивен</span>
                    }
                  </button>
                </td>
                <td className="px-3 py-2">
                  {rowError[u.user_id]
                    ? <span className="text-red-400 text-xs">{rowError[u.user_id]}</span>
                    : <button onClick={() => handleDelete(u)} className="opacity-0 group-hover:opacity-100 px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs transition-opacity">🗑️</button>
                  }
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-12 text-center text-white/20">Нет пользователей</td></tr>
            )}
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
