import React from 'react'
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell
} from 'recharts'

const CHART_STYLE = {
  background: 'transparent',
  fontSize: 10,
  fontFamily: 'JetBrains Mono, monospace',
}

const TooltipStyle = {
  contentStyle: {
    background: '#1a1a2e',
    border: '1px solid #1e1e2e',
    borderRadius: 8,
    fontSize: 11,
    fontFamily: 'JetBrains Mono, monospace',
    color: '#e2e2f0',
  },
  labelStyle: { color: '#7c7c9a' },
}

export function MetricsLineChart({ data, dataKey, color, label }) {
  return (
    <ResponsiveContainer width="100%" height={120}>
      <AreaChart data={data} style={CHART_STYLE}>
        <defs>
          <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
        <XAxis dataKey="tick" tick={{ fill: '#7c7c9a', fontSize: 9 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fill: '#7c7c9a', fontSize: 9 }} tickLine={false} axisLine={false} width={32} />
        <Tooltip {...TooltipStyle} />
        <Area type="monotone" dataKey={dataKey} stroke={color} fill={`url(#grad-${dataKey})`}
          strokeWidth={1.5} dot={false} name={label} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function MultiLineChart({ data, series }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} style={CHART_STYLE}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
        <XAxis dataKey="tick" tick={{ fill: '#7c7c9a', fontSize: 9 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fill: '#7c7c9a', fontSize: 9 }} tickLine={false} axisLine={false} width={36} />
        <Tooltip {...TooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: '#7c7c9a' }} />
        {series.map(s => (
          <Line key={s.key} type="monotone" dataKey={s.key} stroke={s.color}
            strokeWidth={1.5} dot={false} name={s.label} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

export function ReputationBar({ agents }) {
  const sorted = [...agents].sort((a, b) => b.reputation - a.reputation).slice(0, 15)
  const TYPE_COLORS = {
    cooperative: '#22d3ee', selfish: '#f59e0b', troll: '#ef4444', neutral: '#6b7280'
  }
  const data = sorted.map(a => ({
    name: a.name || a.id.slice(0, 6),
    reputation: a.reputation,
    fill: TYPE_COLORS[a.type] || '#6b7280',
  }))
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical" style={CHART_STYLE}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" horizontal={false} />
        <XAxis type="number" tick={{ fill: '#7c7c9a', fontSize: 9 }} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="name" tick={{ fill: '#7c7c9a', fontSize: 9 }} tickLine={false} axisLine={false} width={55} />
        <Tooltip {...TooltipStyle} />
        <Bar dataKey="reputation" radius={[0, 3, 3, 0]} name="Reputacja">
          {data.map((entry, idx) => (
            <Cell key={idx} fill={entry.fill} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function OpinionOverTimeChart({ data = [], topics = [] }) {
  const TOPIC_COLORS = ['#6366f1', '#22d3ee', '#f59e0b', '#a855f7', '#10b981', '#f43f5e', '#3b82f6', '#84cc16']
  const chartData = data.map(d => {
    const row = { tick: d.tick, polarization: d.polarization, consensus: d.consensus, extreme_ratio: d.extreme_ratio }
    if (d.per_topic) {
      Object.entries(d.per_topic).forEach(([tid, val]) => {
        row[`topic_mean_${tid}`] = val.mean
        row[`topic_std_${tid}`] = val.std
      })
    }
    return row
  })

  if (chartData.length === 0) return null

  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={chartData} style={CHART_STYLE}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
        <XAxis dataKey="tick" tick={{ fill: '#7c7c9a', fontSize: 9 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fill: '#7c7c9a', fontSize: 9 }} tickLine={false} axisLine={false} width={36} />
        <Tooltip {...TooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: '#7c7c9a' }} />
        <Line type="monotone" dataKey="polarization" stroke="#ef4444" strokeWidth={1.5} dot={false} name="Polaryzacja" />
        <Line type="monotone" dataKey="consensus" stroke="#10b981" strokeWidth={1.5} dot={false} name="Konsensus" />
        {topics.map((t, i) => (
          <Line key={t.id} type="monotone" dataKey={`topic_mean_${t.id}`}
            stroke={TOPIC_COLORS[i % TOPIC_COLORS.length]}
            strokeWidth={1} strokeDasharray="4 2" dot={false} name={t.name} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

export function ActivityChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={120}>
      <BarChart data={data} style={CHART_STYLE}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
        <XAxis dataKey="tick" tick={{ fill: '#7c7c9a', fontSize: 9 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fill: '#7c7c9a', fontSize: 9 }} tickLine={false} axisLine={false} width={28} />
        <Tooltip {...TooltipStyle} />
        <Bar dataKey="interactions_this_tick" fill="#6366f1" fillOpacity={0.8} name="Interakcje" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
