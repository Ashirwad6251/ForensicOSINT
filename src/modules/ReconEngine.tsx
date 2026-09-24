import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  User,
  Mail,
  Globe,
  Phone,
  Server,
  Plus,
  Flag,
  Shield,
  Database,
  Lock,
  Fingerprint,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ExternalLink,
  Radar,
  Link2,
  Loader2,
  Terminal,
  Layers,
  FileWarning,
} from 'lucide-react';
import { useCase } from '@/components/CaseContext';
import { useToast } from '@/components/Toast';
import { supabase, type EntityRow, type EntityType } from '@/lib/supabase';
import { logAudit } from '@/lib/audit';
import { RiskBadge } from '@/components/Badges';
import { safeQuery, isNetworkError } from '@/lib/localCases';
import { getMockData } from '@/lib/mockData';

type SearchType = 'username' | 'email' | 'ip' | 'domain' | 'phone';

const searchTypes: { type: SearchType; label: string; icon: typeof User; placeholder: string }[] = [
  { type: 'username', label: 'Username', icon: User, placeholder: 'nightshade_op' },
  { type: 'email', label: 'Email', icon: Mail, placeholder: 'suspect@protonmail.ch' },
  { type: 'ip', label: 'IP Address', icon: Server, placeholder: '185.220.101.47' },
  { type: 'domain', label: 'Domain', icon: Globe, placeholder: 'suspicious-site.com' },
  { type: 'phone', label: 'Phone', icon: Phone, placeholder: '+1-555-018-2247' },
];

// ===== Data source definitions =====
type SourceKey = 'google_cse' | 'duckduckgo' | 'sherlock' | 'hibp' | 'shodan' | 'whois' | 'dns' | 'ssl' | 'darkweb' | 'pastebin' | 'social' | 'phone_lookup';

type DataSource = {
  key: SourceKey;
  label: string;
  category: 'Web Search' | 'Infrastructure' | 'Identity & Breaches';
  icon: typeof Globe;
};

const allSources: DataSource[] = [
  { key: 'google_cse', label: 'Google CSE', category: 'Web Search', icon: Search },
  { key: 'duckduckgo', label: 'DuckDuckGo', category: 'Web Search', icon: Search },
  { key: 'darkweb', label: 'Darkweb Mirrors', category: 'Web Search', icon: Lock },
  { key: 'pastebin', label: 'Pastebin Dumps', category: 'Web Search', icon: FileWarning },
  { key: 'social', label: 'Social Presence', category: 'Web Search', icon: User },
  { key: 'shodan', label: 'Shodan', category: 'Infrastructure', icon: Server },
  { key: 'whois', label: 'WHOIS', category: 'Infrastructure', icon: Globe },
  { key: 'dns', label: 'DNS Records', category: 'Infrastructure', icon: Layers },
  { key: 'ssl', label: 'SSL Certificate', category: 'Infrastructure', icon: Shield },
  { key: 'sherlock', label: 'Sherlock', category: 'Identity & Breaches', icon: Fingerprint },
  { key: 'hibp', label: 'HaveIBeenPwned', category: 'Identity & Breaches', icon: AlertTriangle },
  { key: 'phone_lookup', label: 'Phone Lookup', category: 'Identity & Breaches', icon: Phone },
];

const sourcesByType: Record<SearchType, SourceKey[]> = {
  username: ['google_cse', 'duckduckgo', 'social', 'sherlock', 'darkweb', 'pastebin'],
  email: ['google_cse', 'hibp', 'sherlock', 'pastebin', 'darkweb'],
  ip: ['shodan', 'whois', 'dns', 'ssl', 'google_cse'],
  domain: ['whois', 'dns', 'ssl', 'google_cse', 'duckduckgo'],
  phone: ['phone_lookup', 'google_cse', 'duckduckgo'],
};

// ===== Result types =====
type AggregatedResult = {
  id: string;
  source: SourceKey;
  sourceLabel: string;
  category: string;
  title: string;
  url: string;
  snippet: string;
  timestamp: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  entityType: EntityType;
  metadata: Record<string, unknown>;
};

// ===== Mock data generators per source =====
function genWebResults(query: string, source: SourceKey): AggregatedResult[] {
  const sourceLabel = allSources.find((s) => s.key === source)?.label || source;
  const baseResults: { title: string; url: string; snippet: string; risk: 'low' | 'medium' | 'high' | 'critical' }[] = [];

  if (source === 'google_cse') {
    baseResults.push(
      { title: `${query} - Public Profile Page`, url: `https://example.com/profile/${query}`, snippet: `Indexed public profile containing references to "${query}". Found in Google CSE cached results.`, risk: 'low' },
      { title: `Forum discussion mentioning ${query}`, url: `https://forum.example.com/thread/8821`, snippet: `User "${query}" actively participates in discussions about network security and penetration testing tools.`, risk: 'medium' },
      { title: `News article referencing ${query}`, url: `https://news.example.com/article/2026/09/${query}`, snippet: `Recent news coverage mentions "${query}" in connection with ongoing investigation.`, risk: 'high' },
    );
  } else if (source === 'duckduckgo') {
    baseResults.push(
      { title: `${query} - Blog Post`, url: `https://blog.example.com/posts/${query}`, snippet: `Personal blog post by "${query}" detailing OSINT methodology and tools.`, risk: 'low' },
      { title: `GitHub repository by ${query}`, url: `https://github.com/${query}/recon-tools`, snippet: `Repository containing network reconnaissance scripts and security audit tools.`, risk: 'medium' },
    );
  } else if (source === 'darkweb') {
    baseResults.push(
      { title: `Darkweb forum thread: Selling access to ${query}`, url: `https://darkforum.onion/thread/9182`, snippet: `Thread offering credential dump containing "${query}". Posted by anonymous vendor. 47 views.`, risk: 'critical' },
      { title: `Mirror site: ${query} data archive`, url: `https://mirror.onion/archive/${query}`, snippet: `Archived copy of data associated with "${query}" on darkweb mirror. Contains PII fields.`, risk: 'critical' },
    );
  } else if (source === 'pastebin') {
    baseResults.push(
      { title: `Pastebin dump: ${query} credentials`, url: `https://paste-bin.ru/view/raw/${query}8821`, snippet: `Raw paste containing email and hashed password for "${query}". Detected via Pastebin monitoring API.`, risk: 'high' },
      { title: `Ghostbin: ${query} config leak`, url: `https://ghostbin.com/paste/${query}xx`, snippet: `Leaked configuration file referencing "${query}" with API keys and server endpoints.`, risk: 'high' },
    );
  } else if (source === 'social') {
    baseResults.push(
      { title: `Twitter/X: @${query}`, url: `https://twitter.com/${query}`, snippet: `Active social media account. 1,247 followers. Last activity: 2026-09-15.`, risk: 'low' },
      { title: `Reddit: u/${query}`, url: `https://reddit.com/u/${query}`, snippet: `Reddit account with posts in r/netsec and r/privacy. Account age: 3 years.`, risk: 'low' },
      { title: `Telegram: @${query}`, url: `https://t.me/${query}`, snippet: `Telegram channel with 234 subscribers. Posts in Russian and English.`, risk: 'medium' },
    );
  }

  return baseResults.map((r, i) => ({
    id: `${source}_${i}_${Math.random().toString(36).slice(2, 8)}`,
    source,
    sourceLabel,
    category: 'Web Search',
    title: r.title,
    url: r.url,
    snippet: r.snippet,
    timestamp: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
    riskLevel: r.risk,
    entityType: 'url' as EntityType,
    metadata: { indexed: true, source: sourceLabel },
  }));
}

function genSherlockResults(username: string): AggregatedResult[] {
  const platforms = [
    { platform: 'Twitter/X', url: `https://twitter.com/${username}`, found: true, followers: '1.2K' },
    { platform: 'GitHub', url: `https://github.com/${username}`, found: true, repos: '23' },
    { platform: 'Reddit', url: `https://reddit.com/u/${username}`, found: true, karma: '4.8K' },
    { platform: 'Telegram', url: `https://t.me/${username}`, found: true, subs: '234' },
    { platform: 'Instagram', url: `https://instagram.com/${username}`, found: false, followers: '' },
    { platform: 'YouTube', url: `https://youtube.com/@${username}`, found: false, followers: '' },
    { platform: 'TikTok', url: `https://tiktok.com/@${username}`, found: true, followers: '890' },
    { platform: 'Steam', url: `https://steamcommunity.com/id/${username}`, found: true, followers: '12' },
  ];
  return platforms.map((p, i) => ({
    id: `sherlock_${i}_${Math.random().toString(36).slice(2, 8)}`,
    source: 'sherlock' as SourceKey,
    sourceLabel: 'Sherlock',
    category: 'Identity & Breaches',
    title: `${p.platform} ${p.found ? 'FOUND' : 'NOT FOUND'}`,
    url: p.url,
    snippet: p.found
      ? `Account discovered on ${p.platform}${p.followers ? ` — ${p.followers} followers/subscribers` : ''}`
      : `No account found on ${p.platform}`,
    timestamp: new Date().toISOString(),
    riskLevel: p.found ? 'medium' as const : 'low' as const,
    entityType: 'username' as EntityType,
    metadata: { platform: p.platform, found: p.found, followers: p.followers },
  }));
}

function genHibpResults(email: string): AggregatedResult[] {
  const breaches = [
    { name: 'Collection #1', date: '2019-01-07', records: '772M', types: 'Emails, Passwords', severity: 'high' as const },
    { name: 'LeakDB', date: '2021-02-15', records: '1.2B', types: 'Emails, Password Hashes', severity: 'critical' as const },
    { name: 'LinkedIn Scrape', date: '2021-06-22', records: '700M', types: 'Emails, Names, Job Titles', severity: 'medium' as const },
    { name: 'Dropbox', date: '2016-08-31', records: '68M', types: 'Emails, Passwords', severity: 'medium' as const },
  ];
  return breaches.map((b, i) => ({
    id: `hibp_${i}_${Math.random().toString(36).slice(2, 8)}`,
    source: 'hibp' as SourceKey,
    sourceLabel: 'HaveIBeenPwned',
    category: 'Identity & Breaches',
    title: `Breach: ${b.name}`,
    url: `https://haveibeenpwned.com/breach/${b.name.replace(/\s/g, '')}`,
    snippet: `${b.name} breach (${b.date}). ${b.records} records compromised. Data types: ${b.types}.`,
    timestamp: b.date,
    riskLevel: b.severity,
    entityType: 'email' as EntityType,
    metadata: { breach: b.name, date: b.date, records: b.records, types: b.types },
  }));
}

function genShodanResults(ip: string): AggregatedResult[] {
  const ports = [
    { port: 22, service: 'SSH', banner: 'OpenSSH 8.9p1 Ubuntu', state: 'open' },
    { port: 80, service: 'HTTP', banner: 'nginx/1.18.0 (Ubuntu)', state: 'open' },
    { port: 443, service: 'HTTPS', banner: 'nginx/1.18.0 TLS 1.3', state: 'open' },
    { port: 8080, service: 'HTTP-Proxy', banner: 'Squid/5.2 proxy', state: 'open' },
    { port: 3306, service: 'MySQL', banner: 'MySQL 8.0.32', state: 'filtered' },
  ];
  const results: AggregatedResult[] = ports.map((p, i) => ({
    id: `shodan_${i}_${Math.random().toString(36).slice(2, 8)}`,
    source: 'shodan' as SourceKey,
    sourceLabel: 'Shodan',
    category: 'Infrastructure',
    title: `Port ${p.port}/${p.service} ${p.state.toUpperCase()}`,
    url: `https://www.shodan.io/host/${ip}`,
    snippet: `${ip}:${p.port} — ${p.service} — ${p.banner}`,
    timestamp: new Date().toISOString(),
    riskLevel: p.state === 'open' ? 'high' as const : 'medium' as const,
    entityType: 'ip' as EntityType,
    metadata: { port: p.port, service: p.service, banner: p.banner, state: p.state, ip },
  }));
  results.push({
    id: `shodan_geo_${Math.random().toString(36).slice(2, 8)}`,
    source: 'shodan',
    sourceLabel: 'Shodan',
    category: 'Infrastructure',
    title: `Geolocation: Moscow, Russia`,
    url: `https://www.shodan.io/host/${ip}`,
    snippet: `IP ${ip} located in Moscow, Russia. ISP: Thor Network LLC. Tags: tor, proxy, vpn.`,
    timestamp: new Date().toISOString(),
    riskLevel: 'high',
    entityType: 'ip',
    metadata: { country: 'Russia', city: 'Moscow', org: 'Thor Network LLC', tags: ['tor', 'proxy', 'vpn'], ip },
  });
  return results;
}

function genWhoisResults(domain: string): AggregatedResult[] {
  return [{
    id: `whois_${Math.random().toString(36).slice(2, 8)}`,
    source: 'whois' as SourceKey,
    sourceLabel: 'WHOIS',
    category: 'Infrastructure',
    title: `WHOIS: ${domain}`,
    url: `https://who.is/whois/${domain}`,
    snippet: `Registrar: NameCheap, Inc. Created: 2026-08-14. Expires: 2027-08-14. Registrant: REDACTED FOR PRIVACY (PrivacyGuard LLC, PA).`,
    timestamp: '2026-08-14',
    riskLevel: 'high',
    entityType: 'domain',
    metadata: { registrar: 'NameCheap, Inc.', registered: '2026-08-14', expires: '2027-08-14', registrant: 'PrivacyGuard LLC', country: 'PA', domain },
  }];
}

function genDnsResults(domain: string): AggregatedResult[] {
  const records = [
    { type: 'A', value: '185.220.101.47', ttl: '3600' },
    { type: 'MX', value: 'mail.suspicious-site.com', ttl: '1800' },
    { type: 'NS', value: 'dns1.namecheaphosting.com', ttl: '86400' },
    { type: 'TXT', value: 'v=spf1 include:_spf.google.com ~all', ttl: '3600' },
  ];
  return records.map((r, i) => ({
    id: `dns_${i}_${Math.random().toString(36).slice(2, 8)}`,
    source: 'dns' as SourceKey,
    sourceLabel: 'DNS Records',
    category: 'Infrastructure',
    title: `DNS ${r.type} Record`,
    url: `https://dns.google/query?name=${domain}&type=${r.type}`,
    snippet: `${r.type} ${domain} → ${r.value} (TTL: ${r.ttl})`,
    timestamp: new Date().toISOString(),
    riskLevel: 'medium' as const,
    entityType: 'domain' as EntityType,
    metadata: { recordType: r.type, value: r.value, ttl: r.ttl, domain },
  }));
}

function genSslResults(ip: string): AggregatedResult[] {
  return [{
    id: `ssl_${Math.random().toString(36).slice(2, 8)}`,
    source: 'ssl' as SourceKey,
    sourceLabel: 'SSL Certificate',
    category: 'Infrastructure',
    title: `SSL Cert: ${ip}`,
    url: `https://crt.sh/?q=${ip}`,
    snippet: `Issuer: Let's Encrypt R3. Subject: CN=*.thor-network.ru. Valid: 2026-07-01 to 2026-09-29. TLS 1.3 enabled.`,
    timestamp: '2026-07-01',
    riskLevel: 'medium',
    entityType: 'ip',
    metadata: { issuer: "Let's Encrypt R3", subject: 'CN=*.thor-network.ru', validFrom: '2026-07-01', validTo: '2026-09-29', ip },
  }];
}

function genPhoneResults(phone: string): AggregatedResult[] {
  return [{
    id: `phone_${Math.random().toString(36).slice(2, 8)}`,
    source: 'phone_lookup' as SourceKey,
    sourceLabel: 'Phone Lookup',
    category: 'Identity & Breaches',
    title: `Reverse Lookup: ${phone}`,
    url: `https://www.truecaller.com/search/${phone}`,
    snippet: `Carrier: VoIP - Bandwidth.com. Type: Burner/VoIP. Risk: HIGH. Truecaller: Unknown. Hiya: Potential Spam (2 reports).`,
    timestamp: new Date().toISOString(),
    riskLevel: 'high',
    entityType: 'phone',
    metadata: { carrier: 'VoIP - Bandwidth.com', type: 'Burner', risk: 'high', truecaller: 'Unknown', hiya: 'Potential Spam', phone },
  }];
}

function generateResults(query: string, type: SearchType, source: SourceKey): AggregatedResult[] {
  switch (source) {
    case 'google_cse':
    case 'duckduckgo':
    case 'darkweb':
    case 'pastebin':
    case 'social':
      return genWebResults(query, source);
    case 'sherlock':
      return genSherlockResults(query);
    case 'hibp':
      return genHibpResults(query);
    case 'shodan':
      return genShodanResults(query);
    case 'whois':
      return genWhoisResults(query);
    case 'dns':
      return genDnsResults(query);
    case 'ssl':
      return genSslResults(query);
    case 'phone_lookup':
      return genPhoneResults(query);
    default:
      return [];
  }
}

// ===== Main Component =====
export function ReconEngine() {
  const { currentCase } = useCase();
  const { showToast } = useToast();
  const [activeType, setActiveType] = useState<SearchType>('username');
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [scanProgress, setScanProgress] = useState<{ source: string; done: boolean }[]>([]);
  const [results, setResults] = useState<AggregatedResult[]>([]);
  const [entities, setEntities] = useState<EntityRow[]>([]);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = useState<string>('all');

  useEffect(() => {
    if (!currentCase) return;
    (async () => {
      const mock = getMockData(currentCase.id);
      const data = await safeQuery(
        () => supabase.from('entities').select('*').eq('case_id', currentCase.id).in('type', ['person', 'email', 'ip', 'domain', 'username', 'phone', 'url', 'web_page']).order('created_at', { ascending: false }),
        mock.entities.filter((e) => e.type !== 'image_hash') as EntityRow[],
      );
      setEntities(data);
    })();
  }, [currentCase]);

  const refreshEntities = useCallback(async () => {
    if (!currentCase) return;
    const mock = getMockData(currentCase.id);
    const data = await safeQuery(
      () => supabase.from('entities').select('*').eq('case_id', currentCase.id).in('type', ['person', 'email', 'ip', 'domain', 'username', 'phone', 'url', 'web_page']).order('created_at', { ascending: false }),
      mock.entities.filter((e) => e.type !== 'image_hash') as EntityRow[],
    );
    setEntities(data);
  }, [currentCase]);

  const handleSearch = async () => {
    if (!query.trim() || !currentCase) return;
    setSearching(true);
    setResults([]);
    setAddedIds(new Set());

    const sources = sourcesByType[activeType];
    setScanProgress(sources.map((s) => ({ source: allSources.find((d) => d.key === s)!.label, done: false })));

    const allResults: AggregatedResult[] = [];

    for (let i = 0; i < sources.length; i++) {
      const sourceKey = sources[i];
      await new Promise((r) => setTimeout(r, 400 + Math.random() * 600));

      const sourceResults = generateResults(query, activeType, sourceKey);
      allResults.push(...sourceResults);

      setScanProgress((prev) => prev.map((p, idx) => (idx === i ? { ...p, done: true } : p)));
      setResults([...allResults]);
    }

    // Save the primary query as an entity
    let entityType: EntityType;
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    let flagged = false;
    switch (activeType) {
      case 'username': entityType = 'username'; riskLevel = 'medium'; break;
      case 'email': entityType = 'email'; riskLevel = 'high'; flagged = true; break;
      case 'ip': entityType = 'ip'; riskLevel = 'high'; flagged = true; break;
      case 'domain': entityType = 'domain'; riskLevel = 'high'; flagged = true; break;
      case 'phone': entityType = 'phone'; riskLevel = 'medium'; break;
    }

    try {
      const { data: existingEntity } = await supabase.from('entities').select('id').eq('case_id', currentCase.id).eq('value', query).maybeSingle();
      if (!existingEntity) {
        await supabase.from('entities').insert({ case_id: currentCase.id, type: entityType, value: query, label: `${activeType.toUpperCase()}: ${query}`, metadata: { sources: sources.length, results: allResults.length }, risk_level: riskLevel, flagged });
        await logAudit(currentCase.id, 'ENTITY_ADDED', `Entity "${query}" added via ${activeType} multi-source aggregation`, entityType, query);
      }
    } catch (err) {
      if (isNetworkError(err)) {
        await logAudit(currentCase.id, 'ENTITY_ADDED', `Entity "${query}" added offline via ${activeType} aggregation`, entityType, query);
      }
    }
    await refreshEntities();

    setSearching(false);
    showToast(`Aggregation complete: ${allResults.length} results from ${sources.length} sources`, 'success');
  };

  const addToCase = async (result: AggregatedResult) => {
    if (!currentCase) return;
    if (addedIds.has(result.id)) return;

    const { data: existing } = await supabase
      .from('entities')
      .select('id')
      .eq('case_id', currentCase.id)
      .eq('value', result.url)
      .maybeSingle();

    if (existing) {
      setAddedIds((prev) => new Set(prev).add(result.id));
      showToast('Already in case graph', 'info');
      return;
    }

    const { data: newEntity } = await supabase
      .from('entities')
      .insert({
        case_id: currentCase.id,
        type: result.entityType,
        value: result.url,
        label: result.title,
        metadata: { ...result.metadata, source: result.sourceLabel, snippet: result.snippet },
        risk_level: result.riskLevel,
        flagged: result.riskLevel === 'critical',
      })
      .select()
      .single();

    if (newEntity) {
      // Link to the query entity
      const { data: queryEntity } = await supabase
        .from('entities')
        .select('id')
        .eq('case_id', currentCase.id)
        .eq('value', query)
        .maybeSingle();

      if (queryEntity) {
        await supabase.from('relationships').insert({
          case_id: currentCase.id,
          source_entity_id: queryEntity.id,
          target_entity_id: newEntity.id,
          relation_type: 'LINKED_TO',
        });
      }

      await logAudit(currentCase.id, 'ENTITY_ADDED', `Result "${result.title}" added to case graph from ${result.sourceLabel}`, result.entityType, newEntity.id);
      await refreshEntities();
    }

    setAddedIds((prev) => new Set(prev).add(result.id));
    showToast(`Added to case: ${result.title}`, 'success');
  };

  const addAllToCase = async () => {
    const pending = results.filter((r) => !addedIds.has(r.id));
    for (const r of pending) {
      await addToCase(r);
    }
    showToast(`${pending.length} results added to case graph`, 'success');
  };

  const toggleFlag = async (entity: EntityRow) => {
    const newFlag = !entity.flagged;
    try { await supabase.from('entities').update({ flagged: newFlag }).eq('id', entity.id); } catch { /* offline */ }
    setEntities((prev) => prev.map((e) => (e.id === entity.id ? { ...e, flagged: newFlag } : e)));
    try { await logAudit(currentCase!.id, 'ENTITY_FLAGGED', `Entity "${entity.value}" ${newFlag ? 'flagged' : 'unflagged'}`, entity.type, entity.id); } catch { /* offline */ }
    showToast(`Entity ${newFlag ? 'flagged' : 'unflagged'}`, 'info');
  };

  if (!currentCase) return <div className="text-muted">Select a case first.</div>;

  const categories = ['all', ...Array.from(new Set(results.map((r) => r.category)))];
  const filteredResults = activeCategory === 'all' ? results : results.filter((r) => r.category === activeCategory);
  const categoryColors: Record<string, string> = {
    'Web Search': 'var(--accent)',
    'Infrastructure': 'var(--warning)',
    'Identity & Breaches': 'var(--danger)',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-app">OSINT Public Data Aggregator</h1>
        <p className="text-sm text-muted">Multi-source aggregation across search engines, darkweb, infrastructure, and breach databases</p>
      </div>

      {/* Search Bar */}
      <div className="rounded-xl border border-app bg-panel p-4">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {searchTypes.map((st) => {
            const Icon = st.icon;
            return (
              <button
                key={st.type}
                onClick={() => {
                  setActiveType(st.type);
                  setResults([]);
                  setScanProgress([]);
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  activeType === st.type
                    ? 'bg-accent-soft text-accent border border-accent'
                    : 'text-secondary hover:bg-hover border border-transparent'
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {st.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder={searchTypes.find((st) => st.type === activeType)?.placeholder}
              className="w-full pl-10 pr-4 py-2.5 bg-input border border-app rounded-lg text-sm font-mono text-app focus:outline-none focus:border-accent"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={searching || !query.trim()}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-accent text-accent-on hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {searching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Aggregating...
              </>
            ) : (
              <>
                <Radar className="w-4 h-4" /> Aggregate
              </>
            )}
          </button>
        </div>

        {/* Active sources display */}
        <div className="mt-3 flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-muted uppercase tracking-wider">Active Sources:</span>
          {sourcesByType[activeType].map((s) => {
            const src = allSources.find((d) => d.key === s)!;
            const Icon = src.icon;
            return (
              <span key={s} className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-card border border-app text-secondary">
                <Icon className="w-2.5 h-2.5" /> {src.label}
              </span>
            );
          })}
        </div>
      </div>

      {/* Scanning Status Animation */}
      {searching && (
        <div className="rounded-xl border border-accent bg-accent-soft p-4 animate-fade-in">
          <div className="flex items-center gap-2 mb-3">
            <Terminal className="w-4 h-4 text-accent animate-scan" />
            <span className="text-sm font-mono text-accent font-semibold">Aggregating Public Data Sources...</span>
          </div>
          <div className="space-y-1.5">
            {scanProgress.map((p, i) => (
              <div key={i} className="flex items-center gap-2 text-xs font-mono">
                {p.done ? (
                  <CheckCircle className="w-3.5 h-3.5 text-success" />
                ) : (
                  <Loader2 className="w-3.5 h-3.5 text-accent animate-spin" />
                )}
                <span className={p.done ? 'text-secondary' : 'text-accent'}>
                  {p.done ? '[OK]' : '[..]'} {p.source}
                </span>
                {p.done && <span className="text-muted ml-auto">complete</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Results Panel */}
        <div className="lg:col-span-8 space-y-4">
          {results.length > 0 && (
            <>
              {/* Category filter + Add All */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                        activeCategory === cat
                          ? 'bg-accent-soft text-accent border border-accent'
                          : 'text-secondary hover:bg-hover border border-transparent'
                      }`}
                    >
                      {cat === 'all' ? 'All' : cat} ({cat === 'all' ? results.length : results.filter((r) => r.category === cat).length})
                    </button>
                  ))}
                </div>
                <button
                  onClick={addAllToCase}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent text-accent-on hover:opacity-90"
                >
                  <Link2 className="w-3.5 h-3.5" /> Add All to Case
                </button>
              </div>

              {/* Result cards */}
              <div className="space-y-2">
                {filteredResults.map((r) => {
                  const isAdded = addedIds.has(r.id);
                  const catColor = categoryColors[r.category] || 'var(--accent)';
                  return (
                    <div
                      key={r.id}
                      className="rounded-lg border border-app bg-panel p-4 hover:border-accent transition-colors animate-fade-in"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-1 self-stretch rounded-full shrink-0" style={{ backgroundColor: catColor }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono"
                              style={{ backgroundColor: `${catColor}15`, color: catColor }}
                            >
                              {r.sourceLabel}
                            </span>
                            <RiskBadge level={r.riskLevel} />
                            <span className="text-[10px] text-muted font-mono ml-auto">{r.timestamp.slice(0, 10)}</span>
                          </div>
                          <div className="text-sm font-medium text-app truncate">{r.title}</div>
                          <div className="text-xs text-muted font-mono truncate mt-0.5">{r.url}</div>
                          <p className="text-xs text-secondary mt-1.5 line-clamp-2">{r.snippet}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <a
                              href={r.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-accent hover:opacity-80"
                            >
                              <ExternalLink className="w-3 h-3" /> Open
                            </a>
                            <button
                              onClick={() => addToCase(r)}
                              disabled={isAdded}
                              className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded font-semibold transition-all ${
                                isAdded
                                  ? 'bg-success/10 text-success cursor-default'
                                  : 'bg-accent text-accent-on hover:opacity-90'
                              }`}
                              style={isAdded ? { backgroundColor: 'var(--accent-soft)', color: 'var(--success)' } : {}}
                            >
                              {isAdded ? (
                                <><CheckCircle className="w-3 h-3" /> In Graph</>
                              ) : (
                                <><Plus className="w-3 h-3" /> Add to Case</>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {results.length === 0 && !searching && (
            <div className="rounded-xl border border-app bg-panel flex items-center justify-center min-h-[300px]">
              <div className="text-center text-muted">
                <Radar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Enter a search term and click Aggregate</p>
                <p className="text-xs mt-1">Queries {sourcesByType[activeType].length} public data sources simultaneously</p>
              </div>
            </div>
          )}
        </div>

        {/* Tracked Entities */}
        <div className="lg:col-span-4">
          <div className="rounded-xl border border-app bg-panel overflow-hidden sticky top-20">
            <div className="px-4 py-2.5 border-b border-app">
              <h3 className="text-xs font-semibold text-secondary flex items-center gap-2">
                <Database className="w-4 h-4 text-accent" /> Tracked Entities ({entities.length})
              </h3>
            </div>
            <div className="divide-y divide-app/50 max-h-[600px] overflow-y-auto scrollbar-thin">
              {entities.map((e) => {
                const typeIcons: Record<string, typeof User> = {
                  person: User, email: Mail, ip: Server, domain: Globe, username: User, phone: Phone,
                };
                const Icon = typeIcons[e.type] || User;
                return (
                  <div key={e.id} className="px-4 py-3 hover:bg-hover">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: e.flagged ? 'var(--danger-soft)' : 'var(--bg-card)' }}>
                        <Icon className="w-3.5 h-3.5" style={{ color: e.flagged ? 'var(--danger)' : 'var(--accent)' }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-app truncate font-mono">{e.value}</div>
                        <div className="text-[10px] text-muted uppercase">{e.type.replace('_', ' ')}</div>
                      </div>
                      <RiskBadge level={e.risk_level} />
                      <button onClick={() => toggleFlag(e)} className="p-1">
                        <Flag
                          className="w-3.5 h-3.5"
                          style={{ color: e.flagged ? 'var(--danger)' : 'var(--text-muted)' }}
                        />
                      </button>
                    </div>
                  </div>
                );
              })}
              {entities.length === 0 && <div className="px-4 py-6 text-center text-xs text-muted">No entities tracked yet</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
