import type { ClientGroup, Device, OperationalState, SnapshotFreshness, VisibilityQuality } from './noc';
import { cleanGroupName, getOperationalState, isProxyDevice } from './noc-selectors';

export type InfrastructureStateFilter = OperationalState | 'all';

export interface InfrastructureFilters {
  search: string;
  state: InfrastructureStateFilter;
}

export interface InfrastructureProxy {
  id: string;
  name: string;
  device?: Device;
  state: OperationalState;
  visibility: VisibilityQuality;
  observedAt?: string;
  reasonLabel: string;
  associatedHosts: Device[];
  affectedHosts: number;
  environments: string[];
  missingFromApi: boolean;
}

export interface InfrastructureNetworkGroup {
  id: string;
  name: string;
  devices: Device[];
  failures: number;
  warnings: number;
  unconfirmed: number;
}

export interface InfrastructureModel {
  servers: Device[];
  proxies: InfrastructureProxy[];
  networkGroups: InfrastructureNetworkGroup[];
  snapshotFreshness: SnapshotFreshness;
  snapshotObservedAt?: string;
  snapshotAgeMs?: number;
  communicatingProxies: number;
  failedProxies: number;
  unconfirmedProxies: number;
  visibilityAffectedHosts: number;
}

export function buildInfrastructureModel(
  groups: ClientGroup[],
  snapshot: { collectedAt: string; freshness: SnapshotFreshness } | null,
  now = Date.now()
): InfrastructureModel {
  const devices = uniqueDevices(groups.flatMap(group => group.devices));
  const proxyDevices = devices.filter(isProxyDevice);
  const hosts = devices.filter(device => !isProxyDevice(device));
  const proxyById = new Map(proxyDevices.map(proxy => [proxy.proxyId ?? proxy.id.replace(/^proxy-/, ''), proxy]));
  const referencedProxyIds = new Set(hosts.map(host => host.proxyId).filter((id): id is string => Boolean(id)));
  const proxyIds = new Set([...proxyById.keys(), ...referencedProxyIds]);

  const proxies = Array.from(proxyIds, proxyId => {
    const device = proxyById.get(proxyId);
    const associatedHosts = hosts.filter(host => host.proxyId === proxyId);
    const state = device ? getOperationalState(device) : 'unconfirmed';
    const environments = Array.from(new Set(associatedHosts.map(host => cleanGroupName(host.group)))).sort(localeCompare);

    return {
      id: proxyId,
      name: device?.name ?? associatedHosts.find(host => host.proxyName)?.proxyName ?? `Proxy ${proxyId}`,
      device,
      state,
      visibility: device?.classification.visibility ?? 'limited',
      observedAt: device?.classification.evidence.observedAt,
      reasonLabel: device?.classification.evidence.reasonLabel ?? 'O host referencia este proxy, mas a API não retornou seu estado.',
      associatedHosts,
      affectedHosts: associatedHosts.filter(host => getOperationalState(host) === 'unconfirmed').length,
      environments,
      missingFromApi: !device,
    } satisfies InfrastructureProxy;
  }).sort(compareProxies);

  const networkDevices = hosts.filter(device => ['switch', 'router', 'firewall'].includes(device.type));
  const networkGroups = groups
    .map(group => {
      const groupDevices = uniqueDevices(networkDevices.filter(device => device.group === group.name));
      return {
        id: group.id,
        name: group.name,
        devices: groupDevices.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { numeric: true })),
        failures: groupDevices.filter(device => getOperationalState(device) === 'confirmed-failure').length,
        warnings: groupDevices.filter(device => getOperationalState(device) === 'warning').length,
        unconfirmed: groupDevices.filter(device => getOperationalState(device) === 'unconfirmed').length,
      };
    })
    .filter(group => group.devices.length > 0)
    .sort((a, b) => b.failures - a.failures || b.warnings - a.warnings || b.unconfirmed - a.unconfirmed || localeCompare(a.name, b.name));

  const observedTime = snapshot ? Date.parse(snapshot.collectedAt) : Number.NaN;
  return {
    servers: hosts.filter(device => device.type === 'server').sort(compareDevices),
    proxies,
    networkGroups,
    snapshotFreshness: snapshot?.freshness ?? 'expired',
    snapshotObservedAt: snapshot?.collectedAt,
    snapshotAgeMs: Number.isFinite(observedTime) ? Math.max(0, now - observedTime) : undefined,
    communicatingProxies: proxies.filter(proxy => proxy.state === 'functioning').length,
    failedProxies: proxies.filter(proxy => proxy.state === 'confirmed-failure').length,
    unconfirmedProxies: proxies.filter(proxy => proxy.state === 'unconfirmed').length,
    visibilityAffectedHosts: hosts.filter(device => getOperationalState(device) === 'unconfirmed').length,
  };
}

export function filterInfrastructureProxies(proxies: InfrastructureProxy[], filters: InfrastructureFilters) {
  const search = normalize(filters.search);
  return proxies.filter(proxy => {
    const matchesState = filters.state === 'all' || proxy.state === filters.state;
    const haystack = [proxy.name, proxy.id, proxy.reasonLabel, ...proxy.environments, ...proxy.associatedHosts.flatMap(host => [host.name, host.ip])].join(' ');
    return matchesState && (!search || normalize(haystack).includes(search));
  });
}

function compareProxies(a: InfrastructureProxy, b: InfrastructureProxy) {
  const rank: Record<OperationalState, number> = { 'confirmed-failure': 0, warning: 1, unconfirmed: 2, functioning: 3 };
  return rank[a.state] - rank[b.state] || b.affectedHosts - a.affectedHosts || localeCompare(a.name, b.name);
}

function compareDevices(a: Device, b: Device) {
  const rank: Record<OperationalState, number> = { 'confirmed-failure': 0, warning: 1, unconfirmed: 2, functioning: 3 };
  return rank[getOperationalState(a)] - rank[getOperationalState(b)] || localeCompare(a.name, b.name);
}

function uniqueDevices(devices: Device[]) {
  return Array.from(new Map(devices.map(device => [device.id, device])).values());
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function localeCompare(a: string, b: string) {
  return a.localeCompare(b, 'pt-BR', { numeric: true, sensitivity: 'base' });
}
