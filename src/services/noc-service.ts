import { fetchHosts, fetchMetrics, fetchProxies, fetchTriggers, type ZabbixProxy } from './zabbix-api';
import type { Alert, ClientGroup, DeviceStatus, DeviceType } from '@/domain/noc';

export async function fetchNocData() {
  try {
    const [zabbixHosts, zabbixTriggers, zabbixMetrics] = await Promise.all([
      fetchHosts(),
      fetchTriggers(),
      fetchMetrics(['icmppingsec', 'system.uptime']),
    ]);

    let zabbixProxies: ZabbixProxy[] = [];
    try {
      zabbixProxies = await fetchProxies();
    } catch (proxyError) {
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

    const currentTime = Math.floor(Date.now() / 1000);
    const proxyStatusMap = new Map<string, { name: string; status: DeviceStatus; offlineSince?: number }>();

    zabbixProxies.forEach(proxy => {
      const lastAccess = Number(proxy.lastaccess);
      if (lastAccess === 0 || String(proxy.status) === '3') return;

      const cleanName = formatProxyName(proxy.name || proxy.host || 'Proxy Zabbix');
      const status: DeviceStatus = currentTime - lastAccess > 180 ? 'offline' : 'online';

      proxyStatusMap.set(proxy.proxyid, {
        name: cleanName ? `${cleanName} - Proxy` : 'Zabbix - Proxy',
        status,
        offlineSince: status === 'offline' && lastAccess > 0 ? lastAccess * 1000 : undefined,
      });
    });

    const criticalHostIds = new Set<string>();

    const alerts: Alert[] = zabbixTriggers.map(trigger => {
      const priority = Number(trigger.priority);
      const isCritical = priority >= 4;
      const host = trigger.hosts?.[0];
      const hostName = host?.name || host?.host || 'Desconhecido';
      const groupName = trigger.groups?.[0]?.name || 'Desconhecido';

      if (isCritical && host?.hostid) {
        criticalHostIds.add(host.hostid);
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

      if (!groupsMap.has(zabbixGroup.groupid)) {
        groupsMap.set(zabbixGroup.groupid, {
          id: zabbixGroup.groupid,
          name: zabbixGroup.name,
          devices: [],
        });
      }

      const agentAvailable = host.available === '1';
      const hasCriticalProblem = criticalHostIds.has(host.hostid);
      const hostProxyId = host.proxyid || host.proxy_hostid;
      const hostProxy = hostProxyId ? proxyStatusMap.get(hostProxyId) : undefined;
      const isBehindOfflineProxy = hostProxy?.status === 'offline';

      let deviceStatus: DeviceStatus = 'online';
      let offlineReason: 'host' | 'proxy' | 'unknown' | undefined;

      if (hostNameLower.includes('zabbix server') || hostNameLower.includes('amazon zabbix')) {
        deviceStatus = 'online';
      } else if (isBehindOfflineProxy) {
        deviceStatus = 'offline';
      } else if (hasCriticalProblem) {
        deviceStatus = 'offline';
      } else if (agentAvailable || host.available === '0') {
        deviceStatus = 'online';
      } else if (host.available === '2') {
        deviceStatus = 'offline';
      }

      if (deviceStatus === 'offline') {
        offlineReason = isBehindOfflineProxy ? 'proxy' : hasCriticalProblem ? 'host' : 'unknown';
      }

      const groupNameLower = zabbixGroup.name.toLowerCase();
      const deviceType = detectDeviceType(hostNameLower, groupNameLower);
      const hostMetrics = metricsMap.get(host.hostid) || {};

      groupsMap.get(zabbixGroup.groupid)!.devices.push({
        id: host.hostid,
        name: hostName,
        ip: host.host,
        status: deviceStatus,
        offlineReason,
        proxyId: hostProxyId,
        proxyName: hostProxy?.name,
        group: zabbixGroup.name,
        type: deviceType,
        latency: hostMetrics.latency,
        uptime: hostMetrics.uptime,
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
        const isOffline = currentTime - lastAccess > 180;
        const proxyStatus: DeviceStatus = isOffline ? 'offline' : 'online';
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

    return { groups: sortedGroups, alerts };
  } catch (error) {
    console.error('[NOC Service] Erro ao mapear dados:', error);
    return { groups: [], alerts: [] };
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
