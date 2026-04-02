import React from 'react'
import { Button } from '../ui'
import useSimStore from '../../stores/simStore'

export default function SimControls({ onExperimentClick }) {
  const { status, pauseSim, resumeSim, stopSim, exportResults } = useSimStore()

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {status === 'idle' || status === 'finished' ? (
        <Button onClick={onExperimentClick} variant="primary" size="sm">
          ⚗ Wybierz Eksperyment
        </Button>
      ) : null}

      {status === 'running' && (
        <Button onClick={pauseSim} variant="ghost" size="sm">
          ⏸ Pauza
        </Button>
      )}

      {status === 'paused' && (
        <Button onClick={resumeSim} variant="success" size="sm">
          ▶ Wznów
        </Button>
      )}

      {(status === 'running' || status === 'paused') && (
        <Button onClick={stopSim} variant="danger" size="sm">
          ■ Stop
        </Button>
      )}

      {(status === 'finished' || status === 'paused') && (
        <Button onClick={exportResults} variant="ghost" size="sm">
          ↓ Eksportuj JSON
        </Button>
      )}
    </div>
  )
}
