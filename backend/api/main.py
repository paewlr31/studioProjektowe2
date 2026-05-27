"""
FastAPI backend — REST endpoints + WebSocket for real-time simulation streaming.
"""
import asyncio
import json
import uuid
from typing import Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from simulation.engine import SimulationEngine
from simulation.experiments import EXPERIMENTS
from analysis.graph import build_interaction_graph, compute_metrics, graph_to_vis_data

app = FastAPI(title="LLM Society Simulator", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global simulation engine (single-instance for demo)
engine = SimulationEngine()
_sim_task: Optional[asyncio.Task] = None

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        if ws in self.active:
            self.active.remove(ws)

    async def broadcast(self, message: dict):
        data = json.dumps(message)
        dead = []
        for ws in self.active:
            try:
                await ws.send_text(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

manager = ConnectionManager()

# Register broadcast callback
async def broadcast_cb(msg: dict):
    await manager.broadcast(msg)

engine.set_broadcast_callback(broadcast_cb)


# ── Pydantic models ────────────────────────────────────────────────────────────

class SimulationConfig(BaseModel):
    n_agents: int = 20
    agent_types: dict = {"cooperative": 0.5, "selfish": 0.3, "neutral": 0.2}
    goal: str = "maximize_reputation"
    memory_mode: str = "full"
    event_mode: str = "none"
    single_event_tick: Optional[int] = 5
    event_period: Optional[int] = 5
    event_category: Optional[str] = "crisis"
    max_ticks: int = 15
    tick_delay: float = 0.5
    goal_distribution: Optional[dict] = None
    topics: Optional[list[dict]] = None
    influence_rate: Optional[float] = None


class ExperimentRequest(BaseModel):
    experiment_id: str
    tick_delay: float = 0.8


# ── REST Endpoints ─────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {"status": "ok", "service": "LLM Society Simulator"}


@app.get("/experiments")
async def list_experiments():
    """Return all available experiment presets."""
    return {"experiments": list(EXPERIMENTS.values())}


@app.post("/simulation/configure")
async def configure_simulation(config: SimulationConfig):
    """Configure a new simulation without starting it."""
    global _sim_task
    if _sim_task and not _sim_task.done():
        engine.stop()
        _sim_task.cancel()
        try:
            await _sim_task
        except asyncio.CancelledError:
            pass

    engine.configure(config.model_dump())
    return {"status": "configured", "agents": len(engine.state.agents)}


@app.post("/simulation/start")
async def start_simulation(background_tasks: BackgroundTasks, config: Optional[SimulationConfig] = None):
    """Configure (optional) and start simulation."""
    global _sim_task

    if _sim_task and not _sim_task.done():
        raise HTTPException(status_code=409, detail="Simulation already running")

    if config:
        engine.configure(config.model_dump())

    if not engine.state.agents:
        raise HTTPException(status_code=400, detail="No agents configured. Call /configure first.")

    max_ticks = engine.state.config.get("max_ticks", 15)
    tick_delay = engine.state.config.get("tick_delay", 0.8)

    _sim_task = asyncio.create_task(engine.run(max_ticks=max_ticks, tick_delay=tick_delay))
    return {"status": "started", "max_ticks": max_ticks}


@app.post("/simulation/experiment")
async def run_experiment(req: ExperimentRequest):
    """Load experiment preset and start simulation."""
    global _sim_task

    if req.experiment_id not in EXPERIMENTS:
        raise HTTPException(status_code=404, detail=f"Experiment '{req.experiment_id}' not found")

    if _sim_task and not _sim_task.done():
        engine.stop()
        _sim_task.cancel()
        try:
            await _sim_task
        except asyncio.CancelledError:
            pass
        await asyncio.sleep(0.2)

    config = {**EXPERIMENTS[req.experiment_id], "tick_delay": req.tick_delay}
    engine.configure(config)

    max_ticks = config.get("max_ticks", 15)
    _sim_task = asyncio.create_task(engine.run(max_ticks=max_ticks, tick_delay=req.tick_delay))

    return {"status": "started", "experiment": req.experiment_id, "max_ticks": max_ticks}


@app.post("/simulation/pause")
async def pause_simulation():
    engine.pause()
    return {"status": "paused"}


@app.post("/simulation/resume")
async def resume_simulation():
    engine.resume()
    return {"status": "running"}


@app.post("/simulation/stop")
async def stop_simulation():
    global _sim_task
    engine.stop()
    if _sim_task:
        _sim_task.cancel()
    return {"status": "stopped"}


@app.get("/simulation/state")
async def get_state():
    """Return current full simulation state."""
    return engine.get_full_state()


@app.get("/simulation/metrics")
async def get_metrics():
    """Return full metrics history."""
    return {
        "metrics_history": engine.state.metrics_history,
        "events_log": engine.state.events_log,
    }


@app.get("/simulation/export")
async def export_results():
    """Export complete simulation results for analysis."""
    return {
        "config": engine.state.config,
        "agents": [a.to_dict() for a in engine.state.agents],
        "metrics_history": engine.state.metrics_history,
        "events_log": engine.state.events_log,
        "interaction_log": engine.state.interaction_log[-500:],  # last 500
        "total_ticks": engine.state.tick,
    }


@app.get("/agents")
async def get_agents():
    return {"agents": [a.to_dict() for a in engine.state.agents]}


@app.get("/feed")
async def get_feed():
    feed = engine.state.feed[-30:]
    return {"feed": [engine._feed_item_to_dict(f) for f in feed]}


# ── WebSocket ──────────────────────────────────────────────────────────────────

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    # Send current state immediately on connect
    try:
        await websocket.send_text(json.dumps({
            "type": "connected",
            "data": engine.get_full_state()
        }))
        while True:
            # Keep connection alive; client can send control messages
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30)
                msg = json.loads(data)
                if msg.get("action") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except asyncio.TimeoutError:
                await websocket.send_text(json.dumps({"type": "heartbeat"}))
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        manager.disconnect(websocket)
