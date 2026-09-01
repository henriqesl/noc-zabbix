import { ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { cleanGroupName, getGroupHealth } from '@/domain/noc-selectors';
import type { ClientGroup } from '@/domain/noc';

export function GroupSummaryCard({ group, index = 0 }: { group: ClientGroup; index?: number }) {
  const { online, offline, warning, unknown, total, healthPct } = getGroupHealth(group);
  const state = offline > 0 ? 'critical' : warning > 0 ? 'warning' : unknown > 0 ? 'partial' : 'healthy';
  const stateLabel = {
    critical: 'Ação necessária', warning: 'Requer atenção', partial: 'Verificação parcial', healthy: 'Tudo certo',
  }[state];

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 8) * 0.035 }}
      className={cn(
        'h-full rounded-xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:bg-card/90 lg:p-5',
        state === 'critical' ? 'border-noc-critical/45 noc-critical-glow' :
        state === 'warning' ? 'border-noc-warning/35' : state === 'partial' ? 'border-info/35' : 'border-noc-ok/25 hover:border-noc-ok/40'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn(
            'mb-1 text-[10px] font-bold uppercase tracking-[0.14em]',
            state === 'critical' ? 'text-noc-critical' : state === 'warning' ? 'text-noc-warning' : state === 'partial' ? 'text-info' : 'text-noc-ok'
          )}>{stateLabel}</p>
          <h3 className="truncate text-base font-semibold text-foreground lg:text-lg">{cleanGroupName(group.name)}</h3>
        </div>
        <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
      </div>

      <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-secondary">
        {online > 0 && <div className="h-full bg-noc-ok" style={{ width: `${(online / total) * 100}%` }} />}
        {warning > 0 && <div className="h-full bg-noc-warning" style={{ width: `${(warning / total) * 100}%` }} />}
        {offline > 0 && <div className="h-full bg-noc-critical" style={{ width: `${(offline / total) * 100}%` }} />}
        {unknown > 0 && <div className="h-full bg-info/75" style={{ width: `${(unknown / total) * 100}%` }} />}
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs lg:text-sm">
        <StatusCount color="bg-noc-ok" value={online} label="funcionando" />
        {offline > 0 && <StatusCount color="bg-noc-critical" value={offline} label="com falha" emphasis="text-noc-critical" />}
        {warning > 0 && <StatusCount color="bg-noc-warning" value={warning} label="em alerta" />}
        {unknown > 0 && <StatusCount color="bg-info" value={unknown} label="não confirmados" emphasis="text-info" />}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
        <span>{total} equipamentos</span>
        {unknown === 0 && <span className="font-mono">{healthPct}% respondendo</span>}
      </div>
    </motion.article>
  );
}

function StatusCount({ color, value, label, emphasis }: { color: string; value: number; label: string; emphasis?: string }) {
  return <span className={cn('flex items-center gap-1.5 text-muted-foreground', emphasis)}><span className={cn('h-2 w-2 rounded-full', color)} /><strong className="font-mono text-foreground">{value}</strong> {label}</span>;
}
