import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Camera, MonitorCheck, WifiOff } from 'lucide-react';
import { DeviceCard } from '@/components/noc/DeviceCard';
import { DeviceFilterBar, type DeviceFilters } from '@/components/noc/DeviceFilterBar';
import { OfflineByClientPanel } from '@/components/noc/OfflineByClientPanel';
import { StatusCard } from '@/components/noc/StatusCard';
import { useNocData } from '@/hooks/use-noc-data';
import { cleanGroupName, filterDevices, getCameraSummary, isActiveNocGroup } from '@/domain/noc-selectors';

const initialFilters: DeviceFilters = {
  search: '',
  status: 'all',
  type: 'camera',
};

export default function CamerasPage() {
  const data = useOutletContext<ReturnType<typeof useNocData>>();
  const [filters, setFilters] = useState<DeviceFilters>(initialFilters);
  const [clientFilter, setClientFilter] = useState('all');
  const activeDevices = useMemo(
    () => data.groups.filter(isActiveNocGroup).flatMap(group => group.devices),
    [data.groups]
  );
  const summary = useMemo(() => getCameraSummary(activeDevices), [activeDevices]);
  const cameraClients = useMemo(
    () => Array.from(new Set(summary.cameras.map(camera => camera.group))).sort(),
    [summary.cameras]
  );
  const filteredCameras = useMemo(() => {
    const byClient = clientFilter === 'all'
      ? summary.cameras
      : summary.cameras.filter(camera => camera.group === clientFilter);

    return filterDevices(byClient, filters);
  }, [clientFilter, filters, summary.cameras]);

  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="mb-1 flex items-center gap-2 text-2xl font-bold">
            <Camera className="h-6 w-6 text-primary" />
            Cameras
          </h1>
          <p className="text-sm text-muted-foreground">
            Inventario operacional para localizar cameras offline e diferenciar queda real de impacto por proxy.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5 lg:gap-4">
        <StatusCard title="Total" value={summary.cameras.length} icon={<Camera className="h-5 w-5" />} />
        <StatusCard title="Online" value={summary.onlineCount} icon={<MonitorCheck className="h-5 w-5" />} variant="success" />
        <StatusCard title="Alerta" value={summary.warningCount} icon={<Camera className="h-5 w-5" />} variant={summary.warningCount > 0 ? 'warning' : 'default'} />
        <StatusCard
          title="Offline Real"
          value={summary.realOffline.length}
          icon={<WifiOff className="h-5 w-5" />}
          variant={summary.realOffline.length > 0 ? 'critical' : 'default'}
        />
        <StatusCard
          title="Via Proxy"
          value={summary.offlineByProxy.length}
          icon={<WifiOff className="h-5 w-5" />}
          variant={summary.offlineByProxy.length > 0 ? 'warning' : 'default'}
        />
      </div>

      <OfflineByClientPanel
        title="Cameras realmente offline"
        description="Agrupadas por cliente para acionamento operacional."
        devices={summary.realOffline}
      />

      <OfflineByClientPanel
        title="Cameras impactadas por proxy"
        description="Nao conte como falha individual da camera antes de recuperar o proxy."
        devices={summary.offlineByProxy}
        variant="muted"
      />

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Inventario de Cameras</h2>
          <p className="text-sm text-muted-foreground">Use busca e filtros para localizar rapidamente uma camera ou cliente.</p>
        </div>

        <DeviceFilterBar
          filters={filters}
          onFiltersChange={setFilters}
          totalVisible={filteredCameras.length}
          totalDevices={summary.cameras.length}
          showTypeFilter={false}
        />

        <div className="flex flex-col gap-2 sm:max-w-xs">
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground" htmlFor="camera-client-filter">
            Cliente
          </label>
          <select
            id="camera-client-filter"
            value={clientFilter}
            onChange={event => setClientFilter(event.target.value)}
            className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
          >
            <option value="all">Todos os clientes</option>
            {cameraClients.map(client => (
              <option key={client} value={client}>{cleanGroupName(client)}</option>
            ))}
          </select>
        </div>

        {filteredCameras.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 min-[1800px]:grid-cols-5">
            {filteredCameras.map((camera, i) => (
              <DeviceCard key={camera.id} device={camera} index={i} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
            Nenhuma camera encontrada com os filtros atuais.
          </div>
        )}
      </section>
    </div>
  );
}
