import React from 'react'
import useSimStore from '../stores/simStore'
import { Card, Button, EmptyState } from '../components/ui'
import { MultiLineChart, MetricsLineChart, ReputationBar } from '../components/metrics/Charts'

function StatRow({ label, value, unit = '' }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-border/50 text-xs font-mono">
      <span className="text-text-dim">{label}</span>
      <span className="text-text font-medium">{value}{unit && <span className="text-text-dim ml-1">{unit}</span>}</span>
    </div>
  )
}

export default function ReportPage() {
  const { metricsHistory, agents, eventsLog, tick, config, status, exportResults } = useSimStore()

  const hasData = metricsHistory.length > 2

  if (!hasData) {
    return (
      <div className="h-full flex items-center justify-center">
        <EmptyState
          message="Uruchom i zakończ symulację aby wygenerować raport"
          icon="▦"
        />
      </div>
    )
  }

  const last = metricsHistory[metricsHistory.length - 1]
  const first = metricsHistory[0]

  const reps = agents.map(a => a.reputation)
  const avgRep = reps.length ? (reps.reduce((s, r) => s + r, 0) / reps.length).toFixed(1) : 0
  const maxRep = reps.length ? Math.max(...reps) : 0
  const minRep = reps.length ? Math.min(...reps) : 0

  const totalInteractions = metricsHistory.reduce((s, m) => s + (m.interactions_this_tick || 0), 0)
  const avgInteractionsPerTick = (totalInteractions / metricsHistory.length).toFixed(1)

  const clusterTrend = last.n_clusters - first.n_clusters
  const densityTrend = last.density - first.density

  // Build multi-metric chart data
  const chartData = metricsHistory.map(m => ({
    tick: m.tick,
    clusters: m.n_clusters,
    modularity: m.modularity,
    clustering: m.avg_clustering,
    density: m.density,
    interactions: m.interactions_this_tick || 0,
    rep_mean: m.reputation?.mean || 0,
    stability: m.graph_stability || 0,
  }))

  return (
    <div className="h-full overflow-y-auto px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-bold text-text font-mono">Raport Symulacji</h1>
          <p className="text-sm text-text-dim mt-1">
            {config?.name || 'Symulacja'} · {tick} ticków · {agents.length} agentów
          </p>
        </div>
        <Button onClick={exportResults} variant="ghost">↓ Eksportuj JSON</Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <div className="text-xs font-mono text-text-dim uppercase tracking-wider mb-3">Konfiguracja</div>
          <StatRow label="Eksperyment" value={config?.name || '—'} />
          <StatRow label="Liczba agentów" value={agents.length} />
          <StatRow label="Ticków" value={tick} />
          <StatRow label="Tryb pamięci" value={config?.memory_mode || '—'} />
          <StatRow label="Zdarzenia" value={config?.event_mode || '—'} />
          <StatRow label="Cel agentów" value={config?.goal?.replace(/_/g, ' ') || '—'} />
        </Card>

        <Card>
          <div className="text-xs font-mono text-text-dim uppercase tracking-wider mb-3">Podsumowanie Wyników</div>
          <StatRow label="Końcowa liczba klastrów" value={last.n_clusters} />
          <StatRow label="Zmiana klastrów" value={`${clusterTrend >= 0 ? '+' : ''}${clusterTrend}`} />
          <StatRow label="Końcowa modularność" value={last.modularity?.toFixed(4)} />
          <StatRow label="Avg clustering" value={last.avg_clustering?.toFixed(4)} />
          <StatRow label="Gęstość grafu" value={last.density?.toFixed(4)} />
          <StatRow label="Zdarzenia kontekstowe" value={eventsLog.length} />
        </Card>

        <Card>
          <div className="text-xs font-mono text-text-dim uppercase tracking-wider mb-3">Reputacja Agentów</div>
          <StatRow label="Średnia reputacja" value={avgRep} />
          <StatRow label="Maks reputacja" value={maxRep} />
          <StatRow label="Min reputacja" value={minRep} />
          <StatRow label="Odchylenie std" value={last.reputation?.std?.toFixed(2) || '—'} />
        </Card>

        <Card>
          <div className="text-xs font-mono text-text-dim uppercase tracking-wider mb-3">Aktywność</div>
          <StatRow label="Łączne interakcje" value={totalInteractions} />
          <StatRow label="Avg interakcji/tick" value={avgInteractionsPerTick} />
          <StatRow label="Krawędzie w grafie" value={last.n_edges || 0} />
          <StatRow label="Avg path length" value={last.avg_path_length?.toFixed(3) || '—'} />
          <StatRow label="Aktywność entropia" value={last.activity_entropy?.toFixed(3) || '—'} />
        </Card>
      </div>

      {/* Charts */}
      <Card>
        <div className="text-xs font-mono text-text-dim uppercase tracking-wider mb-4">Struktura Grafu w Czasie</div>
        <MultiLineChart
          data={chartData}
          series={[
            { key: 'clusters', color: '#6366f1', label: 'Klastry' },
            { key: 'modularity', color: '#22d3ee', label: 'Modularność' },
            { key: 'avg_clustering', color: '#a855f7', label: 'Avg Clustering' },
          ]}
        />
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <div className="text-xs font-mono text-text-dim uppercase tracking-wider mb-4">Interakcje i Stabilność</div>
          <MultiLineChart
            data={chartData}
            series={[
              { key: 'interactions', color: '#f59e0b', label: 'Interakcje/tick' },
              { key: 'stability', color: '#10b981', label: 'Stabilność grafu' },
            ]}
          />
        </Card>
        <Card>
          <div className="text-xs font-mono text-text-dim uppercase tracking-wider mb-4">Reputacja (mean)</div>
          <MetricsLineChart data={chartData} dataKey="rep_mean" color="#f59e0b" label="Avg reputacja" />
        </Card>
      </div>

      {/* Reputation bar */}
      <Card>
        <div className="text-xs font-mono text-text-dim uppercase tracking-wider mb-4">Ranking Reputacji Agentów</div>
        <ReputationBar agents={agents} />
      </Card>

      {/* Leaders table */}
      {last.leaders?.length > 0 && (
        <Card>
          <div className="text-xs font-mono text-text-dim uppercase tracking-wider mb-4">Liderzy Sieci (Betweenness Centrality)</div>
          <div className="space-y-2">
            {last.leaders.map((l, i) => {
              const agent = agents.find(a => a.id === l.id)
              const TYPE_COLORS = { cooperative: '#22d3ee', selfish: '#f59e0b', troll: '#ef4444', neutral: '#6b7280' }
              return (
                <div key={l.id} className="flex items-center gap-4 py-2 px-3 rounded-lg border border-border"
                  style={{ background: '#0d0d14' }}>
                  <span className="text-sm font-bold font-mono text-text-dim w-6">#{i+1}</span>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: TYPE_COLORS[agent?.type] + '22', color: TYPE_COLORS[agent?.type] }}>
                    {agent?.name?.[0] || '?'}
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-text">{agent?.name || l.id}</div>
                    <div className="text-xs text-text-dim font-mono">{agent?.type} · rep {agent?.reputation}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-mono font-bold text-accent">{l.centrality.toFixed(4)}</div>
                    <div className="text-xs text-text-dim font-mono">betweenness</div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Events log */}
      {eventsLog.length > 0 && (
        <Card>
          <div className="text-xs font-mono text-text-dim uppercase tracking-wider mb-3">Log Zdarzeń</div>
          <div className="space-y-2">
            {eventsLog.map((e, i) => (
              <div key={i} className="flex gap-4 text-xs font-mono py-1.5 border-b border-border/50">
                <span className="text-troll flex-shrink-0">Tick {e.tick}</span>
                <span className="text-text-dim">{e.event}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
