import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, RefreshCw, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NocHeaderProps {
  lastUpdate: Date;
  isRefreshing: boolean;
  onRefresh: () => void;
  onlineCount: number;
  confirmedCount: number;
  unconfirmedCount: number;
  error: string | null;
}

export function NocHeader({ lastUpdate, isRefreshing, onRefresh, onlineCount, confirmedCount, unconfirmedCount, error }: NocHeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between border-b border-border bg-background/90 px-4 py-3 backdrop-blur-xl lg:px-6 xl:px-8">
      <div className="flex min-w-0 items-center gap-4">
        <h1 className="truncate text-lg font-bold tracking-tight text-foreground lg:text-xl">
          <span className="text-primary">Bionic</span> NOC
        </h1>
        <div className="hidden items-center gap-2 text-xs lg:flex">
          <span className="flex items-center gap-2 rounded-full bg-noc-ok/10 px-3 py-1.5 text-noc-ok">
            <span className="h-2 w-2 rounded-full bg-noc-ok" /> <strong className="font-mono">{onlineCount}</strong> respondendo
          </span>
          <span className="flex items-center gap-2 rounded-full bg-noc-critical/10 px-3 py-1.5 text-noc-critical">
            <span className={cn('h-2 w-2 rounded-full bg-noc-critical', confirmedCount > 0 && 'animate-pulse-dot')} /> <strong className="font-mono">{confirmedCount}</strong> com falha
          </span>
          <span className="flex items-center gap-2 rounded-full bg-info/10 px-3 py-1.5 text-info">
            <span className="h-2 w-2 rounded-full bg-info" /> <strong className="font-mono">{unconfirmedCount}</strong> não confirmados
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {error && <span className="hidden items-center gap-1.5 text-xs font-medium text-noc-critical sm:flex"><WifiOff className="h-3.5 w-3.5" /> Coleta falhou</span>}
        <div className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
          <Clock className="h-3.5 w-3.5" />
          <span className="font-mono">{format(lastUpdate, 'HH:mm:ss', { locale: ptBR })}</span>
        </div>
        <button
          onClick={onRefresh}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-secondary px-3 text-xs font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-accent"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
          <span className="hidden sm:inline">Atualizar</span>
        </button>
      </div>
    </header>
  );
}
