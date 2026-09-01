import { CheckCircle2, ChevronRight, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { NocOccurrence } from '@/domain/noc';
import type { EnvironmentSummary } from '@/domain/noc-environments';
import { EnvironmentOccurrenceList } from './EnvironmentOccurrenceList';

export function EnvironmentAttentionView({
  summary,
  onSelectOccurrence,
  occurrencesUrl,
}: {
  summary: EnvironmentSummary;
  onSelectOccurrence: (occurrence: NocOccurrence) => void;
  occurrencesUrl: string;
}) {
  if (!summary.occurrences.length) {
    return <div className="flex items-start gap-3 rounded-xl border border-noc-ok/25 bg-noc-ok/[0.04] p-5"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-noc-ok" /><div><h2 className="font-semibold text-foreground">Nada exige ação neste ambiente</h2><p className="mt-1 text-sm text-muted-foreground">A leitura atual não apresenta falhas, alertas ou limitações de visibilidade.</p></div></div>;
  }

  return (
    <div className="space-y-5">
      {summary.group.restriction && (
        <section className="flex items-start gap-3 rounded-xl border border-info/30 bg-info/[0.05] p-4">
          <EyeOff className="mt-0.5 h-5 w-5 shrink-0 text-info" />
          <div><h2 className="font-semibold text-foreground">{summary.group.restriction.label}</h2><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{summary.group.restriction.note}</p></div>
        </section>
      )}
      <section className="space-y-3">
        <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Prioridade local</p><h2 className="mt-1 text-xl font-semibold text-foreground">Onde começar neste ambiente</h2></div>{summary.occurrences.length > 5 && <Link to={occurrencesUrl} className="inline-flex items-center gap-1 text-xs font-semibold text-primary">Ver todas<ChevronRight className="h-3.5 w-3.5" /></Link>}</div>
        <EnvironmentOccurrenceList occurrences={summary.occurrences} onSelect={onSelectOccurrence} limit={5} />
      </section>
    </div>
  );
}
