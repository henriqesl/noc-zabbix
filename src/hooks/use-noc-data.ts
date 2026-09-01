import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchNocData } from '@/services/noc-service';
import { readNocSnapshot, writeNocSnapshot } from '@/services/noc-snapshot-cache';
import { getNocSummary } from '@/domain/noc-selectors';
import {
  applySnapshotFreshnessToGroups,
  carryForwardLastKnownStates,
  getSnapshotFreshness,
} from '@/domain/noc-classifier';
import type { NocData } from '@/domain/noc';

export function useNocData(refreshInterval = 30_000) {
  const [data, setData] = useState<NocData | null>(() => readNocSnapshot());
  const [now, setNow] = useState(Date.now());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(() => data === null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const next = await fetchNocData();
      setData(previous => {
        const normalized: NocData = {
          ...next,
          groups: carryForwardLastKnownStates(next.groups, previous?.groups ?? []),
        };
        writeNocSnapshot(normalized);
        return normalized;
      });
      setError(null);
    } catch (refreshError) {
      console.error('[NOC] Failed to fetch data:', refreshError);
      setError(refreshError instanceof Error ? refreshError.message : 'Não foi possível consultar o Zabbix');
    } finally {
      setNow(Date.now());
      setIsRefreshing(false);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, refreshInterval);
    return () => clearInterval(interval);
  }, [refresh, refreshInterval]);

  useEffect(() => {
    const clock = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(clock);
  }, []);

  const snapshotFreshness = data ? getSnapshotFreshness(data.snapshot.collectedAt, now) : 'expired';
  const groups = useMemo(
    () => data ? applySnapshotFreshnessToGroups(data.groups, data.snapshot.collectedAt, now) : [],
    [data, now]
  );
  const alerts = data?.alerts ?? [];
  const lastUpdate = new Date(data?.snapshot.collectedAt ?? now);
  const summary = getNocSummary(groups);

  return {
    groups,
    alerts,
    ...summary,
    snapshot: data ? { ...data.snapshot, freshness: snapshotFreshness } : null,
    snapshotFreshness,
    lastUpdate,
    isRefreshing,
    isLoading,
    error,
    refresh,
  };
}
