import { ArrowLeft } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useOutletContext, useParams, useSearchParams } from 'react-router-dom';
import { EnvironmentAttentionView } from '@/components/noc/EnvironmentAttentionView';
import { EnvironmentInfrastructureView } from '@/components/noc/EnvironmentInfrastructureView';
import { EnvironmentInventoryView, type EnvironmentInventoryFilters } from '@/components/noc/EnvironmentInventoryView';
import { EnvironmentOccurrencesView } from '@/components/noc/EnvironmentOccurrencesView';
import { EnvironmentStateBadge } from '@/components/noc/EnvironmentStateBadge';
import { OccurrenceEvidenceSheet } from '@/components/noc/OccurrenceEvidenceSheet';
import type { NocOccurrence } from '@/domain/noc';
import { buildEnvironmentInfrastructure, buildEnvironmentSummary } from '@/domain/noc-environments';
import { buildNocOccurrences } from '@/domain/noc-occurrences';
import { useNocData } from '@/hooks/use-noc-data';

type DetailTab = 'attention' | 'inventory' | 'occurrences' | 'infrastructure';

const tabs: Array<{ value: DetailTab; label: string }> = [
  { value: 'attention', label: 'Atenção' },
  { value: 'inventory', label: 'Inventário' },
  { value: 'occurrences', label: 'Ocorrências' },
  { value: 'infrastructure', label: 'Infraestrutura' },
];

export default function ClientDetailPage() {
  const data = useOutletContext<ReturnType<typeof useNocData>>();
  const { clientId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const group = data.groups.find(item => item.id === clientId);
  const occurrences = useMemo(() => buildNocOccurrences(data.groups, data.alerts), [data.alerts, data.groups]);
  const summary = useMemo(() => group ? buildEnvironmentSummary(group, occurrences) : null, [group, occurrences]);
  const infrastructure = useMemo(() => group ? buildEnvironmentInfrastructure(group, data.groups) : null, [data.groups, group]);
  const tab = readTab(searchParams.get('aba'));
  const inventoryFilters: EnvironmentInventoryFilters = {
    search: searchParams.get('busca') ?? '',
    state: readOption(searchParams.get('estado'), ['all', 'functioning', 'warning', 'confirmed-failure', 'unconfirmed'], 'all'),
    type: readOption(searchParams.get('tipo'), ['all', 'server', 'camera', 'recorder', 'storage', 'switch', 'router', 'firewall'], 'all'),
  };
  const selectedId = searchParams.get('ocorrencia');
  const selectedOccurrence = summary?.occurrences.find(occurrence => occurrence.id === selectedId) ?? null;

  const updateQuery = (updates: Record<string, string>, defaults: Record<string, string> = {}) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => setOrDelete(next, key, value, defaults[key] ?? ''));
    next.delete('ocorrencia');
    setSearchParams(next, { replace: true });
  };
  const selectTab = (nextTab: DetailTab) => updateQuery({ aba: tabToUrl(nextTab) }, { aba: 'atencao' });
  const setInventoryFilters = (filters: EnvironmentInventoryFilters) => updateQuery(
    { busca: filters.search, estado: filters.state, tipo: filters.type },
    { busca: '', estado: 'all', tipo: 'all' }
  );
  const selectOccurrence = (occurrence: NocOccurrence | null) => {
    const next = new URLSearchParams(searchParams);
    if (occurrence) next.set('ocorrencia', occurrence.id);
    else next.delete('ocorrencia');
    setSearchParams(next, { replace: true });
  };

  if (!group || !summary || !infrastructure) {
    return <div className="py-20 text-center"><p className="text-xl text-muted-foreground">Ambiente não encontrado</p><Link to="/ambientes" className="mt-4 inline-block text-primary underline">Voltar aos ambientes</Link></div>;
  }

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <div className="flex items-start gap-3">
          <Link to={backUrl(searchParams)} aria-label="Voltar aos ambientes" className="mt-0.5 rounded-lg border border-border p-2 text-muted-foreground hover:bg-surface-elevated hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><ArrowLeft className="h-4 w-4" /></Link>
          <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-3"><h1 className="truncate text-2xl font-bold text-foreground lg:text-3xl">{summary.name}</h1><EnvironmentStateBadge state={summary.state} /></div><p className="mt-1 text-sm text-muted-foreground">Investigação orientada por impacto e evidência</p></div>
        </div>

        <section className="grid overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 sm:gap-px xl:grid-cols-4" aria-label="Resumo do ambiente">
          <SummaryValue label="Falhas confirmadas" value={summary.confirmedFailures} tone={summary.confirmedFailures > 0 ? 'critical' : 'default'} />
          <SummaryValue label="Alertas ativos" value={summary.alertOccurrences} tone={summary.alertOccurrences > 0 ? 'warning' : 'default'} />
          <SummaryValue label="Não confirmados" value={summary.unconfirmedDevices} tone={summary.unconfirmedDevices > 0 ? 'info' : 'default'} />
          <SummaryValue label="Equipamentos" value={summary.totalDevices} tone="default" />
        </section>
      </header>

      <div className="border-b border-border" role="tablist" aria-label="Investigação do ambiente"><div className="flex gap-1 overflow-x-auto">{tabs.map(item => <button key={item.value} type="button" role="tab" aria-selected={tab === item.value} onClick={() => selectTab(item.value)} className={`min-h-11 whitespace-nowrap border-b-2 px-3 text-sm font-semibold transition-colors ${tab === item.value ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>{item.label}</button>)}</div></div>

      {tab === 'attention' && <EnvironmentAttentionView summary={summary} onSelectOccurrence={selectOccurrence} occurrencesUrl={tabUrl(searchParams, 'occurrences')} />}
      {tab === 'inventory' && <EnvironmentInventoryView devices={group.devices} filters={inventoryFilters} onFiltersChange={setInventoryFilters} />}
      {tab === 'occurrences' && <EnvironmentOccurrencesView environmentName={summary.name} occurrences={summary.occurrences} onSelectOccurrence={selectOccurrence} mode={searchParams.get('mode')} />}
      {tab === 'infrastructure' && <EnvironmentInfrastructureView infrastructure={infrastructure} snapshot={data.snapshot} error={data.error} restriction={group.restriction} />}

      <OccurrenceEvidenceSheet occurrence={selectedOccurrence} onOpenChange={open => !open && selectOccurrence(null)} />
    </div>
  );
}

function SummaryValue({ label, value, tone }: { label: string; value: number; tone: 'critical' | 'warning' | 'info' | 'default' }) {
  const toneClass = { critical: 'text-noc-critical', warning: 'text-noc-warning', info: 'text-info', default: 'text-foreground' }[tone];
  return <div className="bg-card px-4 py-3"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</p><p className={`mt-1 font-mono text-2xl font-semibold ${toneClass}`}>{value}</p></div>;
}

function readTab(value: string | null): DetailTab {
  const byUrl: Record<string, DetailTab> = { atencao: 'attention', inventario: 'inventory', ocorrencias: 'occurrences', infraestrutura: 'infrastructure' };
  return byUrl[value ?? ''] ?? 'attention';
}

function tabToUrl(tab: DetailTab) {
  return { attention: 'atencao', inventory: 'inventario', occurrences: 'ocorrencias', infrastructure: 'infraestrutura' }[tab];
}

function backUrl(params: URLSearchParams) {
  const mode = params.get('mode');
  return mode ? `/ambientes?mode=${encodeURIComponent(mode)}` : '/ambientes';
}

function tabUrl(params: URLSearchParams, tab: DetailTab) {
  const next = new URLSearchParams(params);
  next.set('aba', tabToUrl(tab));
  next.delete('ocorrencia');
  return `?${next.toString()}`;
}

function readOption<T extends string>(value: string | null, options: readonly T[], fallback: T): T {
  return value && options.includes(value as T) ? value as T : fallback;
}

function setOrDelete(params: URLSearchParams, key: string, value: string, defaultValue = '') {
  if (!value || value === defaultValue) params.delete(key);
  else params.set(key, value);
}
