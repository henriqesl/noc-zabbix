import {
  Activity,
  AlertTriangle,
  Camera,
  LayoutDashboard,
  Server,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

const navItems = [
  { title: 'Resumo', description: 'Situação atual', url: '/', icon: LayoutDashboard },
  { title: 'Infraestrutura', description: 'Servidores e rede', url: '/infra', icon: Server },
  { title: 'Câmeras', description: 'Inventário e estado', url: '/cameras', icon: Camera },
  { title: 'Alertas', description: 'Eventos do Zabbix', url: '/alerts', icon: AlertTriangle },
];

export function NocSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarContent>
        <div className={`border-b border-sidebar-border p-5 ${collapsed ? 'px-2' : ''}`}>
          <div className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            {!collapsed && (
              <div>
                <span className="text-lg font-bold tracking-tight text-foreground"><span className="text-primary">Bionic </span>NOC</span>
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Central de operação</p>
              </div>
            )}
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(item => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === '/'}
                      className="h-auto min-h-14 rounded-lg px-3 py-2.5 hover:bg-accent/50"
                      activeClassName="bg-primary/10 text-primary font-semibold"
                    >
                      <item.icon className="mr-2 h-5 w-5" />
                      {!collapsed && <span className="flex flex-col"><span>{item.title}</span><span className="text-[10px] font-normal text-muted-foreground">{item.description}</span></span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {!collapsed && (
          <div className="mt-auto border-t border-sidebar-border p-4">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Como interpretar</p>
            <div className="space-y-2 text-xs text-muted-foreground">
              <Legend color="bg-noc-critical" label="Falha confirmada" />
              <Legend color="bg-noc-warning" label="Alerta" />
              <Legend color="bg-info" label="Estado não confirmado" />
              <Legend color="bg-noc-ok" label="Funcionando" />
            </div>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return <div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${color}`} /><span>{label}</span></div>;
}
