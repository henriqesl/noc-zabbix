import { AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface CriticalBannerProps {
  criticalCount: number;
  offlineCount: number;
}

export function CriticalBanner({ criticalCount, offlineCount }: CriticalBannerProps) {
  if (criticalCount === 0 && offlineCount === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-5 rounded-lg border border-noc-critical/50 bg-noc-critical/10 p-4 noc-critical-glow lg:p-5"
    >
      <div className="flex items-center gap-3">
        <AlertCircle className="h-8 w-8 text-noc-critical animate-pulse-dot lg:h-10 lg:w-10" />
        <div>
          <p className="text-lg font-bold text-noc-critical lg:text-xl">ALERTAS CRITICOS</p>
          <p className="text-sm text-muted-foreground">Acao imediata necessaria</p>
        </div>
      </div>
      <div className="ml-auto flex items-center gap-6">
        <div className="text-center">
          <p className="font-mono text-4xl font-bold text-noc-critical lg:text-5xl">{criticalCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">Criticos</p>
        </div>
        <div className="text-center">
          <p className="font-mono text-4xl font-bold text-noc-critical lg:text-5xl">{offlineCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">Offline</p>
        </div>
      </div>
    </motion.div>
  );
}
