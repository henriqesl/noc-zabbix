import { useState, useEffect, useCallback } from 'react';
import { fetchNocData } from '@/services/noc-service';
import { getNocSummary } from '@/domain/noc-selectors';
import type { Alert, ClientGroup } from '@/domain/noc';

export function useNocData(refreshInterval = 3000) {
  const [groups, setGroups] = useState<ClientGroup[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const data = await fetchNocData();
      setGroups(data.groups);
      setAlerts(data.alerts);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('[NOC] Failed to fetch data:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, refreshInterval);
    return () => clearInterval(interval);
  }, [refresh, refreshInterval]);

  const {
    allDevices,
    onlineCount,
    offlineCount,
    rawOfflineCount,
    realOfflineDevices,
    devicesOfflineByProxy,
    proxies,
    offlineProxies,
    warningCount,
    totalCount,
  } = getNocSummary(groups);

  return {
    groups,
    alerts,
    allDevices,
    onlineCount,
    offlineCount,
    rawOfflineCount,
    realOfflineDevices,
    devicesOfflineByProxy,
    proxies,
    offlineProxies,
    warningCount,
    totalCount,
    lastUpdate,
    isRefreshing,
    refresh,
  };
}
