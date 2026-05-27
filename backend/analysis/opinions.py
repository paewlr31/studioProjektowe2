"""
Opinion analysis — metrics tracking opinion dynamics across the community.
"""
import numpy as np
from typing import Any


def compute_opinion_metrics(agents: list, topics: list) -> dict[str, Any]:
    if not topics or not agents:
        return _empty_opinion_metrics()

    topic_values = {t.id: [] for t in topics}
    agent_opinions_map = {}

    for agent in agents:
        opinions = getattr(agent, "opinions", {})
        agent_opinions_map[agent.id] = {}
        for topic in topics:
            opinion = opinions.get(topic.id)
            if opinion is not None:
                val = opinion.value
                topic_values[topic.id].append(val)
                agent_opinions_map[agent.id][topic.id] = {
                    "value": round(val, 3),
                    "confidence": round(opinion.confidence, 3),
                }

    # Per-topic stats
    per_topic = {}
    all_values = []
    for topic in topics:
        vals = topic_values.get(topic.id, [])
        if vals:
            mean_val = float(np.mean(vals))
            std_val = float(np.std(vals)) if len(vals) > 1 else 0.0
        else:
            mean_val = 0.0
            std_val = 0.0
        per_topic[topic.id] = {
            "name": topic.name,
            "mean": round(mean_val, 3),
            "std": round(std_val, 3),
            "category": topic.category,
        }
        all_values.extend(vals)

    # Polarization = mean std across topics
    polarization = float(np.mean([per_topic[t.id]["std"] for t in topics])) if topics else 0.0

    # Consensus = % of agents within 0.3 of topic mean
    consensus_vals = []
    for topic in topics:
        vals = topic_values.get(topic.id, [])
        if not vals:
            consensus_vals.append(1.0)
            continue
        mean_val = float(np.mean(vals))
        within = sum(1 for v in vals if abs(v - mean_val) <= 0.3)
        consensus_vals.append(within / len(vals))
    consensus = float(np.mean(consensus_vals)) if consensus_vals else 0.0

    # Extreme opinions
    extreme_counts = []
    for topic in topics:
        vals = topic_values.get(topic.id, [])
        if not vals:
            extreme_counts.append(0.0)
            continue
        extreme = sum(1 for v in vals if abs(v) > 0.7)
        extreme_counts.append(extreme / len(vals))
    extreme_ratio = float(np.mean(extreme_counts)) if extreme_counts else 0.0

    return {
        "polarization": round(polarization, 4),
        "consensus": round(consensus, 4),
        "extreme_ratio": round(extreme_ratio, 4),
        "per_topic": per_topic,
        "agent_opinions": agent_opinions_map,
    }


def _empty_opinion_metrics() -> dict:
    return {
        "polarization": 0.0,
        "consensus": 0.0,
        "extreme_ratio": 0.0,
        "per_topic": {},
        "agent_opinions": {},
    }
