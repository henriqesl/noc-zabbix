export type DeviceStatus = 'online' | 'offline' | 'warning';
export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface Device {
  id: string;
  name: string;
  type: 'server' | 'camera' | 'switch' | 'router' | 'firewall';
  group: string;
  status: DeviceStatus;
  ip: string;
  latency: number;
  uptime: number; // percentage
  cpu?: number;
  memory?: number;
  disk?: number;
  lastSeen: string;
  offlineSince?: string;
}

export interface Alert {
  id: string;
  device: string;
  group: string;
  message: string;
  severity: AlertSeverity;
  timestamp: string;
  acknowledged: boolean;
}

export interface ClientGroup {
  id: string;
  name: string;
  devices: Device[];
}

const randomBetween = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min: number, max: number) => +(Math.random() * (max - min) + min).toFixed(1);

function generateDevices(group: string, prefix: string, count: number, type: Device['type']): Device[] {
  return Array.from({ length: count }, (_, i) => {
    const isOffline = Math.random() < 0.08;
    const isWarning = !isOffline && Math.random() < 0.12;
    const status: DeviceStatus = isOffline ? 'offline' : isWarning ? 'warning' : 'online';
    return {
      id: `${group}-${type}-${i}`,
      name: `${prefix}-${type.toUpperCase()}-${String(i + 1).padStart(2, '0')}`,
      type,
      group,
      status,
      ip: `10.${randomBetween(1, 254)}.${randomBetween(1, 254)}.${randomBetween(1, 254)}`,
      latency: status === 'offline' ? 0 : randomBetween(1, status === 'warning' ? 200 : 40),
      uptime: status === 'offline' ? 0 : randomFloat(95, 99.99),
      cpu: type === 'server' ? (status === 'warning' ? randomBetween(80, 98) : randomBetween(5, 65)) : undefined,
      memory: type === 'server' ? (status === 'warning' ? randomBetween(75, 95) : randomBetween(20, 70)) : undefined,
      disk: type === 'server' ? randomBetween(15, 85) : undefined,
      lastSeen: status === 'offline' ? new Date(Date.now() - randomBetween(300000, 7200000)).toISOString() : new Date().toISOString(),
      offlineSince: status === 'offline' ? new Date(Date.now() - randomBetween(300000, 7200000)).toISOString() : undefined,
    };
  });
}

export function generateMockData(): { groups: ClientGroup[]; alerts: Alert[] } {
  const groups: ClientGroup[] = [
    {
      id: 'cliente-a',
      name: 'Cliente Alpha',
      devices: [
        ...generateDevices('cliente-a', 'ALPHA', 4, 'server'),
        ...generateDevices('cliente-a', 'ALPHA', 3, 'switch'),
        ...generateDevices('cliente-a', 'ALPHA', 2, 'router'),
        ...generateDevices('cliente-a', 'ALPHA', 8, 'camera'),
      ],
    },
    {
      id: 'cliente-b',
      name: 'Cliente Beta',
      devices: [
        ...generateDevices('cliente-b', 'BETA', 6, 'server'),
        ...generateDevices('cliente-b', 'BETA', 4, 'switch'),
        ...generateDevices('cliente-b', 'BETA', 1, 'router'),
        ...generateDevices('cliente-b', 'BETA', 12, 'camera'),
      ],
    },
    {
      id: 'cliente-c',
      name: 'Cliente Gamma',
      devices: [
        ...generateDevices('cliente-c', 'GAMMA', 3, 'server'),
        ...generateDevices('cliente-c', 'GAMMA', 2, 'switch'),
        ...generateDevices('cliente-c', 'GAMMA', 1, 'firewall'),
        ...generateDevices('cliente-c', 'GAMMA', 6, 'camera'),
      ],
    },
    {
      id: 'datacenter',
      name: 'Datacenter Principal',
      devices: [
        ...generateDevices('datacenter', 'DC', 10, 'server'),
        ...generateDevices('datacenter', 'DC', 6, 'switch'),
        ...generateDevices('datacenter', 'DC', 2, 'router'),
        ...generateDevices('datacenter', 'DC', 2, 'firewall'),
      ],
    },
  ];

  const allDevices = groups.flatMap(g => g.devices);
  const problemDevices = allDevices.filter(d => d.status !== 'online');

  const severityMessages: Record<AlertSeverity, string[]> = {
    critical: ['Host indisponível', 'Serviço parou de responder', 'Disco cheio (>95%)', 'Link down'],
    warning: ['CPU alta (>80%)', 'Memória alta (>85%)', 'Latência elevada', 'Disco acima de 80%', 'Pacotes perdidos'],
    info: ['Backup concluído', 'Atualização disponível', 'Certificado expira em 30 dias'],
  };

  const alerts: Alert[] = problemDevices.map((d, i) => {
    const severity: AlertSeverity = d.status === 'offline' ? 'critical' : 'warning';
    const msgs = severityMessages[severity];
    return {
      id: `alert-${i}`,
      device: d.name,
      group: groups.find(g => g.id === d.group)?.name || d.group,
      message: msgs[randomBetween(0, msgs.length - 1)],
      severity,
      timestamp: new Date(Date.now() - randomBetween(60000, 3600000)).toISOString(),
      acknowledged: Math.random() < 0.2,
    };
  });

  // Add some info alerts
  for (let i = 0; i < 3; i++) {
    const randomDevice = allDevices[randomBetween(0, allDevices.length - 1)];
    const msgs = severityMessages.info;
    alerts.push({
      id: `alert-info-${i}`,
      device: randomDevice.name,
      group: groups.find(g => g.id === randomDevice.group)?.name || randomDevice.group,
      message: msgs[randomBetween(0, msgs.length - 1)],
      severity: 'info',
      timestamp: new Date(Date.now() - randomBetween(60000, 7200000)).toISOString(),
      acknowledged: false,
    });
  }

  alerts.sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 };
    return order[a.severity] - order[b.severity] || new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  return { groups, alerts };
}
