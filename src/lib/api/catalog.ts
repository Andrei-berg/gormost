import { supabase } from '../supabase'
import type {
  Service, Category, GObject, Construction, WorkType,
} from '@/types'

// ============ SERVICES ============

export async function fetchServices(): Promise<Service[]> {
  const { data } = await supabase.from('services').select('*').order('service_name')
  return (data || []) as Service[]
}

export async function createService(service: Partial<Service>): Promise<Service | null> {
  const { data } = await supabase.from('services').insert(service).select().single()
  return data as Service | null
}

export async function updateService(serviceId: string, updates: Partial<Service>): Promise<Service | null> {
  const { data } = await supabase.from('services').update(updates).eq('service_id', serviceId).select().single()
  return data as Service | null
}

export async function deleteService(serviceId: string): Promise<boolean> {
  const { error } = await supabase.from('services').delete().eq('service_id', serviceId)
  return !error
}

// ============ CATEGORIES ============

export async function fetchCategories(): Promise<Category[]> {
  const { data } = await supabase.from('categories').select('*').order('category_name')
  return (data || []) as Category[]
}

export async function createCategory(cat: Partial<Category>): Promise<Category | null> {
  const { data } = await supabase.from('categories').insert(cat).select().single()
  return data as Category | null
}

export async function updateCategory(catId: string, updates: Partial<Category>): Promise<Category | null> {
  const { data } = await supabase.from('categories').update(updates).eq('category_id', catId).select().single()
  return data as Category | null
}

export async function deleteCategory(catId: string): Promise<boolean> {
  const { error } = await supabase.from('categories').delete().eq('category_id', catId)
  return !error
}

// ============ OBJECTS ============

export async function fetchObjects(categoryId?: string): Promise<GObject[]> {
  let q = supabase.from('objects').select('*').order('object_name')
  if (categoryId) q = q.eq('category_id', categoryId)
  const { data } = await q
  return (data || []) as GObject[]
}

export async function createObject(obj: Partial<GObject>): Promise<GObject | null> {
  const { data } = await supabase.from('objects').insert(obj).select().single()
  return data as GObject | null
}

export async function updateObject(objId: string, updates: Partial<GObject>): Promise<GObject | null> {
  const { data } = await supabase.from('objects').update(updates).eq('object_id', objId).select().single()
  return data as GObject | null
}

export async function deleteObject(objId: string): Promise<boolean> {
  const { error } = await supabase.from('objects').delete().eq('object_id', objId)
  return !error
}

// ============ CONSTRUCTIONS ============

export async function fetchConstructions(objectId?: string): Promise<Construction[]> {
  let q = supabase.from('constructions').select('*').order('construction_name')
  if (objectId) q = q.eq('object_id', objectId)
  const { data } = await q
  return (data || []) as Construction[]
}

export async function createConstruction(c: Partial<Construction>): Promise<Construction | null> {
  const { data } = await supabase.from('constructions').insert(c).select().single()
  return data as Construction | null
}

export async function updateConstruction(cId: string, updates: Partial<Construction>): Promise<Construction | null> {
  const { data } = await supabase.from('constructions').update(updates).eq('construction_id', cId).select().single()
  return data as Construction | null
}

export async function deleteConstruction(cId: string): Promise<boolean> {
  const { error } = await supabase.from('constructions').delete().eq('construction_id', cId)
  return !error
}

// ============ WORK TYPES ============

export async function fetchWorkTypes(constructionId?: string): Promise<WorkType[]> {
  let q = supabase.from('work_types').select('*').order('work_name')
  if (constructionId) q = q.eq('construction_id', constructionId)
  const { data } = await q
  return (data || []) as WorkType[]
}

export async function createWorkType(wt: Partial<WorkType>): Promise<WorkType | null> {
  const { data } = await supabase.from('work_types').insert(wt).select().single()
  return data as WorkType | null
}

export async function updateWorkType(wtId: string, updates: Partial<WorkType>): Promise<WorkType | null> {
  const { data } = await supabase.from('work_types').update(updates).eq('work_type_id', wtId).select().single()
  return data as WorkType | null
}

export async function deleteWorkType(wtId: string): Promise<boolean> {
  const { error } = await supabase.from('work_types').delete().eq('work_type_id', wtId)
  return !error
}
