import { describe, expect, it } from 'vitest';
import type { Alert, ClientGroup, Device, DeviceClassification } from '@/domain/noc';
import { filterClientGroups, getEnvironmentAttentionQueue, getGroupHealth, getNocSummary, isRealOfflineDevice } from '@/domain/noc-selectors';

const classifications: Record<'functioning' | 'failure' | 'unconfirmed', DeviceClassification> = {
  functioning: {
    health: 'healthy', visibility: 'current', operationalState: 'functioning',
    evidence: { reasonCode: 'HOST_RESPONDING', reasonLabel: 'Respondendo', source: 'host', observedAt: new Date(0).toISOString() },
  },
  failure: {
    health: 'failed', visibility: 'current', operationalState: 'confirmed-failure',
    evidence: { reasonCode: 'HOST_UNAVAILABLE', reasonLabel: 'Indisponível', source: 'host', observedAt: new Date(0).toISOString() },
  },
  unconfirmed: {
    health: 'unknown', visibility: 'lost', operationalState: 'unconfirmed',
    evidence: { reasonCode: 'PROXY_NO_CONTACT', reasonLabel: 'Proxy sem contato', source: 'proxy', observedAt: new Date(0).toISOString() },
  },
};

const device = (overrides: Partial<Device> = {}): Device => ({
  id: 'host-1',
  name: 'Host 1',
  type: 'server',
  group: '[CLIENTE] Teste',
  status: 'online',
  classification: classifications.functioning,
  ip: '10.0.0.1',
  ...overrides,
});

describe('classificação operacional nos seletores', () => {
  it('não trata estado desconhecido como saudável ou falha confirmada', () => {
    const unknown = device({ status: 'unknown', classification: classifications.unconfirmed });
    const group: ClientGroup = { id: 'group-1', name: '[CLIENTE] Teste', devices: [unknown] };

    expect(getGroupHealth(group)).toMatchObject({ online: 0, offline: 0, unknown: 1, status: 'degraded' });
    expect(isRealOfflineDevice(unknown)).toBe(false);
  });

  it('separa falha do host de perda de visibilidade pelo proxy sem duplicar hosts', () => {
    const confirmed = device({ id: 'confirmed', status: 'offline', offlineReason: 'host', classification: classifications.failure });
    const viaProxy = device({ id: 'host-via-proxy', status: 'unknown', offlineReason: 'proxy', proxyId: '10', classification: classifications.unconfirmed });
    const group: ClientGroup = { id: 'group-1', name: '[CLIENTE] Teste', devices: [confirmed, viaProxy] };
    const summary = getNocSummary([group]);

    expect(summary.realOfflineDevices).toEqual([confirmed]);
    expect(summary.visibilityAffectedDevices).toEqual([viaProxy]);
  });

  it('permite busca global pelo proxy associado', () => {
    const viaProxy = device({ proxyName: 'Proxy Terphane Fortaleza' });
    const group: ClientGroup = { id: 'group-1', name: '[CLIENTE] Teste', devices: [viaProxy] };

    expect(filterClientGroups([group], {
      search: 'terphane', status: 'all', type: 'all', bucket: 'all', sortBy: 'criticality',
    })).toEqual([group]);
  });

  it('ordena Onde começar por falha, severidade, quantidade, duração, alertas e nome', () => {
    const now = Date.parse('2026-09-01T12:00:00.000Z');
    const failureAt = (minutes: number, id: string) => device({
      id,
      status: 'offline',
      offlineReason: 'host',
      classification: {
        ...classifications.failure,
        evidence: { ...classifications.failure.evidence, observedAt: new Date(now - minutes * 60_000).toISOString() },
      },
    });
    const unknown = device({
      id: 'unknown', status: 'unknown', classification: {
        ...classifications.unconfirmed,
        evidence: { ...classifications.unconfirmed.evidence, observedAt: new Date(now - 120 * 60_000).toISOString() },
      },
    });
    const groups: ClientGroup[] = [
      { id: 'one-failure', name: '[CLIENTE] Uma falha', devices: [failureAt(60, 'f1')] },
      { id: 'two-failures', name: '[CLIENTE] Duas falhas', devices: [failureAt(10, 'f2'), failureAt(10, 'f3')] },
      { id: 'critical-alert', name: '[CLIENTE] Alerta crítico', devices: [device({ id: 'a1' })] },
      { id: 'warning-alert', name: '[CLIENTE] Alerta aviso', devices: [device({ id: 'a2' })] },
      { id: 'visibility', name: '[CLIENTE] Visibilidade', devices: [unknown] },
      { id: 'healthy', name: '[CLIENTE] Saudável', devices: [device({ id: 'ok' })] },
    ];
    const alerts: Alert[] = [
      { id: 'critical', hostId: 'a1', device: 'Host', group: '[CLIENTE] Alerta crítico', message: 'CPU', severity: 'critical', timestamp: String((now - 5 * 60_000) / 1000) },
      { id: 'warning', hostId: 'a2', device: 'Host', group: '[CLIENTE] Alerta aviso', message: 'Disco', severity: 'warning', timestamp: String((now - 30 * 60_000) / 1000) },
    ];

    expect(getEnvironmentAttentionQueue(groups, alerts, now).map(item => item.group.id)).toEqual([
      'two-failures', 'one-failure', 'critical-alert', 'warning-alert', 'visibility',
    ]);
  });

  it('não usa alerta de host sem visibilidade para promover uma falha inexistente', () => {
    const unknown = device({ id: 'host-via-proxy', status: 'unknown', classification: classifications.unconfirmed });
    const group: ClientGroup = { id: 'limited', name: '[CLIENTE] Restrito', devices: [unknown] };
    const alerts: Alert[] = [{
      id: 'stale', hostId: unknown.id, device: unknown.name, group: group.name,
      message: 'Host unavailable', severity: 'critical', timestamp: String(Date.now() / 1000),
    }];

    expect(getEnvironmentAttentionQueue([group], alerts)[0]).toMatchObject({
      kind: 'visibility', dominantSeverity: 'visibility', activeAlerts: [],
    });
  });
});
