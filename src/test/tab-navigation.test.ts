import { describe, expect, it } from 'vitest';
import { getKeyboardTab } from '@/lib/tab-navigation';

const tabs = ['all', 'failure', 'alert', 'visibility'] as const;

describe('navegação de abas por teclado', () => {
  it('avança, retorna e circula entre as abas', () => {
    expect(getKeyboardTab('all', tabs, 'ArrowRight')).toBe('failure');
    expect(getKeyboardTab('all', tabs, 'ArrowLeft')).toBe('visibility');
    expect(getKeyboardTab('visibility', tabs, 'ArrowRight')).toBe('all');
  });

  it('suporta início, fim e ignora teclas comuns', () => {
    expect(getKeyboardTab('alert', tabs, 'Home')).toBe('all');
    expect(getKeyboardTab('alert', tabs, 'End')).toBe('visibility');
    expect(getKeyboardTab('alert', tabs, 'Enter')).toBeNull();
  });
});
