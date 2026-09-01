import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { NocOccurrence } from '@/domain/noc';
import { parseAlertTime } from '@/domain/noc-selectors';
import { OccurrenceBadge } from './OccurrenceBadge';

export function EnvironmentOccurrenceList({
  occurrences,
  onSelect,
  limit,
}: {
  occurrences: NocOccurrence[];
  onSelect: (occurrence: NocOccurrence) => void;
  limit?: number;
}) {
  const visible = limit ? occurrences.slice(0, limit) : occurrences;
  return (
    <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card/40" role="list">
      {visible.map(occurrence => {
        const observedAt = parseAlertTime(occurrence.evidence.observedAt);
        return (
          <div key={occurrence.id} role="listitem" className="grid gap-3 p-4 md:grid-cols-[12rem_minmax(0,1fr)_12rem_7rem] md:items-center">
            <div><OccurrenceBadge occurrence={occurrence} /></div>
            <div className="min-w-0"><p className="font-medium text-foreground">{occurrence.title}</p><p className="mt-1 truncate font-mono text-xs text-muted-foreground">{occurrence.evidence.reasonCode}</p></div>
            <div className="text-xs text-muted-foreground"><p>{occurrence.affectedDevices.length} {occurrence.affectedDevices.length === 1 ? 'equipamento' : 'equipamentos'}</p>{observedAt > 0 && <p className="mt-1 font-mono">{formatDistanceToNow(observedAt, { addSuffix: true, locale: ptBR })}</p>}</div>
            <button type="button" onClick={() => onSelect(occurrence)} className="justify-self-start rounded-md px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:justify-self-end">Evidências</button>
          </div>
        );
      })}
    </div>
  );
}
