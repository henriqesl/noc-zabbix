import { describe, expect, it } from 'vitest';
import type { ClientGroup, Device, DeviceClassification, DeviceType, OperationalState } from '@/domain/noc';
import { buildInfrastructureModel, filterInfrastructureProxies } from '@/domain/noc-infrastructure';

const observedAt = '2026-09-01T12:00:00.000Z';

function classification(state: OperationalState): DeviceClassification {
  const values: Record<OperationalState, DeviceClassification> = {
    functioning: { health: 'healthy', visibility: 'current', operationalState: 'functioning', evidence: { reasonCode: 'HOST_RESPONDING', reasonLabel: 'Comunicando', source: 'host', observedAt } },
    warning: { health: 'warning', visibility: 'current', operationalState: 'warning', evidence: { reasonCode: 'ACTIVE_WARNING', reasonLabel: 'Alerta ativo', source: 'trigger', observedAt } },
    'confirmed-failure': { health: 'failed', visibility: 'lost', operationalState: 'confirmed-failure', evidence: { reasonCode: 'PROXY_NO_CONTACT', reasonLabel: 'Proxy sem contato', source: 'proxy', observedAt } },
    unconfirmed: { health: 'unknown', visibility: 'lost', operationalState: 'unconfirmed', evidence: { reasonCode: 'PROXY_NO_CONTACT', reasonLabel: 'Sem visibilidade pelo proxy', source: 'proxy', observedAt } },
  };
  return values[state];
}

function device(id: string, type: DeviceType, state: OperationalState, overrides: Partial<Device> = {}): Device {
  return {
    id,
    name: `Host ${id}`,
    type,
    group: '[CLIENTE] Fábrica',
    status: state === 'functioning' ? 'online' : state === 'warning' ? 'warning' : state === 'confirmed-failure' ? 'offline' : 'unknown',
    classification: classification(state),
    ip: `10.0.0.${id}`,
    ...overrides,
  };
}

describe('modelo de infraestrutura', () => {
  it('representa uma falha de proxy uma única vez sem transformar seus hosts em falhas', () => {
    const proxy = device('proxy-20', 'server', 'confirmed-failure', { isProxy: true, proxyId: '20', name: 'Proxy Unidade' });
    const hosts = [1, 2, 3].map(id => device(String(id), 'camera', 'unconfirmed', { proxyId: '20', proxyName: 'Proxy Unidade' }));
    const groups: ClientGroup[] = [{ id: '10', name: '[CLIENTE] Fábrica', devices: [...hosts, proxy] }];

    const model = buildInfrastructureModel(groups, { collectedAt: observedAt, freshness: 'current' }, Date.parse(observedAt));

    expect(model.proxies).toHaveLength(1);
    expect(model.failedProxies).toBe(1);
    expect(model.proxies[0].associatedHosts).toHaveLength(3);
    expect(model.proxies[0].affectedHosts).toBe(3);
    expect(hosts.every(host => host.classification.operationalState === 'unconfirmed')).toBe(true);
  });

  it('expõe referência de proxy ausente na API como estado não confirmado', () => {
    const host = device('1', 'server', 'unconfirmed', { proxyId: '99', proxyName: 'Proxy Restrito' });
    const model = buildInfrastructureModel([{ id: '10', name: host.group, devices: [host] }], { collectedAt: observedAt, freshness: 'current' });

    expect(model.proxies[0]).toMatchObject({ id: '99', name: 'Proxy Restrito', state: 'unconfirmed', missingFromApi: true });
    expect(model.failedProxies).toBe(0);
  });

  it('deriva servidores e rede somente dos tipos reais já classificados', () => {
    const server = device('1', 'server', 'functioning');
    const router = device('2', 'router', 'warning');
    const cameraNamedSwitch = device('3', 'camera', 'functioning', { name: 'Switch visto pela câmera' });
    const proxy = device('proxy-1', 'server', 'functioning', { isProxy: true, proxyId: '1' });
    const model = buildInfrastructureModel([{ id: '10', name: server.group, devices: [server, router, cameraNamedSwitch, proxy] }], null);

    expect(model.servers.map(item => item.id)).toEqual(['1']);
    expect(model.networkGroups[0].devices.map(item => item.id)).toEqual(['2']);
    expect(model.snapshotFreshness).toBe('expired');
  });

  it('calcula a idade da coleta sem inventar um valor quando não há snapshot', () => {
    const current = buildInfrastructureModel([], { collectedAt: observedAt, freshness: 'delayed' }, Date.parse(observedAt) + 120_000);
    const absent = buildInfrastructureModel([], null);
    expect(current.snapshotAgeMs).toBe(120_000);
    expect(current.snapshotFreshness).toBe('delayed');
    expect(absent.snapshotAgeMs).toBeUndefined();
  });

  it('filtra proxies por estado, ambiente, host, IP e nome', () => {
    const proxy = device('proxy-20', 'server', 'functioning', { isProxy: true, proxyId: '20', name: 'Proxy Unidade' });
    const host = device('1', 'server', 'functioning', { proxyId: '20', ip: '10.20.30.40' });
    const model = buildInfrastructureModel([{ id: '10', name: host.group, devices: [proxy, host] }], null);

    expect(filterInfrastructureProxies(model.proxies, { search: '10.20.30.40', state: 'functioning' })).toHaveLength(1);
    expect(filterInfrastructureProxies(model.proxies, { search: 'inexistente', state: 'all' })).toHaveLength(0);
    expect(filterInfrastructureProxies(model.proxies, { search: '', state: 'confirmed-failure' })).toHaveLength(0);
  });
});
