import { NocHeader } from '@/components/noc/NocHeader';
import { useNocData } from '@/hooks/use-noc-data';
import { useDisplayMode } from '@/hooks/use-display-mode';
import { Outlet } from 'react-router-dom';

export function NocLayout() {
  const nocData = useNocData();
  const display = useDisplayMode();

  return (
    <div className="min-h-screen w-full bg-background" data-mode={display.mode}>
      <a href="#noc-main" className="fixed left-4 top-3 z-50 -translate-y-20 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform focus:translate-y-0">
        Ir para o conteúdo principal
      </a>
      <NocHeader
        lastUpdate={nocData.lastUpdate}
        isRefreshing={nocData.isRefreshing}
        onRefresh={nocData.refresh}
        onlineCount={nocData.onlineCount}
        confirmedCount={nocData.realOfflineDevices.length}
        unconfirmedCount={nocData.visibilityAffectedDevices.length}
        error={nocData.error}
        mode={display.mode}
        onModeChange={display.setMode}
      />
      <main id="noc-main" tabIndex={-1} className="noc-content min-w-0">
        <div className="mx-auto w-full max-w-[220rem]">
          <Outlet context={nocData} />
        </div>
      </main>
    </div>
  );
}
