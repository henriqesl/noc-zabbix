import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { NocOccurrence } from '@/domain/noc';
import { OPERATIONAL_STATE_LABELS } from '@/domain/noc-classifier';
import { parseAlertTime } from '@/domain/noc-selectors';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { OccurrenceBadge } from './OccurrenceBadge';

const sourceLabels = {
  host: 'Disponibilidade do host',
  trigger: 'Trigger do Zabbix',
  proxy: 'Comunicação do proxy',
  restriction: 'Restrição conhecida',
  snapshot: 'Frescor da coleta',
};

const visibilityLabels = {
  current: 'Atual',
  delayed: 'Atrasada',
  limited: 'Limitada',
  lost: 'Perdida',
};

export function OccurrenceEvidenceSheet({
  occurrence,
  onOpenChange,
}: {
  occurrence: NocOccurrence | null;
  onOpenChange: (open: boolean) => void;
}) {
  const observedAt = occurrence ? parseAlertTime(occurrence.evidence.observedAt) : 0;

  return (
    <Sheet open={Boolean(occurrence)} onOpenChange={onOpenChange}>
      <SheetContent className="!w-full overflow-y-auto border-border bg-background sm:!max-w-xl">
        {occurrence && (
          <div className="space-y-6">
            <SheetHeader className="pr-8">
              <div><OccurrenceBadge occurrence={occurrence} /></div>
              <SheetTitle className="text-xl">{occurrence.title}</SheetTitle>
              <SheetDescription>{occurrence.environmentName}</SheetDescription>
            </SheetHeader>

            <section className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2">
              <EvidenceValue label="Estado público" value={OPERATIONAL_STATE_LABELS[occurrence.operationalState]} />
              <EvidenceValue label="Visibilidade" value={visibilityLabels[occurrence.visibility]} />
              <EvidenceValue label="Fonte" value={sourceLabels[occurrence.evidence.source]} />
              <EvidenceValue label="Código" value={occurrence.evidence.reasonCode} mono />
            </section>

            <section className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Por que este estado foi exibido</h3>
              <p className="rounded-xl border border-border bg-card/60 p-4 text-sm leading-relaxed text-foreground">{occurrence.evidence.reasonLabel}</p>
              <p className="text-xs text-muted-foreground">
                {observedAt > 0
                  ? `Observado em ${format(observedAt, "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })} · ${formatDistanceToNow(observedAt, { addSuffix: true, locale: ptBR })}`
                  : 'A fonte não informou um horário válido.'}
              </p>
            </section>

            {(occurrence.proxyName || occurrence.environmentId) && (
              <section className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Contexto</h3>
                <div className="rounded-xl border border-border bg-card/60 p-4 text-sm">
                  {occurrence.proxyName && <p><span className="text-muted-foreground">Proxy:</span> {occurrence.proxyName}</p>}
                  {occurrence.environmentId && <Link to={`/ambientes/${occurrence.environmentId}`} className="mt-3 inline-flex items-center gap-1 font-semibold text-primary hover:underline">Abrir ambiente<ExternalLink className="h-3.5 w-3.5" /></Link>}
                </div>
              </section>
            )}

            <section className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Equipamentos afetados ({occurrence.affectedDevices.length})</h3>
              {occurrence.affectedDevices.length > 0 ? (
                <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card/50">
                  {occurrence.affectedDevices.map(device => (
                    <div key={device.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0"><p className="truncate text-sm font-medium text-foreground">{device.name}</p><p className="font-mono text-xs text-muted-foreground">{device.ip}</p></div>
                      {device.classification.lastKnownState && <span className="text-right text-xs text-muted-foreground">Último: {OPERATIONAL_STATE_LABELS[device.classification.lastKnownState]}</span>}
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-muted-foreground">A trigger não foi associada a um host retornado nesta leitura.</p>}
            </section>

            {occurrence.relatedAlerts.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Evidências do Zabbix ({occurrence.relatedAlerts.length})</h3>
                <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card/50">
                  {occurrence.relatedAlerts.map(alert => <div key={alert.id} className="px-4 py-3"><p className="text-sm text-foreground">{alert.message}</p><p className="mt-1 font-mono text-xs text-muted-foreground">Trigger {alert.id}{formatAcknowledgement(alert.acknowledged)}</p></div>)}
                </div>
              </section>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function EvidenceValue({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div className="bg-card p-3"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</p><p className={mono ? 'mt-1 break-all font-mono text-xs text-foreground' : 'mt-1 text-sm font-medium text-foreground'}>{value}</p></div>;
}

function formatAcknowledgement(acknowledged: boolean | undefined) {
  if (acknowledged === undefined) return ' · reconhecimento não informado';
  return acknowledged ? ' · reconhecida' : ' · não reconhecida';
}
