// ============================================
// GORMOST v2.0 — TypeScript Types
// Matches real Supabase schema
// ============================================

export type RoleLevel = 'ADMIN' | 'BOSS' | 'ZAMPORAB' | 'HEAD' | 'DISPATCHER' | 'FOREMAN' | 'TRANSPORT' | 'COMPLAINTS' | 'WORKER' | 'CHIEF_ENGINEER'
export type RequestStatus = 'NEW' | 'PLANNED' | 'IN_PROGRESS' | 'CHECKING' | 'DONE'
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type Urgency = 'NORMAL' | 'URGENT' | 'EMERGENCY'
export type ShiftType = 'DAY' | 'NIGHT'
export type StaffRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

// ---- DB Tables ----

export interface User {
  user_id: string
  tab_number: string
  full_name: string
  position: string | null
  role_level: RoleLevel
  service_id: string | null
  is_active: boolean
  phone: string | null
  pin_code: string | null
  created_at: string
  date_hired: string | null   // ISO date 'YYYY-MM-DD' or null — set on hire
  date_fired: string | null   // ISO date 'YYYY-MM-DD' or null — set on dismissal
}

export interface Service {
  service_id: string
  service_name: string
  created_at: string
}

export interface Category {
  category_id: string
  category_name: string
  created_at: string
}

export interface GObject {
  object_id: string
  category_id: string
  object_name: string
  location: string | null
  created_at: string
}

export interface Construction {
  construction_id: string
  object_id: string
  construction_name: string
  created_at: string
}

export interface WorkType {
  work_type_id: string
  construction_id: string
  work_name: string
  created_at: string
}

export interface Request {
  request_id: string
  service_id: string | null
  category_id: string | null
  object_id: string | null
  construction_id: string | null
  work_type_id: string | null
  description: string | null
  date_work: string | null
  shift_no: number | null
  shift_type: ShiftType | null
  status: RequestStatus
  priority: Priority
  urgency: Urgency
  transport_type: string | null
  fact_start: string | null
  fact_finish: string | null
  approved_by_head: string | null
  approved_by_zamporab: boolean | null
  approved_by_boss: boolean | null
  created_by: string | null
  created_at: string
  updated_at?: string
}

export interface RequestAssignment {
  id: string
  request_id: string
  user_id: string
  assigned_by: string | null
  created_at: string
}

export interface StaffRequest {
  id: string
  from_service_id: string
  to_service_id: string
  requested_users: string[] | null
  status: StaffRequestStatus
  approved_by: string | null
  date_work: string | null
  shift_no: number | null
  reason: string | null
  created_by: string | null
  created_at: string
}

export interface Remark {
  id: string
  request_id: string
  user_id: string
  remark_text: string
  is_critical: boolean
  created_at: string
}

export interface ChangelogEntry {
  id: string
  user_id: string | null
  action_type: string
  entity_type: string | null
  entity_id: string | null
  details: Record<string, unknown> | null
  created_at: string
}

// ---- Auth session (localStorage) ----
export interface AuthSession {
  user_id: string
  tab_number: string
  full_name: string
  role_level: RoleLevel
  service_id: string | null
  position: string | null
}

// ---- Panel config ----
export interface PanelConfig {
  id: string
  path: string
  title: string
  subtitle: string
  emoji: string
  roles: RoleLevel[]
  color: string
  roleLabel: string
}

// ---- Service color/emoji map ----
export const SERVICE_META: Record<string, { emoji: string; color: string; bg: string }> = {
  'SRV-ENG': { emoji: '⚡', color: '#eab308', bg: 'bg-yellow-500/20' },
  'SRV-STR': { emoji: '🏗️', color: '#8b5cf6', bg: 'bg-violet-500/20' },
  'SRV-FIRE': { emoji: '🚒', color: '#ef4444', bg: 'bg-red-500/20' },
  'SRV-VENT': { emoji: '💨', color: '#06b6d4', bg: 'bg-cyan-500/20' },
  'SRV-CCTV': { emoji: '📹', color: '#22c55e', bg: 'bg-green-500/20' },
}

export const STATUS_CONFIG: Record<RequestStatus, { label: string; color: string; bg: string }> = {
  NEW: { label: 'Новая', color: '#eab308', bg: 'bg-yellow-500/20 border-yellow-500/30' },
  PLANNED: { label: 'Запланирована', color: '#3b82f6', bg: 'bg-blue-500/20 border-blue-500/30' },
  IN_PROGRESS: { label: 'В работе', color: '#8b5cf6', bg: 'bg-violet-500/20 border-violet-500/30' },
  CHECKING: { label: 'Проверка', color: '#f97316', bg: 'bg-orange-500/20 border-orange-500/30' },
  DONE: { label: 'Выполнена', color: '#22c55e', bg: 'bg-green-500/20 border-green-500/30' },
}

export const STATUS_ORDER: RequestStatus[] = ['NEW', 'PLANNED', 'IN_PROGRESS', 'CHECKING', 'DONE']

export const PRIORITY_CONFIG: Record<Priority, { label: string; color: string }> = {
  LOW: { label: 'Низкий', color: '#64748b' },
  MEDIUM: { label: 'Средний', color: '#3b82f6' },
  HIGH: { label: 'Высокий', color: '#f97316' },
  CRITICAL: { label: 'Критический', color: '#ef4444' },
}

export const URGENCY_CONFIG: Record<Urgency, { label: string; color: string }> = {
  NORMAL: { label: 'Обычная', color: '#64748b' },
  URGENT: { label: 'Срочная', color: '#f97316' },
  EMERGENCY: { label: 'Аварийная', color: '#ef4444' },
}

export const PANELS: PanelConfig[] = [
  {
    id: 'dispatcher', path: '/dispatcher', title: 'Диспетчерская',
    subtitle: 'Центральный узел управления · Мониторинг смены', emoji: '🗂️',
    roles: ['DISPATCHER', 'ADMIN', 'BOSS'], color: 'from-blue-600/40 to-blue-800/40 border-blue-500/30',
    roleLabel: 'Начальник смены',
  },
  {
    id: 'zamporab', path: '/zamporab', title: 'Зам/Прораб',
    subtitle: 'Планирование смены · Распределение людей', emoji: '👷',
    roles: ['ZAMPORAB', 'ADMIN', 'BOSS'], color: 'from-emerald-600/40 to-emerald-800/40 border-emerald-500/30',
    roleLabel: 'Заместитель прораба',
  },
  {
    id: 'foreman', path: '/foreman', title: 'Мастер/Бригадир',
    subtitle: 'Мои задачи · Выполнение работ', emoji: '👷‍♂️',
    roles: ['FOREMAN', 'ADMIN', 'BOSS', 'ZAMPORAB'], color: 'from-green-600/40 to-green-800/40 border-green-500/30',
    roleLabel: 'Мастер участка',
  },
  {
    id: 'head', path: '/head', title: 'Начальник службы',
    subtitle: 'План работ службы · Контроль выполнения', emoji: '🏢',
    roles: ['HEAD', 'ADMIN', 'BOSS'], color: 'from-violet-600/40 to-violet-800/40 border-violet-500/30',
    roleLabel: 'Начальник службы',
  },
  {
    id: 'boss', path: '/boss', title: 'Босс (Дашборд)',
    subtitle: 'KPI · Статистика · Проблемы · Heatmap', emoji: '🏠',
    roles: ['BOSS', 'ADMIN'], color: 'from-amber-600/40 to-amber-800/40 border-amber-500/30',
    roleLabel: 'Начальник участка',
  },
  {
    id: 'transport', path: '/transport', title: 'Транспорт',
    subtitle: 'Парк машин · Назначение транспорта', emoji: '🚗',
    roles: ['TRANSPORT', 'ADMIN', 'BOSS', 'ZAMPORAB'], color: 'from-red-600/40 to-red-800/40 border-red-500/30',
    roleLabel: 'Главный механик',
  },
  {
    id: 'complaints', path: '/complaints', title: 'Жалобы',
    subtitle: 'Регистрация жалоб · Обработка обращений', emoji: '📞',
    roles: ['COMPLAINTS', 'ADMIN', 'BOSS', 'DISPATCHER'], color: 'from-cyan-600/40 to-cyan-800/40 border-cyan-500/30',
    roleLabel: 'Обработчик жалоб',
  },
  {
    id: 'chief', path: '/chief', title: 'Главный инженер',
    subtitle: 'Согласование планов работ · Контроль служб', emoji: '🔧',
    roles: ['CHIEF_ENGINEER', 'ADMIN', 'BOSS'], color: 'from-orange-600/40 to-orange-800/40 border-orange-500/30',
    roleLabel: 'Главный инженер',
  },
  {
    id: 'admin', path: '/admin', title: 'Админ-панель',
    subtitle: 'Справочники · Объекты · Пользователи', emoji: '⚙️',
    roles: ['ADMIN'], color: 'from-slate-600/40 to-slate-800/40 border-slate-500/30',
    roleLabel: 'Администратор',
  },
]

// ============================================
// HR MODULE — v2.0
// ============================================

export type EmployeeStatusType =
  | 'Na_rabote'
  | 'Otgul'
  | 'Bolnichniy'
  | 'Otpusk'
  | 'Uvolen'

export interface EmployeeStatus {
  id: string
  user_id: string
  status: EmployeeStatusType
  date_from: string        // ISO date string 'YYYY-MM-DD'
  date_to: string | null   // NULL = open-ended; set equal to date_from for single-day entries
  reason: string | null
  created_by: string
  created_at: string
}

export const EMPLOYEE_STATUS_CONFIG: Record<EmployeeStatusType, {
  label: string
  color: string
  bg: string
}> = {
  Na_rabote:  { label: 'На работе',  color: '#22c55e', bg: 'bg-green-500/20 border-green-500/30' },
  Otgul:      { label: 'Отгул',      color: '#eab308', bg: 'bg-yellow-500/20 border-yellow-500/30' },
  Bolnichniy: { label: 'Больничный', color: '#f97316', bg: 'bg-orange-500/20 border-orange-500/30' },
  Otpusk:     { label: 'Отпуск',     color: '#3b82f6', bg: 'bg-blue-500/20 border-blue-500/30' },
  Uvolen:     { label: 'Уволен',     color: '#64748b', bg: 'bg-slate-500/20 border-slate-500/30' },
}

// ============================================
// WORK PLANNING MODULE — v3.0
// ============================================

export type WorkPlanStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'
export type VehicleStatus = 'ACTIVE' | 'BROKEN' | 'MAINTENANCE'
export type VehicleType = 'CAR' | 'TRUCK' | 'SPECIAL' | 'BUS'

export interface WorkPlan {
  id: string
  service_id: string
  plan_date: string           // ISO date 'YYYY-MM-DD'
  shift_type: ShiftType
  status: WorkPlanStatus
  created_by: string
  submitted_at: string | null
  approved_by: string | null
  approved_at: string | null
  chief_notes: string | null
  created_at: string
  updated_at: string
}

export interface WorkPlanItem {
  id: string
  plan_id: string
  location: string
  work_description: string
  workers: string[]
  time_start: string | null   // 'HH:MM'
  time_end: string | null     // 'HH:MM'
  sort_order: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Vehicle {
  id: string
  name: string                // e.g. 'КамАЗ-5511'
  plate: string               // license plate
  vehicle_type: VehicleType
  status: VehicleStatus
  breakdown_details: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface VehicleAssignment {
  id: string
  vehicle_id: string
  plan_item_id: string
  assigned_by: string
  assigned_at: string
  notes: string | null
}

// Enriched types for UI

export interface WorkPlanWithItems extends WorkPlan {
  items: WorkPlanItem[]
}

export interface WorkPlanItemWithVehicles extends WorkPlanItem {
  vehicles: Vehicle[]
}

export interface VehicleWithAssignments extends Vehicle {
  assignments: Array<VehicleAssignment & { plan_item: WorkPlanItem }>
}

// Config constants

export const WORK_PLAN_STATUS_CONFIG: Record<WorkPlanStatus, { label: string; color: string; bg: string }> = {
  DRAFT:     { label: 'Черновик',     color: '#64748b', bg: 'bg-slate-500/20 border-slate-500/30' },
  SUBMITTED: { label: 'На согласовании', color: '#f97316', bg: 'bg-orange-500/20 border-orange-500/30' },
  APPROVED:  { label: 'Согласован',   color: '#22c55e', bg: 'bg-green-500/20 border-green-500/30' },
  REJECTED:  { label: 'Отклонён',     color: '#ef4444', bg: 'bg-red-500/20 border-red-500/30' },
}

export const VEHICLE_STATUS_CONFIG: Record<VehicleStatus, { label: string; color: string; bg: string }> = {
  ACTIVE:      { label: 'Активен',      color: '#22c55e', bg: 'bg-green-500/20 border-green-500/30' },
  BROKEN:      { label: 'Сломан',       color: '#ef4444', bg: 'bg-red-500/20 border-red-500/30' },
  MAINTENANCE: { label: 'ТО / Ремонт',  color: '#f97316', bg: 'bg-orange-500/20 border-orange-500/30' },
}

export const VEHICLE_TYPE_CONFIG: Record<VehicleType, { label: string; emoji: string }> = {
  CAR:     { label: 'Легковой',  emoji: '🚗' },
  TRUCK:   { label: 'Грузовой',  emoji: '🚛' },
  SPECIAL: { label: 'Спецтехника', emoji: '🚧' },
  BUS:     { label: 'Автобус',   emoji: '🚌' },
}

// EnrichedEmployee = User record + their resolved status for today
// statusRecord is null when no DB row exists for today — presence-by-default applies (Na_rabote)
export interface EnrichedEmployee {
  user: User
  currentStatus: EmployeeStatusType
  statusRecord: EmployeeStatus | null
}
