from enum import Enum
from dataclasses import dataclass, field
from typing import Optional


class AgentType(str, Enum):
    COOPERATIVE = "cooperative"
    SELFISH = "selfish"
    TROLL = "troll"
    NEUTRAL = "neutral"


class AgentGoal(str, Enum):
    MAXIMIZE_REPUTATION = "maximize_reputation"
    MAXIMIZE_INTERACTIONS = "maximize_interactions"
    MAINTAIN_GROUP_CONSENSUS = "maintain_group_consensus"


class MemoryMode(str, Enum):
    NONE = "none"
    SHORT = "short"
    FULL = "full"


class ActionType(str, Enum):
    POST = "post"
    COMMENT = "comment"
    LIKE = "like"
    IGNORE = "ignore"


@dataclass
class Topic:
    id: str
    name: str
    description: str
    category: str = "neutral"  # neutral | polarizing | local


@dataclass
class Opinion:
    topic_id: str
    value: float = 0.0        # -1.0 .. 1.0
    confidence: float = 0.5   # 0.0 .. 1.0


@dataclass
class FeedItem:
    id: str
    author_id: str
    content: str
    tick: int
    likes: int = 0
    comments: list = field(default_factory=list)
    item_type: str = "post"  # post | comment
    parent_id: Optional[str] = None
    topic: Optional[str] = None    # topic_id
    stance: Optional[str] = None   # "for" | "against" | "neutral" | None


@dataclass
class AgentAction:
    agent_id: str
    action_type: ActionType
    content: Optional[str] = None
    target_id: Optional[str] = None  # item or agent being interacted with
    topic: Optional[str] = None      # topic_id
    stance: Optional[str] = None     # "for" | "against" | "neutral" | None
    tick: int = 0


@dataclass
class MemoryEntry:
    tick: int
    action: str
    target_agent: Optional[str]
    content: str
    outcome: str  # positive / negative / neutral
