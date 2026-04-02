import React, { useState, useRef } from 'react'
import useSimStore from '../stores/simStore'
import ForceGraph from '../components/graph/ForceGraph'
import { Card, EmptyState, Badge, AgentTypeDot } from '../components/ui'

export default function GraphPage() {
  const { graphData, metrics, agents, tick } = useSimStore()
  const [colorBy, setColorBy] = useState('type')
  const containerRef = useRef(null)

  const hasData = graphData.nodes.length > 0

  const TYPE_COLORS = { cooperative: '#22d3ee', selfish: '#f59e0b', troll: '#ef4444', neutral: '#6b7280' }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Graph canvas */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center gap-4 flex-shrink-0"
          style={{ background: '#0d0d14' }}>
          <span className="text-xs font-mono text-text-dim">Graf Interakcji</span>
          <span className="text-xs font-mono text-text">tick {tick}</span>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-text-dim font-mono">Kolor:</span>
            {['type', 'community'].map(opt => (
              <button key={opt}
                onClick={() => setColorBy(opt)}
                className={`text-xs font-mono px-2 py-1 rounded transition-all ${
                  colorBy === opt ? 'bg-accent text-white' : 'text-text-dim hover:text-text'
                }`}>
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 relative overflow-hidden" ref={containerRef}>
          {hasData ? (
            <ForceGraph
              nodes={graphData.nodes}
              edges={graphData.edges}
              width={containerRef.current?.clientWidth || 800}
              height={containerRef.current?.clientHeight || 600}
              colorBy={colorBy}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <EmptyState message="Uruchom symulację aby zobaczyć graf" icon="◎" />
            </div>
          )}
        </div>

        {/* Legend */}
        {hasData && colorBy === 'type' && (
          <div className="flex items-center gap-5 px-5 py-2 border-t border-border flex-shrink-0"
            style={{ background: '#0d0d14' }}>
            {Object.entries(TYPE_COLORS).map(([type, color]) => (
              <div key={type} className="flex items-center gap-1.5">
                <AgentTypeDot type={type} />
                <span className="text-xs font-mono text-text-dim">{type}</span>
              </div>
            ))}
            <span className="text-xs font-mono text-text-dim ml-auto">● = reputacja · rozmiar = degree centrality</span>
          </div>
        )}
      </div>

      {/* Right panel */}
      <div className="w-64 border-l border-border overflow-y-auto flex-shrink-0 p-4 space-y-4"
        style={{ background: '#0d0d14' }}>

        {/* Graph stats */}
        <div>
          <div className="text-xs font-mono text-text-dim uppercase tracking-wider mb-3">Metryki Grafu</div>
          <div className="space-y-2 text-xs font-mono">
            {[
              ['Węzły', graphData.nodes.length],
              ['Krawędzie', graphData.edges.length],
              ['Klastry', metrics?.n_clusters ?? '—'],
              ['Modularność', metrics?.modularity?.toFixed(3) ?? '—'],
              ['Avg clustering', metrics?.avg_clustering?.toFixed(3) ?? '—'],
              ['Gęstość', metrics?.density?.toFixed(3) ?? '—'],
              ['Avg path len', metrics?.avg_path_length?.toFixed(2) ?? '—'],
              ['Stability', metrics?.graph_stability?.toFixed(3) ?? '—'],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between py-1 border-b border-border/50">
                <span className="text-text-dim">{label}</span>
                <span className="text-text">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Communities */}
        {metrics?.communities?.length > 0 && (
          <div>
            <div className="text-xs font-mono text-text-dim uppercase tracking-wider mb-3">Klastry ({metrics.communities.length})</div>
            <div className="space-y-2">
              {metrics.communities.map((comm, i) => {
                const members = comm.map(id => agents.find(a => a.id === id)?.name || id)
                return (
                  <div key={i} className="p-2 rounded-lg border border-border" style={{ background: '#111118' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full" style={{
                        background: ['#6366f1','#22d3ee','#f59e0b','#a855f7','#10b981','#f43f5e'][i % 6]
                      }} />
                      <span className="text-xs font-mono text-text-dim">Klaster {i + 1}</span>
                      <span className="text-xs font-mono text-text ml-auto">{comm.length}</span>
                    </div>
                    <div className="text-xs text-text-dim truncate">{members.slice(0, 4).join(', ')}{comm.length > 4 ? '...' : ''}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Top agents by centrality */}
        {metrics?.leaders?.length > 0 && (
          <div>
            <div className="text-xs font-mono text-text-dim uppercase tracking-wider mb-3">Liderzy (centrality)</div>
            <div className="space-y-1">
              {metrics.leaders.map((l, i) => {
                const agent = agents.find(a => a.id === l.id)
                return (
                  <div key={l.id} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-surface transition-colors">
                    <span className="text-xs font-mono text-text-dim w-4">#{i+1}</span>
                    <AgentTypeDot type={agent?.type} size="sm" />
                    <span className="text-xs text-text flex-1">{agent?.name || l.id}</span>
                    <span className="text-xs font-mono text-accent">{l.centrality.toFixed(3)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
