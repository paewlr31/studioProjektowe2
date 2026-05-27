import random
import uuid
from typing import Optional
from groq import Groq

from agents.models import (
    AgentType, AgentGoal, MemoryMode, ActionType,
    FeedItem, AgentAction, MemoryEntry, Topic, Opinion
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
        topics: Optional[list[Topic]] = None,
    ):
        self.id = agent_id
        self.type = agent_type
        self.goal = goal
        self.memory_mode = memory_mode
        self.name = name or f"Agent_{agent_id[:6]}"
        self.reputation: int = random.randint(10, 30)
        self.memory: list[MemoryEntry] = []
        self.trust: dict[str, float] = {}
        self.topics: list[Topic] = topics or []
        self.opinions: dict[str, Opinion] = {}
        self._init_opinions()
        self.energy: int = settings.max_energy
        self._client = Groq(api_key=settings.groq_api_key) if settings.groq_api_key else None
        self._memory_limit = {
            MemoryMode.NONE: 0,
            MemoryMode.SHORT: 5,
            MemoryMode.FULL: settings.memory_size,
        }[memory_mode]

    def _init_opinions(self):
        for topic in self.topics:
            if self.type == AgentType.COOPERATIVE:
                value = random.uniform(-0.3, 0.3)
                confidence = random.uniform(0.3, 0.6)
            elif self.type == AgentType.SELFISH:
                value = random.uniform(-0.5, 0.5)
                confidence = random.uniform(0.2, 0.5)
            elif self.type == AgentType.TROLL:
                value = random.choice([random.uniform(-1.0, -0.6), random.uniform(0.6, 1.0)])
                confidence = random.uniform(0.6, 0.9)
            else:
                value = random.uniform(-0.4, 0.4)
                confidence = random.uniform(0.3, 0.6)
            self.opinions[topic.id] = Opinion(topic_id=topic.id, value=value, confidence=confidence)

    def observe(self, feed: list[FeedItem]) -> str:
        """Build a textual summary of current feed state."""
        if not feed:
            return "The feed is empty."
        recent = feed[-10:]
        lines = []
        for item in recent:
            likes_info = f" [{item.likes} likes]" if item.likes else ""
            topic_info = f" [topic: {item.topic}]" if item.topic else ""
            stance_info = f" ({item.stance})" if item.stance else ""
            if item.item_type == "post":
                lines.append(f"POST by {item.author_id}: {item.content[:120]}{topic_info}{stance_info}{likes_info}")
            else:
                lines.append(f"  └─ COMMENT by {item.author_id}: {item.content[:80]}{topic_info}{stance_info}{likes_info}")
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

    def _build_opinion_context(self) -> str:
        if not self.topics:
            return ""
        lines = ["Current topics and your stance:"]
        for topic in self.topics:
            opinion = self.opinions.get(topic.id)
            if opinion:
                val_str = "FOR" if opinion.value > 0.2 else ("AGAINST" if opinion.value < -0.2 else "NEUTRAL")
                lines.append(f"- \"{topic.name}\": you are {val_str} (confidence {opinion.confidence:.1f})")
        ratio = settings.topic_expression_ratio
        lines.append(f"\nWith probability {ratio:.0%}, your post/comment MUST reference one of these topics.")
        return "\n".join(lines)

    def _build_energy_context(self) -> str:
        costs = {
            "POST": settings.post_energy_cost,
            "COMMENT": settings.comment_energy_cost,
            "LIKE": settings.like_energy_cost,
            "IGNORE": settings.ignore_energy_cost,
        }
        lines = [
            f"Your energy: {self.energy}/{settings.max_energy}",
            f"You regain {settings.energy_regen} energy each tick.",
            "Action costs:"
        ]
        for action, cost in costs.items():
            lines.append(f"  {action}={cost}")
        lines.append("Choose an action you can afford with your current energy.")
        return "\n".join(lines)

    def get_action_cost(self, action_type: ActionType) -> int:
        costs = {
            ActionType.POST: settings.post_energy_cost,
            ActionType.COMMENT: settings.comment_energy_cost,
            ActionType.LIKE: settings.like_energy_cost,
            ActionType.IGNORE: settings.ignore_energy_cost,
        }
        base = costs[action_type]
        if self.type == AgentType.COOPERATIVE and action_type in (ActionType.COMMENT, ActionType.LIKE):
            base = max(0, base - 5)
        if self.type == AgentType.SELFISH and action_type == ActionType.POST:
            base = max(0, base - 5)
        if self.type == AgentType.TROLL and action_type == ActionType.COMMENT:
            base = max(0, base - 5)
        return base

    def deduct_energy(self, action_type: ActionType):
        self.energy = max(0, self.energy - self.get_action_cost(action_type))

    def regenerate_energy(self):
        self.energy = min(settings.max_energy, self.energy + settings.energy_regen)

    def decide_action(self, feed: list[FeedItem], tick: int, event: Optional[str] = None) -> AgentAction:
        """Use LLM (Groq) to decide what action to take."""
        feed_summary = self.observe(feed)
        memory_ctx = self._build_memory_context()
        trust_ctx = self._build_trust_context()
        opinion_ctx = self._build_opinion_context()
        energy_ctx = self._build_energy_context()

        WORLD_CONTEXT = (
            "You are members of a local neighborhood forum for 'Pine Valley'. "
            "Common topics include: local politics, neighborhood safety, parking issues, "
            "lost pets, and community events. Talk strictly about these neighborhood matters."
        )

        event_ctx = f"\n⚠️ CURRENT EVENT: {event}\n" if event else ""

        system_prompt = (
            f"{WORLD_CONTEXT}\n\n"
            f"{PERSONALITY_PROMPTS[self.type]}\n\n"
            f"{GOAL_INSTRUCTIONS[self.goal]}\n\n"
            f"You are agent '{self.id}' (name: {self.name}). "
            f"Your current reputation: {self.reputation}. "
            f"Tick (round): {tick}.\n"
            f"{memory_ctx}\n"
            f"{trust_ctx}\n"
            f"{opinion_ctx}\n"
            f"{energy_ctx}"
        )

        user_prompt = (
            f"{event_ctx}"
            f"Current feed:\n{feed_summary}\n\n"
            "Choose ONE action you can afford. Respond with EXACTLY this JSON format (no extra text):\n"
            '{"action": "post|comment|like|ignore", '
            '"content": "your text (empty for like/ignore)", '
            '"target_id": "post_id to comment/like (empty for post/ignore)", '
            '"topic": "topic_id or empty", '
            '"stance": "for|against|neutral or empty"}\n\n'
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

            # Extract topic and stance
            topic = data.get("topic") or None
            stance = data.get("stance") or None
            if stance and stance not in ("for", "against", "neutral"):
                stance = None
            if topic and topic not in {t.id for t in self.topics}:
                topic = self._detect_topic_from_content(data.get("content", ""))
            if topic and not stance:
                stance = self._infer_stance(topic)

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
                topic=topic,
                stance=stance,
                tick=tick,
            )
        except Exception:
            return self._fallback_action(feed, tick)

    def _detect_topic_from_content(self, content: str) -> Optional[str]:
        if not content or not self.topics:
            return None
        content_lower = content.lower()
        for topic in self.topics:
            if topic.name.lower() in content_lower or topic.description.lower() in content_lower:
                return topic.id
        return None

    def _infer_stance(self, topic_id: str) -> str:
        opinion = self.opinions.get(topic_id)
        if opinion is None:
            return "neutral"
        if opinion.value > 0.2:
            return "for"
        elif opinion.value < -0.2:
            return "against"
        return "neutral"

    def _fallback_action(self, feed: list[FeedItem], tick: int) -> AgentAction:
        """Simple rule-based fallback when LLM is unavailable."""
        post_cost = self.get_action_cost(ActionType.POST)
        comment_cost = self.get_action_cost(ActionType.COMMENT)
        like_cost = self.get_action_cost(ActionType.LIKE)

        can_post = self.energy >= post_cost
        can_comment = self.energy >= comment_cost
        can_like = self.energy >= like_cost

        roll = random.random()
        if (roll < 0.3 or not feed) and can_post:
            topic_id = None
            stance = None
            if self.topics and random.random() < settings.topic_expression_ratio:
                topic_id = random.choice(self.topics).id
                stance = self._infer_stance(topic_id)
            return AgentAction(
                agent_id=self.id,
                action_type=ActionType.POST,
                content=f"Thoughts on community matters — tick {tick}.",
                topic=topic_id,
                stance=stance,
                tick=tick,
            )
        elif roll < 0.6 and can_comment and feed:
            target = random.choice(feed)
            topic_id = getattr(target, "topic", None) if random.random() < 0.7 else None
            stance = self._infer_stance(topic_id) if topic_id else None
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
                topic=topic_id,
                stance=stance,
                tick=tick,
            )
        elif roll < 0.85 and can_like and feed:
            target = random.choice(feed)
            return AgentAction(
                agent_id=self.id,
                action_type=ActionType.LIKE,
                target_id=target.id,
                tick=tick,
            )
        else:
            return AgentAction(agent_id=self.id, action_type=ActionType.IGNORE, tick=tick)

    def apply_opinion_influence(self, topic_id: Optional[str], source_stance: Optional[str], influence_strength: float = 1.0):
        """Shift my opinion toward the stance expressed by another agent."""
        if not topic_id or not source_stance or topic_id not in self.opinions:
            return

        opinion = self.opinions[topic_id]
        target_value = 1.0 if source_stance == "for" else (-1.0 if source_stance == "against" else 0.0)
        shift = settings.influence_rate * influence_strength * (target_value - opinion.value) * opinion.confidence
        opinion.value = max(-1.0, min(1.0, opinion.value + shift))

        agreement = (opinion.value * target_value) > 0
        if agreement:
            opinion.confidence = min(1.0, opinion.confidence + 0.03)
        else:
            opinion.confidence = max(0.1, opinion.confidence - 0.01)

    def update_state(self, action: AgentAction, outcome: str, target_agent: Optional[str] = None):
        """Update reputation, trust, memory, and opinions after an action."""
        if action.action_type == ActionType.POST:
            self.reputation += random.randint(1, 3)
        elif action.action_type == ActionType.COMMENT:
            self.reputation += random.randint(0, 2)
            if self.type == AgentType.TROLL:
                self.reputation -= random.randint(0, 2)
        elif action.action_type == ActionType.LIKE:
            self.reputation += 0

        self.reputation = max(0, self.reputation)

        if target_agent and self.memory_mode == MemoryMode.FULL:
            current = self.trust.get(target_agent, 0.0)
            delta = 1.0 if outcome == "positive" else (-0.5 if outcome == "negative" else 0.1)
            self.trust[target_agent] = max(-10, min(10, current + delta))

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
            "energy": self.energy,
            "opinions": {
                tid: {"value": round(o.value, 3), "confidence": round(o.confidence, 3)}
                for tid, o in self.opinions.items()
            },
        }
