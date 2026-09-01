import { NocHeader } from '@/components/noc/NocHeader';
import { useNocData } from '@/hooks/use-noc-data';
import { useDisplayMode } from '@/hooks/use-display-mode';
import { Outlet } from 'react-router-dom';

export function NocLayout() {
  const nocData = useNocData();
  const display = useDisplayMode();

  return (
    <div className="min-h-screen w-full bg-background" data-mode={display.mode}>
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
      <main className="noc-content min-w-0">
        <div className="mx-auto w-full max-w-[220rem]">
          <Outlet context={nocData} />
        </div>
      </main>
    </div>
  );
}
