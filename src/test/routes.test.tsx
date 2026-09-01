import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { LegacyEnvironmentRedirect, LegacyRedirect } from '@/components/routing/LegacyRedirect';

describe('compatibilidade das rotas legadas', () => {
  it.each([
    ['/alerts?mode=analise', '/ocorrencias?mode=analise'],
    ['/cameras?cliente=10', '/inventario?cliente=10&tipo=camera'],
    ['/infra#proxies', '/infraestrutura#proxies'],
  ])('redireciona %s para %s', async (initial, expected) => {
    renderRoute(initial, initial.startsWith('/alerts')
      ? <LegacyRedirect pathname="/ocorrencias" />
      : initial.startsWith('/cameras')
        ? <LegacyRedirect pathname="/inventario" defaults={{ tipo: 'camera' }} />
        : <LegacyRedirect pathname="/infraestrutura" />);

    expect(await screen.findByTestId('location')).toHaveTextContent(expected);
  });

  it('preserva o identificador ao migrar o detalhe do cliente', async () => {
    render(
      <MemoryRouter initialEntries={['/cliente/42?tipo=camera']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/cliente/:clientId" element={<LegacyEnvironmentRedirect />} />
          <Route path="*" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByTestId('location')).toHaveTextContent('/ambientes/42?tipo=camera');
  });
});

function renderRoute(initial: string, redirect: ReactNode) {
  return render(
    <MemoryRouter initialEntries={[initial]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="*" element={redirect} />
        <Route path="/ocorrencias" element={<LocationProbe />} />
        <Route path="/inventario" element={<LocationProbe />} />
        <Route path="/infraestrutura" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>
  );
}

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}{location.search}{location.hash}</span>;
}
