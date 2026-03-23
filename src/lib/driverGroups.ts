/**
 * Driver schedule group templates (17 groups)
 * Source: ГРАФИКИ СМЕННОСТИ ВОДИТЕЛИ ЛЕФОРТОВО 2 КВ. 2026.xlsx
 *
 * Each group defines a complete schedule assignment for a driver.
 * Groups 1–4:  2/2 alternating day/night (cycle 4 days, 8-day macro-cycle)
 * Groups 5–8:  6/6 alternating day/night (cycle 12 days, 24-day macro-cycle)
 * Groups 9–10: 3/3 day only
 * Groups 11–12: 6/6 day only
 * Group 13:   4/4 day only (X/Y custom)
 * Groups 14–17: 15/15 first/second half × day/night
 *
 * Anchor dates verified against April 2026 Excel data:
 * - isWorkerOnDuty + resolveShiftStatus in shifts.ts use these anchors
 */

export interface DriverGroupTemplate {
  group: number
  label: string
  schedule_code: string           // '2/2' | '3/3' | '6/6' | '15/15' | 'X/Y'
  anchor_date: string | null      // shift_reference_date (YYYY-MM-DD)
  phase: 'day' | 'night'
  is_alternating: boolean
  rotation_group: string | null   // '1' | '2' for 15/15, null otherwise
  custom_work_days: number | null // for X/Y (group 13: 4)
  custom_rest_days: number | null // for X/Y (group 13: 4)
}

export const DRIVER_GROUPS: DriverGroupTemplate[] = [
  // Groups 1–4: 2/2 alternating
  // Verified: Groups 1+4 share anchor 2026-04-03; groups 2+3 share 2026-04-01
  { group: 1,  label: 'Группа 1  (2/2, ночь→день)',  schedule_code: '2/2',  anchor_date: '2026-04-03', phase: 'night', is_alternating: true,  rotation_group: null, custom_work_days: null, custom_rest_days: null },
  { group: 2,  label: 'Группа 2  (2/2, день→ночь)',  schedule_code: '2/2',  anchor_date: '2026-04-01', phase: 'day',   is_alternating: true,  rotation_group: null, custom_work_days: null, custom_rest_days: null },
  { group: 3,  label: 'Группа 3  (2/2, ночь→день)',  schedule_code: '2/2',  anchor_date: '2026-04-01', phase: 'night', is_alternating: true,  rotation_group: null, custom_work_days: null, custom_rest_days: null },
  { group: 4,  label: 'Группа 4  (2/2, день→ночь)',  schedule_code: '2/2',  anchor_date: '2026-04-03', phase: 'day',   is_alternating: true,  rotation_group: null, custom_work_days: null, custom_rest_days: null },

  // Groups 5–8: 6/6 alternating
  { group: 5,  label: 'Группа 5  (6/6, ночь→день)',  schedule_code: '6/6',  anchor_date: '2026-04-06', phase: 'night', is_alternating: true,  rotation_group: null, custom_work_days: null, custom_rest_days: null },
  { group: 6,  label: 'Группа 6  (6/6, день→ночь)',  schedule_code: '6/6',  anchor_date: '2026-04-06', phase: 'day',   is_alternating: true,  rotation_group: null, custom_work_days: null, custom_rest_days: null },
  { group: 7,  label: 'Группа 7  (6/6, ночь→день)',  schedule_code: '6/6',  anchor_date: '2026-03-31', phase: 'night', is_alternating: true,  rotation_group: null, custom_work_days: null, custom_rest_days: null },
  { group: 8,  label: 'Группа 8  (6/6, день→ночь)',  schedule_code: '6/6',  anchor_date: '2026-03-31', phase: 'day',   is_alternating: true,  rotation_group: null, custom_work_days: null, custom_rest_days: null },

  // Groups 9–10: 3/3 day only
  { group: 9,  label: 'Группа 9  (3/3, день)',        schedule_code: '3/3',  anchor_date: '2026-04-03', phase: 'day',   is_alternating: false, rotation_group: null, custom_work_days: null, custom_rest_days: null },
  { group: 10, label: 'Группа 10 (3/3, день)',        schedule_code: '3/3',  anchor_date: '2026-03-31', phase: 'day',   is_alternating: false, rotation_group: null, custom_work_days: null, custom_rest_days: null },

  // Groups 11–12: 6/6 day only (no alternating)
  { group: 11, label: 'Группа 11 (6/6, день)',        schedule_code: '6/6',  anchor_date: '2026-04-06', phase: 'day',   is_alternating: false, rotation_group: null, custom_work_days: null, custom_rest_days: null },
  { group: 12, label: 'Группа 12 (6/6, день)',        schedule_code: '6/6',  anchor_date: '2026-03-31', phase: 'day',   is_alternating: false, rotation_group: null, custom_work_days: null, custom_rest_days: null },

  // Group 13: 4/4 day only (X/Y custom schedule)
  { group: 13, label: 'Группа 13 (4/4, день)',        schedule_code: 'X/Y',  anchor_date: '2026-04-05', phase: 'day',   is_alternating: false, rotation_group: null, custom_work_days: 4,    custom_rest_days: 4    },

  // Groups 14–17: 15/15
  { group: 14, label: 'Группа 14 (15/15 1–15, день)',  schedule_code: '15/15', anchor_date: '2026-04-01', phase: 'day',   is_alternating: false, rotation_group: '1',  custom_work_days: null, custom_rest_days: null },
  { group: 15, label: 'Группа 15 (15/15 1–15, ночь)',  schedule_code: '15/15', anchor_date: '2026-04-01', phase: 'night', is_alternating: false, rotation_group: '1',  custom_work_days: null, custom_rest_days: null },
  { group: 16, label: 'Группа 16 (15/15 16–30, день)', schedule_code: '15/15', anchor_date: '2026-04-16', phase: 'day',   is_alternating: false, rotation_group: '2',  custom_work_days: null, custom_rest_days: null },
  { group: 17, label: 'Группа 17 (15/15 16–30, ночь)', schedule_code: '15/15', anchor_date: '2026-04-16', phase: 'night', is_alternating: false, rotation_group: '2',  custom_work_days: null, custom_rest_days: null },
]

/** Find a group template by number */
export function getDriverGroup(groupNumber: number): DriverGroupTemplate | undefined {
  return DRIVER_GROUPS.find(g => g.group === groupNumber)
}
