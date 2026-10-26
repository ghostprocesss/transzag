import pytest
from backend.app.models import Transaction
from backend.app.data_loader import parse_csv_data, parse_json_data, DataLoaderError
from backend.app.graph_builder import TransactionGraph
from backend.app.graph_algorithms import compute_connected_components, find_shortest_path_bfs
from backend.app.pattern_detector import PatternDetector
from backend.app.benchmarking import run_suite_benchmarks
from backend.app.blockchain_provider import BlockchainProvider

def test_empty_dataset_handling():
    with pytest.raises(DataLoaderError):
        parse_csv_data("")
    
    with pytest.raises(DataLoaderError):
        parse_json_data("[]")

def test_invalid_csv_and_json():
    # Missing required columns
    bad_csv = "tx_hash,from_address\n0x111,0x222\n"
    with pytest.raises(DataLoaderError):
        parse_csv_data(bad_csv)

    # Malformed JSON
    with pytest.raises(DataLoaderError):
        parse_json_data("{not: valid: json")

def test_missing_sender_or_receiver():
    bad_csv = "tx_hash,from_address,to_address,amount,timestamp\n0x111,,0x222222222222,10,1000\n"
    with pytest.raises(DataLoaderError):
        parse_csv_data(bad_csv)

def test_duplicate_transaction_hashes():
    csv_dup = (
        "tx_hash,from_address,to_address,amount,timestamp\n"
        "0x11111111111,0x222222222222,0x333333333333,10,1000\n"
        "0x11111111111,0x222222222222,0x333333333333,20,1050\n"
    )
    txs = parse_csv_data(csv_dup)
    # Duplicate hash was deduplicated
    assert len(txs) == 1

def test_self_transfers():
    txs = [
        Transaction(tx_hash="0xself1", from_address="0xaaaa", to_address="0xaaaa", amount=5.0, timestamp=1000)
    ]
    graph = TransactionGraph(txs)
    # Self-loop creates in-degree and out-degree on same node
    assert "0xaaaa" in graph.adj
    assert "0xaaaa" in graph.adj["0xaaaa"]

def test_multiple_tokens_integrity():
    txs = [
        Transaction(tx_hash="0xt1", from_address="0x1", to_address="0x2", amount=10.0, token="ETH", timestamp=1000),
        Transaction(tx_hash="0xt2", from_address="0x1", to_address="0x2", amount=5000.0, token="USDT", timestamp=1010),
    ]
    graph = TransactionGraph(txs)
    # Tokens shouldn't be blindly added together as identical currency
    assert "ETH" in graph.nodes_meta["0x1"]["tokens"]
    assert "USDT" in graph.nodes_meta["0x1"]["tokens"]

def test_identical_timestamps():
    txs = [
        Transaction(tx_hash="0xsim1", from_address="0x1", to_address="0x2", amount=1.0, timestamp=1000),
        Transaction(tx_hash="0xsim2", from_address="0x3", to_address="0x4", amount=2.0, timestamp=1000),
    ]
    graph = TransactionGraph(txs)
    assert len(graph.edge_map) == 2

def test_disconnected_graph_components():
    # Island 1: A -> B
    # Island 2: C -> D
    txs = [
        Transaction(tx_hash="0xi1", from_address="0xa", to_address="0xb", amount=1.0, timestamp=100),
        Transaction(tx_hash="0xi2", from_address="0xc", to_address="0xd", amount=2.0, timestamp=200),
    ]
    graph = TransactionGraph(txs)
    wcc = compute_connected_components(graph)
    assert wcc["total_components"] == 2
    # No path between islands
    path_res = find_shortest_path_bfs(graph, "0xa", "0xd")
    assert path_res["found"] is False

def test_repeated_transactions_detection():
    txs = [
        Transaction(tx_hash=f"0xrpt_{i}", from_address="0xuser1", to_address="0xuser2", amount=2.0, timestamp=1000+i*10)
        for i in range(8)
    ]
    graph = TransactionGraph(txs)
    detector = PatternDetector(txs, graph)
    findings = detector.detect_repeated_transfers(min_transfers=5)
    assert len(findings) == 1
    assert findings[0].pattern_type == "REPEATED_TRANSFERS"
    assert findings[0].evidence["tx_count"] == 8

def test_invalid_wallet_address_validation():
    provider = BlockchainProvider()
    assert provider.validate_address("0x123") is False
    assert provider.validate_address("not_an_address") is False
    assert provider.validate_address("0x71C8418C243129679825b290C73701ffBCE70903") is True

def test_benchmarks_correctness():
    bench = run_suite_benchmarks(sizes=[50, 100])
    assert 50 in bench["results_by_size"]
    assert 100 in bench["results_by_size"]
    assert bench["results_by_size"][100]["lookup_speedup"] >= 1.0
    assert len(bench["complexity_matrix"]) >= 6
