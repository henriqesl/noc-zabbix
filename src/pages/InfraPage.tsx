import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronRight, Clock3, EyeOff, Network, Search, Server, Waypoints } from 'lucide-react';
import { useMemo, type ElementType, type ReactNode } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { OperationalStateBadge } from '@/components/noc/OperationalStateBadge';
import type { Device, SnapshotFreshness } from '@/domain/noc';
import {
  buildInfrastructureModel,
  filterInfrastructureProxies,
  type InfrastructureFilters,
  type InfrastructureProxy,
} from '@/domain/noc-infrastructure';
import { cleanGroupName, getOperationalState, parseAlertTime } from '@/domain/noc-selectors';
import { useNocData } from '@/hooks/use-noc-data';

export default function InfraPage() {
  const data = useOutletContext<ReturnType<typeof useNocData>>();
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo<InfrastructureFilters>(() => ({
    search: searchParams.get('busca') ?? '',
    state: readState(searchParams.get('estado')),
  }), [searchParams]);
  const model = useMemo(() => buildInfrastructureModel(data.groups, data.snapshot, Date.now()), [data.groups, data.snapshot]);
  const visibleProxies = useMemo(() => filterInfrastructureProxies(model.proxies, filters), [model.proxies, filters]);

  const updateFilter = (key: 'busca' | 'estado', value: string) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === 'all') next.delete(key);
    else next.set(key, value);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Infraestrutura</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground lg:text-4xl">Saúde real da coleta</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground lg:text-base">Servidor, proxies e rede com evidência retornada pelo Zabbix. Falha de comunicação não transforma os hosts associados em offline.</p>
      </header>

      {(data.error || model.snapshotFreshness !== 'current') && (
        <section className="flex items-start gap-3 rounded-xl border border-info/35 bg-info/5 px-4 py-3 text-sm" aria-label="Aviso de visibilidade">
          <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-info" />
          <div><p className="font-semibold text-foreground">Estado atual não confirmado por completo</p><p className="mt-0.5 text-muted-foreground">{data.error ? 'A consulta mais recente falhou; o último snapshot disponível foi preservado.' : freshnessDescription(model.snapshotFreshness)} {model.snapshotObservedAt && `Coleta observada ${formatObservedAt(model.snapshotObservedAt)}.`}</p></div>
        </section>
      )}

      <section className="grid overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 sm:gap-px xl:grid-cols-4" aria-label="Resumo da infraestrutura">
        <SummaryValue label="Coleta" value={freshnessLabel(model.snapshotFreshness)} detail={model.snapshotAgeMs === undefined ? 'sem snapshot disponível' : ageLabel(model.snapshotAgeMs)} icon={Clock3} tone={model.snapshotFreshness === 'current' ? 'success' : 'info'} />
        <SummaryValue label="Servidores" value={model.servers.length} detail="retornados e tipados" icon={Server} />
        <SummaryValue label="Proxies comunicando" value={`${model.communicatingProxies}/${model.proxies.length}`} detail={model.failedProxies ? `${model.failedProxies} com falha própria` : model.unconfirmedProxies ? `${model.unconfirmedProxies} não confirmados` : 'nenhuma falha confirmada'} icon={Waypoints} tone={model.failedProxies ? 'critical' : model.unconfirmedProxies ? 'info' : 'success'} />
        <SummaryValue label="Hosts sem confirmação" value={model.visibilityAffectedHosts} detail="não contabilizados como offline" icon={EyeOff} tone={model.visibilityAffectedHosts ? 'info' : 'default'} />
      </section>

      <section className="space-y-3" aria-labelledby="proxy-heading">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div><h2 id="proxy-heading" className="flex items-center gap-2 text-xl font-semibold text-foreground"><Waypoints className="h-5 w-5 text-primary" />Proxies e comunicação</h2><p className="mt-1 text-sm text-muted-foreground">Uma falha por proxy, com o impacto de visibilidade agrupado abaixo.</p></div>
          <span className="font-mono text-xs text-muted-foreground">{visibleProxies.length} de {model.proxies.length}</span>
        </div>

        <div className="rounded-xl border border-border bg-card/50 p-3" aria-label="Filtros de proxies">
          <div className="grid gap-2 sm:grid-cols-[minmax(16rem,1fr)_13rem]">
            <label className="relative"><span className="sr-only">Buscar proxy ou host associado</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={filters.search} onChange={event => updateFilter('busca', event.target.value)} placeholder="Proxy, ambiente, host ou IP" className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary" /></label>
            <label><span className="sr-only">Estado do proxy</span><select aria-label="Estado do proxy" value={filters.state} onChange={event => updateFilter('estado', event.target.value)} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"><option value="all">Todos os estados</option><option value="confirmed-failure">Falha confirmada</option><option value="warning">Alerta</option><option value="unconfirmed">Estado não confirmado</option><option value="functioning">Funcionando</option></select></label>
          </div>
        </div>

        {visibleProxies.length ? (
          <div className="overflow-hidden rounded-xl border border-border bg-card/40">
            <div className="hidden grid-cols-[13rem_minmax(13rem,1fr)_9rem_9rem_minmax(12rem,1fr)] gap-3 border-b border-border bg-surface/60 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground md:grid"><span>Estado</span><span>Proxy</span><span>Último contato</span><span>Hosts associados</span><span>Ambientes</span></div>
            <div className="divide-y divide-border">{visibleProxies.map(proxy => <ProxyRow key={proxy.id} proxy={proxy} />)}</div>
          </div>
        ) : <EmptyPanel title="Nenhum proxy encontrado">Ajuste a busca ou o filtro de estado.</EmptyPanel>}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <InfrastructureGroup title="Servidores monitorados" description="Ativos tipados como servidor; proxies não entram nesta lista." icon={Server} count={model.servers.length}>
          {model.servers.length ? <div className="divide-y divide-border">{model.servers.map(device => <DeviceRow key={device.id} device={device} />)}</div> : <EmptyPanel title="Nenhum servidor retornado">A API não forneceu ativos tipados como servidor.</EmptyPanel>}
        </InfrastructureGroup>

        <InfrastructureGroup title="Rede observada" description="Roteadores, switches e firewalls derivados do inventário real." icon={Network} count={model.networkGroups.reduce((total, group) => total + group.devices.length, 0)}>
          {model.networkGroups.length ? <div className="divide-y divide-border">{model.networkGroups.map(group => (
            <details key={group.id} className="group">
              <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3"><span className="min-w-0 flex-1"><span className="block truncate font-medium text-foreground">{cleanGroupName(group.name)}</span><span className="mt-0.5 block text-xs text-muted-foreground">{group.devices.length} {group.devices.length === 1 ? 'equipamento' : 'equipamentos'}{group.failures ? ` · ${group.failures} com falha` : group.warnings ? ` · ${group.warnings} em alerta` : group.unconfirmed ? ` · ${group.unconfirmed} sem confirmação` : ''}</span></span><ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" /></summary>
              <div className="border-t border-border bg-background/25">{group.devices.map(device => <DeviceRow key={device.id} device={device} compact />)}</div>
            </details>
          ))}</div> : <EmptyPanel title="Nenhum equipamento de rede">A API não forneceu roteadores, switches ou firewalls tipados.</EmptyPanel>}
        </InfrastructureGroup>
      </section>
    </div>
  );
}

function ProxyRow({ proxy }: { proxy: InfrastructureProxy }) {
  return (
    <details className="group">
      <summary className="grid cursor-pointer list-none gap-3 px-4 py-3 md:grid-cols-[13rem_minmax(13rem,1fr)_9rem_9rem_minmax(12rem,1fr)] md:items-center">
        <OperationalStateBadge state={proxy.state} />
        <span className="min-w-0"><span className="block truncate font-medium text-foreground">{proxy.name}</span><span className="block font-mono text-xs text-muted-foreground">ID {proxy.id}{proxy.missingFromApi ? ' · ausente na resposta da API' : ''}</span></span>
        <span className="text-xs text-muted-foreground">{proxy.observedAt ? formatObservedAt(proxy.observedAt) : 'Sem horário'}</span>
        <span className="text-sm text-foreground"><strong className="font-mono">{proxy.associatedHosts.length}</strong><span className="ml-1 text-xs text-muted-foreground">{proxy.affectedHosts ? `(${proxy.affectedHosts} sem confirmação)` : ''}</span></span>
        <span className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground"><span className="truncate">{proxy.environments.join(', ') || 'Nenhum ambiente associado'}</span><ChevronRight className="ml-auto h-4 w-4 shrink-0 transition-transform group-open:rotate-90" /></span>
      </summary>
      <div className="border-t border-border bg-background/25 px-4 py-3 md:pl-[calc(13rem+2rem)]">
        <p className="text-sm text-muted-foreground">{proxy.reasonLabel}</p>
        {proxy.associatedHosts.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{proxy.associatedHosts.map(host => <span key={host.id} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-xs text-muted-foreground"><OperationalStateBadge state={getOperationalState(host)} compact />{host.name}<span className="font-mono opacity-70">{host.ip}</span></span>)}</div>}
      </div>
    </details>
  );
}

function InfrastructureGroup({ title, description, icon: Icon, count, children }: { title: string; description: string; icon: ElementType; count: number; children: ReactNode }) {
  return <section className="overflow-hidden rounded-xl border border-border bg-card/40"><header className="flex items-start gap-3 border-b border-border px-4 py-3"><Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div className="min-w-0 flex-1"><h2 className="font-semibold text-foreground">{title}</h2><p className="mt-0.5 text-xs text-muted-foreground">{description}</p></div><span className="font-mono text-sm text-muted-foreground">{count}</span></header>{children}</section>;
}

function DeviceRow({ device, compact = false }: { device: Device; compact?: boolean }) {
  const observedAt = parseAlertTime(device.classification.evidence.observedAt);
  return <div className={`grid gap-2 px-4 py-3 ${compact ? 'sm:grid-cols-[11rem_1fr_auto]' : 'sm:grid-cols-[13rem_1fr_auto]'} sm:items-center`}><OperationalStateBadge state={getOperationalState(device)} /><div className="min-w-0"><p className="truncate text-sm font-medium text-foreground">{device.name}</p><p className="truncate font-mono text-xs text-muted-foreground">{device.ip} · {cleanGroupName(device.group)}</p></div><span className="text-xs text-muted-foreground">{observedAt ? formatObservedAt(device.classification.evidence.observedAt) : 'Sem horário'}</span></div>;
}

function SummaryValue({ label, value, detail, icon: Icon, tone = 'default' }: { label: string; value: ReactNode; detail: string; icon: ElementType; tone?: 'critical' | 'info' | 'success' | 'default' }) {
  const toneClass = { critical: 'text-noc-critical', info: 'text-info', success: 'text-noc-ok', default: 'text-foreground' }[tone];
  return <div className="bg-card px-4 py-3"><p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground"><Icon className="h-3.5 w-3.5" />{label}</p><p className={`mt-1 font-mono text-2xl font-semibold ${toneClass}`}>{value}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{detail}</p></div>;
}

function EmptyPanel({ title, children }: { title: string; children: ReactNode }) {
  return <div className="p-8 text-center"><p className="font-semibold text-foreground">{title}</p><p className="mt-1 text-sm text-muted-foreground">{children}</p></div>;
}

function freshnessLabel(freshness: SnapshotFreshness) {
  return { current: 'Atual', delayed: 'Atrasada', expired: 'Vencida' }[freshness];
}

function freshnessDescription(freshness: SnapshotFreshness) {
  return freshness === 'delayed' ? 'A coleta está atrasada e pode não representar o estado atual.' : 'A coleta está vencida e não permite confirmar o estado atual.';
}

function ageLabel(ageMs: number) {
  if (ageMs < 60_000) return 'há menos de 1 minuto';
  return `há ${Math.floor(ageMs / 60_000)} min`;
}

function formatObservedAt(value: string) {
  const timestamp = parseAlertTime(value);
  return timestamp > 0 ? formatDistanceToNow(timestamp, { addSuffix: true, locale: ptBR }) : 'Sem horário';
}

function readState(value: string | null): InfrastructureFilters['state'] {
  const values: InfrastructureFilters['state'][] = ['all', 'functioning', 'warning', 'confirmed-failure', 'unconfirmed'];
  return values.includes(value as InfrastructureFilters['state']) ? value as InfrastructureFilters['state'] : 'all';
}
