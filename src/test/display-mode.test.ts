import { describe, expect, it } from 'vitest';
import { resolveDisplayMode } from '@/hooks/use-display-mode';

describe('resolução do modo de exibição', () => {
  it('prioriza o parâmetro da URL', () => {
    expect(resolveDisplayMode({ urlMode: 'sala', storedMode: 'analysis', viewportWidth: 1280 })).toBe('room');
    expect(resolveDisplayMode({ urlMode: 'analise', storedMode: 'room', viewportWidth: 3840 })).toBe('analysis');
  });

  it('usa a preferência salva quando a URL não define o modo', () => {
    expect(resolveDisplayMode({ urlMode: null, storedMode: 'analysis', viewportWidth: 3840 })).toBe('analysis');
    expect(resolveDisplayMode({ urlMode: null, storedMode: 'room', viewportWidth: 1280 })).toBe('room');
  });

  it('seleciona Sala automaticamente a partir de 1600 px', () => {
    expect(resolveDisplayMode({ urlMode: null, storedMode: null, viewportWidth: 1599 })).toBe('analysis');
    expect(resolveDisplayMode({ urlMode: null, storedMode: null, viewportWidth: 1600 })).toBe('room');
  });
});
