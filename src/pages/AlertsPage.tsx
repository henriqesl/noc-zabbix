import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { AlertTriangle, BellRing, EyeOff, Search, Siren } from 'lucide-react';
import { AlertRow } from '@/components/noc/AlertRow';
import { StatusCard } from '@/components/noc/StatusCard';
import { useNocData } from '@/hooks/use-noc-data';
import { getAlertSummary, isWithinPeriod, sortAlertsByDateDesc } from '@/domain/noc-selectors';
import type { AlertSeverity } from '@/domain/noc';

type SeverityFilter = AlertSeverity | 'todos';
type StatusFilter = 'todos' | 'abertos' | 'reconhecidos';
type PeriodFilter = 'all' | '1h' | '6h' | '24h' | '7d';
const alertsPerPage = 10;
const maxAlerts = 200;

export default function AlertsPage() {
  const data = useOutletContext<ReturnType<typeof useNocData>>();
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('todos');
  const [clientFilter, setClientFilter] = useState('todos');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('24h');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { visibleAlerts, suppressedAlerts, criticalAlerts, warningAlerts } = getAlertSummary(data.alerts, data.visibilityAffectedDevices);
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
  })).slice(0, maxAlerts);
  const totalPages = Math.max(1, Math.ceil(filteredAlerts.length / alertsPerPage));
  const currentPage = Math.min(page, totalPages);
  const paginatedAlerts = filteredAlerts.slice((currentPage - 1) * alertsPerPage, currentPage * alertsPerPage);

  useEffect(() => {
    setPage(1);
  }, [clientFilter, normalizedSearch, periodFilter, severityFilter, statusFilter]);

  return (
    <div className="space-y-7 2xl:space-y-9">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Central de alertas</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight lg:text-4xl">Eventos que precisam de análise</h1>
          <p className="mt-2 text-sm text-muted-foreground lg:text-base">Alertas em ordem de prioridade e horário. Use os filtros para investigar um cliente.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatusCard title="Alta severidade" value={criticalAlerts.length} subtitle="avaliar primeiro" icon={<Siren className="h-5 w-5" />} variant={criticalAlerts.length ? 'critical' : 'default'} />
        <StatusCard title="Avisos" value={warningAlerts.length} subtitle="podem exigir acompanhamento" icon={<AlertTriangle className="h-5 w-5" />} variant={warningAlerts.length ? 'warning' : 'default'} />
        <StatusCard title="Fora da contagem" value={suppressedAlerts.length} subtitle="estado não confirmado pelo proxy" icon={<EyeOff className="h-5 w-5" />} variant={suppressedAlerts.length ? 'info' : 'default'} />
        <StatusCard title="Alertas exibidos" value={filteredAlerts.length} subtitle={`de ${visibleAlerts.length} acionáveis`} icon={<BellRing className="h-5 w-5" />} />
      </div>

      <section className="rounded-xl border border-border bg-card/70 p-4">
        <div className="mb-3"><h2 className="font-semibold text-foreground">Filtrar alertas</h2><p className="text-xs text-muted-foreground">A lista mostra no máximo os {maxAlerts} eventos mais recentes.</p></div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
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
      </section>

      <div className="space-y-2">
        {paginatedAlerts.length > 0 ? (
          paginatedAlerts.map((alert, index) => (
            <AlertRow key={alert.id} alert={alert} index={index} />
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
            Nenhum alerta encontrado com os filtros atuais.
          </div>
        )}
      </div>

      {filteredAlerts.length > alertsPerPage && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card/70 p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Página {currentPage} de {totalPages} · {paginatedAlerts.length} itens nesta página
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage(value => Math.max(1, value - 1))}
              disabled={currentPage === 1}
              className="h-9 rounded-md border border-border px-3 text-sm text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={() => setPage(value => Math.min(totalPages, value + 1))}
              disabled={currentPage === totalPages}
              className="h-9 rounded-md border border-border px-3 text-sm text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
