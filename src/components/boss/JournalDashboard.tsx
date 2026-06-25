'use client'
// Boss «План дня» — full read-only view of the journal (all services, all rows,
// published or not). Thin wrapper over the shared DayPlanView.
import DayPlanView from '@/components/shared/DayPlanView'

export default function JournalDashboard() {
  return <DayPlanView />
}
