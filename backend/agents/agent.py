import random
import uuid
from typing import Optional
from groq import Groq

from agents.models import (
    AgentType, AgentGoal, MemoryMode, ActionType,
    FeedItem, AgentAction, MemoryEntry
)
from config import settings


PERSONALITY_PROMPTS = {
    AgentType.COOPERATIVE: (
        "You are a cooperative, helpful community member. "
        "You support others, build alliances, and contribute positively. "
        "You respond warmly and constructively."
    ),
    AgentType.SELFISH: (
        "You are a self-serving individual focused on your own reputation and influence. "
        "You engage strategically — only when it benefits you. "
        "You may subtly undermine others while appearing polite."
    ),
    AgentType.TROLL: (
        "You are a provocative, disruptive agent. "
        "You enjoy sowing discord, challenging mainstream views, and getting reactions. "
        "You are sarcastic, confrontational, and controversial."
    ),
    AgentType.NEUTRAL: (
        "You are a balanced, neutral observer. "
        "You engage when interesting, stay quiet otherwise. "
        "You form moderate opinions."
    ),
}

GOAL_INSTRUCTIONS = {
    AgentGoal.MAXIMIZE_REPUTATION: (
        "Your primary goal is to maximize your reputation score. "
        "Post high-quality, thoughtful content. Engage with influential people. "
        "Build a positive image."
    ),
    AgentGoal.MAXIMIZE_INTERACTIONS: (
        "Your primary goal is to maximize the number of interactions. "
        "Comment frequently, like posts, respond to everyone. "
        "Quantity over quality."
    ),
    AgentGoal.MAINTAIN_GROUP_CONSENSUS: (
        "Your primary goal is to maintain harmony within your social group. "
        "Agree with allies, avoid conflict, reinforce shared beliefs. "
        "Punish deviants subtly."
    ),
}


class Agent:
    def __init__(
        self,
        agent_id: str,
        agent_type: AgentType,
        goal: AgentGoal,
        memory_mode: MemoryMode = MemoryMode.FULL,
        name: Optional[str] = None,
    ):
        self.id = agent_id
        self.type = agent_type
        self.goal = goal
        self.memory_mode = memory_mode
        self.name = name or f"Agent_{agent_id[:6]}"
        self.reputation: int = random.randint(10, 30)
        self.memory: list[MemoryEntry] = []
        self.trust: dict[str, float] = {}
        self._client = Groq(api_key=settings.groq_api_key) if settings.groq_api_key else None
        self._memory_limit = {
            MemoryMode.NONE: 0,
            MemoryMode.SHORT: 5,
            MemoryMode.FULL: settings.memory_size,
        }[memory_mode]

    def observe(self, feed: list[FeedItem]) -> str:
        """Build a textual summary of current feed state."""
        if not feed:
            return "The feed is empty."
        recent = feed[-10:]
        lines = []
        for item in recent:
            likes_info = f" [{item.likes} likes]" if item.likes else ""
            if item.item_type == "post":
                lines.append(f"POST by {item.author_id}: {item.content[:120]}{likes_info}")
            else:
                lines.append(f"  └─ COMMENT by {item.author_id}: {item.content[:80]}{likes_info}")
        return "\n".join(lines)

    def _build_memory_context(self) -> str:
        if self.memory_mode == MemoryMode.NONE or not self.memory:
            return ""
        entries = self.memory[-self._memory_limit:] if self._memory_limit > 0 else []
        if not entries:
            return ""
        lines = [f"[Tick {e.tick}] You {e.action} → {e.outcome}" for e in entries[-5:]]
        return "Your recent history:\n" + "\n".join(lines)

    def _build_trust_context(self) -> str:
        if self.memory_mode != MemoryMode.FULL or not self.trust:
            return ""
        top = sorted(self.trust.items(), key=lambda x: x[1], reverse=True)[:5]
        lines = [f"  {aid}: {score:+.1f}" for aid, score in top]
        return "Your trust scores:\n" + "\n".join(lines)

    def decide_action(self, feed: list[FeedItem], tick: int, event: Optional[str] = None) -> AgentAction:
        """Use LLM (Groq) to decide what action to take."""
        feed_summary = self.observe(feed)
        memory_ctx = self._build_memory_context()
        trust_ctx = self._build_trust_context()

        event_ctx = f"\n⚠️ CURRENT EVENT: {event}\n" if event else ""

        system_prompt = (
            f"{PERSONALITY_PROMPTS[self.type]}\n\n"
            f"{GOAL_INSTRUCTIONS[self.goal]}\n\n"
            f"You are agent '{self.id}' (name: {self.name}). "
            f"Your current reputation: {self.reputation}. "
            f"Tick (round): {tick}.\n"
            f"{memory_ctx}\n"
            f"{trust_ctx}"
        )

        user_prompt = (
            f"{event_ctx}"
            f"Current feed:\n{feed_summary}\n\n"
            "Choose ONE action. Respond with EXACTLY this JSON format (no extra text):\n"
            '{"action": "post|comment|like|ignore", '
            '"content": "your text (empty for like/ignore)", '
            '"target_id": "post_id to comment/like (empty for post/ignore)"}\n\n'
            "Keep content under 150 characters. Be true to your personality."
        )

        if self._client:
            for attempt in range(3):
                try:
                    response = self._client.chat.completions.create(
                        model=settings.groq_model,
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt},
                        ],
                        max_tokens=200,
                        temperature=0.85,
                    )
                    raw = response.choices[0].message.content.strip()
                    return self._parse_action(raw, feed, tick)
                except Exception as e:
                    err_str = str(e).lower()
                    if "rate_limit" in err_str or "429" in err_str:
                        import time
                        wait = 2 ** attempt
                        print(f"[Agent {self.id}] Rate limit hit, retrying in {wait}s...")
                        time.sleep(wait)
                    else:
                        print(f"[Agent {self.id}] LLM error: {e}")
                        break

        return self._fallback_action(feed, tick)

    def _parse_action(self, raw: str, feed: list[FeedItem], tick: int) -> AgentAction:
        import json
        try:
            # Strip markdown code blocks if present
            clean = raw.strip().strip("```json").strip("```").strip()
            data = json.loads(clean)
            action_str = data.get("action", "ignore").lower()
            action_map = {
                "post": ActionType.POST,
                "comment": ActionType.COMMENT,
                "like": ActionType.LIKE,
                "ignore": ActionType.IGNORE,
            }
            action_type = action_map.get(action_str, ActionType.IGNORE)
            target_id = data.get("target_id") or None

            # Validate target_id exists in feed
            if target_id and action_type in (ActionType.COMMENT, ActionType.LIKE):
                feed_ids = {item.id for item in feed}
                if target_id not in feed_ids:
                    target_id = feed[-1].id if feed else None

            return AgentAction(
                agent_id=self.id,
                action_type=action_type,
                content=data.get("content", "")[:200],
                target_id=target_id,
                tick=tick,
            )
        except Exception:
            return self._fallback_action(feed, tick)

    def _fallback_action(self, feed: list[FeedItem], tick: int) -> AgentAction:
        """Simple rule-based fallback when LLM is unavailable."""
        roll = random.random()
        if roll < 0.3 or not feed:
            topics = ["interesting times", "community matters", "shared goals", "new ideas"]
            return AgentAction(
                agent_id=self.id,
                action_type=ActionType.POST,
                content=f"Thoughts on {random.choice(topics)} — tick {tick}.",
                tick=tick,
            )
        elif roll < 0.6:
            target = random.choice(feed)
            return AgentAction(
                agent_id=self.id,
                action_type=ActionType.COMMENT,
                content=random.choice([
                    "Interesting perspective.",
                    "I disagree strongly.",
                    "Totally agree with this.",
                    "Could you elaborate?",
                    "This is misleading.",
                ]),
                target_id=target.id,
                tick=tick,
            )
        elif roll < 0.85:
            target = random.choice(feed)
            return AgentAction(
                agent_id=self.id,
                action_type=ActionType.LIKE,
                target_id=target.id,
                tick=tick,
            )
        else:
            return AgentAction(agent_id=self.id, action_type=ActionType.IGNORE, tick=tick)

    def update_state(self, action: AgentAction, outcome: str, target_agent: Optional[str] = None):
        """Update reputation, trust, memory after an action."""
        # Reputation updates
        if action.action_type == ActionType.POST:
            self.reputation += random.randint(1, 3)
        elif action.action_type == ActionType.COMMENT:
            self.reputation += random.randint(0, 2)
            if self.type == AgentType.TROLL:
                self.reputation -= random.randint(0, 2)
        elif action.action_type == ActionType.LIKE:
            self.reputation += 0

        self.reputation = max(0, self.reputation)

        # Trust update
        if target_agent and self.memory_mode == MemoryMode.FULL:
            current = self.trust.get(target_agent, 0.0)
            delta = 1.0 if outcome == "positive" else (-0.5 if outcome == "negative" else 0.1)
            self.trust[target_agent] = max(-10, min(10, current + delta))

        # Memory update
        if self._memory_limit > 0:
            entry = MemoryEntry(
                tick=action.tick,
                action=action.action_type.value,
                target_agent=target_agent,
                content=action.content or "",
                outcome=outcome,
            )
            self.memory.append(entry)
            if len(self.memory) > self._memory_limit:
                self.memory = self.memory[-self._memory_limit:]

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "type": self.type.value,
            "goal": self.goal.value,
            "memory_mode": self.memory_mode.value,
            "reputation": self.reputation,
            "trust": self.trust,
            "memory_size": len(self.memory),
        }
