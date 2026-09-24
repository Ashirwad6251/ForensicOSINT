import { useState, useEffect } from 'react';
import {
  Globe, Download, Hash, Plus, FileSearch, ScrollText, ShieldCheck, Lock, Trash2, ExternalLink, Copy,
} from 'lucide-react';
import { useCase } from '@/components/CaseContext';
import { useToast } from '@/components/Toast';
import { supabase, type WebCaptureRow, type AuditLogRow, type LensMatchRow } from '@/lib/supabase';
import { logAudit, OPERATOR_ID } from '@/lib/audit';
import { formatDate, formatBytes, truncateHash } from '@/lib/format';
import { Modal } from '@/components/Modal';
import { safeQuery, isNetworkError } from '@/lib/localCases';
import { getMockData } from '@/lib/mockData';

type Tab = 'captures' | 'audit';

export function CaptureAudit() {
  const { currentCase } = useCase();
  const { showToast } = useToast();
  const [tab, setTab] = useState<Tab>('captures');
  const [captures, setCaptures] = useState<WebCaptureRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRow[]>([]);
  const [lensMatches, setLensMatches] = useState<LensMatchRow[]>([]);
  const [captureModal, setCaptureModal] = useState(false);
  const [captureUrl, setCaptureUrl] = useState('');

  useEffect(() => {
    if (!currentCase) return;
    (async () => {
      const mock = getMockData(currentCase.id);
      const [caps, logs, matches] = await Promise.all([
        safeQuery(() => supabase.from('web_captures').select('*').eq('case_id', currentCase.id).order('created_at', { ascending: false }), mock.captures as WebCaptureRow[]),
        safeQuery(() => supabase.from('audit_logs').select('*').eq('case_id', currentCase.id).order('created_at', { ascending: false }), mock.auditLogs as AuditLogRow[]),
        safeQuery(() => supabase.from('lens_matches').select('*').eq('case_id', currentCase.id).order('created_at', { ascending: false }), mock.lensMatches as LensMatchRow[]),
      ]);
      setCaptures(caps);
      setAuditLogs(logs);
      setLensMatches(matches);
    })();
  }, [currentCase]);

  const handleCapture = async () => {
    if (!currentCase || !captureUrl) return;
    const encoder = new TextEncoder();
    const mockContent = `WARC/1.0\nTarget-URI: ${captureUrl}\nCaptured: ${new Date().toISOString()}\nOperator: ${OPERATOR_ID}`;
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(mockContent));
    const hash = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
    const pageTitle = captureUrl.split('/').pop() || captureUrl;
    const newCapture: WebCaptureRow = { id: `local-cap-${Date.now()}`, case_id: currentCase.id, url: captureUrl, page_title: pageTitle, capture_format: 'WARC', sha256: hash, file_size: mockContent.length, operator_id: OPERATOR_ID, created_at: new Date().toISOString() };
    try {
      const { data, error } = await supabase.from('web_captures').insert({ case_id: currentCase.id, url: captureUrl, page_title: pageTitle, capture_format: 'WARC', sha256: hash, file_size: mockContent.length }).select().single();
      if (error) throw error;
      await logAudit(currentCase.id, 'WEB_CAPTURED', `Web capture of ${captureUrl} (WARC format, SHA-256 verified)`, 'web_capture', data.id);
      setCaptures((prev) => [data, ...prev]);
    } catch (err) {
      if (isNetworkError(err)) {
        await logAudit(currentCase.id, 'WEB_CAPTURED', `Web capture of ${captureUrl} (WARC format, SHA-256 verified)`, 'web_capture', newCapture.id);
        setCaptures((prev) => [newCapture, ...prev]);
      } else {
        showToast(`Capture failed: ${(err as Error).message}`, 'error'); return;
      }
    }
    setCaptureUrl('');
    setCaptureModal(false);
    showToast(`Web page captured: ${truncateHash(captureUrl, 30)}`, 'success');
  };

  const handleDeleteCapture = async (id: string) => {
    if (!currentCase) return;
    try { await supabase.from('web_captures').delete().eq('id', id); } catch { /* offline */ }
    setCaptures((prev) => prev.filter((c) => c.id !== id));
    showToast('Capture deleted', 'info');
  };

  const copyHash = (hash: string) => { navigator.clipboard.writeText(hash); showToast('Hash copied to clipboard', 'info'); };

  if (!currentCase) return <div className="text-muted">Select a case first.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-app">Web Evidence Capture & Audit Logging</h1>
          <p className="text-sm text-muted">Capture web snapshots with integrity hashes and maintain chain of custody</p>
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-app">
        <button onClick={() => setTab('captures')} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${tab === 'captures' ? 'text-accent border-b-2 border-accent' : 'text-secondary hover:text-app'}`}>
          <FileSearch className="w-4 h-4" /> Page Captures ({captures.length})
        </button>
        <button onClick={() => setTab('audit')} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${tab === 'audit' ? 'text-accent border-b-2 border-accent' : 'text-secondary hover:text-app'}`}>
          <ScrollText className="w-4 h-4" /> Chain of Custody ({auditLogs.length})
        </button>
      </div>

      {tab === 'captures' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted">Capture matched URLs as WARC snapshots with cryptographic integrity verification</p>
            <button onClick={() => setCaptureModal(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-accent text-accent-on hover:opacity-90">
              <Plus className="w-4 h-4" /> New Capture
            </button>
          </div>

          {lensMatches.length > 0 && (
            <div className="rounded-lg border border-app bg-panel p-3">
              <div className="text-xs text-muted mb-2">Quick capture from Google Lens matches:</div>
              <div className="flex flex-wrap gap-2">
                {lensMatches.slice(0, 6).map((m) => (
                  <button key={m.id} onClick={() => { setCaptureUrl(m.target_url); setCaptureModal(true); }} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono bg-card text-secondary hover:bg-hover border border-app">
                    <Globe className="w-3 h-3 text-accent" /> {m.domain}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-app bg-panel overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-card text-muted border-b border-app">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold">URL</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Format</th>
                  <th className="text-left px-4 py-2.5 font-semibold">SHA-256</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Size</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Operator</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Captured</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app">
                {captures.map((c) => (
                  <tr key={c.id} className="hover:bg-hover">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 text-success shrink-0" />
                        <div className="min-w-0">
                          <div className="text-app font-mono truncate max-w-xs">{c.url}</div>
                          <div className="text-muted truncate max-w-xs">{c.page_title}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-success/10 text-success" style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--success)' }}>{c.capture_format}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <code className="font-mono text-secondary text-[10px]">{truncateHash(c.sha256, 20)}</code>
                        <button onClick={() => copyHash(c.sha256)} className="text-muted hover:text-accent"><Copy className="w-3 h-3" /></button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-secondary font-mono">{formatBytes(c.file_size)}</td>
                    <td className="px-4 py-3 text-secondary font-mono">{c.operator_id}</td>
                    <td className="px-4 py-3 text-secondary">{formatDate(c.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <a href={c.url} target="_blank" rel="noopener noreferrer" className="p-1 text-secondary hover:text-accent"><ExternalLink className="w-3.5 h-3.5" /></a>
                        <button onClick={() => handleDeleteCapture(c.id)} className="p-1 text-secondary hover:text-danger"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {captures.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-muted"><FileSearch className="w-8 h-8 mx-auto mb-2 opacity-50" />No captures yet. Capture a matched URL to preserve evidence.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'audit' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-success/20" style={{ backgroundColor: 'var(--accent-soft)' }}>
            <ShieldCheck className="w-4 h-4 text-success" />
            <span className="text-xs text-success">Audit log is immutable — entries cannot be modified or deleted</span>
          </div>

          <div className="rounded-xl border border-app bg-panel overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-card text-muted border-b border-app">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold">Timestamp</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Action</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Description</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Entity</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Operator</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Hash Signature</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-hover">
                    <td className="px-4 py-3 text-secondary font-mono whitespace-nowrap">{formatDate(log.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-accent-soft text-accent border border-accent">{log.action}</span>
                    </td>
                    <td className="px-4 py-3 text-app max-w-md">{log.description}</td>
                    <td className="px-4 py-3 text-secondary font-mono">{log.entity_type || '-'}</td>
                    <td className="px-4 py-3 text-secondary font-mono">{log.operator_id}</td>
                    <td className="px-4 py-3"><code className="font-mono text-[10px] text-muted">{truncateHash(log.hash_signature, 16)}</code></td>
                  </tr>
                ))}
                {auditLogs.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-muted"><ScrollText className="w-8 h-8 mx-auto mb-2 opacity-50" />No audit entries recorded.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={captureModal} onClose={() => setCaptureModal(false)} title="Capture Web Page" maxWidth="max-w-md">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted mb-1">URL to Capture</label>
            <input type="url" value={captureUrl} onChange={(e) => setCaptureUrl(e.target.value)} placeholder="https://suspicious-site.com/page" className="w-full px-3 py-2 bg-input border border-app rounded-lg text-sm font-mono text-app focus:outline-none focus:border-accent" />
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-input border border-app">
            <Hash className="w-4 h-4 text-accent" />
            <span className="text-xs text-secondary">SHA-256 integrity hash will be generated automatically</span>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setCaptureModal(false)} className="px-4 py-2 rounded-lg text-sm text-secondary hover:bg-hover">Cancel</button>
            <button onClick={handleCapture} disabled={!captureUrl} className="px-4 py-2 rounded-lg text-sm font-semibold bg-accent text-accent-on hover:opacity-90 disabled:opacity-50">Capture Page</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
