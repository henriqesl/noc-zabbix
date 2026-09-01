import { beforeEach, describe, expect, it } from 'vitest';
import type { NocData } from '@/domain/noc';
import {
  applySnapshotFreshness,
  carryForwardLastKnownStates,
  classifyDevice,
  getSnapshotFreshness,
  isConfirmedFailureTrigger,
  OPERATIONAL_STATE_LABELS,
} from '@/domain/noc-classifier';
import { getEnvironmentRestriction } from '@/domain/noc-restrictions';
import { readNocSnapshot, writeNocSnapshot } from '@/services/noc-snapshot-cache';

const collectedAt = 1_800_000_000_000;
const currentProxyAccess = Math.floor(collectedAt / 1000) - 30;
const offlineProxyAccess = Math.floor(collectedAt / 1000) - 181;

const classify = (overrides: Partial<Parameters<typeof classifyDevice>[0]> = {}) => classifyDevice({
  available: '1',
  hasConfirmedFailure: false,
  hasActiveProblem: false,
  collectedAt,
  proxyDataAvailable: true,
  ...overrides,
});

describe('classificadores de estado e visibilidade', () => {
  it('1. classifica host respondendo normalmente como Funcionando', () => {
    expect(classify()).toMatchObject({ health: 'healthy', visibility: 'current', operationalState: 'functioning' });
    expect(OPERATIONAL_STATE_LABELS).toEqual({
      functioning: 'Funcionando',
      'confirmed-failure': 'Falha confirmada',
      warning: 'Alerta',
      unconfirmed: 'Estado não confirmado',
    });
  });

  it('2. classifica host respondendo com problema ativo como Alerta', () => {
    expect(classify({ hasActiveProblem: true })).toMatchObject({
      health: 'warning', operationalState: 'warning', evidence: { reasonCode: 'ACTIVE_WARNING', source: 'trigger' },
    });
  });

  it('3. confirma falha concreta somente com visibilidade atual', () => {
    expect(classify({ available: '2' })).toMatchObject({
      health: 'failed', visibility: 'current', operationalState: 'confirmed-failure',
      evidence: { reasonCode: 'HOST_UNAVAILABLE', source: 'host' },
    });
    expect(isConfirmedFailureTrigger('Camera: Unavailable by ICMP ping')).toBe(true);
    expect(isConfirmedFailureTrigger('Disk space is critically low')).toBe(false);
  });

  it('4. proxy sem contato torna o host não confirmado, mesmo com falha aparente', () => {
    expect(classify({
      available: '2', hasConfirmedFailure: true, proxyId: 'proxy-1', proxyLastAccess: offlineProxyAccess,
    })).toMatchObject({
      health: 'unknown', visibility: 'lost', operationalState: 'unconfirmed',
      evidence: { reasonCode: 'PROXY_NO_CONTACT', source: 'proxy' },
    });
  });

  it('5. disponibilidade desconhecida não é convertida em online ou offline', () => {
    expect(classify({ available: '0' })).toMatchObject({
      health: 'unknown', visibility: 'limited', operationalState: 'unconfirmed',
      evidence: { reasonCode: 'AVAILABILITY_UNKNOWN' },
    });
  });

  it('6. detecta snapshots atrasados e vencidos e invalida o estado público', () => {
    expect(getSnapshotFreshness(collectedAt, collectedAt + 90_001)).toBe('delayed');
    expect(getSnapshotFreshness(collectedAt, collectedAt + 300_001)).toBe('expired');

    const expired = applySnapshotFreshness(classify(), new Date(collectedAt).toISOString(), collectedAt + 300_001);
    expect(expired).toMatchObject({
      visibility: 'lost', operationalState: 'unconfirmed', lastKnownState: 'functioning',
      evidence: { reasonCode: 'SNAPSHOT_EXPIRED', source: 'snapshot' },
    });
  });

  it('7. aplica metadado centralizado de restrição conhecida', () => {
    const restriction = getEnvironmentRestriction('[CLIENTE] Terphane');
    const arlanxeoRestriction = getEnvironmentRestriction('[CLIENTE] Arlanxeo');
    const result = classify({ proxyId: 'proxy-1', proxyLastAccess: offlineProxyAccess, restriction });

    expect(restriction?.id).toBe('terphane-local-it-access');
    expect(arlanxeoRestriction?.id).toBe('arlanxeo-local-it-access');
    expect(result).toMatchObject({
      visibility: 'limited', operationalState: 'unconfirmed',
      evidence: { reasonCode: 'KNOWN_RESTRICTION', source: 'restriction' },
    });
  });

  it('9. preserva Funcionando como último estado conhecido após perder visibilidade', () => {
    const previous = classify();
    const next = classify({ proxyId: 'proxy-1', proxyLastAccess: offlineProxyAccess });
    const previousGroups = [{
      id: 'group', name: 'Cliente', devices: [{
        id: 'host', name: 'Host', type: 'server' as const, group: 'Cliente', status: 'online' as const,
        classification: previous, ip: '10.0.0.1',
      }],
    }];
    const nextGroups = [{
      id: 'group', name: 'Cliente', devices: [{
        id: 'host', name: 'Host', type: 'server' as const, group: 'Cliente', status: 'unknown' as const,
        classification: next, ip: '10.0.0.1',
      }],
    }];

    expect(carryForwardLastKnownStates(nextGroups, previousGroups)[0].devices[0].classification.lastKnownState).toBe('functioning');
  });

  it('10. não cria falhas em cascata para vários hosts atrás do mesmo proxy indisponível', () => {
    const hosts = Array.from({ length: 50 }, () => classify({
      available: '2', hasConfirmedFailure: true, proxyId: 'proxy-1', proxyLastAccess: offlineProxyAccess,
    }));

    expect(hosts.every(host => host.operationalState === 'unconfirmed')).toBe(true);
    expect(hosts.filter(host => host.operationalState === 'confirmed-failure')).toHaveLength(0);
  });

  it('mantém host atrás de proxy atual classificável normalmente', () => {
    expect(classify({ proxyId: 'proxy-1', proxyLastAccess: currentProxyAccess })).toMatchObject({
      visibility: 'current', operationalState: 'functioning',
    });
  });
});

describe('snapshot de contingência', () => {
  beforeEach(() => window.localStorage.clear());

  it('persiste e recupera a última leitura válida', () => {
    const snapshot: NocData = {
      groups: [], alerts: [],
      snapshot: { collectedAt: new Date(collectedAt).toISOString(), freshness: 'current' },
    };

    expect(writeNocSnapshot(snapshot)).toBe(true);
    expect(readNocSnapshot()).toEqual(snapshot);
  });
});
