import type { Alert, ClientGroup, Device, DeviceStatus, DeviceType, GroupHealth } from './noc';
import { ACTIVE_GROUP_MARKERS } from './noc';

export type ClientSortKey = 'criticality' | 'name' | 'health' | 'offline' | 'devices';
export type ClientGroupBucket = 'base' | 'cliente' | 'outros';

export interface ClientGroupFilters {
  search: string;
  status: DeviceStatus | 'all';
  type: DeviceType | 'all';
  bucket: ClientGroupBucket | 'all';
  sortBy: ClientSortKey;
}

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

export function isActiveNocGroup(group: ClientGroup) {
  const upperName = group.name.toUpperCase();
  return ACTIVE_GROUP_MARKERS.some(marker => upperName.includes(marker));
}

export function getGroupBucket(group: ClientGroup): ClientGroupBucket {
  const upperName = group.name.toUpperCase();

  if (upperName.includes('[BASE]')) return 'base';
  if (upperName.includes('[CLIENTE]')) return 'cliente';

  return 'outros';
}

export function cleanGroupName(name: string) {
  return name.replace(/\[(BASE|CLIENTE)\]/gi, '').trim();
}

export function getGroupHealth(group: ClientGroup): GroupHealth {
  const online = group.devices.filter(device => getOperationalState(device) === 'functioning').length;
  const offline = group.devices.filter(device => isRealOfflineDevice(device) || (isProxyDevice(device) && device.status === 'offline')).length;
  const warning = group.devices.filter(device => getOperationalState(device) === 'warning').length;
  const unknown = group.devices.filter(device => getOperationalState(device) === 'unconfirmed').length;
  const total = group.devices.length;
  const observable = total - unknown;
  const healthPct = observable > 0 ? Math.round((online / observable) * 100) : 0;

  return {
    online,
    offline,
    warning,
    unknown,
    total,
    healthPct,
    status: total === 0 ? 'empty' : offline > 0 ? 'critical' : unknown > 0 ? 'degraded' : warning > 0 ? 'warning' : 'healthy',
  };
}

export function getNocSummary(groups: ClientGroup[]) {
  const allDevices = groups.flatMap(group => group.devices);
  const proxies = allDevices.filter(isProxyDevice);
  const offlineProxies = proxies.filter(device => device.status === 'offline');
  const devicesOfflineByProxy = allDevices.filter(isOfflineByProxy);
  const realOfflineDevices = allDevices.filter(isRealOfflineDevice);
  const unknownDevices = allDevices.filter(device => getOperationalState(device) === 'unconfirmed');
  const visibilityAffectedDevices = uniqueDevices([...devicesOfflineByProxy, ...unknownDevices]);

  return {
    allDevices,
    onlineCount: allDevices.filter(device => getOperationalState(device) === 'functioning').length,
    offlineCount: realOfflineDevices.length + offlineProxies.length,
    rawOfflineCount: allDevices.filter(device => device.status === 'offline').length,
    realOfflineDevices,
    devicesOfflineByProxy,
    unknownDevices,
    visibilityAffectedDevices,
    proxies,
    offlineProxies,
    warningCount: allDevices.filter(device => getOperationalState(device) === 'warning').length,
    totalCount: allDevices.length,
  };
}

export function getAlertSummary(alerts: Alert[], devicesOfflineByProxy: Device[] = []) {
  const suppressedHostIds = new Set(devicesOfflineByProxy.map(device => device.id));
  const visibleAlerts = alerts.filter(alert => !alert.hostId || !suppressedHostIds.has(alert.hostId));
  const suppressedAlerts = alerts.filter(alert => alert.hostId && suppressedHostIds.has(alert.hostId));
  const criticalAlerts = visibleAlerts.filter(alert => alert.severity === 'critical');
  const warningAlerts = visibleAlerts.filter(alert => alert.severity === 'warning');

  return {
    visibleAlerts,
    suppressedAlerts,
    criticalAlerts,
    warningAlerts,
    totalActiveAlerts: criticalAlerts.length + warningAlerts.length,
  };
}

export function isProxyDevice(device: Device) {
  return Boolean(device.isProxy || device.id.startsWith('proxy-') || device.name.toLowerCase().includes('proxy'));
}

export function isOfflineByProxy(device: Device) {
  if (isProxyDevice(device)) return false;
  if (device.classification) {
    return device.classification.operationalState === 'unconfirmed' && (
      device.classification.evidence.source === 'proxy' ||
      device.classification.evidence.source === 'restriction'
    );
  }
  return device.status === 'offline' && device.offlineReason === 'proxy';
}

export function isRealOfflineDevice(device: Device) {
  if (isProxyDevice(device)) return false;
  return device.classification
    ? device.classification.operationalState === 'confirmed-failure'
    : device.status === 'offline' && device.offlineReason === 'host';
}

export function getOperationalState(device: Device) {
  if (device.classification) return device.classification.operationalState;
  if (device.status === 'online') return 'functioning' as const;
  if (device.status === 'warning') return 'warning' as const;
  if (device.status === 'offline' && device.offlineReason === 'host') return 'confirmed-failure' as const;
  return 'unconfirmed' as const;
}

export function groupOfflineDevicesByClient(devices: Device[]) {
  return devices.reduce<Array<{ groupName: string; devices: Device[] }>>((acc, device) => {
    const existing = acc.find(item => item.groupName === device.group);
    if (existing) {
      existing.devices.push(device);
    } else {
      acc.push({ groupName: device.group, devices: [device] });
    }

    return acc;
  }, []).sort((a, b) => b.devices.length - a.devices.length || a.groupName.localeCompare(b.groupName));
}

export function getNetworkDevicesByClient(devices: Device[]) {
  const networkDevices = devices.filter(device => {
    const group = device.group.toLowerCase();
    const name = device.name.toLowerCase();

    return (
      device.type === 'switch' ||
      group.includes('link') ||
      name.includes('link') ||
      name.includes('switch') ||
      name.includes('sw-') ||
      name.startsWith('sw')
    );
  });

  return networkDevices.reduce<Array<{ groupName: string; devices: Device[]; offline: number; warning: number }>>((acc, device) => {
    const existing = acc.find(item => item.groupName === device.group);
    if (existing) {
      existing.devices.push(device);
      existing.offline += isRealOfflineDevice(device) ? 1 : 0;
      existing.warning += getOperationalState(device) === 'warning' ? 1 : 0;
    } else {
      acc.push({
        groupName: device.group,
        devices: [device],
        offline: isRealOfflineDevice(device) ? 1 : 0,
        warning: getOperationalState(device) === 'warning' ? 1 : 0,
      });
    }

    return acc;
  }, []).sort((a, b) => b.offline - a.offline || b.warning - a.warning || a.groupName.localeCompare(b.groupName));
}

export function sortAlertsByDateDesc(alerts: Alert[]) {
  return [...alerts].sort((a, b) => parseAlertTime(b.timestamp) - parseAlertTime(a.timestamp));
}

export function parseAlertTime(value: string) {
  if (!value) return 0;

  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    return numeric > 1_000_000_000_000 ? numeric : numeric * 1000;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function isWithinPeriod(timestamp: string, period: 'all' | '1h' | '6h' | '24h' | '7d') {
  if (period === 'all') return true;

  const now = Date.now();
  const alertTime = parseAlertTime(timestamp);
  const periodMs = {
    '1h': 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
  }[period];

  return alertTime > 0 && now - alertTime <= periodMs;
}

export function getCameraSummary(devices: Device[]) {
  const cameras = devices.filter(device => device.type === 'camera');
  const offline = cameras.filter(isRealOfflineDevice);
  const offlineByProxy = cameras.filter(isOfflineByProxy);
  const realOffline = offline;
  const unknown = cameras.filter(device => getOperationalState(device) === 'unconfirmed');
  const unconfirmed = uniqueDevices([...offlineByProxy, ...unknown]);

  return {
    cameras,
    offline,
    offlineByProxy,
    realOffline,
    unknown,
    unconfirmed,
    onlineCount: cameras.filter(device => getOperationalState(device) === 'functioning').length,
    warningCount: cameras.filter(device => getOperationalState(device) === 'warning').length,
  };
}

export function filterClientGroups(groups: ClientGroup[], filters: ClientGroupFilters) {
  const search = normalize(filters.search.trim());

  return groups
    .filter(isActiveNocGroup)
    .filter(group => filters.bucket === 'all' || getGroupBucket(group) === filters.bucket)
    .filter(group => {
      if (filters.status === 'all' && filters.type === 'all') return true;

      return group.devices.some(device => {
        const matchesStatus = filters.status === 'all' || device.status === filters.status;
        const matchesType = filters.type === 'all' || device.type === filters.type;
        return matchesStatus && matchesType;
      });
    })
    .filter(group => {
      if (!search) return true;

      const groupMatch = normalize(group.name).includes(search);
      const deviceMatch = group.devices.some(device =>
        normalize(`${device.name} ${device.ip} ${device.type} ${device.proxyName ?? ''}`).includes(search)
      );

      return groupMatch || deviceMatch;
    })
    .sort((a, b) => compareGroups(a, b, filters.sortBy));
}

export function filterDevices(devices: Device[], filters: Pick<ClientGroupFilters, 'search' | 'status' | 'type'>) {
  const search = normalize(filters.search.trim());

  return devices.filter(device => {
    const matchesStatus = filters.status === 'all' || device.status === filters.status;
    const matchesType = filters.type === 'all' || device.type === filters.type;
    const matchesSearch = !search || normalize(`${device.name} ${device.ip} ${device.group} ${device.type} ${device.proxyName ?? ''}`).includes(search);

    return matchesStatus && matchesType && matchesSearch;
  });
}

export function groupByBucket(groups: ClientGroup[]) {
  return groups.reduce<Record<ClientGroupBucket, ClientGroup[]>>(
    (acc, group) => {
      acc[getGroupBucket(group)].push(group);
      return acc;
    },
    { base: [], cliente: [], outros: [] }
  );
}

function compareGroups(a: ClientGroup, b: ClientGroup, sortBy: ClientSortKey) {
  const healthA = getGroupHealth(a);
  const healthB = getGroupHealth(b);

  if (sortBy === 'criticality') {
    return (
      healthB.offline - healthA.offline ||
      healthB.warning - healthA.warning ||
      healthA.healthPct - healthB.healthPct ||
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    );
  }

  if (sortBy === 'health') return healthA.healthPct - healthB.healthPct;
  if (sortBy === 'offline') return healthB.offline - healthA.offline;
  if (sortBy === 'devices') return healthB.total - healthA.total;

  return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
}

function uniqueDevices(devices: Device[]) {
  return Array.from(new Map(devices.map(device => [device.id, device])).values());
}
