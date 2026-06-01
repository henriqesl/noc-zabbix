import { useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { AlertTriangle, CheckCircle, Monitor, MonitorOff, ServerCrash } from 'lucide-react';
import { CriticalBanner } from '@/components/noc/CriticalBanner';
import { ClientFilterBar } from '@/components/noc/ClientFilterBar';
import { GroupSummaryCard } from '@/components/noc/GroupSummaryCard';
import { OfflineByClientPanel } from '@/components/noc/OfflineByClientPanel';
import { ProxyOfflinePanel } from '@/components/noc/ProxyOfflinePanel';
import { StatusCard } from '@/components/noc/StatusCard';
import { useNocData } from '@/hooks/use-noc-data';
import {
  filterClientGroups,
  getAlertSummary,
  groupByBucket,
  isActiveNocGroup,
  type ClientGroupFilters,
} from '@/domain/noc-selectors';

const initialFilters: ClientGroupFilters = {
  search: '',
  status: 'all',
  type: 'all',
  bucket: 'all',
  sortBy: 'criticality',
};

const sectionLabels = {
  base: 'Base NOC',
  cliente: 'Clientes Ativos',
  outros: 'Outros',
};

export default function OverviewPage() {
  const data = useOutletContext<ReturnType<typeof useNocData>>();
  const [filters, setFilters] = useState<ClientGroupFilters>(initialFilters);

  const { criticalAlerts, warningAlerts, totalActiveAlerts, suppressedAlerts } = getAlertSummary(data.alerts, data.devicesOfflineByProxy);
  const activeGroups = useMemo(() => data.groups.filter(isActiveNocGroup), [data.groups]);
  const filteredGroups = useMemo(() => filterClientGroups(data.groups, filters), [data.groups, filters]);
  const groupedFilteredGroups = useMemo(() => groupByBucket(filteredGroups), [filteredGroups]);
  const hiddenInactive = data.groups.length - activeGroups.length;

  return (
    <div className="space-y-6 lg:space-y-8">
      <CriticalBanner
        criticalCount={criticalAlerts.length}
        offlineCount={data.realOfflineDevices.length}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5 lg:gap-4">
        <StatusCard
          title="Dispositivos Online"
          value={data.onlineCount}
          subtitle={`de ${data.totalCount} total`}
          icon={<Monitor className="h-5 w-5" />}
          variant="success"
        />
        <StatusCard
          title="Offline Real"
          value={data.realOfflineDevices.length}
          icon={<MonitorOff className="h-5 w-5" />}
          variant={data.realOfflineDevices.length > 0 ? 'critical' : 'default'}
        />
        <StatusCard
          title="Proxies Offline"
          value={data.offlineProxies.length}
          subtitle={`${data.devicesOfflineByProxy.length} dependentes`}
          icon={<ServerCrash className="h-5 w-5" />}
          variant={data.offlineProxies.length > 0 ? 'critical' : 'default'}
        />
        <StatusCard
          title="Alertas Ativos"
          value={totalActiveAlerts}
          subtitle={`${criticalAlerts.length} criticos / ${suppressedAlerts.length} via proxy`}
          icon={<AlertTriangle className="h-5 w-5" />}
          variant={criticalAlerts.length > 0 ? 'critical' : warningAlerts.length > 0 ? 'warning' : 'default'}
        />
        <StatusCard
          title="Saude Geral"
          value={data.totalCount > 0 ? `${Math.round((data.onlineCount / data.totalCount) * 100)}%` : '-'}
          icon={<CheckCircle className="h-5 w-5" />}
          variant="success"
        />
      </div>

      <ProxyOfflinePanel proxies={data.offlineProxies} impactedDevices={data.devicesOfflineByProxy} />

      <section className="space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground lg:text-2xl">Status por Cliente</h2>
            <p className="text-sm text-muted-foreground">Grupos ativos marcados como [BASE] ou [CLIENTE]</p>
          </div>
        </div>

        <ClientFilterBar
          filters={filters}
          onFiltersChange={setFilters}
          totalVisible={filteredGroups.length}
          totalActive={activeGroups.length}
          hiddenInactive={hiddenInactive}
        />

        <div className="space-y-6">
          {(['base', 'cliente', 'outros'] as const).map(bucket => {
            const groups = groupedFilteredGroups[bucket];
            if (groups.length === 0) return null;

            return (
              <section key={bucket} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {sectionLabels[bucket]}
                  </h3>
                  <span className="font-mono text-xs text-muted-foreground">{groups.length}</span>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3 min-[1800px]:grid-cols-4">
                  {groups.map((group, i) => (
                    <Link key={group.id} to={`/cliente/${group.id}`} className="block transition-transform hover:scale-[1.01]">
                      <GroupSummaryCard group={group} index={i} />
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}

          {filteredGroups.length === 0 && (
            <div className="rounded-lg border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
              Nenhum grupo ativo encontrado com os filtros atuais.
            </div>
          )}
        </div>
      </section>

      <OfflineByClientPanel
        title="Dispositivos realmente offline"
        description="Resumo por cliente. Expanda apenas quando precisar ver os hosts."
        devices={data.realOfflineDevices}
      />

      <OfflineByClientPanel
        title="Offline por indisponibilidade de proxy"
        description="Nao entra no contador de alertas criticos; use como impacto operacional do proxy."
        devices={data.devicesOfflineByProxy}
        variant="muted"
      />
    </div>
  );
}
