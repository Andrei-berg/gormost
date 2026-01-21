// ============================================
// ТИПЫ ДЛЯ LEFORTOVO PLANNER
// ============================================

// Перечисления
export enum RoleLevel {
  BRIGADIER = 'BRIGADIER',
  MASTER = 'MASTER',
  SERVICE_HEAD = 'SERVICE_HEAD',
  DISPATCHER = 'DISPATCHER',
  ZAMPORAB = 'ZAMPORAB',
  BOSS = 'BOSS',
  TRANSPORT_MANAGER = 'TRANSPORT_MANAGER',
  ADMIN = 'ADMIN',
}

export enum RequestStatus {
  NEW = 'NEW',
  PLANNED = 'PLANNED',
  IN_PROGRESS = 'IN_PROGRESS',
  CHECKING = 'CHECKING',
  DONE = 'DONE',
}

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum Urgency {
  NORMAL = 'NORMAL',
  URGENT = 'URGENT',
  EMERGENCY = 'EMERGENCY',
}

export enum ShiftType {
  DAY = 'DAY',
  NIGHT = 'NIGHT',
}

// Интерфейсы
export interface Service {
  service_id: string;
  service_code: string;
  service_name: string;
  service_emoji?: string;
  created_at: string;
}

export interface User {
  user_id: string;
  tab_number?: string;
  last_name: string;
  first_name: string;
  middle_name?: string;
  position?: string;
  role_level: RoleLevel;
  service_id?: string;
  can_report_fact: boolean;
  created_at: string;
  updated_at: string;
}

export interface Request {
  request_id: string;
  service_id?: string;
  category_id?: string;
  object_id?: string;
  construction_id?: string;
  work_type_id?: string;
  work_description?: string;
  location_text?: string;
  date_work: string;
  shift_no?: number;
  shift_type?: ShiftType;
  is_night_work: boolean;
  status: RequestStatus;
  priority?: Priority;
  urgency?: Urgency;
  fact_start?: string;
  fact_finish?: string;
  transport_type?: string;
  transport_note?: string;
  approved_by_zamporab: boolean;
  approved_by_boss: boolean;
  approved_at_zamporab?: string;
  approved_at_boss?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface StaffRequest {
  staff_request_id: string;
  request_id?: string;
  from_service_id?: string;
  to_service_id?: string;
  requested_users?: string[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approved_by?: string;
  approved_at?: string;
  rejected_reason?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Remark {
  remark_id: string;
  request_id?: string;
  user_id?: string;
  remark_text: string;
  is_critical: boolean;
  created_at: string;
}

export interface ChangeLog {
  log_id: string;
  request_id?: string;
  user_id?: string;
  action_type: string;
  old_value?: string;
  new_value?: string;
  description?: string;
  created_at: string;
}

export interface RequestAssignment {
  assignment_id: string;
  request_id?: string;
  user_id?: string;
  assigned_by?: string;
  assigned_at: string;
}

export interface Category {
  category_id: string;
  category_name: string;
  created_at: string;
}

export interface ObjectType {
  object_id: string;
  category_id?: string;
  object_name: string;
  created_at: string;
}

export interface Construction {
  construction_id: string;
  object_id?: string;
  construction_name: string;
  created_at: string;
}

export interface WorkType {
  work_type_id: string;
  construction_id?: string;
  work_name: string;
  created_at: string;
}

// Фильтры
export interface RequestFilters {
  date?: string;
  shift?: number;
  service?: string;
  status?: RequestStatus;
  priority?: Priority;
  urgency?: Urgency;
  onlyProblems?: boolean;
}
