import React, { useEffect, useState } from 'react'
import useSimStore from '../stores/simStore'
import { Card, Button, SectionHeader } from '../components/ui'
import ExperimentModal from './ExperimentModal'

const RQS = [
  { id: 'RQ1', q: 'Czy w systemie agentów LLM powstają spontaniczne grupy społeczne (klastry)?', exps: ['1A', '1B', '1C', '5A', '5B', '5C'] },
  { id: 'RQ2', q: 'Czy wśród agentów wyłaniają się liderzy (wysoka centralność w grafie)?', exps: ['1A', '1B', '4A', '4B', '4C'] },
  { id: 'RQ3', q: 'Jaki wpływ mają zdarzenia kontekstowe na strukturę interakcji?', exps: ['2A', '2B', '2C'] },
  { id: 'RQ4', q: 'Czy obecność agentów manipulacyjnych zwiększa polaryzację społeczności?', exps: ['1A', '1B', '1C'] },
  { id: 'RQ5', q: 'Czy pamięć interakcji wpływa na stabilność relacji między agentami?', exps: ['3A', '3B', '3C'] },
]

export default function Experiments() {
  const { experiments, fetchExperiments, startExperiment, status } = useSimStore()
  const [showModal, setShowModal] = useState(false)

  useEffect(() => { fetchExperiments() }, [])

  const byGroup = [1, 2, 3, 4, 5].map(n => ({
    n,
    exps: experiments.filter(e => e.experiment === n),
  }))

  return (
    <div className="h-full overflow-y-auto px-8 py-6 space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-bold text-text font-mono">Eksperymenty Badawcze</h1>
          <p className="text-sm text-text-dim mt-1">5 hipotez · 14 konfiguracji · Groq LLM</p>
        </div>
        <Button onClick={() => setShowModal(true)} variant="primary">
          ⚗ Uruchom Eksperyment
        </Button>
      </div>

      {/* Research Questions */}
      <Card>
        <SectionHeader title="Pytania Badawcze" />
        <div className="space-y-3">
          {RQS.map(rq => (
            <div key={rq.id} className="flex gap-4">
              <span className="text-xs font-mono font-bold text-accent flex-shrink-0 pt-0.5">{rq.id}</span>
              <div className="flex-1">
                <p className="text-xs text-text leading-relaxed">{rq.q}</p>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {rq.exps.map(e => (
                    <span key={e} className="text-xs font-mono px-1.5 py-0.5 rounded"
                      style={{ background: '#6366f122', color: '#6366f1' }}>
                      Exp {e}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Experiment groups */}
      {byGroup.map(({ n, exps }) => (
        <div key={n}>
          <SectionHeader
            title={`Eksperyment ${n}`}
            sub={exps[0]?.description?.split('—')[0] || ''}
          />
          <div className="grid grid-cols-3 gap-4">
            {exps.map(exp => (
              <Card key={exp.id} className="space-y-3 hover:border-accent/50 cursor-pointer transition-colors"
                onClick={() => startExperiment(exp.id)}>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-xs font-semibold text-text leading-tight">{exp.name}</h3>
                </div>
                <p className="text-xs text-text-dim leading-relaxed">{exp.description}</p>
                <div className="grid grid-cols-2 gap-1 text-xs font-mono">
                  <div>
                    <span className="text-text-dim">agents: </span>
                    <span className="text-text">{exp.n_agents}</span>
                  </div>
                  <div>
                    <span className="text-text-dim">ticks: </span>
                    <span className="text-text">{exp.max_ticks}</span>
                  </div>
                  <div>
                    <span className="text-text-dim">memory: </span>
                    <span className="text-text">{exp.memory_mode}</span>
                  </div>
                  <div>
                    <span className="text-text-dim">events: </span>
                    <span className="text-text">{exp.event_mode}</span>
                  </div>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {Object.entries(exp.agent_types || {}).map(([type, frac]) => (
                    <span key={type} className="text-xs px-1.5 py-0.5 rounded font-mono"
                      style={{
                        background: {cooperative:'#22d3ee',selfish:'#f59e0b',troll:'#ef4444',neutral:'#6b7280'}[type]+'18',
                        color: {cooperative:'#22d3ee',selfish:'#f59e0b',troll:'#ef4444',neutral:'#6b7280'}[type],
                      }}>
                      {type} {Math.round(frac * 100)}%
                    </span>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {showModal && <ExperimentModal onClose={() => setShowModal(false)} />}
    </div>
  )
}
