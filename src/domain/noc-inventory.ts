import type { ClientGroup, Device, DeviceType, OperationalState } from './noc';
import { cleanGroupName, getOperationalState, isActiveNocGroup, isProxyDevice } from './noc-selectors';

export type InventorySortKey = 'action' | 'name' | 'environment';

export interface InventoryFilters {
  search: string;
  environment: string;
  type: DeviceType | 'all';
  state: OperationalState | 'all';
  sortBy: InventorySortKey;
}

export interface InventorySummary {
  total: number;
  functioning: number;
  failures: number;
  warnings: number;
  unconfirmed: number;
}

export interface InventoryGroup {
  type: DeviceType;
  devices: Device[];
  summary: InventorySummary;
}

export const INVENTORY_TYPE_LABELS: Record<DeviceType, string> = {
  camera: 'Câmeras',
  recorder: 'Gravadores NVR / DVR',
  storage: 'Armazenamento',
  router: 'Roteadores',
  switch: 'Switches',
  firewall: 'Firewalls',
  server: 'Servidores',
};

const inventoryTypeOrder: DeviceType[] = ['camera', 'recorder', 'storage', 'router', 'switch', 'firewall', 'server'];

export function classifyDeviceType(hostName: string, groupName: string): DeviceType {
  const host = pad(normalize(hostName));
  const group = pad(normalize(groupName));
  const combined = `${host} ${group}`;

  if (containsAny(combined, ['nvr', 'dvr', 'gravador', 'recorder'])) return 'recorder';
  if (containsAny(combined, ['storage', 'stor ', ' nas ', ' san ', 'qnap', 'synology'])) return 'storage';
  if (host.includes('cam') || group.includes('cam')) return 'camera';
  if (containsAny(combined, ['firewall', 'fortigate', 'pfsense', 'sophos'])) return 'firewall';
  if (containsAny(combined, ['switch', ' sw-', ' sw ']) || host.startsWith('sw')) return 'switch';
  if (containsAny(combined, ['mikrotik', 'router', 'roteador']) || group.includes('link') || group.includes('rede')) return 'router';
  return 'server';
}

export function getInventoryDevices(groups: ClientGroup[]) {
  return groups
    .filter(isActiveNocGroup)
    .flatMap(group => group.devices)
    .filter(device => !isProxyDevice(device));
}

export function getInventorySummary(devices: Device[]): InventorySummary {
  return {
    total: devices.length,
    functioning: devices.filter(device => getOperationalState(device) === 'functioning').length,
    failures: devices.filter(device => getOperationalState(device) === 'confirmed-failure').length,
    warnings: devices.filter(device => getOperationalState(device) === 'warning').length,
    unconfirmed: devices.filter(device => getOperationalState(device) === 'unconfirmed').length,
  };
}

export function filterInventoryDevices(devices: Device[], filters: InventoryFilters) {
  const search = normalize(filters.search.trim());
  return devices
    .filter(device => filters.environment === 'all' || device.group === filters.environment)
    .filter(device => filters.type === 'all' || device.type === filters.type)
    .filter(device => filters.state === 'all' || getOperationalState(device) === filters.state)
    .filter(device => !search || normalize(`${device.name} ${device.ip} ${device.group} ${device.proxyName ?? ''} ${device.classification.evidence.reasonCode}`).includes(search))
    .sort((a, b) => compareInventoryDevices(a, b, filters.sortBy));
}

export function groupInventoryDevices(devices: Device[]): InventoryGroup[] {
  return inventoryTypeOrder
    .map(type => {
      const typedDevices = devices.filter(device => device.type === type);
      return { type, devices: typedDevices, summary: getInventorySummary(typedDevices) };
    })
    .filter(group => group.devices.length > 0);
}

export function getInventoryEnvironments(groups: ClientGroup[]) {
  return groups
    .filter(isActiveNocGroup)
    .filter(group => group.devices.some(device => !isProxyDevice(device)))
    .map(group => ({ value: group.id, groupName: group.name, label: cleanGroupName(group.name) }))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: 'base' }));
}

function compareInventoryDevices(a: Device, b: Device, sortBy: InventorySortKey) {
  if (sortBy === 'name') return compareNames(a.name, b.name);
  if (sortBy === 'environment') return compareNames(cleanGroupName(a.group), cleanGroupName(b.group)) || compareNames(a.name, b.name);
  return stateRank(getOperationalState(b)) - stateRank(getOperationalState(a)) || compareNames(a.name, b.name);
}

function stateRank(state: OperationalState) {
  return { 'confirmed-failure': 4, warning: 3, unconfirmed: 2, functioning: 1 }[state];
}

function containsAny(value: string, needles: string[]) {
  return needles.some(needle => value.includes(needle));
}

function compareNames(a: string, b: string) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function pad(value: string) {
  return ` ${value} `;
}
