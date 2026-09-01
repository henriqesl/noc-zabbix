import { AlertTriangle, CheckCircle2, EyeOff, Siren } from 'lucide-react';
import type { OperationalState } from '@/domain/noc';
import { OPERATIONAL_STATE_LABELS } from '@/domain/noc-classifier';
import { cn } from '@/lib/utils';

const presentation = {
  functioning: { icon: CheckCircle2, className: 'text-noc-ok' },
  warning: { icon: AlertTriangle, className: 'text-noc-warning' },
  'confirmed-failure': { icon: Siren, className: 'text-noc-critical' },
  unconfirmed: { icon: EyeOff, className: 'text-info' },
} satisfies Record<OperationalState, { icon: typeof Siren; className: string }>;

export function OperationalStateBadge({ state, compact = false }: { state: OperationalState; compact?: boolean }) {
  const item = presentation[state];
  const Icon = item.icon;
  return <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold', item.className)}><Icon className="h-3.5 w-3.5" />{!compact && OPERATIONAL_STATE_LABELS[state]}</span>;
}
