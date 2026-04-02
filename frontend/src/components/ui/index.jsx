import React from 'react'
import clsx from 'clsx'

export function Card({ children, className = '', glow = false }) {
  return (
    <div className={clsx(
      'rounded-xl border border-border p-4 metric-card',
      glow && 'glow-accent',
      className
    )} style={{ background: '#111118' }}>
      {children}
    </div>
  )
}

export function MetricCard({ label, value, sub, color, icon, trend }) {
  return (
    <Card className="flex flex-col gap-1 min-w-0">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-text-dim uppercase tracking-wider">{label}</span>
        {icon && <span className="text-base opacity-60">{icon}</span>}
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold font-mono" style={{ color: color || '#e2e2f0' }}>
          {value}
        </span>
        {trend !== undefined && (
          <span className={`text-xs font-mono mb-0.5 ${trend >= 0 ? 'text-cooperative' : 'text-troll'}`}>
            {trend >= 0 ? '▲' : '▼'}{Math.abs(trend).toFixed(2)}
          </span>
        )}
      </div>
      {sub && <span className="text-xs text-text-dim">{sub}</span>}
    </Card>
  )
}

export function Badge({ children, type = 'neutral' }) {
  const styles = {
    cooperative: 'bg-cooperative/10 text-cooperative border-cooperative/20',
    selfish: 'bg-selfish/10 text-selfish border-selfish/20',
    troll: 'bg-troll/10 text-troll border-troll/20',
    neutral: 'bg-muted/20 text-text-dim border-muted/30',
    accent: 'bg-accent/10 text-accent border-accent/20',
  }
  return (
    <span className={clsx('text-xs px-1.5 py-0.5 rounded border font-mono', styles[type] || styles.neutral)}>
      {children}
    </span>
  )
}

export function Button({ children, onClick, variant = 'primary', size = 'md', disabled = false, className = '' }) {
  const base = 'inline-flex items-center gap-2 font-medium rounded-lg transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-accent hover:bg-accent-dim text-white',
    danger: 'bg-troll/20 hover:bg-troll/30 text-troll border border-troll/30',
    ghost: 'bg-transparent hover:bg-surface text-text-dim hover:text-text border border-border',
    success: 'bg-cooperative/20 hover:bg-cooperative/30 text-cooperative border border-cooperative/30',
  }
  const sizes = {
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(base, variants[variant], sizes[size], className)}
    >
      {children}
    </button>
  )
}

export function SectionHeader({ title, sub }) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-semibold text-text uppercase tracking-widest font-mono">{title}</h2>
      {sub && <p className="text-xs text-text-dim mt-0.5">{sub}</p>}
    </div>
  )
}

export function Divider() {
  return <div className="border-t border-border my-4" />
}

export function AgentTypeDot({ type, size = 'sm' }) {
  const colors = {
    cooperative: '#22d3ee',
    selfish: '#f59e0b',
    troll: '#ef4444',
    neutral: '#6b7280',
  }
  const sizes = { sm: 'w-2 h-2', md: 'w-3 h-3' }
  return (
    <span
      className={clsx('rounded-full inline-block flex-shrink-0', sizes[size])}
      style={{ background: colors[type] || colors.neutral, boxShadow: `0 0 6px ${colors[type] || colors.neutral}66` }}
    />
  )
}

export function Spinner() {
  return (
    <div className="w-5 h-5 rounded-full border-2 border-muted border-t-accent animate-spin" />
  )
}

export function EmptyState({ message = 'Brak danych', icon = '◎' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-text-dim">
      <span className="text-4xl opacity-30">{icon}</span>
      <span className="text-sm font-mono">{message}</span>
    </div>
  )
}
