import { Search } from 'lucide-react';
import type { DeviceStatus, DeviceType } from '@/domain/noc';

export interface DeviceFilters {
  search: string;
  status: DeviceStatus | 'all';
  type: DeviceType | 'all';
}

interface DeviceFilterBarProps {
  filters: DeviceFilters;
  onFiltersChange: (filters: DeviceFilters) => void;
  totalVisible: number;
  totalDevices: number;
  showTypeFilter?: boolean;
}

const statusOptions: Array<{ value: DeviceStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Todos status' },
  { value: 'offline', label: 'Offline' },
  { value: 'warning', label: 'Alerta' },
  { value: 'unknown', label: 'Estado não confirmado' },
  { value: 'online', label: 'Online' },
];

const typeOptions: Array<{ value: DeviceType | 'all'; label: string }> = [
  { value: 'all', label: 'Todos tipos' },
  { value: 'server', label: 'Servidores' },
  { value: 'camera', label: 'Cameras' },
  { value: 'recorder', label: 'NVR / DVR' },
  { value: 'storage', label: 'Armazenamento' },
  { value: 'router', label: 'Roteadores' },
  { value: 'switch', label: 'Switches' },
  { value: 'firewall', label: 'Firewalls' },
];

export function DeviceFilterBar({ filters, onFiltersChange, totalVisible, totalDevices, showTypeFilter = true }: DeviceFilterBarProps) {
  const updateFilter = <TKey extends keyof DeviceFilters>(key: TKey, value: DeviceFilters[TKey]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className="rounded-lg border border-border bg-card/80 p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={filters.search}
            onChange={event => updateFilter('search', event.target.value)}
            placeholder="Buscar dispositivo, IP ou tipo"
            className="h-10 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 lg:flex lg:shrink-0">
          <select
            value={filters.status}
            onChange={event => updateFilter('status', event.target.value as DeviceFilters['status'])}
            className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
          >
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>

          {showTypeFilter && (
            <select
              value={filters.type}
              onChange={event => updateFilter('type', event.target.value as DeviceFilters['type'])}
              className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
            >
              {typeOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        {totalVisible} de {totalDevices} dispositivos
      </p>
    </div>
  );
}
