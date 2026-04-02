import React, { useState } from 'react'
import useSimStore from '../stores/simStore'
import { MetricCard, Card, EmptyState, Badge } from '../components/ui'
import SimControls from '../components/ui/SimControls'
import { MetricsLineChart, MultiLineChart, ActivityChart } from '../components/metrics/Charts'
import AgentList, { AgentDetail } from '../components/agents/AgentList'
import { ActionLog } from '../components/feed/FeedStream'
import ExperimentModal from './ExperimentModal'

function fmt(n, decimals = 2) {
  if (n === undefined || n === null) return '—'
  return typeof n === 'number' ? n.toFixed(decimals) : n
}

export default function Dashboard() {
  const {
    status, tick, maxTicks, metrics, metricsHistory, agents,
    feed, lastActions, currentEvent, eventsLog, config
  } = useSimStore()

  const [showExpModal, setShowExpModal] = useState(false)
  const [colorBy, setColorBy] = useState('type')

  const prev = metricsHistory.length > 1 ? metricsHistory[metricsHistory.length - 2] : null

  const trend = (key) => {
    if (!prev || !metrics) return undefined
    return (metrics[key] || 0) - (prev[key] || 0)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border flex-shrink-0"
        style={{ background: '#0d0d14' }}>
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-text font-mono">
            {config?.name || 'LLM Society Dashboard'}
          </h1>
          {config?.name && (
            <span className="text-xs text-text-dim font-mono">
              — {config?.n_agents} agents · {config?.memory_mode} memory
            </span>
          )}
        </div>
        <SimControls onExperimentClick={() => setShowExpModal(true)} />
      </div>

      {/* Context event banner */}
      {currentEvent && (
        <div className="px-6 py-2 text-xs font-mono flex items-center gap-2 flex-shrink-0 animate-fade-in"
          style={{ background: '#2d1515', borderBottom: '1px solid #ef444433', color: '#fca5a5' }}>
          <span className="text-troll">⚠</span>
          {currentEvent}
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-hidden flex gap-0">
        {/* Left column */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Metric cards row */}
          <div className="grid grid-cols-4 gap-3">
            <MetricCard
              label="Klastry" icon="◎"
              value={metrics ? metrics.n_clusters : '—'}
              color="#6366f1"
              trend={trend('n_clusters')}
            />
            <MetricCard
              label="Modularność" icon="⬡"
              value={metrics ? fmt(metrics.modularity) : '—'}
              color="#22d3ee"
              trend={trend('modularność')}
            />
            <MetricCard
              label="Clustering" icon="▦"
              value={metrics ? fmt(metrics.avg_clustering) : '—'}
              color="#a855f7"
            />
            <MetricCard
              label="Gęstość grafu" icon="◈"
              value={metrics ? fmt(metrics.density) : '—'}
              color="#f59e0b"
            />
          </div>

          <div className="grid grid-cols-4 gap-3">
            <MetricCard
              label="Interakcje/tick" icon="⚡"
              value={metrics?.interactions_this_tick ?? '—'}
              color="#22d3ee"
            />
            <MetricCard
              label="Avg reputacja" icon="★"
              value={metrics ? fmt(metrics.reputation?.mean) : '—'}
              color="#f59e0b"
            />
            <MetricCard
              label="Max reputacja"
              value={metrics?.reputation?.max ?? '—'}
              color="#a855f7"
            />
            <MetricCard
              label="Graf stability" icon="≈"
              value={metrics ? fmt(metrics.graph_stability) : '—'}
              color="#10b981"
            />
          </div>

          {/* Charts */}
          {metricsHistory.length > 1 ? (
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <div className="text-xs font-mono text-text-dim mb-3 uppercase tracking-wider">Klastry w czasie</div>
                <MetricsLineChart
                  data={metricsHistory}
                  dataKey="n_clusters"
                  color="#6366f1"
                  label="Klastry"
                />
              </Card>
              <Card>
                <div className="text-xs font-mono text-text-dim mb-3 uppercase tracking-wider">Modularność</div>
                <MetricsLineChart
                  data={metricsHistory}
                  dataKey="modularity"
                  color="#22d3ee"
                  label="Modularność"
                />
              </Card>
              <Card>
                <div className="text-xs font-mono text-text-dim mb-3 uppercase tracking-wider">Interakcje / tick</div>
                <ActivityChart data={metricsHistory} />
              </Card>
              <Card>
                <div className="text-xs font-mono text-text-dim mb-3 uppercase tracking-wider">Śr. reputacja</div>
                <MetricsLineChart
                  data={metricsHistory.map(m => ({ ...m, rep_mean: m.reputation?.mean || 0 }))}
                  dataKey="rep_mean"
                  color="#f59e0b"
                  label="Reputacja"
                />
              </Card>
            </div>
          ) : (
            <Card>
              <EmptyState
                message={status === 'idle' ? 'Wybierz eksperyment aby rozpocząć symulację' : 'Oczekiwanie na dane...'}
                icon="⬡"
              />
            </Card>
          )}

          {/* Leaders */}
          {metrics?.leaders?.length > 0 && (
            <Card>
              <div className="text-xs font-mono text-text-dim mb-3 uppercase tracking-wider">Liderzy sieci</div>
              <div className="flex gap-3 flex-wrap">
                {metrics.leaders.map((l, i) => {
                  const agent = agents.find(a => a.id === l.id)
                  return (
                    <div key={l.id} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border"
                      style={{ background: '#0d0d14' }}>
                      <span className="text-xs font-mono text-text-dim">#{i + 1}</span>
                      <span className="text-xs font-semibold text-text">{agent?.name || l.id}</span>
                      <span className="text-xs font-mono text-accent">{l.centrality.toFixed(3)}</span>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}

          {/* Events log */}
          {eventsLog.length > 0 && (
            <Card>
              <div className="text-xs font-mono text-text-dim mb-3 uppercase tracking-wider">Zdarzenia</div>
              <div className="space-y-1.5">
                {eventsLog.map((e, i) => (
                  <div key={i} className="flex gap-3 text-xs font-mono">
                    <span className="text-troll flex-shrink-0">tick {e.tick}</span>
                    <span className="text-text-dim">{e.event}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right sidebar */}
        <div className="w-72 flex-shrink-0 border-l border-border flex flex-col overflow-hidden"
          style={{ background: '#0d0d14' }}>
          {/* Agents */}
          <div className="flex-1 overflow-hidden flex flex-col border-b border-border">
            <div className="px-4 py-3 flex items-center justify-between flex-shrink-0">
              <span className="text-xs font-mono text-text-dim uppercase tracking-wider">Agenci ({agents.length})</span>
            </div>
            <div className="flex-1 overflow-y-auto px-2 pb-2">
              <AgentList agents={agents} />
            </div>
          </div>

          {/* Action log */}
          <div className="h-64 flex flex-col overflow-hidden">
            <div className="px-4 py-3 flex-shrink-0">
              <span className="text-xs font-mono text-text-dim uppercase tracking-wider">
                Akcje tej rundy ({lastActions.length})
              </span>
            </div>
            <div className="flex-1 overflow-y-auto px-2 pb-2">
              {lastActions.length > 0
                ? <ActionLog actions={lastActions} agents={agents} />
                : <EmptyState message="Brak akcji" icon="—" />
              }
            </div>
          </div>
        </div>
      </div>

      {showExpModal && <ExperimentModal onClose={() => setShowExpModal(false)} />}
    </div>
  )
}
