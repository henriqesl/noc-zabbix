import { describe, expect, it } from 'vitest';
import type { ClientGroup, Device, DeviceClassification, DeviceType } from '@/domain/noc';
import {
  classifyDeviceType,
  filterInventoryDevices,
  getInventoryDevices,
  getInventoryEnvironments,
  getInventorySummary,
  groupInventoryDevices,
} from '@/domain/noc-inventory';

const observedAt = '2026-09-01T12:00:00.000Z';
const classifications: Record<'healthy' | 'failure' | 'warning' | 'unknown', DeviceClassification> = {
  healthy: { health: 'healthy', visibility: 'current', operationalState: 'functioning', evidence: { reasonCode: 'HOST_RESPONDING', reasonLabel: 'Respondendo', source: 'host', observedAt } },
  failure: { health: 'failed', visibility: 'current', operationalState: 'confirmed-failure', evidence: { reasonCode: 'HOST_UNAVAILABLE', reasonLabel: 'Sem resposta', source: 'host', observedAt } },
  warning: { health: 'warning', visibility: 'current', operationalState: 'warning', evidence: { reasonCode: 'ACTIVE_WARNING', reasonLabel: 'Alerta', source: 'trigger', observedAt } },
  unknown: { health: 'unknown', visibility: 'lost', operationalState: 'unconfirmed', evidence: { reasonCode: 'PROXY_NO_CONTACT', reasonLabel: 'Proxy sem contato', source: 'proxy', observedAt } },
};

function device(id: string, type: DeviceType, classification: DeviceClassification, overrides: Partial<Device> = {}): Device {
  return {
    id,
    name: `Host ${id}`,
    type,
    group: '[CLIENTE] Exemplo',
    status: classification.operationalState === 'confirmed-failure' ? 'offline' : classification.operationalState === 'warning' ? 'warning' : classification.operationalState === 'unconfirmed' ? 'unknown' : 'online',
    classification,
    ip: `10.0.0.${id}`,
    ...overrides,
  };
}

describe('inventário tipado', () => {
  it.each([
    ['Câmera recepção', '[CLIENTE] Exemplo', 'camera'],
    ['NVR Intelbras 01', '[CLIENTE] Câmeras', 'recorder'],
    ['DVR Portaria', '[CLIENTE] Exemplo', 'recorder'],
    ['Storage QNAP', '[BASE] Datacenter', 'storage'],
    ['SW-CORE-01', '[CLIENTE] Rede', 'switch'],
    ['Mikrotik Matriz', '[CLIENTE] Links', 'router'],
    ['Fortigate 100F', '[CLIENTE] Exemplo', 'firewall'],
    ['Servidor ERP', '[CLIENTE] Exemplo', 'server'],
  ] as const)('classifica %s em %s como %s', (host, group, expected) => {
    expect(classifyDeviceType(host, group)).toBe(expected);
  });

  it('remove proxies do inventário geral e preserva ambientes por ID', () => {
    const host = device('1', 'server', classifications.healthy);
    const proxy = device('proxy-20', 'server', classifications.healthy, { isProxy: true, proxyId: '20', name: 'Proxy Cliente' });
    const groups: ClientGroup[] = [{ id: '10', name: '[CLIENTE] Exemplo', devices: [host, proxy] }];

    expect(getInventoryDevices(groups)).toEqual([host]);
    expect(getInventoryEnvironments(groups)).toEqual([{ value: '10', groupName: '[CLIENTE] Exemplo', label: 'Exemplo' }]);
  });

  it('filtra pelos estados públicos e ordena por prioridade de ação', () => {
    const devices = [
      device('1', 'camera', classifications.healthy),
      device('2', 'camera', classifications.unknown),
      device('3', 'camera', classifications.warning),
      device('4', 'camera', classifications.failure, { proxyName: 'Proxy Cliente' }),
    ];
    const filters = { search: '', environment: 'all', type: 'camera' as const, state: 'all' as const, sortBy: 'action' as const };

    expect(filterInventoryDevices(devices, filters).map(item => item.id)).toEqual(['4', '3', '2', '1']);
    expect(filterInventoryDevices(devices, { ...filters, state: 'unconfirmed' }).map(item => item.id)).toEqual(['2']);
    expect(getInventorySummary(devices)).toEqual({ total: 4, functioning: 1, failures: 1, warnings: 1, unconfirmed: 1 });
  });

  it('agrupa ativos sem criar categorias vazias', () => {
    const devices = [device('1', 'storage', classifications.healthy), device('2', 'camera', classifications.failure)];
    expect(groupInventoryDevices(devices).map(group => group.type)).toEqual(['camera', 'storage']);
  });
});
