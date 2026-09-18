import { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Shield,
  Hash,
  Image as ImageIcon,
  Network,
  Share2,
  ScrollText,
  Globe,
  AlertTriangle,
} from 'lucide-react';
import jsPDF from 'jspdf';
import { useCase } from '@/components/CaseContext';
import { useToast } from '@/components/Toast';
import { supabase, type EntityRow, type EvidenceRow, type LensMatchRow, type WebCaptureRow, type AuditLogRow, type RelationshipRow } from '@/lib/supabase';
import { logAudit } from '@/lib/audit';
import { formatDate, formatBytes, truncateHash } from '@/lib/format';
import { RiskBadge, StatusBadge, PriorityBadge } from '@/components/Badges';

type ReportData = {
  entities: EntityRow[];
  evidence: EvidenceRow[];
  lensMatches: LensMatchRow[];
  captures: WebCaptureRow[];
  auditLogs: AuditLogRow[];
  relationships: RelationshipRow[];
};

export function Reporting() {
  const { currentCase } = useCase();
  const { showToast } = useToast();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!currentCase) return;
    (async () => {
      const [ents, evi, lens, caps, logs, rels] = await Promise.all([
        supabase.from('entities').select('*').eq('case_id', currentCase.id).order('created_at'),
        supabase.from('evidence_files').select('*').eq('case_id', currentCase.id).order('created_at'),
        supabase.from('lens_matches').select('*').eq('case_id', currentCase.id).order('similarity_score', { ascending: false }),
        supabase.from('web_captures').select('*').eq('case_id', currentCase.id).order('created_at'),
        supabase.from('audit_logs').select('*').eq('case_id', currentCase.id).order('created_at'),
        supabase.from('relationships').select('*').eq('case_id', currentCase.id),
      ]);
      setReportData({
        entities: ents.data || [],
        evidence: evi.data || [],
        lensMatches: lens.data || [],
        captures: caps.data || [],
        auditLogs: logs.data || [],
        relationships: rels.data || [],
      });
    })();
  }, [currentCase]);

  const generatePDF = async () => {
    if (!currentCase || !reportData) return;
    setGenerating(true);
    try {
      const doc = new jsPDF();
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 20;
      let y = margin;

      const checkPage = () => {
        if (y > pageH - 30) {
          doc.addPage();
          y = margin;
        }
      };

      // Header
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageW, 40, 'F');
      doc.setTextColor(34, 211, 238);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('FORENSIC OSINT STUDIO', margin, 18);
      doc.setFontSize(10);
      doc.setTextColor(148, 163, 184);
      doc.setFont('helvetica', 'normal');
      doc.text('Digital Forensics & OSINT Investigation Report', margin, 26);
      doc.setFontSize(8);
      doc.text(`Generated: ${new Date().toISOString()}`, pageW - margin, 26, { align: 'right' });
      y = 50;

      // Case Overview
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('1. CASE OVERVIEW', margin, y);
      y += 7;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Case Number: ${currentCase.case_number}`, margin, y); y += 5;
      doc.text(`Title: ${currentCase.title}`, margin, y); y += 5;
      doc.text(`Status: ${currentCase.status.toUpperCase()}`, margin, y); y += 5;
      doc.text(`Priority: ${currentCase.priority.toUpperCase()}`, margin, y); y += 5;
      doc.text(`Risk Score: ${currentCase.risk_score}/100`, margin, y); y += 5;
      doc.text(`Operator: ${currentCase.operator_id}`, margin, y); y += 5;
      doc.text(`Opened: ${formatDate(currentCase.created_at)}`, margin, y); y += 5;
      const descLines = doc.splitTextToSize(`Description: ${currentCase.description}`, pageW - margin * 2);
      doc.text(descLines, margin, y); y += descLines.length * 5 + 5;

      // Summary stats
      checkPage();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('2. SUMMARY STATISTICS', margin, y); y += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Total Entities: ${reportData.entities.length}`, margin, y); y += 5;
      doc.text(`Evidence Files: ${reportData.evidence.length}`, margin, y); y += 5;
      doc.text(`Google Lens Matches: ${reportData.lensMatches.length}`, margin, y); y += 5;
      doc.text(`Web Captures: ${reportData.captures.length}`, margin, y); y += 5;
      doc.text(`Relationships Mapped: ${reportData.relationships.length}`, margin, y); y += 5;
      doc.text(`Audit Log Entries: ${reportData.auditLogs.length}`, margin, y); y += 5;
      doc.text(`Flagged Assets: ${reportData.entities.filter((e) => e.flagged).length}`, margin, y); y += 10;

      // Evidence Files
      checkPage();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('3. EVIDENCE FILES & HASH VERIFICATION', margin, y); y += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      if (reportData.evidence.length === 0) {
        doc.text('No evidence files recorded.', margin, y); y += 5;
      } else {
        reportData.evidence.forEach((e, i) => {
          checkPage();
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.text(`${i + 1}. ${e.file_name}`, margin, y); y += 5;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.text(`Type: ${e.file_type} | Size: ${formatBytes(e.file_size)}`, margin, y); y += 4;
          doc.text(`SHA-256: ${e.sha256}`, margin, y); y += 4;
          doc.text(`MD5: ${e.md5}`, margin, y); y += 4;
          if (e.gps_lat) doc.text(`GPS: ${e.gps_lat.toFixed(4)}, ${e.gps_lng?.toFixed(4)}`, margin, y); y += 4;
          if (e.ocr_text) doc.text(`OCR: ${e.ocr_text.slice(0, 80)}`, margin, y); y += 6;
        });
      }

      // Google Lens Matches
      checkPage();
      y += 3;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('4. GOOGLE LENS WEB MATCHES', margin, y); y += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      if (reportData.lensMatches.length === 0) {
        doc.text('No Google Lens matches recorded.', margin, y); y += 5;
      } else {
        reportData.lensMatches.forEach((m, i) => {
          checkPage();
          doc.text(`${i + 1}. ${m.page_title}`, margin, y); y += 4;
          doc.text(`URL: ${m.target_url}`, margin, y); y += 4;
          doc.text(`Domain: ${m.domain} | Similarity: ${(m.similarity_score * 100).toFixed(0)}% | Indexed: ${m.first_indexed || 'N/A'}`, margin, y); y += 6;
        });
      }

      // Entities
      checkPage();
      y += 3;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('5. TRACKED ENTITIES', margin, y); y += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      reportData.entities.forEach((e, i) => {
        checkPage();
        doc.text(`${i + 1}. [${e.type.toUpperCase()}] ${e.value}`, margin, y); y += 4;
        doc.text(`Risk: ${e.risk_level} | Flagged: ${e.flagged ? 'YES' : 'No'} | Label: ${e.label}`, margin, y); y += 5;
      });

      // Relationships
      checkPage();
      y += 3;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('6. LINK ANALYSIS RELATIONSHIPS', margin, y); y += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      if (reportData.relationships.length === 0) {
        doc.text('No relationships mapped.', margin, y); y += 5;
      } else {
        reportData.relationships.forEach((r, i) => {
          checkPage();
          const src = reportData.entities.find((e) => e.id === r.source_entity_id);
          const tgt = reportData.entities.find((e) => e.id === r.target_entity_id);
          doc.text(`${i + 1}. ${src?.value || 'N/A'} --[${r.relation_type}]--> ${tgt?.value || 'N/A'}`, margin, y); y += 5;
        });
      }

      // Audit Log
      checkPage();
      y += 3;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('7. CHAIN OF CUSTODY AUDIT LOG', margin, y); y += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      reportData.auditLogs.forEach((log) => {
        checkPage();
        doc.text(`[${formatDate(log.created_at)}] ${log.action}: ${log.description}`, margin, y); y += 4;
        doc.text(`  Operator: ${log.operator_id} | Hash: ${truncateHash(log.hash_signature, 24)}`, margin, y); y += 5;
      });

      // Footer on each page
      const pageCount = doc.getNumberOfPages();
      for (let p = 1; p <= pageCount; p++) {
        doc.setPage(p);
        doc.setFillColor(15, 23, 42);
        doc.rect(0, pageH - 15, pageW, 15, 'F');
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(7);
        doc.text(`ForensicOSINT Studio | ${currentCase.case_number} | Page ${p}/${pageCount}`, margin, pageH - 6);
        doc.text('CONFIDENTIAL - EVIDENTIARY DOCUMENT', pageW - margin, pageH - 6, { align: 'right' });
      }

      doc.save(`forensic-report-${currentCase.case_number}.pdf`);
      await logAudit(currentCase.id, 'REPORT_GENERATED', `Case report exported as PDF (${pageCount} pages)`, 'case', currentCase.case_number);
      showToast('Case report generated and downloaded as PDF', 'success');
    } catch (err) {
      showToast(`Report generation failed: ${(err as Error).message}`, 'error');
    } finally {
      setGenerating(false);
    }
  };

  if (!currentCase) return <div className="text-slate-500">Select a case first.</div>;

  const stats = reportData
    ? {
        entities: reportData.entities.length,
        evidence: reportData.evidence.length,
        lens: reportData.lensMatches.length,
        captures: reportData.captures.length,
        relationships: reportData.relationships.length,
        audit: reportData.auditLogs.length,
        flagged: reportData.entities.filter((e) => e.flagged).length,
      }
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Forensic Case Reporting Engine</h1>
          <p className="text-sm text-slate-500">Compile investigation findings into a court-ready PDF report</p>
        </div>
        <button
          onClick={generatePDF}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-cyan-600 text-slate-950 hover:bg-cyan-500 disabled:opacity-50"
        >
          {generating ? (
            <>
              <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" /> Generate PDF Report
            </>
          )}
        </button>
      </div>

      {/* Report preview */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
        {/* Report header */}
        <div className="px-6 py-5 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-5 h-5 text-cyan-400" />
                <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest">ForensicOSINT Studio</span>
              </div>
              <h2 className="text-2xl font-bold text-slate-100">{currentCase.title}</h2>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-sm font-mono text-slate-400">{currentCase.case_number}</span>
                <StatusBadge status={currentCase.status} />
                <PriorityBadge priority={currentCase.priority} />
              </div>
            </div>
            <div className="text-right text-xs text-slate-500">
              <div>Operator: <span className="font-mono text-slate-300">{currentCase.operator_id}</span></div>
              <div className="mt-1">Generated: <span className="font-mono text-slate-300">{new Date().toLocaleString()}</span></div>
            </div>
          </div>
          <p className="text-sm text-slate-400 mt-3 max-w-4xl">{currentCase.description}</p>
        </div>

        {/* Report sections */}
        <div className="p-6 space-y-6">
          {/* Summary stats */}
          {stats && (
            <div>
              <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" /> Report Summary
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {[
                  { label: 'Entities', value: stats.entities, icon: Network, color: 'cyan' },
                  { label: 'Evidence', value: stats.evidence, icon: ImageIcon, color: 'emerald' },
                  { label: 'Lens Matches', value: stats.lens, icon: Globe, color: 'cyan' },
                  { label: 'Captures', value: stats.captures, icon: FileText, color: 'emerald' },
                  { label: 'Relationships', value: stats.relationships, icon: Share2, color: 'cyan' },
                  { label: 'Audit Entries', value: stats.audit, icon: ScrollText, color: 'emerald' },
                  { label: 'Flagged', value: stats.flagged, icon: AlertTriangle, color: 'red' },
                ].map((s) => {
                  const Icon = s.icon;
                  return (
                    <div key={s.label} className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 text-center">
                      <Icon className={`w-4 h-4 mx-auto mb-1 text-${s.color}-400`} />
                      <div className={`text-xl font-bold text-${s.color}-400`}>{s.value}</div>
                      <div className="text-[10px] text-slate-500 uppercase">{s.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Evidence preview */}
          {reportData && reportData.evidence.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                <Hash className="w-4 h-4 text-cyan-400" /> Evidence Files & Hash Verification
              </h3>
              <div className="space-y-2">
                {reportData.evidence.map((e) => (
                  <div key={e.id} className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-slate-200">{e.file_name}</span>
                      <span className="text-[10px] font-mono text-slate-500">{formatBytes(e.file_size)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-mono">
                      <span className="text-slate-500">SHA-256:</span>
                      <code className="text-cyan-400 truncate">{e.sha256}</code>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lens matches preview */}
          {reportData && reportData.lensMatches.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" /> Google Lens Web Matches
              </h3>
              <div className="rounded-lg border border-slate-800 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-950 text-slate-500">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold">Page Title</th>
                      <th className="text-left px-3 py-2 font-semibold">Domain</th>
                      <th className="text-left px-3 py-2 font-semibold">Similarity</th>
                      <th className="text-left px-3 py-2 font-semibold">First Indexed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {reportData.lensMatches.slice(0, 8).map((m) => (
                      <tr key={m.id} className="hover:bg-slate-800/30">
                        <td className="px-3 py-2 text-slate-200 truncate max-w-xs">{m.page_title}</td>
                        <td className="px-3 py-2 text-slate-400 font-mono">{m.domain}</td>
                        <td className="px-3 py-2">
                          <span className="text-emerald-400 font-bold">{(m.similarity_score * 100).toFixed(0)}%</span>
                        </td>
                        <td className="px-3 py-2 text-slate-400">{m.first_indexed || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Entity summary */}
          {reportData && reportData.entities.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                <Network className="w-4 h-4 text-cyan-400" /> Tracked Entities ({reportData.entities.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {reportData.entities.slice(0, 12).map((e) => (
                  <div key={e.id} className="rounded-lg border border-slate-800 bg-slate-950/50 p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono uppercase text-slate-500">{e.type}</span>
                      <RiskBadge level={e.risk_level} />
                    </div>
                    <div className="text-xs font-mono text-slate-200 mt-1 truncate">{e.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Audit trail preview */}
          {reportData && reportData.auditLogs.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                <ScrollText className="w-4 h-4 text-cyan-400" /> Chain of Custody Log
              </h3>
              <div className="rounded-lg border border-slate-800 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-950 text-slate-500">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold">Timestamp</th>
                      <th className="text-left px-3 py-2 font-semibold">Action</th>
                      <th className="text-left px-3 py-2 font-semibold">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {reportData.auditLogs.slice(0, 10).map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/30">
                        <td className="px-3 py-2 text-slate-400 font-mono whitespace-nowrap">{formatDate(log.created_at)}</td>
                        <td className="px-3 py-2">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-400">{log.action}</span>
                        </td>
                        <td className="px-3 py-2 text-slate-200 max-w-md">{log.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Footer notice */}
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-xs text-amber-400">
              This report contains evidentiary data with cryptographic hash verification. All actions are logged in an immutable audit trail for chain of custody compliance.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
