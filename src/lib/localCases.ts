import { supabase, type CaseRow } from './supabase';

const LS_KEY = 'forensicosint-cases';

function isNetworkError(err: unknown): boolean {
  if (!err) return false;
  const msg = String((err as { message?: string }).message ?? err);
  return /Load failed|Failed to fetch|NetworkError|network/i.test(msg);
}

function loadLocalCases(): CaseRow[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CaseRow[];
  } catch {
    return [];
  }
}

function saveLocalCases(rows: CaseRow[]): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(rows));
  } catch {
    /* ignore quota errors */
  }
}

function upsertLocalCase(row: CaseRow): CaseRow[] {
  const rows = loadLocalCases();
  const idx = rows.findIndex((r) => r.id === row.id);
  if (idx >= 0) rows[idx] = row;
  else rows.unshift(row);
  saveLocalCases(rows);
  return rows;
}

export const localCases = {
  load: loadLocalCases,
  save: saveLocalCases,
  upsert: upsertLocalCase,
};

export { isNetworkError };
