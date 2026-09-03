// Barrel for all server-side data access.
// /api/db dispatches RPC calls by exported name (import * as api from '@/lib/api'),
// so every module's exports must be re-exported here.
export * from './api/users'
export * from './api/catalog'
export * from './api/requests'
export * from './api/stats'
export * from './api/hr'
export * from './api/plans'
export * from './api/vehicles'
export * from './api/shift-data'
export * from './api/safety'
export * from './api/auth'
export * from './api/alerts'
export * from './api/journal'
export * from './api/work-permits'
export * from './api/urgent-orders'
export * from './api/knowledge'
export { logAction } from './logger'
