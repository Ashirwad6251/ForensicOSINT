import { useState, useEffect } from 'react';
import {
  FileText, Download, Shield, Hash, Image as ImageIcon, Network, Share2, ScrollText, Globe, AlertTriangle,
} from 'lucide-react';
import jsPDF from 'jspdf';
import { useCase } from '@/components/CaseContext';
import { useToast } from '@/components/Toast';
import { supabase, type EntityRow, type EvidenceRow, type LensMatchRow, type WebCaptureRow, type AuditLogRow, type RelationshipRow } from '@/lib/supabase';
import { logAudit } from '@/lib/audit';
import { formatDate, formatBytes, truncateHash } from '@/lib/format';
import { RiskBadge, StatusBadge, PriorityBadge } from '@/components/Badges';
import { safeQuery } from '@/lib/localCases';
import { getMockData } from '@/lib/mockData';

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
      const mock = getMockData(currentCase.id);
      const [ents, evi, lens, caps, logs, rels] = await Promise.all([
        safeQuery(() => supabase.from('entities').select('*').eq('case_id', currentCase.id).order('created_at'), mock.entities as EntityRow[]),
        safeQuery(() => supabase.from('evidence_files').select('*').eq('case_id', currentCase.id).order('created_at'), mock.evidence as EvidenceRow[]),
        safeQuery(() => supabase.from('lens_matches').select('*').eq('case_id', currentCase.id).order('similarity_score', { ascending: false }), mock.lensMatches as LensMatchRow[]),
        safeQuery(() => supabase.from('web_captures').select('*').eq('case_id', currentCase.id).order('created_at'), mock.captures as WebCaptureRow[]),
        safeQuery(() => supabase.from('audit_logs').select('*').eq('case_id', currentCase.id).order('created_at'), mock.auditLogs as AuditLogRow[]),
        safeQuery(() => supabase.from('relationships').select('*').eq('case_id', currentCase.id), mock.relationships as RelationshipRow[]),
      ]);
      setReportData({ entities: ents, evidence: evi, lensMatches: lens, captures: caps, auditLogs: logs, relationships: rels });
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
        if (y > pageH - 30) { doc.addPage(); y = margin; }
      };

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

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('1. CASE OVERVIEW', margin, y); y += 7;
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

  if (!currentCase) return <div className="text-muted">Select a case first.</div>;

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

  const statItems = [
    { label: 'Entities', value: stats?.entities ?? 0, icon: Network, color: 'var(--accent)' },
    { label: 'Evidence', value: stats?.evidence ?? 0, icon: ImageIcon, color: 'var(--success)' },
    { label: 'Lens Matches', value: stats?.lens ?? 0, icon: Globe, color: 'var(--accent)' },
    { label: 'Captures', value: stats?.captures ?? 0, icon: FileText, color: 'var(--success)' },
    { label: 'Relationships', value: stats?.relationships ?? 0, icon: Share2, color: 'var(--accent)' },
    { label: 'Audit Entries', value: stats?.audit ?? 0, icon: ScrollText, color: 'var(--success)' },
    { label: 'Flagged', value: stats?.flagged ?? 0, icon: AlertTriangle, color: 'var(--danger)' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-app">Forensic Case Reporting Engine</h1>
          <p className="text-sm text-muted">Compile investigation findings into a court-ready PDF report</p>
        </div>
        <button onClick={generatePDF} disabled={generating} className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-accent text-accent-on hover:opacity-90 disabled:opacity-50">
          {generating ? (
            <><div className="w-4 h-4 border-2 border-accent-on border-t-transparent rounded-full animate-spin" /> Generating...</>
          ) : (
            <><Download className="w-4 h-4" /> Generate PDF Report</>
          )}
        </button>
      </div>

      <div className="rounded-xl border border-app bg-panel overflow-hidden">
        <div className="px-6 py-5 border-b border-app bg-card">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-5 h-5 text-accent" />
                <span className="text-xs font-mono text-accent uppercase tracking-widest">ForensicOSINT Studio</span>
              </div>
              <h2 className="text-2xl font-bold text-app">{currentCase.title}</h2>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-sm font-mono text-secondary">{currentCase.case_number}</span>
                <StatusBadge status={currentCase.status} />
                <PriorityBadge priority={currentCase.priority} />
              </div>
            </div>
            <div className="text-right text-xs text-muted">
              <div>Operator: <span className="font-mono text-secondary">{currentCase.operator_id}</span></div>
              <div className="mt-1">Generated: <span className="font-mono text-secondary">{new Date().toLocaleString()}</span></div>
            </div>
          </div>
          <p className="text-sm text-secondary mt-3 max-w-4xl">{currentCase.description}</p>
        </div>

        <div className="p-6 space-y-6">
          {stats && (
            <div>
              <h3 className="text-sm font-semibold text-secondary mb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-accent" /> Report Summary</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {statItems.map((s) => {
                  const Icon = s.icon;
                  return (
                    <div key={s.label} className="rounded-lg border border-app bg-card p-3 text-center">
                      <Icon className="w-4 h-4 mx-auto mb-1" style={{ color: s.color }} />
                      <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
                      <div className="text-[10px] text-muted uppercase">{s.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {reportData && reportData.evidence.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-secondary mb-3 flex items-center gap-2"><Hash className="w-4 h-4 text-accent" /> Evidence Files & Hash Verification</h3>
              <div className="space-y-2">
                {reportData.evidence.map((e) => (
                  <div key={e.id} className="rounded-lg border border-app bg-card p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-app">{e.file_name}</span>
                      <span className="text-[10px] font-mono text-muted">{formatBytes(e.file_size)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-mono">
                      <span className="text-muted">SHA-256:</span>
                      <code className="text-accent truncate">{e.sha256}</code>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {reportData && reportData.lensMatches.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-secondary mb-3 flex items-center gap-2"><Globe className="w-4 h-4 text-accent" /> Google Lens Web Matches</h3>
              <div className="rounded-lg border border-app overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-card text-muted">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold">Page Title</th>
                      <th className="text-left px-3 py-2 font-semibold">Domain</th>
                      <th className="text-left px-3 py-2 font-semibold">Similarity</th>
                      <th className="text-left px-3 py-2 font-semibold">First Indexed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-app">
                    {reportData.lensMatches.slice(0, 8).map((m) => (
                      <tr key={m.id} className="hover:bg-hover">
                        <td className="px-3 py-2 text-app truncate max-w-xs">{m.page_title}</td>
                        <td className="px-3 py-2 text-secondary font-mono">{m.domain}</td>
                        <td className="px-3 py-2"><span className="text-success font-bold">{(m.similarity_score * 100).toFixed(0)}%</span></td>
                        <td className="px-3 py-2 text-secondary">{m.first_indexed || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {reportData && reportData.entities.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-secondary mb-3 flex items-center gap-2"><Network className="w-4 h-4 text-accent" /> Tracked Entities ({reportData.entities.length})</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {reportData.entities.slice(0, 12).map((e) => (
                  <div key={e.id} className="rounded-lg border border-app bg-card p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono uppercase text-muted">{e.type}</span>
                      <RiskBadge level={e.risk_level} />
                    </div>
                    <div className="text-xs font-mono text-app mt-1 truncate">{e.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {reportData && reportData.auditLogs.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-secondary mb-3 flex items-center gap-2"><ScrollText className="w-4 h-4 text-accent" /> Chain of Custody Log</h3>
              <div className="rounded-lg border border-app overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-card text-muted">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold">Timestamp</th>
                      <th className="text-left px-3 py-2 font-semibold">Action</th>
                      <th className="text-left px-3 py-2 font-semibold">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-app">
                    {reportData.auditLogs.slice(0, 10).map((log) => (
                      <tr key={log.id} className="hover:bg-hover">
                        <td className="px-3 py-2 text-secondary font-mono whitespace-nowrap">{formatDate(log.created_at)}</td>
                        <td className="px-3 py-2"><span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-accent-soft text-accent">{log.action}</span></td>
                        <td className="px-3 py-2 text-app max-w-md">{log.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="rounded-lg border border-warning p-3 flex items-center gap-2" style={{ backgroundColor: 'var(--accent-soft)', borderColor: 'var(--warning)' }}>
            <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
            <span className="text-xs text-warning">
              This report contains evidentiary data with cryptographic hash verification. All actions are logged in an immutable audit trail for chain of custody compliance.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
