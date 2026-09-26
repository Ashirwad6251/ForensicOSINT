import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Globe, Search, Loader2, Sparkles, Navigation, MapPin,
  User, Mail, Phone, AtSign, Server, Building2, Hash,
  ShieldAlert, ShieldCheck, ExternalLink, Plus, CheckCircle2,
  AlertTriangle, Database, Briefcase, Fingerprint, Eye,
  Building, Link2, TrendingUp, Activity,
} from 'lucide-react';
import L from 'leaflet';
import { useCase } from '@/components/CaseContext';
import { useToast } from '@/components/Toast';
import { supabase, type EntityType, type RiskLevel, type EntityRow } from '@/lib/supabase';
import { safeQuery, isNetworkError } from '@/lib/localCases';
import { logAudit } from '@/lib/audit';
import {
  generateOsintResult, detectQueryType, getQueryTypeLabel,
  osintResultToEntities, getMockData,
  type OsintSearchResult, type QueryType, type OsintLocation,
} from '@/lib/mockData';

const queryTypeIcons: Record<QueryType, typeof User> = {
  person: User, email: Mail, phone: Phone, username: AtSign,
  ip: Server, domain: Globe, company: Building2, keyword: Hash,
};

const queryTypeColors: Record<QueryType, string> = {
  person: '#06b6d4', email: '#10b981', phone: '#ec4899', username: '#6366f1',
  ip: '#ef4444', domain: '#f59e0b', company: '#84cc16', keyword: '#22d3ee',
};

const riskColorMap: Record<string, string> = {
  low: 'var(--success)', medium: 'var(--warning)', high: '#f97316', critical: 'var(--danger)',
};

const severityColorMap: Record<string, string> = {
  low: 'var(--success)', medium: 'var(--warning)', high: '#f97316', critical: 'var(--danger)',
};

const socialIcons: Record<string, string> = {
  'LinkedIn': 'in', 'GitHub': 'gh', 'Twitter/X': 'x', 'Telegram': 'tg', 'Reddit': 'rd',
  'Instagram': 'ig', 'Facebook': 'fb', 'TikTok': 'tt', 'YouTube': 'yt', 'Discord': 'dc',
  'Mastodon': 'ma', 'Keybase': 'kb', 'HackTheBox': 'hb', 'TryHackMe': 'th', 'Patreon': 'pa',
};

export function PublicOSINTHub() {
  const { currentCase } = useCase();
  const { showToast } = useToast();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<OsintSearchResult | null>(null);
  const [detectedType, setDetectedType] = useState<QueryType | null>(null);
  const [importedEntities, setImportedEntities] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<OsintLocation | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  // Detect query type live as user types
  useEffect(() => {
    if (!query.trim()) { setDetectedType(null); return; }
    setDetectedType(detectQueryType(query));
  }, [query]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) return;
    if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }
    const map = L.map(mapRef.current).setView([30, 10], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: 'OSM', minZoom: 2, maxZoom: 18 }).addTo(map);
    mapInstanceRef.current = map;
    return () => { map.remove(); mapInstanceRef.current = null; };
  }, []);

  // Update map markers when results change
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const points = result?.locations || [];
    points.forEach((pt) => {
      const color = riskColorMap[pt.risk] || '#22d3ee';
      const icon = L.divIcon({
        html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #0f172a;box-shadow:0 0 8px ${color};"></div>`,
        className: 'osint-marker',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      const marker = L.marker([pt.lat, pt.lng], { icon }).addTo(mapInstanceRef.current!);
      marker.bindPopup(`<b>${pt.label}</b><br>Type: ${pt.type}<br>Location: ${pt.city}, ${pt.country}<br>Source: ${pt.source}<br>Risk: ${pt.risk.toUpperCase()}`);
      marker.on('click', () => setSelectedLocation(pt));
      markersRef.current.push(marker);
    });

    if (points.length > 0 && mapInstanceRef.current) {
      const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 8 });
    }
  }, [result]);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setSearching(true);
    setResult(null);
    setImportedEntities(new Set());
    await new Promise((r) => setTimeout(r, 900));
    const res = generateOsintResult(query.trim());
    setResult(res);
    setSearching(false);
  }, [query]);

  const handleImportEntity = async (
    entityData: { type: EntityType; value: string; label: string; metadata: Record<string, unknown>; risk_level: RiskLevel; flagged: boolean },
  ) => {
    if (!currentCase) { showToast('Select a case first', 'error'); return; }
    const key = `${entityData.type}:${entityData.value}`;
    if (importedEntities.has(key)) return;
    setImporting(true);

    try {
      const { data: existing } = await supabase.from('entities').select('id').eq('case_id', currentCase.id).eq('value', entityData.value).maybeSingle();
      if (!existing) {
        const { error } = await supabase.from('entities').insert({
          case_id: currentCase.id,
          type: entityData.type,
          value: entityData.value,
          label: entityData.label,
          metadata: entityData.metadata,
          risk_level: entityData.risk_level,
          flagged: entityData.flagged,
        });
        if (error) throw error;
        await logAudit(currentCase.id, 'ENTITY_ADDED', `Entity "${entityData.value}" imported from Public OSINT Hub`, entityData.type, entityData.value);
      }
      setImportedEntities((prev) => new Set(prev).add(key));
      showToast(`"${entityData.value}" imported to ${currentCase.case_number}`, 'success');
    } catch (err) {
      if (isNetworkError(err)) {
        setImportedEntities((prev) => new Set(prev).add(key));
        showToast(`"${entityData.value}" imported to ${currentCase.case_number} (offline)`, 'success');
      } else {
        showToast(`Import failed: ${(err as Error).message}`, 'error');
      }
    } finally {
      setImporting(false);
    }
  };

  const handleImportAll = async () => {
    if (!result || !currentCase) return;
    const entities = osintResultToEntities(result);
    for (const ent of entities) {
      await handleImportEntity(ent);
    }
    showToast(`${entities.length} entities imported to ${currentCase.case_number}`, 'success');
  };

  const activeProfiles = result?.personCard.socialProfiles.filter((s) => s.status === 'active') || [];
  const inactiveProfiles = result?.personCard.socialProfiles.filter((s) => s.status === 'inactive') || [];
  const notFoundProfiles = result?.personCard.socialProfiles.filter((s) => s.status === 'not_found') || [];
  const totalBreaches = result?.breachIntel.length || 0;
  const criticalBreaches = result?.breachIntel.filter((b) => b.severity === 'critical').length || 0;
  const DetIcon = detectedType ? queryTypeIcons[detectedType] : Search;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-app">Universal Public Entity & Person Search Engine</h1>
        <p className="text-sm text-muted">Client-side OSINT intelligence: people, identities, infrastructure, and corporate entities across 100+ platforms</p>
      </div>

      {/* Universal Search Bar */}
      <div className="rounded-xl border border-app bg-panel p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search any name, email, phone, username, IP, domain, company, or keyword..."
              className="w-full pl-10 pr-4 py-3 bg-input border border-app rounded-lg text-sm font-mono text-app focus:outline-none focus:border-accent"
            />
          </div>
          {detectedType && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border whitespace-nowrap" style={{ color: queryTypeColors[detectedType], borderColor: queryTypeColors[detectedType], backgroundColor: `${queryTypeColors[detectedType]}15` }}>
              <DetIcon className="w-3.5 h-3.5" /> {getQueryTypeLabel(detectedType)}
            </span>
          )}
          <button onClick={handleSearch} disabled={searching || !query.trim()} className="px-5 py-3 rounded-lg text-sm font-semibold bg-accent text-accent-on hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
            {searching ? <><Loader2 className="w-4 h-4 animate-spin" /> Scanning</> : <><Sparkles className="w-4 h-4" /> Query</>}
          </button>
        </div>
        {/* Quick example queries */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <span className="text-[10px] text-muted uppercase">Try:</span>
          {['John Doe', 'nightshade_op', '185.220.101.47', 'darkforum.onion', 'Thor Network LLC', 'm.vance@protonmail.ch'].map((ex) => (
            <button key={ex} onClick={() => setQuery(ex)} className="px-2 py-0.5 rounded text-[10px] font-mono text-secondary border border-app hover:border-accent hover:text-accent transition-colors">{ex}</button>
          ))}
        </div>
      </div>

      {searching && (
        <div className="rounded-xl border border-accent bg-accent-soft p-6">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-accent animate-spin" />
            <span className="text-sm font-mono text-accent">Querying OSINT sources: social platforms, breach databases, threat intel, WHOIS, DNS, GeoIP...</span>
          </div>
        </div>
      )}

      {result && !searching && (
        <div className="space-y-4 animate-fade-in">
          {/* Summary Header with Import All */}
          <div className="flex items-center justify-between rounded-xl border border-app bg-panel p-4">
            <div className="flex items-center gap-3">
              <Fingerprint className="w-6 h-6 text-accent" />
              <div>
                <div className="text-sm font-bold text-app">Intelligence Report: {result.queryValue}</div>
                <div className="text-xs text-muted">{activeProfiles.length} active social profiles | {totalBreaches} breach records | {result.locations.length} geo-locations | {result.corporateLinks.length} corporate links</div>
              </div>
            </div>
            <button onClick={handleImportAll} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-accent text-accent-on hover:opacity-90">
              <Plus className="w-4 h-4" /> Import All to Case
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left Column: Person Card + Breach Intel */}
            <div className="lg:col-span-4 space-y-4">
              {/* Person & Identity Card */}
              <div className="rounded-xl border border-app bg-panel overflow-hidden">
                <div className="px-4 py-2.5 border-b border-app flex items-center gap-2">
                  <User className="w-4 h-4 text-accent" />
                  <h3 className="text-xs font-semibold text-secondary">Person & Identity</h3>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold ml-auto" style={{ color: riskColorMap[result.personCard.riskLevel], backgroundColor: `${riskColorMap[result.personCard.riskLevel]}15` }}>{result.personCard.riskLevel.toUpperCase()}</span>
                </div>
                <div className="p-4 space-y-3">
                  <p className="text-xs text-secondary leading-relaxed">{result.personCard.bio}</p>

                  {result.personCard.aliases.length > 0 && (
                    <div>
                      <div className="text-[10px] uppercase text-muted mb-1 flex items-center gap-1"><AtSign className="w-3 h-3" /> Known Aliases</div>
                      <div className="flex flex-wrap gap-1.5">
                        {result.personCard.aliases.map((a) => (
                          <span key={a} className="px-2 py-0.5 rounded text-[10px] font-mono bg-input text-secondary border border-app">{a}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="text-[10px] uppercase text-muted mb-1 flex items-center gap-1"><Mail className="w-3 h-3" /> Associated Emails</div>
                    <div className="space-y-1">
                      {result.personCard.emails.map((e) => {
                        const key = `email:${e}`;
                        return (
                          <div key={e} className="flex items-center gap-2">
                            <span className="text-xs font-mono text-accent truncate flex-1">{e}</span>
                            <button onClick={() => handleImportEntity({ type: 'email', value: e, label: `OSINT Email: ${e}`, metadata: { source: 'Public OSINT Hub' }, risk_level: 'medium', flagged: false })} disabled={importedEntities.has(key) || importing} className={`p-1 rounded ${importedEntities.has(key) ? 'text-success' : 'text-muted hover:text-accent'}`}>
                              {importedEntities.has(key) ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] uppercase text-muted mb-1 flex items-center gap-1"><Phone className="w-3 h-3" /> Linked Phone Numbers</div>
                    <div className="space-y-1">
                      {result.personCard.phones.map((p) => {
                        const key = `phone:${p}`;
                        return (
                          <div key={p} className="flex items-center gap-2">
                            <span className="text-xs font-mono text-secondary flex-1">{p}</span>
                            <button onClick={() => handleImportEntity({ type: 'phone', value: p, label: `OSINT Phone: ${p}`, metadata: { source: 'Public OSINT Hub' }, risk_level: 'medium', flagged: false })} disabled={importedEntities.has(key) || importing} className={`p-1 rounded ${importedEntities.has(key) ? 'text-success' : 'text-muted hover:text-accent'}`}>
                              {importedEntities.has(key) ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Breach & Darkweb Intelligence */}
              <div className="rounded-xl border border-app bg-panel overflow-hidden">
                <div className="px-4 py-2.5 border-b border-app flex items-center gap-2">
                  <Database className="w-4 h-4 text-danger" />
                  <h3 className="text-xs font-semibold text-secondary">Breach & Darkweb Intel</h3>
                  {criticalBreaches > 0 && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-danger-soft text-danger border border-danger">{criticalBreaches} CRITICAL</span>}
                </div>
                <div className="divide-y divide-app/50 max-h-80 overflow-y-auto scrollbar-thin">
                  {result.breachIntel.map((b, i) => (
                    <div key={i} className="px-4 py-3 hover:bg-hover">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-app">{b.source}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold ml-auto" style={{ color: severityColorMap[b.severity], backgroundColor: `${severityColorMap[b.severity]}15` }}>{b.severity.toUpperCase()}</span>
                      </div>
                      <div className="text-[10px] text-muted mb-1">Breach Date: {b.date}</div>
                      <div className="flex flex-wrap gap-1 mb-1">
                        {b.exposedFields.map((f) => <span key={f} className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-input text-secondary">{f}</span>)}
                      </div>
                      {b.passwordHash && <div className="text-[10px] font-mono text-danger flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {b.passwordHash}</div>}
                      {b.pasteRef && <div className="text-[10px] font-mono text-accent flex items-center gap-1 mt-1"><Link2 className="w-3 h-3" /> {b.pasteRef}</div>}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Middle Column: Social Media Footprint + Corporate Links */}
            <div className="lg:col-span-4 space-y-4">
              {/* Social Media Footprint */}
              <div className="rounded-xl border border-app bg-panel overflow-hidden">
                <div className="px-4 py-2.5 border-b border-app flex items-center gap-2">
                  <Globe className="w-4 h-4 text-accent" />
                  <h3 className="text-xs font-semibold text-secondary">Social Media Footprint</h3>
                  <span className="text-[10px] text-muted ml-auto">{activeProfiles.length} active / {result.personCard.socialProfiles.length} total</span>
                </div>
                <div className="divide-y divide-app/50 max-h-[460px] overflow-y-auto scrollbar-thin">
                  {result.personCard.socialProfiles.map((s, i) => {
                    const badge = socialIcons[s.platform] || '?';
                    const statusColors = { active: 'var(--success)', inactive: 'var(--warning)', not_found: 'var(--text-muted)' };
                    const statusLabels = { active: 'ACTIVE', inactive: 'INACTIVE', not_found: 'NOT FOUND' };
                    const key = `url:${s.url}`;
                    return (
                      <div key={i} className="px-4 py-2.5 hover:bg-hover">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0" style={{ backgroundColor: `${queryTypeColors.username}15`, color: queryTypeColors.username }}>{badge}</div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-app">{s.platform}</span>
                              <span className="px-1 py-0.5 rounded text-[8px] font-bold" style={{ color: statusColors[s.status], backgroundColor: `${statusColors[s.status]}15` }}>{statusLabels[s.status]}</span>
                            </div>
                            <div className="text-[10px] font-mono text-muted truncate">{s.handle}</div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {s.status === 'active' && s.followers !== undefined && <span className="text-[10px] text-muted">{s.followers > 999 ? `${(s.followers / 1000).toFixed(1)}K` : s.followers}</span>}
                            {s.status === 'active' && (
                              <>
                                <a href={s.url} target="_blank" rel="noopener noreferrer" className="p-1 text-muted hover:text-accent"><ExternalLink className="w-3.5 h-3.5" /></a>
                                <button onClick={() => handleImportEntity({ type: 'url', value: s.url, label: `OSINT: ${s.platform}`, metadata: { source: 'Public OSINT Hub', platform: s.platform, handle: s.handle, followers: s.followers }, risk_level: 'low', flagged: false })} disabled={importedEntities.has(key) || importing} className={`p-1 rounded ${importedEntities.has(key) ? 'text-success' : 'text-muted hover:text-accent'}`}>
                                  {importedEntities.has(key) ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        {s.lastSeen && <div className="text-[9px] text-muted mt-1 ml-10">Last seen: {s.lastSeen}</div>}
                      </div>
                    );
                  })}
                </div>
                {result.personCard.socialProfiles.length === 0 && <div className="px-4 py-6 text-center text-xs text-muted">No social profiles found</div>}
              </div>

              {/* Corporate & Associated Entities */}
              <div className="rounded-xl border border-app bg-panel overflow-hidden">
                <div className="px-4 py-2.5 border-b border-app flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-accent" />
                  <h3 className="text-xs font-semibold text-secondary">Corporate & Associated Entities</h3>
                </div>
                <div className="divide-y divide-app/50 max-h-72 overflow-y-auto scrollbar-thin">
                  {result.corporateLinks.map((c, i) => {
                    const key = c.domain ? `domain:${c.domain}` : `company:${c.entity}`;
                    return (
                      <div key={i} className="px-4 py-3 hover:bg-hover">
                        <div className="flex items-center gap-2 mb-1">
                          <Building className="w-3.5 h-3.5 text-muted shrink-0" />
                          <span className="text-xs font-semibold text-app truncate flex-1">{c.entity}</span>
                          {c.domain && (
                            <button onClick={() => handleImportEntity({ type: 'domain', value: c.domain!, label: `OSINT Domain: ${c.domain}`, metadata: { source: 'Public OSINT Hub', company: c.entity, role: c.role }, risk_level: 'medium', flagged: false })} disabled={importedEntities.has(key) || importing} className={`p-1 rounded ${importedEntities.has(key) ? 'text-success' : 'text-muted hover:text-accent'}`}>
                              {importedEntities.has(key) ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted ml-6">
                          <span>{c.role}</span>
                          <span>|</span>
                          <span>{c.relationship}</span>
                          {c.registeredDate && <><span>|</span><span>{c.registeredDate}</span></>}
                        </div>
                        {c.domain && <div className="text-[10px] font-mono text-accent ml-6 mt-0.5">{c.domain}</div>}
                      </div>
                    );
                  })}
                  {result.corporateLinks.length === 0 && <div className="px-4 py-6 text-center text-xs text-muted">No corporate links found</div>}
                </div>
              </div>

              {/* Threat Intelligence */}
              <div className="rounded-xl border border-app bg-panel overflow-hidden">
                <div className="px-4 py-2.5 border-b border-app flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-warning" />
                  <h3 className="text-xs font-semibold text-secondary">Threat Intelligence</h3>
                </div>
                <div className="divide-y divide-app/50">
                  {result.threatIntel.map((t, i) => (
                    <div key={i} className="px-4 py-2.5 hover:bg-hover">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-app">{t.source}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold ml-auto" style={{ color: riskColorMap[t.risk], backgroundColor: `${riskColorMap[t.risk]}15` }}>{t.risk.toUpperCase()}</span>
                      </div>
                      <p className="text-[10px] text-secondary leading-relaxed">{t.verdict}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Activity className="w-3 h-3 text-muted" />
                        <span className="text-[10px] font-mono text-muted">Risk Score: {t.score}/100</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: GeoINT Map + Location Details */}
            <div className="lg:col-span-4 space-y-4">
              <div className="rounded-xl border border-app bg-panel overflow-hidden">
                <div className="px-4 py-2.5 border-b border-app flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-accent" />
                  <h3 className="text-xs font-semibold text-secondary">GeoINT Map Visualizer</h3>
                  <span className="text-[10px] text-muted ml-auto">{result.locations.length} locations</span>
                </div>
                <div ref={mapRef} className="h-[300px] w-full bg-card" />
              </div>

              {selectedLocation && (
                <div className="rounded-xl border border-accent bg-panel p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-accent flex items-center gap-2"><MapPin className="w-4 h-4" /> {selectedLocation.label}</h4>
                    <button onClick={() => setSelectedLocation(null)} className="text-muted hover:text-app text-xs">Close</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-muted">Type:</span> <span className="text-app">{selectedLocation.type}</span></div>
                    <div><span className="text-muted">Source:</span> <span className="text-app">{selectedLocation.source}</span></div>
                    <div><span className="text-muted">Location:</span> <span className="text-app">{selectedLocation.city}, {selectedLocation.country}</span></div>
                    <div><span className="text-muted">Risk:</span> <span className="font-bold" style={{ color: riskColorMap[selectedLocation.risk] }}>{selectedLocation.risk.toUpperCase()}</span></div>
                    <div><span className="text-muted">Lat:</span> <span className="text-app font-mono">{selectedLocation.lat.toFixed(4)}</span></div>
                    <div><span className="text-muted">Lng:</span> <span className="text-app font-mono">{selectedLocation.lng.toFixed(4)}</span></div>
                  </div>
                </div>
              )}

              {/* Location List */}
              <div className="rounded-xl border border-app bg-panel overflow-hidden">
                <div className="px-4 py-2.5 border-b border-app flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-accent" />
                  <h3 className="text-xs font-semibold text-secondary">Extracted Locations</h3>
                </div>
                <div className="divide-y divide-app/50 max-h-48 overflow-y-auto scrollbar-thin">
                  {result.locations.map((loc, i) => (
                    <button key={i} onClick={() => { setSelectedLocation(loc); mapInstanceRef.current?.setView([loc.lat, loc.lng], 6); }} className="w-full text-left px-4 py-2.5 hover:bg-hover">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: riskColorMap[loc.risk] }} />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-mono text-app truncate">{loc.label}</div>
                          <div className="text-[10px] text-muted">{loc.type} | {loc.city}, {loc.country}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Stats Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-app bg-panel p-3">
                  <div className="flex items-center gap-2 mb-1"><TrendingUp className="w-4 h-4 text-accent" /><span className="text-[10px] uppercase text-muted">Social Reach</span></div>
                  <div className="text-lg font-bold text-app">{activeProfiles.reduce((s, p) => s + (p.followers || 0), 0).toLocaleString()}</div>
                  <div className="text-[10px] text-muted">total followers</div>
                </div>
                <div className="rounded-lg border border-app bg-panel p-3">
                  <div className="flex items-center gap-2 mb-1"><ShieldCheck className="w-4 h-4 text-success" /><span className="text-[10px] uppercase text-muted">Clean Profiles</span></div>
                  <div className="text-lg font-bold text-success">{result.personCard.socialProfiles.filter((s) => s.status === 'active').length}</div>
                  <div className="text-[10px] text-muted">verified active</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!result && !searching && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8">
            <div className="rounded-xl border border-app bg-panel p-12 text-center">
              <Globe className="w-16 h-16 text-muted mx-auto mb-4 opacity-40" />
              <h3 className="text-lg font-semibold text-secondary mb-2">Universal OSINT Search Engine</h3>
              <p className="text-sm text-muted max-w-md mx-auto">Enter any person name, email, phone, username, IP, domain, company, or keyword to generate a complete intelligence profile with social media footprint, breach history, geo-locations, and corporate links.</p>
              <div className="grid grid-cols-4 gap-3 mt-8 max-w-lg mx-auto">
                {(['person', 'email', 'ip', 'domain', 'username', 'phone', 'company', 'keyword'] as QueryType[]).map((t) => {
                  const Icon = queryTypeIcons[t];
                  return (
                    <div key={t} className="flex flex-col items-center gap-1 p-3 rounded-lg border border-app bg-card">
                      <Icon className="w-5 h-5" style={{ color: queryTypeColors[t] }} />
                      <span className="text-[10px] text-muted uppercase">{t}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="lg:col-span-4 space-y-4">
            <div className="rounded-xl border border-app bg-panel p-4">
              <div className="flex items-center gap-2 mb-3"><Eye className="w-4 h-4 text-accent" /><h3 className="text-xs font-semibold text-secondary">Intelligence Modules</h3></div>
              <div className="space-y-2">
                {[
                  { icon: User, label: 'Person & Identity Card', desc: 'Aliases, emails, phones, social' },
                  { icon: Database, label: 'Breach & Darkweb Intel', desc: 'Leaked credentials & paste refs' },
                  { icon: Navigation, label: 'GeoINT Map Visualizer', desc: 'Interactive location markers' },
                  { icon: Briefcase, label: 'Corporate Metadata', desc: 'WHOIS, directors, domains' },
                  { icon: ShieldAlert, label: 'Threat Intelligence', desc: 'VirusTotal, AbuseIPDB, Shodan' },
                ].map((m) => {
                  const Icon = m.icon;
                  return (
                    <div key={m.label} className="flex items-start gap-2 p-2 rounded-lg border border-app bg-card">
                      <Icon className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                      <div><div className="text-xs font-medium text-app">{m.label}</div><div className="text-[10px] text-muted">{m.desc}</div></div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
