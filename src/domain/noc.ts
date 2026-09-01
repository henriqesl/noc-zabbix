export type DeviceStatus = 'online' | 'offline' | 'warning' | 'unknown';
export type AlertSeverity = 'critical' | 'warning' | 'info';
export type DeviceType = 'server' | 'camera' | 'switch' | 'router' | 'firewall';

export type EquipmentHealth = 'healthy' | 'warning' | 'failed' | 'unknown';
export type VisibilityQuality = 'current' | 'delayed' | 'limited' | 'lost';
export type OperationalState = 'functioning' | 'warning' | 'confirmed-failure' | 'unconfirmed';
export type EvidenceSource = 'host' | 'trigger' | 'proxy' | 'restriction' | 'snapshot';
export type SnapshotFreshness = 'current' | 'delayed' | 'expired';

export type StateReasonCode =
  | 'HOST_RESPONDING'
  | 'HOST_UNAVAILABLE'
  | 'CRITICAL_TRIGGER'
  | 'ACTIVE_WARNING'
  | 'AVAILABILITY_UNKNOWN'
  | 'PROXY_NO_CONTACT'
  | 'PROXY_STATE_UNKNOWN'
  | 'KNOWN_RESTRICTION'
  | 'SNAPSHOT_DELAYED'
  | 'SNAPSHOT_EXPIRED';

export interface StateEvidence {
  reasonCode: StateReasonCode;
  reasonLabel: string;
  source: EvidenceSource;
  observedAt: string;
}

export interface DeviceClassification {
  health: EquipmentHealth;
  visibility: VisibilityQuality;
  operationalState: OperationalState;
  evidence: StateEvidence;
  lastKnownState?: Exclude<OperationalState, 'unconfirmed'>;
}

export interface EnvironmentRestriction {
  id: string;
  label: string;
  note: string;
  active: boolean;
}

export interface SnapshotMetadata {
  collectedAt: string;
  freshness: SnapshotFreshness;
}

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  group: string;
  status: DeviceStatus;
  classification: DeviceClassification;
  ip: string;
  isProxy?: boolean;
  proxyId?: string;
  proxyName?: string;
  offlineReason?: 'host' | 'proxy' | 'unknown';
  latency?: string;
  uptime?: string;
  cpu?: number;
  memory?: number;
  disk?: number;
  lastSeen?: string;
  offlineSince?: string | number;
  restriction?: EnvironmentRestriction;
}

export interface Alert {
  id: string;
  hostId?: string;
  device: string;
  group: string;
  message: string;
  severity: AlertSeverity;
  timestamp: string;
  acknowledged?: boolean;
}

export interface ClientGroup {
  id: string;
  name: string;
  devices: Device[];
  restriction?: EnvironmentRestriction;
}

export interface NocData {
  groups: ClientGroup[];
  alerts: Alert[];
  snapshot: SnapshotMetadata;
}

export type GroupHealthStatus = 'healthy' | 'warning' | 'critical' | 'degraded' | 'empty';

export interface GroupHealth {
  online: number;
  offline: number;
  warning: number;
  unknown: number;
  total: number;
  healthPct: number;
  status: GroupHealthStatus;
}

export const ACTIVE_GROUP_MARKERS = ['[BASE]', '[CLIENTE]'] as const;
