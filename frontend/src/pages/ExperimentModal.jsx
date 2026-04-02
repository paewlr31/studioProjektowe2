import React, { useEffect, useState } from 'react'
import useSimStore from '../stores/simStore'
import { Button, Badge } from '../components/ui'

const EXP_GROUPS = [
  { id: 1, label: 'Exp 1 — Typy Agentów', color: '#6366f1', rq: 'RQ1, RQ4' },
  { id: 2, label: 'Exp 2 — Zdarzenia', color: '#22d3ee', rq: 'RQ3' },
  { id: 3, label: 'Exp 3 — Pamięć', color: '#a855f7', rq: 'RQ5' },
  { id: 4, label: 'Exp 4 — Cel Agenta', color: '#f59e0b', rq: 'RQ1, RQ2' },
  { id: 5, label: 'Exp 5 — Liczba Agentów', color: '#10b981', rq: 'RQ1, RQ2' },
]

export default function ExperimentModal({ onClose }) {
  const { experiments, fetchExperiments, startExperiment, status } = useSimStore()
  const [selected, setSelected] = useState(null)
  const [tickDelay, setTickDelay] = useState(0.8)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    fetchExperiments()
  }, [])

  const handleStart = async () => {
    if (!selected) return
    setStarting(true)
    await startExperiment(selected, tickDelay)
    setStarting(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-[720px] max-h-[85vh] flex flex-col rounded-2xl border border-border overflow-hidden"
        style={{ background: '#111118' }}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-shrink-0"
          style={{ background: '#0d0d14' }}>
          <div>
            <h2 className="text-sm font-semibold text-text font-mono">Wybierz Eksperyment</h2>
            <p className="text-xs text-text-dim mt-0.5">5 eksperymentów badawczych · 14 konfiguracji</p>
          </div>
          <button onClick={onClose} className="text-text-dim hover:text-text text-lg">✕</button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {EXP_GROUPS.map(group => {
            const exps = experiments.filter(e => e.experiment === group.id)
            return (
              <div key={group.id}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-px flex-1" style={{ background: group.color + '44' }} />
                  <span className="text-xs font-mono flex-shrink-0" style={{ color: group.color }}>
                    {group.label}
                  </span>
                  <span className="text-xs font-mono text-text-dim flex-shrink-0">{group.rq}</span>
                  <div className="h-px flex-1" style={{ background: group.color + '44' }} />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {exps.map(exp => (
                    <button key={exp.id}
                      onClick={() => setSelected(selected === exp.id ? null : exp.id)}
                      className={`text-left p-3 rounded-xl border transition-all duration-150 ${
                        selected === exp.id
                          ? 'border-accent bg-accent/10'
                          : 'border-border hover:border-muted'
                      }`}
                      style={{ background: selected === exp.id ? undefined : '#0d0d14' }}>
                      <div className="text-xs font-semibold text-text leading-tight mb-1">{exp.name}</div>
                      <div className="text-xs text-text-dim leading-relaxed">{exp.description}</div>
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        <span className="text-xs font-mono px-1.5 py-0.5 rounded"
                          style={{ background: group.color + '18', color: group.color }}>
                          {exp.n_agents} agents
                        </span>
                        <span className="text-xs font-mono px-1.5 py-0.5 rounded"
                          style={{ background: '#3f3f5a44', color: '#7c7c9a' }}>
                          {exp.max_ticks} ticks
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center gap-4 flex-shrink-0"
          style={{ background: '#0d0d14' }}>
          <div className="flex items-center gap-2">
            <label className="text-xs font-mono text-text-dim">Tick delay</label>
            <select
              value={tickDelay}
              onChange={e => setTickDelay(Number(e.target.value))}
              className="text-xs font-mono px-2 py-1 rounded border border-border text-text"
              style={{ background: '#111118' }}>
              <option value={0.3}>0.3s (szybko)</option>
              <option value={0.8}>0.8s (normalne)</option>
              <option value={1.5}>1.5s (wolno)</option>
              <option value={3}>3s (debug)</option>
            </select>
          </div>
          <div className="flex-1" />
          <Button variant="ghost" onClick={onClose} size="sm">Anuluj</Button>
          <Button
            variant="primary"
            onClick={handleStart}
            disabled={!selected || starting}
            size="sm">
            {starting ? '...' : '▶ Uruchom'}
          </Button>
        </div>
      </div>
    </div>
  )
}
