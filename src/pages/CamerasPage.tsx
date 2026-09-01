import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Camera, EyeOff, MonitorCheck, WifiOff } from 'lucide-react';
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
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Monitoramento visual</p>
          <h1 className="mt-1 flex items-center gap-2 text-3xl font-bold tracking-tight lg:text-4xl">
            <Camera className="h-6 w-6 text-primary" />
            Câmeras
          </h1>
          <p className="mt-2 text-sm text-muted-foreground lg:text-base">Visão consolidada das câmeras por cliente e situação.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5 lg:gap-4">
        <StatusCard title="Total" value={summary.cameras.length} icon={<Camera className="h-5 w-5" />} />
        <StatusCard title="Funcionando" value={summary.onlineCount} icon={<MonitorCheck className="h-5 w-5" />} variant="success" />
        <StatusCard title="Em alerta" value={summary.warningCount} icon={<Camera className="h-5 w-5" />} variant={summary.warningCount > 0 ? 'warning' : 'default'} />
        <StatusCard
          title="Falha confirmada"
          value={summary.realOffline.length}
          icon={<WifiOff className="h-5 w-5" />}
          variant={summary.realOffline.length > 0 ? 'critical' : 'default'}
        />
        <StatusCard title="Sem confirmação" value={summary.unconfirmed.length} subtitle="não significa câmera offline" icon={<EyeOff className="h-5 w-5" />} variant={summary.unconfirmed.length ? 'info' : 'default'} />
      </div>

      {summary.unconfirmed.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-info/30 bg-info/5 px-4 py-3 text-sm text-muted-foreground">
          <EyeOff className="h-4 w-4 text-info" />
          {summary.unconfirmed.length} câmeras não puderam ter o estado confirmado. Isso pode ocorrer por restrição de acesso ou proxy sem contato.
        </div>
      )}

      <OfflineByClientPanel
        title="Falhas confirmadas de câmera"
        description="Equipamentos com evidência de indisponibilidade."
        devices={summary.realOffline}
      />

      <OfflineByClientPanel
        title="Câmeras sem confirmação"
        description="Verifique primeiro o acesso ou o proxy antes de acionar a câmera individualmente."
        devices={summary.unconfirmed}
        variant="muted"
      />

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Inventário de câmeras</h2>
          <p className="text-sm text-muted-foreground">Detalhes técnicos, busca e filtros por cliente.</p>
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 min-[1800px]:grid-cols-5 min-[2800px]:grid-cols-6">
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
