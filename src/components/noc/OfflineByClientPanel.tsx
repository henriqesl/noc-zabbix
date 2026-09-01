import { ChevronDown, EyeOff, MonitorOff } from 'lucide-react';
import type { Device } from '@/domain/noc';
import { cleanGroupName, groupOfflineDevicesByClient } from '@/domain/noc-selectors';
import { cn } from '@/lib/utils';

interface OfflineByClientPanelProps {
  title: string;
  description: string;
  devices: Device[];
  variant?: 'critical' | 'muted';
}

export function OfflineByClientPanel({ title, description, devices, variant = 'critical' }: OfflineByClientPanelProps) {
  const groups = groupOfflineDevicesByClient(devices);
  const isCritical = variant === 'critical';
  const StateIcon = isCritical ? MonitorOff : EyeOff;

  if (devices.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className={cn('text-xl font-semibold lg:text-2xl', isCritical ? 'text-noc-critical' : 'text-foreground')}>{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <span className="font-mono text-xs text-muted-foreground">{devices.length} equipamentos</span>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2 2xl:grid-cols-3 min-[2800px]:grid-cols-4">
        {groups.map(group => (
          <details
            key={group.groupName}
            className={cn(
              'group rounded-xl border bg-card/80 p-4 transition-colors open:bg-card',
              isCritical ? 'border-noc-critical/35' : 'border-info/25'
            )}
          >
            <summary className="flex cursor-pointer list-none items-center gap-3">
              <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', isCritical ? 'bg-noc-critical/10 text-noc-critical' : 'bg-info/10 text-info')}>
                <StateIcon className="h-[18px] w-[18px]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground lg:text-base">{cleanGroupName(group.groupName)}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {isCritical
                    ? `${group.devices.length} com falha${group.devices[0]?.proxyName ? ` — monitorados por ${group.devices[0].proxyName}` : ''}`
                    : `${group.devices.length} sem estado confirmado${group.devices[0]?.proxyName ? ` — via ${group.devices[0].proxyName}` : ''}`}
                </p>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>

            <div className="mt-3 space-y-2 border-t border-border pt-3">
              {group.devices.slice(0, 8).map(device => (
                <div key={device.id} className="flex items-center justify-between gap-3 rounded-lg bg-background/60 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">{device.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{device.ip}</p>
                  </div>
                  {device.proxyName && <span className="shrink-0 text-[10px] text-muted-foreground">via proxy</span>}
                </div>
              ))}
              {group.devices.length > 8 && <p className="text-xs text-muted-foreground">Mais {group.devices.length - 8} equipamentos neste ambiente</p>}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
