// ============================================
// GORMOST v2.0 — TypeScript Types
// Matches real Supabase schema
// ============================================

export type RoleLevel = 'ADMIN' | 'BOSS' | 'ZAMPORAB' | 'HEAD' | 'DISPATCHER' | 'FOREMAN' | 'TRANSPORT' | 'COMPLAINTS' | 'WORKER' | 'CHIEF_ENGINEER' | 'SPECIALIST' | 'HR' | 'DRIVER' | 'SAFETY_ENGINEER'
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
  // Phase 04 HR fields — all nullable for backward compat with existing rows
  last_name: string | null
  first_name: string | null
  middle_name: string | null
  email: string | null
  category: 'ИТР' | 'рабочий' | null
  probation_start: string | null
  probation_end: string | null
  is_disabled: boolean
  disability_group: 1 | 2 | 3 | null
  disability_notes: string | null
  has_many_children: boolean
  svo_type: 'мобилизован' | 'контракт' | 'через_регион' | null
  participates_in_stroyevaya: boolean
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
  {
    id: 'hr', path: '/hr', title: 'Кадры',
    subtitle: 'Статус сотрудников · Присутствие · История', emoji: '👥',
    roles: ['ZAMPORAB', 'HEAD', 'ADMIN', 'BOSS', 'HR'],
    color: 'from-teal-600/40 to-teal-800/40 border-teal-500/30',
    roleLabel: 'Кадровый учёт',
  },
  {
    id: 'driver', path: '/driver', title: 'Мой транспорт',
    subtitle: 'Моё авто · Задания на сегодня', emoji: '🚌',
    roles: ['DRIVER'],
    color: 'from-blue-600/40 to-blue-800/40 border-blue-500/30',
    roleLabel: 'Водитель',
  },
  {
    id: 'safety', path: '/safety', title: 'ТБиОТ',
    subtitle: 'Допуски · Аттестации · Охрана труда', emoji: '🛡️',
    roles: ['SAFETY_ENGINEER', 'ADMIN'],
    color: 'from-rose-600/40 to-rose-800/40 border-rose-500/30',
    roleLabel: 'Инженер ТБиОТ',
  },
  {
    id: 'planner', path: '/planner', title: 'Планировщик',
    subtitle: 'Графики смен · Фазы · Ручные правки', emoji: '🗓',
    roles: ['ADMIN', 'HR', 'HEAD', 'BOSS', 'ZAMPORAB', 'DISPATCHER', 'CHIEF_ENGINEER', 'FOREMAN', 'TRANSPORT', 'COMPLAINTS', 'SAFETY_ENGINEER', 'DRIVER', 'WORKER', 'SPECIALIST'],
    color: 'from-indigo-600/40 to-indigo-800/40 border-indigo-500/30',
    roleLabel: 'Планировщик смен',
  },
  {
    id: 'journal', path: '/journal', title: 'Журнал планов',
    subtitle: 'Ежедневное планирование · объект × служба', emoji: '📒',
    roles: ['BOSS', 'ADMIN'],
    color: 'from-amber-600/40 to-amber-800/40 border-amber-500/30',
    roleLabel: 'Журнал ежедневного планирования',
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
  | 'Komandirovka'
  | 'Uchebniy_otpusk'
  | 'Dekret'
  | 'Mobilizovan'
  | 'SVO'
  | 'Troydoustroyen_s_SVO'
  | 'Voennie_sbory'

export interface StatusMetadata {
  // SVO
  volunteer_type?: 'доброволец' | 'по контракту'
  contract_suspended?: boolean
  // Mobilizovan
  order_number?: string
  order_date?: string
  // Bolnichniy
  sick_leave_number?: string
  sick_leave_location?: 'стационар' | 'амбулаторно'
  sick_leave_submitted?: boolean
  sick_leave_submitted_date?: string  // ISO date when б/л was submitted to HR
  // Otgul
  otgul_basis?: 'za_svoy_schet' | 'za_otrabotannoe'
  // Otpusk
  leave_type?: string
  // Uvolen
  dismissal_order?: string
}

export interface EmployeeStatus {
  id: string
  user_id: string
  status: EmployeeStatusType
  date_from: string        // ISO date string 'YYYY-MM-DD'
  date_to: string | null   // NULL = open-ended; set equal to date_from for single-day entries
  reason: string | null
  created_by: string
  created_at: string
  // Departure / return tracking (migration 024)
  planned_departure: string | null   // when the employee is planned to leave
  planned_return:    string | null   // when the employee is planned to return
  actual_departure:  string | null   // when the employee actually left
  actual_return:     string | null   // when the employee actually returned
  metadata: StatusMetadata | null
}

// Statuses for which departure/return date fields are meaningful
export const STATUSES_WITH_DATES: EmployeeStatusType[] = [
  'Otgul', 'Bolnichniy', 'Otpusk', 'Komandirovka', 'Uchebniy_otpusk',
  'Dekret', 'Mobilizovan', 'SVO', 'Troydoustroyen_s_SVO', 'Voennie_sbory',
]
// Statuses that are typically open-ended (no fixed return date at the start)
export const OPEN_ENDED_STATUSES: EmployeeStatusType[] = [
  'Dekret', 'Mobilizovan', 'SVO', 'Troydoustroyen_s_SVO',
]

export const EMPLOYEE_STATUS_CONFIG: Record<EmployeeStatusType, {
  label: string
  color: string
  bg: string
}> = {
  Na_rabote:            { label: 'На работе',      color: '#22c55e', bg: 'bg-green-500/20 border-green-500/30' },
  Otgul:                { label: 'Отгул',          color: '#eab308', bg: 'bg-yellow-500/20 border-yellow-500/30' },
  Bolnichniy:           { label: 'Больничный',     color: '#f97316', bg: 'bg-orange-500/20 border-orange-500/30' },
  Otpusk:               { label: 'Отпуск',         color: '#3b82f6', bg: 'bg-blue-500/20 border-blue-500/30' },
  Uvolen:               { label: 'Уволен',         color: '#64748b', bg: 'bg-slate-500/20 border-slate-500/30' },
  Komandirovka:         { label: 'Командировка',   color: '#8b5cf6', bg: 'bg-violet-500/20 border-violet-500/30' },
  Uchebniy_otpusk:      { label: 'Учебный отпуск', color: '#3b82f6', bg: 'bg-blue-500/20 border-blue-500/30' },
  Dekret:               { label: 'Декрет',         color: '#ec4899', bg: 'bg-pink-500/20 border-pink-500/30' },
  Mobilizovan:          { label: 'Мобилизован',    color: '#dc2626', bg: 'bg-red-700/20 border-red-700/30' },
  SVO:                  { label: 'СВО',            color: '#991b1b', bg: 'bg-red-900/20 border-red-900/30' },
  Troydoustroyen_s_SVO: { label: 'Вернулся с СВО', color: '#16a34a', bg: 'bg-green-700/20 border-green-700/30' },
  Voennie_sbory:        { label: 'Военные сборы',  color: '#6366f1', bg: 'bg-indigo-500/20 border-indigo-500/30' },
}

// ============================================
// DIRECTIVES MODULE
// ============================================

export type DirectivePriority = 'NORMAL' | 'URGENT' | 'IMMEDIATE'
export type DirectiveStatus   = 'NEW' | 'ACCEPTED' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED'

export interface Directive {
  id:           string
  title:        string
  description:  string | null
  priority:     DirectivePriority
  plan_id:      string | null
  created_by:   string
  status:       DirectiveStatus
  suspend_plan: boolean
  notes:        string | null
  created_at:   string
  updated_at:   string
  // Extended fields (migration 041)
  service_id:   string | null
  order_type:   string | null
  location:     string | null
}

export interface DirectiveWorkerAssignment {
  id:               string
  directive_id:     string
  worker_id:        string
  worker_name:      string
  source_plan_id:   string | null
  source_plan_name: string | null
  assigned_at:      string
  assigned_by:      string
}

export interface ServiceOrderType {
  id:         string
  service_id: string
  name:       string
  sort_order: number
}

export const DIRECTIVE_PRIORITY_CONFIG: Record<DirectivePriority, { label: string; color: string }> = {
  NORMAL:    { label: 'Обычный',    color: '#64748b' },
  URGENT:    { label: 'Срочно',     color: '#f97316' },
  IMMEDIATE: { label: 'Немедленно', color: '#ef4444' },
}

export const DIRECTIVE_STATUS_CONFIG: Record<DirectiveStatus, { label: string; color: string }> = {
  NEW:         { label: 'Новое',     color: '#eab308' },
  ACCEPTED:    { label: 'Принято',   color: '#3b82f6' },
  IN_PROGRESS: { label: 'В работе',  color: '#8b5cf6' },
  DONE:        { label: 'Выполнено', color: '#22c55e' },
  CANCELLED:   { label: 'Отменено',  color: '#64748b' },
}

// ============================================
// WORK PLANNING MODULE — v3.0
// ============================================

export type WorkPlanStatus =
  | 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'
  | 'PLANNED' | 'BOSS_CONFIRMED' | 'ASSIGNED' | 'IN_PROGRESS' | 'DONE'
  | 'FAST_TRACK'   // bypasses approval chain for emergency/external orders
  | 'REDIRECTED'   // brigade was pulled off this plan
  | 'SUSPENDED'    // plan paused, will resume later
  | 'CANCELLED'    // plan explicitly cancelled (overdue / not executed)

export type WorkPriority = 'ROUTINE' | 'URGENT' | 'EMERGENCY' | 'CRITICAL' | 'OVERRIDE'
export type WorkSource = 'INTERNAL' | 'MAIN_OFFICE' | 'DJKH' | 'MAYOR'
export type OriginalPlanFate = 'REASSIGN' | 'POSTPONE' | 'CANCEL'
export type WorkAssignmentStatus = 'ACTIVE' | 'REDIRECTED' | 'COMPLETED'
export type VehicleStatus = 'ACTIVE' | 'BROKEN' | 'MAINTENANCE'
export type VehicleType = 'CAR' | 'TRUCK' | 'SPECIAL' | 'BUS' | 'TRACTOR' | 'AERIAL' | 'WASHER' | 'LOADER' | 'KMU' | 'CRANE'
export type VehicleBreakdownSeverity = 'MINOR' | 'MAJOR' | 'CRITICAL'
export type VehicleBreakdownStatus = 'OPEN' | 'IN_REPAIR' | 'RESOLVED'

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
  zamporab_approved_by: string | null
  zamporab_approved_at: string | null
  fact_start: string | null
  fact_finish: string | null
  created_at: string
  updated_at: string
  // Override/redirect fields (migration 026)
  priority: WorkPriority
  source: WorkSource
  source_ref: string | null
  source_org: string | null
  fast_track: boolean
  fast_track_reason: string | null
  started_at: string | null
  started_by: string | null
  paused_at: string | null
  pause_reason: string | null
  completed_at: string | null
  completed_by: string | null
  completion_note: string | null
  suspended_until: string | null
  parent_redirect_id: string | null
  // Work permit flag (migration 037)
  has_permit:         boolean | null
  permit_number:      string | null
  permit_issued_at:   string | null
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
  // headcount requirements (set by service chief when planning)
  required_workers: number
  required_brigadiers: number
  required_masters: number
  required_foremen: number
  required_vehicles: number
  required_vehicle_types: VehicleRequirement[]
  // emergency redirect
  is_redirected: boolean
  redirect_reason: string | null
  created_at: string
  updated_at: string
}

// Work assignment — employee assigned to a specific work plan item (brigade)
export type WorkAssignmentRole = 'WORKER' | 'BRIGADIER' | 'MASTER' | 'ITR' | 'DRIVER'

export interface WorkAssignment {
  id: string
  plan_item_id: string
  user_id: string
  role: WorkAssignmentRole
  assigned_by: string | null
  assigned_at: string
  assignment_status: WorkAssignmentStatus
  redirect_id: string | null
}

// Redirect journal entry — records every brigade redirect event
export interface WorkRedirect {
  id: string
  from_plan_id: string
  from_status: string
  partial_work_done: string | null
  to_plan_id: string | null
  ordered_by_source: WorkSource
  order_reference: string | null
  order_text: string
  redirected_by: string
  redirected_at: string
  affected_users: string[]
  full_brigade: boolean
  original_plan_fate: OriginalPlanFate
  created_at: string
}

export interface WorkAssignmentWithUser extends WorkAssignment {
  user: Pick<User, 'user_id' | 'full_name' | 'position' | 'tab_number'>
}

// ============================================
// Shift Phases (Variant 2) — explicit day/night phase records
// ============================================

export interface ShiftPhase {
  id: string
  employee_id: string
  valid_from: string       // ISO date 'YYYY-MM-DD'
  valid_to: string | null  // ISO date or null (still active)
  phase: 'day' | 'night'
  anchor_date: string      // ISO date — first workday of this phase block (or first month for 15/15-alt)
  schedule_code: string    // '2/2' | '3/3' | '6/6' | '15/15'
  is_alternating: boolean  // 15/15 only: auto-alternate phase each calendar month from anchor_date
  notes: string | null
  created_by: string | null
  created_at: string
}

// Resolved shift status for a specific date
export interface ShiftStatus {
  working: boolean
  phase: 'day' | 'night' | null
  shift_start: string | null   // 'HH:MM', null when not working
  shift_end: string | null     // 'HH:MM', null when not working
}

// EmployeeAssignment extended with joined schedule fields + active phase
export interface EmployeeAssignmentWithScheduleCode extends EmployeeAssignment {
  schedule_code?: string
  schedule_name?: string
  active_phase?: Pick<ShiftPhase, 'id' | 'phase' | 'anchor_date' | 'valid_from' | 'schedule_code' | 'is_alternating'> | null
}

export interface UserWithAssignment extends User {
  assignment: EmployeeAssignmentWithScheduleCode | null
}

export interface Vehicle {
  id: string
  name: string                // e.g. 'КамАЗ-5511'
  plate: string               // license plate
  vehicle_type: VehicleType
  status: VehicleStatus
  breakdown_details: string | null
  maintenance_until: string | null  // ISO date 'YYYY-MM-DD' — expected return from MAINTENANCE
  status_changed_at: string | null  // ISO timestamp — when current status was set
  notes: string | null
  is_active: boolean
  // extended characteristics (migration 013)
  fleet_number: string | null       // гаражный номер
  make: string | null               // марка (КАМАЗ, Газель…)
  model: string | null              // модель
  year: number | null               // год выпуска
  payload_kg: number | null         // грузоподъёмность кг
  seats: number | null              // количество мест
  max_height_m: number | null       // высота подъёма (люлька)
  has_water_tank: boolean           // наличие цистерны (моечная)
  garage_location: string | null    // бокс / место стоянки
  assigned_driver_id: string | null // закреплённый водитель
  // extended fields (migration 019) — from fleet inventory Excel
  chassis: string | null            // базовое шасси: КАМАЗ 65115, ГАЗ C42R33
  equipment_specs: string | null    // оснащение: АГП-14Р (14м), Телескопический (54м)
  unit: string | null               // участок: Лефортово, АВР, Зеленоград…
  current_location: string | null   // место нахождения: на участке, ДТП, Элефант Люберцы
  deployment: string | null         // командировка: Валдай, Курск, Луганск
  created_at: string
  updated_at: string
}

export interface VehicleAssignment {
  id: string
  vehicle_id: string
  plan_item_id: string
  assigned_by: string
  assigned_at: string
  driver_user_id: string | null  // кто едет на этом ТС на этот объект
  notes: string | null
}

// Breakdown / defect journal entry
export interface VehicleBreakdown {
  id: string
  vehicle_id: string
  reported_by: string
  reported_at: string
  description: string
  severity: VehicleBreakdownSeverity
  status: VehicleBreakdownStatus
  resolved_at: string | null
  resolution_notes: string | null
  mechanic_notes: string | null
  created_at: string
  updated_at: string
}

export interface VehicleBreakdownWithVehicle extends VehicleBreakdown {
  vehicle: Pick<Vehicle, 'id' | 'name' | 'plate' | 'vehicle_type'>
}

// Cross-service coordination
export type CrossServiceRequestStatus = 'PENDING' | 'CONFIRMED' | 'DECLINED'

export interface CrossServiceRequest {
  id: string
  from_plan_item_id: string
  from_plan_id: string
  from_service_id: string
  to_service_id: string
  description: string
  needed_count: number
  time_start: string | null
  time_end: string | null
  status: CrossServiceRequestStatus
  response_note: string | null
  responded_by: string | null
  responded_at: string | null
  created_by: string | null
  created_at: string
}

export const CROSS_SERVICE_STATUS_CONFIG: Record<CrossServiceRequestStatus, { label: string; color: string; bg: string }> = {
  PENDING:   { label: 'Ожидает ответа', color: '#f97316', bg: 'bg-orange-500/20 border-orange-500/30' },
  CONFIRMED: { label: 'Подтверждено',   color: '#22c55e', bg: 'bg-green-500/20 border-green-500/30' },
  DECLINED:  { label: 'Отклонено',      color: '#ef4444', bg: 'bg-red-500/20 border-red-500/30' },
}

// Enriched types for UI

export interface WorkPlanWithItems extends WorkPlan {
  items: WorkPlanItemWithVehicles[]
}

export interface WorkPlanItemWithVehicles extends WorkPlanItem {
  vehicles: Vehicle[]
  cross_requests: CrossServiceRequest[]
}

export interface VehicleWithAssignments extends Vehicle {
  assignments: Array<VehicleAssignment & { plan_item: WorkPlanItem }>
}

// Config constants

export const WORK_PLAN_STATUS_CONFIG: Record<WorkPlanStatus, { label: string; color: string; bg: string }> = {
  DRAFT:          { label: 'Черновик',          color: '#64748b', bg: 'bg-slate-500/20 border-slate-500/30' },
  SUBMITTED:      { label: 'На согласовании',   color: '#f97316', bg: 'bg-orange-500/20 border-orange-500/30' },
  APPROVED:       { label: 'Согл. гл. инж.',    color: '#22c55e', bg: 'bg-green-500/20 border-green-500/30' },
  REJECTED:       { label: 'Отклонён',          color: '#ef4444', bg: 'bg-red-500/20 border-red-500/30' },
  PLANNED:        { label: 'Согл. зампрораб',   color: '#3b82f6', bg: 'bg-blue-500/20 border-blue-500/30' },
  BOSS_CONFIRMED: { label: 'Утверждён нач.',    color: '#a855f7', bg: 'bg-purple-500/20 border-purple-500/30' },
  ASSIGNED:       { label: 'Люди назначены',    color: '#06b6d4', bg: 'bg-cyan-500/20 border-cyan-500/30' },
  IN_PROGRESS:    { label: 'В работе',          color: '#8b5cf6', bg: 'bg-violet-500/20 border-violet-500/30' },
  DONE:           { label: 'Выполнен',          color: '#22c55e', bg: 'bg-green-500/20 border-green-500/30' },
  FAST_TRACK:     { label: 'Fast Track ⚡',     color: '#f43f5e', bg: 'bg-rose-500/20 border-rose-500/30' },
  REDIRECTED:     { label: 'Бригада снята',     color: '#ef4444', bg: 'bg-red-500/20 border-red-500/30' },
  SUSPENDED:      { label: 'Приостановлен',     color: '#f59e0b', bg: 'bg-amber-500/20 border-amber-500/30' },
  CANCELLED:      { label: 'Отменён',           color: '#64748b', bg: 'bg-slate-500/20 border-slate-500/30' },
}

export const WORK_PRIORITY_CONFIG: Record<WorkPriority, { label: string; color: string; emoji: string }> = {
  ROUTINE:   { label: 'Плановая',   color: '#64748b', emoji: '📋' },
  URGENT:    { label: 'Срочная',    color: '#f97316', emoji: '🔶' },
  EMERGENCY: { label: 'Аварийная',  color: '#ef4444', emoji: '🚨' },
  CRITICAL:  { label: 'Критическая', color: '#dc2626', emoji: '🔴' },
  OVERRIDE:  { label: 'Поручение',  color: '#f43f5e', emoji: '⚡' },
}

export const WORK_SOURCE_CONFIG: Record<WorkSource, { label: string; color: string; emoji: string; bg: string }> = {
  INTERNAL:    { label: 'Внутренний',   color: '#64748b', emoji: '🏢', bg: 'bg-slate-500/10' },
  MAIN_OFFICE: { label: 'ГУ Гормост',  color: '#8b5cf6', emoji: '🏛️', bg: 'bg-violet-500/10' },
  DJKH:        { label: 'ДЖКХ',        color: '#3b82f6', emoji: '🏙️', bg: 'bg-blue-500/10' },
  MAYOR:       { label: 'Мэрия Москвы', color: '#ef4444', emoji: '⭐', bg: 'bg-red-500/10' },
}

export const VEHICLE_STATUS_CONFIG: Record<VehicleStatus, { label: string; color: string; bg: string }> = {
  ACTIVE:      { label: 'Активен',      color: '#22c55e', bg: 'bg-green-500/20 border-green-500/30' },
  BROKEN:      { label: 'Сломан',       color: '#ef4444', bg: 'bg-red-500/20 border-red-500/30' },
  MAINTENANCE: { label: 'ТО / Ремонт',  color: '#f97316', bg: 'bg-orange-500/20 border-orange-500/30' },
}

export interface CrossServiceDraft {
  to_service_id: string
  description: string
  needed_count: number
  time_start: string
  time_end: string
}

export interface VehicleRequirement {
  type: VehicleType
  count: number
}

export const VEHICLE_TYPE_CONFIG: Record<VehicleType, { label: string; emoji: string }> = {
  CAR:     { label: 'Легковой',        emoji: '🚗' },
  TRUCK:   { label: 'Самосвал/Груз.',  emoji: '🚛' },
  KMU:     { label: 'КМУ',             emoji: '🦾' },
  AERIAL:  { label: 'Автовышка',       emoji: '🏗️' },
  CRANE:   { label: 'Кран',            emoji: '🏛️' },
  LOADER:  { label: 'Погрузчик',       emoji: '📦' },
  TRACTOR: { label: 'Трактор',         emoji: '🚜' },
  BUS:     { label: 'Вахтовка/Авт.',   emoji: '🚌' },
  WASHER:  { label: 'Поливомоечная',   emoji: '🚿' },
  SPECIAL: { label: 'Спецтехника',     emoji: '🚧' },
}

export const VEHICLE_BREAKDOWN_SEVERITY_CONFIG: Record<VehicleBreakdownSeverity, { label: string; color: string; bg: string }> = {
  MINOR:    { label: 'Незначительная', color: '#eab308', bg: 'bg-yellow-500/20 border-yellow-500/30' },
  MAJOR:    { label: 'Серьёзная',      color: '#f97316', bg: 'bg-orange-500/20 border-orange-500/30' },
  CRITICAL: { label: 'Критическая',   color: '#ef4444', bg: 'bg-red-500/20 border-red-500/30' },
}

export const VEHICLE_BREAKDOWN_STATUS_CONFIG: Record<VehicleBreakdownStatus, { label: string; color: string; bg: string }> = {
  OPEN:       { label: 'Открыта',    color: '#ef4444', bg: 'bg-red-500/20 border-red-500/30' },
  IN_REPAIR:  { label: 'В ремонте',  color: '#f97316', bg: 'bg-orange-500/20 border-orange-500/30' },
  RESOLVED:   { label: 'Устранена',  color: '#22c55e', bg: 'bg-green-500/20 border-green-500/30' },
}

// EnrichedEmployee = User record + their resolved status for today
// statusRecord is null when no DB row exists for today — presence-by-default applies (Na_rabote)
export interface EnrichedEmployee {
  user: User
  currentStatus: EmployeeStatusType
  statusRecord: EmployeeStatus | null
}

// --- Phase 04: Staff Management types ---

export interface Profession {
  id: string
  name: string
  grade: string | null
  category: 'ИТР' | 'рабочий'
  is_driver: boolean
  is_active: boolean
  created_at: string
}

export interface Schedule {
  id: string
  code: string
  name: string
  work_days: number
  rest_days: number
  default_day_night: 'night' | 'day' | 'alternating'
  is_shift_based: boolean
  created_at: string
}

export interface EmployeePosition {
  id: string
  user_id: string
  profession_id: string
  started_at: string
  ended_at: string | null
  change_reason: string | null
  notes: string | null
  created_by: string | null
  created_at: string
}

export interface EmployeeAssignment {
  id: string
  user_id: string
  schedule_id: string
  shift_num: number | null
  rotation_group: string | null
  foreman_name: string | null
  shift_reference_date: string | null
  is_driver: boolean
  custom_work_days: number | null   // X/Y schedule: days on
  custom_rest_days: number | null   // X/Y schedule: days off
  driver_group_number: number | null  // 1–17 driver group from Excel schedule template
  started_at: string
  ended_at: string | null
  created_by: string | null
  created_at: string
}

export interface EmployeePositionWithProfession extends EmployeePosition {
  profession: Profession
}

export interface EmployeeAssignmentWithSchedule extends EmployeeAssignment {
  schedule: Schedule
}

export interface EmployeeDetail {
  user: User
  currentStatus: EmployeeStatusType
  currentPosition: EmployeePositionWithProfession | null
  positionHistory: EmployeePositionWithProfession[]
  currentAssignment: EmployeeAssignmentWithSchedule | null
  recentRequests: RequestAssignment[]
}


// Driver manual shift planning override
export interface DriverManualShift {
  id: string
  user_id: string
  shift_date: string       // 'YYYY-MM-DD'
  shift_type: 'I' | 'II' | 'OFF'
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

// ============================================
// SAFETY MODULE (ТБиОТ) — v1.0
// ============================================

export type CertCategory = 'Обучение' | 'Аттестация' | 'Допуск' | 'Удостоверение'

// Computed on frontend from expires_at vs today
export type CertStatus = 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'NOT_ASSIGNED'

export interface CertType {
  id: string
  code: string
  name: string
  cert_category: CertCategory
  period_months: number | null   // null = no fixed period
  period_note: string | null     // '1–3 года', 'По закону'
  target_group: string | null
  notes: string | null
  is_active: boolean
  sort_order: number
}

export type RenewalType = 'первичное' | 'очередное' | 'повторное' | 'бессрочное'
export type ReturnStatus = 'сдал' | 'не сдал' | 'забрал'

export interface EmployeeCert {
  id: string
  employee_id: string | null  // null for unlinked import records
  full_name: string | null    // for unlinked records (when employee_id is null)
  cert_type_id: string
  issued_at: string | null    // 'YYYY-MM-DD'
  expires_at: string | null
  is_indefinite: boolean      // true = бессрочно (never expires)
  doc_number: string | null
  protocol_number: string | null  // № протокола
  ob_pa_date: string | null       // Дата ОБ/ПА — плановый инструктаж
  renewal_type: RenewalType | null  // первичное / очередное / повторное / бессрочное
  return_status: ReturnStatus | null  // сдал / не сдал / забрал
  issuer: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  // joined
  cert_type?: CertType
  employee?: User | null
}

export interface CertRequirement {
  id: string
  cert_type_id: string
  role_level: string | null      // RoleLevel value
  service_id: string | null
  position_pattern: string | null  // ILIKE match against users.position
  notes: string | null
  created_at: string
  cert_type?: CertType
}

// ─── System Alerts ───────────────────────────────────────────────────────────

export type AlertLevel = 'critical' | 'warning' | 'info'

export interface SystemAlert {
  id: string
  level: AlertLevel
  title: string
  detail?: string
}

// ─── Home page live counters ─────────────────────────────────────────────────

export interface HomeCounters {
  brokenVehicles: number
  maintenanceVehicles: number
  expiredCerts: number
  expiringSoonCerts: number
  newComplaints: number
  plansSubmitted: number
  plansApproved: number
  plansPlanned: number
}

/** Helpers */
export function certStatusFromDates(expiresAt: string | null, isIndefinite = false): 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' {
  if (isIndefinite || !expiresAt) return 'VALID'
  const now = new Date()
  const exp = new Date(expiresAt)
  const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / 86400000)
  if (daysLeft < 0) return 'EXPIRED'
  if (daysLeft <= 30) return 'EXPIRING_SOON'
  return 'VALID'
}

export const CERT_STATUS_CONFIG: Record<CertStatus, { label: string; color: string; bg: string; text: string }> = {
  VALID:          { label: 'Действует',   color: '#22c55e', bg: 'bg-green-500/20',  text: 'text-green-400' },
  EXPIRING_SOON:  { label: 'Истекает',    color: '#f97316', bg: 'bg-orange-500/20', text: 'text-orange-400' },
  EXPIRED:        { label: 'Просрочен',   color: '#ef4444', bg: 'bg-red-500/20',    text: 'text-red-400' },
  NOT_ASSIGNED:   { label: 'Не внесён',   color: '#64748b', bg: 'bg-slate-500/10',  text: 'text-slate-500' },
}

export const CERT_CATEGORY_CONFIG: Record<CertCategory, { emoji: string; color: string }> = {
  'Обучение':      { emoji: '📚', color: 'text-blue-400' },
  'Аттестация':    { emoji: '📋', color: 'text-violet-400' },
  'Допуск':        { emoji: '🔑', color: 'text-amber-400' },
  'Удостоверение': { emoji: '🪪', color: 'text-teal-400' },
}

// ============ JOURNAL — ежедневное планирование (миграция 042) ============
// Отдельные лёгкие таблицы; воронка work_plans не задействована.

export type JournalPeriod = 'DAY' | 'NIGHT'

export interface JournalObjectCategory {
  id: string
  name: string
  emoji: string
  sort_order: number
}

export interface JournalObject {
  id: string
  name: string
  category_id: string
  address: string
  created_by?: string | null
  created_at?: string
}

export interface DailyPlanItem {
  id: string
  plan_date: string // ISO yyyy-mm-dd
  shift_type: JournalPeriod
  object_id: string
  service_id: string
  work_text: string
  required_workers: number  // рабочие
  required_foremen: number  // мастера
  required_itr: number      // ИТР
  required_vehicles: number
  note?: string | null
  created_by?: string | null
  created_at?: string
  updated_at?: string
}

// ============ WORK PERMIT CATALOG — наряд-допуск (миграция 043) ============
// Универсальный редактируемый каталог видов работ + курирование по службе.

export interface WorkPermitType {
  id: string
  label: string
  factors: string
  instruction_nums: string
  is_road_work: boolean
  during_measure_2: string
  sort_order: number
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface WorkPermitServiceType {
  service_id: string
  type_id: string
  enabled: boolean
  factors_override: string | null
  instruction_nums_override: string | null
  during_measure_2_override: string | null
  sort_order: number
}

// Resolved view for a service: catalog defaults with service overrides applied.
// Shape matches WorkPermitModal's WorkTypeConfig (camelCase) + id.
export interface ResolvedWorkPermitType {
  id: string
  label: string
  factors: string
  instructionNums: string
  isRoadWork: boolean
  duringMeasure2: string
}
