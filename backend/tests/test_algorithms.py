import pytest
from backend.app.models import Transaction
from backend.app.transaction_index import TransactionIndex
from backend.app.sorting import merge_sort, insertion_sort
from backend.app.graph_builder import TransactionGraph
from backend.app.graph_algorithms import (
    run_bfs, run_dfs, find_shortest_path_bfs, find_cycles, compute_connected_components
)
from backend.app.pattern_detector import PatternDetector

def test_hash_index_vs_linear_scan():
    txs = [
        Transaction(tx_hash="0xaa1", from_address="0x11", to_address="0x22", amount=1.0, token="ETH", timestamp=1000),
        Transaction(tx_hash="0xaa2", from_address="0x22", to_address="0x33", amount=2.0, token="ETH", timestamp=1050),
        Transaction(tx_hash="0xaa3", from_address="0x33", to_address="0x11", amount=3.0, token="ETH", timestamp=1100),
    ]
    idx = TransactionIndex(txs)
    
    # Indexed lookup
    res_idx, _, ops_idx = idx.lookup_hash_indexed("0xaa2")
    assert res_idx is not None
    assert res_idx.tx_hash == "0xaa2"
    assert ops_idx == 1

    # Linear scan
    res_lin, _, ops_lin = idx.lookup_hash_linear("0xaa2")
    assert res_lin is not None
    assert res_lin.tx_hash == "0xaa2"
    assert ops_lin == 2  # target is at index 1 (second item)

    # Missing lookup
    res_none, _, _ = idx.lookup_hash_indexed("0xnonexistent")
    assert res_none is None

def test_sorting_merge_vs_insertion():
    raw_amounts = [15.5, 3.2, 42.0, 1.1, 8.9, 0.5, 99.0]
    txs = [
        Transaction(tx_hash=f"0x{i}", from_address="0x1", to_address="0x2", amount=amt, token="ETH", timestamp=1000+i)
        for i, amt in enumerate(raw_amounts)
    ]

    # Merge Sort Ascending
    sorted_m_asc, cmp_m, _, _ = merge_sort(txs, field="amount", descending=False)
    assert [t.amount for t in sorted_m_asc] == sorted(raw_amounts)
    assert cmp_m > 0

    # Merge Sort Descending
    sorted_m_desc, _, _, _ = merge_sort(txs, field="amount", descending=True)
    assert [t.amount for t in sorted_m_desc] == sorted(raw_amounts, reverse=True)

    # Insertion Sort Ascending
    sorted_i_asc, cmp_i, _, _ = insertion_sort(txs, field="amount", descending=False)
    assert [t.amount for t in sorted_i_asc] == sorted(raw_amounts)

    # Verify both algorithms yield identical ordering
    assert [t.tx_hash for t in sorted_m_asc] == [t.tx_hash for t in sorted_i_asc]

def test_graph_traversal_bfs_dfs():
    # Linear chain: A -> B -> C -> D
    txs = [
        Transaction(tx_hash="0x1", from_address="0xa", to_address="0xb", amount=1.0, timestamp=10),
        Transaction(tx_hash="0x2", from_address="0xb", to_address="0xc", amount=1.0, timestamp=20),
        Transaction(tx_hash="0x3", from_address="0xc", to_address="0xd", amount=1.0, timestamp=30),
    ]
    graph = TransactionGraph(txs)
    
    bfs_res = run_bfs(graph, "0xa")
    assert bfs_res["nodes_visited_count"] == 4
    assert [x["wallet"] for x in bfs_res["traversal_order"]] == ["0xa", "0xb", "0xc", "0xd"]

    dfs_res = run_dfs(graph, "0xa")
    assert dfs_res["nodes_visited_count"] == 4

def test_unweighted_shortest_path():
    # Graph: A -> B -> D, and A -> C -> D, and A -> E -> F -> D
    txs = [
        Transaction(tx_hash="0x1", from_address="0xa", to_address="0xb", amount=1.0, timestamp=10),
        Transaction(tx_hash="0x2", from_address="0xb", to_address="0xd", amount=1.0, timestamp=20),
        Transaction(tx_hash="0x3", from_address="0xa", to_address="0xc", amount=1.0, timestamp=30),
        Transaction(tx_hash="0x4", from_address="0xc", to_address="0xd", amount=1.0, timestamp=40),
        Transaction(tx_hash="0x5", from_address="0xa", to_address="0xe", amount=1.0, timestamp=50),
        Transaction(tx_hash="0x6", from_address="0xe", to_address="0xf", amount=1.0, timestamp=60),
        Transaction(tx_hash="0x7", from_address="0xf", to_address="0xd", amount=1.0, timestamp=70),
    ]
    graph = TransactionGraph(txs)

    res = find_shortest_path_bfs(graph, "0xa", "0xd")
    assert res["found"] is True
    assert res["hop_count"] == 2
    assert res["path"][0] == "0xa"
    assert res["path"][-1] == "0xd"

    # Disconnected path
    res_none = find_shortest_path_bfs(graph, "0xd", "0xa")
    assert res_none["found"] is False

def test_cycle_detection():
    # Cycle of 3: X -> Y -> Z -> X
    txs = [
        Transaction(tx_hash="0x1", from_address="0xx", to_address="0xy", amount=5.0, timestamp=10),
        Transaction(tx_hash="0x2", from_address="0xy", to_address="0xz", amount=5.0, timestamp=20),
        Transaction(tx_hash="0x3", from_address="0xz", to_address="0xx", amount=5.0, timestamp=30),
    ]
    graph = TransactionGraph(txs)
    cycles = find_cycles(graph, max_cycle_length=4)
    assert len(cycles) >= 1
    assert cycles[0]["length"] == 3
    assert set(cycles[0]["unique_nodes"]) == {"0xx", "0xy", "0xz"}
