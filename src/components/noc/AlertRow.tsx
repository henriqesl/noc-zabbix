import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import type { Alert } from '@/domain/noc';
import { parseAlertTime } from '@/domain/noc-selectors';
import { cn } from '@/lib/utils';

const severityConfig = {
  critical: { icon: AlertCircle, bg: 'bg-noc-warning/10', border: 'border-noc-warning/30', text: 'text-noc-warning', label: 'ALTA' },
  warning: { icon: AlertTriangle, bg: 'bg-noc-warning/10', border: 'border-noc-warning/30', text: 'text-noc-warning', label: 'ALERTA' },
  info: { icon: Info, bg: 'bg-info/10', border: 'border-info/30', text: 'text-info', label: 'INFO' },
};

export function AlertRow({ alert, index = 0 }: { alert: Alert; index?: number }) {
  const config = severityConfig[alert.severity];
  const Icon = config.icon;
  const alertTime = parseAlertTime(alert.timestamp);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className={cn(
        'flex items-center gap-3 rounded-md border p-3 transition-all',
        config.bg,
        config.border
      )}
    >
      <Icon className={cn('h-5 w-5 shrink-0', config.text)} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={cn('rounded px-1.5 py-0.5 font-mono text-[10px] font-bold', config.bg, config.text)}>
            {config.label}
          </span>
          <span className="truncate text-xs text-muted-foreground">{alert.group}</span>
        </div>
        <p className="mt-0.5 truncate text-sm font-medium text-foreground">{alert.device} - {alert.message}</p>
      </div>
      <span className="whitespace-nowrap font-mono text-[11px] text-muted-foreground">
        {alertTime > 0 ? formatDistanceToNow(new Date(alertTime), { addSuffix: true, locale: ptBR }) : 'sem data'}
      </span>
    </motion.div>
  );
}
