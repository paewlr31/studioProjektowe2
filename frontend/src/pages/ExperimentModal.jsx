import React, { useEffect, useState } from 'react'
import useSimStore from '../stores/simStore'
import { Button, Badge } from '../components/ui'

const EXP_GROUPS = [
  { id: 1, label: 'Exp 1 — Typy Agentów', color: '#6366f1', rq: 'RQ1, RQ4' },
  { id: 2, label: 'Exp 2 — Zdarzenia', color: '#22d3ee', rq: 'RQ3' },
  { id: 3, label: 'Exp 3 — Pamięć', color: '#a855f7', rq: 'RQ5' },
  { id: 4, label: 'Exp 4 — Cel Agenta', color: '#f59e0b', rq: 'RQ1, RQ2' },
  { id: 5, label: 'Exp 5 — Liczba Agentów', color: '#10b981', rq: 'RQ1, RQ2' },
  { id: 6, label: 'Exp 6 — Dynamika Opinii', color: '#f43f5e', rq: 'RQ6' },
]

const AGENT_COLORS = {
  cooperative: '#22d3ee',
  selfish: '#f59e0b',
  troll: '#ef4444',
  neutral: '#6b7280',
}

const DEFAULT_TOPICS = [
  { id: 'budzet', name: 'Budżet osiedla', description: 'Podział funduszy na remonty i inwestycje', category: 'polarizing' },
  { id: 'zielone', name: 'Zielone tereny', description: 'Parki, skwery i ochrona drzew', category: 'neutral' },
  { id: 'bezpieczenstwo', name: 'Bezpieczeństwo', description: 'Monitoring, oświetlenie, patrole', category: 'neutral' },
  { id: 'parkowanie', name: 'Parkowanie', description: 'Miejsca parkingowe i strefy', category: 'polarizing' },
  { id: 'kultura', name: 'Wydarzenia kulturalne', description: 'Festyny, warsztaty, spotkania', category: 'neutral' },
]

function RangeSlider({ value, onChange, min = 0, max = 100, step = 1, color, label, showPct = true }) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-mono w-28 flex-shrink-0 text-text-dim">{label}</span>
      <div className="flex-1 relative">
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer range-slider"
          style={{
            background: `linear-gradient(90deg, ${color} ${pct}%, #3f3f5a ${pct}%)`,
            accentColor: color,
          }} />
      </div>
      {showPct && (
        <span className="text-xs font-mono w-10 text-right text-text">{value}%</span>
      )}
      {!showPct && (
        <span className="text-xs font-mono w-14 text-right text-text">{value.toFixed(2)}</span>
      )}
    </div>
  )
}

export default function ExperimentModal({ onClose }) {
  const { experiments, fetchExperiments, startExperiment, startCustom } = useSimStore()
  const [selected, setSelected] = useState(null)
  const [tickDelay, setTickDelay] = useState(0.8)
  const [starting, setStarting] = useState(false)

  const [showCustom, setShowCustom] = useState(false)
  const [customN_agents, setCustomN_agents] = useState(20)
  const [customMaxTicks, setCustomMaxTicks] = useState(15)
  const [customGoal, setCustomGoal] = useState('maximize_reputation')
  const [customMemoryMode, setCustomMemoryMode] = useState('full')
  const [customInfluenceRate, setCustomInfluenceRate] = useState(0.15)
  const [customEventMode, setCustomEventMode] = useState('none')
  const [customEventTick, setCustomEventTick] = useState(7)
  const [customEventPeriod, setCustomEventPeriod] = useState(4)
  const [customEventCategory, setCustomEventCategory] = useState('crisis')
  const [customTopics, setCustomTopics] = useState(DEFAULT_TOPICS.map(t => ({ ...t })))
  const [newTopicName, setNewTopicName] = useState('')
  const [newTopicDesc, setNewTopicDesc] = useState('')
  const [newTopicCat, setNewTopicCat] = useState('neutral')

  const [agentTypes, setAgentTypes] = useState({
    cooperative: 50,
    selfish: 30,
    neutral: 20,
    troll: 0,
  })

  useEffect(() => { fetchExperiments() }, [])

  const totalPct = Object.values(agentTypes).reduce((a, b) => a + b, 0)
  const agentTypesValid = totalPct === 100

  const handleSliderChange = (type, value) => {
    setAgentTypes(prev => ({ ...prev, [type]: value }))
  }

  const handleAddTopic = () => {
    if (!newTopicName.trim()) return
    const id = newTopicName.toLowerCase().replace(/[^a-z0-9ąćęłńóśźż]+/g, '-').replace(/(^-|-$)/g, '')
    if (!id || customTopics.some(t => t.id === id)) return
    setCustomTopics(prev => [...prev, {
      id,
      name: newTopicName.trim(),
      description: newTopicDesc.trim(),
      category: newTopicCat,
    }])
    setNewTopicName('')
    setNewTopicDesc('')
    setNewTopicCat('neutral')
  }

  const handleRemoveTopic = (id) => {
    setCustomTopics(prev => prev.filter(t => t.id !== id))
  }

  const buildCustomConfig = () => {
    const agentTypesFraction = {}
    for (const [type, pct] of Object.entries(agentTypes)) {
      if (pct > 0) agentTypesFraction[type] = pct / 100
    }
    const config = {
      n_agents: customN_agents,
      max_ticks: customMaxTicks,
      tick_delay: tickDelay,
      agent_types: agentTypesFraction,
      goal: customGoal,
      memory_mode: customMemoryMode,
      influence_rate: customInfluenceRate,
      topics: customTopics,
    }
    if (customEventMode !== 'none') {
      config.event_mode = customEventMode
      config.event_category = customEventCategory
      if (customEventMode === 'single') config.single_event_tick = customEventTick
      else if (customEventMode === 'cyclic') config.event_period = customEventPeriod
    }
    return config
  }

  const handleStart = async () => {
    setStarting(true)
    if (showCustom) {
      await startCustom(buildCustomConfig())
    } else if (selected) {
      await startExperiment(selected, tickDelay)
    }
    setStarting(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-[780px] max-h-[85vh] flex flex-col rounded-2xl border border-border overflow-hidden"
        style={{ background: '#111118' }}>
        <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-shrink-0"
          style={{ background: '#0d0d14' }}>
          <div>
            <h2 className="text-sm font-semibold text-text font-mono">Wybierz Eksperyment</h2>
            <p className="text-xs text-text-dim mt-0.5">6 eksperymentów badawczych lub własna konfiguracja</p>
          </div>
          <button onClick={onClose} className="text-text-dim hover:text-text text-lg">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {EXP_GROUPS.map(group => {
            const exps = experiments.filter(e => e.experiment === group.id)
            if (exps.length === 0) return null
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
                      onClick={() => { setSelected(selected === exp.id ? null : exp.id); setShowCustom(false) }}
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

          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-px flex-1" style={{ background: '#e2e2f044' }} />
              <button
                onClick={() => { setShowCustom(!showCustom); if (!showCustom) setSelected(null) }}
                className={`text-xs font-mono flex-shrink-0 transition-colors ${
                  showCustom ? 'text-text' : 'text-text-dim hover:text-text'
                }`}>
                🛠 Własna konfiguracja
              </button>
              <div className="h-px flex-1" style={{ background: '#e2e2f044' }} />
            </div>

            {showCustom && (
              <div className="space-y-5 p-4 rounded-xl border border-border animate-fade-in"
                style={{ background: '#0d0d14' }}>

                <div>
                  <h4 className="text-xs font-semibold text-text mb-3 uppercase tracking-wider flex items-center gap-2">
                    <span className="text-accent">●</span> Podstawowe
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-mono text-text-dim">Liczba agentów</label>
                      <input type="number" min={2} max={50} value={customN_agents}
                        onChange={e => setCustomN_agents(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                        className="w-full mt-1 px-3 py-1.5 rounded-lg border border-border text-xs font-mono text-text"
                        style={{ background: '#111118' }} />
                    </div>
                    <div>
                      <label className="text-xs font-mono text-text-dim">Liczba ticków</label>
                      <input type="number" min={1} max={100} value={customMaxTicks}
                        onChange={e => setCustomMaxTicks(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                        className="w-full mt-1 px-3 py-1.5 rounded-lg border border-border text-xs font-mono text-text"
                        style={{ background: '#111118' }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <label className="text-xs font-mono text-text-dim">Cel agentów</label>
                      <select value={customGoal}
                        onChange={e => setCustomGoal(e.target.value)}
                        className="w-full mt-1 px-3 py-1.5 rounded-lg border border-border text-xs font-mono text-text"
                        style={{ background: '#111118' }}>
                        <option value="maximize_reputation">Maksymalizacja reputacji</option>
                        <option value="maximize_interactions">Maksymalizacja interakcji</option>
                        <option value="maintain_group_consensus">Konsensus grupowy</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-mono text-text-dim">Tryb pamięci</label>
                      <select value={customMemoryMode}
                        onChange={e => setCustomMemoryMode(e.target.value)}
                        className="w-full mt-1 px-3 py-1.5 rounded-lg border border-border text-xs font-mono text-text"
                        style={{ background: '#111118' }}>
                        <option value="full">Pełna</option>
                        <option value="short">Krótka (5 ostatnich)</option>
                        <option value="none">Brak</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <h4 className="text-xs font-semibold text-text mb-3 uppercase tracking-wider flex items-center gap-2">
                    <span className="text-selfish">●</span> Typy agentów
                    <span className={`ml-2 font-normal text-xs ${totalPct === 100 ? 'text-cooperative' : 'text-troll'}`}>
                      ({totalPct}%{totalPct !== 100 ? ' — musi być 100%' : ''})
                    </span>
                  </h4>
                  {['cooperative', 'selfish', 'troll', 'neutral'].map(type => (
                    <div key={type} className="mb-2">
                      <RangeSlider label={type} value={agentTypes[type]}
                        color={AGENT_COLORS[type]}
                        onChange={v => handleSliderChange(type, v)} />
                    </div>
                  ))}
                </div>

                <div className="border-t border-border pt-4">
                  <h4 className="text-xs font-semibold text-text mb-3 uppercase tracking-wider flex items-center gap-2">
                    <span className="text-[#a855f7]">●</span> Wpływ opinii
                  </h4>
                  <RangeSlider label="Influence rate" value={Math.round(customInfluenceRate * 100)}
                    color="#a855f7" onChange={v => setCustomInfluenceRate(v / 100)} showPct={false} />
                  <p className="text-xs text-text-dim mt-1">Szybkość zmiany opinii agentów pod wpływem innych (0=brak, 1=bardzo szybko)</p>
                </div>

                <div className="border-t border-border pt-4">
                  <h4 className="text-xs font-semibold text-text mb-3 uppercase tracking-wider flex items-center gap-2">
                    <span className="text-cooperative">●</span> Zdarzenia kontekstowe
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-mono text-text-dim">Tryb zdarzeń</label>
                      <select value={customEventMode}
                        onChange={e => setCustomEventMode(e.target.value)}
                        className="w-full mt-1 px-3 py-1.5 rounded-lg border border-border text-xs font-mono text-text"
                        style={{ background: '#111118' }}>
                        <option value="none">Brak</option>
                        <option value="single">Pojedyncze zdarzenie</option>
                        <option value="cyclic">Cykliczne (co N ticków)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-mono text-text-dim">Kategoria</label>
                      <select value={customEventCategory}
                        onChange={e => setCustomEventCategory(e.target.value)}
                        className="w-full mt-1 px-3 py-1.5 rounded-lg border border-border text-xs font-mono text-text"
                        style={{ background: '#111118' }}>
                        <option value="crisis">Kryzys</option>
                        <option value="positive">Pozytywne</option>
                        <option value="neutral">Neutralne</option>
                      </select>
                    </div>
                  </div>
                  {customEventMode === 'single' && (
                    <div className="mt-3">
                      <label className="text-xs font-mono text-text-dim">Tick zdarzenia</label>
                      <input type="number" min={1} max={100} value={customEventTick}
                        onChange={e => setCustomEventTick(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full mt-1 px-3 py-1.5 rounded-lg border border-border text-xs font-mono text-text"
                        style={{ background: '#111118' }} />
                    </div>
                  )}
                  {customEventMode === 'cyclic' && (
                    <div className="mt-3">
                      <label className="text-xs font-mono text-text-dim">Co ile ticków</label>
                      <input type="number" min={1} max={20} value={customEventPeriod}
                        onChange={e => setCustomEventPeriod(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                        className="w-full mt-1 px-3 py-1.5 rounded-lg border border-border text-xs font-mono text-text"
                        style={{ background: '#111118' }} />
                    </div>
                  )}
                </div>

                <div className="border-t border-border pt-4">
                  <h4 className="text-xs font-semibold text-text mb-3 uppercase tracking-wider flex items-center gap-2">
                    <span className="text-cooperative">●</span> Tematy rozmów
                    <span className="text-text-dim font-normal text-xs ml-1">({customTopics.length})</span>
                  </h4>

                  {customTopics.length > 0 && (
                    <div className="space-y-1 mb-3">
                      {customTopics.map(t => (
                        <div key={t.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border"
                          style={{ background: '#111118' }}>
                          <span className="text-xs font-mono text-text flex-1">{t.name}</span>
                          <Badge type={
                            t.category === 'polarizing' ? 'troll' :
                            t.category === 'local' ? 'accent' : 'neutral'
                          }>{t.category}</Badge>
                          <button onClick={() => handleRemoveTopic(t.id)}
                            className="text-xs text-text-dim hover:text-troll ml-1">✕</button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-4 gap-2">
                    <input type="text" placeholder="Nazwa tematu" value={newTopicName}
                      onChange={e => setNewTopicName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddTopic()}
                      className="px-3 py-1.5 rounded-lg border border-border text-xs font-mono text-text"
                      style={{ background: '#111118' }} />
                    <input type="text" placeholder="Opis" value={newTopicDesc}
                      onChange={e => setNewTopicDesc(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddTopic()}
                      className="px-3 py-1.5 rounded-lg border border-border text-xs font-mono text-text"
                      style={{ background: '#111118' }} />
                    <select value={newTopicCat}
                      onChange={e => setNewTopicCat(e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-border text-xs font-mono text-text"
                      style={{ background: '#111118' }}>
                      <option value="neutral">Neutralny</option>
                      <option value="polarizing">Polaryzujący</option>
                      <option value="local">Lokalny</option>
                    </select>
                    <Button onClick={handleAddTopic} variant="primary" size="sm"
                      disabled={!newTopicName.trim()}>
                      + Dodaj
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border flex items-center gap-4 flex-shrink-0"
          style={{ background: '#0d0d14' }}>
          <div className="flex items-center gap-2">
            <label className="text-xs font-mono text-text-dim">Tick delay</label>
            <select value={tickDelay}
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
          <Button variant="primary" onClick={handleStart}
            disabled={
              (!showCustom && !selected) ||
              starting ||
              (showCustom && (!agentTypesValid || customTopics.length === 0))
            }
            size="sm">
            {starting ? '...' : showCustom ? '▶ Uruchom własną' : '▶ Uruchom'}
          </Button>
        </div>
      </div>
    </div>
  )
}
