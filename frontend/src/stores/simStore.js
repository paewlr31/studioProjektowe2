import { create } from 'zustand'

const API = 'http://localhost:8000'
const WS_URL = 'ws://localhost:8000/ws'

const useSimStore = create((set, get) => ({
  // Connection
  ws: null,
  connected: false,
  wsError: null,

  // Simulation state
  status: 'idle',        // idle | running | paused | finished
  tick: 0,
  maxTicks: 15,
  config: {},

  // Data
  agents: [],
  feed: [],
  metrics: null,
  metricsHistory: [],
  graphData: { nodes: [], edges: [] },
  eventsLog: [],
  lastActions: [],
  currentEvent: null,
  topics: [],
  opinionsHistory: [],

  // Experiments list
  experiments: [],

  // UI
  selectedAgentId: null,
  activeTab: 'dashboard',

  // ── WebSocket ───────────────────────────────────────────────

  connectWS: () => {
    const existing = get().ws
    if (existing) {
      existing.close()
    }
    const ws = new WebSocket(WS_URL)

    ws.onopen = () => {
      set({ connected: true, wsError: null })
    }

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        get()._handleMessage(msg)
      } catch (err) {
        console.error('WS parse error', err)
      }
    }

    ws.onerror = () => set({ wsError: 'WebSocket error' })
    ws.onclose = () => {
      set({ connected: false, ws: null })
      // Reconnect after 3s
      setTimeout(() => {
        if (!get().ws) get().connectWS()
      }, 3000)
    }

    set({ ws })
    // Keepalive ping
    const ping = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: 'ping' }))
      } else {
        clearInterval(ping)
      }
    }, 20000)
  },

  _handleMessage: (msg) => {
    switch (msg.type) {
      case 'connected': {
        const d = msg.data
        set({
          status: d.status,
          tick: d.tick,
          agents: d.agents || [],
          feed: d.feed || [],
          metricsHistory: d.metrics_history || [],
          graphData: d.graph || { nodes: [], edges: [] },
          eventsLog: d.events_log || [],
          config: d.config || {},
          topics: d.topics || [],
        })
        if (d.metrics_history?.length > 0) {
          set({ metrics: d.metrics_history[d.metrics_history.length - 1] })
        }
        break
      }
      case 'status':
        set({ status: msg.data.status, maxTicks: msg.data.max_ticks || 15 })
        break
      case 'tick': {
        const d = msg.data
        const newMetrics = d.metrics
        set((state) => {
          const op = newMetrics?.opinion
          const newOpinionEntry = op ? {
            tick: d.tick,
            polarization: op.polarization,
            consensus: op.consensus,
            extreme_ratio: op.extreme_ratio,
            per_topic: op.per_topic || {},
          } : null
          return {
            tick: d.tick,
            metrics: newMetrics,
            metricsHistory: [...state.metricsHistory, newMetrics],
            graphData: d.graph || state.graphData,
            agents: d.agents || state.agents,
            feed: d.feed || state.feed,
            lastActions: d.actions || [],
            currentEvent: d.event || null,
            topics: d.topics || state.topics,
            opinionsHistory: newOpinionEntry
              ? [...state.opinionsHistory, newOpinionEntry]
              : state.opinionsHistory,
          }
        })
        break
      }
      case 'event':
        set((state) => ({
          currentEvent: msg.data.event,
          eventsLog: [...state.eventsLog, msg.data],
        }))
        break
      case 'finished':
        set({ status: 'finished', currentEvent: null })
        break
      default:
        break
    }
  },

  // ── API calls ───────────────────────────────────────────────

  fetchExperiments: async () => {
    try {
      const r = await fetch(`${API}/experiments`)
      const data = await r.json()
      set({ experiments: data.experiments || [] })
    } catch (e) {
      console.error('fetchExperiments failed', e)
    }
  },

  startExperiment: async (experimentId, tickDelay = 0.8) => {
    set({ metricsHistory: [], lastActions: [], eventsLog: [], currentEvent: null, tick: 0, topics: [], opinionsHistory: [] })
    await fetch(`${API}/simulation/experiment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ experiment_id: experimentId, tick_delay: tickDelay }),
    })
  },

  startCustom: async (config) => {
    set({ metricsHistory: [], lastActions: [], eventsLog: [], currentEvent: null, tick: 0, topics: [], opinionsHistory: [] })
    await fetch(`${API}/simulation/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    })
  },

  pauseSim: () => fetch(`${API}/simulation/pause`, { method: 'POST' }),
  resumeSim: () => fetch(`${API}/simulation/resume`, { method: 'POST' }),
  stopSim: async () => {
    await fetch(`${API}/simulation/stop`, { method: 'POST' })
    set({ status: 'idle' })
  },

  exportResults: async () => {
    const r = await fetch(`${API}/simulation/export`)
    const data = await r.json()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `llm_society_export_tick${get().tick}.json`
    a.click()
  },

  setSelectedAgent: (id) => set({ selectedAgentId: id }),
  setActiveTab: (tab) => set({ activeTab: tab }),
}))

export default useSimStore
