"""
Pattern detection engine for BlockScope.
Implements 6 explainable investigative signal rules:
1. Repeated transfers between wallet pairs.
2. Rapid fund movement (inflow followed quickly by similar outflow).
3. High transaction activity (statistical outliers).
4. Circular fund flows (directed cycles).
5. Dense clusters (high internal edge density).
6. Activity spikes (sudden volume bursts vs wallet historical baseline).

Each finding adheres to ethical cybersecurity guidelines:
- Clearly designated as investigative signals, NOT definitive proof of wrongdoing.
- Plain-language explanation with transparent mathematical evidence.
"""

import math
from typing import List, Dict, Any, Tuple, Set
from collections import defaultdict
from .models import Transaction, InvestigationFinding
from .graph_builder import TransactionGraph
from .graph_algorithms import find_cycles

DISCLAIMER_TEXT = (
    "NOTICE: This investigative finding reflects an algorithmic graph anomaly "
    "or structural pattern. It is NOT definitive proof of fraud, illegality, "
    "or malicious intent. Further manual forensic verification is required."
)

class PatternDetector:
    def __init__(self, transactions: List[Transaction], graph: TransactionGraph):
        self.transactions = sorted(transactions, key=lambda t: t.timestamp)
        self.graph = graph

    def detect_all(
        self,
        repeated_min_transfers: int = 5,
        rapid_max_delay_seconds: int = 900,
        rapid_amount_tolerance: float = 0.20,
        high_activity_percentile: float = 95.0,
        max_cycle_length: int = 5,
        spike_multiplier: float = 3.0,
        cluster_min_density: float = 0.6
    ) -> List[InvestigationFinding]:
        findings: List[InvestigationFinding] = []

        findings.extend(self.detect_repeated_transfers(min_transfers=repeated_min_transfers))
        findings.extend(self.detect_rapid_fund_movements(
            max_delay_sec=rapid_max_delay_seconds,
            amount_tolerance=rapid_amount_tolerance
        ))
        findings.extend(self.detect_high_activity(percentile=high_activity_percentile))
        findings.extend(self.detect_circular_flows(max_cycle_len=max_cycle_length))
        findings.extend(self.detect_activity_spikes(spike_multiplier=spike_multiplier))
        findings.extend(self.detect_dense_clusters(min_density=cluster_min_density))

        # Deduplicate and sort findings by severity
        severity_order = {"PRIORITY_REVIEW": 0, "REVIEW_RECOMMENDED": 1, "INFORMATIONAL": 2}
        findings.sort(key=lambda f: severity_order.get(f.severity, 3))

        return findings

    def detect_repeated_transfers(self, min_transfers: int = 5) -> List[InvestigationFinding]:
        """
        Rule 1: Wallets interacting unusually frequently.
        """
        findings = []
        for (src, dst), emeta in self.graph.edge_map.items():
            if emeta["tx_count"] >= min_transfers:
                f_id = f"rpt_{src[:6]}_{dst[:6]}_{emeta['tx_count']}"
                findings.append(InvestigationFinding(
                    id=f_id,
                    pattern_type="REPEATED_TRANSFERS",
                    title=f"Repeated Direct Transfers ({emeta['tx_count']} txs)",
                    severity="REVIEW_RECOMMENDED" if emeta["tx_count"] >= 10 else "INFORMATIONAL",
                    description=(
                        f"Wallet {src[:8]}... transferred to {dst[:8]}... {emeta['tx_count']} times, "
                        f"moving a cumulative {round(emeta['total_amount'], 4)} {emeta['token']}."
                    ),
                    evidence={
                        "tx_count": emeta["tx_count"],
                        "threshold_min": min_transfers,
                        "total_transferred": round(emeta["total_amount"], 4),
                        "token": emeta["token"],
                        "source": src,
                        "destination": dst
                    },
                    involved_wallets=[src, dst],
                    involved_tx_hashes=emeta["tx_hashes"][:25],
                    timestamps=[emeta["latest_timestamp"]],
                    detection_rule=f"Pair transfer count >= {min_transfers} within dataset",
                    disclaimer=DISCLAIMER_TEXT
                ))
        return findings

    def detect_rapid_fund_movements(
        self,
        max_delay_sec: int = 900,
        amount_tolerance: float = 0.20
    ) -> List[InvestigationFinding]:
        """
        Rule 2: Rapid Fund Movement (Peeling / Pass-Through candidate).
        Inflow to wallet followed within max_delay_sec by outflow of similar magnitude (within tolerance).
        """
        findings = []
        by_wallet_in: Dict[str, List[Transaction]] = defaultdict(list)
        by_wallet_out: Dict[str, List[Transaction]] = defaultdict(list)

        for tx in self.transactions:
            by_wallet_in[tx.to_address.lower()].append(tx)
            by_wallet_out[tx.from_address.lower()].append(tx)

        for wallet, in_txs in by_wallet_in.items():
            out_txs = by_wallet_out.get(wallet, [])
            if not out_txs:
                continue

            for t_in in in_txs:
                for t_out in out_txs:
                    if t_out.token != t_in.token:
                        continue
                    
                    time_diff = t_out.timestamp - t_in.timestamp
                    if 0 < time_diff <= max_delay_sec:
                        # Check amount similarity: |amt_out - amt_in| / amt_in <= tolerance
                        if t_in.amount > 0:
                            ratio_diff = abs(t_out.amount - t_in.amount) / t_in.amount
                            if ratio_diff <= amount_tolerance:
                                f_id = f"rapid_{wallet[:6]}_{t_in.tx_hash[:6]}_{t_out.tx_hash[:6]}"
                                findings.append(InvestigationFinding(
                                    id=f_id,
                                    pattern_type="RAPID_FUND_MOVEMENT",
                                    title=f"Rapid Pass-Through Movement ({round(time_diff/60.0, 1)} min delta)",
                                    severity="PRIORITY_REVIEW" if time_diff <= 300 else "REVIEW_RECOMMENDED",
                                    description=(
                                        f"Wallet {wallet[:8]}... received {t_in.amount} {t_in.token} "
                                        f"and transferred {t_out.amount} {t_out.token} onward within {time_diff}s "
                                        f"to {t_out.to_address[:8]}... (amount retention: {round((1 - ratio_diff)*100, 1)}%)."
                                    ),
                                    evidence={
                                        "transit_wallet": wallet,
                                        "upstream_sender": t_in.from_address,
                                        "downstream_recipient": t_out.to_address,
                                        "inflow_amount": t_in.amount,
                                        "outflow_amount": t_out.amount,
                                        "time_delta_seconds": time_diff,
                                        "max_allowed_delay": max_delay_sec,
                                        "token": t_in.token
                                    },
                                    involved_wallets=[t_in.from_address, wallet, t_out.to_address],
                                    involved_tx_hashes=[t_in.tx_hash, t_out.tx_hash],
                                    timestamps=[t_in.timestamp, t_out.timestamp],
                                    detection_rule=(
                                        f"Inflow followed by outflow within {max_delay_sec}s "
                                        f"with amount delta <= {int(amount_tolerance*100)}%"
                                    ),
                                    disclaimer=DISCLAIMER_TEXT
                                ))
                                break  # matched one pair
        return findings

    def detect_high_activity(self, percentile: float = 95.0) -> List[InvestigationFinding]:
        """
        Rule 3: Wallets with unusually high activity counts or volumes.
        Uses non-parametric percentile threshold.
        """
        findings = []
        counts = [m["tx_count"] for m in self.graph.nodes_meta.values()]
        if not counts or len(counts) < 5:
            return findings

        counts.sort()
        idx = int(math.ceil((percentile / 100.0) * len(counts))) - 1
        threshold_count = max(counts[idx], 8)  # at least 8 transactions

        for addr, meta in self.graph.nodes_meta.items():
            if meta["tx_count"] >= threshold_count:
                f_id = f"hi_act_{addr[:8]}_{meta['tx_count']}"
                findings.append(InvestigationFinding(
                    id=f_id,
                    pattern_type="HIGH_ACTIVITY_WALLET",
                    title=f"Unusually High Activity Hub ({meta['tx_count']} txs)",
                    severity="REVIEW_RECOMMENDED",
                    description=(
                        f"Wallet {addr[:8]}... observed with {meta['tx_count']} total transactions "
                        f"({meta['in_degree']} incoming, {meta['out_degree']} outgoing). "
                        f"Exceeds the {percentile}th dataset percentile."
                    ),
                    evidence={
                        "wallet": addr,
                        "tx_count": meta["tx_count"],
                        "threshold_count": threshold_count,
                        "percentile_rank": percentile,
                        "in_degree": meta["in_degree"],
                        "out_degree": meta["out_degree"],
                        "total_in_value": round(meta["total_in_value"], 4),
                        "total_out_value": round(meta["total_out_value"], 4)
                    },
                    involved_wallets=[addr],
                    involved_tx_hashes=[],
                    timestamps=[],
                    detection_rule=f"Activity count >= {threshold_count} (>= {percentile}th percentile)",
                    disclaimer=DISCLAIMER_TEXT
                ))
        return findings

    def detect_circular_flows(self, max_cycle_len: int = 5) -> List[InvestigationFinding]:
        """
        Rule 4: Circular flows (directed cycles in the transfer graph).
        """
        findings = []
        cycles = find_cycles(self.graph, max_cycle_length=max_cycle_len, max_cycles_to_find=15)

        for c_idx, cycle in enumerate(cycles):
            nodes = cycle["unique_nodes"]
            f_id = f"cycle_{len(nodes)}_{nodes[0][:6]}_{c_idx}"
            node_chain_str = " -> ".join([f"{w[:6]}..." for w in nodes] + [f"{nodes[0][:6]}..."])
            
            findings.append(InvestigationFinding(
                id=f_id,
                pattern_type="CIRCULAR_FLOW",
                title=f"Circular Transfer Loop ({len(nodes)} Wallets)",
                severity="PRIORITY_REVIEW" if len(nodes) <= 4 else "REVIEW_RECOMMENDED",
                description=(
                    f"Identified closed directed fund cycle of {len(nodes)} wallets: {node_chain_str}. "
                    f"Total cycle volume: {cycle['total_volume']}."
                ),
                evidence={
                    "cycle_length": len(nodes),
                    "wallets": nodes,
                    "edge_details": cycle["edge_details"],
                    "total_volume": cycle["total_volume"]
                },
                involved_wallets=nodes,
                involved_tx_hashes=[h for ed in cycle["edge_details"] for h in ed.get("tx_hashes", [])],
                timestamps=[],
                detection_rule=f"Closed directed path in transfer graph of length 2 <= k <= {max_cycle_len}",
                disclaimer=DISCLAIMER_TEXT
            ))
        return findings

    def detect_activity_spikes(self, spike_multiplier: float = 3.0) -> List[InvestigationFinding]:
        """
        Rule 6: Activity Spikes (sudden surge in transaction frequency vs baseline).
        Splits timeline into 1-hour intervals for each wallet.
        """
        findings = []
        wallet_hourly: Dict[str, Dict[int, int]] = defaultdict(lambda: defaultdict(int))

        for tx in self.transactions:
            hour_bucket = tx.timestamp // 3600
            wallet_hourly[tx.from_address.lower()][hour_bucket] += 1
            wallet_hourly[tx.to_address.lower()][hour_bucket] += 1

        for addr, hourly_counts in wallet_hourly.items():
            if len(hourly_counts) < 2:
                # Need at least 2 distinct active hours or high single burst
                single_hour_max = max(hourly_counts.values())
                if single_hour_max >= 15:
                    f_id = f"spike_burst_{addr[:6]}_{single_hour_max}"
                    findings.append(InvestigationFinding(
                        id=f_id,
                        pattern_type="ACTIVITY_SPIKE",
                        title=f"Sudden Activity Burst ({single_hour_max} txs/hour)",
                        severity="REVIEW_RECOMMENDED",
                        description=(
                            f"Wallet {addr[:8]}... exhibited an isolated surge of {single_hour_max} "
                            f"transactions in a 1-hour window with minimal prior history."
                        ),
                        evidence={
                            "burst_hour_txs": single_hour_max,
                            "baseline_average": 0.0
                        },
                        involved_wallets=[addr],
                        involved_tx_hashes=[],
                        timestamps=[],
                        detection_rule="Single hour activity >= 15 transactions",
                        disclaimer=DISCLAIMER_TEXT
                    ))
                continue

            vals = list(hourly_counts.values())
            avg_hourly = sum(vals) / len(vals)
            max_hourly = max(vals)

            if avg_hourly >= 1.5 and max_hourly >= 8 and (max_hourly / avg_hourly) >= spike_multiplier:
                f_id = f"spike_{addr[:6]}_{max_hourly}"
                findings.append(InvestigationFinding(
                    id=f_id,
                    pattern_type="ACTIVITY_SPIKE",
                    title=f"Transaction Activity Spike ({round(max_hourly/avg_hourly, 1)}x baseline)",
                    severity="REVIEW_RECOMMENDED",
                    description=(
                        f"Wallet {addr[:8]}... reached peak volume of {max_hourly} txs/hour, "
                        f"representing a {round(max_hourly/avg_hourly, 1)}x surge over its hourly baseline."
                    ),
                    evidence={
                        "peak_hourly_txs": max_hourly,
                        "baseline_average_txs": round(avg_hourly, 2),
                        "surge_factor": round(max_hourly / avg_hourly, 2),
                        "threshold_multiplier": spike_multiplier
                    },
                    involved_wallets=[addr],
                    involved_tx_hashes=[],
                    timestamps=[],
                    detection_rule=f"Peak hourly activity >= {spike_multiplier}x baseline average",
                    disclaimer=DISCLAIMER_TEXT
                ))

        return findings

    def detect_dense_clusters(self, min_density: float = 0.6) -> List[InvestigationFinding]:
        """
        Rule 5: Unusually dense clusters of interconnected wallets.
        Finds connected components with 4 to 10 nodes where edge count is high relative to V*(V-1).
        """
        findings = []
        from .graph_algorithms import compute_connected_components
        wcc = compute_connected_components(self.graph)

        for comp_meta in wcc["components"]:
            comp_nodes = comp_meta["wallets"]
            k = len(comp_nodes)
            if 4 <= k <= 12:
                # Calculate internal directed edge count
                internal_edges = 0
                node_set = set(comp_nodes)
                for u in node_set:
                    for v in self.graph.adj.get(u, set()):
                        if v in node_set:
                            internal_edges += 1

                max_possible_edges = k * (k - 1)
                density = (internal_edges / max_possible_edges) if max_possible_edges > 0 else 0.0

                if density >= min_density:
                    f_id = f"cluster_{k}_{comp_nodes[0][:6]}"
                    findings.append(InvestigationFinding(
                        id=f_id,
                        pattern_type="DENSE_CLUSTER",
                        title=f"Dense Interconnected Cluster ({k} Wallets, {int(density*100)}% density)",
                        severity="REVIEW_RECOMMENDED",
                        description=(
                            f"Identified a tightly knit cluster of {k} wallets with {internal_edges} "
                            f"internal transfers (graph density: {round(density, 2)} vs threshold {min_density})."
                        ),
                        evidence={
                            "node_count": k,
                            "internal_edges": internal_edges,
                            "max_possible_edges": max_possible_edges,
                            "density": round(density, 4),
                            "wallets": comp_nodes
                        },
                        involved_wallets=comp_nodes,
                        involved_tx_hashes=[],
                        timestamps=[],
                        detection_rule=f"Component size in [4, 12] with internal density >= {min_density}",
                        disclaimer=DISCLAIMER_TEXT
                    ))

        return findings
