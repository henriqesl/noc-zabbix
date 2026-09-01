import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { NocOccurrence } from '@/domain/noc';
import { EnvironmentOccurrenceList } from './EnvironmentOccurrenceList';

export function EnvironmentOccurrencesView({
  environmentName,
  occurrences,
  onSelectOccurrence,
  mode,
}: {
  environmentName: string;
  occurrences: NocOccurrence[];
  onSelectOccurrence: (occurrence: NocOccurrence) => void;
  mode?: string | null;
}) {
  const query = new URLSearchParams({ cliente: environmentName });
  if (mode) query.set('mode', mode);
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Histórico ativo</p><h2 className="mt-1 text-xl font-semibold text-foreground">Ocorrências do ambiente</h2><p className="mt-1 text-sm text-muted-foreground">Falhas, alertas e limitações ainda presentes nesta leitura.</p></div><Link to={`/ocorrencias?${query.toString()}`} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">Abrir central de ocorrências<ExternalLink className="h-3.5 w-3.5" /></Link></div>
      {occurrences.length > 0 ? <EnvironmentOccurrenceList occurrences={occurrences} onSelect={onSelectOccurrence} /> : <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Nenhuma ocorrência ativa neste ambiente.</div>}
    </section>
  );
}
