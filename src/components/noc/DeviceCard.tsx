import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { Activity, Camera, Clock, Network, Router, Server, Shield, Wifi, WifiOff } from 'lucide-react';
import type { ElementType } from 'react';
import type { Device } from '@/domain/noc';
import { cn } from '@/lib/utils';
import { StatusBadge } from './StatusBadge';

const typeIcons: Record<string, ElementType> = {
  server: Server,
  camera: Camera,
  switch: Network,
  router: Router,
  firewall: Shield,
};

const statusStyles: Record<string, string> = {
  online: 'border-noc-ok/20 hover:border-noc-ok/40',
  warning: 'border-noc-warning/30 noc-warning-glow',
  offline: 'border-noc-critical/30 noc-critical-glow',
  unknown: 'border-info/30 bg-info/5',
};

const statusDot: Record<string, string> = {
  online: 'bg-noc-ok',
  warning: 'bg-noc-warning',
  offline: 'bg-noc-critical',
  unknown: 'bg-info',
};

export function DeviceCard({ device, index = 0 }: { device: Device; index?: number }) {
  const Icon = typeIcons[device.type] || Server;
  const isHighLatency = device.latency?.includes('ms') && parseInt(device.latency) > 100;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.02 }}
      className={cn(
        'relative flex min-h-[140px] flex-col overflow-hidden rounded-lg border bg-card p-4 transition-all',
        statusStyles[device.status],
        device.status === 'offline' && 'min-h-[160px]'
      )}
    >
      {device.status === 'offline' && (
        <div className="absolute inset-0 bg-noc-critical/5" />
      )}

      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="break-words text-sm font-semibold text-foreground">{device.name}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className={cn('h-2 w-2 rounded-full', statusDot[device.status], device.status === 'offline' && 'animate-pulse-dot')} />
          {device.status === 'offline' || device.status === 'unknown' ? (
            <WifiOff className={cn('h-3.5 w-3.5', device.status === 'offline' ? 'text-noc-critical' : 'text-info')} />
          ) : (
            <Wifi className={cn('h-3.5 w-3.5', device.status === 'warning' ? 'text-noc-warning' : 'text-noc-ok')} />
          )}
        </div>
      </div>

      <p className="relative z-10 mt-1 font-mono text-xs text-muted-foreground">{device.ip}</p>

      <div className="relative z-10 mt-3 grid flex-1 grid-cols-2 gap-2 text-xs">
        {device.status !== 'offline' && (device.latency || device.uptime) && (
          <>
            {device.latency && (
              <div>
                <span className="flex items-center gap-1 text-muted-foreground"><Activity className="h-3 w-3" /> Latencia</span>
                <p className={cn('font-mono font-medium', isHighLatency ? 'text-noc-warning' : 'text-foreground')}>
                  {device.latency}
                </p>
              </div>
            )}
            {device.uptime && (
              <div>
                <span className="flex items-center gap-1 text-muted-foreground"><Clock className="h-3 w-3" /> Uptime</span>
                <p className="font-mono font-medium text-foreground">{device.uptime}</p>
              </div>
            )}
          </>
        )}

        {device.cpu !== undefined && (
          <>
            <MetricBar label="CPU" value={device.cpu} />
            <MetricBar label="RAM" value={device.memory ?? 0} />
          </>
        )}
      </div>

      <div className="relative z-10 mt-3">
        <StatusBadge status={device.status} />
      </div>

      {device.status === 'offline' && device.offlineSince && (
        <div className="relative z-10 mt-3 w-full border-t border-noc-critical/20 pt-2 text-center">
          <p className="flex items-center justify-center gap-1 text-[10px] font-medium text-noc-critical">
            <Clock className="h-3 w-3" /> Caiu ha {formatDistanceToNow(new Date(device.offlineSince), { locale: ptBR })}
          </p>
        </div>
      )}
    </motion.div>
  );
}

function MetricBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
          <div
            className={cn('h-full rounded-full', value > 60 ? 'bg-noc-warning' : 'bg-noc-ok')}
            style={{ width: `${value}%` }}
          />
        </div>
        <span className="font-mono text-[10px]">{value}%</span>
      </div>
    </div>
  );
}
