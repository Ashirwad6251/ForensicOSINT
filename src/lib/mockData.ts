import type {
  EntityRow, EvidenceRow, LensMatchRow,
  WebCaptureRow, AuditLogRow, RelationshipRow,
  EntityType, RiskLevel,
} from './supabase';

const NIGHTSHADE_ID = 'sample-nightshade';

function iso(daysAgo: number, hour = 10): string {
  const d = new Date('2026-09-22T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - daysAgo);
  d.setUTCHours(hour);
  return d.toISOString();
}

// ===== ENTITIES (13) =====
export const mockEntities: EntityRow[] = [
  { id: 'ent-01', case_id: NIGHTSHADE_ID, type: 'person', value: 'M. Vance', label: 'Primary Subject', metadata: { role: 'Operator', clearance: 'SECTOR 7' }, risk_level: 'critical', flagged: true, created_at: iso(12, 8) },
  { id: 'ent-02', case_id: NIGHTSHADE_ID, type: 'email', value: 'm.vance@protonmail.ch', label: 'ProtonMail', metadata: { provider: 'ProtonMail', verified: true }, risk_level: 'high', flagged: true, created_at: iso(12, 8) },
  { id: 'ent-03', case_id: NIGHTSHADE_ID, type: 'ip', value: '185.220.101.47', label: 'Tor Exit Node', metadata: { isp: 'Thor Network LLC', country: 'Russia', city: 'Moscow', tags: ['tor', 'proxy'] }, risk_level: 'high', flagged: true, created_at: iso(11, 9) },
  { id: 'ent-04', case_id: NIGHTSHADE_ID, type: 'domain', value: 'darkforum.onion', label: 'Dark Web Forum', metadata: { registrar: 'N/A', tor: true }, risk_level: 'critical', flagged: true, created_at: iso(11, 9) },
  { id: 'ent-05', case_id: NIGHTSHADE_ID, type: 'username', value: 'nightshade_op', label: 'Forum Alias', metadata: { platforms: ['darkforum', 'reddit', 'twitter'] }, risk_level: 'high', flagged: false, created_at: iso(10, 14) },
  { id: 'ent-06', case_id: NIGHTSHADE_ID, type: 'phone', value: '+1-555-018-2247', label: 'Burner VoIP', metadata: { carrier: 'Bandwidth.com', type: 'VoIP' }, risk_level: 'medium', flagged: false, created_at: iso(10, 14) },
  { id: 'ent-07', case_id: NIGHTSHADE_ID, type: 'web_page', value: 'https://linkedin-secure.com/login', label: 'Phishing Portal', metadata: { domain: 'linkedin-secure.com', similarity: 0.94, threat_status: 'phishing', virustotal: 7, ip_risk: 85, domain_reputation: 'Poor' }, risk_level: 'critical', flagged: true, created_at: iso(9, 11) },
  { id: 'ent-08', case_id: NIGHTSHADE_ID, type: 'web_page', value: 'https://telegra.ph/Nightshade-Report-09-12', label: 'Nightshade Report', metadata: { domain: 'telegra.ph', threat_status: 'clean', virustotal: 0, ip_risk: 12, domain_reputation: 'Good' }, risk_level: 'high', flagged: false, created_at: iso(9, 12) },
  { id: 'ent-09', case_id: NIGHTSHADE_ID, type: 'web_page', value: 'https://imgur.com/a/x7K2mN', label: 'Surveillance Stills', metadata: { domain: 'imgur.com', threat_status: 'clean', virustotal: 0, ip_risk: 8, domain_reputation: 'Good' }, risk_level: 'medium', flagged: false, created_at: iso(8, 15) },
  { id: 'ent-10', case_id: NIGHTSHADE_ID, type: 'web_page', value: 'https://reddit.com/r/OSINT/comments/8x2k1f', label: 'OSINT Help Request', metadata: { domain: 'reddit.com', threat_status: 'clean', virustotal: 0, ip_risk: 5, domain_reputation: 'Good' }, risk_level: 'low', flagged: false, created_at: iso(7, 16) },
  { id: 'ent-11', case_id: NIGHTSHADE_ID, type: 'web_page', value: 'https://twitter.com/anon_user/status/1829374', label: 'Anonymous Post', metadata: { domain: 'twitter.com', threat_status: 'suspicious', virustotal: 1, ip_risk: 25, domain_reputation: 'Fair' }, risk_level: 'medium', flagged: false, created_at: iso(6, 18) },
  { id: 'ent-12', case_id: NIGHTSHADE_ID, type: 'image_hash', value: 'a3f5e8d2b71c49f08a9e2c1d4b6e3f8a7d2c5e1b9f04a3d6c8e2b7f5d1a4e3c', label: 'surveillance_still_01.jpg', metadata: { file_size: 2458624, md5: 'd41d8cd98f00b204e9800998ecf8427e' }, risk_level: 'medium', flagged: false, created_at: iso(8, 10) },
  { id: 'ent-13', case_id: NIGHTSHADE_ID, type: 'url', value: 'https://paste-bin.ru/view/raw/8821aa', label: 'Credential Paste', metadata: { domain: 'paste-bin.ru', threat_status: 'malware', virustotal: 12, ip_risk: 72, domain_reputation: 'Poor' }, risk_level: 'high', flagged: true, created_at: iso(9, 13) },
];

// ===== RELATIONSHIPS (10) =====
export const mockRelationships: RelationshipRow[] = [
  { id: 'rel-01', case_id: NIGHTSHADE_ID, source_entity_id: 'ent-01', target_entity_id: 'ent-02', relation_type: 'USES_EMAIL', metadata: {}, created_at: iso(12, 8) },
  { id: 'rel-02', case_id: NIGHTSHADE_ID, source_entity_id: 'ent-05', target_entity_id: 'ent-01', relation_type: 'OWNED_BY', metadata: {}, created_at: iso(10, 14) },
  { id: 'rel-03', case_id: NIGHTSHADE_ID, source_entity_id: 'ent-04', target_entity_id: 'ent-03', relation_type: 'RESOLVES_TO', metadata: {}, created_at: iso(11, 9) },
  { id: 'rel-04', case_id: NIGHTSHADE_ID, source_entity_id: 'ent-02', target_entity_id: 'ent-04', relation_type: 'REGISTERED_TO', metadata: {}, created_at: iso(11, 10) },
  { id: 'rel-05', case_id: NIGHTSHADE_ID, source_entity_id: 'ent-05', target_entity_id: 'ent-11', relation_type: 'LINKED_TO', metadata: {}, created_at: iso(6, 18) },
  { id: 'rel-06', case_id: NIGHTSHADE_ID, source_entity_id: 'ent-12', target_entity_id: 'ent-09', relation_type: 'FOUND_ON_WEBSITE', metadata: {}, created_at: iso(8, 15) },
  { id: 'rel-07', case_id: NIGHTSHADE_ID, source_entity_id: 'ent-12', target_entity_id: 'ent-07', relation_type: 'FOUND_ON_WEBSITE', metadata: {}, created_at: iso(9, 11) },
  { id: 'rel-08', case_id: NIGHTSHADE_ID, source_entity_id: 'ent-01', target_entity_id: 'ent-06', relation_type: 'CONNECTED_TO', metadata: {}, created_at: iso(10, 14) },
  { id: 'rel-09', case_id: NIGHTSHADE_ID, source_entity_id: 'ent-04', target_entity_id: 'ent-13', relation_type: 'APPEARS_IN', metadata: {}, created_at: iso(9, 13) },
  { id: 'rel-10', case_id: NIGHTSHADE_ID, source_entity_id: 'ent-05', target_entity_id: 'ent-10', relation_type: 'LINKED_TO', metadata: {}, created_at: iso(7, 16) },
];

// ===== EVIDENCE FILES (3) =====
export const mockEvidence: EvidenceRow[] = [
  {
    id: 'evi-01', case_id: NIGHTSHADE_ID,
    file_name: 'WhatsApp Image 2026-09-22 at 16.51.37.jpeg', file_type: 'image/jpeg', file_size: 2458624,
    sha256: 'a3f5e8d2b71c49f08a9e2c1d4b6e3f8a7d2c5e1b9f04a3d6c8e2b7f5d1a4e3c',
    md5: 'd41d8cd98f00b204e9800998ecf8427e',
    exif_data: { Make: 'Canon', Model: 'EOS 5D Mark IV', ISO: 800, Software: 'Adobe Lightroom', DateTime: '2026-09-12T14:32:08Z', FocalLength: '50mm', ExposureTime: '1/125', FNumber: 'f/2.8', LensModel: 'Canon EF 50mm f/1.8' },
    gps_lat: 55.7558, gps_lng: 37.6173,
    ocr_text: 'ACCESS GRANTED - SECTOR 7\nAuthorization Code: 8821-AX\nTimestamp: 2026-09-12 14:32:08 UTC\nOperator: M. VANCE',
    notes: 'Primary surveillance still from dark web forum post',
    created_at: iso(8, 10),
  },
  {
    id: 'evi-02', case_id: NIGHTSHADE_ID,
    file_name: 'BBQ-Chicken-Pizza.png', file_type: 'image/png', file_size: 892456,
    sha256: 'b7c2e9f4a1d3865e0b2a7c9f4d1e8b3a6c5f2d9e0b7a4c1f8d3e6b9a2c5f7d0e',
    md5: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6',
    exif_data: { Make: 'Apple', Model: 'iPhone 15 Pro', ISO: 200, Software: 'iOS 18.0', DateTime: '2026-09-11T09:15:00Z', FocalLength: '24mm', ExposureTime: '1/60', FNumber: 'f/1.78', LensModel: 'Apple iPhone 15 Pro Main' },
    gps_lat: 40.7128, gps_lng: -74.006,
    ocr_text: 'Credentials Dump\nUser: admin\nPass: 8821-AX-SECTOR7\nSource: darkforum.onion/thread/47192',
    notes: 'Screenshot of leaked credentials from paste site',
    created_at: iso(9, 9),
  },
  {
    id: 'evi-03', case_id: NIGHTSHADE_ID,
    file_name: 'profile_avatar.png', file_type: 'image/png', file_size: 1534872,
    sha256: 'c8d3f0a5b2e7c4d1a8f6b3e0c7d4a1f8b5e2c9d0a7f4b1e8c3d6a9f2b5e7c1d4',
    md5: 'e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0',
    exif_data: { Make: 'Samsung', Model: 'Galaxy S24', ISO: 400, Software: 'One UI 6.1', DateTime: '2026-09-09T11:20:00Z', FocalLength: '23mm', ExposureTime: '1/100', FNumber: 'f/1.8', LensModel: 'Samsung Galaxy S24 Wide' },
    gps_lat: 52.52, gps_lng: 13.405,
    ocr_text: 'LinkedIn Secure Login\nPlease enter your credentials\nURL: linkedin-secure.com/login',
    notes: 'Phishing portal mimicking LinkedIn login page',
    created_at: iso(11, 11),
  },
];

// Placeholder data URLs for sample images (small SVG-based data URLs)
export const mockEvidenceThumbnails: Record<string, string> = {
  'evi-01': 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect fill="#1e293b" width="400" height="300"/><text x="200" y="150" fill="#22d3ee" font-size="16" text-anchor="middle" font-family="monospace">Surveillance Still 01</text></svg>`),
  'evi-02': 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect fill="#1e293b" width="400" height="300"/><text x="200" y="150" fill="#10b981" font-size="16" text-anchor="middle" font-family="monospace">BBQ Chicken Pizza</text></svg>`),
  'evi-03': 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect fill="#1e293b" width="400" height="300"/><text x="200" y="150" fill="#f59e0b" font-size="16" text-anchor="middle" font-family="monospace">Profile Avatar</text></svg>`),
};

// ===== LENS MATCHES (6) =====
export const mockLensMatches: LensMatchRow[] = [
  { id: 'lens-01', evidence_id: 'evi-01', case_id: NIGHTSHADE_ID, target_url: 'https://darkforum.onion/thread/47192', domain: 'darkforum.onion', page_title: 'Leaked corporate credentials dump - Sector 7', thumbnail_url: '', first_indexed: '2026-09-10', similarity_score: 0.94, created_at: iso(7, 14) },
  { id: 'lens-02', evidence_id: 'evi-01', case_id: NIGHTSHADE_ID, target_url: 'https://paste-bin.ru/view/raw/8821aa', domain: 'paste-bin.ru', page_title: 'Raw paste: ACCESS GRANTED screenshots', thumbnail_url: '', first_indexed: '2026-09-11', similarity_score: 0.89, created_at: iso(7, 14) },
  { id: 'lens-03', evidence_id: 'evi-01', case_id: NIGHTSHADE_ID, target_url: 'https://telegra.ph/Nightshade-Report-09-12', domain: 'telegra.ph', page_title: 'Nightshade Investigation Report', thumbnail_url: '', first_indexed: '2026-09-12', similarity_score: 0.82, created_at: iso(7, 14) },
  { id: 'lens-04', evidence_id: 'evi-02', case_id: NIGHTSHADE_ID, target_url: 'https://imgur.com/a/x7K2mN', domain: 'imgur.com', page_title: 'Anonymous gallery: surveillance stills', thumbnail_url: '', first_indexed: '2026-09-13', similarity_score: 0.76, created_at: iso(6, 15) },
  { id: 'lens-05', evidence_id: 'evi-02', case_id: NIGHTSHADE_ID, target_url: 'https://reddit.com/r/OSINT/comments/8x2k1f', domain: 'reddit.com', page_title: 'r/OSINT - Need help identifying location', thumbnail_url: '', first_indexed: '2026-09-14', similarity_score: 0.71, created_at: iso(6, 15) },
  { id: 'lens-06', evidence_id: 'evi-03', case_id: NIGHTSHADE_ID, target_url: 'https://twitter.com/anon_user/status/1829374', domain: 'twitter.com', page_title: 'Anonymous post with matching image', thumbnail_url: '', first_indexed: '2026-09-15', similarity_score: 0.68, created_at: iso(5, 16) },
];

// ===== WEB CAPTURES (3) =====
export const mockCaptures: WebCaptureRow[] = [
  { id: 'cap-01', case_id: NIGHTSHADE_ID, url: 'https://linkedin-secure.com/login', page_title: 'LinkedIn Secure Login', capture_format: 'WARC', sha256: 'd1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2', file_size: 45872, operator_id: 'INVESTIGATOR-001', created_at: iso(9, 11) },
  { id: 'cap-02', case_id: NIGHTSHADE_ID, url: 'https://darkforum.onion/thread/47192', page_title: 'Leaked corporate credentials dump - Sector 7', capture_format: 'WARC', sha256: 'e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3', file_size: 92341, operator_id: 'INVESTIGATOR-001', created_at: iso(8, 13) },
  { id: 'cap-03', case_id: NIGHTSHADE_ID, url: 'https://telegra.ph/Nightshade-Report-09-12', page_title: 'Nightshade Investigation Report', capture_format: 'WARC', sha256: 'f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4', file_size: 28904, operator_id: 'INVESTIGATOR-001', created_at: iso(7, 15) },
];

// ===== AUDIT LOGS (15) =====
export const mockAuditLogs: AuditLogRow[] = [
  { id: 'aud-01', case_id: NIGHTSHADE_ID, action: 'CASE_CREATED', entity_type: 'case', entity_id: 'CASE-2026-0042', description: 'Case "Operation Nightshade" opened', operator_id: 'INVESTIGATOR-001', hash_signature: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2', created_at: iso(12, 8) },
  { id: 'aud-02', case_id: NIGHTSHADE_ID, action: 'ENTITY_ADDED', entity_type: 'person', entity_id: 'ent-01', description: 'Entity "M. Vance" added via username multi-source aggregation', operator_id: 'INVESTIGATOR-001', hash_signature: 'b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2a3', created_at: iso(12, 8) },
  { id: 'aud-03', case_id: NIGHTSHADE_ID, action: 'ENTITY_ADDED', entity_type: 'email', entity_id: 'ent-02', description: 'Entity "m.vance@protonmail.ch" added via email multi-source aggregation', operator_id: 'INVESTIGATOR-001', hash_signature: 'c3d4e5f6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2a3b4', created_at: iso(12, 9) },
  { id: 'aud-04', case_id: NIGHTSHADE_ID, action: 'ENTITY_ADDED', entity_type: 'ip', entity_id: 'ent-03', description: 'Entity "185.220.101.47" added via ip multi-source aggregation', operator_id: 'INVESTIGATOR-001', hash_signature: 'd4e5f6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2a3b4c5', created_at: iso(11, 9) },
  { id: 'aud-05', case_id: NIGHTSHADE_ID, action: 'ENTITY_ADDED', entity_type: 'domain', entity_id: 'ent-04', description: 'Entity "darkforum.onion" added via domain multi-source aggregation', operator_id: 'INVESTIGATOR-001', hash_signature: 'e5f6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2a3b4c5d6', created_at: iso(11, 9) },
  { id: 'aud-06', case_id: NIGHTSHADE_ID, action: 'EVIDENCE_UPLOADED', entity_type: 'evidence', entity_id: 'evi-03', description: 'Image "profile_avatar.png" uploaded with SHA-256 hash verified', operator_id: 'INVESTIGATOR-001', hash_signature: 'f6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2a3b4c5d6a7', created_at: iso(11, 11) },
  { id: 'aud-07', case_id: NIGHTSHADE_ID, action: 'WEB_CAPTURED', entity_type: 'web_capture', entity_id: 'cap-01', description: 'Web capture of https://linkedin-secure.com/login (WARC format, SHA-256 verified)', operator_id: 'INVESTIGATOR-001', hash_signature: 'a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2a3b4c5d6a7b8', created_at: iso(9, 11) },
  { id: 'aud-08', case_id: NIGHTSHADE_ID, action: 'ENTITY_ADDED', entity_type: 'web_page', entity_id: 'ent-07', description: 'Result "Phishing Portal" added to case graph from Google CSE', operator_id: 'INVESTIGATOR-001', hash_signature: 'b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2a3b4c5d6a7b8c9', created_at: iso(9, 11) },
  { id: 'aud-09', case_id: NIGHTSHADE_ID, action: 'EVIDENCE_UPLOADED', entity_type: 'evidence', entity_id: 'evi-02', description: 'Image "BBQ-Chicken-Pizza.png" uploaded with SHA-256 hash verified', operator_id: 'INVESTIGATOR-001', hash_signature: 'c9d0e1f2a3b4c5d6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2a3b4c5d6a7b8c9d0', created_at: iso(9, 9) },
  { id: 'aud-10', case_id: NIGHTSHADE_ID, action: 'WEB_CAPTURED', entity_type: 'web_capture', entity_id: 'cap-02', description: 'Web capture of https://darkforum.onion/thread/47192 (WARC format, SHA-256 verified)', operator_id: 'INVESTIGATOR-001', hash_signature: 'd0e1f2a3b4c5d6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1', created_at: iso(8, 13) },
  { id: 'aud-11', case_id: NIGHTSHADE_ID, action: 'EVIDENCE_UPLOADED', entity_type: 'evidence', entity_id: 'evi-01', description: 'Image "WhatsApp Image 2026-09-22 at 16.51.37.jpeg" uploaded with SHA-256 hash verified', operator_id: 'INVESTIGATOR-001', hash_signature: 'e1f2a3b4c5d6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2', created_at: iso(8, 10) },
  { id: 'aud-12', case_id: NIGHTSHADE_ID, action: 'LENS_SEARCH', entity_type: 'evidence', entity_id: 'evi-01', description: 'Google Lens reverse search executed: 6 matches found', operator_id: 'INVESTIGATOR-001', hash_signature: 'f2a3b4c5d6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2a3', created_at: iso(7, 14) },
  { id: 'aud-13', case_id: NIGHTSHADE_ID, action: 'WEB_CAPTURED', entity_type: 'web_capture', entity_id: 'cap-03', description: 'Web capture of https://telegra.ph/Nightshade-Report-09-12 (WARC format, SHA-256 verified)', operator_id: 'INVESTIGATOR-001', hash_signature: 'a3b4c5d6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2a3b4', created_at: iso(7, 15) },
  { id: 'aud-14', case_id: NIGHTSHADE_ID, action: 'ENTITY_FLAGGED', entity_type: 'web_page', entity_id: 'ent-07', description: 'Entity "https://linkedin-secure.com/login" flagged', operator_id: 'INVESTIGATOR-001', hash_signature: 'b4c5d6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2a3b4c5', created_at: iso(5, 10) },
  { id: 'aud-15', case_id: NIGHTSHADE_ID, action: 'CASE_UPDATED', entity_type: 'case', entity_id: 'CASE-2026-0042', description: 'Case "Operation Nightshade" details updated — risk score elevated to 78', operator_id: 'INVESTIGATOR-001', hash_signature: 'c5d6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2a3b4c5d6', created_at: iso(2, 14) },
];

// ===== PUBLIC OSINT HUB DATA =====
export const mockPublicMapPoints = [
  { id: 'pt-01', lat: 55.7558, lng: 37.6173, label: '185.220.101.47', type: 'Tor Exit Node', country: 'Russia', city: 'Moscow', isp: 'Thor Network LLC', risk: 'high' },
  { id: 'pt-02', lat: 40.7128, lng: -74.006, label: '104.21.45.92', type: 'Phishing C2', country: 'USA', city: 'New York', isp: 'Cloudflare', risk: 'critical' },
  { id: 'pt-03', lat: 52.52, lng: 13.405, label: '185.220.101.47', type: 'VPN Proxy', country: 'Germany', city: 'Berlin', isp: 'M247 Europe', risk: 'medium' },
  { id: 'pt-04', lat: 35.6762, lng: 139.6503, label: '203.104.128.55', type: 'Credential Dump Server', country: 'Japan', city: 'Tokyo', isp: 'Amazon AWS', risk: 'high' },
  { id: 'pt-05', lat: -33.8688, lng: 151.2093, label: '13.55.20.10', type: 'Botnet C2', country: 'Australia', city: 'Sydney', isp: 'Azure Australia East', risk: 'critical' },
  { id: 'pt-06', lat: 51.5074, lng: -0.1278, label: '31.220.21.7', type: 'Dark Web Mirror', country: 'UK', city: 'London', isp: 'OVH Hosting', risk: 'high' },
  { id: 'pt-07', lat: 1.3521, lng: 103.8198, label: '165.22.42.88', type: 'Command Server', country: 'Singapore', city: 'Singapore', isp: 'DigitalOcean', risk: 'medium' },
  { id: 'pt-08', lat: 25.2048, lng: 55.2708, label: '188.42.10.9', type: 'Money Mule Relay', country: 'UAE', city: 'Dubai', isp: 'LeaseWeb', risk: 'high' },
];

export const mockPublicSearchResults: Record<string, { source: string; result: string; risk: 'low' | 'medium' | 'high' | 'critical' }[]> = {
  whois: [
    { source: 'WHOIS Registry', result: 'Registrar: NameCheap, Inc. | Registered: 2026-08-14 | Expires: 2027-08-14 | Registrant: PrivacyGuard LLC (PA) | Status: clientTransferProhibited', risk: 'medium' },
    { source: 'WHOIS Historical', result: '2 historical records found. First registration: 2026-08-14. No previous owners. Domain privacy enabled since creation.', risk: 'low' },
  ],
  dns: [
    { source: 'DNS A Record', result: 'darkforum.onion -> 185.220.101.47 (TTL: 3600) | Hosted on Tor network. No standard DNS resolution.', risk: 'high' },
    { source: 'DNS MX Record', result: 'mail.darkforum.onion -> 185.220.101.48 (TTL: 1800) | Mail server co-located with primary host.', risk: 'medium' },
    { source: 'DNS NS Records', result: 'ns1.thor-network.ru, ns2.thor-network.ru | Nameservers trace to Russian hosting provider.', risk: 'high' },
  ],
  social: [
    { source: 'Twitter/X', result: '@nightshade_op — 1,247 followers, 892 following. Account created: 2024-03-15. Last activity: 2026-09-15. Bio: "Digital shadows operator."', risk: 'medium' },
    { source: 'Reddit', result: 'u/nightshade_op — 4.8K karma, 3-year account. Active in r/netsec, r/privacy, r/OSINT. 23 posts, 156 comments.', risk: 'low' },
    { source: 'Telegram', result: '@nightshade_op — 234 subscribers. Posts in Russian and English. Channel created: 2025-01-10. Content: security tutorials and leak notifications.', risk: 'medium' },
    { source: 'GitHub', result: 'github.com/nightshade_op — 23 public repos. Reconnaissance scripts, OSINT tools, network scanners. Last commit: 2026-09-10.', risk: 'low' },
  ],
  threat: [
    { source: 'VirusTotal', result: 'IP 185.220.101.47: 7/89 security vendors flagged as malicious. Tags: tor, proxy, botnet-c2. Last analysis: 2026-09-20.', risk: 'high' },
    { source: 'AbuseIPDB', result: 'IP 185.220.101.47: 142 abuse reports. Confidence: 95%. Usage type: Data Center/Web Hosting/VPN. Country: Russia.', risk: 'critical' },
    { source: 'AlienVault OTX', result: '2 active pulse indicators linked to this IP. Associated with APT group "Nightshade". Last seen: 2026-09-19.', risk: 'high' },
    { source: 'Shodan', result: 'Ports: 22(SSH), 80(HTTP/nginx), 443(HTTPS), 8080(Squid Proxy). OS: Ubuntu 22.04. Location: Moscow, RU. Tags: tor-exit, vpn.', risk: 'medium' },
  ],
};

// ===== UNIVERSAL OSINT SEARCH ENGINE =====

export type QueryType = 'person' | 'email' | 'phone' | 'username' | 'ip' | 'domain' | 'company' | 'keyword';

export type SocialProfile = {
  platform: string;
  handle: string;
  url: string;
  status: 'active' | 'inactive' | 'not_found';
  followers?: number;
  lastSeen?: string;
};

export type BreachRecord = {
  source: string;
  date: string;
  exposedFields: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  passwordHash?: string;
  pasteRef?: string;
};

export type OsintLocation = {
  label: string;
  lat: number;
  lng: number;
  city: string;
  country: string;
  source: string;
  type: string;
  risk: 'low' | 'medium' | 'high' | 'critical';
};

export type CorporateLink = {
  entity: string;
  role: string;
  domain?: string;
  relationship: string;
  registeredDate?: string;
};

export type OsintSearchResult = {
  queryType: QueryType;
  queryValue: string;
  summary: string;
  personCard: {
    aliases: string[];
    emails: string[];
    phones: string[];
    socialProfiles: SocialProfile[];
    bio: string;
    riskLevel: RiskLevel;
  };
  breachIntel: BreachRecord[];
  locations: OsintLocation[];
  corporateLinks: CorporateLink[];
  threatIntel: { source: string; verdict: string; score: number; risk: 'low' | 'medium' | 'high' | 'critical' }[];
};

export function detectQueryType(input: string): QueryType {
  const v = input.trim();
  if (/^\S+@\S+\.\S+$/.test(v)) return 'email';
  if (/^\+?[\d\s\-()]{7,}$/.test(v)) return 'phone';
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(v)) return 'ip';
  if (/^[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}(\/\S*)?$/.test(v) && !v.includes(' ')) return 'domain';
  if (/^@?[a-zA-Z0-9_]{2,30}$/.test(v) && !v.includes(' ') && v.length <= 30) return 'username';
  if (/\b(inc|llc|corp|ltd|gmbh|sarl|company|corporation|organization)\b/i.test(v)) return 'company';
  if (/\b[A-Z][a-z]+\s[A-Z][a-z]+\b/.test(v) || /\b[A-Z][a-z]+\s[A-Z][a-z]+\s[A-Z]?[a-z]*\b/.test(v)) return 'person';
  return 'keyword';
}

const queryTypeLabels: Record<QueryType, string> = {
  person: 'PERSON SEARCH',
  email: 'IDENTITY LOOKUP',
  phone: 'IDENTITY LOOKUP',
  username: 'IDENTITY LOOKUP',
  ip: 'INFRASTRUCTURE',
  domain: 'INFRASTRUCTURE',
  company: 'CORPORATE',
  keyword: 'GENERAL SEARCH',
};

export function getQueryTypeLabel(type: QueryType): string {
  return queryTypeLabels[type];
}

const socialPlatforms = ['LinkedIn', 'GitHub', 'Twitter/X', 'Telegram', 'Reddit', 'Instagram', 'Facebook', 'TikTok', 'YouTube', 'Discord', 'Mastodon', 'Keybase', 'HackTheBox', 'TryHackMe', 'Patreon'];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
  return Math.abs(h);
}

function pick<T>(arr: T[], seed: number): T { return arr[seed % arr.length]; }

function generateSocialProfiles(query: string, seed: number): SocialProfile[] {
  const handle = query.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 20) || 'unknown';
  const platforms = socialPlatforms.slice(0, 10 + (seed % 5));
  return platforms.map((p, i) => {
    const s = seed + i * 7;
    const statuses: SocialProfile['status'][] = ['active', 'active', 'active', 'inactive', 'not_found'];
    const status = pick(statuses, s);
    const handleMap: Record<string, string> = {
      'Twitter/X': `@${handle}`,
      'Telegram': `@${handle}`,
      'Reddit': `u/${handle}`,
      'GitHub': handle,
      'LinkedIn': handle.replace('_', '-'),
      'Instagram': `@${handle}`,
      'Facebook': handle.replace('_', '.'),
      'TikTok': `@${handle}`,
      'YouTube': `@${handle}`,
      'Discord': handle,
      'Mastodon': `@${handle}@mastodon.social`,
      'Keybase': handle,
      'HackTheBox': handle,
      'TryHackMe': handle,
      'Patreon': handle,
    };
    const urlMap: Record<string, string> = {
      'Twitter/X': `https://x.com/${handle}`,
      'Telegram': `https://t.me/${handle}`,
      'Reddit': `https://reddit.com/u/${handle}`,
      'GitHub': `https://github.com/${handle}`,
      'LinkedIn': `https://linkedin.com/in/${handle.replace('_', '-')}`,
      'Instagram': `https://instagram.com/${handle}`,
      'Facebook': `https://facebook.com/${handle.replace('_', '.')}`,
      'TikTok': `https://tiktok.com/@${handle}`,
      'YouTube': `https://youtube.com/@${handle}`,
      'Discord': `https://discord.gg/${handle}`,
      'Mastodon': `https://mastodon.social/@${handle}`,
      'Keybase': `https://keybase.io/${handle}`,
      'HackTheBox': `https://hackthebox.com/profile/${handle}`,
      'TryHackMe': `https://tryhackme.com/p/${handle}`,
      'Patreon': `https://patreon.com/${handle}`,
    };
    return {
      platform: p,
      handle: handleMap[p] || handle,
      url: urlMap[p] || `https://${p.toLowerCase().replace(/[^a-z]/g, '')}.com/${handle}`,
      status,
      followers: status === 'active' ? (s % 50000) + 100 : undefined,
      lastSeen: status === 'active' ? `2026-09-${String((s % 20) + 1).padStart(2, '0')}` : undefined,
    };
  });
}

const breachSources = ['Collection #1', 'AntiPublic Combo List', 'Exploit.in', 'Cit0day', 'BreachForums Archive', 'LeakCheck', 'DeHashed', 'HaveIBeenPwned', 'Pastebin Dumps', 'Ghostbin Leaks'];
const breachFields = ['email', 'password', 'username', 'ip_address', 'phone', 'full_name', 'address', 'dob', 'hash'];
const pasteSites = ['pastebin.com/raw/', 'ghostbin.com/paste/', 'darkforum.onion/thread/', 'raidforums.com/leak/', 'paste-bin.ru/view/'];

function generateBreaches(query: string, seed: number): BreachRecord[] {
  const count = (seed % 4) + 2;
  const results: BreachRecord[] = [];
  for (let i = 0; i < count; i++) {
    const s = seed + i * 13;
    const severities: BreachRecord['severity'][] = ['low', 'medium', 'high', 'critical'];
    const severity = pick(severities, s);
    const fieldCount = (s % 4) + 2;
    const fields: string[] = [];
    for (let j = 0; j < fieldCount; j++) fields.push(pick(breachFields, s + j * 5));
    results.push({
      source: pick(breachSources, s),
      date: `202${(s % 6) + 0}-${String((s % 12) + 1).padStart(2, '0')}-${String((s % 28) + 1).padStart(2, '0')}`,
      exposedFields: [...new Set(fields)],
      severity,
      passwordHash: fields.includes('password') ? `sha1:${hashStr(query + s).toString(16).padStart(8, '0')}` : undefined,
      pasteRef: severity === 'high' || severity === 'critical' ? pick(pasteSites, s) + hashStr(query).toString(36) : undefined,
    });
  }
  return results;
}

const cityData = [
  { city: 'Moscow', country: 'Russia', lat: 55.7558, lng: 37.6173 },
  { city: 'New York', country: 'USA', lat: 40.7128, lng: -74.006 },
  { city: 'Berlin', country: 'Germany', lat: 52.52, lng: 13.405 },
  { city: 'London', country: 'UK', lat: 51.5074, lng: -0.1278 },
  { city: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503 },
  { city: 'Sydney', country: 'Australia', lat: -33.8688, lng: 151.2093 },
  { city: 'Singapore', country: 'Singapore', lat: 1.3521, lng: 103.8198 },
  { city: 'Dubai', country: 'UAE', lat: 25.2048, lng: 55.2708 },
  { city: 'Amsterdam', country: 'Netherlands', lat: 52.3676, lng: 4.9041 },
  { city: 'São Paulo', country: 'Brazil', lat: -23.5558, lng: -46.6396 },
];

const locationTypes = ['IP Geolocation', 'Registered Address', 'VPN Exit Node', 'Server Hosting', 'Social Check-in', 'Phone Area Code', 'Domain DNS Resolution', 'Corporate Filing'];
const locationSources = ['IP GeoIP DB', 'WHOIS Record', 'Social Profile', 'DNS Lookup', 'Public Registry', 'Phone Carrier DB'];

function generateLocations(query: string, queryType: QueryType, seed: number): OsintLocation[] {
  const count = queryType === 'ip' || queryType === 'domain' ? 3 : (seed % 3) + 2;
  const results: OsintLocation[] = [];
  for (let i = 0; i < count; i++) {
    const s = seed + i * 17;
    const cd = pick(cityData, s);
    const risks: OsintLocation['risk'][] = ['low', 'medium', 'high', 'critical'];
    results.push({
      label: query,
      lat: cd.lat + (s % 100) / 1000,
      lng: cd.lng + (s % 100) / 1000,
      city: cd.city,
      country: cd.country,
      source: pick(locationSources, s),
      type: pick(locationTypes, s),
      risk: pick(risks, s),
    });
  }
  return results;
}

const corporateRoles = ['CEO', 'CTO', 'Director', 'Shareholder', 'Founder', 'Board Member', 'Technical Lead', 'Advisory Board'];
const corporateRelations = ['Officer of', 'Shareholder in', 'Founder of', 'Director at', 'Linked to', 'Registered agent for'];

function generateCorporateLinks(query: string, queryType: QueryType, seed: number): CorporateLink[] {
  const count = queryType === 'company' ? (seed % 4) + 3 : (seed % 3) + 1;
  const results: CorporateLink[] = [];
  const companyNames = [
    'Thor Network LLC', 'PrivacyGuard Holdings', 'Sector7 Security', 'DarkMirror Solutions',
    'CipherTrust Inc', 'Nightshade Group', 'Quantum Shield Corp', 'Phantom Industries',
  ];
  for (let i = 0; i < count; i++) {
    const s = seed + i * 23;
    results.push({
      entity: queryType === 'company' ? query : pick(companyNames, s),
      role: pick(corporateRoles, s),
      domain: `${pick(['thor-network', 'privacyguard', 'sector7', 'darkmirror', 'ciphertrust', 'nightshade'], s)}.com`,
      relationship: pick(corporateRelations, s),
      registeredDate: `202${(s % 5) + 1}-${String((s % 12) + 1).padStart(2, '0')}-15`,
    });
  }
  return results;
}

const threatSources = ['VirusTotal', 'AbuseIPDB', 'AlienVault OTX', 'Shodan', 'GreyNoise', 'ThreatCrowd', 'URLhaus', 'PhishTank'];

function generateThreatIntel(query: string, queryType: QueryType, seed: number): OsintSearchResult['threatIntel'] {
  if (queryType !== 'ip' && queryType !== 'domain' && queryType !== 'keyword') {
    const s = seed;
    return [
      { source: 'HaveIBeenPwned', verdict: `${query} found in ${seed % 5 + 2} known data breaches`, score: (seed % 40) + 30, risk: seed % 3 === 0 ? 'high' : 'medium' },
      { source: 'Pipl People Search', verdict: `Digital footprint: ${seed % 20 + 5} associated records found`, score: (seed % 30) + 20, risk: 'low' },
    ];
  }
  const count = (seed % 4) + 3;
  const results: OsintSearchResult['threatIntel'] = [];
  for (let i = 0; i < count; i++) {
    const s = seed + i * 29;
    const risks: ('low' | 'medium' | 'high' | 'critical')[] = ['low', 'medium', 'high', 'critical'];
    results.push({
      source: pick(threatSources, s),
      verdict: `${query}: ${pick(['malicious', 'suspicious', 'clean', 'flagged by community'], s)} — ${s % 89 + 3}/${89} vendors`,
      score: s % 100,
      risk: pick(risks, s),
    });
  }
  return results;
}

function generateAliases(query: string, seed: number): string[] {
  const base = query.toLowerCase().replace(/[^a-z0-9]/g, '');
  const variants = [
    `${base}_op`, `${base}1337`, `${base}_dev`, `x${base}`, `${base}_sec`,
    `${base}.h4ck`, `dark_${base}`, `${base}_pro`, `the_${base}`, `${base}_0`,
  ];
  const count = (seed % 4) + 2;
  return variants.slice(0, count);
}

function generateEmails(query: string, queryType: QueryType, seed: number): string[] {
  const base = query.toLowerCase().replace(/[^a-z0-9.]/g, '').replace(/\s+/g, '.');
  if (queryType === 'email') return [query, `${base}_alt@protonmail.ch`];
  const domains = ['protonmail.ch', 'gmail.com', 'tutanota.com', 'yandex.ru', 'mail.ru', 'icloud.com'];
  const count = (seed % 3) + 2;
  const results: string[] = [];
  for (let i = 0; i < count; i++) results.push(`${base}@${pick(domains, seed + i * 11)}`);
  return results;
}

function generatePhones(seed: number): string[] {
  const count = (seed % 2) + 1;
  const results: string[] = [];
  for (let i = 0; i < count; i++) {
    const s = seed + i * 31;
    results.push(`+1-${String(555 + (s % 100)).padStart(3, '0')}-${String(s % 1000).padStart(3, '0')}-${String(s % 10000).padStart(4, '0')}`);
  }
  return results;
}

export function generateOsintResult(query: string): OsintSearchResult {
  const queryType = detectQueryType(query);
  const seed = hashStr(query);
  const riskLevels: RiskLevel[] = ['low', 'medium', 'high', 'critical'];
  const riskLevel = pick(riskLevels, seed % 4);

  const bios = [
    `Digital footprint analysis for "${query}" reveals activity across multiple platforms and networks.`,
    `Subject "${query}" has established presence in security communities with notable breach exposure.`,
    `Infrastructure trace for "${query}" indicates associations with proxy networks and data hosting.`,
    `"${query}" shows patterns consistent with active digital operations across 10+ platforms.`,
  ];

  return {
    queryType,
    queryValue: query,
    summary: pick(bios, seed),
    personCard: {
      aliases: queryType === 'person' || queryType === 'username' ? generateAliases(query, seed) : [],
      emails: generateEmails(query, queryType, seed),
      phones: generatePhones(seed),
      socialProfiles: generateSocialProfiles(query, seed),
      bio: pick(bios, seed),
      riskLevel,
    },
    breachIntel: generateBreaches(query, seed),
    locations: generateLocations(query, queryType, seed),
    corporateLinks: generateCorporateLinks(query, queryType, seed),
    threatIntel: generateThreatIntel(query, queryType, seed),
  };
}

// Entity import helpers — maps OSINT results to case entities
export function osintResultToEntities(result: OsintSearchResult): { type: EntityType; value: string; label: string; metadata: Record<string, unknown>; risk_level: RiskLevel; flagged: boolean }[] {
  const entities: { type: EntityType; value: string; label: string; metadata: Record<string, unknown>; risk_level: RiskLevel; flagged: boolean }[] = [];

  if (result.queryType === 'person' || result.queryType === 'username') {
    entities.push({ type: result.queryType === 'person' ? 'person' : 'username', value: result.queryValue, label: `OSINT: ${result.queryValue}`, metadata: { source: 'Public OSINT Hub', aliases: result.personCard.aliases, social_count: result.personCard.socialProfiles.length }, risk_level: result.personCard.riskLevel, flagged: result.personCard.riskLevel === 'critical' || result.personCard.riskLevel === 'high' });
  }

  result.personCard.emails.forEach((e) => entities.push({ type: 'email', value: e, label: `OSINT Email: ${e}`, metadata: { source: 'Public OSINT Hub', breach_count: result.breachIntel.length }, risk_level: result.breachIntel.length > 3 ? 'high' : 'medium', flagged: result.breachIntel.some((b) => b.severity === 'critical') }));
  result.personCard.phones.forEach((p) => entities.push({ type: 'phone', value: p, label: `OSINT Phone: ${p}`, metadata: { source: 'Public OSINT Hub' }, risk_level: 'medium', flagged: false }));
  result.corporateLinks.filter((c) => c.domain).forEach((c) => entities.push({ type: 'domain', value: c.domain!, label: `OSINT Domain: ${c.domain}`, metadata: { source: 'Public OSINT Hub', company: c.entity, role: c.role }, risk_level: 'medium', flagged: false }));

  if (result.queryType === 'ip') entities.push({ type: 'ip', value: result.queryValue, label: `OSINT IP: ${result.queryValue}`, metadata: { source: 'Public OSINT Hub', threat_score: result.threatIntel[0]?.score }, risk_level: result.threatIntel[0]?.risk === 'critical' ? 'critical' : 'high', flagged: true });
  if (result.queryType === 'domain') entities.push({ type: 'domain', value: result.queryValue, label: `OSINT Domain: ${result.queryValue}`, metadata: { source: 'Public OSINT Hub', threat_score: result.threatIntel[0]?.score }, risk_level: result.threatIntel[0]?.risk === 'critical' ? 'critical' : 'high', flagged: true });

  result.personCard.socialProfiles.filter((s) => s.status === 'active').forEach((s) => entities.push({ type: 'url', value: s.url, label: `OSINT: ${s.platform}`, metadata: { source: 'Public OSINT Hub', platform: s.platform, handle: s.handle, followers: s.followers }, risk_level: 'low', flagged: false }));

  return entities;
}

export function getMockData(caseId: string) {
  const isNightshade = caseId === NIGHTSHADE_ID;
  return {
    entities: isNightshade ? mockEntities : [],
    relationships: isNightshade ? mockRelationships : [],
    evidence: isNightshade ? mockEvidence : [],
    lensMatches: isNightshade ? mockLensMatches : [],
    captures: isNightshade ? mockCaptures : [],
    auditLogs: isNightshade ? mockAuditLogs : [],
  };
}
