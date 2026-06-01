import { cn } from '@/lib/utils';
import { cleanGroupName, getGroupHealth } from '@/domain/noc-selectors';
import type { ClientGroup } from '@/domain/noc';
import { motion } from 'framer-motion';

export function GroupSummaryCard({ group, index = 0 }: { group: ClientGroup; index?: number }) {
  const { online, offline, warning, total, healthPct } = getGroupHealth(group);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        'rounded-lg border bg-card p-4 lg:p-5 transition-all',
        offline > 0 ? 'border-noc-critical/40 noc-critical-glow' : 'border-border hover:border-primary/30'
      )}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground text-base lg:text-lg truncate pr-3">{cleanGroupName(group.name)}</h3>
        <span className={cn(
          'text-xs font-mono font-bold px-2 py-0.5 rounded',
          healthPct === 100 ? 'bg-noc-ok/15 text-noc-ok' :
          healthPct >= 90 ? 'bg-noc-warning/15 text-noc-warning' :
          'bg-noc-critical/15 text-noc-critical'
        )}>
          {healthPct}%
        </span>
      </div>

      <div className="mt-3 h-2 bg-secondary rounded-full overflow-hidden flex">
        {online > 0 && <div className="bg-noc-ok h-full" style={{ width: `${(online / total) * 100}%` }} />}
        {warning > 0 && <div className="bg-noc-warning h-full" style={{ width: `${(warning / total) * 100}%` }} />}
        {offline > 0 && <div className="bg-noc-critical h-full" style={{ width: `${(offline / total) * 100}%` }} />}
      </div>

      <div className="mt-4 flex gap-4 text-xs lg:text-sm">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-noc-ok" />
          <span className="text-muted-foreground">{online} online</span>
        </div>
        {warning > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-noc-warning" />
            <span className="text-muted-foreground">{warning} alerta</span>
          </div>
        )}
        {offline > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-noc-critical animate-pulse-dot" />
            <span className="text-noc-critical font-medium">{offline} offline</span>
          </div>
        )}
      </div>

      <p className="mt-2 text-xs text-muted-foreground">{total} dispositivos</p>
    </motion.div>
  );
}
