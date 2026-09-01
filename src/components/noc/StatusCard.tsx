import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface StatusCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'critical' | 'info';
  className?: string;
}

const variantStyles = {
  default: 'border-border',
  success: 'border-noc-ok/40 noc-glow',
  warning: 'border-noc-warning/40 noc-warning-glow',
  critical: 'border-noc-critical/50 noc-critical-glow',
  info: 'border-info/40 bg-info/[0.06]',
};

const iconVariantStyles = {
  default: 'text-primary',
  success: 'text-noc-ok',
  warning: 'text-noc-warning',
  critical: 'text-noc-critical',
  info: 'text-info',
};

export function StatusCard({ title, value, subtitle, icon, variant = 'default', className }: StatusCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'group relative overflow-hidden rounded-xl border bg-card p-4 transition-all lg:p-5 2xl:p-6',
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold leading-snug text-muted-foreground lg:text-base">{title}</p>
        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background/60', iconVariantStyles[variant])}>{icon}</span>
      </div>
      <p className="mt-3 font-mono text-4xl font-bold tracking-tight text-foreground lg:text-5xl">{value}</p>
      {subtitle && <p className="mt-2 text-xs leading-relaxed text-muted-foreground lg:text-sm">{subtitle}</p>}
    </motion.div>
  );
}
