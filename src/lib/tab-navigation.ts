export type TabNavigationKey = 'ArrowLeft' | 'ArrowRight' | 'Home' | 'End';

export function getKeyboardTab<T extends string>(current: T, tabs: readonly T[], key: string): T | null {
  if (!isTabNavigationKey(key) || tabs.length === 0) return null;
  if (key === 'Home') return tabs[0];
  if (key === 'End') return tabs[tabs.length - 1];

  const currentIndex = Math.max(0, tabs.indexOf(current));
  const direction = key === 'ArrowRight' ? 1 : -1;
  return tabs[(currentIndex + direction + tabs.length) % tabs.length];
}

function isTabNavigationKey(key: string): key is TabNavigationKey {
  return ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key);
}
