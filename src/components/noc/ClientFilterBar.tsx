import { Search } from 'lucide-react';
import type { ClientGroupBucket, ClientGroupFilters, ClientSortKey } from '@/domain/noc-selectors';
import type { DeviceStatus, DeviceType } from '@/domain/noc';

interface ClientFilterBarProps {
  filters: ClientGroupFilters;
  onFiltersChange: (filters: ClientGroupFilters) => void;
  totalVisible: number;
  totalActive: number;
  hiddenInactive: number;
}

const statusOptions: Array<{ value: DeviceStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Todos status' },
  { value: 'offline', label: 'Com offline' },
  { value: 'warning', label: 'Com alerta' },
  { value: 'unknown', label: 'Estado não confirmado' },
  { value: 'online', label: 'Com online' },
];

const typeOptions: Array<{ value: DeviceType | 'all'; label: string }> = [
  { value: 'all', label: 'Todos tipos' },
  { value: 'server', label: 'Servidores' },
  { value: 'camera', label: 'Cameras' },
  { value: 'router', label: 'Roteadores' },
  { value: 'switch', label: 'Switches' },
  { value: 'firewall', label: 'Firewalls' },
];

const bucketOptions: Array<{ value: ClientGroupBucket | 'all'; label: string }> = [
  { value: 'all', label: 'Todos ativos' },
  { value: 'cliente', label: 'Clientes' },
  { value: 'base', label: 'Base' },
];

const sortOptions: Array<{ value: ClientSortKey; label: string }> = [
  { value: 'criticality', label: 'Criticidade' },
  { value: 'name', label: 'Nome' },
  { value: 'health', label: 'Saude' },
  { value: 'offline', label: 'Offline' },
  { value: 'devices', label: 'Dispositivos' },
];

export function ClientFilterBar({
  filters,
  onFiltersChange,
  totalVisible,
  totalActive,
  hiddenInactive,
}: ClientFilterBarProps) {
  const updateFilter = <TKey extends keyof ClientGroupFilters>(key: TKey, value: ClientGroupFilters[TKey]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className="rounded-lg border border-border bg-card/80 p-3 lg:p-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={filters.search}
            onChange={event => updateFilter('search', event.target.value)}
            placeholder="Buscar cliente, dispositivo, IP ou tipo"
            className="h-10 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:flex xl:shrink-0">
          <select
            value={filters.status}
            onChange={event => updateFilter('status', event.target.value as ClientGroupFilters['status'])}
            className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
          >
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>

          <select
            value={filters.type}
            onChange={event => updateFilter('type', event.target.value as ClientGroupFilters['type'])}
            className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
          >
            {typeOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>

          <select
            value={filters.bucket}
            onChange={event => updateFilter('bucket', event.target.value as ClientGroupFilters['bucket'])}
            className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
          >
            {bucketOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>

          <select
            value={filters.sortBy}
            onChange={event => updateFilter('sortBy', event.target.value as ClientGroupFilters['sortBy'])}
            className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
          >
            {sortOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>{totalVisible} de {totalActive} grupos ativos</span>
        {hiddenInactive > 0 && <span>{hiddenInactive} grupos sem marcador ativo ocultos</span>}
      </div>
    </div>
  );
}
