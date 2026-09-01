import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { NocLayout } from '@/components/noc/NocLayout';
import { LegacyEnvironmentRedirect, LegacyRedirect } from '@/components/routing/LegacyRedirect';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import AlertsPage from './pages/AlertsPage';
import InventoryPage from './pages/InventoryPage';
import ClientDetailPage from './pages/ClientDetailPage';
import EnvironmentsPage from './pages/EnvironmentsPage';
import InfraPage from './pages/InfraPage';
import NotFound from './pages/NotFound';
import OverviewPage from './pages/OverviewPage';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<NocLayout />}>
            <Route path="/" element={<OverviewPage />} />
            <Route path="/ocorrencias" element={<AlertsPage />} />
            <Route path="/ambientes" element={<EnvironmentsPage />} />
            <Route path="/ambientes/:clientId" element={<ClientDetailPage />} />
            <Route path="/inventario" element={<InventoryPage />} />
            <Route path="/infraestrutura" element={<InfraPage />} />
            <Route path="/alerts" element={<LegacyRedirect pathname="/ocorrencias" />} />
            <Route path="/cameras" element={<LegacyRedirect pathname="/inventario" defaults={{ tipo: 'camera' }} />} />
            <Route path="/cliente/:clientId" element={<LegacyEnvironmentRedirect />} />
            <Route path="/infra" element={<LegacyRedirect pathname="/infraestrutura" />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
