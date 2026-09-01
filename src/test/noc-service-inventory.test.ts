import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchNocData } from '@/services/noc-service';
import { fetchHosts, fetchMetrics, fetchProxies, fetchTriggers } from '@/services/zabbix-api';

vi.mock('@/services/zabbix-api', () => ({
  fetchHosts: vi.fn(),
  fetchMetrics: vi.fn(),
  fetchProxies: vi.fn(),
  fetchTriggers: vi.fn(),
}));

describe('tipagem do inventário na integração Zabbix', () => {
  beforeEach(() => {
    vi.mocked(fetchTriggers).mockResolvedValue([]);
    vi.mocked(fetchMetrics).mockResolvedValue([]);
    vi.mocked(fetchProxies).mockResolvedValue([]);
  });

  it('preserva os tipos inferidos ao transformar hosts', async () => {
    vi.mocked(fetchHosts).mockResolvedValue([
      host('1', 'Câmera recepção'),
      host('2', 'NVR Intelbras 01'),
      host('3', 'Storage QNAP'),
      host('4', 'SW-CORE-01', '[CLIENTE] Rede'),
    ]);

    const data = await fetchNocData();
    expect(data.groups.flatMap(group => group.devices).map(device => [device.name, device.type])).toEqual([
      ['Câmera recepção', 'camera'],
      ['NVR Intelbras 01', 'recorder'],
      ['Storage QNAP', 'storage'],
      ['SW-CORE-01', 'switch'],
    ]);
  });
});

function host(hostid: string, name: string, groupName = '[CLIENTE] Exemplo') {
  return {
    hostid,
    host: `10.0.0.${hostid}`,
    name,
    status: '0',
    available: '1',
    groups: [{ groupid: groupName, name: groupName }],
  };
}
