import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NocData } from '@/domain/noc';
import { useNocData } from '@/hooks/use-noc-data';
import { fetchNocData } from '@/services/noc-service';
import { writeNocSnapshot } from '@/services/noc-snapshot-cache';

vi.mock('@/services/noc-service', () => ({
  fetchNocData: vi.fn(),
}));

const collectedAt = new Date(Date.now() - 10_000).toISOString();

const cachedSnapshot: NocData = {
  groups: [{
    id: 'group-1',
    name: 'Cliente preservado',
    devices: [{
      id: 'host-1',
      name: 'Host preservado',
      type: 'server',
      group: 'Cliente preservado',
      status: 'online',
      ip: '10.0.0.1',
      classification: {
        health: 'healthy',
        visibility: 'current',
        operationalState: 'functioning',
        evidence: {
          reasonCode: 'HOST_RESPONDING',
          reasonLabel: 'O equipamento está respondendo ao Zabbix.',
          source: 'host',
          observedAt: collectedAt,
        },
      },
    }],
  }],
  alerts: [],
  snapshot: { collectedAt, freshness: 'current' },
};

describe('useNocData em falhas temporárias', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.mocked(fetchNocData).mockReset();
  });

  it('8. mantém o último snapshot quando a API fica temporariamente indisponível', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    writeNocSnapshot(cachedSnapshot);
    vi.mocked(fetchNocData).mockRejectedValue(new Error('API indisponível'));

    const { result } = renderHook(() => useNocData(60_000));

    await waitFor(() => expect(result.current.error).toBe('API indisponível'));
    expect(result.current.groups[0].name).toBe('Cliente preservado');
    expect(result.current.allDevices[0].classification.operationalState).toBe('functioning');
    expect(result.current.isLoading).toBe(false);
    expect(consoleError).toHaveBeenCalledOnce();
    consoleError.mockRestore();
  });
});
