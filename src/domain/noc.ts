export type DeviceStatus = 'online' | 'offline' | 'warning';
export type AlertSeverity = 'critical' | 'warning' | 'info';
export type DeviceType = 'server' | 'camera' | 'switch' | 'router' | 'firewall';

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  group: string;
  status: DeviceStatus;
  ip: string;
  isProxy?: boolean;
  proxyId?: string;
  proxyName?: string;
  offlineReason?: 'host' | 'proxy' | 'unknown';
  latency?: string;
  uptime?: string;
  cpu?: number;
  memory?: number;
  disk?: number;
  lastSeen?: string;
  offlineSince?: string | number;
}

export interface Alert {
  id: string;
  hostId?: string;
  device: string;
  group: string;
  message: string;
  severity: AlertSeverity;
  timestamp: string;
  acknowledged?: boolean;
}

export interface ClientGroup {
  id: string;
  name: string;
  devices: Device[];
}

export interface NocData {
  groups: ClientGroup[];
  alerts: Alert[];
}

export type GroupHealthStatus = 'healthy' | 'warning' | 'critical' | 'empty';

export interface GroupHealth {
  online: number;
  offline: number;
  warning: number;
  total: number;
  healthPct: number;
  status: GroupHealthStatus;
}

export const ACTIVE_GROUP_MARKERS = ['[BASE]', '[CLIENTE]'] as const;
