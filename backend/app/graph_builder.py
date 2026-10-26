"""
Graph builder module for BlockScope.
Constructs directed graph structures from transactions:
- Aggregates multi-edges between identical (from, to) pairs.
- Computes node metrics (in-degree, out-degree, total value in/out).
- Applies neutral investigative status annotations based on detected signals.
- Supports graph filtering (min amount, time range, max nodes limit, neighborhood k-hop filtering).
"""

from typing import List, Dict, Set, Tuple, Optional, Any
from .models import Transaction, GraphNode, GraphEdge, GraphData

class TransactionGraph:
    def __init__(self, transactions: Optional[List[Transaction]] = None):
        # Adjacency list: node -> set of (target_node, edge_id)
        self.adj: Dict[str, Set[str]] = {}
        # Reverse adjacency list: node -> set of (source_node)
        self.rev_adj: Dict[str, Set[str]] = {}
        # Undirected adjacency for connected components: node -> set of neighbors
        self.undirected_adj: Dict[str, Set[str]] = {}
        # Edge details: (src, dst) -> edge properties
        self.edge_map: Dict[Tuple[str, str], Dict[str, Any]] = {}
        # Node statistics
        self.nodes_meta: Dict[str, Dict[str, Any]] = {}
        self.transactions: List[Transaction] = []

        if transactions:
            self.build(transactions)

    def build(self, transactions: List[Transaction]) -> None:
        self.transactions = list(transactions)
        self.adj.clear()
        self.rev_adj.clear()
        self.undirected_adj.clear()
        self.edge_map.clear()
        self.nodes_meta.clear()

        # Step 1: Initialize all active addresses
        for tx in self.transactions:
            src = tx.from_address.lower()
            dst = tx.to_address.lower()

            for addr in (src, dst):
                if addr not in self.adj:
                    self.adj[addr] = set()
                    self.rev_adj[addr] = set()
                    self.undirected_adj[addr] = set()
                    self.nodes_meta[addr] = {
                        "in_degree": 0,
                        "out_degree": 0,
                        "total_in_value": 0.0,
                        "total_out_value": 0.0,
                        "tokens": set(),
                        "tx_count": 0,
                        "flagged": False,
                        "status_label": "NORMAL",
                        "reasons": []
                    }

            # Update edge
            self.adj[src].add(dst)
            self.rev_adj[dst].add(src)
            self.undirected_adj[src].add(dst)
            self.undirected_adj[dst].add(src)

            pair_key = (src, dst)
            if pair_key not in self.edge_map:
                self.edge_map[pair_key] = {
                    "source": src,
                    "target": dst,
                    "tx_count": 0,
                    "total_amount": 0.0,
                    "token": tx.token,
                    "latest_timestamp": tx.timestamp,
                    "tx_hashes": []
                }
            
            e = self.edge_map[pair_key]
            e["tx_count"] += 1
            e["total_amount"] += tx.amount
            if tx.timestamp > e["latest_timestamp"]:
                e["latest_timestamp"] = tx.timestamp
            e["tx_hashes"].append(tx.tx_hash)

            # Update node totals
            self.nodes_meta[src]["out_degree"] += 1
            self.nodes_meta[src]["total_out_value"] += tx.amount
            self.nodes_meta[src]["tx_count"] += 1
            self.nodes_meta[src]["tokens"].add(tx.token)

            self.nodes_meta[dst]["in_degree"] += 1
            self.nodes_meta[dst]["total_in_value"] += tx.amount
            self.nodes_meta[dst]["tx_count"] += 1
            self.nodes_meta[dst]["tokens"].add(tx.token)

    def attach_flag_reasons(self, flags: Dict[str, List[str]]) -> None:
        """
        Attaches investigative signal reasons to nodes.
        Uses neutral terminology: 'REVIEW_RECOMMENDED' or 'PRIORITY_REVIEW'.
        """
        for addr, reasons in flags.items():
            addr = addr.lower()
            if addr in self.nodes_meta:
                self.nodes_meta[addr]["flagged"] = True
                self.nodes_meta[addr]["reasons"] = list(set(self.nodes_meta[addr]["reasons"] + reasons))
                if len(self.nodes_meta[addr]["reasons"]) >= 2:
                    self.nodes_meta[addr]["status_label"] = "PRIORITY_REVIEW"
                else:
                    self.nodes_meta[addr]["status_label"] = "REVIEW_RECOMMENDED"

    def get_graph_data(
        self,
        min_amount: float = 0.0,
        start_time: Optional[int] = None,
        end_time: Optional[int] = None,
        wallet_filter: Optional[str] = None,
        neighborhood_hops: int = 0,
        max_nodes: int = 250
    ) -> GraphData:
        """
        Constructs filtered GraphData formatted for Cytoscape.js.
        """
        target_wallets: Optional[Set[str]] = None

        if wallet_filter and wallet_filter.lower() in self.adj:
            target_wallets = set()
            curr_front = {wallet_filter.lower()}
            target_wallets.update(curr_front)
            
            hops = min(neighborhood_hops, 3)
            for _ in range(hops):
                next_front = set()
                for w in curr_front:
                    next_front.update(self.adj.get(w, set()))
                    next_front.update(self.rev_adj.get(w, set()))
                next_front.difference_update(target_wallets)
                target_wallets.update(next_front)
                curr_front = next_front

        active_edges: List[GraphEdge] = []
        active_nodes_set: Set[str] = set()

        for (src, dst), emeta in self.edge_map.items():
            if target_wallets is not None:
                if src not in target_wallets and dst not in target_wallets:
                    continue

            if emeta["total_amount"] < min_amount:
                continue

            if start_time is not None and emeta["latest_timestamp"] < start_time:
                continue

            if end_time is not None and emeta["latest_timestamp"] > end_time:
                continue

            edge_id = f"e_{src[:8]}_{dst[:8]}"
            active_edges.append(GraphEdge(
                id=edge_id,
                source=src,
                target=dst,
                tx_count=emeta["tx_count"],
                total_amount=round(emeta["total_amount"], 4),
                token=emeta["token"],
                latest_timestamp=emeta["latest_timestamp"],
                tx_hashes=emeta["tx_hashes"][:50]
            ))
            active_nodes_set.add(src)
            active_nodes_set.add(dst)

        # Sort nodes by total activity to prioritize top nodes when capping
        sorted_nodes = sorted(
            list(active_nodes_set),
            key=lambda a: self.nodes_meta[a]["in_degree"] + self.nodes_meta[a]["out_degree"],
            reverse=True
        )

        capped_nodes = set(sorted_nodes[:max_nodes])

        # Filter edges to only connect capped nodes
        final_edges = [e for e in active_edges if e.source in capped_nodes and e.target in capped_nodes]

        nodes_list: List[GraphNode] = []
        for addr in capped_nodes:
            meta = self.nodes_meta[addr]
            label_short = f"{addr[:6]}...{addr[-4:]}"
            nodes_list.append(GraphNode(
                id=addr,
                address=addr,
                label=label_short,
                degree=meta["in_degree"] + meta["out_degree"],
                in_degree=meta["in_degree"],
                out_degree=meta["out_degree"],
                flagged=meta["flagged"],
                status_label=meta["status_label"],
                reasons=meta["reasons"],
                total_in_value=round(meta["total_in_value"], 4),
                total_out_value=round(meta["total_out_value"], 4)
            ))

        stats = {
            "total_nodes": len(self.nodes_meta),
            "rendered_nodes": len(nodes_list),
            "total_edges": len(self.edge_map),
            "rendered_edges": len(final_edges),
            "is_capped": len(self.nodes_meta) > max_nodes
        }

        return GraphData(nodes=nodes_list, edges=final_edges, stats=stats)
