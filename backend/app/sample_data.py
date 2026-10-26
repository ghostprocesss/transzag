"""
Deterministic synthetic blockchain transaction generator for BlockScope.
Produces realistic topologies:
- Ordinary peer-to-peer transfers
- Repeated transfers between pairs
- Rapid fund movement (smurfing / peeling chain: Wallet A -> Wallet B -> Wallet C within minutes)
- Circular transaction flows (cycles: A -> B -> C -> A)
- High activity hubs (exchanges / aggregators)
- Activity bursts / sudden spikes
- Dense cluster / interconnected community
"""

import random
import hashlib
from typing import List
from .models import Transaction

def _make_addr(prefix_num: int, label: str = "") -> str:
    seed_str = f"blockscope_wallet_{prefix_num}_{label}"
    h = hashlib.sha256(seed_str.encode()).hexdigest()[:40]
    return f"0x{h}"

def _make_tx_hash(from_addr: str, to_addr: str, nonce: int, ts: int) -> str:
    raw = f"{from_addr}:{to_addr}:{nonce}:{ts}:scope"
    return f"0x{hashlib.sha256(raw.encode()).hexdigest()}"

def generate_synthetic_transactions(seed: int = 42) -> List[Transaction]:
    rng = random.Random(seed)
    txs: List[Transaction] = []
    base_time = 1710000000  # Mar 2024
    base_block = 19450000
    
    # Pre-generate named wallet addresses for distinct roles
    # 1. Circular Flow (A -> B -> C -> D -> A)
    cycle_nodes = [_make_addr(i, "ring_node") for i in range(1, 5)]
    # 2. Rapid pass-through / Layering chain (Mule1 -> Transit1 -> Transit2 -> Exit)
    rapid_nodes = [_make_addr(i, "rapid_transit") for i in range(10, 14)]
    # 3. Repeated transfer pair
    repeated_pair = (_make_addr(20, "corp_a"), _make_addr(21, "corp_b"))
    # 4. High activity hub
    hub_wallet = _make_addr(30, "major_hub")
    # 5. Activity burst wallet
    burst_wallet = _make_addr(40, "burst_wallet")
    # 6. Dense cluster (5 nodes heavily interconnected)
    cluster_nodes = [_make_addr(i, "cluster_group") for i in range(50, 55)]
    # 7. Background regular nodes (40 ordinary wallets)
    regular_nodes = [_make_addr(i, "regular_user") for i in range(100, 140)]

    current_ts = base_time
    block_num = base_block
    tx_counter = 0

    # A. Inject Circular Flows (Cycles of length 3 and 4)
    # Ring 1: cycle_nodes[0] -> [1] -> [2] -> [3] -> [0]
    ring_cycle_rounds = 4
    for r in range(ring_cycle_rounds):
        ring_ts = base_time + r * 3600
        cycle_amount = 14.5 + r * 0.5
        for idx in range(len(cycle_nodes)):
            src = cycle_nodes[idx]
            dst = cycle_nodes[(idx + 1) % len(cycle_nodes)]
            tx_counter += 1
            txs.append(Transaction(
                tx_hash=_make_tx_hash(src, dst, tx_counter, ring_ts + idx * 120),
                from_address=src,
                to_address=dst,
                amount=round(cycle_amount - (idx * 0.05), 4),
                token="ETH",
                timestamp=ring_ts + idx * 120,
                block_number=block_num + (idx * 10),
                status="confirmed"
            ))

    # Ring 2 (3-node cycle: regular_nodes[0] -> regular_nodes[1] -> regular_nodes[2] -> regular_nodes[0])
    r3_ts = base_time + 86400
    r3_nodes = [regular_nodes[0], regular_nodes[1], regular_nodes[2]]
    for idx in range(3):
        src = r3_nodes[idx]
        dst = r3_nodes[(idx + 1) % 3]
        tx_counter += 1
        txs.append(Transaction(
            tx_hash=_make_tx_hash(src, dst, tx_counter, r3_ts + idx * 180),
            from_address=src,
            to_address=dst,
            amount=5.25,
            token="USDT",
            timestamp=r3_ts + idx * 180,
            block_number=block_num + 300 + idx * 5,
            status="confirmed"
        ))

    # B. Inject Rapid Fund Movements (Inflow followed quickly by similar outflow)
    # rapid_nodes[0] -> rapid_nodes[1] -> rapid_nodes[2] -> rapid_nodes[3] within 300 seconds
    for cycle_idx in range(3):
        rapid_start = base_time + 40000 + (cycle_idx * 50000)
        base_amt = 50.0 + cycle_idx * 10.0
        for step in range(len(rapid_nodes) - 1):
            src = rapid_nodes[step]
            dst = rapid_nodes[step + 1]
            tx_counter += 1
            # amount drops slightly (gas/commission simulation: 0.2%)
            amt = base_amt * (0.995 ** step)
            t_offset = step * 180  # 3 minutes apart
            txs.append(Transaction(
                tx_hash=_make_tx_hash(src, dst, tx_counter, rapid_start + t_offset),
                from_address=src,
                to_address=dst,
                amount=round(amt, 4),
                token="ETH",
                timestamp=rapid_start + t_offset,
                block_number=block_num + 500 + step * 15,
                status="confirmed"
            ))

    # C. Inject Repeated Transfers between pair
    # Pair transacting 18 times back and forth over a few days
    for k in range(18):
        tx_counter += 1
        direction = k % 2 == 0
        src = repeated_pair[0] if direction else repeated_pair[1]
        dst = repeated_pair[1] if direction else repeated_pair[0]
        ts = base_time + 5000 + k * 7200  # Every 2 hours
        txs.append(Transaction(
            tx_hash=_make_tx_hash(src, dst, tx_counter, ts),
            from_address=src,
            to_address=dst,
            amount=round(rng.uniform(2.5, 8.0), 3),
            token="DAI",
            timestamp=ts,
            block_number=block_num + 100 + k * 50,
            status="confirmed"
        ))

    # D. Inject High Activity Hub
    # Hub connects with 25 different wallets
    for i in range(25):
        target = regular_nodes[i % len(regular_nodes)]
        # Incoming to hub
        tx_counter += 1
        ts_in = base_time + rng.randint(1000, 200000)
        txs.append(Transaction(
            tx_hash=_make_tx_hash(target, hub_wallet, tx_counter, ts_in),
            from_address=target,
            to_address=hub_wallet,
            amount=round(rng.uniform(0.5, 12.0), 4),
            token="ETH",
            timestamp=ts_in,
            block_number=block_num + int(ts_in - base_time) // 12,
            status="confirmed"
        ))
        # Outgoing from hub
        tx_counter += 1
        ts_out = ts_in + rng.randint(600, 3600)
        dest = regular_nodes[(i + 5) % len(regular_nodes)]
        txs.append(Transaction(
            tx_hash=_make_tx_hash(hub_wallet, dest, tx_counter, ts_out),
            from_address=hub_wallet,
            to_address=dest,
            amount=round(rng.uniform(0.4, 11.5), 4),
            token="ETH",
            timestamp=ts_out,
            block_number=block_num + int(ts_out - base_time) // 12,
            status="confirmed"
        ))

    # E. Inject Activity Spikes (burst_wallet was silent, then 20 transactions in 1 hour)
    # Baseline: 2 transactions days earlier
    tx_counter += 1
    txs.append(Transaction(
        tx_hash=_make_tx_hash(regular_nodes[5], burst_wallet, tx_counter, base_time + 1000),
        from_address=regular_nodes[5],
        to_address=burst_wallet,
        amount=1.5,
        token="ETH",
        timestamp=base_time + 1000,
        block_number=block_num + 80,
        status="confirmed"
    ))
    # Spike window: at base_time + 150000, 22 transactions within 1800s
    spike_window_start = base_time + 150000
    for s_idx in range(22):
        tx_counter += 1
        counterparty = regular_nodes[(s_idx + 10) % len(regular_nodes)]
        is_incoming = (s_idx % 3 != 0)
        src = counterparty if is_incoming else burst_wallet
        dst = burst_wallet if is_incoming else counterparty
        s_ts = spike_window_start + s_idx * 75
        txs.append(Transaction(
            tx_hash=_make_tx_hash(src, dst, tx_counter, s_ts),
            from_address=src,
            to_address=dst,
            amount=round(rng.uniform(3.0, 15.0), 3),
            token="ETH",
            timestamp=s_ts,
            block_number=block_num + int(s_ts - base_time) // 12,
            status="confirmed"
        ))

    # F. Inject Dense Interconnected Cluster (5 nodes, all-to-all transfers)
    for c_src in cluster_nodes:
        for c_dst in cluster_nodes:
            if c_src != c_dst:
                tx_counter += 1
                c_ts = base_time + 80000 + rng.randint(0, 10000)
                txs.append(Transaction(
                    tx_hash=_make_tx_hash(c_src, c_dst, tx_counter, c_ts),
                    from_address=c_src,
                    to_address=c_dst,
                    amount=round(rng.uniform(1.0, 5.0), 3),
                    token="USDT",
                    timestamp=c_ts,
                    block_number=block_num + int(c_ts - base_time) // 12,
                    status="confirmed"
                ))

    # G. Inject Background Ordinary Organic Transactions
    for _ in range(85):
        tx_counter += 1
        src = rng.choice(regular_nodes)
        dst = rng.choice(regular_nodes)
        while dst == src:
            dst = rng.choice(regular_nodes)
        ts = base_time + rng.randint(100, 250000)
        token = rng.choice(["ETH", "ETH", "USDT", "DAI"])
        amt = round(rng.uniform(0.1, 20.0), 4) if token == "ETH" else round(rng.uniform(10.0, 1500.0), 2)
        txs.append(Transaction(
            tx_hash=_make_tx_hash(src, dst, tx_counter, ts),
            from_address=src,
            to_address=dst,
            amount=amt,
            token=token,
            timestamp=ts,
            block_number=block_num + int(ts - base_time) // 12,
            status="confirmed"
        ))

    # Sort deterministically by timestamp ascending
    txs.sort(key=lambda t: t.timestamp)
    return txs
