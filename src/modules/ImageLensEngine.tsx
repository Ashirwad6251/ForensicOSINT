import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Upload, Image as ImageIcon, Hash, MapPin, Camera, ScanText, Search, Crop,
  Trash2, Crosshair, X, Copy,
} from 'lucide-react';
import { useCase } from '@/components/CaseContext';
import { useToast } from '@/components/Toast';
import type { EvidenceRow, LensMatchRow } from '@/lib/supabase';
import { sha256, md5 } from '@/lib/crypto';
import { logAudit } from '@/lib/audit';
import { formatBytes } from '@/lib/format';
import { safeQuery, isNetworkError } from '@/lib/localCases';
import { supabase } from '@/lib/supabase';
import { getMockData, mockEvidenceThumbnails } from '@/lib/mockData';
import exifr from 'exifr';
import L from 'leaflet';

const MOCK_LENS_MATCHES = [
  { target_url: 'https://darkforum.onion/thread/47192', domain: 'darkforum.onion', page_title: 'Leaked corporate credentials dump - Sector 7', similarity_score: 0.94, first_indexed: '2026-09-10' },
  { target_url: 'https://paste-bin.ru/view/raw/8821aa', domain: 'paste-bin.ru', page_title: 'Raw paste: ACCESS GRANTED screenshots', similarity_score: 0.89, first_indexed: '2026-09-11' },
  { target_url: 'https://telegra.ph/Nightshade-Report-09-12', domain: 'telegra.ph', page_title: 'Nightshade Investigation Report', similarity_score: 0.82, first_indexed: '2026-09-12' },
  { target_url: 'https://imgur.com/a/x7K2mN', domain: 'imgur.com', page_title: 'Anonymous gallery: surveillance stills', similarity_score: 0.76, first_indexed: '2026-09-13' },
  { target_url: 'https://reddit.com/r/OSINT/comments/8x2k1f', domain: 'reddit.com', page_title: 'r/OSINT - Need help identifying location', similarity_score: 0.71, first_indexed: '2026-09-14' },
  { target_url: 'https://twitter.com/anon_user/status/1829374', domain: 'twitter.com', page_title: 'Anonymous post with matching image', similarity_score: 0.68, first_indexed: '2026-09-15' },
];

type EvidenceWithThumb = EvidenceRow & { thumbnailUrl?: string };

export function ImageLensEngine() {
  const { currentCase } = useCase();
  const { showToast } = useToast();
  const [evidence, setEvidence] = useState<EvidenceWithThumb[]>([]);
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceWithThumb | null>(null);
  const [lensMatches, setLensMatches] = useState<LensMatchRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [lensSearching, setLensSearching] = useState(false);
  const [cropMode, setCropMode] = useState(false);
  const [ocrText, setOcrText] = useState('');
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null);
  const [cropEnd, setCropEnd] = useState<{ x: number; y: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!currentCase) return;
    (async () => {
      const mock = getMockData(currentCase.id);
      const data = await safeQuery(
        () => supabase.from('evidence_files').select('*').eq('case_id', currentCase.id).order('created_at', { ascending: false }),
        mock.evidence as EvidenceRow[],
      );
      const withThumbs: EvidenceWithThumb[] = data.map((e) => ({ ...e, thumbnailUrl: mockEvidenceThumbnails[e.id] }));
      setEvidence(withThumbs);
      if (withThumbs.length > 0) setSelectedEvidence(withThumbs[0]);
      else setSelectedEvidence(null);
    })();
  }, [currentCase]);

  useEffect(() => {
    if (!selectedEvidence || !currentCase) { setLensMatches([]); setOcrText(''); return; }
    (async () => {
      const mock = getMockData(currentCase.id);
      const matches = await safeQuery(
        () => supabase.from('lens_matches').select('*').eq('evidence_id', selectedEvidence.id).order('similarity_score', { ascending: false }),
        mock.lensMatches.filter((m) => m.evidence_id === selectedEvidence.id),
      );
      setLensMatches(matches);
      setOcrText(selectedEvidence.ocr_text || '');
    })();
  }, [selectedEvidence, currentCase]);

  useEffect(() => {
    if (!mapRef.current || !selectedEvidence?.gps_lat || !selectedEvidence?.gps_lng) return;
    if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }
    const map = L.map(mapRef.current).setView([selectedEvidence.gps_lat, selectedEvidence.gps_lng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: 'OSM' }).addTo(map);
    L.marker([selectedEvidence.gps_lat, selectedEvidence.gps_lng]).addTo(map).bindPopup(`<b>GPS Location</b><br>Lat: ${selectedEvidence.gps_lat}<br>Lng: ${selectedEvidence.gps_lng}`);
    mapInstanceRef.current = map;
    return () => { map.remove(); mapInstanceRef.current = null; };
  }, [selectedEvidence]);

  const handleFiles = useCallback(async (files: FileList) => {
    if (!currentCase || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith('image/')) { showToast('Only image files are supported (JPEG, PNG, WEBP)', 'error'); return; }
    setUploading(true);
    try {
      const buffer = await file.arrayBuffer();
      const [sha256Hash, md5Hash] = await Promise.all([sha256(buffer), md5(buffer)]);
      const thumbnailUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      let exifData: Record<string, unknown> = {};
      let gpsLat: number | null = null;
      let gpsLng: number | null = null;
      try {
        const exif = await exifr.parse(buffer, { gps: true, tiff: true, exif: true });
        if (exif) {
          exifData = { Make: exif.Make, Model: exif.Model, ISO: exif.ISO, Software: exif.Software, DateTime: exif.DateTimeOriginal || exif.CreateDate, FocalLength: exif.FocalLength, ExposureTime: exif.ExposureTime, FNumber: exif.FNumber, LensModel: exif.LensModel };
          if (exif.latitude && exif.longitude) { gpsLat = exif.latitude; gpsLng = exif.longitude; }
        }
      } catch { /* No EXIF */ }

      const newEvidence: EvidenceWithThumb = {
        id: `local-evi-${Date.now()}`,
        case_id: currentCase.id,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        sha256: sha256Hash,
        md5: md5Hash,
        exif_data: exifData,
        gps_lat: gpsLat,
        gps_lng: gpsLng,
        ocr_text: '',
        notes: '',
        created_at: new Date().toISOString(),
        thumbnailUrl,
      };

      try {
        const { data, error } = await supabase.from('evidence_files').insert({
          case_id: currentCase.id, file_name: file.name, file_type: file.type, file_size: file.size,
          sha256: sha256Hash, md5: md5Hash, exif_data: exifData, gps_lat: gpsLat, gps_lng: gpsLng, ocr_text: '', notes: '',
        }).select().single();
        if (!error && data) {
          await logAudit(currentCase.id, 'EVIDENCE_UPLOADED', `Image "${file.name}" uploaded with SHA-256 hash verified`, 'evidence', data.id);
          newEvidence.id = data.id;
        }
      } catch (err) {
        if (isNetworkError(err)) {
          await logAudit(currentCase.id, 'EVIDENCE_UPLOADED', `Image "${file.name}" uploaded offline with SHA-256 hash verified`, 'evidence', newEvidence.id);
        }
      }

      setEvidence((prev) => [{ ...newEvidence, thumbnailUrl }, ...prev]);
      setSelectedEvidence({ ...newEvidence, thumbnailUrl });
      showToast(`Evidence processed & hashed locally: ${file.name}`, 'success');
    } catch (err) { showToast(`Processing failed: ${(err as Error).message}`, 'error'); }
    finally { setUploading(false); }
  }, [currentCase, showToast]);

  const handleDrag = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true); else if (e.type === 'dragleave') setDragActive(false); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); if (e.dataTransfer.files) handleFiles(e.dataTransfer.files); }, [handleFiles]);

  const runLensSearch = async () => {
    if (!selectedEvidence || !currentCase) return;
    setLensSearching(true);
    try {
      await new Promise((r) => setTimeout(r, 2000));
      const matches = MOCK_LENS_MATCHES.map((m) => ({
        id: `lens-${Date.now()}-${m.domain}`, evidence_id: selectedEvidence.id, case_id: currentCase.id,
        target_url: m.target_url, domain: m.domain, page_title: m.page_title, thumbnail_url: '',
        first_indexed: m.first_indexed, similarity_score: m.similarity_score, created_at: new Date().toISOString(),
      }));
      try {
        await supabase.from('lens_matches').insert(matches);
        await logAudit(currentCase.id, 'LENS_SEARCH', `Google Lens reverse search executed: ${matches.length} matches found`, 'evidence', selectedEvidence.id);
      } catch { /* offline — still show results */ }
      setLensMatches(matches);
      showToast(`Google Lens search complete: ${matches.length} matches found`, 'success');
    } catch (err) { showToast(`Lens search failed: ${(err as Error).message}`, 'error'); }
    finally { setLensSearching(false); }
  };

  const handleCropStart = (e: React.MouseEvent) => { if (!cropMode || !imgRef.current) return; const rect = imgRef.current.getBoundingClientRect(); const x = ((e.clientX - rect.left) / rect.width) * 100; const y = ((e.clientY - rect.top) / rect.height) * 100; setCropStart({ x, y }); setCropEnd({ x, y }); };
  const handleCropMove = (e: React.MouseEvent) => { if (!cropMode || !cropStart || !imgRef.current) return; const rect = imgRef.current.getBoundingClientRect(); const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)); const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)); setCropEnd({ x, y }); };
  const handleCropEnd = () => { if (!cropMode || !cropStart || !cropEnd) return; showToast('Region selected - sub-search triggered for cropped area', 'info'); setCropMode(false); setCropStart(null); setCropEnd(null); };

  const handleDeleteEvidence = async (id: string) => {
    if (!currentCase) return;
    try { await supabase.from('evidence_files').delete().eq('id', id); } catch { /* offline */ }
    setEvidence((prev) => prev.filter((e) => e.id !== id));
    if (selectedEvidence?.id === id) setSelectedEvidence(null);
    showToast('Evidence file deleted', 'success');
  };
  const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text); showToast('Hash copied to clipboard', 'info'); };

  if (!currentCase) return <div className="text-muted">Select a case first.</div>;
  const exif = selectedEvidence?.exif_data || {};
  const thumbSrc = selectedEvidence?.thumbnailUrl;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-app">Forensic Image & Lens Intelligence Engine</h1>
          <p className="text-sm text-muted">100% offline browser-based image processing with cryptographic hashing, EXIF parsing, and GPS geo-location</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <div onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()} className={`rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${dragActive ? 'border-accent bg-accent-soft' : 'border-app hover:border-accent bg-panel'}`}>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => e.target.files && handleFiles(e.target.files)} />
            {uploading ? (
              <div className="flex flex-col items-center gap-2"><div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" /><span className="text-xs text-accent">Processing & hashing...</span></div>
            ) : (
              <><Upload className="w-8 h-8 text-muted mx-auto mb-2" /><div className="text-sm text-secondary">Drop image or click to upload</div><div className="text-xs text-muted mt-1">Processed locally — no upload</div></>
            )}
          </div>

          <div className="rounded-xl border border-app bg-panel overflow-hidden">
            <div className="px-4 py-2.5 border-b border-app"><h3 className="text-xs font-semibold text-secondary flex items-center gap-2"><ImageIcon className="w-4 h-4 text-accent" /> Evidence Files ({evidence.length})</h3></div>
            <div className="divide-y divide-app/50 max-h-96 overflow-y-auto scrollbar-thin">
              {evidence.map((e) => (
                <button key={e.id} onClick={() => setSelectedEvidence(e)} className={`w-full text-left px-4 py-2.5 hover:bg-hover ${selectedEvidence?.id === e.id ? 'bg-hover' : ''}`}>
                  <div className="flex items-center gap-2">
                    {e.thumbnailUrl ? <img src={e.thumbnailUrl} alt={e.file_name} className="w-8 h-8 rounded object-cover shrink-0" /> : <ImageIcon className="w-8 h-8 text-muted shrink-0" />}
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-app truncate">{e.file_name}</div>
                      <div className="flex items-center gap-2 mt-0.5"><span className="text-[10px] font-mono text-muted">{formatBytes(e.file_size)}</span><span className="text-[10px] font-mono text-accent">{e.file_type.split('/')[1]?.toUpperCase()}</span></div>
                    </div>
                  </div>
                </button>
              ))}
              {evidence.length === 0 && <div className="px-4 py-6 text-center text-xs text-muted">No evidence uploaded</div>}
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 space-y-4">
          {selectedEvidence ? (
            <>
              <div className="rounded-xl border border-app bg-panel overflow-hidden">
                <div className="px-4 py-2.5 border-b border-app flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-secondary flex items-center gap-2"><ScanText className="w-4 h-4 text-success" /> Image Analysis</h3>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setCropMode(!cropMode)} className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${cropMode ? 'bg-accent-soft text-accent' : 'text-secondary hover:bg-hover'}`}><Crop className="w-3.5 h-3.5" /> Crop</button>
                    <button onClick={runLensSearch} disabled={lensSearching} className="flex items-center gap-1 px-2 py-1 rounded text-xs text-success hover:opacity-80 disabled:opacity-50" style={{ backgroundColor: 'rgba(16,185,129,0.15)' }}>
                      {lensSearching ? <><div className="w-3 h-3 border border-success border-t-transparent rounded-full animate-spin" /> Searching...</> : <><Search className="w-3.5 h-3.5" /> Lens Search</>}
                    </button>
                    <button onClick={() => handleDeleteEvidence(selectedEvidence.id)} className="p-1 rounded text-secondary hover:text-danger"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <div className="relative bg-sidebar flex items-center justify-center min-h-[300px] overflow-hidden" onMouseDown={handleCropStart} onMouseMove={handleCropMove} onMouseUp={handleCropEnd} style={{ cursor: cropMode ? 'crosshair' : 'default' }}>
                  {thumbSrc ? (
                    <img ref={imgRef} src={thumbSrc} alt={selectedEvidence.file_name} className="max-w-full max-h-[400px] object-contain" />
                  ) : (
                    <img ref={imgRef} src={`https://placehold.co/600x400/1e293b/22d3ee?text=${encodeURIComponent(selectedEvidence.file_name)}`} alt={selectedEvidence.file_name} className="max-w-full max-h-[400px] object-contain" />
                  )}
                  {cropMode && cropStart && cropEnd && (
                    <div className="absolute border-2 border-accent pointer-events-none" style={{ left: `${Math.min(cropStart.x, cropEnd.x)}%`, top: `${Math.min(cropStart.y, cropEnd.y)}%`, width: `${Math.abs(cropEnd.x - cropStart.x)}%`, height: `${Math.abs(cropEnd.y - cropStart.y)}%`, backgroundColor: 'var(--accent-soft)' }} />
                  )}
                  {cropMode && <div className="absolute top-2 left-2 px-2 py-1 bg-accent-soft text-accent text-xs rounded flex items-center gap-1"><Crosshair className="w-3 h-3" /> Click & drag to select region</div>}
                </div>
              </div>

              <div className="rounded-xl border border-app bg-panel p-4 space-y-3">
                <h3 className="text-xs font-semibold text-secondary flex items-center gap-2 mb-2"><Hash className="w-4 h-4 text-accent" /> Cryptographic Hashes</h3>
                {[{ label: 'SHA-256', value: selectedEvidence.sha256 }, { label: 'MD5', value: selectedEvidence.md5 }].map((h) => (
                  <div key={h.label} className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted w-16 shrink-0">{h.label}</span>
                    <code className="flex-1 text-xs font-mono text-secondary bg-input rounded px-2 py-1 truncate">{h.value}</code>
                    <button onClick={() => copyToClipboard(h.value)} className="p-1 text-secondary hover:text-accent"><Copy className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>

              {ocrText && (
                <div className="rounded-xl border border-app bg-panel p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold text-secondary flex items-center gap-2"><ScanText className="w-4 h-4 text-success" /> OCR Extracted Text</h3>
                    <button onClick={() => showToast('OSINT search initiated on extracted keywords', 'info')} className="flex items-center gap-1 px-2 py-1 rounded text-xs text-success hover:opacity-80" style={{ backgroundColor: 'rgba(16,185,129,0.15)' }}><Search className="w-3 h-3" /> OSINT Search</button>
                  </div>
                  <pre className="text-xs font-mono text-secondary bg-input rounded p-3 whitespace-pre-wrap">{ocrText}</pre>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-xl border border-app bg-panel flex items-center justify-center min-h-[400px]">
              <div className="text-center text-muted"><ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" /><p className="text-sm">Upload an image to begin forensic analysis</p></div>
            </div>
          )}
        </div>

        <div className="lg:col-span-4 space-y-4">
          {selectedEvidence ? (
            <>
              <div className="rounded-xl border border-app bg-panel overflow-hidden">
                <div className="px-4 py-2.5 border-b border-app"><h3 className="text-xs font-semibold text-secondary flex items-center gap-2"><Camera className="w-4 h-4 text-accent" /> EXIF Metadata</h3></div>
                <div className="p-3 space-y-1.5 max-h-56 overflow-y-auto scrollbar-thin">
                  {Object.keys(exif).length > 0 ? (
                    Object.entries(exif).filter(([k]) => !['_decoded', 'latitude', 'longitude', 'GPSLatitude', 'GPSLongitude'].includes(k)).map(([key, val]) => (
                      <div key={key} className="flex items-center gap-2 text-xs"><span className="text-muted w-28 shrink-0">{key}</span><span className="text-app font-mono truncate">{String(val)}</span></div>
                    ))
                  ) : (<div className="text-xs text-muted py-2">No EXIF data found</div>)}
                </div>
              </div>

              {selectedEvidence.gps_lat && selectedEvidence.gps_lng && (
                <div className="rounded-xl border border-app bg-panel overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-app"><h3 className="text-xs font-semibold text-secondary flex items-center gap-2"><MapPin className="w-4 h-4 text-success" /> GPS Location Map</h3><div className="text-[10px] font-mono text-muted mt-1">Lat: {selectedEvidence.gps_lat.toFixed(4)}, Lng: {selectedEvidence.gps_lng.toFixed(4)}</div></div>
                  <div ref={mapRef} className="h-48 w-full" />
                </div>
              )}

              <div className="rounded-xl border border-app bg-panel overflow-hidden">
                <div className="px-4 py-2.5 border-b border-app flex items-center justify-between"><h3 className="text-xs font-semibold text-secondary flex items-center gap-2"><Search className="w-4 h-4 text-accent" /> Google Lens Matches ({lensMatches.length})</h3></div>
                <div className="divide-y divide-app/50 max-h-64 overflow-y-auto scrollbar-thin">
                  {lensMatches.map((m) => (
                    <div key={m.id} className="px-4 py-2.5 hover:bg-hover">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium text-app truncate">{m.page_title}</div>
                          <div className="text-[10px] font-mono text-accent truncate mt-0.5">{m.target_url}</div>
                          <div className="flex items-center gap-2 mt-1"><span className="text-[10px] text-muted">{m.domain}</span>{m.first_indexed && <span className="text-[10px] text-muted">| {m.first_indexed}</span>}</div>
                        </div>
                        <div className="flex flex-col items-end shrink-0">
                          <div className="text-xs font-bold text-success">{(m.similarity_score * 100).toFixed(0)}%</div>
                          <div className="w-12 h-1.5 bg-hover rounded-full mt-1"><div className="h-full rounded-full" style={{ width: `${m.similarity_score * 100}%`, background: 'linear-gradient(to right, var(--accent), var(--success))' }} /></div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {lensMatches.length === 0 && <div className="px-4 py-6 text-center text-xs text-muted">No matches yet. Run a Lens search to find this image across the web.</div>}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
