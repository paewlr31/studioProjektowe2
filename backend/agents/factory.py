import uuid
import random
from agents.agent import Agent
from agents.models import AgentType, AgentGoal, MemoryMode, Topic

NAMES = [
    "Alex", "Blake", "Casey", "Dana", "Eden", "Finn", "Gray", "Hale",
    "Iris", "Jade", "Kai", "Lane", "Morgan", "Nova", "Orion", "Perry",
    "Quinn", "Reed", "Sage", "Teal", "Uma", "Vale", "Wren", "Xen",
    "Yara", "Zane", "Arlo", "Bex", "Cleo", "Drew", "Elle", "Fay",
    "Glen", "Haze", "Indigo", "Jules", "Koda", "Lux", "Mira", "Noel",
    "Opal", "Pace", "Remy", "Sloan", "Thorn", "Umber", "Vex", "Wilder",
]


def create_agents(
    n: int,
    agent_types: dict[str, float],
    goal: AgentGoal = AgentGoal.MAXIMIZE_REPUTATION,
    memory_mode: MemoryMode = MemoryMode.FULL,
    goal_distribution: dict[str, float] | None = None,
    topics: list[Topic] | None = None,
) -> list[Agent]:
    agents = []
    names = random.sample(NAMES, min(n, len(NAMES)))
    if n > len(NAMES):
        names += [f"Agent{i}" for i in range(n - len(NAMES))]

    type_pool = []
    for type_name, fraction in agent_types.items():
        count = round(fraction * n)
        type_pool.extend([AgentType(type_name)] * count)
    while len(type_pool) < n:
        type_pool.append(AgentType.NEUTRAL)
    random.shuffle(type_pool)

    goal_pool = []
    if goal_distribution:
        for goal_name, fraction in goal_distribution.items():
            count = round(fraction * n)
            goal_pool.extend([AgentGoal(goal_name)] * count)
        while len(goal_pool) < n:
            goal_pool.append(goal)
        random.shuffle(goal_pool)
    else:
        goal_pool = [goal] * n

    for i in range(n):
        agent_id = str(uuid.uuid4())[:8]
        agents.append(Agent(
            agent_id=agent_id,
            agent_type=type_pool[i],
            goal=goal_pool[i],
            memory_mode=memory_mode,
            name=names[i],
            topics=topics,
        ))

    return agents


# Preset configurations for experiments
PRESET_COOPERATIVE = {"cooperative": 1.0}
PRESET_MIXED = {"cooperative": 0.5, "selfish": 0.3, "neutral": 0.2}
PRESET_WITH_TROLLS = {"cooperative": 0.4, "selfish": 0.3, "troll": 0.3}
PRESET_SELFISH_DOMINANT = {"selfish": 0.7, "cooperative": 0.2, "neutral": 0.1}
