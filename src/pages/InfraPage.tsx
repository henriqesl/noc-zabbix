import { useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Activity, EyeOff, Network, Server, ServerCrash } from 'lucide-react';
import { DeviceCard } from '@/components/noc/DeviceCard';
import { StatusBadge } from '@/components/noc/StatusBadge';
import { StatusCard } from '@/components/noc/StatusCard';
import { useNocData } from '@/hooks/use-noc-data';
import { cleanGroupName, getNetworkDevicesByClient, isProxyDevice } from '@/domain/noc-selectors';

export default function InfraPage() {
  const data = useOutletContext<ReturnType<typeof useNocData>>();

  const proxies = data.proxies;
  const coreServers = data.allDevices.filter(device =>
    !isProxyDevice(device) && (
      device.group.toLowerCase().includes('zabbix') ||
      device.name.toLowerCase().includes('zabbix') ||
      device.name.toLowerCase().includes('aws')
    )
  );
  const networkByClient = useMemo(() => getNetworkDevicesByClient(data.allDevices), [data.allDevices]);
  const clientsWithLinkProblems = networkByClient.filter(group => group.offline > 0 || group.warning > 0);

  return (
    <div className="space-y-7 2xl:space-y-9">
      <div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Infraestrutura</p>
          <h1 className="mt-1 flex items-center gap-2 text-3xl font-bold tracking-tight lg:text-4xl">
            <Activity className="h-6 w-6 text-primary" />
            Saúde dos serviços centrais
          </h1>
          <p className="mt-2 text-sm text-muted-foreground lg:text-base">Servidores, proxies e equipamentos de rede observados diretamente no Zabbix.</p>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatusCard title="Servidores centrais" value={coreServers.length} subtitle="identificados no Zabbix" icon={<Server className="h-5 w-5" />} />
        <StatusCard title="Proxies funcionando" value={proxies.length - data.offlineProxies.length} subtitle={`de ${proxies.length} cadastrados`} icon={<Activity className="h-5 w-5" />} variant="success" />
        <StatusCard title="Proxies sem contato" value={data.offlineProxies.length} icon={<ServerCrash className="h-5 w-5" />} variant={data.offlineProxies.length ? 'critical' : 'default'} />
        <StatusCard title="Rede requer atenção" value={clientsWithLinkProblems.length} subtitle={`${data.visibilityAffectedDevices.length} equipamentos sem confirmação`} icon={<EyeOff className="h-5 w-5" />} variant={clientsWithLinkProblems.length ? 'warning' : 'default'} />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[0.8fr_1.6fr]">
        <div className="space-y-3">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground">
            <Server className="h-5 w-5 text-primary" />
            Servidores centrais ({coreServers.length})
          </h2>
          {coreServers.length > 0 ? (
            <div className="grid grid-cols-1 gap-3">
              {coreServers.map((device, i) => <DeviceCard key={device.id} device={device} index={i} />)}
            </div>
          ) : (
            <EmptyPanel>Nenhum servidor core identificado pelos nomes/grupos atuais.</EmptyPanel>
          )}
        </div>

        <div className="space-y-3">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground">
            <Server className="h-5 w-5 text-primary" />
            Proxies ({proxies.length})
          </h2>
          {proxies.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3 min-[2800px]:grid-cols-4">
              {proxies.map((device, i) => <DeviceCard key={device.id} device={device} index={i} />)}
            </div>
          ) : (
            <EmptyPanel>Nenhum proxy nativo retornado pela API do Zabbix.</EmptyPanel>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground">
            <Network className="h-5 w-5 text-primary" />
            Links e switches por cliente
          </h2>
          <span className="font-mono text-xs text-muted-foreground">
            {clientsWithLinkProblems.length} clientes com atenção
          </span>
        </div>

        {networkByClient.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2 2xl:grid-cols-3 min-[2800px]:grid-cols-4">
            {networkByClient.map(group => (
              <details key={group.groupName} className="group rounded-lg border border-border bg-card/80 p-4">
                <summary className="flex cursor-pointer list-none items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{cleanGroupName(group.groupName)}</p>
                    <p className="text-xs text-muted-foreground">{group.devices.length} links/switches monitorados</p>
                  </div>
                  <StatusBadge status={group.offline > 0 ? 'critical' : group.warning > 0 ? 'warning' : 'healthy'} />
                </summary>
                <div className="mt-3 grid grid-cols-1 gap-2 border-t border-border pt-3">
                  {group.devices.map((device, i) => (
                    <DeviceCard key={device.id} device={device} index={i} />
                  ))}
                </div>
              </details>
            ))}
          </div>
        ) : (
          <EmptyPanel>Nenhum link ou switch identificado nos grupos atuais.</EmptyPanel>
        )}
      </section>
    </div>
  );
}

function EmptyPanel({ children }: { children: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}
