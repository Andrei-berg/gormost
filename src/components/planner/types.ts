import type { ShiftPhase, UserWithAssignment } from '@/types'

export interface PlannerSettings {
  showWeekends: boolean
  compactRows: boolean
  groupByService: boolean
  showPhaseStrips: boolean
  onlyWithIssues: boolean
  showSummaryCol: boolean
}

export const DEFAULT_SETTINGS: PlannerSettings = {
  showWeekends: true,
  compactRows: false,
  groupByService: true,
  showPhaseStrips: true,
  onlyWithIssues: false,
  showSummaryCol: true,
}

export interface PlannerFilters {
  search: string
  serviceId: string
  scheduleCode: string
  shiftNum: string
}

export const DEFAULT_FILTERS: PlannerFilters = {
  search: '',
  serviceId: '',
  scheduleCode: '',
  shiftNum: '',
}

export type PlannerMode = 'view' | 'edit'
export type SpanMonths = 1 | 2 | 3

export interface PhaseEditorState {
  userId: string
  userName: string
  scheduleCode: string
  rotationGroup: string | null
  clickedDate: string
  existingPhase: ShiftPhase | null
  posX: number
  posY: number
}

export interface ScheduleEditorState {
  userId: string
  user: UserWithAssignment
}

export interface CellState {
  auto: 'I' | 'II' | null
  manual: 'I' | 'II' | 'OFF' | null
}
