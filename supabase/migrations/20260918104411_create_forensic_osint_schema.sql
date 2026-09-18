/*
# ForensicOSINT Studio - Database Schema

Creates the full schema for a digital forensics and OSINT investigation platform.

## New Tables
1. `cases` — Investigation cases with status, priority, risk score
2. `entities` — Multi-type entities (person, email, ip, domain, username, phone, image_hash, url)
3. `evidence_files` — Uploaded forensic images with SHA-256/MD5 hashes and EXIF metadata
4. `lens_matches` — Google Lens reverse search match results per evidence file
5. `web_captures` — Captured web page snapshots with integrity hashes
6. `audit_logs` — Immutable chain-of-custody audit trail
7. `relationships` — Directed edges between entities for link analysis

## Security
- Single-tenant app (no sign-in). All tables use `TO anon, authenticated` with `USING (true)` policies since data is intentionally shared.
- RLS enabled on every table.
*/

CREATE TABLE IF NOT EXISTS cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number text NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','closed','pending','archived')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  risk_score integer NOT NULL DEFAULT 0,
  operator_id text NOT NULL DEFAULT 'INVESTIGATOR-001',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES cases(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('person','email','ip','domain','username','phone','image_hash','url','web_page')),
  value text NOT NULL,
  label text DEFAULT '',
  metadata jsonb DEFAULT '{}',
  risk_level text DEFAULT 'low' CHECK (risk_level IN ('low','medium','high','critical')),
  flagged boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS evidence_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES cases(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL,
  sha256 text NOT NULL,
  md5 text NOT NULL,
  exif_data jsonb DEFAULT '{}',
  gps_lat double precision,
  gps_lng double precision,
  ocr_text text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lens_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id uuid REFERENCES evidence_files(id) ON DELETE CASCADE,
  case_id uuid REFERENCES cases(id) ON DELETE CASCADE,
  target_url text NOT NULL,
  domain text NOT NULL,
  page_title text DEFAULT '',
  thumbnail_url text DEFAULT '',
  first_indexed date,
  similarity_score real DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS web_captures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES cases(id) ON DELETE CASCADE,
  url text NOT NULL,
  page_title text DEFAULT '',
  capture_format text DEFAULT 'WARC',
  sha256 text NOT NULL,
  file_size bigint DEFAULT 0,
  operator_id text NOT NULL DEFAULT 'INVESTIGATOR-001',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES cases(id) ON DELETE CASCADE,
  action text NOT NULL,
  entity_type text DEFAULT '',
  entity_id text DEFAULT '',
  description text NOT NULL,
  operator_id text NOT NULL DEFAULT 'INVESTIGATOR-001',
  hash_signature text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES cases(id) ON DELETE CASCADE,
  source_entity_id uuid REFERENCES entities(id) ON DELETE CASCADE,
  target_entity_id uuid REFERENCES entities(id) ON DELETE CASCADE,
  relation_type text NOT NULL CHECK (relation_type IN ('FOUND_ON_WEBSITE','OWNED_BY','RESOLVES_TO','LINKED_TO','USES_EMAIL','REGISTERED_TO','CONNECTED_TO','APPEARS_IN','BREACHED_AT')),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE lens_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE web_captures ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;

-- Cases policies (single-tenant: anon + authenticated)
DROP POLICY IF EXISTS "anon_select_cases" ON cases;
CREATE POLICY "anon_select_cases" ON cases FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_cases" ON cases;
CREATE POLICY "anon_insert_cases" ON cases FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_cases" ON cases;
CREATE POLICY "anon_update_cases" ON cases FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_cases" ON cases;
CREATE POLICY "anon_delete_cases" ON cases FOR DELETE TO anon, authenticated USING (true);

-- Entities policies
DROP POLICY IF EXISTS "anon_select_entities" ON entities;
CREATE POLICY "anon_select_entities" ON entities FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_entities" ON entities;
CREATE POLICY "anon_insert_entities" ON entities FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_entities" ON entities;
CREATE POLICY "anon_update_entities" ON entities FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_entities" ON entities;
CREATE POLICY "anon_delete_entities" ON entities FOR DELETE TO anon, authenticated USING (true);

-- Evidence files policies
DROP POLICY IF EXISTS "anon_select_evidence" ON evidence_files;
CREATE POLICY "anon_select_evidence" ON evidence_files FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_evidence" ON evidence_files;
CREATE POLICY "anon_insert_evidence" ON evidence_files FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_evidence" ON evidence_files;
CREATE POLICY "anon_update_evidence" ON evidence_files FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_evidence" ON evidence_files;
CREATE POLICY "anon_delete_evidence" ON evidence_files FOR DELETE TO anon, authenticated USING (true);

-- Lens matches policies
DROP POLICY IF EXISTS "anon_select_lens" ON lens_matches;
CREATE POLICY "anon_select_lens" ON lens_matches FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lens" ON lens_matches;
CREATE POLICY "anon_insert_lens" ON lens_matches FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lens" ON lens_matches;
CREATE POLICY "anon_delete_lens" ON lens_matches FOR DELETE TO anon, authenticated USING (true);

-- Web captures policies
DROP POLICY IF EXISTS "anon_select_captures" ON web_captures;
CREATE POLICY "anon_select_captures" ON web_captures FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_captures" ON web_captures;
CREATE POLICY "anon_insert_captures" ON web_captures FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_captures" ON web_captures;
CREATE POLICY "anon_delete_captures" ON web_captures FOR DELETE TO anon, authenticated USING (true);

-- Audit logs policies (insert + select only, no update/delete for immutability)
DROP POLICY IF EXISTS "anon_select_audit" ON audit_logs;
CREATE POLICY "anon_select_audit" ON audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_audit" ON audit_logs;
CREATE POLICY "anon_insert_audit" ON audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Relationships policies
DROP POLICY IF EXISTS "anon_select_rels" ON relationships;
CREATE POLICY "anon_select_rels" ON relationships FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_rels" ON relationships;
CREATE POLICY "anon_insert_rels" ON relationships FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_rels" ON relationships;
CREATE POLICY "anon_delete_rels" ON relationships FOR DELETE TO anon, authenticated USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_entities_case_id ON entities(case_id);
CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(type);
CREATE INDEX IF NOT EXISTS idx_evidence_case_id ON evidence_files(case_id);
CREATE INDEX IF NOT EXISTS idx_lens_evidence_id ON lens_matches(evidence_id);
CREATE INDEX IF NOT EXISTS idx_lens_case_id ON lens_matches(case_id);
CREATE INDEX IF NOT EXISTS idx_audit_case_id ON audit_logs(case_id);
CREATE INDEX IF NOT EXISTS idx_rels_case_id ON relationships(case_id);
CREATE INDEX IF NOT EXISTS idx_rels_source ON relationships(source_entity_id);
CREATE INDEX IF NOT EXISTS idx_rels_target ON relationships(target_entity_id);
CREATE INDEX IF NOT EXISTS idx_captures_case_id ON web_captures(case_id);
