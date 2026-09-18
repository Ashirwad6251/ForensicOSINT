import { supabase } from './supabase';

const OPERATOR_ID = 'INVESTIGATOR-001';

export async function logAudit(
  caseId: string,
  action: string,
  description: string,
  entityType = '',
  entityId = ''
): Promise<void> {
  const hashInput = `${caseId}|${action}|${description}|${Date.now()}`;
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(hashInput));
  const hashSig = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  await supabase.from('audit_logs').insert({
    case_id: caseId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    description,
    operator_id: OPERATOR_ID,
    hash_signature: hashSig,
  });
}

export { OPERATOR_ID };
