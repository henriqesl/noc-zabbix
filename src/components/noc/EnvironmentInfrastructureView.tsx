import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock3, EyeOff, Network, Server } from 'lucide-react';
import type { EnvironmentRestriction, SnapshotMetadata } from '@/domain/noc';
import type { EnvironmentInfrastructure } from '@/domain/noc-environments';
import { getOperationalState } from '@/domain/noc-selectors';
import { OperationalStateBadge } from './OperationalStateBadge';

const freshnessLabels: Record<SnapshotMetadata['freshness'], string> = {
  current: 'Coleta atual',
  delayed: 'Coleta atrasada',
  expired: 'Coleta vencida',
};

export function EnvironmentInfrastructureView({
  infrastructure,
  snapshot,
  error,
  restriction,
}: {
  infrastructure: EnvironmentInfrastructure;
  snapshot: SnapshotMetadata | null;
  error: string | null;
  restriction?: EnvironmentRestriction;
}) {
  const collectedAt = snapshot ? Date.parse(snapshot.collectedAt) : 0;
  return (
    <div className="space-y-6">
      <section className="space-y-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Coleta</p><h2 className="mt-1 text-xl font-semibold text-foreground">Confiança da infraestrutura</h2></div><div className="grid overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3 sm:gap-px"><InfrastructureValue icon={Clock3} label="Situação" value={error ? 'Atualização indisponível' : snapshot ? freshnessLabels[snapshot.freshness] : 'Sem snapshot'} tone={error || snapshot?.freshness !== 'current' ? 'info' : 'ok'} /><InfrastructureValue icon={Clock3} label="Última coleta" value={collectedAt > 0 ? formatDistanceToNow(collectedAt, { addSuffix: true, locale: ptBR }) : 'Horário não informado'} detail={collectedAt > 0 ? format(collectedAt, "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR }) : undefined} /><InfrastructureValue icon={EyeOff} label="Restrição conhecida" value={restriction?.label ?? 'Nenhuma registrada'} tone={restriction ? 'info' : 'default'} /></div></section>

      <section className="space-y-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Comunicação</p><h2 className="mt-1 text-xl font-semibold text-foreground">Proxies associados</h2></div>{infrastructure.proxies.length > 0 ? <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card/40">{infrastructure.proxies.map(association => <div key={association.id} className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(14rem,1fr)_14rem_11rem] sm:items-center"><div><p className="font-medium text-foreground">{association.name}</p><p className="font-mono text-xs text-muted-foreground">ID {association.id}</p></div>{association.proxy ? <OperationalStateBadge state={getOperationalState(association.proxy)} /> : <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-info"><EyeOff className="h-3.5 w-3.5" />Estado não informado</span>}<p className="text-xs text-muted-foreground">{association.affectedDevices} {association.affectedDevices === 1 ? 'host associado' : 'hosts associados'}</p></div>)}</div> : <EmptyInfrastructure text="Nenhum proxy foi associado aos equipamentos retornados pelo Zabbix." />}</section>

      <section className="grid gap-5 xl:grid-cols-2"><InfrastructureDeviceList title="Servidores" icon={Server} devices={infrastructure.servers} empty="Nenhum servidor retornado para este ambiente." /><InfrastructureDeviceList title="Rede" icon={Network} devices={infrastructure.networkDevices} empty="Nenhum roteador, switch ou firewall retornado." /></section>
    </div>
  );
}

function InfrastructureValue({ icon: Icon, label, value, detail, tone = 'default' }: { icon: typeof Clock3; label: string; value: string; detail?: string; tone?: 'default' | 'info' | 'ok' }) {
  return <div className="bg-card p-4"><p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground"><Icon className="h-3.5 w-3.5" />{label}</p><p className={`mt-2 font-medium ${tone === 'info' ? 'text-info' : tone === 'ok' ? 'text-noc-ok' : 'text-foreground'}`}>{value}</p>{detail && <p className="mt-1 font-mono text-xs text-muted-foreground">{detail}</p>}</div>;
}

function InfrastructureDeviceList({ title, icon: Icon, devices, empty }: { title: string; icon: typeof Server; devices: EnvironmentInfrastructure['servers']; empty: string }) {
  return <div className="space-y-2"><h3 className="flex items-center gap-2 text-sm font-semibold text-foreground"><Icon className="h-4 w-4 text-muted-foreground" />{title} <span className="font-mono text-xs text-muted-foreground">{devices.length}</span></h3>{devices.length > 0 ? <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card/40">{devices.map(device => <div key={device.id} className="flex items-center justify-between gap-3 px-4 py-3"><div className="min-w-0"><p className="truncate text-sm font-medium text-foreground">{device.name}</p><p className="font-mono text-xs text-muted-foreground">{device.ip}</p></div><OperationalStateBadge state={getOperationalState(device)} /></div>)}</div> : <EmptyInfrastructure text={empty} />}</div>;
}

function EmptyInfrastructure({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">{text}</div>;
}
