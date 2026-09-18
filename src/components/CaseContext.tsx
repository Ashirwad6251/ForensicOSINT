import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase, type CaseRow } from '@/lib/supabase';

type CaseContextValue = {
  currentCase: CaseRow | null;
  cases: CaseRow[];
  loading: boolean;
  switchCase: (id: string) => void;
  refreshCases: () => Promise<CaseRow[]>;
  refreshCurrentCase: () => Promise<void>;
};

const CaseContext = createContext<CaseContextValue | null>(null);

export function CaseProvider({ children }: { children: ReactNode }) {
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [currentCase, setCurrentCase] = useState<CaseRow | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshCases = useCallback(async (): Promise<CaseRow[]> => {
    const { data, error } = await supabase.from('cases').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('Failed to load cases:', error);
      return [];
    }
    const rows = data || [];
    setCases(rows);
    return rows;
  }, []);

  const refreshCurrentCase = useCallback(async () => {
    if (!currentCase) return;
    const { data } = await supabase.from('cases').select('*').eq('id', currentCase.id).maybeSingle();
    if (data) setCurrentCase(data);
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
