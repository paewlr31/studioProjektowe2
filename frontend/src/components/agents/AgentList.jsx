import React from 'react'
import { Badge, AgentTypeDot } from '../ui'
import useSimStore from '../../stores/simStore'

const GOAL_LABELS = {
  maximize_reputation: 'REP',
  maximize_interactions: 'INT',
  maintain_group_consensus: 'CON',
}

export default function AgentList({ agents = [] }) {
  const { selectedAgentId, setSelectedAgent } = useSimStore()
  const sorted = [...agents].sort((a, b) => b.reputation - a.reputation)

  return (
    <div className="space-y-1 overflow-y-auto" style={{ maxHeight: '100%' }}>
      {sorted.map((agent, i) => {
        const isSelected = agent.id === selectedAgentId
        return (
          <button
            key={agent.id}
            onClick={() => setSelectedAgent(isSelected ? null : agent.id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all duration-150 ${
              isSelected
                ? 'ring-1 ring-accent bg-accent/5'
                : 'hover:bg-surface'
            }`}
          >
            {/* Rank */}
            <span className="text-xs font-mono text-text-dim w-4 text-right flex-shrink-0">{i + 1}</span>

            {/* Type dot */}
            <AgentTypeDot type={agent.type} />

            {/* Name */}
            <span className="text-xs text-text flex-1 truncate font-medium">{agent.name}</span>

            {/* Goal */}
            <span className="text-xs font-mono text-text-dim">{GOAL_LABELS[agent.goal] || '?'}</span>

            {/* Reputation */}
            <span className="text-xs font-mono font-semibold" style={{
              color: agent.reputation > 50 ? '#22d3ee' : agent.reputation > 20 ? '#e2e2f0' : '#7c7c9a'
            }}>
              {agent.reputation}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function AgentDetail({ agent }) {
  if (!agent) return null
  const typeColors = { cooperative: '#22d3ee', selfish: '#f59e0b', troll: '#ef4444', neutral: '#6b7280' }
  const col = typeColors[agent.type] || '#6b7280'

  const topTrust = Object.entries(agent.trust || {})
    .sort((a, b) => b[1] - a[1]).slice(0, 5)

  return (
    <div className="space-y-3 p-3 rounded-xl border border-border" style={{ background: '#111118' }}>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm"
          style={{ background: `${col}22`, color: col, border: `1px solid ${col}44` }}>
          {agent.name?.[0] || '?'}
        </div>
        <div>
          <div className="font-semibold text-sm text-text">{agent.name}</div>
          <div className="text-xs text-text-dim font-mono">{agent.id}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
        <div>
          <span className="text-text-dim">type</span>
          <div style={{ color: col }}>{agent.type}</div>
        </div>
        <div>
          <span className="text-text-dim">reputation</span>
          <div className="text-text font-semibold">{agent.reputation}</div>
        </div>
        <div>
          <span className="text-text-dim">goal</span>
          <div className="text-text truncate">{agent.goal?.replace(/_/g, ' ')}</div>
        </div>
        <div>
          <span className="text-text-dim">memory</span>
          <div className="text-text">{agent.memory_size} entries</div>
        </div>
      </div>

      {topTrust.length > 0 && (
        <div>
          <div className="text-xs text-text-dim font-mono mb-1">trust scores</div>
          {topTrust.map(([id, score]) => (
            <div key={id} className="flex justify-between text-xs font-mono py-0.5">
              <span className="text-text-dim truncate">{id.slice(0, 8)}</span>
              <span style={{ color: score > 0 ? '#22d3ee' : '#ef4444' }}>{score > 0 ? '+' : ''}{score.toFixed(1)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
