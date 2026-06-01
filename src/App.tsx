import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { NocLayout } from '@/components/noc/NocLayout';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import AlertsPage from './pages/AlertsPage';
import CamerasPage from './pages/CamerasPage';
import ClientDetailPage from './pages/ClientDetailPage';
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
            <Route path="/cliente/:clientId" element={<ClientDetailPage />} />
            <Route path="/infra" element={<InfraPage />} />
            <Route path="/cameras" element={<CamerasPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
