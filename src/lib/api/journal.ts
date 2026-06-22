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
  const { data } = await supabase.from('journal_objects').insert(obj).select().single()
  return data as JournalObject | null
}

export async function updateJournalObject(id: string, updates: Partial<JournalObject>): Promise<JournalObject | null> {
  const { data } = await supabase.from('journal_objects').update(updates).eq('id', id).select().single()
  return data as JournalObject | null
}

export async function deleteJournalObject(id: string): Promise<boolean> {
  const { error } = await supabase.from('journal_objects').delete().eq('id', id)
  return !error
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
  const { data } = await supabase.from('daily_plan_items').insert(item).select().single()
  return data as DailyPlanItem | null
}

export async function updateDailyPlanItem(id: string, updates: Partial<DailyPlanItem>): Promise<DailyPlanItem | null> {
  const { data } = await supabase
    .from('daily_plan_items')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  return data as DailyPlanItem | null
}

export async function deleteDailyPlanItem(id: string): Promise<boolean> {
  const { error } = await supabase.from('daily_plan_items').delete().eq('id', id)
  return !error
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
  const { data } = await supabase
    .from('journal_shift_headers')
    .upsert({ ...header, updated_at: new Date().toISOString() }, { onConflict: 'plan_date,shift_type' })
    .select()
    .single()
  return data as JournalShiftHeader | null
}
