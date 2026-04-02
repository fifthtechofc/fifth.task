import { supabase } from '@/lib/supabase'

export type AuditAction =
  | 'auth.login'
  | 'auth.logout'
  | 'auth.password_change'
  | 'auth.2fa_enable_start'
  | 'auth.2fa_enable_complete'
  | 'auth.2fa_disable'

export async function logAuditEvent(params: {
  action: AuditAction
  metadata?: Record<string, unknown>
  resourceType?: string | null
  resourceId?: string | null
  ip?: string | null
  userAgent?: string | null
}) {
  const { error } = await supabase.rpc('log_audit_event', {
    p_action: params.action,
    p_metadata: params.metadata ?? {},
    p_resource_type: params.resourceType ?? null,
    p_resource_id: params.resourceId ?? null,
    p_ip: params.ip ?? null,
    p_user_agent: params.userAgent ?? null,
  })

  if (error) {
    // best-effort: auditoria não deve quebrar o fluxo principal
    return { ok: false as const, error: error.message }
  }
  return { ok: true as const }
}

