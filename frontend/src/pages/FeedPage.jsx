import React, { useState } from 'react'
import useSimStore from '../stores/simStore'
import { FeedStream, ActionLog } from '../components/feed/FeedStream'
import { EmptyState, AgentTypeDot } from '../components/ui'

export default function FeedPage() {
  const { feed, agents, lastActions, tick, topics } = useSimStore()
  const [view, setView] = useState('feed') // feed | actions

  const typeCount = agents.reduce((acc, a) => {
    acc[a.type] = (acc[a.type] || 0) + 1
    return acc
  }, {})

  const TYPE_LABELS = { cooperative: 'Kooperacyjni', selfish: 'Samolubni', troll: 'Trolle', neutral: 'Neutralni' }

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3 border-b border-border flex items-center gap-4 flex-shrink-0"
          style={{ background: '#0d0d14' }}>
          <div className="flex gap-1">
            {['feed', 'actions'].map(v => (
              <button key={v}
                onClick={() => setView(v)}
                className={`text-xs font-mono px-3 py-1.5 rounded transition-all ${
                  view === v ? 'bg-accent text-white' : 'text-text-dim hover:text-text'
                }`}>
                {v === 'feed' ? '◈ Feed' : '⚡ Akcje'}
              </button>
            ))}
          </div>
          <span className="text-xs font-mono text-text-dim ml-auto">
            {feed.length} postów · tick {tick}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-4">
          {view === 'feed' ? (
            feed.length > 0
              ? <FeedStream feed={feed} agents={agents} topics={topics} autoScroll />
              : <EmptyState message="Feed jest pusty. Uruchom symulację." icon="◈" />
          ) : (
            lastActions.length > 0
              ? <ActionLog actions={lastActions} agents={agents} />
              : <EmptyState message="Brak akcji w tej rundzie" icon="⚡" />
          )}
        </div>
      </div>

      {/* Sidebar — agent type breakdown */}
      <div className="w-56 border-l border-border flex flex-col overflow-hidden"
        style={{ background: '#0d0d14' }}>
        <div className="px-4 py-3 border-b border-border">
          <span className="text-xs font-mono text-text-dim uppercase tracking-wider">Skład Społeczności</span>
        </div>
        <div className="p-4 space-y-3">
          {Object.entries(typeCount).map(([type, count]) => {
            const pct = agents.length > 0 ? (count / agents.length) * 100 : 0
            const COLORS = { cooperative: '#22d3ee', selfish: '#f59e0b', troll: '#ef4444', neutral: '#6b7280' }
            return (
              <div key={type}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <AgentTypeDot type={type} />
                    <span className="text-xs text-text-dim">{TYPE_LABELS[type] || type}</span>
                  </div>
                  <span className="text-xs font-mono text-text">{count}</span>
                </div>
                <div className="h-1 rounded-full overflow-hidden" style={{ background: '#1e1e2e' }}>
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: COLORS[type] }} />
                </div>
              </div>
            )
          })}
        </div>

        {/* Feed stats */}
        <div className="px-4 py-4 border-t border-border mt-auto space-y-2">
          <div className="text-xs font-mono text-text-dim uppercase tracking-wider mb-2">Statystyki Feedu</div>
          {[
            ['Posty', feed.filter(f => !f.type || f.type === 'post').length],
            ['Komentarze', feed.filter(f => f.type === 'comment').length],
            ['Łączne polubienia', feed.reduce((s, f) => s + (f.likes || 0), 0)],
          ].map(([label, val]) => (
            <div key={label} className="flex justify-between text-xs font-mono">
              <span className="text-text-dim">{label}</span>
              <span className="text-text">{val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
