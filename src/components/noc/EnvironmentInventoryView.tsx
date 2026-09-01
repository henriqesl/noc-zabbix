import { ChevronRight, Search } from 'lucide-react';
import type { Device, DeviceType, OperationalState } from '@/domain/noc';
import { groupEnvironmentDevices } from '@/domain/noc-environments';
import { INVENTORY_TYPE_LABELS } from '@/domain/noc-inventory';
import { getOperationalState } from '@/domain/noc-selectors';
import { OperationalStateBadge } from './OperationalStateBadge';

export interface EnvironmentInventoryFilters {
  search: string;
  state: OperationalState | 'all';
  type: DeviceType | 'all';
}

export function EnvironmentInventoryView({
  devices,
  filters,
  onFiltersChange,
}: {
  devices: Device[];
  filters: EnvironmentInventoryFilters;
  onFiltersChange: (filters: EnvironmentInventoryFilters) => void;
}) {
  const normalizedSearch = normalize(filters.search);
  const filtered = devices.filter(device => {
    const matchesState = filters.state === 'all' || getOperationalState(device) === filters.state;
    const matchesType = filters.type === 'all' || device.type === filters.type;
    const searchable = normalize(`${device.name} ${device.ip} ${device.proxyName ?? ''}`);
    return matchesState && matchesType && (!normalizedSearch || searchable.includes(normalizedSearch));
  });
  const groups = groupEnvironmentDevices(filtered);

  return (
    <section className="space-y-4">
      <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Equipamentos</p><h2 className="mt-1 text-xl font-semibold text-foreground">Inventário deste ambiente</h2><p className="mt-1 text-sm text-muted-foreground">Agrupado por tipo para consulta, sem repetir indicadores operacionais.</p></div>
      <div className="grid gap-2 rounded-xl border border-border bg-card/50 p-3 sm:grid-cols-3">
        <label className="relative sm:col-span-1"><span className="sr-only">Buscar no inventário</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={filters.search} onChange={event => onFiltersChange({ ...filters, search: event.target.value })} placeholder="Equipamento, IP ou proxy" className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm text-foreground outline-none focus:border-primary" /></label>
        <select aria-label="Estado do equipamento" value={filters.state} onChange={event => onFiltersChange({ ...filters, state: event.target.value as EnvironmentInventoryFilters['state'] })} className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"><option value="all">Todos os estados</option><option value="confirmed-failure">Falha confirmada</option><option value="warning">Alerta</option><option value="unconfirmed">Estado não confirmado</option><option value="functioning">Funcionando</option></select>
        <select aria-label="Tipo de equipamento" value={filters.type} onChange={event => onFiltersChange({ ...filters, type: event.target.value as EnvironmentInventoryFilters['type'] })} className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"><option value="all">Todos os tipos</option>{Object.entries(INVENTORY_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      </div>
      <p className="text-xs text-muted-foreground">{filtered.length} de {devices.length} equipamentos</p>

      {groups.length > 0 ? <div className="space-y-2">{groups.map((group, index) => (
        <details key={group.type} open={index === 0} className="group overflow-hidden rounded-xl border border-border bg-card/40">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3"><span className="font-semibold text-foreground">{INVENTORY_TYPE_LABELS[group.type]} <span className="ml-1 font-mono text-xs text-muted-foreground">{group.devices.length}</span></span><ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" /></summary>
          <div className="border-t border-border">
            {group.devices.map(device => <DeviceInventoryRow key={device.id} device={device} />)}
          </div>
        </details>
      ))}</div> : <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Nenhum equipamento encontrado com esses filtros.</div>}
    </section>
  );
}

function DeviceInventoryRow({ device }: { device: Device }) {
  return <div className="grid gap-2 border-b border-border px-4 py-3 last:border-b-0 sm:grid-cols-[minmax(12rem,1fr)_11rem_14rem] sm:items-center"><div className="min-w-0"><p className="truncate text-sm font-medium text-foreground">{device.name}</p><p className="font-mono text-xs text-muted-foreground">{device.ip}</p></div><OperationalStateBadge state={getOperationalState(device)} /><p className="truncate text-xs text-muted-foreground">{device.proxyName ? `Proxy: ${device.proxyName}` : 'Proxy não associado'}</p></div>;
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}
