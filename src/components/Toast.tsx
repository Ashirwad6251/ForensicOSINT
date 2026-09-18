import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { CheckCircle, AlertTriangle, Info, X, XCircle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

type Toast = {
  id: string;
  type: ToastType;
  message: string;
};

type ToastContextValue = {
  showToast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 w-96 max-w-[calc(100vw-2rem)]">
        {toasts.map((t) => {
          const icons = {
            success: <CheckCircle className="w-5 h-5" style={{ color: 'var(--success)' }} />,
            error: <XCircle className="w-5 h-5" style={{ color: 'var(--danger)' }} />,
            info: <Info className="w-5 h-5" style={{ color: 'var(--accent)' }} />,
            warning: <AlertTriangle className="w-5 h-5" style={{ color: 'var(--warning)' }} />,
          };
          const borderColors = {
            success: 'var(--success)',
            error: 'var(--danger)',
            info: 'var(--accent)',
            warning: 'var(--warning)',
          };
          return (
            <div
              key={t.id}
              className="flex items-center gap-3 rounded-lg border bg-panel/95 backdrop-blur px-4 py-3 shadow-xl animate-slide-in"
              style={{ borderColor: borderColors[t.type] }}
            >
              {icons[t.type]}
              <span className="text-sm text-app flex-1">{t.message}</span>
              <button onClick={() => dismiss(t.id)} className="text-muted hover:text-app">
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
