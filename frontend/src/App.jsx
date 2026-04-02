import React, { useEffect } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import useSimStore from './stores/simStore'
import Dashboard from './pages/Dashboard'
import Experiments from './pages/Experiments'
import GraphPage from './pages/GraphPage'
import ReportPage from './pages/ReportPage'
import FeedPage from './pages/FeedPage'

const NAV = [
  { to: '/', label: 'Dashboard', icon: '⬡' },
  { to: '/experiments', label: 'Eksperymenty', icon: '⚗' },
  { to: '/graph', label: 'Graf', icon: '◎' },
  { to: '/feed', label: 'Feed', icon: '◈' },
  { to: '/report', label: 'Raport', icon: '▦' },
]

export default function App() {
  const { connectWS, connected, status, tick, maxTicks } = useSimStore()

  useEffect(() => {
    connectWS()
  }, [])

  const progress = maxTicks > 0 ? (tick / maxTicks) * 100 : 0

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0a0a0f' }}>
      {/* Sidebar */}
      <aside className="w-56 flex flex-col border-r border-border flex-shrink-0" style={{ background: '#0d0d14' }}>
        {/* Logo */}
        <div className="px-5 py-5 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded grid place-items-center text-xs font-mono font-bold"
              style={{ background: 'linear-gradient(135deg, #6366f1, #22d3ee)', color: '#fff' }}>
              ⬡
            </div>
            <div>
              <div className="text-xs font-semibold text-text leading-none">LLM Society</div>
              <div className="text-xs text-text-dim font-mono leading-none mt-0.5">Simulator</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ to, label, icon }) => (
            <NavLink key={to} to={to} end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-accent text-white font-medium'
                    : 'text-text-dim hover:text-text hover:bg-surface'
                }`
              }>
              <span className="text-base w-4 text-center">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Status panel */}
        <div className="px-4 py-4 border-t border-border space-y-3">
          {/* WS status */}
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-cooperative' : 'bg-troll'}`}
              style={{ boxShadow: connected ? '0 0 6px #22d3ee' : '0 0 6px #ef4444' }} />
            <span className="text-xs font-mono text-text-dim">
              {connected ? 'connected' : 'disconnected'}
            </span>
          </div>

          {/* Sim status */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-xs font-mono text-text-dim">tick</span>
              <span className="text-xs font-mono text-text">{tick}/{maxTicks}</span>
            </div>
            <div className="h-1 rounded-full overflow-hidden" style={{ background: '#1e1e2e' }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progress}%`,
                  background: status === 'running'
                    ? 'linear-gradient(90deg, #6366f1, #22d3ee)'
                    : status === 'finished'
                    ? '#22d3ee'
                    : '#3f3f5a'
                }} />
            </div>
            <div className="text-xs font-mono text-center"
              style={{ color: status === 'running' ? '#6366f1' : status === 'finished' ? '#22d3ee' : '#7c7c9a' }}>
              {status}
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/experiments" element={<Experiments />} />
          <Route path="/graph" element={<GraphPage />} />
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/report" element={<ReportPage />} />
        </Routes>
      </main>
    </div>
  )
}
