import { describe, expect, it } from 'vitest';
import type { Alert, ClientGroup, Device, DeviceClassification } from '@/domain/noc';
import { buildEnvironmentInfrastructure, buildEnvironmentSummaries, filterEnvironmentSummaries } from '@/domain/noc-environments';
import { buildNocOccurrences } from '@/domain/noc-occurrences';

const observedAt = '2026-09-01T12:00:00.000Z';
const now = Date.parse('2026-09-01T13:00:00.000Z');
const classifications: Record<'healthy' | 'failure' | 'warning' | 'unknown', DeviceClassification> = {
  healthy: { health: 'healthy', visibility: 'current', operationalState: 'functioning', evidence: { reasonCode: 'HOST_RESPONDING', reasonLabel: 'Respondendo', source: 'host', observedAt } },
  failure: { health: 'failed', visibility: 'current', operationalState: 'confirmed-failure', evidence: { reasonCode: 'HOST_UNAVAILABLE', reasonLabel: 'Sem resposta', source: 'host', observedAt } },
  warning: { health: 'warning', visibility: 'current', operationalState: 'warning', evidence: { reasonCode: 'ACTIVE_WARNING', reasonLabel: 'Problema ativo', source: 'trigger', observedAt } },
  unknown: { health: 'unknown', visibility: 'lost', operationalState: 'unconfirmed', evidence: { reasonCode: 'PROXY_NO_CONTACT', reasonLabel: 'Proxy sem contato', source: 'proxy', observedAt } },
};

function device(id: string, group: string, classification: DeviceClassification, overrides: Partial<Device> = {}): Device {
  return {
    id,
    name: `Host ${id}`,
    type: 'server',
    group,
    status: classification.operationalState === 'confirmed-failure' ? 'offline' : classification.operationalState === 'unconfirmed' ? 'unknown' : classification.operationalState === 'warning' ? 'warning' : 'online',
    classification,
    ip: `10.0.0.${id}`,
    ...overrides,
  };
}

function group(id: string, name: string, devices: Device[]): ClientGroup {
  return { id, name: `[CLIENTE] ${name}`, devices };
}

describe('ambientes orientados por ação', () => {
  it('ordena falha confirmada antes de alerta, visibilidade e ambiente saudável', () => {
    const failureGroup = group('1', 'Falha', [device('1', '[CLIENTE] Falha', classifications.failure)]);
    const alertGroup = group('2', 'Alerta', [device('2', '[CLIENTE] Alerta', classifications.warning)]);
    const visibilityGroup = group('3', 'Visibilidade', [device('3', '[CLIENTE] Visibilidade', classifications.unknown, { proxyId: '20' })]);
    const healthyGroup = group('4', 'Saudável', [device('4', '[CLIENTE] Saudável', classifications.healthy)]);
    const alert: Alert = { id: 'cpu', hostId: '2', device: 'Host 2', group: '[CLIENTE] Alerta', message: 'CPU alta', severity: 'critical', timestamp: observedAt };
    const groups = [healthyGroup, visibilityGroup, alertGroup, failureGroup];
    const summaries = buildEnvironmentSummaries(groups, buildNocOccurrences(groups, [alert]), now);

    expect(summaries.map(summary => summary.state)).toEqual(['failure', 'alert', 'visibility', 'healthy']);
    expect(summaries.map(summary => summary.name)).toEqual(['Falha', 'Alerta', 'Visibilidade', 'Saudável']);
  });

  it('contabiliza hosts sem confirmação sem multiplicar a ocorrência do proxy', () => {
    const environment = group('1', 'Proxy', [
      device('1', '[CLIENTE] Proxy', classifications.unknown, { proxyId: '20', proxyName: 'Proxy Cliente' }),
      device('2', '[CLIENTE] Proxy', classifications.unknown, { proxyId: '20', proxyName: 'Proxy Cliente' }),
    ]);
    const summary = buildEnvironmentSummaries([environment], buildNocOccurrences([environment], []), now)[0];

    expect(summary).toMatchObject({ state: 'visibility', unconfirmedDevices: 2, visibilityOccurrences: 1 });
  });

  it('filtra por ação e encontra ambiente por proxy', () => {
    const affected = group('1', 'Afetado', [device('1', '[CLIENTE] Afetado', classifications.unknown, { proxyName: 'Proxy Nordeste' })]);
    const healthy = group('2', 'Saudável', [device('2', '[CLIENTE] Saudável', classifications.healthy)]);
    const groups = [affected, healthy];
    const summaries = buildEnvironmentSummaries(groups, buildNocOccurrences(groups, []), now);
    const filtered = filterEnvironmentSummaries(summaries, { search: 'nordeste', status: 'action', type: 'all', bucket: 'all', sortBy: 'action' });

    expect(filtered.map(summary => summary.name)).toEqual(['Afetado']);
  });

  it('deriva proxies e rede apenas dos equipamentos retornados', () => {
    const environment = group('1', 'Infra', [
      device('1', '[CLIENTE] Infra', classifications.healthy, { proxyId: '20', proxyName: 'Proxy Cliente' }),
      device('2', '[CLIENTE] Infra', classifications.healthy, { proxyId: '20', proxyName: 'Proxy Cliente', type: 'switch' }),
    ]);
    const proxy = device('proxy-20', '[BASE] Zabbix Proxies', classifications.healthy, { isProxy: true, proxyId: '20', name: 'Proxy Cliente' });
    const proxyGroup: ClientGroup = { id: 'base', name: '[BASE] Zabbix Proxies', devices: [proxy] };
    const infrastructure = buildEnvironmentInfrastructure(environment, [environment, proxyGroup]);

    expect(infrastructure.proxies).toEqual([expect.objectContaining({ id: '20', affectedDevices: 2, proxy })]);
    expect(infrastructure.networkDevices.map(item => item.id)).toEqual(['2']);
    expect(infrastructure.servers.map(item => item.id)).toEqual(['1']);
  });
});
