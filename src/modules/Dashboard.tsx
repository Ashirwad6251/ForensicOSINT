import { useState, useEffect } from 'react';
import {
  FolderOpen,
  FileImage,
  Flag,
  Gauge,
  Plus,
  Pencil,
  ArrowRight,
} from 'lucide-react';
import { useCase } from '@/components/CaseContext';
import { StatusBadge, PriorityBadge, RiskBadge } from '@/components/Badges';
import { Modal } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { supabase, type EntityRow, type EvidenceRow, type CaseRow } from '@/lib/supabase';
import { logAudit } from '@/lib/audit';
import { formatDate, formatBytes } from '@/lib/format';

export function Dashboard() {
  const { currentCase, cases, refreshCases, refreshCurrentCase } = useCase();
  const { showToast } = useToast();
  const [stats, setStats] = useState({ entities: 0, evidence: 0, flagged: 0 });
  const [recentAudit, setRecentAudit] = useState<{ action: string; description: string; created_at: string }[]>([]);
  const [editModal, setEditModal] = useState(false);
  const [editData, setEditData] = useState({
    title: '',
    description: '',
    status: 'active' as 'active' | 'closed' | 'pending' | 'archived',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    risk_score: 0,
  });

  useEffect(() => {
    if (!currentCase) return;
    (async () => {
      const [{ count: entityCount }, { count: evidenceCount }, { count: flaggedCount }] = await Promise.all([
        supabase.from('entities').select('*', { count: 'exact', head: true }).eq('case_id', currentCase.id),
        supabase.from('evidence_files').select('*', { count: 'exact', head: true }).eq('case_id', currentCase.id),
        supabase.from('entities').select('*', { count: 'exact', head: true }).eq('case_id', currentCase.id).eq('flagged', true),
      ]);
      setStats({
        entities: entityCount || 0,
        evidence: evidenceCount || 0,
        flagged: flaggedCount || 0,
      });

      const { data: audit } = await supabase
        .from('audit_logs')
        .select('action, description, created_at')
        .eq('case_id', currentCase.id)
        .order('created_at', { ascending: false })
        .limit(8);
      setRecentAudit(audit || []);
    })();
  }, [currentCase]);

  const handleEdit = async () => {
    if (!currentCase) return;
    const { error } = await supabase
      .from('cases')
      .update({
        title: editData.title,
        description: editData.description,
        status: editData.status,
        priority: editData.priority,
        risk_score: editData.risk_score,
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentCase.id);

    if (error) {
      showToast(`Failed to update case: ${error.message}`, 'error');
      return;
    }

    await logAudit(currentCase.id, 'CASE_UPDATED', `Case "${editData.title}" details updated`, 'case', currentCase.case_number);
    await refreshCases();
    await refreshCurrentCase();
    showToast('Case updated successfully', 'success');
    setEditModal(false);
  };

  const openEdit = () => {
    if (!currentCase) return;
    setEditData({
      title: currentCase.title,
      description: currentCase.description,
      status: currentCase.status,
      priority: currentCase.priority,
      risk_score: currentCase.risk_score,
    });
    setEditModal(true);
  };

  if (!currentCase) {
    return (
      <div className="flex items-center justify-center h-full text-muted">
        Select or create a case to begin.
      </div>
    );
  }

  const cards = [
    { label: 'Total Entities', value: stats.entities, icon: FolderOpen, color: 'cyan', desc: 'Tracked IOCs' },
    { label: 'Evidence Files', value: stats.evidence, icon: FileImage, color: 'emerald', desc: 'Hashed & verified' },
    { label: 'Flagged Assets', value: stats.flagged, icon: Flag, color: 'red', desc: 'Requires attention' },
    { label: 'Risk Score', value: currentCase.risk_score, icon: Gauge, color: 'amber', desc: 'Composite score' },
  ];

  const colorMap: Record<string, { bg: string; text: string; border: string; glow: string }> = {
    cyan: { bg: 'bg-accent-soft', text: 'text-accent', border: 'border-accent', glow: '' },
    emerald: { bg: 'bg-emerald-500/10', text: 'text-success', border: 'border-emerald-500/30', glow: '' },
    red: { bg: 'bg-danger-soft', text: 'text-danger', border: 'border-danger', glow: '' },
    amber: { bg: 'bg-amber-500/10', text: 'text-warning', border: 'border-amber-500/30', glow: '' },
  };

  return (
    <div className="space-y-6">
      {/* Case Header */}
      <div className="rounded-xl border border-app bg-panel p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <span className="text-sm font-mono text-accent">{currentCase.case_number}</span>
              <StatusBadge status={currentCase.status} />
              <PriorityBadge priority={currentCase.priority} />
            </div>
            <h1 className="text-2xl font-bold text-app">{currentCase.title}</h1>
            <p className="text-sm text-secondary mt-2 max-w-3xl">{currentCase.description}</p>
            <div className="flex items-center gap-4 mt-3 text-xs text-muted">
              <span>Opened: {formatDate(currentCase.created_at)}</span>
              <span>Operator: {currentCase.operator_id}</span>
              <span>Last Updated: {formatDate(currentCase.updated_at)}</span>
            </div>
          </div>
          <button
            onClick={openEdit}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-app bg-hover text-sm text-secondary hover:border-accent hover:text-accent"
          >
            <Pencil className="w-4 h-4" /> Edit Case
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const c = colorMap[card.color];
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={`rounded-xl border ${c.border} ${c.bg} p-5 shadow-lg ${c.glow} transition-all hover:scale-[1.02]`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg ${c.bg} border ${c.border} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${c.text}`} />
                </div>
                <span className={`text-3xl font-bold ${c.text}`}>{card.value}</span>
              </div>
              <div className="text-sm font-semibold text-app">{card.label}</div>
              <div className="text-xs text-muted mt-0.5">{card.desc}</div>
            </div>
          );
        })}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Cases */}
        <div className="lg:col-span-2 rounded-xl border border-app bg-panel overflow-hidden">
          <div className="px-5 py-3 border-b border-app flex items-center justify-between">
            <h3 className="text-sm font-semibold text-app">All Investigation Cases</h3>
            <span className="text-xs text-muted">{cases.length} total</span>
          </div>
          <div className="divide-y divide-app/50">
            {cases.map((c: CaseRow) => (
              <div
                key={c.id}
                className={`flex items-center gap-4 px-5 py-3 hover:bg-hover transition-colors ${
                  c.id === currentCase.id ? 'bg-hover' : ''
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-accent">{c.case_number}</span>
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="text-sm text-app truncate mt-0.5">{c.title}</div>
                </div>
                <RiskBadge level={c.risk_score >= 70 ? 'critical' : c.risk_score >= 40 ? 'high' : c.risk_score >= 20 ? 'medium' : 'low'} />
                <div className="text-right">
                  <div className="text-xs text-muted">Risk</div>
                  <div className="text-lg font-bold text-warning">{c.risk_score}</div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted" />
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-xl border border-app bg-panel overflow-hidden">
          <div className="px-5 py-3 border-b border-app">
            <h3 className="text-sm font-semibold text-app">Chain of Custody Log</h3>
            <p className="text-xs text-muted mt-0.5">Recent audit trail entries</p>
          </div>
          <div className="divide-y divide-app/50 max-h-96 overflow-y-auto scrollbar-thin">
            {recentAudit.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-muted">No activity logged</div>
            ) : (
              recentAudit.map((log, i) => (
                <div key={i} className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-accent-soft text-accent border border-accent">
                      {log.action}
                    </span>
                    <span className="text-[10px] text-muted">{formatDate(log.created_at)}</span>
                  </div>
                  <p className="text-xs text-secondary mt-1">{log.description}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title={`Edit Case ${currentCase.case_number}`} maxWidth="max-w-lg">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1">Title</label>
            <input
              type="text"
              value={editData.title}
              onChange={(e) => setEditData((p) => ({ ...p, title: e.target.value }))}
              className="w-full px-3 py-2 bg-panel border border-app rounded-lg text-sm text-app focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1">Description</label>
            <textarea
              value={editData.description}
              onChange={(e) => setEditData((p) => ({ ...p, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 bg-panel border border-app rounded-lg text-sm text-app focus:outline-none focus:border-accent"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1">Status</label>
              <select
                value={editData.status}
                onChange={(e) => setEditData((p) => ({ ...p, status: e.target.value as 'active' | 'closed' | 'pending' | 'archived' }))}
                className="w-full px-3 py-2 bg-panel border border-app rounded-lg text-sm text-app focus:outline-none focus:border-accent"
              >
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="closed">Closed</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1">Priority</label>
              <select
                value={editData.priority}
                onChange={(e) => setEditData((p) => ({ ...p, priority: e.target.value as 'low' | 'medium' | 'high' | 'critical' }))}
                className="w-full px-3 py-2 bg-panel border border-app rounded-lg text-sm text-app focus:outline-none focus:border-accent"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1">Risk Score: {editData.risk_score}</label>
            <input
              type="range"
              min="0"
              max="100"
              value={editData.risk_score}
              onChange={(e) => setEditData((p) => ({ ...p, risk_score: parseInt(e.target.value) }))}
              className="w-full accent-cyan-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setEditModal(false)} className="px-4 py-2 rounded-lg text-sm text-secondary hover:text-app hover:bg-hover">
              Cancel
            </button>
            <button onClick={handleEdit} className="px-4 py-2 rounded-lg text-sm font-semibold bg-accent text-accent-on hover:bg-accent">
              Save Changes
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
