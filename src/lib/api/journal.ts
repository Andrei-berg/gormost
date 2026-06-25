import { supabase } from '../supabase'
import type { JournalObjectCategory, JournalObject, DailyPlanItem, JournalShiftHeader } from '@/types'

// ============ JOURNAL OBJECT CATEGORIES ============

export async function fetchJournalObjectCategories(): Promise<JournalObjectCategory[]> {
  const { data } = await supabase.from('journal_object_categories').select('*').order('sort_order')
  return (data || []) as JournalObjectCategory[]
}

// ============ JOURNAL OBJECTS ============

export async function fetchJournalObjects(): Promise<JournalObject[]> {
  const { data } = await supabase.from('journal_objects').select('*').order('name')
  return (data || []) as JournalObject[]
}

export async function createJournalObject(obj: Partial<JournalObject>): Promise<JournalObject | null> {
  const { data, error } = await supabase.from('journal_objects').insert(obj).select().single()
  if (error) throw new Error(`Не удалось создать объект журнала: ${error.message}`)
  return data as JournalObject | null
}

export async function updateJournalObject(id: string, updates: Partial<JournalObject>): Promise<JournalObject | null> {
  const { data, error } = await supabase.from('journal_objects').update(updates).eq('id', id).select().single()
  if (error) throw new Error(`Не удалось обновить объект журнала: ${error.message}`)
  return data as JournalObject | null
}

export async function deleteJournalObject(id: string): Promise<boolean> {
  const { error } = await supabase.from('journal_objects').delete().eq('id', id)
  if (error) throw new Error(`Не удалось удалить объект журнала: ${error.message}`)
  return true
}

// ============ DAILY PLAN ITEMS ============

export async function fetchDailyPlanItems(planDate: string): Promise<DailyPlanItem[]> {
  const { data } = await supabase
    .from('daily_plan_items')
    .select('*')
    .eq('plan_date', planDate)
    .order('created_at')
  return (data || []) as DailyPlanItem[]
}

export async function createDailyPlanItem(item: Partial<DailyPlanItem>): Promise<DailyPlanItem | null> {
  const { data, error } = await supabase.from('daily_plan_items').insert(item).select().single()
  if (error) throw new Error(`Не удалось добавить строку плана: ${error.message}`)
  return data as DailyPlanItem | null
}

export async function updateDailyPlanItem(id: string, updates: Partial<DailyPlanItem>): Promise<DailyPlanItem | null> {
  const { data, error } = await supabase
    .from('daily_plan_items')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(`Не удалось обновить строку плана: ${error.message}`)
  return data as DailyPlanItem | null
}

export async function deleteDailyPlanItem(id: string): Promise<boolean> {
  const { error } = await supabase.from('daily_plan_items').delete().eq('id', id)
  if (error) throw new Error(`Не удалось удалить строку плана: ${error.message}`)
  return true
}

// Publish/unpublish a whole slice (date × shift). Published rows are mirrored
// read-only into the dispatcher / zamporab / head "План дня" view.
export async function publishDailyPlanItems(
  planDate: string, shiftType: string, published: boolean,
): Promise<boolean> {
  const { error } = await supabase
    .from('daily_plan_items')
    .update({ published, updated_at: new Date().toISOString() })
    .eq('plan_date', planDate)
    .eq('shift_type', shiftType)
  if (error) throw new Error(`Не удалось ${published ? 'опубликовать' : 'снять с публикации'} план: ${error.message}`)
  return true
}

// ============ JOURNAL SHIFT HEADERS (шапка дня) ============

export async function fetchShiftHeader(planDate: string, shiftType: string): Promise<JournalShiftHeader | null> {
  const { data } = await supabase
    .from('journal_shift_headers')
    .select('*')
    .eq('plan_date', planDate)
    .eq('shift_type', shiftType)
    .maybeSingle()
  return (data as JournalShiftHeader | null) ?? null
}

export async function upsertShiftHeader(header: Partial<JournalShiftHeader>): Promise<JournalShiftHeader | null> {
  const { data, error } = await supabase
    .from('journal_shift_headers')
    .upsert({ ...header, updated_at: new Date().toISOString() }, { onConflict: 'plan_date,shift_type' })
    .select()
    .single()
  if (error) throw new Error(`Не удалось сохранить шапку дня: ${error.message}`)
  return data as JournalShiftHeader | null
}
