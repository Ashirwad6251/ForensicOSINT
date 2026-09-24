import { useState } from 'react';
import { Activity, Clock } from 'lucide-react';
import { ThemeProvider, useTheme } from '@/components/ThemeContext';
import { CaseProvider, useCase } from '@/components/CaseContext';
import { ToastProvider } from '@/components/Toast';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { Sidebar, type ModuleKey } from '@/components/Sidebar';
import { Dashboard } from '@/modules/Dashboard';
import { ImageLensEngine } from '@/modules/ImageLensEngine';
import { ReconEngine } from '@/modules/ReconEngine';
import { LinkAnalysis } from '@/modules/LinkAnalysis';
import { CaptureAudit } from '@/modules/CaptureAudit';
import { Reporting } from '@/modules/Reporting';
import { PublicOSINTHub } from '@/modules/PublicOSINTHub';

const moduleTitles: Record<ModuleKey, string> = {
  dashboard: 'Case Dashboard',
  'image-lens': 'Image & Lens Engine',
  recon: 'Identity & Recon',
  'link-analysis': 'Link Analysis',
  'capture-audit': 'Capture & Audit',
  reporting: 'Case Reporting',
  'osint-hub': 'Public OSINT Hub',
};

function TopBar({ activeModule }: { activeModule: ModuleKey }) {
  const { currentCase } = useCase();
  const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between px-6 py-3 border-b border-app bg-panel/95 backdrop-blur">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold text-app">{moduleTitles[activeModule]}</h2>
        {currentCase && (
          <span className="text-xs text-muted font-mono">
            / {currentCase.case_number}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted">
          <Activity className="w-3.5 h-3.5 text-success" />
          <span className="font-mono">SYSTEM ONLINE</span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted">
          <Clock className="w-3.5 h-3.5" />
          <span className="font-mono">{time}</span>
        </div>
        <ThemeSwitcher />
      </div>
    </header>
  );
}

function AppContent() {
  const [activeModule, setActiveModule] = useState<ModuleKey>('dashboard');
  const { loading } = useCase();
  const { theme } = useTheme();

  if (loading) {
    return (
      <div className="min-h-screen bg-app flex items-center justify-center" data-theme={theme}>
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-accent font-mono">Initializing ForensicOSINT Studio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-app">
      <Sidebar active={activeModule} onNavigate={setActiveModule} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar activeModule={activeModule} />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 max-w-[1600px] mx-auto">
            {activeModule === 'dashboard' && <Dashboard />}
            {activeModule === 'image-lens' && <ImageLensEngine />}
            {activeModule === 'recon' && <ReconEngine />}
            {activeModule === 'link-analysis' && <LinkAnalysis />}
            {activeModule === 'capture-audit' && <CaptureAudit />}
            {activeModule === 'reporting' && <Reporting />}
          {activeModule === 'osint-hub' && <PublicOSINTHub />}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <CaseProvider>
          <AppContent />
        </CaseProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
