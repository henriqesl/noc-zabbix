import { AlertTriangle, ArrowRight, EyeOff, Siren } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { EnvironmentAttention } from '@/domain/noc-selectors';
import { cleanGroupName } from '@/domain/noc-selectors';
import { cn } from '@/lib/utils';

export function AttentionQueue({ items }: { items: EnvironmentAttention[] }) {
  if (!items.length) return null;

  return (
    <ol className="overflow-hidden rounded-xl border border-border bg-card/45" aria-label="Ambientes prioritários">
      {items.map((item, index) => {
        const presentation = getPresentation(item);
        const Icon = presentation.icon;

        return (
          <li key={item.group.id} className="border-b border-border last:border-b-0">
            <Link
              to={`/ambientes/${item.group.id}`}
              className="group grid min-h-[4.75rem] grid-cols-[2rem_2.5rem_minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 transition-colors hover:bg-surface-elevated/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:grid-cols-[2rem_2.5rem_minmax(12rem,1.2fr)_minmax(12rem,1fr)_auto_auto] sm:px-4"
            >
              <span className="font-mono text-xs text-muted-foreground">{String(index + 1).padStart(2, '0')}</span>
              <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', presentation.iconClass)}><Icon className="h-4 w-4" /></span>
              <span className="min-w-0">
                <strong className="block truncate text-sm font-semibold text-foreground sm:text-base">{cleanGroupName(item.group.name)}</strong>
                <span className="block truncate text-xs text-muted-foreground">{presentation.detail}</span>
              </span>
              <span className={cn('hidden text-sm font-semibold sm:block', presentation.textClass)}>{presentation.summary}</span>
              <span className="hidden whitespace-nowrap font-mono text-xs text-muted-foreground md:block">{formatDuration(item.durationMs)}</span>
              <span className="flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-foreground">{presentation.action}<ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /></span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

function getPresentation(item: EnvironmentAttention) {
  if (item.kind === 'failure') {
    const count = item.confirmedFailures.length;
    return {
      icon: Siren,
      iconClass: 'bg-noc-critical/[0.12] text-noc-critical',
      textClass: 'text-noc-critical',
      summary: `${count} ${count === 1 ? 'falha confirmada' : 'falhas confirmadas'}`,
      detail: summarizeNames(item.confirmedFailures.map(device => device.name)),
      action: 'Investigar',
    };
  }

  if (item.kind === 'alert') {
    const count = Math.max(item.activeAlerts.length, item.warningDevices.length);
    return {
      icon: AlertTriangle,
      iconClass: 'bg-noc-warning/[0.12] text-noc-warning',
      textClass: 'text-noc-warning',
      summary: `${count} ${count === 1 ? 'alerta ativo' : 'alertas ativos'}`,
      detail: item.activeAlerts[0]?.message ?? summarizeNames(item.warningDevices.map(device => device.name)),
      action: 'Analisar',
    };
  }

  const count = item.visibilityAffected.length;
  return {
    icon: EyeOff,
    iconClass: 'bg-info/[0.12] text-info',
    textClass: 'text-info',
    summary: `${count} sem confirmação`,
    detail: item.group.restriction?.note ?? item.visibilityAffected[0]?.classification.evidence.reasonLabel ?? 'Visibilidade limitada',
    action: 'Ver acesso',
  };
}

function summarizeNames(names: string[]) {
  if (!names.length) return 'Evidências disponíveis para análise';
  if (names.length === 1) return names[0];
  return `${names[0]} e mais ${names.length - 1}`;
}

function formatDuration(durationMs: number) {
  if (durationMs < 60_000) return 'agora';
  const minutes = Math.floor(durationMs / 60_000);
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  return `há ${Math.floor(hours / 24)} d`;
}
