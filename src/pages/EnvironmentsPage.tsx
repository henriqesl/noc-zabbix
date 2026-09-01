import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronRight, Search, SlidersHorizontal } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import { EnvironmentStateBadge } from '@/components/noc/EnvironmentStateBadge';
import { buildNocOccurrences } from '@/domain/noc-occurrences';
import {
  buildEnvironmentSummaries,
  filterEnvironmentSummaries,
  type EnvironmentFilters,
  type EnvironmentSummary,
} from '@/domain/noc-environments';
import { useNocData } from '@/hooks/use-noc-data';

export default function EnvironmentsPage() {
  const data = useOutletContext<ReturnType<typeof useNocData>>();
  const [searchParams, setSearchParams] = useSearchParams();
  const occurrences = useMemo(() => buildNocOccurrences(data.groups, data.alerts), [data.alerts, data.groups]);
  const summaries = useMemo(() => buildEnvironmentSummaries(data.groups, occurrences), [data.groups, occurrences]);
  const filters = useMemo<EnvironmentFilters>(() => ({
    search: searchParams.get('busca') ?? '',
    status: readOption(searchParams.get('estado'), ['all', 'action', 'failure', 'alert', 'visibility', 'healthy'], 'all'),
    type: readOption(searchParams.get('tipo'), ['all', 'server', 'camera', 'switch', 'router', 'firewall'], 'all'),
    bucket: readOption(searchParams.get('grupo'), ['all', 'base', 'cliente'], 'all'),
    sortBy: readOption(searchParams.get('ordem'), ['action', 'name', 'failures', 'devices'], 'action'),
  }), [searchParams]);
  const filtered = useMemo(() => filterEnvironmentSummaries(summaries, filters), [filters, summaries]);

  const updateFilter = <TKey extends keyof EnvironmentFilters>(key: TKey, value: EnvironmentFilters[TKey]) => {
    const next = new URLSearchParams(searchParams);
    const queryKey = { search: 'busca', status: 'estado', type: 'tipo', bucket: 'grupo', sortBy: 'ordem' }[key];
    const defaultValue = key === 'sortBy' ? 'action' : key === 'search' ? '' : 'all';
    setOrDelete(next, queryKey, String(value), defaultValue);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Ambientes</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground lg:text-4xl">Ambientes em ordem de ação</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground lg:text-base">Compare impacto, alertas e confiança da leitura antes de abrir uma investigação.</p>
      </header>

      <section className="rounded-xl border border-border bg-card/50 p-3" aria-label="Filtros de ambientes">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(16rem,1fr)_repeat(4,minmax(9rem,auto))]">
          <label className="relative sm:col-span-2 xl:col-span-1">
            <span className="sr-only">Buscar ambientes</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={filters.search} onChange={event => updateFilter('search', event.target.value)} className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary" placeholder="Cliente, equipamento, IP ou proxy" />
          </label>
          <FilterSelect label="Situação" value={filters.status} onChange={value => updateFilter('status', value as EnvironmentFilters['status'])}>
            <option value="all">Todas as situações</option><option value="action">Exigem ação</option><option value="failure">Falha confirmada</option><option value="alert">Alerta</option><option value="visibility">Não confirmado</option><option value="healthy">Funcionando</option>
          </FilterSelect>
          <FilterSelect label="Tipo" value={filters.type} onChange={value => updateFilter('type', value as EnvironmentFilters['type'])}>
            <option value="all">Todos os tipos</option><option value="server">Servidores</option><option value="camera">Câmeras</option><option value="router">Roteadores</option><option value="switch">Switches</option><option value="firewall">Firewalls</option>
          </FilterSelect>
          <FilterSelect label="Grupo" value={filters.bucket} onChange={value => updateFilter('bucket', value as EnvironmentFilters['bucket'])}>
            <option value="all">Clientes e base</option><option value="cliente">Clientes</option><option value="base">Base Bionic</option>
          </FilterSelect>
          <FilterSelect label="Ordenação" value={filters.sortBy} onChange={value => updateFilter('sortBy', value as EnvironmentFilters['sortBy'])}>
            <option value="action">Prioridade de ação</option><option value="name">Nome</option><option value="failures">Mais falhas</option><option value="devices">Mais equipamentos</option>
          </FilterSelect>
        </div>
      </section>

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><SlidersHorizontal className="h-3.5 w-3.5" />{filtered.length} de {summaries.length} ambientes</div>

      {filtered.length > 0 ? (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-border bg-card/40 md:block">
            <table className="w-full table-fixed text-left text-sm">
              <thead className="border-b border-border bg-surface/70 text-xs uppercase tracking-wide text-muted-foreground">
                <tr><th className="w-[14rem] px-4 py-3 font-semibold">Situação</th><th className="w-[24%] px-4 py-3 font-semibold">Ambiente</th><th className="px-4 py-3 font-semibold">Impacto atual</th><th className="w-[12rem] px-4 py-3 font-semibold">Visibilidade</th><th className="w-[9rem] px-4 py-3 font-semibold">Monitorados</th><th className="w-[8rem] px-4 py-3"><span className="sr-only">Ações</span></th></tr>
              </thead>
              <tbody className="divide-y divide-border">{filtered.map(summary => <EnvironmentTableRow key={summary.group.id} summary={summary} to={buildDetailUrl(summary, searchParams)} />)}</tbody>
            </table>
          </div>
          <div className="space-y-2 md:hidden">{filtered.map(summary => <EnvironmentMobileRow key={summary.group.id} summary={summary} to={buildDetailUrl(summary, searchParams)} />)}</div>
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-card/40 p-10 text-center"><p className="font-semibold text-foreground">Nenhum ambiente encontrado</p><p className="mt-1 text-sm text-muted-foreground">Ajuste os filtros para ampliar a comparação.</p></div>
      )}
    </div>
  );
}

function EnvironmentTableRow({ summary, to }: { summary: EnvironmentSummary; to: string }) {
  return (
    <tr className="transition-colors hover:bg-surface-elevated/30">
      <td className="px-4 py-3"><EnvironmentStateBadge state={summary.state} />{summary.startedAt && <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">{formatDistanceToNow(summary.startedAt, { addSuffix: true, locale: ptBR })}</p>}</td>
      <td className="px-4 py-3"><Link to={to} className="font-semibold text-foreground hover:text-primary hover:underline">{summary.name}</Link>{summary.group.restriction && <p className="mt-1 truncate text-xs text-info">{summary.group.restriction.label}</p>}</td>
      <td className="px-4 py-3"><ImpactSummary summary={summary} /></td>
      <td className="px-4 py-3">{summary.unconfirmedDevices > 0 ? <span className="font-mono text-info">{summary.unconfirmedDevices} sem confirmação</span> : <span className="text-muted-foreground">Leitura atual</span>}</td>
      <td className="px-4 py-3"><span className="font-mono text-foreground">{summary.totalDevices}</span><span className="ml-1 text-xs text-muted-foreground">{summary.totalDevices === 1 ? 'equipamento' : 'equipamentos'}</span></td>
      <td className="px-4 py-3 text-right"><Link to={to} className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Investigar<ChevronRight className="h-3.5 w-3.5" /></Link></td>
    </tr>
  );
}

function EnvironmentMobileRow({ summary, to }: { summary: EnvironmentSummary; to: string }) {
  return <Link to={to} className="block rounded-xl border border-border bg-card/50 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><div className="flex items-start justify-between gap-3"><EnvironmentStateBadge state={summary.state} /><ChevronRight className="h-4 w-4 text-muted-foreground" /></div><p className="mt-3 font-semibold text-foreground">{summary.name}</p><div className="mt-2"><ImpactSummary summary={summary} /></div><p className="mt-2 text-xs text-muted-foreground">{summary.totalDevices} {summary.totalDevices === 1 ? 'equipamento' : 'equipamentos'} · {summary.unconfirmedDevices > 0 ? `${summary.unconfirmedDevices} sem confirmação` : 'leitura atual'}</p></Link>;
}

function ImpactSummary({ summary }: { summary: EnvironmentSummary }) {
  if (summary.state === 'healthy') return <span className="text-sm text-muted-foreground">Nenhuma ocorrência ativa</span>;
  return <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs"><ImpactValue value={summary.confirmedFailures} label={summary.confirmedFailures === 1 ? 'falha' : 'falhas'} className="text-noc-critical" /><ImpactValue value={summary.alertOccurrences} label={summary.alertOccurrences === 1 ? 'alerta' : 'alertas'} className="text-noc-warning" /><ImpactValue value={summary.unconfirmedDevices} label={summary.unconfirmedDevices === 1 ? 'não confirmado' : 'não confirmados'} className="text-info" /></div>;
}

function ImpactValue({ value, label, className }: { value: number; label: string; className: string }) {
  if (!value) return null;
  return <span className={className}><strong className="font-mono">{value}</strong> {label}</span>;
}

function FilterSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return <label><span className="sr-only">{label}</span><select aria-label={label} value={value} onChange={event => onChange(event.target.value)} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary">{children}</select></label>;
}

function buildDetailUrl(summary: EnvironmentSummary, params: URLSearchParams) {
  const detail = new URLSearchParams();
  detail.set('aba', 'atencao');
  const mode = params.get('mode');
  if (mode) detail.set('mode', mode);
  return `/ambientes/${summary.group.id}?${detail.toString()}`;
}

function readOption<T extends string>(value: string | null, options: readonly T[], fallback: T): T {
  return value && options.includes(value as T) ? value as T : fallback;
}

function setOrDelete(params: URLSearchParams, key: string, value: string, defaultValue = '') {
  if (!value || value === defaultValue) params.delete(key);
  else params.set(key, value);
}
