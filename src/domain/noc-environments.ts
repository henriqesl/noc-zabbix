import type { ClientGroup, Device, DeviceType, NocOccurrence } from './noc';
import { cleanGroupName, getGroupBucket, getOperationalState, isActiveNocGroup, isProxyDevice, parseAlertTime } from './noc-selectors';

export type EnvironmentPublicState = 'failure' | 'alert' | 'visibility' | 'healthy';
export type EnvironmentStatusFilter = 'all' | 'action' | EnvironmentPublicState;
export type EnvironmentSortKey = 'action' | 'name' | 'failures' | 'devices';

export interface EnvironmentFilters {
  search: string;
  status: EnvironmentStatusFilter;
  type: DeviceType | 'all';
  bucket: 'all' | 'base' | 'cliente';
  sortBy: EnvironmentSortKey;
}

export interface EnvironmentSummary {
  group: ClientGroup;
  name: string;
  state: EnvironmentPublicState;
  totalDevices: number;
  functioningDevices: number;
  confirmedFailures: number;
  warningDevices: number;
  unconfirmedDevices: number;
  alertOccurrences: number;
  criticalAlerts: number;
  visibilityOccurrences: number;
  occurrences: NocOccurrence[];
  startedAt?: number;
  durationMs: number;
}

export interface EnvironmentProxyAssociation {
  id: string;
  name: string;
  affectedDevices: number;
  proxy?: Device;
}

export interface EnvironmentInfrastructure {
  proxies: EnvironmentProxyAssociation[];
  servers: Device[];
  networkDevices: Device[];
}

export function buildEnvironmentSummaries(
  groups: ClientGroup[],
  occurrences: NocOccurrence[],
  now = Date.now()
): EnvironmentSummary[] {
  return groups
    .filter(isActiveNocGroup)
    .map(group => buildEnvironmentSummary(group, occurrences, now))
    .sort(compareEnvironmentAction);
}

export function buildEnvironmentSummary(
  group: ClientGroup,
  occurrences: NocOccurrence[],
  now = Date.now()
): EnvironmentSummary {
  const name = cleanGroupName(group.name);
  const environmentOccurrences = occurrences.filter(occurrence =>
    occurrence.environmentId === group.id ||
    (!occurrence.environmentId && normalize(occurrence.environmentName) === normalize(name))
  );
  const functioningDevices = group.devices.filter(device => getOperationalState(device) === 'functioning').length;
  const confirmedFailures = group.devices.filter(device => getOperationalState(device) === 'confirmed-failure').length;
  const warningDevices = group.devices.filter(device => getOperationalState(device) === 'warning').length;
  const unconfirmedDevices = group.devices.filter(device => getOperationalState(device) === 'unconfirmed').length;
  const alertOccurrences = environmentOccurrences.filter(occurrence => occurrence.kind === 'alert');
  const visibilityOccurrences = environmentOccurrences.filter(occurrence => occurrence.kind === 'visibility');
  const timestamps = environmentOccurrences
    .map(occurrence => parseAlertTime(occurrence.evidence.observedAt))
    .filter(timestamp => timestamp > 0 && timestamp <= now);
  const startedAt = timestamps.length ? Math.min(...timestamps) : undefined;
  const state: EnvironmentPublicState = confirmedFailures > 0
    ? 'failure'
    : alertOccurrences.length > 0 || warningDevices > 0
      ? 'alert'
      : visibilityOccurrences.length > 0 || unconfirmedDevices > 0
        ? 'visibility'
        : 'healthy';

  return {
    group,
    name,
    state,
    totalDevices: group.devices.length,
    functioningDevices,
    confirmedFailures,
    warningDevices,
    unconfirmedDevices,
    alertOccurrences: alertOccurrences.length,
    criticalAlerts: alertOccurrences.filter(occurrence => occurrence.severity === 'critical').length,
    visibilityOccurrences: visibilityOccurrences.length,
    occurrences: environmentOccurrences,
    startedAt,
    durationMs: startedAt ? Math.max(0, now - startedAt) : 0,
  };
}

export function filterEnvironmentSummaries(summaries: EnvironmentSummary[], filters: EnvironmentFilters) {
  const search = normalize(filters.search.trim());

  return summaries
    .filter(summary => filters.bucket === 'all' || getGroupBucket(summary.group) === filters.bucket)
    .filter(summary => {
      if (filters.status === 'all') return true;
      if (filters.status === 'action') return summary.state !== 'healthy';
      return summary.state === filters.status;
    })
    .filter(summary => filters.type === 'all' || summary.group.devices.some(device => device.type === filters.type))
    .filter(summary => {
      if (!search) return true;
      return normalize([
        summary.name,
        summary.group.restriction?.label ?? '',
        ...summary.group.devices.flatMap(device => [device.name, device.ip, device.proxyName ?? '']),
      ].join(' ')).includes(search);
    })
    .sort((a, b) => compareEnvironmentSummaries(a, b, filters.sortBy));
}

export function groupEnvironmentDevices(devices: Device[]) {
  const order: DeviceType[] = ['server', 'camera', 'router', 'switch', 'firewall'];
  return order
    .map(type => ({ type, devices: devices.filter(device => device.type === type) }))
    .filter(group => group.devices.length > 0);
}

export function buildEnvironmentInfrastructure(group: ClientGroup, allGroups: ClientGroup[]): EnvironmentInfrastructure {
  const allDevices = allGroups.flatMap(item => item.devices);
  const proxyDevices = allDevices.filter(isProxyDevice);
  const associations = new Map<string, EnvironmentProxyAssociation>();

  group.devices.forEach(device => {
    if (!device.proxyId && !device.proxyName) return;
    const id = device.proxyId ?? device.proxyName!;
    const current = associations.get(id);
    if (current) {
      current.affectedDevices += 1;
      return;
    }
    const proxy = proxyDevices.find(item => item.proxyId === device.proxyId || item.id === `proxy-${device.proxyId}`);
    associations.set(id, {
      id,
      name: device.proxyName ?? proxy?.name ?? 'Proxy sem nome informado',
      affectedDevices: 1,
      proxy,
    });
  });

  return {
    proxies: Array.from(associations.values()).sort((a, b) => a.name.localeCompare(b.name)),
    servers: group.devices.filter(device => device.type === 'server'),
    networkDevices: group.devices.filter(device => ['router', 'switch', 'firewall'].includes(device.type)),
  };
}

function compareEnvironmentSummaries(a: EnvironmentSummary, b: EnvironmentSummary, sortBy: EnvironmentSortKey) {
  if (sortBy === 'name') return compareNames(a, b);
  if (sortBy === 'failures') return b.confirmedFailures - a.confirmedFailures || compareEnvironmentAction(a, b);
  if (sortBy === 'devices') return b.totalDevices - a.totalDevices || compareEnvironmentAction(a, b);
  return compareEnvironmentAction(a, b);
}

function compareEnvironmentAction(a: EnvironmentSummary, b: EnvironmentSummary) {
  return (
    Number(b.confirmedFailures > 0) - Number(a.confirmedFailures > 0) ||
    severityRank(b) - severityRank(a) ||
    b.confirmedFailures - a.confirmedFailures ||
    b.durationMs - a.durationMs ||
    b.alertOccurrences - a.alertOccurrences ||
    compareNames(a, b)
  );
}

function severityRank(summary: EnvironmentSummary) {
  if (summary.confirmedFailures > 0) return 5;
  if (summary.criticalAlerts > 0) return 4;
  if (summary.alertOccurrences > 0 || summary.warningDevices > 0) return 3;
  if (summary.unconfirmedDevices > 0) return 2;
  return 1;
}

function compareNames(a: EnvironmentSummary, b: EnvironmentSummary) {
  return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}
