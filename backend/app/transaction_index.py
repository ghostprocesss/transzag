"""
Hash-table transaction indexing module for BlockScope.
Implements:
1. Multi-key Hash Index (by tx_hash, sender, receiver, pair)
2. Comparison against linear scan (O(1) average lookup vs O(N) search)
3. Direct metrics instrumentation (comparison counts, execution time)
"""

import time
from typing import Dict, List, Optional, Tuple, Any
from .models import Transaction

class TransactionIndex:
    """
    Custom in-memory index structure using hash tables (Python dicts with SipHash/hash under the hood).
    Theoretical time complexities:
    - Index construction: O(N) time, O(N) space
    - Hash lookup by tx_hash: O(1) average time, O(1) space
    - Lookup by sender / receiver: O(1) lookup + O(K) retrieval of K matched records
    - Linear scan lookup: O(N) comparisons and time
    """
    def __init__(self, transactions: Optional[List[Transaction]] = None):
        self.by_hash: Dict[str, Transaction] = {}
        self.by_sender: Dict[str, List[Transaction]] = {}
        self.by_receiver: Dict[str, List[Transaction]] = {}
        self.by_pair: Dict[Tuple[str, str], List[Transaction]] = {}
        self.raw_list: List[Transaction] = []
        self.build_time_us: float = 0.0

        if transactions:
            self.build(transactions)

    def build(self, transactions: List[Transaction]) -> float:
        t0 = time.perf_counter_ns()
        self.raw_list = list(transactions)
        self.by_hash.clear()
        self.by_sender.clear()
        self.by_receiver.clear()
        self.by_pair.clear()

        for tx in self.raw_list:
            self.by_hash[tx.tx_hash] = tx
            
            s = tx.from_address
            if s not in self.by_sender:
                self.by_sender[s] = []
            self.by_sender[s].append(tx)

            r = tx.to_address
            if r not in self.by_receiver:
                self.by_receiver[r] = []
            self.by_receiver[r].append(tx)

            pair = (s, r)
            if pair not in self.by_pair:
                self.by_pair[pair] = []
            self.by_pair[pair].append(tx)

        t1 = time.perf_counter_ns()
        self.build_time_us = (t1 - t0) / 1000.0
        return self.build_time_us

    def lookup_hash_indexed(self, tx_hash: str) -> Tuple[Optional[Transaction], float, int]:
        """
        Indexed lookup by hash: O(1) expected time.
        Returns (result, time_us, comparison_count).
        """
        t0 = time.perf_counter_ns()
        # In a hash table, index lookup checks key in bucket: 1 effective hash probe/comparison
        res = self.by_hash.get(tx_hash)
        t1 = time.perf_counter_ns()
        elapsed_us = (t1 - t0) / 1000.0
        return res, elapsed_us, 1

    def lookup_hash_linear(self, tx_hash: str) -> Tuple[Optional[Transaction], float, int]:
        """
        Linear scan lookup by hash: O(N) time and comparisons.
        Returns (result, time_us, comparison_count).
        """
        t0 = time.perf_counter_ns()
        comparisons = 0
        found: Optional[Transaction] = None
        for tx in self.raw_list:
            comparisons += 1
            if tx.tx_hash == tx_hash:
                found = tx
                break
        t1 = time.perf_counter_ns()
        elapsed_us = (t1 - t0) / 1000.0
        return found, elapsed_us, comparisons

    def lookup_by_wallet(self, address: str) -> Dict[str, Any]:
        """
        Get all transactions involving an address as sender or receiver.
        """
        addr = address.lower()
        t0 = time.perf_counter_ns()
        sent = self.by_sender.get(addr, [])
        recv = self.by_receiver.get(addr, [])
        t1 = time.perf_counter_ns()
        return {
            "address": addr,
            "sent_count": len(sent),
            "recv_count": len(recv),
            "sent": sent,
            "received": recv,
            "elapsed_us": (t1 - t0) / 1000.0
        }

    def get_pair_transfers(self, addr_a: str, addr_b: str) -> List[Transaction]:
        return self.by_pair.get((addr_a.lower(), addr_b.lower()), [])

    def compare_lookup_methods(self, target_tx_hash: str) -> Dict[str, Any]:
        """
        Runs both indexed lookup and linear scan to produce comparative benchmark.
        """
        indexed_res, indexed_us, indexed_ops = self.lookup_hash_indexed(target_tx_hash)
        linear_res, linear_us, linear_ops = self.lookup_hash_linear(target_tx_hash)

        speedup = (linear_us / indexed_us) if indexed_us > 0 else 1.0

        return {
            "query": target_tx_hash,
            "found": indexed_res is not None,
            "total_records": len(self.raw_list),
            "indexed": {
                "method": "Hash Table O(1)",
                "elapsed_us": round(indexed_us, 2),
                "comparisons": indexed_ops,
                "complexity": "O(1) expected"
            },
            "linear_scan": {
                "method": "Linear Sequential Scan O(N)",
                "elapsed_us": round(linear_us, 2),
                "comparisons": linear_ops,
                "complexity": "O(N)"
            },
            "speedup_factor": round(speedup, 2)
        }
