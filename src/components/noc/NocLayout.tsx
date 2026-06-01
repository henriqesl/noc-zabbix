import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { NocSidebar } from '@/components/noc/NocSidebar';
import { NocHeader } from '@/components/noc/NocHeader';
import { useNocData } from '@/hooks/use-noc-data';
import { Outlet } from 'react-router-dom';

export function NocLayout() {
  const nocData = useNocData();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full noc-grid-bg">
        <NocSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <NocHeader
            lastUpdate={nocData.lastUpdate}
            isRefreshing={nocData.isRefreshing}
            onRefresh={nocData.refresh}
            onlineCount={nocData.onlineCount}
            offlineCount={nocData.offlineCount}
            totalCount={nocData.totalCount}
          />
          <div className="flex items-center gap-2 border-b border-border bg-card/30 px-4 py-2 lg:px-6">
            <SidebarTrigger />
          </div>
          <main className="flex-1 overflow-auto p-4 lg:p-6 xl:p-8">
            <Outlet context={nocData} />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
