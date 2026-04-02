"""
Analysis module: graph construction and social metrics.
"""
import networkx as nx
import numpy as np
from collections import defaultdict
from typing import Any


def build_interaction_graph(interaction_log: list[dict]) -> nx.DiGraph:
    """
    Build a directed weighted graph from interaction log.
    Each interaction: {from: agent_id, to: agent_id, type: str, tick: int}
    """
    G = nx.DiGraph()
    for interaction in interaction_log:
        src = interaction["from"]
        dst = interaction["to"]
        if src == dst:
            continue
        if G.has_edge(src, dst):
            G[src][dst]["weight"] += 1
            G[src][dst]["ticks"].append(interaction["tick"])
        else:
            G.add_edge(src, dst, weight=1, ticks=[interaction["tick"]])
    return G


def compute_metrics(G: nx.DiGraph, agents: list, tick: int) -> dict[str, Any]:
    """Compute all social network metrics for a given graph state."""
    if G.number_of_nodes() == 0:
        return _empty_metrics(tick)

    undirected = G.to_undirected()
    n_nodes = G.number_of_nodes()
    n_edges = G.number_of_edges()

    # Degree centrality
    degree_centrality = nx.degree_centrality(G)
    betweenness = nx.betweenness_centrality(G, normalized=True, weight="weight")

    # Clustering
    clustering = nx.clustering(undirected)
    avg_clustering = np.mean(list(clustering.values())) if clustering else 0.0

    # Community detection (Louvain-style via greedy modularity)
    communities = []
    modularity = 0.0
    try:
        if undirected.number_of_edges() > 0:
            comms = list(nx.community.greedy_modularity_communities(undirected))
            communities = [list(c) for c in comms]
            modularity = nx.community.modularity(undirected, comms)
    except Exception:
        communities = [[n] for n in undirected.nodes()]

    # Average path length (on largest connected component)
    avg_path_length = 0.0
    try:
        largest_cc = max(nx.connected_components(undirected), key=len)
        subgraph = undirected.subgraph(largest_cc)
        if subgraph.number_of_nodes() > 1:
            avg_path_length = nx.average_shortest_path_length(subgraph)
    except Exception:
        avg_path_length = 0.0

    # Graph density
    density = nx.density(G)

    # Leaders (top 3 by betweenness centrality)
    leaders = sorted(betweenness.items(), key=lambda x: x[1], reverse=True)[:5]

    # Reputation stats
    rep_dict = {a.id: a.reputation for a in agents}
    reps = list(rep_dict.values())

    # Interaction count per agent
    interactions_per_agent = dict(G.out_degree())

    return {
        "tick": tick,
        "n_nodes": n_nodes,
        "n_edges": n_edges,
        "n_clusters": len(communities),
        "modularity": round(modularity, 4),
        "avg_clustering": round(avg_clustering, 4),
        "density": round(density, 4),
        "avg_path_length": round(avg_path_length, 4),
        "leaders": [{"id": lid, "centrality": round(c, 4)} for lid, c in leaders],
        "degree_centrality": {k: round(v, 4) for k, v in degree_centrality.items()},
        "betweenness_centrality": {k: round(v, 4) for k, v in betweenness.items()},
        "communities": communities,
        "reputation": {
            "mean": round(float(np.mean(reps)), 2) if reps else 0,
            "max": max(reps) if reps else 0,
            "min": min(reps) if reps else 0,
            "std": round(float(np.std(reps)), 2) if reps else 0,
            "distribution": rep_dict,
        },
        "interactions_per_agent": interactions_per_agent,
    }


def compute_graph_stability(prev_metrics: dict, curr_metrics: dict) -> float:
    """
    Measure stability between two graph states.
    Returns similarity score 0..1 (1 = identical structure).
    """
    if not prev_metrics or not curr_metrics:
        return 0.0
    metrics_to_compare = ["n_clusters", "modularity", "avg_clustering", "density"]
    diffs = []
    for key in metrics_to_compare:
        prev = prev_metrics.get(key, 0)
        curr = curr_metrics.get(key, 0)
        max_val = max(abs(prev), abs(curr), 1e-9)
        diffs.append(abs(prev - curr) / max_val)
    return round(1.0 - float(np.mean(diffs)), 4)


def compute_activity_entropy(actions_per_agent: dict[str, int]) -> float:
    """Shannon entropy of agent activity distribution."""
    if not actions_per_agent:
        return 0.0
    counts = np.array(list(actions_per_agent.values()), dtype=float)
    total = counts.sum()
    if total == 0:
        return 0.0
    probs = counts / total
    probs = probs[probs > 0]
    return round(float(-np.sum(probs * np.log2(probs))), 4)


def graph_to_vis_data(G: nx.DiGraph, agents: list, communities: list) -> dict:
    """Convert graph to frontend-friendly format for visualization."""
    # Community color mapping
    community_map = {}
    for i, comm in enumerate(communities):
        for node in comm:
            community_map[node] = i

    agent_dict = {a.id: a for a in agents}
    degree = dict(G.degree())

    nodes = []
    for node in G.nodes():
        agent = agent_dict.get(node)
        nodes.append({
            "id": node,
            "name": agent.name if agent else node,
            "type": agent.type.value if agent else "neutral",
            "reputation": agent.reputation if agent else 0,
            "community": community_map.get(node, 0),
            "degree": degree.get(node, 0),
        })

    edges = []
    for src, dst, data in G.edges(data=True):
        edges.append({
            "source": src,
            "target": dst,
            "weight": data.get("weight", 1),
        })

    return {"nodes": nodes, "edges": edges}


def _empty_metrics(tick: int) -> dict:
    return {
        "tick": tick,
        "n_nodes": 0, "n_edges": 0, "n_clusters": 0,
        "modularity": 0.0, "avg_clustering": 0.0, "density": 0.0,
        "avg_path_length": 0.0, "leaders": [], "degree_centrality": {},
        "betweenness_centrality": {}, "communities": [],
        "reputation": {"mean": 0, "max": 0, "min": 0, "std": 0, "distribution": {}},
        "interactions_per_agent": {},
    }
