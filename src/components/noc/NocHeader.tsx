import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart3, Clock, Menu, MonitorUp, RefreshCw, Search, WifiOff, X } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { DisplayMode } from '@/hooks/use-display-mode';
import { cn } from '@/lib/utils';

interface NocHeaderProps {
  lastUpdate: Date;
  isRefreshing: boolean;
  onRefresh: () => void;
  onlineCount: number;
  confirmedCount: number;
  unconfirmedCount: number;
  error: string | null;
  mode: DisplayMode;
  onModeChange: (mode: DisplayMode) => void;
}

const navItems = [
  { label: 'Resumo', to: '/' },
  { label: 'Ocorrências', to: '/ocorrencias' },
  { label: 'Ambientes', to: '/ambientes' },
  { label: 'Inventário', to: '/inventario' },
  { label: 'Infraestrutura', to: '/infraestrutura' },
];

export function NocHeader(props: NocHeaderProps) {
  const { pathname, hash, search: locationSearch } = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState(() => new URLSearchParams(locationSearch).get('busca') ?? '');
  const currentMode = new URLSearchParams(locationSearch).get('mode');

  useEffect(() => setMobileOpen(false), [hash, pathname]);
  useEffect(() => setSearch(new URLSearchParams(locationSearch).get('busca') ?? ''), [locationSearch]);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (currentMode) params.set('mode', currentMode);
    if (search.trim()) params.set('busca', search.trim());
    navigate({ pathname: '/', hash: 'ambientes', search: params.toString() });
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-xl">
      <div className="noc-header-row mx-auto flex w-full max-w-[220rem] items-center gap-3 px-4 sm:px-5 lg:px-7">
        <Link to={navTarget('/', currentMode)} className="flex shrink-0 items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><MonitorUp className="h-4 w-4" /></span>
          <span className="hidden font-semibold tracking-tight text-foreground sm:inline"><span className="text-primary">Bionic</span> NOC</span>
        </Link>

        <nav className="hidden h-full items-center gap-1 lg:flex" aria-label="Navegação principal">
          {navItems.map(item => {
            const active = item.to === '/' ? pathname === '/' : pathname.startsWith(item.to);
            return <Link key={item.label} to={navTarget(item.to, currentMode)} aria-current={active ? 'page' : undefined} className={cn('noc-nav-link', active && 'noc-nav-link-active')}>{item.label}</Link>;
          })}
        </nav>

        <form onSubmit={submitSearch} className="mode-analysis-only relative ml-auto hidden w-full max-w-xs xl:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={event => setSearch(event.target.value)} className="h-9 w-full rounded-lg border border-border bg-surface-elevated/50 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-info focus:ring-1 focus:ring-info/30" placeholder="Cliente, host, IP ou proxy" aria-label="Busca global" />
        </form>

        <div className="hidden items-center gap-3 text-xs xl:flex">
          <StatusDot value={props.confirmedCount} label="falhas" tone="critical" />
          <StatusDot value={props.unconfirmedCount} label="sem confirmação" tone="info" />
          <StatusDot value={props.onlineCount} label="funcionando" tone="success" analysisOnly />
        </div>

        <div className="ml-auto flex items-center gap-2 xl:ml-0">
          <ModeSwitch mode={props.mode} onChange={props.onModeChange} />
          {props.error && <span role="status" aria-label="A coleta falhou; o último snapshot foi preservado" title="A coleta falhou; o último snapshot foi preservado" className="text-info"><WifiOff className="h-4 w-4" /></span>}
          <span className="hidden items-center gap-1.5 text-xs text-muted-foreground 2xl:flex"><Clock className="h-3.5 w-3.5" /><span className="font-mono">{format(props.lastUpdate, 'HH:mm:ss', { locale: ptBR })}</span></span>
          <button type="button" onClick={props.onRefresh} className="noc-icon-button" aria-label={props.isRefreshing ? 'Atualizando dados' : 'Atualizar dados'} aria-busy={props.isRefreshing} title="Atualizar dados"><RefreshCw className={cn('h-4 w-4', props.isRefreshing && 'animate-spin')} /></button>
          <button type="button" onClick={() => setMobileOpen(value => !value)} className="noc-icon-button lg:hidden" aria-controls="noc-mobile-menu" aria-expanded={mobileOpen} aria-label={mobileOpen ? 'Fechar navegação' : 'Abrir navegação'}>{mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}</button>
        </div>
      </div>

      {mobileOpen && (
        <div id="noc-mobile-menu" className="border-t border-border bg-surface px-4 py-3 lg:hidden">
          <form onSubmit={submitSearch} className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={event => setSearch(event.target.value)} className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-info" placeholder="Cliente, host, IP ou proxy" aria-label="Busca global" />
          </form>
          <nav className="grid grid-cols-2 gap-1" aria-label="Navegação móvel">
            {navItems.map(item => {
              const active = item.to === '/' ? pathname === '/' : pathname.startsWith(item.to);
              return <Link key={item.label} to={navTarget(item.to, currentMode)} aria-current={active ? 'page' : undefined} className="rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-surface-elevated hover:text-foreground">{item.label}</Link>;
            })}
          </nav>
        </div>
      )}
    </header>
  );
}

function ModeSwitch({ mode, onChange }: { mode: DisplayMode; onChange: (mode: DisplayMode) => void }) {
  return (
    <div className="hidden items-center rounded-lg border border-border bg-surface p-0.5 sm:flex" aria-label="Modo de exibição">
      <button type="button" onClick={() => onChange('room')} title="Modo Sala" aria-pressed={mode === 'room'} className={cn('noc-mode-button', mode === 'room' && 'noc-mode-button-active')}><MonitorUp className="h-3.5 w-3.5" /><span className="hidden 2xl:inline">Sala</span></button>
      <button type="button" onClick={() => onChange('analysis')} title="Modo Análise" aria-pressed={mode === 'analysis'} className={cn('noc-mode-button', mode === 'analysis' && 'noc-mode-button-active')}><BarChart3 className="h-3.5 w-3.5" /><span className="hidden 2xl:inline">Análise</span></button>
    </div>
  );
}

function StatusDot({ value, label, tone, analysisOnly = false }: { value: number; label: string; tone: 'critical' | 'info' | 'success'; analysisOnly?: boolean }) {
  const toneClass = { critical: 'bg-noc-critical', info: 'bg-info', success: 'bg-noc-ok' }[tone];
  return <span className={cn('flex items-center gap-1.5 whitespace-nowrap text-muted-foreground', analysisOnly && 'mode-analysis-only')}><span className={cn('h-2 w-2 rounded-full', toneClass)} /><strong className="font-mono text-foreground">{value}</strong> {label}</span>;
}

function navTarget(target: string, mode: string | null) {
  return {
    pathname: target,
    hash: '',
    search: mode ? `?mode=${encodeURIComponent(mode)}` : '',
  };
}
