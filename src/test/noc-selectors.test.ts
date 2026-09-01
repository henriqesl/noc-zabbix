import { describe, expect, it } from 'vitest';
import type { ClientGroup, Device, DeviceClassification } from '@/domain/noc';
import { getGroupHealth, getNocSummary, isRealOfflineDevice } from '@/domain/noc-selectors';

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
});
