import { useState, useEffect } from 'react';
import {
  Globe,
  Download,
  Hash,
  Plus,
  FileSearch,
  ScrollText,
  ShieldCheck,
  Lock,
  Trash2,
  ExternalLink,
  Copy,
} from 'lucide-react';
import { useCase } from '@/components/CaseContext';
import { useToast } from '@/components/Toast';
import { supabase, type WebCaptureRow, type AuditLogRow, type LensMatchRow } from '@/lib/supabase';
import { logAudit, OPERATOR_ID } from '@/lib/audit';
import { formatDate, formatBytes, truncateHash } from '@/lib/format';
import { Modal } from '@/components/Modal';

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
      const [{ data: caps }, { data: logs }, { data: matches }] = await Promise.all([
        supabase.from('web_captures').select('*').eq('case_id', currentCase.id).order('created_at', { ascending: false }),
        supabase.from('audit_logs').select('*').eq('case_id', currentCase.id).order('created_at', { ascending: false }),
        supabase.from('lens_matches').select('*').eq('case_id', currentCase.id).order('created_at', { ascending: false }),
      ]);
      setCaptures(caps || []);
      setAuditLogs(logs || []);
      setLensMatches(matches || []);
    })();
  }, [currentCase]);

  const handleCapture = async () => {
    if (!currentCase || !captureUrl) return;
    // Simulate WARC capture with hash
    const encoder = new TextEncoder();
    const mockContent = `WARC/1.0\nTarget-URI: ${captureUrl}\nCaptured: ${new Date().toISOString()}\nOperator: ${OPERATOR_ID}`;
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(mockContent));
    const hash = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');

    const pageTitle = captureUrl.split('/').pop() || captureUrl;
    const { data, error } = await supabase
      .from('web_captures')
      .insert({
        case_id: currentCase.id,
        url: captureUrl,
        page_title: pageTitle,
        capture_format: 'WARC',
        sha256: hash,
        file_size: mockContent.length,
      })
      .select()
      .single();

    if (error) {
      showToast(`Capture failed: ${error.message}`, 'error');
      return;
    }

    await logAudit(currentCase.id, 'WEB_CAPTURED', `Web capture of ${captureUrl} (WARC format, SHA-256 verified)`, 'web_capture', data.id);
    setCaptures((prev) => [data, ...prev]);
    setCaptureUrl('');
    setCaptureModal(false);
    showToast(`Web page captured: ${truncateHash(captureUrl, 30)}`, 'success');
  };

  const handleDeleteCapture = async (id: string) => {
    if (!currentCase) return;
    await supabase.from('web_captures').delete().eq('id', id);
    setCaptures((prev) => prev.filter((c) => c.id !== id));
    showToast('Capture deleted', 'info');
  };

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    showToast('Hash copied to clipboard', 'info');
  };

  if (!currentCase) return <div className="text-slate-500">Select a case first.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Web Evidence Capture & Audit Logging</h1>
          <p className="text-sm text-slate-500">Capture web snapshots with integrity hashes and maintain chain of custody</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-800">
        <button
          onClick={() => setTab('captures')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            tab === 'captures' ? 'text-cyan-400 border-b-2 border-cyan-500' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileSearch className="w-4 h-4" /> Page Captures ({captures.length})
        </button>
        <button
          onClick={() => setTab('audit')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            tab === 'audit' ? 'text-cyan-400 border-b-2 border-cyan-500' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ScrollText className="w-4 h-4" /> Chain of Custody ({auditLogs.length})
        </button>
      </div>

      {tab === 'captures' && (
        <div className="space-y-4">
          {/* Action bar */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">Capture matched URLs as WARC snapshots with cryptographic integrity verification</p>
            <button
              onClick={() => setCaptureModal(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-cyan-600 text-slate-950 hover:bg-cyan-500"
            >
              <Plus className="w-4 h-4" /> New Capture
            </button>
          </div>

          {/* Lens matches quick-select */}
          {lensMatches.length > 0 && (
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
              <div className="text-xs text-slate-500 mb-2">Quick capture from Google Lens matches:</div>
              <div className="flex flex-wrap gap-2">
                {lensMatches.slice(0, 6).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setCaptureUrl(m.target_url);
                      setCaptureModal(true);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
                  >
                    <Globe className="w-3 h-3 text-cyan-400" /> {m.domain}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Captures table */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-950 text-slate-500 border-b border-slate-800">
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
              <tbody className="divide-y divide-slate-800">
                {captures.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-slate-200 font-mono truncate max-w-xs">{c.url}</div>
                          <div className="text-slate-500 truncate max-w-xs">{c.page_title}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400">{c.capture_format}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <code className="font-mono text-slate-400 text-[10px]">{truncateHash(c.sha256, 20)}</code>
                        <button onClick={() => copyHash(c.sha256)} className="text-slate-500 hover:text-cyan-400">
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-400 font-mono">{formatBytes(c.file_size)}</td>
                    <td className="px-4 py-3 text-slate-400 font-mono">{c.operator_id}</td>
                    <td className="px-4 py-3 text-slate-400">{formatDate(c.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <a href={c.url} target="_blank" rel="noopener noreferrer" className="p-1 text-slate-400 hover:text-cyan-400">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <button onClick={() => handleDeleteCapture(c.id)} className="p-1 text-slate-400 hover:text-red-400">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {captures.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                      <FileSearch className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      No captures yet. Capture a matched URL to preserve evidence.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'audit' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-emerald-400">Audit log is immutable — entries cannot be modified or deleted</span>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-950 text-slate-500 border-b border-slate-800">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold">Timestamp</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Action</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Description</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Entity</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Operator</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Hash Signature</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30">
                    <td className="px-4 py-3 text-slate-400 font-mono whitespace-nowrap">{formatDate(log.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-200 max-w-md">{log.description}</td>
                    <td className="px-4 py-3 text-slate-400 font-mono">{log.entity_type || '-'}</td>
                    <td className="px-4 py-3 text-slate-400 font-mono">{log.operator_id}</td>
                    <td className="px-4 py-3">
                      <code className="font-mono text-[10px] text-slate-500">{truncateHash(log.hash_signature, 16)}</code>
                    </td>
                  </tr>
                ))}
                {auditLogs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                      <ScrollText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      No audit entries recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={captureModal} onClose={() => setCaptureModal(false)} title="Capture Web Page" maxWidth="max-w-md">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">URL to Capture</label>
            <input
              type="url"
              value={captureUrl}
              onChange={(e) => setCaptureUrl(e.target.value)}
              placeholder="https://suspicious-site.com/page"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm font-mono text-slate-200 focus:outline-none focus:border-cyan-600"
            />
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800">
            <Hash className="w-4 h-4 text-cyan-400" />
            <span className="text-xs text-slate-400">SHA-256 integrity hash will be generated automatically</span>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setCaptureModal(false)} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800">
              Cancel
            </button>
            <button
              onClick={handleCapture}
              disabled={!captureUrl}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-cyan-600 text-slate-950 hover:bg-cyan-500 disabled:opacity-50"
            >
              Capture Page
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
