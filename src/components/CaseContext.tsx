import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase, type CaseRow } from '@/lib/supabase';
import { localCases, isNetworkError } from '@/lib/localCases';

const SAMPLE_CASES: CaseRow[] = [
  {
    id: 'sample-nightshade',
    case_number: 'CASE-2026-0042',
    title: 'Operation Nightshade',
    description: 'Investigation of leaked corporate credentials from Sector 7. Tracking credential dump distribution across dark web forums and paste sites.',
    status: 'active',
    priority: 'critical',
    risk_score: 78,
    operator_id: 'INVESTIGATOR-001',
    created_at: '2026-09-10T08:00:00.000Z',
    updated_at: '2026-09-20T14:30:00.000Z',
  },
  {
    id: 'sample-pixeltrace',
    case_number: 'CASE-2026-0038',
    title: 'Operation Pixel Trace',
    description: 'Geolocation and identity attribution from surveillance stills. Reverse image search and EXIF GPS correlation across social media platforms.',
    status: 'active',
    priority: 'high',
    risk_score: 52,
    operator_id: 'INVESTIGATOR-001',
    created_at: '2026-09-05T10:00:00.000Z',
    updated_at: '2026-09-18T16:00:00.000Z',
  },
  {
    id: 'sample-darkmirror',
    case_number: 'CASE-2026-0029',
    title: 'Operation Dark Mirror',
    description: 'Tracking spoofed domain infrastructure mimicking corporate login portals. DNS resolution chain and SSL certificate pivot analysis.',
    status: 'pending',
    priority: 'medium',
    risk_score: 34,
    operator_id: 'INVESTIGATOR-001',
    created_at: '2026-08-22T09:00:00.000Z',
    updated_at: '2026-09-01T11:00:00.000Z',
  },
];

type CaseContextValue = {
  currentCase: CaseRow | null;
  cases: CaseRow[];
  loading: boolean;
  switchCase: (id: string) => void;
  refreshCases: () => Promise<CaseRow[]>;
  refreshCurrentCase: () => Promise<void>;
};

const CaseContext = createContext<CaseContextValue | null>(null);

export function CaseProvider({ children }: { ReactNode }) {
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [currentCase, setCurrentCase] = useState<CaseRow | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshCases = useCallback(async (): Promise<CaseRow[]> => {
    try {
      const { data, error } = await supabase.from('cases').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      const rows = data || [];
      setCases(rows);
      return rows;
    } catch (err) {
      if (isNetworkError(err)) {
        const local = localCases.load();
        if (local.length > 0) {
          setCases(local);
          return local;
        }
        const samples = SAMPLE_CASES;
        localCases.save(samples);
        setCases(samples);
        return samples;
      }
      console.error('Failed to load cases:', err);
      return [];
    }
  }, []);

  const refreshCurrentCase = useCallback(async () => {
    if (!currentCase) return;
    try {
      const { data, error } = await supabase.from('cases').select('*').eq('id', currentCase.id).maybeSingle();
      if (error) throw error;
      if (data) setCurrentCase(data);
    } catch (err) {
      if (isNetworkError(err)) {
        const local = localCases.load();
        const found = local.find((c) => c.id === currentCase.id);
        if (found) setCurrentCase(found);
      }
    }
  }, [currentCase]);

  useEffect(() => {
    (async () => {
      const rows = await refreshCases();
      if (rows.length > 0) {
        setCurrentCase(rows[0]);
      }
      setLoading(false);
    })();
  }, [refreshCases]);

  const switchCase = useCallback((id: string) => {
    const found = cases.find((c) => c.id === id);
    if (found) setCurrentCase(found);
  }, [cases]);

  return (
    <CaseContext.Provider value={{ currentCase, cases, loading, switchCase, refreshCases, refreshCurrentCase }}>
      {children}
    </CaseContext.Provider>
  );
}

export function useCase() {
  const ctx = useContext(CaseContext);
  if (!ctx) throw new Error('useCase must be used within CaseProvider');
  return ctx;
}
