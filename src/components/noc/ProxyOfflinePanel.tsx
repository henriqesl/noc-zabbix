import { AlertTriangle, Server } from 'lucide-react';
import type { Device } from '@/domain/noc';

interface ProxyOfflinePanelProps {
  proxies: Device[];
  impactedDevices: Device[];
}

export function ProxyOfflinePanel({ proxies, impactedDevices }: ProxyOfflinePanelProps) {
  if (proxies.length === 0) return null;

  return (
    <section className="rounded-lg border border-noc-critical/40 bg-noc-critical/5 p-4 lg:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-noc-critical/15 text-noc-critical">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Proxies offline</h2>
            <p className="text-sm text-muted-foreground">
              {impactedDevices.length} dispositivos impactados
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-center font-mono text-sm lg:min-w-48">
          <div className="rounded-md border border-noc-critical/30 bg-background/60 px-3 py-2">
            <p className="text-xl font-bold text-noc-critical">{proxies.length}</p>
            <p className="text-[10px] uppercase text-muted-foreground">proxies</p>
          </div>
          <div className="rounded-md border border-border bg-background/60 px-3 py-2">
            <p className="text-xl font-bold text-foreground">{impactedDevices.length}</p>
            <p className="text-[10px] uppercase text-muted-foreground">impactados</p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
        {proxies.map(proxy => (
          <div key={proxy.id} className="flex items-center gap-3 rounded-md border border-border bg-card/80 p-3">
            <Server className="h-4 w-4 shrink-0 text-noc-critical" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{proxy.name}</p>
              <p className="text-xs text-muted-foreground">{proxy.ip}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
