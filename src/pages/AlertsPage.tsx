import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal } from 'lucide-react';
import { useMemo, type KeyboardEvent, type ReactNode } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { OccurrenceBadge } from '@/components/noc/OccurrenceBadge';
import { OccurrenceEvidenceSheet } from '@/components/noc/OccurrenceEvidenceSheet';
import type { AlertSeverity, NocOccurrence, OccurrenceKind } from '@/domain/noc';
import { buildNocOccurrences, getOccurrenceCounts } from '@/domain/noc-occurrences';
import { isWithinPeriod, parseAlertTime } from '@/domain/noc-selectors';
import { useNocData } from '@/hooks/use-noc-data';
import { getKeyboardTab } from '@/lib/tab-navigation';

type TabValue = 'all' | OccurrenceKind;
type StatusFilter = 'all' | 'open' | 'acknowledged';
type PeriodFilter = 'all' | '1h' | '6h' | '24h' | '7d';

const pageSize = 15;
const maxOccurrences = 300;

const tabDefinitions: Array<{ value: TabValue; label: string; countKey: keyof ReturnType<typeof getOccurrenceCounts> }> = [
  { value: 'all', label: 'Todas', countKey: 'all' },
  { value: 'failure', label: 'Falhas', countKey: 'failure' },
  { value: 'alert', label: 'Alertas', countKey: 'alert' },
  { value: 'visibility', label: 'Visibilidade', countKey: 'visibility' },
];
const tabValues = tabDefinitions.map(item => item.value);

export default function AlertsPage() {
  const data = useOutletContext<ReturnType<typeof useNocData>>();
  const [searchParams, setSearchParams] = useSearchParams();
  const occurrences = useMemo(() => buildNocOccurrences(data.groups, data.alerts), [data.alerts, data.groups]);
  const counts = useMemo(() => getOccurrenceCounts(occurrences), [occurrences]);
  const hasAcknowledgementData = occurrences.some(occurrence => occurrence.acknowledged !== undefined);
  const tab = readTab(searchParams.get('aba'));
  const search = searchParams.get('busca') ?? '';
  const environment = searchParams.get('cliente') ?? 'all';
  const severity = readOption<AlertSeverity | 'all'>(searchParams.get('severidade'), ['all', 'critical', 'warning', 'info'], 'all');
  const status = readOption<StatusFilter>(searchParams.get('status'), ['all', 'open', 'acknowledged'], 'all');
  const period = readOption<PeriodFilter>(searchParams.get('periodo'), ['all', '1h', '6h', '24h', '7d'], 'all');
  const requestedPage = Math.max(1, Number(searchParams.get('pagina')) || 1);
  const selectedId = searchParams.get('ocorrencia');
  const selectedOccurrence = occurrences.find(item => item.id === selectedId) ?? null;
  const environments = useMemo(
    () => Array.from(new Set(occurrences.map(item => item.environmentName))).sort((a, b) => a.localeCompare(b)),
    [occurrences]
  );
  const normalizedSearch = normalize(search);

  const filteredOccurrences = occurrences.filter(occurrence => {
    const matchesTab = tab === 'all' || occurrence.kind === tab;
    const matchesEnvironment = environment === 'all' || occurrence.environmentName === environment;
    const matchesSeverity = severity === 'all' || occurrence.severity === severity;
    const matchesStatus = !hasAcknowledgementData || status === 'all' || (status === 'acknowledged' ? occurrence.acknowledged === true : occurrence.acknowledged === false);
    const matchesPeriod = isWithinPeriod(occurrence.evidence.observedAt, period);
    const searchable = normalize([
      occurrence.title,
      occurrence.environmentName,
      occurrence.evidence.reasonCode,
      occurrence.evidence.reasonLabel,
      occurrence.proxyName ?? '',
      ...occurrence.affectedDevices.flatMap(device => [device.name, device.ip]),
    ].join(' '));
    return matchesTab && matchesEnvironment && matchesSeverity && matchesStatus && matchesPeriod && (!normalizedSearch || searchable.includes(normalizedSearch));
  }).slice(0, maxOccurrences);
  const totalPages = Math.max(1, Math.ceil(filteredOccurrences.length / pageSize));
  const currentPage = Math.min(requestedPage, totalPages);
  const pageOccurrences = filteredOccurrences.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const updateFilter = (key: string, value: string, defaultValue = '') => {
    const next = new URLSearchParams(searchParams);
    setOrDelete(next, key, value, defaultValue);
    next.delete('pagina');
    next.delete('ocorrencia');
    setSearchParams(next, { replace: true });
  };
  const selectTab = (nextTab: TabValue) => updateFilter('aba', tabToUrl(nextTab), 'todas');
  const navigateTabs = (event: KeyboardEvent<HTMLButtonElement>) => {
    const nextTab = getKeyboardTab(tab, tabValues, event.key);
    if (!nextTab) return;
    event.preventDefault();
    document.getElementById(`occurrence-tab-${nextTab}`)?.focus();
    selectTab(nextTab);
  };
  const setPage = (page: number) => {
    const next = new URLSearchParams(searchParams);
    setOrDelete(next, 'pagina', String(page), '1');
    next.delete('ocorrencia');
    setSearchParams(next, { replace: true });
  };
  const selectOccurrence = (occurrence: NocOccurrence | null) => {
    const next = new URLSearchParams(searchParams);
    if (occurrence) next.set('ocorrencia', occurrence.id);
    else next.delete('ocorrencia');
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Ocorrências</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground lg:text-4xl">O que exige análise</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground lg:text-base">Falhas confirmadas, alertas e limitações de visibilidade em uma única linha de investigação.</p>
      </header>

      <div className="border-b border-border" role="tablist" aria-label="Tipo de ocorrência">
        <div className="flex gap-1 overflow-x-auto">
          {tabDefinitions.map(item => (
            <button
              key={item.value}
              id={`occurrence-tab-${item.value}`}
              type="button"
              role="tab"
              aria-selected={tab === item.value}
              tabIndex={tab === item.value ? 0 : -1}
              onKeyDown={navigateTabs}
              onClick={() => selectTab(item.value)}
              className={`inline-flex min-h-11 items-center gap-2 whitespace-nowrap border-b-2 px-3 text-sm font-semibold transition-colors ${tab === item.value ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              {item.label}<span className="rounded-md bg-surface-elevated px-1.5 py-0.5 font-mono text-xs">{counts[item.countKey]}</span>
            </button>
          ))}
        </div>
      </div>

      <section className="rounded-xl border border-border bg-card/50 p-3" aria-label="Filtros de ocorrências">
        <div className={`grid grid-cols-1 gap-2 sm:grid-cols-2 ${hasAcknowledgementData ? 'xl:grid-cols-[minmax(14rem,1fr)_repeat(4,minmax(9rem,auto))]' : 'xl:grid-cols-[minmax(14rem,1fr)_repeat(3,minmax(9rem,auto))]'}`}>
          <label className="relative sm:col-span-2 xl:col-span-1">
            <span className="sr-only">Buscar ocorrências</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={event => updateFilter('busca', event.target.value)} className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary" placeholder="Ambiente, equipamento, IP ou evidência" />
          </label>
          <FilterSelect label="Ambiente" value={environment} onChange={value => updateFilter('cliente', value, 'all')}>
            <option value="all">Todos ambientes</option>
            {environments.map(item => <option key={item} value={item}>{item}</option>)}
          </FilterSelect>
          <FilterSelect label="Severidade" value={severity} onChange={value => updateFilter('severidade', value, 'all')}>
            <option value="all">Toda severidade</option><option value="critical">Alta</option><option value="warning">Alerta</option><option value="info">Informativa</option>
          </FilterSelect>
          {hasAcknowledgementData && (
            <FilterSelect label="Reconhecimento" value={status} onChange={value => updateFilter('status', value, 'all')}>
              <option value="all">Todo reconhecimento</option><option value="open">Não reconhecidas</option><option value="acknowledged">Reconhecidas</option>
            </FilterSelect>
          )}
          <FilterSelect label="Período" value={period} onChange={value => updateFilter('periodo', value, 'all')}>
            <option value="all">Todo período</option><option value="1h">Última hora</option><option value="6h">Últimas 6 horas</option><option value="24h">Últimas 24 horas</option><option value="7d">Últimos 7 dias</option>
          </FilterSelect>
        </div>
      </section>

      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><SlidersHorizontal className="h-3.5 w-3.5" />{filteredOccurrences.length} de {occurrences.length} ocorrências</span>
        {occurrences.length > maxOccurrences && <span>Exibindo no máximo {maxOccurrences}</span>}
      </div>

      {pageOccurrences.length > 0 ? (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-border bg-card/40 md:block">
            <table className="w-full table-fixed text-left text-sm">
              <caption className="sr-only">Ocorrências operacionais filtradas</caption>
              <thead className="border-b border-border bg-surface/70 text-xs uppercase tracking-wide text-muted-foreground">
                <tr><th className="w-[13rem] px-4 py-3 font-semibold">Estado</th><th className="w-[24%] px-4 py-3 font-semibold">Ambiente e impacto</th><th className="px-4 py-3 font-semibold">Evidência</th><th className="w-[9rem] px-4 py-3 font-semibold">Desde</th><th className="w-[8rem] px-4 py-3"><span className="sr-only">Ações</span></th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pageOccurrences.map(occurrence => <OccurrenceTableRow key={occurrence.id} occurrence={occurrence} onSelect={() => selectOccurrence(occurrence)} />)}
              </tbody>
            </table>
          </div>

          <div className="space-y-2 md:hidden">
            {pageOccurrences.map(occurrence => <OccurrenceMobileRow key={occurrence.id} occurrence={occurrence} onSelect={() => selectOccurrence(occurrence)} />)}
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-card/40 p-10 text-center"><p className="font-semibold text-foreground">Nenhuma ocorrência encontrada</p><p className="mt-1 text-sm text-muted-foreground">Ajuste os filtros ou selecione outra aba.</p></div>
      )}

      {totalPages > 1 && (
        <nav className="flex items-center justify-between rounded-xl border border-border bg-card/40 p-3" aria-label="Paginação">
          <p className="text-sm text-muted-foreground">Página {currentPage} de {totalPages}</p>
          <div className="flex gap-2">
            <PageButton label="Anterior" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} icon={<ChevronLeft className="h-4 w-4" />} />
            <PageButton label="Próxima" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)} icon={<ChevronRight className="h-4 w-4" />} iconAfter />
          </div>
        </nav>
      )}

      <OccurrenceEvidenceSheet occurrence={selectedOccurrence} onOpenChange={open => !open && selectOccurrence(null)} />
    </div>
  );
}

function OccurrenceTableRow({ occurrence, onSelect }: { occurrence: NocOccurrence; onSelect: () => void }) {
  const impact = occurrence.affectedDevices.length === 1 ? occurrence.affectedDevices[0].name : `${occurrence.affectedDevices.length} equipamentos`;
  return (
    <tr className="transition-colors hover:bg-surface-elevated/35">
      <td className="px-4 py-3"><OccurrenceBadge occurrence={occurrence} /></td>
      <td className="px-4 py-3"><p className="truncate font-semibold text-foreground">{occurrence.environmentName}</p><p className="truncate text-xs text-muted-foreground">{impact}</p></td>
      <td className="px-4 py-3"><p className="truncate text-foreground">{occurrence.title}</p><p className="truncate font-mono text-xs text-muted-foreground">{occurrence.evidence.reasonCode}</p></td>
      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{formatOccurrenceTime(occurrence)}</td>
      <td className="px-4 py-3 text-right"><button type="button" onClick={onSelect} className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Evidências</button></td>
    </tr>
  );
}

function OccurrenceMobileRow({ occurrence, onSelect }: { occurrence: NocOccurrence; onSelect: () => void }) {
  return (
    <button type="button" onClick={onSelect} className="w-full rounded-xl border border-border bg-card/50 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
      <div className="flex items-start justify-between gap-3"><OccurrenceBadge occurrence={occurrence} /><span className="font-mono text-xs text-muted-foreground">{formatOccurrenceTime(occurrence)}</span></div>
      <p className="mt-3 font-semibold text-foreground">{occurrence.environmentName}</p><p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{occurrence.title}</p>
    </button>
  );
}

function FilterSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return <label><span className="sr-only">{label}</span><select aria-label={label} value={value} onChange={event => onChange(event.target.value)} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary">{children}</select></label>;
}

function PageButton({ label, disabled, onClick, icon, iconAfter = false }: { label: string; disabled: boolean; onClick: () => void; icon: ReactNode; iconAfter?: boolean }) {
  return <button type="button" disabled={disabled} onClick={onClick} className="inline-flex h-9 items-center gap-1 rounded-lg border border-border px-3 text-sm font-medium text-foreground hover:bg-surface-elevated disabled:cursor-not-allowed disabled:opacity-40">{!iconAfter && icon}{label}{iconAfter && icon}</button>;
}

function readTab(value: string | null): TabValue {
  const tabsByUrl: Record<string, TabValue> = {
    todas: 'all',
    falhas: 'failure',
    alertas: 'alert',
    visibilidade: 'visibility',
  };
  return tabsByUrl[value ?? ''] ?? 'all';
}

function tabToUrl(value: TabValue) {
  return { all: 'todas', failure: 'falhas', alert: 'alertas', visibility: 'visibilidade' }[value];
}

function readOption<T extends string>(value: string | null, options: readonly T[], fallback: T): T {
  return value && options.includes(value as T) ? value as T : fallback;
}

function setOrDelete(params: URLSearchParams, key: string, value: string, defaultValue = '') {
  if (!value || value === defaultValue) params.delete(key);
  else params.set(key, value);
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function formatOccurrenceTime(occurrence: NocOccurrence) {
  const observedAt = parseAlertTime(occurrence.evidence.observedAt);
  return observedAt > 0 ? formatDistanceToNow(observedAt, { addSuffix: true, locale: ptBR }) : 'sem horário';
}
