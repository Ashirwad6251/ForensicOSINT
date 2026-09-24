import { useState, useRef, useEffect } from 'react';
import {
  Globe, Search, Server, MapPin, Shield, AlertTriangle, Loader2, Sparkles, Navigation, Radio,
} from 'lucide-react';
import L from 'leaflet';
import { mockPublicMapPoints, mockPublicSearchResults } from '@/lib/mockData';

type SearchMode = 'whois' | 'dns' | 'social' | 'threat';

const searchModes: { mode: SearchMode; label: string; icon: typeof Globe; placeholder: string }[] = [
  { mode: 'whois', label: 'WHOIS', icon: Globe, placeholder: 'darkforum.onion' },
  { mode: 'dns', label: 'DNS', icon: Server, placeholder: 'darkforum.onion' },
  { mode: 'social', label: 'Social Handles', icon: Search, placeholder: 'nightshade_op' },
  { mode: 'threat', label: 'Threat DBs', icon: Shield, placeholder: '185.220.101.47' },
];

export function PublicOSINTHub() {
  const [activeMode, setActiveMode] = useState<SearchMode>('threat');
  const [query, setQuery] = useState('185.220.101.47');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<{ source: string; result: string; risk: 'low' | 'medium' | 'high' | 'critical' }[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<typeof mockPublicMapPoints[0] | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }
    const map = L.map(mapRef.current).setView([30, 10], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: 'OSM', minZoom: 2, maxZoom: 18 }).addTo(map);
    const riskColors: Record<string, string> = { high: '#ef4444', critical: '#dc2626', medium: '#f59e0b', low: '#10b981' };
    const markers: L.Marker[] = [];
    mockPublicMapPoints.forEach((pt) => {
      const icon = L.divIcon({
        html: `<div style="width:14px;height:14px;border-radius:50%;background:${riskColors[pt.risk]};border:2px solid #0f172a;box-shadow:0 0 8px ${riskColors[pt.risk]};"></div>`,
        className: 'osint-marker',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      const marker = L.marker([pt.lat, pt.lng], { icon }).addTo(map);
      marker.bindPopup(`<b>${pt.label}</b><br>Type: ${pt.type}<br>Location: ${pt.city}, ${pt.country}<br>ISP: ${pt.isp}<br>Risk: ${pt.risk.toUpperCase()}`);
      marker.on('click', () => setSelectedPoint(pt));
      markers.push(marker);
    });
    markersRef.current = markers;
    mapInstanceRef.current = map;
    return () => { map.remove(); mapInstanceRef.current = null; };
  }, []);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setResults([]);
    await new Promise((r) => setTimeout(r, 1200));
    const modeResults = mockPublicSearchResults[activeMode] || [];
    setResults(modeResults.map((r) => ({ ...r, result: r.result.replace(/darkforum\.onion|nightshade_op|185\.220\.101\.47/g, query) })));
    setSearching(false);
  };

  const riskColors: Record<string, string> = { low: 'var(--success)', medium: 'var(--warning)', high: 'var(--danger)', critical: 'var(--danger)' };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-app">Public OSINT Intelligence Hub</h1>
        <p className="text-sm text-muted">Open-source intelligence gathering with GeoINT map visualization and multi-source public queries</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <div className="rounded-xl border border-app bg-panel overflow-hidden">
            <div className="px-4 py-2.5 border-b border-app flex items-center gap-2">
              <Navigation className="w-4 h-4 text-accent" />
              <h3 className="text-xs font-semibold text-secondary">GeoINT Map Visualizer</h3>
              <span className="text-[10px] text-muted ml-auto">{mockPublicMapPoints.length} public intelligence points</span>
            </div>
            <div ref={mapRef} className="h-[500px] w-full bg-card" />
          </div>

          {selectedPoint && (
            <div className="mt-4 rounded-xl border border-accent bg-panel p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-accent flex items-center gap-2"><MapPin className="w-4 h-4" /> {selectedPoint.label}</h4>
                <button onClick={() => setSelectedPoint(null)} className="text-muted hover:text-app text-xs">Close</button>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div><span className="text-muted">Type:</span> <span className="text-app">{selectedPoint.type}</span></div>
                <div><span className="text-muted">Location:</span> <span className="text-app">{selectedPoint.city}, {selectedPoint.country}</span></div>
                <div><span className="text-muted">ISP:</span> <span className="text-app">{selectedPoint.isp}</span></div>
                <div><span className="text-muted">Risk:</span> <span className="font-bold" style={{ color: riskColors[selectedPoint.risk] }}>{selectedPoint.risk.toUpperCase()}</span></div>
                <div><span className="text-muted">Lat:</span> <span className="text-app font-mono">{selectedPoint.lat.toFixed(4)}</span></div>
                <div><span className="text-muted">Lng:</span> <span className="text-app font-mono">{selectedPoint.lng.toFixed(4)}</span></div>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-xl border border-app bg-panel p-4">
            <div className="flex items-center gap-2 mb-3">
              <Radio className="w-4 h-4 text-accent" />
              <h3 className="text-xs font-semibold text-secondary">Public Search & AI Assistant</h3>
            </div>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {searchModes.map((sm) => {
                const Icon = sm.icon;
                return (
                  <button key={sm.mode} onClick={() => { setActiveMode(sm.mode); setResults([]); }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeMode === sm.mode ? 'bg-accent-soft text-accent border border-accent' : 'text-secondary hover:bg-hover border border-transparent'}`}>
                    <Icon className="w-3.5 h-3.5" /> {sm.label}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} placeholder={searchModes.find((sm) => sm.mode === activeMode)?.placeholder} className="w-full pl-10 pr-4 py-2.5 bg-input border border-app rounded-lg text-sm font-mono text-app focus:outline-none focus:border-accent" />
              </div>
              <button onClick={handleSearch} disabled={searching || !query.trim()} className="px-4 py-2.5 rounded-lg text-sm font-semibold bg-accent text-accent-on hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
                {searching ? <><Loader2 className="w-4 h-4 animate-spin" /> Scanning</> : <><Sparkles className="w-4 h-4" /> Query</>}
              </button>
            </div>
          </div>

          {searching && (
            <div className="rounded-xl border border-accent bg-accent-soft p-4">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-accent animate-spin" />
                <span className="text-sm font-mono text-accent">Querying public OSINT sources...</span>
              </div>
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-2">
              {results.map((r, i) => (
                <div key={i} className="rounded-lg border border-app bg-panel p-3 hover:border-accent transition-colors animate-fade-in">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-accent-soft text-accent">{r.source}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: `${riskColors[r.risk]}15`, color: riskColors[r.risk] }}>{r.risk.toUpperCase()}</span>
                  </div>
                  <p className="text-xs text-secondary leading-relaxed">{r.result}</p>
                </div>
              ))}
            </div>
          )}

          {!searching && results.length === 0 && (
            <div className="rounded-xl border border-app bg-panel p-6 text-center">
              <Globe className="w-10 h-10 text-muted mx-auto mb-2 opacity-50" />
              <p className="text-sm text-muted">Enter a query above to search public OSINT databases</p>
              <p className="text-xs text-muted mt-1">WHOIS, DNS, Social Handles, and Threat Intelligence</p>
            </div>
          )}

          <div className="rounded-xl border border-app bg-panel overflow-hidden">
            <div className="px-4 py-2.5 border-b border-app flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              <h3 className="text-xs font-semibold text-secondary">Threat Intelligence Summary</h3>
            </div>
            <div className="p-3 space-y-1.5">
              {mockPublicMapPoints.map((pt) => (
                <div key={pt.id} className="flex items-center gap-2 text-xs py-1">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: riskColors[pt.risk] }} />
                  <span className="font-mono text-app truncate flex-1">{pt.label}</span>
                  <span className="text-muted shrink-0">{pt.type}</span>
                  <span className="text-muted shrink-0">{pt.city}, {pt.country}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
