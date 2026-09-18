import {
  FolderOpen,
  Image,
  Network,
  Share2,
  FileSearch,
  FileText,
  ScrollText,
  ChevronDown,
  Shield,
  Plus,
} from 'lucide-react';
import { useState } from 'react';
import { useCase } from './CaseContext';
import { StatusBadge } from './Badges';
import { Modal } from './Modal';
import { useToast } from './Toast';
import { supabase } from '@/lib/supabase';
import { logAudit } from '@/lib/audit';

export type ModuleKey = 'dashboard' | 'image-lens' | 'recon' | 'link-analysis' | 'capture-audit' | 'reporting';

const navItems: { key: ModuleKey; label: string; icon: typeof FolderOpen }[] = [
  { key: 'dashboard', label: 'Case Dashboard', icon: FolderOpen },
  { key: 'image-lens', label: 'Image & Lens Engine', icon: Image },
  { key: 'recon', label: 'Identity & Recon', icon: Network },
  { key: 'link-analysis', label: 'Link Analysis', icon: Share2 },
  { key: 'capture-audit', label: 'Capture & Audit', icon: FileSearch },
  { key: 'reporting', label: 'Case Reporting', icon: FileText },
];

export function Sidebar({
  active,
  onNavigate,
}: {
  active: ModuleKey;
  onNavigate: (key: ModuleKey) => void;
}) {
  const { currentCase, cases, switchCase, refreshCases } = useCase();
  const { showToast } = useToast();
  const [caseDropdownOpen, setCaseDropdownOpen] = useState(false);
  const [newCaseModal, setNewCaseModal] = useState(false);
  const [newCaseData, setNewCaseData] = useState({
    title: '',
    case_number: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
  });

  const handleCreateCase = async () => {
    if (!newCaseData.title || !newCaseData.case_number) {
      showToast('Case number and title are required', 'warning');
      return;
    }
    const caseNum = `CASE-${newCaseData.case_number}`;
    const { data, error } = await supabase
      .from('cases')
      .insert({
        title: newCaseData.title,
        case_number: caseNum,
        description: newCaseData.description,
        priority: newCaseData.priority,
        status: 'active',
        risk_score: 0,
      })
      .select()
      .single();

    if (error) {
      showToast(`Failed to create case: ${error.message}`, 'error');
      return;
    }

    await logAudit(data.id, 'CASE_CREATED', `Case "${data.title}" opened`, 'case', data.case_number);
    await refreshCases();
    switchCase(data.id);
    showToast(`Case ${caseNum} created successfully`, 'success');
    setNewCaseModal(false);
    setNewCaseData({ title: '', case_number: '', description: '', priority: 'medium' });
  };

  return (
    <>
      <aside className="w-64 shrink-0 bg-sidebar border-r border-app flex flex-col h-screen sticky top-0">
        <div className="px-4 py-4 border-b border-app">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center">
              <Shield className="w-5 h-5 text-accent-on" />
            </div>
            <div>
              <div className="text-sm font-bold text-app tracking-tight">ForensicOSINT</div>
              <div className="text-[10px] text-accent font-mono tracking-widest">STUDIO v2.6</div>
            </div>
          </div>
        </div>

        {/* Case Selector */}
        <div className="px-3 py-3 border-b border-app relative">
          <div className="text-[10px] uppercase tracking-wider text-muted font-semibold mb-1.5 flex items-center gap-1">
            <ScrollText className="w-3 h-3" /> Active Case
          </div>
          <button
            onClick={() => setCaseDropdownOpen(!caseDropdownOpen)}
            className="w-full flex items-center justify-between rounded-lg bg-input border border-app px-3 py-2 hover:border-accent transition-colors"
          >
            <div className="text-left min-w-0">
              {currentCase ? (
                <>
                  <div className="text-xs font-mono text-accent truncate">{currentCase.case_number}</div>
                  <div className="text-xs text-secondary truncate">{currentCase.title}</div>
                </>
              ) : (
                <div className="text-xs text-muted">No case selected</div>
              )}
            </div>
            <ChevronDown className={`w-4 h-4 text-muted shrink-0 transition-transform ${caseDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {caseDropdownOpen && (
            <div className="absolute left-3 right-3 top-full mt-1 z-50 rounded-lg border border-app bg-panel shadow-xl max-h-64 overflow-y-auto">
              {cases.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    switchCase(c.id);
                    setCaseDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 hover:bg-hover border-b border-soft last:border-0 ${
                    currentCase?.id === c.id ? 'bg-hover' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-mono text-accent truncate">{c.case_number}</div>
                      <div className="text-xs text-secondary truncate">{c.title}</div>
                    </div>
                    <StatusBadge status={c.status} />
                  </div>
                </button>
              ))}
              <button
                onClick={() => {
                  setCaseDropdownOpen(false);
                  setNewCaseModal(true);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-accent hover:bg-hover"
              >
                <Plus className="w-4 h-4" /> Create New Case
              </button>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-3 overflow-y-auto">
          <div className="text-[10px] uppercase tracking-wider text-muted font-semibold mb-2 px-2">Investigation Modules</div>
          <div className="space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => onNavigate(item.key)}
                  className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all ${
                    isActive
                      ? 'bg-accent-soft text-accent border-l-2 border-accent'
                      : 'text-secondary hover:text-app hover:bg-hover'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Operator badge */}
        <div className="px-4 py-3 border-t border-app">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-card border border-app flex items-center justify-center">
              <span className="text-xs font-bold text-accent">I1</span>
            </div>
            <div>
              <div className="text-xs font-medium text-app">INVESTIGATOR-001</div>
              <div className="text-[10px] text-muted">DFIR Operator</div>
            </div>
          </div>
        </div>
      </aside>

      <Modal open={newCaseModal} onClose={() => setNewCaseModal(false)} title="Create New Investigation Case" maxWidth="max-w-lg">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted mb-1">Case Number</label>
            <div className="flex items-center">
              <span className="px-3 py-2 bg-card border border-app rounded-l-lg text-sm font-mono text-accent">CASE-</span>
              <input
                type="text"
                value={newCaseData.case_number}
                onChange={(e) => setNewCaseData((p) => ({ ...p, case_number: e.target.value }))}
                placeholder="2026-0099"
                className="flex-1 px-3 py-2 bg-input border border-app border-l-0 rounded-r-lg text-sm font-mono text-app focus:outline-none focus:border-accent"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted mb-1">Case Title</label>
            <input
              type="text"
              value={newCaseData.title}
              onChange={(e) => setNewCaseData((p) => ({ ...p, title: e.target.value }))}
              placeholder="Operation Codename"
              className="w-full px-3 py-2 bg-input border border-app rounded-lg text-sm text-app focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted mb-1">Description</label>
            <textarea
              value={newCaseData.description}
              onChange={(e) => setNewCaseData((p) => ({ ...p, description: e.target.value }))}
              placeholder="Brief description of the investigation scope..."
              rows={3}
              className="w-full px-3 py-2 bg-input border border-app rounded-lg text-sm text-app focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted mb-1">Priority</label>
            <div className="flex gap-2">
              {(['low', 'medium', 'high', 'critical'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setNewCaseData((prev) => ({ ...prev, priority: p }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    newCaseData.priority === p
                      ? 'bg-accent-soft border-accent text-accent'
                      : 'bg-input border-app text-secondary hover:border-app'
                  }`}
                >
                  {p.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setNewCaseModal(false)}
              className="px-4 py-2 rounded-lg text-sm text-secondary hover:text-app hover:bg-hover"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateCase}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-accent text-accent-on hover:opacity-90"
            >
              Create Case
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
