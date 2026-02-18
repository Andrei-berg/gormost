import { supabase } from './supabase'

export async function logAction(
  userId: string,
  actionType: string,
  entityType?: string | null,
  entityId?: string | null,
  details?: Record<string, unknown> | null
): Promise<void> {
  try {
    await supabase.from('changelog').insert({
      user_id: userId,
      action_type: actionType,
      entity_type: entityType || null,
      entity_id: entityId || null,
      details: details || null,
      created_at: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Logger error:', err)
  }
}
