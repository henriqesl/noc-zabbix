import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Search } from 'lucide-react';
import { AlertRow } from '@/components/noc/AlertRow';
import { useNocData } from '@/hooks/use-noc-data';
import { getAlertSummary, isWithinPeriod, sortAlertsByDateDesc } from '@/domain/noc-selectors';
import type { AlertSeverity } from '@/domain/noc';

type SeverityFilter = AlertSeverity | 'todos';
type StatusFilter = 'todos' | 'abertos' | 'reconhecidos';
type PeriodFilter = 'all' | '1h' | '6h' | '24h' | '7d';

export default function AlertsPage() {
  const data = useOutletContext<ReturnType<typeof useNocData>>();
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('todos');
  const [clientFilter, setClientFilter] = useState('todos');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('24h');
  const [search, setSearch] = useState('');

  const { visibleAlerts, suppressedAlerts } = getAlertSummary(data.alerts, data.devicesOfflineByProxy);
  const uniqueClients = useMemo(() => Array.from(new Set(data.groups.map(group => group.name))).sort(), [data.groups]);
  const normalizedSearch = search.trim().toLowerCase();

  const filteredAlerts = sortAlertsByDateDesc(visibleAlerts.filter(alert => {
    const matchesSeverity = severityFilter === 'todos' || alert.severity === severityFilter;
    const matchesClient =
      clientFilter === 'todos' ||
      alert.group === clientFilter ||
      alert.device.toLowerCase().includes(clientFilter.toLowerCase());
    const matchesStatus =
      statusFilter === 'todos' ||
      (statusFilter === 'reconhecidos' ? Boolean(alert.acknowledged) : !alert.acknowledged);
    const matchesPeriod = isWithinPeriod(alert.timestamp, periodFilter);
    const matchesSearch =
      !normalizedSearch ||
      `${alert.device} ${alert.group} ${alert.message}`.toLowerCase().includes(normalizedSearch);

    return matchesSeverity && matchesClient && matchesStatus && matchesPeriod && matchesSearch;
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Alertas Ativos</h1>
          <p className="text-sm text-muted-foreground">
            {filteredAlerts.length} de {visibleAlerts.length} alertas visiveis
            {suppressedAlerts.length > 0 && ` / ${suppressedAlerts.length} suprimidos por proxy`}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:min-w-[980px] xl:grid-cols-5">
          <div className="relative sm:col-span-2 xl:col-span-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Buscar alerta"
              className="h-10 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
            />
          </div>

          <select
            className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
            value={severityFilter}
            onChange={event => setSeverityFilter(event.target.value as SeverityFilter)}
          >
            <option value="todos">Todas severidades</option>
            <option value="critical">Critico</option>
            <option value="warning">Aviso</option>
            <option value="info">Info</option>
          </select>

          <select
            className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
            value={statusFilter}
            onChange={event => setStatusFilter(event.target.value as StatusFilter)}
          >
            <option value="todos">Todos status</option>
            <option value="abertos">Abertos</option>
            <option value="reconhecidos">Reconhecidos</option>
          </select>

          <select
            className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
            value={periodFilter}
            onChange={event => setPeriodFilter(event.target.value as PeriodFilter)}
          >
            <option value="1h">Ultima hora</option>
            <option value="6h">Ultimas 6h</option>
            <option value="24h">Ultimas 24h</option>
            <option value="7d">Ultimos 7 dias</option>
            <option value="all">Todo periodo</option>
          </select>

          <select
            className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
            value={clientFilter}
            onChange={event => setClientFilter(event.target.value)}
          >
            <option value="todos">Todos clientes</option>
            {uniqueClients.map(client => (
              <option key={client} value={client}>{client}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        {filteredAlerts.length > 0 ? (
          filteredAlerts.map((alert, index) => (
            <AlertRow key={alert.id} alert={alert} index={index} />
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
            Nenhum alerta encontrado com os filtros atuais.
          </div>
        )}
      </div>
    </div>
  );
}
