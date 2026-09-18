import { useState, useRef, useEffect } from 'react';
import { Palette, Check, ChevronDown } from 'lucide-react';
import { useTheme, themeList, type ThemeKey } from './ThemeContext';

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const current = themeList.find((t) => t.key === theme)!;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-app bg-card text-sm text-secondary hover:text-accent hover:border-accent transition-colors"
      >
        <Palette className="w-4 h-4" />
        <span className="hidden sm:inline font-medium">{current.label}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-64 rounded-xl border border-app bg-panel shadow-2xl overflow-hidden">
          <div className="px-3 py-2 border-b border-soft">
            <span className="text-[10px] uppercase tracking-wider text-muted font-semibold">Visual Theme</span>
          </div>
          {themeList.map((t) => {
            const isActive = theme === t.key;
            return (
              <button
                key={t.key}
                onClick={() => {
                  setTheme(t.key as ThemeKey);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-hover transition-colors ${
                  isActive ? 'bg-accent-soft' : ''
                }`}
              >
                <div className="flex gap-1 shrink-0">
                  {t.swatch.map((c, i) => (
                    <span key={i} className="w-4 h-4 rounded-full border border-app" style={{ backgroundColor: c }} />
                  ))}
                </div>
                <div className="text-left flex-1 min-w-0">
                  <div className={`text-sm font-medium ${isActive ? 'text-accent' : 'text-app'}`}>{t.label}</div>
                  <div className="text-[10px] text-muted">{t.description}</div>
                </div>
                {isActive && <Check className="w-4 h-4 text-accent shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
