import { useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Activity, Beaker, Network, Server } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DeviceCard } from '@/components/noc/DeviceCard';
import { StatusBadge } from '@/components/noc/StatusBadge';
import { useNocData } from '@/hooks/use-noc-data';
import { cleanGroupName, getNetworkDevicesByClient, isProxyDevice } from '@/domain/noc-selectors';

function generateMockCoreSeries(points = 20) {
  return Array.from({ length: points }, (_, i) => ({
    time: `${String(i).padStart(2, '0')}:00`,
    cpu: Math.floor(Math.random() * 40 + 20),
    memory: Math.floor(Math.random() * 30 + 40),
    network: Math.floor(Math.random() * 60 + 10),
  }));
}

const metricCards = [
  { key: 'cpu' as const, label: 'CPU (%)', color: '#14b8a6' },
  { key: 'memory' as const, label: 'Memoria RAM (%)', color: '#f59e0b' },
  { key: 'network' as const, label: 'Trapper / Rede (Mbps)', color: '#3b82f6' },
];

export default function InfraPage() {
  const data = useOutletContext<ReturnType<typeof useNocData>>();
  const chartData = useMemo(() => generateMockCoreSeries(), []);

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
    <div className="space-y-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="mb-1 flex items-center gap-2 text-2xl font-bold">
            <Activity className="h-6 w-6 text-primary" />
            Saude do Core
          </h1>
          <p className="text-sm text-muted-foreground">Core Zabbix, proxies e links por cliente.</p>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
          <Beaker className="h-4 w-4" />
          Graficos ainda usam mock local em generateMockCoreSeries()
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {metricCards.map(({ key, label, color }) => (
          <div key={key} className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <p className="mb-4 text-sm font-semibold text-foreground">{label}</p>
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 14% 18%)" vertical={false} />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'hsl(215 15% 50%)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(215 15% 50%)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(220 18% 10%)', border: '1px solid hsl(220 14% 18%)', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: 'hsl(210 20% 90%)' }}
                />
                <Area type="monotone" dataKey={key} stroke={color} fill={`url(#grad-${key})`} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[0.8fr_1.6fr]">
        <div className="space-y-3">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground">
            <Server className="h-5 w-5 text-primary" />
            Servidores Zabbix ({coreServers.length})
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
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
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
            Links e Switches por cliente
          </h2>
          <span className="font-mono text-xs text-muted-foreground">
            {clientsWithLinkProblems.length} clientes com atencao
          </span>
        </div>

        {networkByClient.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2 2xl:grid-cols-3">
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
