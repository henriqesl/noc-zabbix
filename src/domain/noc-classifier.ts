import type {
  ClientGroup,
  DeviceClassification,
  DeviceStatus,
  EnvironmentRestriction,
  OperationalState,
  SnapshotFreshness,
  StateEvidence,
  VisibilityQuality,
} from './noc';

export const SNAPSHOT_DELAYED_AFTER_MS = 90_000;
export const SNAPSHOT_EXPIRED_AFTER_MS = 300_000;
export const PROXY_NO_CONTACT_AFTER_SECONDS = 180;

export const OPERATIONAL_STATE_LABELS: Record<OperationalState, string> = {
  functioning: 'Funcionando',
  'confirmed-failure': 'Falha confirmada',
  warning: 'Alerta',
  unconfirmed: 'Estado não confirmado',
};

export interface VisibilityInput {
  collectedAt: number;
  snapshotFreshness?: SnapshotFreshness;
  proxyId?: string;
  proxyLastAccess?: number;
  proxyDataAvailable: boolean;
  restriction?: EnvironmentRestriction;
}

export interface VisibilityClassification {
  quality: VisibilityQuality;
  evidence: StateEvidence;
}

export interface StateClassificationInput {
  available?: string;
  hasConfirmedFailure: boolean;
  hasActiveProblem: boolean;
  collectedAt: number;
  problemObservedAt?: number;
  visibility: VisibilityClassification;
  lastKnownState?: Exclude<OperationalState, 'unconfirmed'>;
}

export interface ClassificationInput extends Omit<StateClassificationInput, 'visibility'>, VisibilityInput {}

export function getSnapshotFreshness(observedAt: string | number | Date, now = Date.now()): SnapshotFreshness {
  const observedTime = new Date(observedAt).getTime();
  if (!Number.isFinite(observedTime)) return 'expired';

  const age = Math.max(0, now - observedTime);
  if (age > SNAPSHOT_EXPIRED_AFTER_MS) return 'expired';
  if (age > SNAPSHOT_DELAYED_AFTER_MS) return 'delayed';
  return 'current';
}

export function getProxyVisibility(lastAccess: number | undefined, nowSeconds: number): VisibilityQuality {
  if (!lastAccess || !Number.isFinite(lastAccess)) return 'lost';
  return nowSeconds - lastAccess > PROXY_NO_CONTACT_AFTER_SECONDS ? 'lost' : 'current';
}

export function visibilityClassifier(input: VisibilityInput): VisibilityClassification {
  const snapshotFreshness = input.snapshotFreshness ?? 'current';
  const collectedAt = toIso(input.collectedAt);

  if (snapshotFreshness === 'expired') {
    return visibility('lost', 'SNAPSHOT_EXPIRED', 'Os dados estão vencidos e o estado atual não pode ser confirmado.', 'snapshot', collectedAt);
  }

  if (snapshotFreshness === 'delayed') {
    return visibility('delayed', 'SNAPSHOT_DELAYED', 'A coleta está atrasada e pode não representar o estado atual.', 'snapshot', collectedAt);
  }

  if (!input.proxyId) {
    return visibility('current', 'HOST_RESPONDING', 'A leitura do Zabbix está atual.', 'snapshot', collectedAt);
  }

  if (!input.proxyDataAvailable) {
    return visibility(
      'limited',
      input.restriction ? 'KNOWN_RESTRICTION' : 'PROXY_STATE_UNKNOWN',
      input.restriction?.note ?? 'Não foi possível confirmar o estado do proxy responsável.',
      input.restriction ? 'restriction' : 'proxy',
      collectedAt
    );
  }

  const proxyQuality = getProxyVisibility(input.proxyLastAccess, Math.floor(input.collectedAt / 1000));
  if (proxyQuality === 'lost') {
    return visibility(
      input.restriction ? 'limited' : 'lost',
      input.restriction ? 'KNOWN_RESTRICTION' : 'PROXY_NO_CONTACT',
      input.restriction?.note ?? 'O proxy responsável está sem contato.',
      input.restriction ? 'restriction' : 'proxy',
      toIso((input.proxyLastAccess ?? Math.floor(input.collectedAt / 1000)) * 1000)
    );
  }

  return visibility('current', 'HOST_RESPONDING', 'O proxy responsável está comunicando normalmente.', 'proxy', toIso(input.proxyLastAccess! * 1000));
}

export function stateClassifier(input: StateClassificationInput): DeviceClassification {
  if (input.visibility.quality !== 'current') {
    return {
      health: 'unknown',
      visibility: input.visibility.quality,
      operationalState: 'unconfirmed',
      evidence: input.visibility.evidence,
      lastKnownState: input.lastKnownState,
    };
  }

  const collectedAt = toIso(input.collectedAt);
  const problemObservedAt = toIso(input.problemObservedAt ?? input.collectedAt);

  if (input.hasConfirmedFailure) {
    return classification('failed', 'confirmed-failure', {
      reasonCode: 'CRITICAL_TRIGGER',
      reasonLabel: 'O Zabbix registrou uma falha de disponibilidade do próprio equipamento.',
      source: 'trigger',
      observedAt: problemObservedAt,
    });
  }

  if (input.available === '2') {
    return classification('failed', 'confirmed-failure', {
      reasonCode: 'HOST_UNAVAILABLE',
      reasonLabel: 'O próprio equipamento não está respondendo ao Zabbix.',
      source: 'host',
      observedAt: collectedAt,
    });
  }

  if (input.available === '1' && input.hasActiveProblem) {
    return classification('warning', 'warning', {
      reasonCode: 'ACTIVE_WARNING',
      reasonLabel: 'O equipamento responde, mas possui um problema ativo.',
      source: 'trigger',
      observedAt: problemObservedAt,
    });
  }

  if (input.available === '1') {
    return classification('healthy', 'functioning', {
      reasonCode: 'HOST_RESPONDING',
      reasonLabel: 'O equipamento está respondendo ao Zabbix.',
      source: 'host',
      observedAt: collectedAt,
    });
  }

  return {
    health: 'unknown',
    visibility: 'limited',
    operationalState: 'unconfirmed',
    evidence: {
      reasonCode: 'AVAILABILITY_UNKNOWN',
      reasonLabel: 'Ainda não há informação suficiente para confirmar o estado.',
      source: 'host',
      observedAt: collectedAt,
    },
    lastKnownState: input.lastKnownState,
  };
}

export function classifyDevice(input: ClassificationInput): DeviceClassification {
  const visibility = visibilityClassifier(input);
  return stateClassifier({ ...input, visibility });
}

export function classifyProxy(lastAccess: number | undefined, collectedAt: number): DeviceClassification {
  const proxyQuality = getProxyVisibility(lastAccess, Math.floor(collectedAt / 1000));
  const observedAt = toIso((lastAccess ?? Math.floor(collectedAt / 1000)) * 1000);

  if (proxyQuality === 'lost') {
    return classification('failed', 'confirmed-failure', {
      reasonCode: 'PROXY_NO_CONTACT',
      reasonLabel: 'O proxy não se comunica com o Zabbix há mais de 3 minutos.',
      source: 'proxy',
      observedAt,
    }, 'lost');
  }

  return classification('healthy', 'functioning', {
    reasonCode: 'HOST_RESPONDING',
    reasonLabel: 'O proxy está se comunicando com o Zabbix.',
    source: 'proxy',
    observedAt,
  });
}

export function applySnapshotFreshness(
  current: DeviceClassification,
  snapshotObservedAt: string,
  now = Date.now()
): DeviceClassification {
  const freshness = getSnapshotFreshness(snapshotObservedAt, now);
  if (freshness === 'current') return current;

  const previousState = current.operationalState === 'unconfirmed'
    ? current.lastKnownState
    : current.operationalState;
  const delayed = freshness === 'delayed';

  return {
    health: 'unknown',
    visibility: delayed ? 'delayed' : 'lost',
    operationalState: 'unconfirmed',
    lastKnownState: previousState,
    evidence: {
      reasonCode: delayed ? 'SNAPSHOT_DELAYED' : 'SNAPSHOT_EXPIRED',
      reasonLabel: delayed
        ? 'A coleta está atrasada e pode não representar o estado atual.'
        : 'Os dados estão vencidos e o estado atual não pode ser confirmado.',
      source: 'snapshot',
      observedAt: snapshotObservedAt,
    },
  };
}

export function carryForwardLastKnownStates(nextGroups: ClientGroup[], previousGroups: ClientGroup[]) {
  const previousById = new Map(previousGroups.flatMap(group => group.devices).map(device => [device.id, device]));

  return nextGroups.map(group => ({
    ...group,
    devices: group.devices.map(device => {
      if (device.classification.operationalState !== 'unconfirmed') return device;

      const previous = previousById.get(device.id)?.classification;
      const lastKnownState = previous?.operationalState === 'unconfirmed'
        ? previous.lastKnownState
        : previous?.operationalState;

      if (!lastKnownState) return device;
      return {
        ...device,
        classification: { ...device.classification, lastKnownState },
      };
    }),
  }));
}

export function applySnapshotFreshnessToGroups(groups: ClientGroup[], snapshotObservedAt: string, now = Date.now()) {
  if (getSnapshotFreshness(snapshotObservedAt, now) === 'current') return groups;

  return groups.map(group => ({
    ...group,
    devices: group.devices.map(device => {
      const current = applySnapshotFreshness(device.classification, snapshotObservedAt, now);
      return { ...device, classification: current, status: toLegacyDeviceStatus(current) };
    }),
  }));
}

export function isConfirmedFailureTrigger(description: string) {
  const normalized = description.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return [
    'unavailable by icmp',
    'icmp ping unavailable',
    'host is unreachable',
    'host unreachable',
    'link down',
    'nao responde ao ping',
    'indisponivel por icmp',
  ].some(pattern => normalized.includes(pattern));
}

export function toLegacyDeviceStatus(value: DeviceClassification): DeviceStatus {
  if (value.operationalState === 'confirmed-failure') return 'offline';
  if (value.operationalState === 'warning') return 'warning';
  if (value.operationalState === 'functioning') return 'online';
  return 'unknown';
}

function visibility(
  quality: VisibilityQuality,
  reasonCode: StateEvidence['reasonCode'],
  reasonLabel: string,
  source: StateEvidence['source'],
  observedAt: string
): VisibilityClassification {
  return { quality, evidence: { reasonCode, reasonLabel, source, observedAt } };
}

function classification(
  health: DeviceClassification['health'],
  operationalState: DeviceClassification['operationalState'],
  evidence: StateEvidence,
  visibilityQuality: VisibilityQuality = 'current'
): DeviceClassification {
  return { health, visibility: visibilityQuality, operationalState, evidence };
}

function toIso(value: number) {
  return new Date(value).toISOString();
}
