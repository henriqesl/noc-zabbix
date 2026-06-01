import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NocHeaderProps {
  lastUpdate: Date;
  isRefreshing: boolean;
  onRefresh: () => void;
  onlineCount: number;
  offlineCount: number;
  totalCount: number;
}

export function NocHeader({ lastUpdate, isRefreshing, onRefresh, onlineCount, offlineCount, totalCount }: NocHeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/80 px-4 py-3 backdrop-blur-sm lg:px-6">
      <div className="flex min-w-0 items-center gap-4">
        <h1 className="truncate text-lg font-bold tracking-tight text-foreground lg:text-xl">
          <span className="text-primary">Bionic</span> NOC
        </h1>
        <div className="hidden items-center gap-3 font-mono text-xs md:flex">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-noc-ok" /> {onlineCount}
          </span>
          <span className="flex items-center gap-1.5">
            <span className={cn('h-2 w-2 rounded-full bg-noc-critical', offlineCount > 0 && 'animate-pulse-dot')} /> {offlineCount}
          </span>
          <span className="text-muted-foreground">/ {totalCount}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span className="font-mono">{format(lastUpdate, 'HH:mm:ss', { locale: ptBR })}</span>
        </div>
        <button
          onClick={onRefresh}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-secondary px-3 text-xs font-medium text-foreground transition-colors hover:bg-accent"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
          <span className="hidden sm:inline">Atualizar</span>
        </button>
      </div>
    </header>
  );
}
