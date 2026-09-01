import type { NocData } from '@/domain/noc';

const SNAPSHOT_CACHE_KEY = 'noc-vision:last-successful-snapshot:v1';

export function readNocSnapshot(storage = getBrowserStorage()): NocData | null {
  if (!storage) return null;

  try {
    const value = storage.getItem(SNAPSHOT_CACHE_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as Partial<NocData>;

    if (!Array.isArray(parsed.groups) || !Array.isArray(parsed.alerts) || !parsed.snapshot?.collectedAt) {
      return null;
    }

    return parsed as NocData;
  } catch {
    return null;
  }
}

export function writeNocSnapshot(data: NocData, storage = getBrowserStorage()) {
  if (!storage) return false;

  try {
    storage.setItem(SNAPSHOT_CACHE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

function getBrowserStorage() {
  return typeof window === 'undefined' ? null : window.localStorage;
}
