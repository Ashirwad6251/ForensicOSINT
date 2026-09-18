import type { RiskLevel } from '@/lib/supabase';

const config: Record<RiskLevel, { bg: string; text: string; label: string }> = {
  low: { bg: 'rgba(16, 185, 129, 0.1)', text: 'var(--success)', label: 'LOW' },
  medium: { bg: 'rgba(245, 158, 11, 0.1)', text: 'var(--warning)', label: 'MEDIUM' },
  high: { bg: 'rgba(249, 115, 22, 0.1)', text: '#f97316', label: 'HIGH' },
  critical: { bg: 'rgba(239, 68, 68, 0.1)', text: 'var(--danger)', label: 'CRITICAL' },
};

export function RiskBadge({ level }: { level: RiskLevel }) {
  const c = config[level];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border"
      style={{ backgroundColor: c.bg, color: c.text, borderColor: c.bg }}
    >
      {c.label}
    </span>
  );
}

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: 'var(--accent-soft)', text: 'var(--accent)', label: 'ACTIVE' },
  closed: { bg: 'rgba(100, 116, 139, 0.1)', text: 'var(--text-muted)', label: 'CLOSED' },
  pending: { bg: 'rgba(245, 158, 11, 0.1)', text: 'var(--warning)', label: 'PENDING' },
  archived: { bg: 'rgba(100, 116, 139, 0.1)', text: 'var(--text-muted)', label: 'ARCHIVED' },
};

export function StatusBadge({ status }: { status: string }) {
  const c = statusConfig[status] || statusConfig.pending;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      {c.label}
    </span>
  );
}

const priorityConfig: Record<string, { text: string; label: string }> = {
  low: { text: 'var(--success)', label: 'LOW' },
  medium: { text: 'var(--warning)', label: 'MEDIUM' },
  high: { text: '#f97316', label: 'HIGH' },
  critical: { text: 'var(--danger)', label: 'CRITICAL' },
};

export function PriorityBadge({ priority }: { priority: string }) {
  const c = priorityConfig[priority] || priorityConfig.medium;
  return <span className="text-xs font-bold" style={{ color: c.text }}>{c.label}</span>;
}
