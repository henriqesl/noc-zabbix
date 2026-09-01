import { cn } from '@/lib/utils';
import type { DeviceStatus, GroupHealthStatus } from '@/domain/noc';

const statusLabel: Record<DeviceStatus | GroupHealthStatus, string> = {
  online: 'ONLINE',
  offline: 'OFFLINE',
  warning: 'ALERTA',
  unknown: 'NÃO CONFIRMADO',
  healthy: 'OK',
  critical: 'CRITICO',
  degraded: 'VISIBILIDADE',
  empty: 'VAZIO',
};

const statusClassName: Record<DeviceStatus | GroupHealthStatus, string> = {
  online: 'bg-noc-ok/15 text-noc-ok',
  offline: 'bg-noc-critical/15 text-noc-critical',
  warning: 'bg-noc-warning/15 text-noc-warning',
  unknown: 'bg-muted text-muted-foreground',
  healthy: 'bg-noc-ok/15 text-noc-ok',
  critical: 'bg-noc-critical/15 text-noc-critical',
  degraded: 'bg-info/15 text-info',
  empty: 'bg-muted text-muted-foreground',
};

interface StatusBadgeProps {
  status: DeviceStatus | GroupHealthStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center rounded-md px-2 text-[10px] font-bold font-mono',
        statusClassName[status],
        className
      )}
    >
      {statusLabel[status]}
    </span>
  );
}
