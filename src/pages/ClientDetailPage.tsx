import { useMemo, useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { ArrowLeft, AlertTriangle, Camera, Monitor, MonitorOff, Server, Wifi } from 'lucide-react';
import { AlertRow } from '@/components/noc/AlertRow';
import { CriticalBanner } from '@/components/noc/CriticalBanner';
import { DeviceCard } from '@/components/noc/DeviceCard';
import { DeviceFilterBar, type DeviceFilters } from '@/components/noc/DeviceFilterBar';
import { StatusCard } from '@/components/noc/StatusCard';
import { useNocData } from '@/hooks/use-noc-data';
import { cn } from '@/lib/utils';
import { cleanGroupName, filterDevices, getAlertSummary, isOfflineByProxy } from '@/domain/noc-selectors';
import type { Device, DeviceType } from '@/domain/noc';

const typeIcon: Record<DeviceType, typeof Server> = {
  server: Server,
  camera: Camera,
  switch: Wifi,
  router: Wifi,
  firewall: Server,
};

const initialDeviceFilters: DeviceFilters = {
  search: '',
  status: 'all',
  type: 'all',
};

const emptyDevices: Device[] = [];

export default function ClientDetailPage() {
  const data = useOutletContext<ReturnType<typeof useNocData>>();
  const { clientId } = useParams();
  const [deviceFilters, setDeviceFilters] = useState<DeviceFilters>(initialDeviceFilters);

  const group = data.groups.find(item => item.id === clientId);
  const devices = group?.devices ?? emptyDevices;
  const filteredDevices = useMemo(
    () => filterDevices(devices, deviceFilters),
    [devices, deviceFilters]
  );

  if (!group) {
    return (
      <div className="py-20 text-center">
        <p className="text-xl text-muted-foreground">Cliente nao encontrado</p>
        <Link to="/" className="mt-4 inline-block text-primary underline">Voltar</Link>
      </div>
    );
  }

  const online = devices.filter(device => device.status === 'online').length;
  const offline = devices.filter(device => device.status === 'offline' && !isOfflineByProxy(device));
  const offlineByProxy = devices.filter(isOfflineByProxy);
  const clientAlerts = getAlertSummary(data.alerts, data.devicesOfflineByProxy).visibleAlerts.filter(alert => alert.group === group.name);
  const criticalAlerts = clientAlerts.filter(alert => alert.severity === 'critical');
  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="flex items-center gap-4">
        <Link to="/" className="rounded-lg border border-border p-2 transition-colors hover:bg-accent">
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold text-foreground lg:text-3xl">{cleanGroupName(group.name)}</h1>
          <p className="text-sm text-muted-foreground">{devices.length} dispositivos monitorados</p>
        </div>
      </div>

      <CriticalBanner criticalCount={criticalAlerts.length} offlineCount={offline.length} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatusCard
          title="Online"
          value={online}
          subtitle={`de ${devices.length}`}
          icon={<Monitor className="h-5 w-5" />}
          variant="success"
        />
        <StatusCard
          title="Offline Real"
          value={offline.length}
          icon={<MonitorOff className="h-5 w-5" />}
          variant={offline.length > 0 ? 'critical' : 'default'}
        />
        <StatusCard
          title="Via Proxy"
          value={offlineByProxy.length}
          icon={<MonitorOff className="h-5 w-5" />}
          variant={offlineByProxy.length > 0 ? 'warning' : 'default'}
        />
        <StatusCard
          title="Alertas"
          value={clientAlerts.length}
          subtitle={`${criticalAlerts.length} criticos`}
          icon={<AlertTriangle className="h-5 w-5" />}
          variant={criticalAlerts.length > 0 ? 'critical' : clientAlerts.length > 0 ? 'warning' : 'default'}
        />
      </div>

      {offline.length > 0 && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-noc-critical">
            <span className="h-3 w-3 rounded-full bg-noc-critical animate-pulse-dot" />
            Dispositivos Offline ({offline.length})
          </h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3 min-[1800px]:grid-cols-4">
            {offline.map((device: Device, i) => {
              const Icon = typeIcon[device.type] || Server;
              return (
                <motion.div
                  key={device.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="rounded-lg border border-noc-critical/40 bg-noc-critical/5 p-4 lg:p-5"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-noc-critical" />
                    <span className="min-w-0 flex-1 truncate font-semibold text-foreground">{device.name}</span>
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-noc-critical animate-pulse-dot" />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{device.ip}</p>
                  {device.offlineSince && (
                    <p className="mt-1 font-mono text-xs text-noc-critical">
                      Offline ha {formatDistanceToNow(new Date(device.offlineSince), { locale: ptBR })}
                    </p>
                  )}
                </motion.div>
              );
            })}
          </div>
        </section>
      )}

      {clientAlerts.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-semibold text-foreground">Alertas do Cliente</h2>
          <div className="space-y-2">
            {clientAlerts.map((alert, i) => (
              <AlertRow key={alert.id} alert={alert} index={i} />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-xl font-semibold text-foreground">Todos os Dispositivos</h2>
          <span className={cn('font-mono text-xs', filteredDevices.length === 0 ? 'text-noc-critical' : 'text-muted-foreground')}>
            {filteredDevices.length} visiveis
          </span>
        </div>

        <DeviceFilterBar
          filters={deviceFilters}
          onFiltersChange={setDeviceFilters}
          totalVisible={filteredDevices.length}
          totalDevices={devices.length}
        />

        {filteredDevices.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 min-[1800px]:grid-cols-5">
            {filteredDevices.map((device, i) => (
              <DeviceCard key={device.id} device={device} index={i} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
            Nenhum dispositivo encontrado com os filtros atuais.
          </div>
        )}
      </section>
    </div>
  );
}
