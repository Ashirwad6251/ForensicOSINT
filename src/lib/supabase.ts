import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type CaseRow = {
  id: string;
  case_number: string;
  title: string;
  description: string;
  status: 'active' | 'closed' | 'pending' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'critical';
  risk_score: number;
  operator_id: string;
  created_at: string;
  updated_at: string;
};

export type EntityType = 'person' | 'email' | 'ip' | 'domain' | 'username' | 'phone' | 'image_hash' | 'url' | 'web_page';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type EntityRow = {
  id: string;
  case_id: string;
  type: EntityType;
  value: string;
  label: string;
  metadata: Record<string, unknown>;
  risk_level: RiskLevel;
  flagged: boolean;
  created_at: string;
};

export type EvidenceRow = {
  id: string;
  case_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  sha256: string;
  md5: string;
  exif_data: Record<string, unknown>;
  gps_lat: number | null;
  gps_lng: number | null;
  ocr_text: string;
  notes: string;
  created_at: string;
};

export type LensMatchRow = {
  id: string;
  evidence_id: string;
  case_id: string;
  target_url: string;
  domain: string;
  page_title: string;
  thumbnail_url: string;
  first_indexed: string | null;
  similarity_score: number;
  created_at: string;
};

export type WebCaptureRow = {
  id: string;
  case_id: string;
  url: string;
  page_title: string;
  capture_format: string;
  sha256: string;
  file_size: number;
  operator_id: string;
  created_at: string;
};

export type AuditLogRow = {
  id: string;
  case_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  description: string;
  operator_id: string;
  hash_signature: string;
  created_at: string;
};

export type RelationType = 'FOUND_ON_WEBSITE' | 'OWNED_BY' | 'RESOLVES_TO' | 'LINKED_TO' | 'USES_EMAIL' | 'REGISTERED_TO' | 'CONNECTED_TO' | 'APPEARS_IN' | 'BREACHED_AT';

export type RelationshipRow = {
  id: string;
  case_id: string;
  source_entity_id: string;
  target_entity_id: string;
  relation_type: RelationType;
  metadata: Record<string, unknown>;
  created_at: string;
};
