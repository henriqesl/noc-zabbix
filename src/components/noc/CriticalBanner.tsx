import { AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CriticalBannerProps {
  criticalCount: number;
  offlineCount: number;
}

export function CriticalBanner({ criticalCount, offlineCount }: CriticalBannerProps) {
  if (criticalCount === 0 && offlineCount === 0) return null;
  const hasConfirmedFailure = offlineCount > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex items-center gap-5 rounded-lg border p-4 lg:p-5',
        hasConfirmedFailure ? 'border-noc-critical/40 bg-noc-critical/[0.07]' : 'border-noc-warning/35 bg-noc-warning/[0.06]'
      )}
    >
      <div className="flex items-center gap-3">
        <AlertCircle className={cn('h-8 w-8 lg:h-10 lg:w-10', hasConfirmedFailure ? 'text-noc-critical' : 'text-noc-warning')} />
        <div>
          <p className={cn('text-lg font-bold lg:text-xl', hasConfirmedFailure ? 'text-noc-critical' : 'text-noc-warning')}>{hasConfirmedFailure ? 'FALHAS CONFIRMADAS' : 'ALERTAS IMPORTANTES'}</p>
          <p className="text-sm text-muted-foreground">Priorize a análise das evidências abaixo</p>
        </div>
      </div>
      <div className="ml-auto flex items-center gap-6">
        <div className="text-center">
          <p className="font-mono text-4xl font-bold text-noc-warning lg:text-5xl">{criticalCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">Alta severidade</p>
        </div>
        <div className="text-center">
          <p className={cn('font-mono text-4xl font-bold lg:text-5xl', hasConfirmedFailure ? 'text-noc-critical' : 'text-muted-foreground')}>{offlineCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">Falhas confirmadas</p>
        </div>
      </div>
    </motion.div>
  );
}
