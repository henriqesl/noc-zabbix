import { fetchHosts, fetchMetrics, fetchProxies, fetchTriggers, type ZabbixProxy } from './zabbix-api';
import type { Alert, ClientGroup, DeviceType } from '@/domain/noc';
import { classifyDevice, classifyProxy, isConfirmedFailureTrigger, toLegacyDeviceStatus } from '@/domain/noc-classifier';
import { getEnvironmentRestriction } from '@/domain/noc-restrictions';

export async function fetchNocData() {
  try {
    const collectedAt = Date.now();
    const [zabbixHosts, zabbixTriggers, zabbixMetrics] = await Promise.all([
      fetchHosts(),
      fetchTriggers(),
      fetchMetrics(['icmppingsec', 'system.uptime']),
    ]);

    let zabbixProxies: ZabbixProxy[] = [];
    let proxyDataAvailable = true;
    try {
      zabbixProxies = await fetchProxies();
    } catch (proxyError) {
      proxyDataAvailable = false;
      console.warn('[NOC Service] Falha ao procurar proxies.', proxyError);
    }

    const metricsMap = new Map<string, { latency?: string; uptime?: string }>();
    zabbixMetrics?.forEach(item => {
      if (!metricsMap.has(item.hostid)) {
        metricsMap.set(item.hostid, {});
      }

      const hostMetrics = metricsMap.get(item.hostid)!;

      if (item.key_ === 'icmppingsec') {
        const ms = (parseFloat(item.lastvalue) * 1000).toFixed(0);
        hostMetrics.latency = `${ms}ms`;
      } else if (item.key_ === 'system.uptime') {
        const seconds = parseInt(item.lastvalue, 10);
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        hostMetrics.uptime = days > 0 ? `${days}d ${hours}h` : `${hours}h`;
      }
    });

    const currentTime = Math.floor(collectedAt / 1000);
    const proxyStatusMap = new Map<string, { name: string; lastAccess: number }>();

    zabbixProxies.forEach(proxy => {
      const lastAccess = Number(proxy.lastaccess);
      if (lastAccess === 0 || String(proxy.status) === '3') return;

      const cleanName = formatProxyName(proxy.name || proxy.host || 'Proxy Zabbix');
      proxyStatusMap.set(proxy.proxyid, {
        name: cleanName ? `${cleanName} - Proxy` : 'Zabbix - Proxy',
        lastAccess,
      });
    });

    const problemsByHost = new Map<string, { confirmedFailure: boolean; active: boolean; observedAt: number }>();

    const alerts: Alert[] = zabbixTriggers.map(trigger => {
      const priority = Number(trigger.priority);
      const isCritical = priority >= 4;
      const host = trigger.hosts?.[0];
      const hostName = host?.name || host?.host || 'Desconhecido';
      const groupName = trigger.groups?.[0]?.name || 'Desconhecido';

      if (host?.hostid) {
        const observedAt = Number(trigger.lastchange) * 1000;
        const current = problemsByHost.get(host.hostid) ?? { confirmedFailure: false, active: false, observedAt: 0 };
        problemsByHost.set(host.hostid, {
          confirmedFailure: current.confirmedFailure || isConfirmedFailureTrigger(trigger.description),
          active: true,
          observedAt: Math.max(current.observedAt, observedAt),
        });
      }

      return {
        id: trigger.triggerid,
        hostId: host?.hostid,
        severity: isCritical ? 'critical' : 'warning',
        message: trigger.description,
        timestamp: new Date(Number(trigger.lastchange) * 1000).toISOString(),
        device: hostName,
        group: groupName,
      };
    });

    const groupsMap = new Map<string, ClientGroup>();

    zabbixHosts.forEach(host => {
      const hostName = host.name || host.host;
      const hostNameLower = hostName.toLowerCase();

      if (hostNameLower.includes('proxy')) return;

      const zabbixGroup = host.groups?.[0] || { groupid: 'unknown', name: 'Outros' };
      const restriction = getEnvironmentRestriction(zabbixGroup.name);

      if (!groupsMap.has(zabbixGroup.groupid)) {
        groupsMap.set(zabbixGroup.groupid, {
          id: zabbixGroup.groupid,
          name: zabbixGroup.name,
          devices: [],
          restriction,
        });
      }

      const hostProxyId = host.proxyid || host.proxy_hostid;
      const hostProxy = hostProxyId ? proxyStatusMap.get(hostProxyId) : undefined;
      const hostProblems = problemsByHost.get(host.hostid);
      const classification = classifyDevice({
        available: host.available,
        hasConfirmedFailure: Boolean(hostProblems?.confirmedFailure),
        hasActiveProblem: Boolean(hostProblems?.active),
        collectedAt,
        problemObservedAt: hostProblems?.observedAt,
        proxyId: hostProxyId,
        proxyLastAccess: hostProxy?.lastAccess,
        proxyDataAvailable: !hostProxyId || (proxyDataAvailable && Boolean(hostProxy)),
        restriction,
      });
      const deviceStatus = toLegacyDeviceStatus(classification);
      const offlineReason = classification.operationalState === 'confirmed-failure'
        ? 'host'
        : classification.evidence.source === 'proxy' || classification.evidence.source === 'restriction'
          ? 'proxy'
          : classification.operationalState === 'unconfirmed'
            ? 'unknown'
            : undefined;

      const groupNameLower = zabbixGroup.name.toLowerCase();
      const deviceType = detectDeviceType(hostNameLower, groupNameLower);
      const hostMetrics = metricsMap.get(host.hostid) || {};

      groupsMap.get(zabbixGroup.groupid)!.devices.push({
        id: host.hostid,
        name: hostName,
        ip: host.host,
        status: deviceStatus,
        classification,
        offlineReason,
        proxyId: hostProxyId,
        proxyName: hostProxy?.name,
        group: zabbixGroup.name,
        type: deviceType,
        latency: hostMetrics.latency,
        uptime: hostMetrics.uptime,
        restriction,
      });
    });

    if (zabbixProxies.length > 0) {
      const proxyGroupId = 'native-proxies-group';

      zabbixProxies.forEach(proxy => {
        const lastAccess = Number(proxy.lastaccess);
        if (lastAccess === 0 || String(proxy.status) === '3') return;

        const cleanName = formatProxyName(proxy.name || proxy.host || 'Proxy Zabbix');
        if (cleanName.toLowerCase().includes('gestamp')) return;

        const finalProxyName = cleanName ? `${cleanName} - Proxy` : 'Zabbix - Proxy';
        const classification = classifyProxy(lastAccess, collectedAt);
        const proxyStatus = toLegacyDeviceStatus(classification);
        const isOffline = classification.operationalState === 'confirmed-failure';
        const secondsSinceAccess = currentTime - lastAccess;
        const lastSeen = secondsSinceAccess < 60 ? 'Agora' : `${Math.floor(secondsSinceAccess / 60)}m atras`;

        if (!groupsMap.has(proxyGroupId)) {
          groupsMap.set(proxyGroupId, { id: proxyGroupId, name: '[BASE] Zabbix Proxies', devices: [] });
        }

        groupsMap.get(proxyGroupId)!.devices.push({
          id: `proxy-${proxy.proxyid}`,
          name: finalProxyName,
          ip: 'API Nativa',
          status: proxyStatus,
          classification,
          isProxy: true,
          proxyId: proxy.proxyid,
          offlineReason: proxyStatus === 'offline' ? 'host' : undefined,
          group: '[BASE] Zabbix Proxies',
          type: 'server',
          latency: proxyStatus === 'online' ? lastSeen : undefined,
          offlineSince: isOffline && lastAccess > 0 ? lastAccess * 1000 : undefined,
        });
      });
    }

    groupsMap.forEach(group => {
      group.devices.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
      );
    });

    const sortedGroups = Array.from(groupsMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    );

    return {
      groups: sortedGroups,
      alerts,
      snapshot: { collectedAt: new Date(collectedAt).toISOString(), freshness: 'current' as const },
    };
  } catch (error) {
    console.error('[NOC Service] Erro ao mapear dados:', error);
    throw error;
  }
}

function detectDeviceType(hostName: string, groupName: string): DeviceType {
  if (hostName.includes('cam') || groupName.includes('cam')) return 'camera';
  if (
    hostName.includes('rot') ||
    hostName.includes('rout') ||
    hostName.includes('mikrotik') ||
    groupName.includes('link') ||
    groupName.includes('rede')
  ) return 'router';
  if (hostName.includes('sw') || groupName.includes('sw')) return 'switch';
  if (hostName.includes('fire')) return 'firewall';

  return 'server';
}

function formatProxyName(name: string) {
  return name
    .replace(/^(zabbix_proxy_|zabbix_proxy|proxy_zabbix_|proxy_)/gi, '')
    .replace(/_/g, ' ')
    .trim()
    .replace(/\b\w/g, letter => letter.toUpperCase());
}
