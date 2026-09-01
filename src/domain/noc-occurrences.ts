import type { Alert, ClientGroup, Device, NocOccurrence, OccurrenceKind } from './noc';
import { isConfirmedFailureTrigger } from './noc-classifier';
import { cleanGroupName, getOperationalState, isActiveNocGroup, parseAlertTime } from './noc-selectors';

export interface OccurrenceCounts {
  all: number;
  failure: number;
  alert: number;
  visibility: number;
}

export function buildNocOccurrences(groups: ClientGroup[], alerts: Alert[]): NocOccurrence[] {
  const activeGroups = groups.filter(isActiveNocGroup);
  const groupByName = new Map(activeGroups.map(group => [group.name, group]));
  const devices = activeGroups.flatMap(group => group.devices);
  const deviceById = new Map(devices.map(device => [device.id, device]));
  const mergedAlertIds = new Set<string>();
  const occurrences: NocOccurrence[] = [];

  devices.forEach(device => {
    const state = getOperationalState(device);
    if (state !== 'confirmed-failure') return;

    const relatedAlerts = alerts.filter(alert =>
      alert.hostId === device.id && isConfirmedFailureTrigger(alert.message)
    );
    relatedAlerts.forEach(alert => mergedAlertIds.add(alert.id));
    const group = groupByName.get(device.group);
    occurrences.push({
      id: `failure:${device.id}`,
      kind: 'failure',
      severity: 'critical',
      title: device.classification.evidence.reasonLabel,
      environmentId: group?.id,
      environmentName: cleanGroupName(device.group),
      operationalState: 'confirmed-failure',
      visibility: device.classification.visibility,
      evidence: device.classification.evidence,
      affectedDevices: [device],
      relatedAlerts,
      proxyName: device.proxyName,
      acknowledged: getAcknowledgementState(relatedAlerts),
    });
  });

  occurrences.push(...buildVisibilityOccurrences(activeGroups));

  alerts.forEach(alert => {
    if (mergedAlertIds.has(alert.id)) return;
    const device = alert.hostId ? deviceById.get(alert.hostId) : undefined;
    const group = groupByName.get(alert.group);
    const observedAt = normalizeObservedAt(alert.timestamp, device?.classification.evidence.observedAt);

    occurrences.push({
      id: `alert:${alert.id}`,
      kind: 'alert',
      severity: alert.severity,
      title: alert.message,
      environmentId: group?.id,
      environmentName: cleanGroupName(alert.group),
      operationalState: 'warning',
      visibility: device?.classification.visibility ?? 'current',
      evidence: {
        reasonCode: 'ACTIVE_WARNING',
        reasonLabel: device?.classification.operationalState === 'unconfirmed'
          ? 'O alerta existe, mas o estado atual do equipamento não pôde ser confirmado.'
          : 'O Zabbix registrou um problema ativo para este equipamento.',
        source: 'trigger',
        observedAt,
      },
      affectedDevices: device ? [device] : [],
      relatedAlerts: [alert],
      proxyName: device?.proxyName,
      acknowledged: alert.acknowledged,
    });
  });

  devices.forEach(device => {
    if (getOperationalState(device) !== 'warning') return;
    if (alerts.some(alert => alert.hostId === device.id)) return;
    const group = groupByName.get(device.group);
    occurrences.push({
      id: `warning:${device.id}`,
      kind: 'alert',
      severity: 'warning',
      title: device.classification.evidence.reasonLabel,
      environmentId: group?.id,
      environmentName: cleanGroupName(device.group),
      operationalState: 'warning',
      visibility: device.classification.visibility,
      evidence: device.classification.evidence,
      affectedDevices: [device],
      relatedAlerts: [],
      proxyName: device.proxyName,
      acknowledged: undefined,
    });
  });

  return occurrences.sort(compareOccurrences);
}

export function getOccurrenceCounts(occurrences: NocOccurrence[]): OccurrenceCounts {
  return {
    all: occurrences.length,
    failure: occurrences.filter(item => item.kind === 'failure').length,
    alert: occurrences.filter(item => item.kind === 'alert').length,
    visibility: occurrences.filter(item => item.kind === 'visibility').length,
  };
}

function buildVisibilityOccurrences(groups: ClientGroup[]) {
  const occurrences: NocOccurrence[] = [];

  groups.forEach(group => {
    const buckets = new Map<string, Device[]>();
    group.devices
      .filter(device => getOperationalState(device) === 'unconfirmed')
      .forEach(device => {
        const key = [
          device.classification.evidence.reasonCode,
          device.classification.evidence.source,
          device.proxyId ?? '',
          device.restriction?.id ?? '',
        ].join(':');
        const bucket = buckets.get(key) ?? [];
        bucket.push(device);
        buckets.set(key, bucket);
      });

    buckets.forEach((affectedDevices, key) => {
      const representative = affectedDevices[0];
      const observedAt = earliestObservedAt(affectedDevices);
      occurrences.push({
        id: `visibility:${group.id}:${key}`,
        kind: 'visibility',
        severity: 'info',
        title: affectedDevices.length === 1
          ? 'Estado do equipamento não confirmado'
          : `Estado de ${affectedDevices.length} equipamentos não confirmado`,
        environmentId: group.id,
        environmentName: cleanGroupName(group.name),
        operationalState: 'unconfirmed',
        visibility: representative.classification.visibility,
        evidence: { ...representative.classification.evidence, observedAt },
        affectedDevices,
        relatedAlerts: [],
        proxyName: representative.proxyName,
        acknowledged: undefined,
      });
    });
  });

  return occurrences;
}

function compareOccurrences(a: NocOccurrence, b: NocOccurrence) {
  return (
    occurrenceRank(b.kind) - occurrenceRank(a.kind) ||
    severityRank(b.severity) - severityRank(a.severity) ||
    occurrenceTime(a) - occurrenceTime(b) ||
    a.environmentName.localeCompare(b.environmentName, undefined, { numeric: true, sensitivity: 'base' })
  );
}

function occurrenceRank(kind: OccurrenceKind) {
  return { failure: 3, alert: 2, visibility: 1 }[kind];
}

function severityRank(severity: NocOccurrence['severity']) {
  return { critical: 3, warning: 2, info: 1 }[severity];
}

function occurrenceTime(occurrence: NocOccurrence) {
  const parsed = parseAlertTime(occurrence.evidence.observedAt);
  return parsed > 0 ? parsed : Number.MAX_SAFE_INTEGER;
}

function earliestObservedAt(devices: Device[]) {
  const timestamps = devices
    .map(device => parseAlertTime(device.classification.evidence.observedAt))
    .filter(timestamp => timestamp > 0);
  if (!timestamps.length) return devices[0].classification.evidence.observedAt;
  return new Date(Math.min(...timestamps)).toISOString();
}

function normalizeObservedAt(value: string, fallback?: string) {
  const parsed = parseAlertTime(value);
  if (parsed > 0) return new Date(parsed).toISOString();
  return fallback ?? value;
}

function getAcknowledgementState(alerts: Alert[]) {
  if (!alerts.length || alerts.some(alert => alert.acknowledged === undefined)) return undefined;
  return alerts.every(alert => alert.acknowledged);
}
