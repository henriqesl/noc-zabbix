import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export type DisplayMode = 'room' | 'analysis';

const DISPLAY_MODE_STORAGE_KEY = 'noc-vision:display-mode:v1';
const ROOM_MIN_WIDTH = 1600;

export function resolveDisplayMode({
  urlMode,
  storedMode,
  viewportWidth,
}: {
  urlMode: string | null;
  storedMode: string | null;
  viewportWidth: number;
}): DisplayMode {
  return parseDisplayMode(urlMode) ?? parseDisplayMode(storedMode) ?? (viewportWidth >= ROOM_MIN_WIDTH ? 'room' : 'analysis');
}

export function useDisplayMode() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
  const urlMode = searchParams.get('mode');
  const storedMode = readStoredMode();
  const mode = useMemo(
    () => resolveDisplayMode({ urlMode, storedMode, viewportWidth }),
    [storedMode, urlMode, viewportWidth]
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(min-width: ${ROOM_MIN_WIDTH}px)`);
    const updateViewport = () => setViewportWidth(window.innerWidth);
    mediaQuery.addEventListener('change', updateViewport);
    window.addEventListener('resize', updateViewport);
    return () => {
      mediaQuery.removeEventListener('change', updateViewport);
      window.removeEventListener('resize', updateViewport);
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.displayMode = mode;
    return () => {
      delete document.documentElement.dataset.displayMode;
    };
  }, [mode]);

  useEffect(() => {
    const explicitMode = parseDisplayMode(urlMode);
    if (explicitMode) writeStoredMode(explicitMode);
  }, [urlMode]);

  const setMode = useCallback((nextMode: DisplayMode) => {
    writeStoredMode(nextMode);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('mode', nextMode === 'room' ? 'sala' : 'analise');
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  return { mode, setMode };
}

function parseDisplayMode(value: string | null): DisplayMode | null {
  if (value === 'sala' || value === 'room') return 'room';
  if (value === 'analise' || value === 'analysis') return 'analysis';
  return null;
}

function readStoredMode() {
  try {
    return window.localStorage.getItem(DISPLAY_MODE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredMode(mode: DisplayMode) {
  try {
    window.localStorage.setItem(DISPLAY_MODE_STORAGE_KEY, mode);
  } catch {
    // A URL continua sendo a fonte de verdade quando o armazenamento está indisponível.
  }
}
