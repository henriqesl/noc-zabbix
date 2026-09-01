import { useMemo } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import { ClientFilterBar } from '@/components/noc/ClientFilterBar';
import { GroupSummaryCard } from '@/components/noc/GroupSummaryCard';
import { filterClientGroups, isActiveNocGroup, type ClientGroupFilters } from '@/domain/noc-selectors';
import { useNocData } from '@/hooks/use-noc-data';

export default function EnvironmentsPage() {
  const data = useOutletContext<ReturnType<typeof useNocData>>();
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo<ClientGroupFilters>(() => ({
    search: searchParams.get('busca') ?? '',
    status: readOption(searchParams.get('estado'), ['all', 'online', 'offline', 'warning', 'unknown'], 'all'),
    type: readOption(searchParams.get('tipo'), ['all', 'server', 'camera', 'switch', 'router', 'firewall'], 'all'),
    bucket: readOption(searchParams.get('grupo'), ['all', 'base', 'cliente'], 'all'),
    sortBy: readOption(searchParams.get('ordem'), ['criticality', 'name', 'health', 'offline', 'devices'], 'criticality'),
  }), [searchParams]);
  const activeGroups = useMemo(() => data.groups.filter(isActiveNocGroup), [data.groups]);
  const filteredGroups = useMemo(() => filterClientGroups(data.groups, filters), [data.groups, filters]);
  const setFilters = (nextFilters: ClientGroupFilters) => {
    const next = new URLSearchParams(searchParams);
    setOrDelete(next, 'busca', nextFilters.search);
    setOrDelete(next, 'estado', nextFilters.status, 'all');
    setOrDelete(next, 'tipo', nextFilters.type, 'all');
    setOrDelete(next, 'grupo', nextFilters.bucket, 'all');
    setOrDelete(next, 'ordem', nextFilters.sortBy, 'criticality');
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Ambientes</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground lg:text-4xl">Clientes e operações monitoradas</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground lg:text-base">Compare rapidamente saúde, alertas e qualidade da visibilidade antes de abrir a investigação.</p>
      </header>

      <ClientFilterBar filters={filters} onFiltersChange={setFilters} totalVisible={filteredGroups.length} totalActive={activeGroups.length} hiddenInactive={data.groups.length - activeGroups.length} />

      {filteredGroups.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3 min-[2400px]:grid-cols-4">
          {filteredGroups.map((group, index) => (
            <Link key={group.id} to={`/ambientes/${group.id}`} className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <GroupSummaryCard group={group} index={index} />
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-card/40 p-10 text-center text-sm text-muted-foreground">Nenhum ambiente encontrado com os filtros atuais.</div>
      )}
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
