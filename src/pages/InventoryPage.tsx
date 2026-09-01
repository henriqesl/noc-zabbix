import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertTriangle, Archive, Camera, ChevronRight, Database, EyeOff, Network, Router, Search, Server, Shield, Siren, SlidersHorizontal, Video } from 'lucide-react';
import { useMemo, type ElementType, type ReactNode } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import { OperationalStateBadge } from '@/components/noc/OperationalStateBadge';
import type { Device, DeviceType, OperationalState } from '@/domain/noc';
import {
  filterInventoryDevices,
  getInventoryDevices,
  getInventoryEnvironments,
  getInventorySummary,
  groupInventoryDevices,
  INVENTORY_TYPE_LABELS,
  type InventoryFilters,
  type InventoryGroup,
} from '@/domain/noc-inventory';
import { cleanGroupName, getOperationalState, parseAlertTime } from '@/domain/noc-selectors';
import { useNocData } from '@/hooks/use-noc-data';

const typeIcons: Record<DeviceType, ElementType> = {
  camera: Camera,
  recorder: Video,
  storage: Database,
  router: Router,
  switch: Network,
  firewall: Shield,
  server: Server,
};

export default function InventoryPage() {
  const data = useOutletContext<ReturnType<typeof useNocData>>();
  const [searchParams, setSearchParams] = useSearchParams();
  const devices = useMemo(() => getInventoryDevices(data.groups), [data.groups]);
  const summary = useMemo(() => getInventorySummary(devices), [devices]);
  const environments = useMemo(() => getInventoryEnvironments(data.groups), [data.groups]);
  const filters = useMemo<InventoryFilters>(() => ({
    search: searchParams.get('busca') ?? '',
    environment: searchParams.get('cliente') ?? 'all',
    type: readOption(searchParams.get('tipo'), ['all', 'server', 'camera', 'recorder', 'storage', 'switch', 'router', 'firewall'], 'all'),
    state: readOption(searchParams.get('estado'), ['all', 'functioning', 'warning', 'confirmed-failure', 'unconfirmed'], 'all'),
    sortBy: readOption(searchParams.get('ordem'), ['action', 'name', 'environment'], 'action'),
  }), [searchParams]);
  const selectedEnvironment = environments.find(environment => environment.value === filters.environment || environment.groupName === filters.environment);
  const effectiveFilters = useMemo(() => {
    return { ...filters, environment: selectedEnvironment?.groupName ?? filters.environment };
  }, [filters, selectedEnvironment]);
  const environmentIdByName = useMemo(() => new Map(environments.map(environment => [environment.groupName, environment.value])), [environments]);
  const filteredDevices = useMemo(() => filterInventoryDevices(devices, effectiveFilters), [devices, effectiveFilters]);
  const groups = useMemo(() => groupInventoryDevices(filteredDevices), [filteredDevices]);

  const updateFilter = <TKey extends keyof InventoryFilters>(key: TKey, value: InventoryFilters[TKey]) => {
    const next = new URLSearchParams(searchParams);
    const queryKey = { search: 'busca', environment: 'cliente', type: 'tipo', state: 'estado', sortBy: 'ordem' }[key];
    const defaultValue = key === 'search' ? '' : key === 'sortBy' ? 'action' : 'all';
    setOrDelete(next, queryKey, String(value), defaultValue);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Inventário</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground lg:text-4xl">Equipamentos por tipo e ambiente</h1><p className="mt-2 max-w-3xl text-sm text-muted-foreground lg:text-base">Uma lista técnica única para localizar ativos e entender seu estado, sem paredes de cartões.</p></div>
        <Link to="/infraestrutura" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">Proxies ficam em Infraestrutura<ChevronRight className="h-4 w-4" /></Link>
      </header>

      <section className="grid overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 sm:gap-px xl:grid-cols-4" aria-label="Resumo do inventário">
        <SummaryValue label="Equipamentos" value={summary.total} icon={Archive} />
        <SummaryValue label="Falhas confirmadas" value={summary.failures} icon={Siren} tone={summary.failures ? 'critical' : 'default'} />
        <SummaryValue label="Em alerta" value={summary.warnings} icon={AlertTriangle} tone={summary.warnings ? 'warning' : 'default'} />
        <SummaryValue label="Não confirmados" value={summary.unconfirmed} icon={EyeOff} tone={summary.unconfirmed ? 'info' : 'default'} />
      </section>

      <section className="rounded-xl border border-border bg-card/50 p-3" aria-label="Filtros de inventário">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(16rem,1fr)_repeat(4,minmax(10rem,auto))]">
          <label className="relative sm:col-span-2 xl:col-span-1"><span className="sr-only">Buscar no inventário</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={filters.search} onChange={event => updateFilter('search', event.target.value)} placeholder="Equipamento, IP, cliente, proxy ou evidência" className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary" /></label>
          <FilterSelect label="Ambiente" value={selectedEnvironment?.value ?? filters.environment} onChange={value => updateFilter('environment', value)}><option value="all">Todos os ambientes</option>{environments.map(environment => <option key={environment.value} value={environment.value}>{environment.label}</option>)}</FilterSelect>
          <FilterSelect label="Tipo" value={filters.type} onChange={value => updateFilter('type', value as InventoryFilters['type'])}><option value="all">Todos os tipos</option>{Object.entries(INVENTORY_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</FilterSelect>
          <FilterSelect label="Estado" value={filters.state} onChange={value => updateFilter('state', value as InventoryFilters['state'])}><option value="all">Todos os estados</option><option value="confirmed-failure">Falha confirmada</option><option value="warning">Alerta</option><option value="unconfirmed">Estado não confirmado</option><option value="functioning">Funcionando</option></FilterSelect>
          <FilterSelect label="Ordenação" value={filters.sortBy} onChange={value => updateFilter('sortBy', value as InventoryFilters['sortBy'])}><option value="action">Prioridade de ação</option><option value="name">Nome</option><option value="environment">Ambiente</option></FilterSelect>
        </div>
      </section>

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><SlidersHorizontal className="h-3.5 w-3.5" />{filteredDevices.length} de {devices.length} equipamentos</div>

      {groups.length > 0 ? <div className="space-y-3">{groups.map((group, index) => <InventoryTypeGroup key={group.type} group={group} environmentIdByName={environmentIdByName} defaultOpen={groups.length === 1 || group.summary.failures > 0 || group.summary.warnings > 0 || group.summary.unconfirmed > 0 || index === 0} />)}</div> : <div className="rounded-xl border border-dashed border-border bg-card/40 p-10 text-center"><p className="font-semibold text-foreground">Nenhum equipamento encontrado</p><p className="mt-1 text-sm text-muted-foreground">Ajuste os filtros ou escolha outro tipo de ativo.</p></div>}
    </div>
  );
}

function InventoryTypeGroup({ group, defaultOpen, environmentIdByName }: { group: InventoryGroup; defaultOpen: boolean; environmentIdByName: Map<string, string> }) {
  const Icon = typeIcons[group.type];
  return (
    <details open={defaultOpen} className="group overflow-hidden rounded-xl border border-border bg-card/40">
      <summary className="flex cursor-pointer list-none flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="flex items-center gap-2 font-semibold text-foreground"><Icon className="h-4 w-4 text-primary" />{INVENTORY_TYPE_LABELS[group.type]}<span className="font-mono text-xs text-muted-foreground">{group.summary.total}</span></span>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground"><GroupCount value={group.summary.failures} singular="falha" plural="falhas" className="text-noc-critical" /><GroupCount value={group.summary.warnings} singular="alerta" plural="alertas" className="text-noc-warning" /><GroupCount value={group.summary.unconfirmed} singular="não confirmado" plural="não confirmados" className="text-info" /><ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" /></span>
      </summary>
      <div className="border-t border-border">
        <div className="hidden grid-cols-[13rem_minmax(12rem,1fr)_minmax(10rem,0.7fr)_12rem_minmax(12rem,0.8fr)] gap-3 border-b border-border bg-surface/60 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground md:grid"><span>Estado</span><span>Equipamento</span><span>Ambiente</span><span>Proxy</span><span>Evidência</span></div>
        <div className="divide-y divide-border">{group.devices.map(device => <InventoryDeviceRow key={device.id} device={device} environmentId={environmentIdByName.get(device.group)} />)}</div>
      </div>
    </details>
  );
}

function InventoryDeviceRow({ device, environmentId }: { device: Device; environmentId?: string }) {
  const observedAt = parseAlertTime(device.classification.evidence.observedAt);
  return (
    <div className="grid gap-3 px-4 py-3 md:grid-cols-[13rem_minmax(12rem,1fr)_minmax(10rem,0.7fr)_12rem_minmax(12rem,0.8fr)] md:items-center">
      <OperationalStateBadge state={getOperationalState(device)} />
      <div className="min-w-0"><p className="truncate font-medium text-foreground">{device.name}</p><p className="font-mono text-xs text-muted-foreground">{device.ip}</p></div>
      {environmentId ? <Link to={`/ambientes/${environmentId}`} className="truncate text-sm text-foreground hover:text-primary hover:underline">{cleanGroupName(device.group)}</Link> : <span className="truncate text-sm text-foreground">{cleanGroupName(device.group)}</span>}
      <p className="truncate text-xs text-muted-foreground">{device.proxyName ?? 'Sem proxy informado'}</p>
      <div className="min-w-0"><p className="truncate font-mono text-xs text-muted-foreground">{device.classification.evidence.reasonCode}</p>{observedAt > 0 && <p className="mt-1 text-xs text-muted-foreground">{formatDistanceToNow(observedAt, { addSuffix: true, locale: ptBR })}</p>}</div>
    </div>
  );
}

function SummaryValue({ label, value, icon: Icon, tone = 'default' }: { label: string; value: number; icon: ElementType; tone?: 'critical' | 'warning' | 'info' | 'default' }) {
  const toneClass = { critical: 'text-noc-critical', warning: 'text-noc-warning', info: 'text-info', default: 'text-foreground' }[tone];
  return <div className="bg-card px-4 py-3"><p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground"><Icon className="h-3.5 w-3.5" />{label}</p><p className={`mt-1 font-mono text-2xl font-semibold ${toneClass}`}>{value}</p></div>;
}

function GroupCount({ value, singular, plural, className }: { value: number; singular: string; plural: string; className: string }) {
  if (!value) return null;
  return <span className={className}><strong className="font-mono">{value}</strong> {value === 1 ? singular : plural}</span>;
}

function FilterSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return <label><span className="sr-only">{label}</span><select aria-label={label} value={value} onChange={event => onChange(event.target.value)} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary">{children}</select></label>;
}

function readOption<T extends string>(value: string | null, options: readonly T[], fallback: T): T {
  return value && options.includes(value as T) ? value as T : fallback;
}

function setOrDelete(params: URLSearchParams, key: string, value: string, defaultValue = '') {
  if (!value || value === defaultValue) params.delete(key);
  else params.set(key, value);
}
