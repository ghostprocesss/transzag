"""
Wallet analytics module for BlockScope.
Calculates deep forensic metrics for any individual wallet:
- Token-separated volumes (ETH, USDT, DAI, etc.)
- First and last seen timestamps
- Unique incoming/outgoing counterparties
- Largest incoming and outgoing transactions
- Most frequent counterparties
- Temporal frequency histogram
- Linked pattern findings
"""

from typing import List, Dict, Any, Optional
from collections import defaultdict
from .models import Transaction, InvestigationFinding
from .graph_builder import TransactionGraph

def compute_wallet_profile(
    address: str,
    transactions: List[Transaction],
    graph: TransactionGraph,
    all_findings: Optional[List[InvestigationFinding]] = None
) -> Dict[str, Any]:
    target = address.lower()
    
    in_txs: List[Transaction] = []
    out_txs: List[Transaction] = []

    for tx in transactions:
        if tx.from_address.lower() == target:
            out_txs.append(tx)
        if tx.to_address.lower() == target:
            in_txs.append(tx)

    if not in_txs and not out_txs:
        return {
            "address": target,
            "found": False,
            "message": f"No transactions recorded for wallet {target}"
        }

    all_wallet_txs = in_txs + out_txs
    timestamps = [tx.timestamp for tx in all_wallet_txs]
    first_seen = min(timestamps) if timestamps else None
    last_seen = max(timestamps) if timestamps else None

    # Volumes grouped strictly by token to preserve financial data integrity
    volume_in_by_token: Dict[str, float] = defaultdict(float)
    volume_out_by_token: Dict[str, float] = defaultdict(float)

    for tx in in_txs:
        volume_in_by_token[tx.token] += tx.amount
    for tx in out_txs:
        volume_out_by_token[tx.token] += tx.amount

    # Round volumes
    vol_in_clean = {k: round(v, 4) for k, v in volume_in_by_token.items()}
    vol_out_clean = {k: round(v, 4) for k, v in volume_out_by_token.items()}

    # Counterparties
    counterparties_in: Dict[str, int] = defaultdict(int)
    counterparties_out: Dict[str, int] = defaultdict(int)
    all_counterparties = set()

    for tx in in_txs:
        s = tx.from_address.lower()
        counterparties_in[s] += 1
        all_counterparties.add(s)

    for tx in out_txs:
        d = tx.to_address.lower()
        counterparties_out[d] += 1
        all_counterparties.add(d)

    # Top counterparties
    top_senders = sorted(
        [{"address": k, "count": v} for k, v in counterparties_in.items()],
        key=lambda x: x["count"],
        reverse=True
    )[:5]

    top_recipients = sorted(
        [{"address": k, "count": v} for k, v in counterparties_out.items()],
        key=lambda x: x["count"],
        reverse=True
    )[:5]

    # Largest transfers
    largest_in = sorted(in_txs, key=lambda t: t.amount, reverse=True)[:5]
    largest_out = sorted(out_txs, key=lambda t: t.amount, reverse=True)[:5]

    # Activity timeline (day buckets)
    daily_buckets: Dict[str, int] = defaultdict(int)
    for tx in all_wallet_txs:
        day_str = str(tx.timestamp // 86400 * 86400)
        daily_buckets[day_str] += 1

    timeline = sorted(
        [{"timestamp": int(ts), "count": count} for ts, count in daily_buckets.items()],
        key=lambda x: x["timestamp"]
    )

    # Patterns involving this wallet
    involved_findings = []
    if all_findings:
        for f in all_findings:
            if target in [w.lower() for w in f.involved_wallets]:
                involved_findings.append({
                    "id": f.id,
                    "title": f.title,
                    "pattern_type": f.pattern_type,
                    "severity": f.severity,
                    "description": f.description
                })

    meta = graph.nodes_meta.get(target, {})

    return {
        "address": target,
        "found": True,
        "first_seen": first_seen,
        "last_seen": last_seen,
        "total_incoming_txs": len(in_txs),
        "total_outgoing_txs": len(out_txs),
        "total_transactions": len(all_wallet_txs),
        "unique_counterparties_count": len(all_counterparties),
        "volume_in_by_token": vol_in_clean,
        "volume_out_by_token": vol_out_clean,
        "top_senders": top_senders,
        "top_recipients": top_recipients,
        "largest_incoming_transfers": [
            {
                "tx_hash": t.tx_hash,
                "from_address": t.from_address,
                "amount": t.amount,
                "token": t.token,
                "timestamp": t.timestamp
            }
            for t in largest_in
        ],
        "largest_outgoing_transfers": [
            {
                "tx_hash": t.tx_hash,
                "to_address": t.to_address,
                "amount": t.amount,
                "token": t.token,
                "timestamp": t.timestamp
            }
            for t in largest_out
        ],
        "activity_timeline": timeline,
        "status_label": meta.get("status_label", "NORMAL"),
        "flagged": meta.get("flagged", False),
        "reasons": meta.get("reasons", []),
        "involved_findings": involved_findings
    }
