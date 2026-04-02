import React, { useRef, useEffect } from 'react'
import { AgentTypeDot } from '../ui'

const TYPE_COLORS = {
  cooperative: '#22d3ee',
  selfish: '#f59e0b',
  troll: '#ef4444',
  neutral: '#6b7280',
}

export function FeedStream({ feed = [], agents = [], autoScroll = true }) {
  const bottomRef = useRef(null)
  const agentMap = Object.fromEntries(agents.map(a => [a.id, a]))

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [feed.length, autoScroll])

  const posts = feed.filter(f => f.type === 'post' || !f.type)
  const comments = feed.filter(f => f.type === 'comment')

  return (
    <div className="space-y-2 overflow-y-auto h-full pr-1">
      {posts.map(item => {
        const agent = agentMap[item.author_id]
        const itemComments = comments.filter(c => c.parent_id === item.id)
        return (
          <div key={item.id} className="rounded-lg border border-border feed-item-enter"
            style={{ background: '#111118' }}>
            <div className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <AgentTypeDot type={agent?.type} />
                <span className="text-xs font-semibold text-text">{agent?.name || item.author_id}</span>
                <span className="text-xs font-mono text-text-dim ml-auto">tick {item.tick}</span>
              </div>
              <p className="text-xs text-text leading-relaxed">{item.content}</p>
              <div className="flex items-center gap-3 mt-2 text-xs font-mono text-text-dim">
                <span>♥ {item.likes || 0}</span>
                <span>◈ {itemComments.length}</span>
                <span className="ml-auto" style={{ color: TYPE_COLORS[agent?.type] || '#6b7280', fontSize: 10 }}>
                  {agent?.type}
                </span>
              </div>
            </div>
            {itemComments.length > 0 && (
              <div className="border-t border-border">
                {itemComments.slice(-3).map(c => {
                  const ca = agentMap[c.author_id]
                  return (
                    <div key={c.id} className="px-3 py-2 flex gap-2" style={{ background: '#0d0d14' }}>
                      <AgentTypeDot type={ca?.type} size="sm" />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium text-text-dim">{ca?.name || c.author_id}: </span>
                        <span className="text-xs text-text-dim">{c.content}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}

export function ActionLog({ actions = [], agents = [] }) {
  const agentMap = Object.fromEntries(agents.map(a => [a.id, a]))
  const ACTION_ICONS = { post: '📝', comment: '💬', like: '♥', ignore: '—' }
  const ACTION_COLORS = { post: '#6366f1', comment: '#22d3ee', like: '#f59e0b', ignore: '#3f3f5a' }

  return (
    <div className="space-y-0.5 overflow-y-auto" style={{ maxHeight: '100%' }}>
      {[...actions].reverse().map((action, i) => {
        const agent = agentMap[action.agent_id]
        return (
          <div key={i} className="flex items-start gap-2 py-1.5 px-2 rounded hover:bg-surface transition-colors">
            <span className="text-xs flex-shrink-0" style={{ color: ACTION_COLORS[action.action] || '#6b7280' }}>
              {ACTION_ICONS[action.action] || '?'}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <AgentTypeDot type={agent?.type || action.agent_type} size="sm" />
                <span className="text-xs font-medium text-text">{action.agent_name}</span>
                <span className="text-xs font-mono" style={{ color: ACTION_COLORS[action.action] }}>{action.action}</span>
              </div>
              {action.content && (
                <p className="text-xs text-text-dim mt-0.5 truncate">{action.content}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
