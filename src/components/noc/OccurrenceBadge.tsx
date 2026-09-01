import { AlertTriangle, EyeOff, Siren } from 'lucide-react';
import type { NocOccurrence, OccurrenceKind } from '@/domain/noc';
import { cn } from '@/lib/utils';

const presentation: Record<OccurrenceKind, { label: string; className: string; icon: typeof Siren }> = {
  failure: { label: 'Falha confirmada', className: 'border-noc-critical/30 bg-noc-critical/[0.08] text-noc-critical', icon: Siren },
  alert: { label: 'Alerta', className: 'border-noc-warning/30 bg-noc-warning/[0.08] text-noc-warning', icon: AlertTriangle },
  visibility: { label: 'Visibilidade', className: 'border-info/30 bg-info/[0.08] text-info', icon: EyeOff },
};

export function OccurrenceBadge({ occurrence, compact = false }: { occurrence: NocOccurrence; compact?: boolean }) {
  const item = presentation[occurrence.kind];
  const Icon = item.icon;

  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-1 text-xs font-semibold', item.className)}>
      <Icon className="h-3.5 w-3.5" />
      {!compact && item.label}
      {occurrence.kind === 'alert' && occurrence.severity === 'critical' && <span className="font-normal opacity-80">Alta</span>}
    </span>
  );
}
