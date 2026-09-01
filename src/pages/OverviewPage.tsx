import { useMemo } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ChevronRight, EyeOff, MonitorCheck, Siren } from 'lucide-react';
import { ClientFilterBar } from '@/components/noc/ClientFilterBar';
import { AttentionQueue } from '@/components/noc/AttentionQueue';
import { GroupSummaryCard } from '@/components/noc/GroupSummaryCard';
import { StatusCard } from '@/components/noc/StatusCard';
import { VisibilityPanel } from '@/components/noc/VisibilityPanel';
import { useNocData } from '@/hooks/use-noc-data';
import { cn } from '@/lib/utils';
import {
  filterClientGroups,
  getAlertSummary,
  getEnvironmentAttentionQueue,
  groupByBucket,
  groupOfflineDevicesByClient,
  isActiveNocGroup,
  type ClientGroupFilters,
} from '@/domain/noc-selectors';

const sectionLabels = { base: 'Operação Bionic', cliente: 'Clientes', outros: 'Outros' };

export default function OverviewPage() {
  const data = useOutletContext<ReturnType<typeof useNocData>>();
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo<ClientGroupFilters>(() => ({
    search: searchParams.get('busca') ?? '',
    status: readOption(searchParams.get('estado'), ['all', 'online', 'offline', 'warning', 'unknown'], 'all'),
    type: readOption(searchParams.get('tipo'), ['all', 'server', 'camera', 'switch', 'router', 'firewall'], 'all'),
    bucket: readOption(searchParams.get('grupo'), ['all', 'base', 'cliente'], 'all'),
    sortBy: readOption(searchParams.get('ordem'), ['criticality', 'name', 'health', 'offline', 'devices'], 'criticality'),
  }), [searchParams]);
  const setFilters = (nextFilters: ClientGroupFilters) => {
    const next = new URLSearchParams(searchParams);
    setOrDelete(next, 'busca', nextFilters.search);
    setOrDelete(next, 'estado', nextFilters.status, 'all');
    setOrDelete(next, 'tipo', nextFilters.type, 'all');
    setOrDelete(next, 'grupo', nextFilters.bucket, 'all');
    setOrDelete(next, 'ordem', nextFilters.sortBy, 'criticality');
    setSearchParams(next, { replace: true });
  };
  const alertSummary = getAlertSummary(data.alerts, data.visibilityAffectedDevices);
  const activeGroups = useMemo(() => data.groups.filter(isActiveNocGroup), [data.groups]);
  const attentionQueue = useMemo(
    () => getEnvironmentAttentionQueue(activeGroups, data.alerts),
    [activeGroups, data.alerts]
  );
  const filteredGroups = useMemo(() => filterClientGroups(data.groups, filters), [data.groups, filters]);
  const groupedFilteredGroups = useMemo(() => groupByBucket(filteredGroups), [filteredGroups]);
  const affectedClients = useMemo(
    () => groupOfflineDevicesByClient(data.realOfflineDevices).length,
    [data.realOfflineDevices]
  );

  return (
    <div className="space-y-7 2xl:space-y-9">
      <section className="space-y-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Visão geral</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground lg:text-4xl">Situação da operação</h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground lg:text-base">
              Uma leitura simples do que está funcionando, do que precisa de ação e do que não pôde ser verificado.
            </p>
          </div>
          <Link to="/ocorrencias" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
            Ver todas as ocorrências <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <OperationalHeadline
          error={Boolean(data.error)}
          confirmed={data.realOfflineDevices.length}
          affectedClients={affectedClients}
          alerts={alertSummary.totalActiveAlerts}
          unconfirmed={data.visibilityAffectedDevices.length}
        />

        {data.isLoading && !data.error && (
          <div className="rounded-xl border border-border bg-card/70 p-4 text-sm text-muted-foreground">Carregando a primeira leitura do Zabbix…</div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:gap-4">
          <StatusCard title="Precisa de ação" value={data.realOfflineDevices.length} subtitle={`${affectedClients} ambientes com falha confirmada`} icon={<Siren className="h-5 w-5" />} variant={data.realOfflineDevices.length ? 'critical' : 'default'} />
          <StatusCard title="Alertas importantes" value={alertSummary.totalActiveAlerts} subtitle={`${alertSummary.criticalAlerts.length} são de alta severidade`} icon={<AlertTriangle className="h-5 w-5" />} variant={alertSummary.totalActiveAlerts ? 'warning' : 'default'} />
          <StatusCard title="Não foi possível verificar" value={data.visibilityAffectedDevices.length} subtitle="estado desconhecido ou acesso via proxy" icon={<EyeOff className="h-5 w-5" />} variant={data.visibilityAffectedDevices.length ? 'info' : 'default'} />
          <StatusCard title="Funcionando agora" value={data.onlineCount} subtitle={`de ${data.totalCount} equipamentos monitorados`} icon={<MonitorCheck className="h-5 w-5" />} variant="success" />
        </div>
      </section>

      <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(22rem,0.85fr)]">
        <div className="space-y-3">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Prioridades</p>
              <h2 className="mt-1 text-2xl font-semibold text-foreground">Onde começar</h2>
              <p className="mt-1 text-sm text-muted-foreground">Até cinco ambientes, ordenados pelo impacto e pela duração.</p>
            </div>
            <Link to="/ocorrencias" className="hidden items-center gap-1 text-xs font-semibold text-primary sm:flex">Ver todas<ChevronRight className="h-3.5 w-3.5" /></Link>
          </div>

          {attentionQueue.length > 0 ? (
            <AttentionQueue items={attentionQueue} />
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-noc-ok/25 bg-noc-ok/[0.04] px-4 py-4">
              <CheckCircle2 className="h-5 w-5 text-noc-ok" />
              <div><p className="font-semibold text-foreground">Nada exige ação agora</p><p className="text-sm text-muted-foreground">Nenhuma falha, alerta ou limitação de visibilidade foi encontrada.</p></div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Confiança da leitura</p>
            <h2 className="mt-1 text-2xl font-semibold text-foreground">Visibilidade</h2>
          </div>
          <VisibilityPanel groups={activeGroups} proxies={data.offlineProxies} affectedDevices={data.visibilityAffectedDevices} />
        </div>
      </section>

      <section id="ambientes" className="scroll-mt-24 space-y-4 border-t border-border pt-7">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Detalhamento técnico</p>
            <h2 className="mt-1 text-2xl font-semibold text-foreground">Ambientes monitorados</h2>
            <p className="mt-1 text-sm text-muted-foreground">Os ambientes mais críticos aparecem primeiro. Abra um cartão para investigar.</p>
          </div>
        </div>

        <details className="group rounded-xl border border-border bg-card/60">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-foreground">
            Buscar, filtrar ou ordenar ambientes
            <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
          </summary>
          <div className="border-t border-border p-3">
            <ClientFilterBar filters={filters} onFiltersChange={setFilters} totalVisible={filteredGroups.length} totalActive={activeGroups.length} hiddenInactive={data.groups.length - activeGroups.length} />
          </div>
        </details>

        <div className="space-y-7">
          {(['base', 'cliente', 'outros'] as const).map(bucket => {
            const groups = groupedFilteredGroups[bucket];
            if (!groups.length) return null;
            return (
              <section key={bucket} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">{sectionLabels[bucket]}</h3>
                  <span className="rounded-full bg-muted px-2.5 py-1 font-mono text-xs text-muted-foreground">{groups.length}</span>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3 min-[2400px]:grid-cols-4">
                  {groups.map((group, index) => <Link key={group.id} to={`/ambientes/${group.id}`} className="block rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"><GroupSummaryCard group={group} index={index} /></Link>)}
                </div>
              </section>
            );
          })}
          {!filteredGroups.length && <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">Nenhum ambiente encontrado com esses filtros.</div>}
        </div>
      </section>
    </div>
  );
}

function readOption<T extends string>(value: string | null, options: readonly T[], fallback: T): T {
  return value && options.includes(value as T) ? value as T : fallback;
}

function setOrDelete(params: URLSearchParams, key: string, value: string, defaultValue = '') {
  if (!value || value === defaultValue) params.delete(key);
  else params.set(key, value);
}

function OperationalHeadline({ error, confirmed, affectedClients, alerts, unconfirmed }: { error: boolean; confirmed: number; affectedClients: number; alerts: number; unconfirmed: number }) {
  const state = error ? 'error' : confirmed > 0 ? 'critical' : alerts > 0 ? 'warning' : unconfirmed > 0 ? 'info' : 'healthy';
  const content = {
    error: { title: 'A leitura do Zabbix não foi atualizada', detail: 'Os dados na tela podem estar desatualizados. Verifique a conexão antes de tomar uma decisão.', icon: EyeOff },
    critical: { title: `${affectedClients} ${affectedClients === 1 ? 'ambiente precisa' : 'ambientes precisam'} de atenção`, detail: `${confirmed} ${confirmed === 1 ? 'equipamento apresenta' : 'equipamentos apresentam'} falha confirmada. A equipe deve começar pelos itens em vermelho.`, icon: Siren },
    warning: { title: 'Existem alertas para avaliação', detail: `Não há falha confirmada, mas ${alerts} ${alerts === 1 ? 'alerta precisa' : 'alertas precisam'} ser analisados.`, icon: AlertTriangle },
    info: { title: 'Operação sem falhas confirmadas, com visão parcial', detail: `${unconfirmed} equipamentos não puderam ter o estado confirmado nesta leitura.`, icon: EyeOff },
    healthy: { title: 'Tudo funcionando normalmente', detail: 'Nenhuma falha ou alerta importante foi identificado nesta leitura.', icon: CheckCircle2 },
  }[state];
  const Icon = content.icon;

  return (
    <div className={cn(
      'flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center lg:p-6',
      state === 'critical' ? 'border-noc-critical/45 bg-noc-critical/[0.08]' :
      state === 'warning' ? 'border-noc-warning/40 bg-noc-warning/[0.07]' :
      state === 'info' || state === 'error' ? 'border-info/35 bg-info/[0.07]' : 'border-noc-ok/35 bg-noc-ok/[0.07]'
    )}>
      <span className={cn(
        'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl lg:h-14 lg:w-14',
        state === 'critical' ? 'bg-noc-critical/15 text-noc-critical' :
        state === 'warning' ? 'bg-noc-warning/15 text-noc-warning' : state === 'info' || state === 'error' ? 'bg-info/15 text-info' : 'bg-noc-ok/15 text-noc-ok'
      )}><Icon className="h-6 w-6 lg:h-7 lg:w-7" /></span>
      <div>
        <p className="text-xl font-bold text-foreground lg:text-2xl">{content.title}</p>
        <p className="mt-1 max-w-4xl text-sm leading-relaxed text-muted-foreground lg:text-base">{content.detail}</p>
      </div>
    </div>
  );
}
