import { describe, expect, it } from 'vitest';
import type { Alert, ClientGroup, Device, DeviceClassification } from '@/domain/noc';
import { buildNocOccurrences, getOccurrenceCounts } from '@/domain/noc-occurrences';

const observedAt = '2026-09-01T12:00:00.000Z';
const classifications: Record<'healthy' | 'failure' | 'warning' | 'unknown', DeviceClassification> = {
  healthy: {
    health: 'healthy', visibility: 'current', operationalState: 'functioning',
    evidence: { reasonCode: 'HOST_RESPONDING', reasonLabel: 'Respondendo', source: 'host', observedAt },
  },
  failure: {
    health: 'failed', visibility: 'current', operationalState: 'confirmed-failure',
    evidence: { reasonCode: 'HOST_UNAVAILABLE', reasonLabel: 'O host não responde', source: 'host', observedAt },
  },
  warning: {
    health: 'warning', visibility: 'current', operationalState: 'warning',
    evidence: { reasonCode: 'ACTIVE_WARNING', reasonLabel: 'Problema ativo', source: 'trigger', observedAt },
  },
  unknown: {
    health: 'unknown', visibility: 'lost', operationalState: 'unconfirmed',
    evidence: { reasonCode: 'PROXY_NO_CONTACT', reasonLabel: 'Proxy sem contato', source: 'proxy', observedAt },
  },
};

const device = (id: string, classification: DeviceClassification, overrides: Partial<Device> = {}): Device => ({
  id,
  name: `Host ${id}`,
  type: 'server',
  group: '[CLIENTE] Exemplo',
  status: classification.operationalState === 'confirmed-failure' ? 'offline' : classification.operationalState === 'unconfirmed' ? 'unknown' : classification.operationalState === 'warning' ? 'warning' : 'online',
  classification,
  ip: `10.0.0.${id}`,
  ...overrides,
});

const group = (devices: Device[]): ClientGroup => ({ id: '10', name: '[CLIENTE] Exemplo', devices });

describe('modelo unificado de ocorrências', () => {
  it('agrega vários hosts sem visibilidade pela mesma causa', () => {
    const devices = [
      device('1', classifications.unknown, { proxyId: '20', proxyName: 'Proxy Cliente' }),
      device('2', classifications.unknown, { proxyId: '20', proxyName: 'Proxy Cliente' }),
    ];

    const occurrences = buildNocOccurrences([group(devices)], []);
    expect(occurrences).toHaveLength(1);
    expect(occurrences[0]).toMatchObject({ kind: 'visibility', affectedDevices: devices });
  });

  it('incorpora trigger de disponibilidade à falha sem duplicar a ocorrência', () => {
    const failed = device('1', classifications.failure);
    const alert: Alert = {
      id: 'trigger-1', hostId: failed.id, device: failed.name, group: failed.group,
      message: 'Unavailable by ICMP ping', severity: 'critical', timestamp: observedAt,
    };

    const occurrences = buildNocOccurrences([group([failed])], [alert]);
    expect(occurrences).toHaveLength(1);
    expect(occurrences[0]).toMatchObject({ kind: 'failure', relatedAlerts: [alert] });
    expect(occurrences[0].acknowledged).toBeUndefined();
  });

  it('mantém alerta técnico distinto quando ele não é evidência da falha', () => {
    const failed = device('1', classifications.failure);
    const alert: Alert = {
      id: 'disk', hostId: failed.id, device: failed.name, group: failed.group,
      message: 'Disk space is critically low', severity: 'critical', timestamp: observedAt,
    };

    expect(buildNocOccurrences([group([failed])], [alert]).map(item => item.kind)).toEqual(['failure', 'alert']);
  });

  it('não oculta alerta registrado quando o host perde visibilidade', () => {
    const unknown = device('1', classifications.unknown, { proxyId: '20' });
    const alert: Alert = {
      id: 'stale-alert', hostId: unknown.id, device: unknown.name, group: unknown.group,
      message: 'CPU elevada', severity: 'critical', timestamp: observedAt,
    };

    const occurrences = buildNocOccurrences([group([unknown])], [alert]);
    expect(occurrences.map(item => item.kind)).toEqual(['alert', 'visibility']);
    expect(occurrences[0]).toMatchObject({ visibility: 'lost', evidence: { source: 'trigger' } });
  });

  it('gera ocorrência para alerta de estado sem trigger correspondente', () => {
    const warning = device('1', classifications.warning);
    const occurrences = buildNocOccurrences([group([warning])], []);

    expect(getOccurrenceCounts(occurrences)).toEqual({ all: 1, failure: 0, alert: 1, visibility: 0 });
    expect(occurrences[0]).toMatchObject({ id: 'warning:1', kind: 'alert' });
  });
});
