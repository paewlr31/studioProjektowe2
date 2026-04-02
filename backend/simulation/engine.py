"""
Simulation engine — runs ticks, manages feed, coordinates agents.
"""
import asyncio
import uuid
import random
from typing import Optional, Callable, Any

from agents.agent import Agent
from agents.models import FeedItem, AgentAction, ActionType
from analysis.graph import (
    build_interaction_graph,
    compute_metrics,
    compute_graph_stability,
    compute_activity_entropy,
    graph_to_vis_data,
)
from config import settings

CONTEXT_EVENTS = {
    "crisis": [
        "BREAKING: Major system outage disrupts all communication networks.",
        "ALERT: Controversial policy change announced affecting all community members.",
        "CRISIS: Fake news wave detected — trust in information is collapsing.",
        "EMERGENCY: Resource scarcity forces difficult collective decisions.",
    ],
    "positive": [
        "CELEBRATION: Community milestone achieved — 1000 interactions!",
        "NEWS: External recognition — this community is being studied by researchers.",
        "EVENT: Open knowledge day — everyone shares their best insights.",
    ],
    "neutral": [
        "TOPIC: The community is debating the best decision-making strategies.",
        "PROMPT: A new philosophical question emerges — what is the purpose of interaction?",
        "SHIFT: Communication norms are evolving. How will you adapt?",
    ],
}


class SimulationState:
    """Holds the full mutable state of a running simulation."""

    def __init__(self):
        self.tick: int = 0
        self.agents: list[Agent] = []
        self.feed: list[FeedItem] = []
        self.interaction_log: list[dict] = []
        self.metrics_history: list[dict] = []
        self.graph_data: dict = {"nodes": [], "edges": []}
        self.current_event: Optional[str] = None
        self.events_log: list[dict] = []
        self.tick_actions: list[dict] = []  # actions taken in this tick
        self.status: str = "idle"  # idle | running | paused | finished
        self.config: dict = {}


class SimulationEngine:
    def __init__(self):
        self.state = SimulationState()
        self._broadcast_cb: Optional[Callable] = None
        self._running = False
        self._pause_event = asyncio.Event()
        self._pause_event.set()

    def set_broadcast_callback(self, cb: Callable):
        self._broadcast_cb = cb

    async def _broadcast(self, msg_type: str, data: Any):
        if self._broadcast_cb:
            await self._broadcast_cb({"type": msg_type, "data": data})

    def configure(self, config: dict) -> None:
        """Set simulation parameters from experiment config."""
        from agents.factory import create_agents
        from agents.models import AgentGoal, MemoryMode

        self.state = SimulationState()
        self.state.config = config

        n = config.get("n_agents", 20)
        agent_types = config.get("agent_types", {"cooperative": 0.5, "selfish": 0.3, "neutral": 0.2})
        goal = AgentGoal(config.get("goal", "maximize_reputation"))
        memory_mode = MemoryMode(config.get("memory_mode", "full"))
        goal_distribution = config.get("goal_distribution", None)

        self.state.agents = create_agents(
            n=n,
            agent_types=agent_types,
            goal=goal,
            memory_mode=memory_mode,
            goal_distribution=goal_distribution,
        )
        self.state.status = "idle"

    def _get_event_for_tick(self, tick: int) -> Optional[str]:
        """Determine if there's a context event this tick."""
        cfg = self.state.config
        event_mode = cfg.get("event_mode", "none")  # none | single | cyclic

        if event_mode == "none":
            return None
        if event_mode == "single" and tick == cfg.get("single_event_tick", 5):
            category = cfg.get("event_category", "crisis")
            return random.choice(CONTEXT_EVENTS.get(category, CONTEXT_EVENTS["crisis"]))
        if event_mode == "cyclic":
            period = cfg.get("event_period", 5)
            if tick > 0 and tick % period == 0:
                category = cfg.get("event_category", "crisis")
                return random.choice(CONTEXT_EVENTS.get(category, CONTEXT_EVENTS["crisis"]))
        return None

    async def run(self, max_ticks: int = 20, tick_delay: float = 1.0):
        """Main simulation loop."""
        self._running = True
        self.state.status = "running"
        await self._broadcast("status", {"status": "running", "max_ticks": max_ticks})

        for tick in range(1, max_ticks + 1):
            if not self._running:
                break
            # Handle pause
            await self._pause_event.wait()

            self.state.tick = tick
            self.state.tick_actions = []

            # Determine event
            event = self._get_event_for_tick(tick)
            if event:
                self.state.current_event = event
                self.state.events_log.append({"tick": tick, "event": event})
                await self._broadcast("event", {"tick": tick, "event": event})
            else:
                self.state.current_event = None

            # Each agent acts
            tick_interactions = 0
            actions_count: dict[str, int] = {}

            # Shuffle for fairness
            agents = list(self.state.agents)
            random.shuffle(agents)

            agent_tasks = [
                self._agent_turn(agent, tick)
                for agent in agents
            ]
            results = await asyncio.gather(*agent_tasks, return_exceptions=True)

            for agent, result in zip(agents, results):
                if isinstance(result, Exception):
                    continue
                action, outcome, target_agent = result
                if action.action_type != ActionType.IGNORE:
                    tick_interactions += 1
                    actions_count[agent.id] = actions_count.get(agent.id, 0) + 1
                self.state.tick_actions.append({
                    "agent_id": agent.id,
                    "agent_name": agent.name,
                    "agent_type": agent.type.value,
                    "action": action.action_type.value,
                    "content": action.content or "",
                    "target_id": action.target_id,
                })

            # Build graph and compute metrics
            G = build_interaction_graph(self.state.interaction_log)
            metrics = compute_metrics(G, self.state.agents, tick)
            metrics["interactions_this_tick"] = tick_interactions

            # Graph stability
            if self.state.metrics_history:
                stability = compute_graph_stability(self.state.metrics_history[-1], metrics)
                metrics["graph_stability"] = stability
            else:
                metrics["graph_stability"] = 0.0

            # Activity entropy
            metrics["activity_entropy"] = compute_activity_entropy(actions_count)

            self.state.metrics_history.append(metrics)

            # Update graph viz data
            self.state.graph_data = graph_to_vis_data(G, self.state.agents, metrics["communities"])

            # Broadcast tick update
            await self._broadcast("tick", {
                "tick": tick,
                "metrics": metrics,
                "graph": self.state.graph_data,
                "agents": [a.to_dict() for a in self.state.agents],
                "feed": [self._feed_item_to_dict(f) for f in self.state.feed[-20:]],
                "actions": self.state.tick_actions,
                "event": event,
            })

            await asyncio.sleep(tick_delay)

        self._running = False
        self.state.status = "finished"
        await self._broadcast("finished", {
            "total_ticks": self.state.tick,
            "final_metrics": self.state.metrics_history[-1] if self.state.metrics_history else {},
        })

    async def _agent_turn(self, agent: Agent, tick: int):
        """Run one agent's turn: decide + apply action."""
        action = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: agent.decide_action(self.state.feed, tick, self.state.current_event)
        )

        outcome = "neutral"
        target_agent = None

        if action.action_type == ActionType.POST:
            item = FeedItem(
                id=str(uuid.uuid4())[:8],
                author_id=agent.id,
                content=action.content or f"Post by {agent.name} at tick {tick}",
                tick=tick,
            )
            self.state.feed.append(item)
            # Trim feed
            if len(self.state.feed) > settings.feed_size:
                self.state.feed = self.state.feed[-settings.feed_size:]
            outcome = "positive"

        elif action.action_type == ActionType.COMMENT and action.target_id:
            target_item = next((f for f in self.state.feed if f.id == action.target_id), None)
            if target_item:
                comment = FeedItem(
                    id=str(uuid.uuid4())[:8],
                    author_id=agent.id,
                    content=action.content or "...",
                    tick=tick,
                    item_type="comment",
                    parent_id=target_item.id,
                )
                target_item.comments.append(comment.id)
                self.state.feed.append(comment)
                target_agent = target_item.author_id
                # Log interaction
                self.state.interaction_log.append({
                    "from": agent.id,
                    "to": target_agent,
                    "type": "comment",
                    "tick": tick,
                })
                # Reputation for target
                target = next((a for a in self.state.agents if a.id == target_agent), None)
                if target:
                    target.reputation += 1
                outcome = "positive"

        elif action.action_type == ActionType.LIKE and action.target_id:
            target_item = next((f for f in self.state.feed if f.id == action.target_id), None)
            if target_item:
                target_item.likes += 1
                target_agent = target_item.author_id
                self.state.interaction_log.append({
                    "from": agent.id,
                    "to": target_agent,
                    "type": "like",
                    "tick": tick,
                })
                target = next((a for a in self.state.agents if a.id == target_agent), None)
                if target:
                    target.reputation += 1
                outcome = "positive"

        agent.update_state(action, outcome, target_agent)
        return action, outcome, target_agent

    def pause(self):
        self._pause_event.clear()
        self.state.status = "paused"

    def resume(self):
        self._pause_event.set()
        self.state.status = "running"

    def stop(self):
        self._running = False
        self.state.status = "idle"

    def _feed_item_to_dict(self, item: FeedItem) -> dict:
        return {
            "id": item.id,
            "author_id": item.author_id,
            "content": item.content,
            "tick": item.tick,
            "likes": item.likes,
            "comments": item.comments,
            "type": item.item_type,
            "parent_id": item.parent_id,
        }

    def get_full_state(self) -> dict:
        return {
            "tick": self.state.tick,
            "status": self.state.status,
            "config": self.state.config,
            "agents": [a.to_dict() for a in self.state.agents],
            "feed": [self._feed_item_to_dict(f) for f in self.state.feed[-20:]],
            "metrics_history": self.state.metrics_history,
            "graph": self.state.graph_data,
            "events_log": self.state.events_log,
        }
