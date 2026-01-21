// ============================================
// API LAYER ДЛЯ SUPABASE
// ============================================

import { createClient } from '@supabase/supabase-js';
import type { Request, User, Service, StaffRequest, Remark, ChangeLog, RequestFilters } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================
// REQUESTS API
// ============================================

export const requestsApi = {
  async getRequests(filters?: RequestFilters): Promise<Request[]> {
    let query = supabase.from('requests').select('*');
    
    if (filters?.date) {
      query = query.eq('date_work', filters.date);
    }
    if (filters?.shift) {
      query = query.eq('shift_no', filters.shift);
    }
    if (filters?.service) {
      query = query.eq('service_id', filters.service);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.onlyProblems) {
      query = query.is('fact_finish', null).not('fact_start', 'is', null);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async getRequestById(id: string): Promise<Request | null> {
    const { data, error } = await supabase
      .from('requests')
      .select('*')
      .eq('request_id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateRequestStatus(id: string, status: string, userId?: string): Promise<void> {
    const { error } = await supabase
      .from('requests')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('request_id', id);
    
    if (error) throw error;
    
    if (userId) {
      await changeLogApi.log(id, userId, 'STATUS_CHANGE', '', status);
    }
  },

  async reportFactStart(id: string, userId: string): Promise<void> {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('requests')
      .update({ fact_start: now, status: 'IN_PROGRESS', updated_at: now })
      .eq('request_id', id);
    
    if (error) throw error;
    
    await changeLogApi.log(id, userId, 'FACT_START', '', now);
  },

  async reportFactFinish(id: string, userId: string): Promise<void> {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('requests')
      .update({ fact_finish: now, status: 'CHECKING', updated_at: now })
      .eq('request_id', id);
    
    if (error) throw error;
    
    await changeLogApi.log(id, userId, 'FACT_FINISH', '', now);
  },
};

// ============================================
// USERS API (employees таблица)
// ============================================

export const usersApi = {
  async getUsers(): Promise<User[]> {
    const { data, error } = await supabase.from('employees').select('*');
    if (error) throw error;
    return data || [];
  },

  async getUserById(id: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('user_id', id)
      .single();
    if (error) throw error;
    return data;
  },
};

// ============================================
// SERVICES API
// ============================================

export const servicesApi = {
  async getServices(): Promise<Service[]> {
    const { data, error } = await supabase.from('services').select('*');
    if (error) throw error;
    return data || [];
  },
};

// ============================================
// CHANGELOG API
// ============================================

export const changeLogApi = {
  async log(
    requestId: string,
    userId: string,
    actionType: string,
    oldValue: string,
    newValue: string,
    description?: string
  ): Promise<void> {
    const { error } = await supabase.from('changelog').insert({
      request_id: requestId,
      user_id: userId,
      action_type: actionType,
      old_value: oldValue,
      new_value: newValue,
      description,
    });
    
    if (error) throw error;
  },

  async getChangeLogForRequest(requestId: string): Promise<ChangeLog[]> {
    const { data, error } = await supabase
      .from('changelog')
      .select('*')
      .eq('request_id', requestId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },
};
