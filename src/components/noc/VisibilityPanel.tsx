import { CheckCircle2, EyeOff, Server, ShieldAlert } from 'lucide-react';
import type { ClientGroup, Device } from '@/domain/noc';
import { cleanGroupName } from '@/domain/noc-selectors';

interface VisibilityPanelProps {
  groups: ClientGroup[];
  proxies: Device[];
  affectedDevices: Device[];
}

export function VisibilityPanel({ groups, proxies, affectedDevices }: VisibilityPanelProps) {
  const restrictedClients = groups
    .filter(group => group.restriction?.active)
    .map(group => {
      const devices = group.devices;
      const affected = devices.filter(device =>
        device.classification.operationalState === 'unconfirmed'
      ).length;

      return {
        name: cleanGroupName(group.name),
        label: group.restriction!.label,
        note: group.restriction!.note,
        groupCount: 1,
        deviceCount: devices.length,
        affected,
      };
    });

  if (affectedDevices.length === 0 && proxies.length === 0 && restrictedClients.length === 0) {
    return (
      <section className="flex items-center gap-3 rounded-xl border border-noc-ok/25 bg-noc-ok/[0.04] px-4 py-3">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-noc-ok" />
        <div><h2 className="text-sm font-semibold text-foreground">Visibilidade completa</h2><p className="text-xs text-muted-foreground">Todos os equipamentos desta leitura puderam ser verificados.</p></div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-info/30 bg-info/5">
      <div className="flex flex-col gap-3 border-b border-info/20 px-4 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/15 text-info">
            <EyeOff className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-semibold text-foreground">Equipamentos que não puderam ser verificados</h2>
            <p className="text-sm text-muted-foreground">Isso não significa que estejam offline; pode ser apenas uma limitação de acesso.</p>
          </div>
        </div>
        <div className="flex gap-2 text-xs font-medium">
          <span className="rounded-md bg-background/70 px-2.5 py-1.5 text-info">{affectedDevices.length} sem confirmação</span>
          <span className="rounded-md bg-background/70 px-2.5 py-1.5 text-muted-foreground">{proxies.length} proxies sem contato</span>
        </div>
      </div>

      <div className="grid gap-3 p-4 lg:p-5">
        {restrictedClients.map(client => (
          <div key={client.name} className="rounded-lg border border-border bg-card/80 p-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-foreground">{client.name}</p>
                  <span className="rounded bg-warning/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-warning">
                    {client.label}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{client.note}</p>
                <p className="mt-3 font-mono text-xs text-foreground">
                  {client.groupCount === 0
                    ? 'Ambiente não localizado nesta leitura'
                    : `${client.affected} de ${client.deviceCount} equipamentos sem confirmação`}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {proxies.length > 0 && (
        <div className="border-t border-info/20 px-4 py-3 lg:px-5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Server className="h-3.5 w-3.5 text-info" />
            <span>Proxies sem contato:</span>
            {proxies.map(proxy => <span key={proxy.id} className="text-foreground">{cleanGroupName(proxy.name)}</span>)}
          </div>
        </div>
      )}
    </section>
  );
}
