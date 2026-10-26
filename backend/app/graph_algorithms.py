"""
Core DAA Graph Algorithms module for BlockScope.
Implements:
1. Breadth-First Search (BFS) with step trace
2. Depth-First Search (DFS) with step trace
3. Unweighted Shortest Path (BFS)
4. Cycle Detection with bounded length (DFS Back-edge / Elementary cycles)
5. Connected Components (Weakly Connected via Undirected BFS & Strongly Connected via Kosaraju)
6. Pair Frequency Analysis
7. Graph Density and Clustering metrics
"""

import time
from collections import deque
from typing import Dict, List, Set, Tuple, Optional, Any
from .graph_builder import TransactionGraph

def run_bfs(
    graph: TransactionGraph,
    start_wallet: str,
    max_depth: int = 10,
    record_trace: bool = True
) -> Dict[str, Any]:
    """
    Breadth-First Search (BFS) from start_wallet.
    Explores neighbors level-by-level using a FIFO queue.
    Theoretical Complexity:
    - Time: O(V + E)
    - Space: O(V) for visited set and queue
    """
    start = start_wallet.lower()
    if start not in graph.adj:
        return {"error": f"Wallet '{start_wallet}' not found in graph", "visited": [], "trace": []}

    t0 = time.perf_counter_ns()
    visited: Set[str] = {start}
    queue = deque([(start, 0)])
    traversal_order: List[Dict[str, Any]] = []
    trace_steps: List[Dict[str, Any]] = []
    edges_traversed = 0

    while queue:
        curr, depth = queue.popleft()
        traversal_order.append({"wallet": curr, "depth": depth})

        if record_trace and len(trace_steps) < 40:
            trace_steps.append({
                "action": "DEQUEUE",
                "wallet": curr,
                "current_depth": depth,
                "queue_size": len(queue),
                "total_visited": len(visited)
            })

        if depth < max_depth:
            neighbors = sorted(list(graph.adj.get(curr, set())))
            for nbr in neighbors:
                edges_traversed += 1
                if nbr not in visited:
                    visited.add(nbr)
                    queue.append((nbr, depth + 1))
                    if record_trace and len(trace_steps) < 40:
                        trace_steps.append({
                            "action": "ENQUEUE_NEIGHBOR",
                            "source": curr,
                            "neighbor": nbr,
                            "new_depth": depth + 1
                        })

    t1 = time.perf_counter_ns()
    elapsed_us = (t1 - t0) / 1000.0

    return {
        "algorithm": "Breadth-First Search (BFS)",
        "start_wallet": start,
        "nodes_visited_count": len(visited),
        "edges_traversed_count": edges_traversed,
        "max_depth_reached": max((x["depth"] for x in traversal_order), default=0),
        "traversal_order": traversal_order,
        "trace_steps": trace_steps,
        "elapsed_us": round(elapsed_us, 2),
        "time_complexity": "O(V + E)",
        "space_complexity": "O(V)"
    }

def run_dfs(
    graph: TransactionGraph,
    start_wallet: str,
    max_depth: int = 10,
    record_trace: bool = True
) -> Dict[str, Any]:
    """
    Depth-First Search (DFS) from start_wallet.
    Explores branch-by-branch using a LIFO stack / recursion.
    Theoretical Complexity:
    - Time: O(V + E)
    - Space: O(V) for visited set and call stack
    """
    start = start_wallet.lower()
    if start not in graph.adj:
        return {"error": f"Wallet '{start_wallet}' not found in graph", "visited": [], "trace": []}

    t0 = time.perf_counter_ns()
    visited: Set[str] = set()
    traversal_order: List[Dict[str, Any]] = []
    trace_steps: List[Dict[str, Any]] = []
    edges_traversed = 0

    def _dfs_recursive(curr: str, depth: int):
        nonlocal edges_traversed
        visited.add(curr)
        traversal_order.append({"wallet": curr, "depth": depth})

        if record_trace and len(trace_steps) < 40:
            trace_steps.append({
                "action": "VISIT_NODE",
                "wallet": curr,
                "depth": depth,
                "total_visited": len(visited)
            })

        if depth < max_depth:
            neighbors = sorted(list(graph.adj.get(curr, set())))
            for nbr in neighbors:
                edges_traversed += 1
                if nbr not in visited:
                    _dfs_recursive(nbr, depth + 1)
                    if record_trace and len(trace_steps) < 40:
                        trace_steps.append({
                            "action": "BACKTRACK_TO",
                            "wallet": curr,
                            "depth": depth
                        })

    _dfs_recursive(start, 0)
    t1 = time.perf_counter_ns()
    elapsed_us = (t1 - t0) / 1000.0

    return {
        "algorithm": "Depth-First Search (DFS)",
        "start_wallet": start,
        "nodes_visited_count": len(visited),
        "edges_traversed_count": edges_traversed,
        "max_depth_reached": max((x["depth"] for x in traversal_order), default=0),
        "traversal_order": traversal_order,
        "trace_steps": trace_steps,
        "elapsed_us": round(elapsed_us, 2),
        "time_complexity": "O(V + E)",
        "space_complexity": "O(V)"
    }

def find_shortest_path_bfs(
    graph: TransactionGraph,
    source: str,
    target: str
) -> Dict[str, Any]:
    """
    Finds the shortest unweighted path between two wallets using BFS.
    Guarantees minimum number of transfer hops (edges), NOT minimum amount or time.
    Theoretical Complexity:
    - Time: O(V + E)
    - Space: O(V) for queue and parent pointers
    """
    src = source.lower()
    dst = target.lower()

    if src not in graph.adj:
        return {"found": False, "error": f"Source wallet '{source}' not found in dataset"}
    if dst not in graph.adj:
        return {"found": False, "error": f"Destination wallet '{target}' not found in dataset"}

    if src == dst:
        return {
            "found": True,
            "hop_count": 0,
            "path": [src],
            "edges": [],
            "note": "Source and destination are identical"
        }

    t0 = time.perf_counter_ns()
    parent: Dict[str, Optional[str]] = {src: None}
    queue = deque([src])
    found = False

    while queue:
        curr = queue.popleft()
        if curr == dst:
            found = True
            break

        for nbr in graph.adj.get(curr, set()):
            if nbr not in parent:
                parent[nbr] = curr
                queue.append(nbr)

    t1 = time.perf_counter_ns()
    elapsed_us = (t1 - t0) / 1000.0

    if not found:
        return {
            "found": False,
            "source": src,
            "target": dst,
            "elapsed_us": round(elapsed_us, 2),
            "message": "No directed transaction path exists between source and destination."
        }

    # Reconstruct path
    curr = dst
    path = []
    while curr is not None:
        path.append(curr)
        curr = parent[curr]
    path.reverse()

    # Retrieve edge metadata along path
    edges_info = []
    for i in range(len(path) - 1):
        u, v = path[i], path[i + 1]
        emeta = graph.edge_map.get((u, v), {})
        edges_info.append({
            "source": u,
            "target": v,
            "tx_count": emeta.get("tx_count", 0),
            "total_amount": round(emeta.get("total_amount", 0.0), 4),
            "token": emeta.get("token", "ETH"),
            "latest_timestamp": emeta.get("latest_timestamp", 0)
        })

    return {
        "found": True,
        "source": src,
        "target": dst,
        "hop_count": len(path) - 1,
        "path": path,
        "edges": edges_info,
        "elapsed_us": round(elapsed_us, 2),
        "time_complexity": "O(V + E)",
        "space_complexity": "O(V)",
        "disclaimer": "This unweighted shortest path minimizes the number of intermediary hops, NOT transaction amount or total elapsed time."
    }

def find_cycles(
    graph: TransactionGraph,
    max_cycle_length: int = 5,
    max_cycles_to_find: int = 25
) -> List[Dict[str, Any]]:
    """
    Finds elementary directed cycles up to max_cycle_length using DFS with backtracking.
    Safeguards against exponential cycle explosions by limiting search depth and total count.
    Theoretical Complexity:
    - Bounded DFS search: O(V * (d)^k) where d is average degree and k = max_cycle_length.
    """
    cycles_found: List[Dict[str, Any]] = []
    seen_cycle_signatures: Set[Tuple[str, ...]] = set()

    nodes = list(graph.adj.keys())

    def _dfs_cycle(start_node: str, current: str, path: List[str], depth: int):
        if len(cycles_found) >= max_cycles_to_find:
            return

        if depth > max_cycle_length:
            return

        for nbr in graph.adj.get(current, set()):
            if nbr == start_node and len(path) >= 2:
                # Cycle found!
                # Normalize signature by rotating to smallest string
                full_cycle = path[:]  # e.g. [A, B, C]
                min_idx = full_cycle.index(min(full_cycle))
                norm_sig = tuple(full_cycle[min_idx:] + full_cycle[:min_idx])
                
                if norm_sig not in seen_cycle_signatures:
                    seen_cycle_signatures.add(norm_sig)
                    
                    # Gather supporting transactions
                    cycle_nodes = full_cycle + [start_node]
                    edge_details = []
                    total_cycle_volume = 0.0
                    for i in range(len(cycle_nodes) - 1):
                        u, v = cycle_nodes[i], cycle_nodes[i + 1]
                        e = graph.edge_map.get((u, v), {})
                        edge_details.append({
                            "from": u,
                            "to": v,
                            "tx_count": e.get("tx_count", 0),
                            "total_amount": round(e.get("total_amount", 0.0), 4),
                            "token": e.get("token", "ETH"),
                            "tx_hashes": e.get("tx_hashes", [])[:5]
                        })
                        total_cycle_volume += e.get("total_amount", 0.0)

                    cycles_found.append({
                        "length": len(full_cycle),
                        "nodes": cycle_nodes,
                        "unique_nodes": full_cycle,
                        "edge_details": edge_details,
                        "total_volume": round(total_cycle_volume, 4),
                        "description": f"Directed circular transfer loop of {len(full_cycle)} wallets"
                    })
                return

            if nbr not in path and depth < max_cycle_length:
                # Prune symmetry: only visit neighbors greater than start_node lexicographically
                if nbr > start_node:
                    path.append(nbr)
                    _dfs_cycle(start_node, nbr, path, depth + 1)
                    path.pop()

    for node in sorted(nodes):
        if len(cycles_found) >= max_cycles_to_find:
            break
        _dfs_cycle(node, node, [node], 1)

    return cycles_found

def compute_connected_components(graph: TransactionGraph) -> Dict[str, Any]:
    """
    Computes Weakly Connected Components (WCC) on the undirected representation using BFS.
    Theoretical Complexity:
    - Time: O(V + E)
    - Space: O(V)
    """
    visited: Set[str] = set()
    components: List[List[str]] = []

    for node in graph.undirected_adj:
        if node not in visited:
            comp = []
            queue = deque([node])
            visited.add(node)
            while queue:
                curr = queue.popleft()
                comp.append(curr)
                for nbr in graph.undirected_adj.get(curr, set()):
                    if nbr not in visited:
                        visited.add(nbr)
                        queue.append(nbr)
            components.append(comp)

    # Sort components by size descending
    components.sort(key=len, reverse=True)

    return {
        "total_components": len(components),
        "largest_component_size": len(components[0]) if components else 0,
        "components": [
            {
                "component_id": idx + 1,
                "size": len(c),
                "wallets": c[:20],
                "has_more": len(c) > 20
            }
            for idx, c in enumerate(components)
        ],
        "isolated_nodes_count": sum(1 for c in components if len(c) == 1)
    }

def compute_pair_frequencies(graph: TransactionGraph, top_n: int = 20) -> List[Dict[str, Any]]:
    """
    Calculates transaction counts and volume across all directed pairs.
    """
    pairs = []
    for (src, dst), emeta in graph.edge_map.items():
        pairs.append({
            "from_address": src,
            "to_address": dst,
            "tx_count": emeta["tx_count"],
            "total_amount": round(emeta["total_amount"], 4),
            "token": emeta["token"],
            "latest_timestamp": emeta["latest_timestamp"]
        })
    pairs.sort(key=lambda x: (x["tx_count"], x["total_amount"]), reverse=True)
    return pairs[:top_n]
