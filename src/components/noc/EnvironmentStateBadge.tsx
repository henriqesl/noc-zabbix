import { AlertTriangle, CheckCircle2, EyeOff, Siren } from 'lucide-react';
import type { EnvironmentPublicState } from '@/domain/noc-environments';
import { cn } from '@/lib/utils';

const presentation = {
  failure: { label: 'Falha confirmada', icon: Siren, className: 'border-noc-critical/30 bg-noc-critical/[0.08] text-noc-critical' },
  alert: { label: 'Alerta', icon: AlertTriangle, className: 'border-noc-warning/30 bg-noc-warning/[0.08] text-noc-warning' },
  visibility: { label: 'Estado não confirmado', icon: EyeOff, className: 'border-info/30 bg-info/[0.08] text-info' },
  healthy: { label: 'Funcionando', icon: CheckCircle2, className: 'border-noc-ok/25 bg-noc-ok/[0.06] text-noc-ok' },
} satisfies Record<EnvironmentPublicState, { label: string; icon: typeof Siren; className: string }>;

export function EnvironmentStateBadge({ state }: { state: EnvironmentPublicState }) {
  const item = presentation[state];
  const Icon = item.icon;
  return <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-1 text-xs font-semibold', item.className)}><Icon className="h-3.5 w-3.5" />{item.label}</span>;
}
