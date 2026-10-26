"""
FastAPI application router and state manager for BlockScope.
Exposes REST endpoints for dataset management, transaction explorer,
graph visualization, forensic wallet profiles, pattern detection,
DAA algorithms & benchmarks, and the interactive terminal command console.
"""

from fastapi import FastAPI, UploadFile, File, Query, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from typing import List, Dict, Any, Optional
import time

from .models import (
    Transaction, TransactionFilter, PaginatedTransactions,
    GraphData, InvestigationFinding, DatasetStats
)
from .sample_data import generate_synthetic_transactions
from .data_loader import parse_csv_data, parse_json_data, export_to_csv, DataLoaderError
from .transaction_index import TransactionIndex
from .sorting import merge_sort, insertion_sort, compare_sort_algorithms
from .graph_builder import TransactionGraph
from .graph_algorithms import (
    run_bfs, run_dfs, find_shortest_path_bfs, find_cycles,
    compute_connected_components, compute_pair_frequencies
)
from .pattern_detector import PatternDetector
from .wallet_analytics import compute_wallet_profile
from .benchmarking import run_suite_benchmarks
from .blockchain_provider import BlockchainProvider
from .database import (
    init_db, log_audit, save_investigation_report,
    list_saved_reports, get_saved_report
)

app = FastAPI(
    title="BlockScope Transaction Intelligence API",
    version="1.0.0",
    description="Cybersecurity blockchain transaction investigation and DAA algorithm lab platform."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global in-memory dataset state
class AppState:
    def __init__(self):
        self.transactions: List[Transaction] = []
        self.index: TransactionIndex = TransactionIndex()
        self.graph: TransactionGraph = TransactionGraph()
        self.findings: List[InvestigationFinding] = []
        self.dataset_name: str = "synthetic_demo"
        self.is_synthetic: bool = True
        self.blockchain_provider = BlockchainProvider()

state = AppState()

def _reload_state(txs: List[Transaction], dataset_name: str, is_synthetic: bool = True):
    state.transactions = txs
    state.dataset_name = dataset_name
    state.is_synthetic = is_synthetic
    state.index.build(txs)
    state.graph.build(txs)
    
    # Run initial pattern detection
    detector = PatternDetector(state.transactions, state.graph)
    state.findings = detector.detect_all()
    
    # Attach flagged reasons to graph nodes
    flags: Dict[str, List[str]] = {}
    for f in state.findings:
        for w in f.involved_wallets:
            w_lower = w.lower()
            if w_lower not in flags:
                flags[w_lower] = []
            flags[w_lower].append(f.title)
    state.graph.attach_flag_reasons(flags)
    log_audit("DATASET_LOAD", f"Loaded {len(txs)} transactions: {dataset_name}")

@app.on_event("startup")
def startup_event():
    init_db()
    demo_txs = generate_synthetic_transactions(seed=42)
    _reload_state(demo_txs, "synthetic_demo_v1", is_synthetic=True)

# ----------------- DATASET ENDPOINTS -----------------

@app.post("/api/dataset/load-demo")
def load_demo_dataset():
    demo_txs = generate_synthetic_transactions(seed=42)
    _reload_state(demo_txs, "synthetic_demo_v1", is_synthetic=True)
    return {
        "status": "success",
        "message": f"Loaded deterministic synthetic dataset with {len(demo_txs)} transactions",
        "dataset_name": state.dataset_name,
        "is_synthetic": True,
        "total_transactions": len(state.transactions)
    }

@app.post("/api/dataset/upload")
async def upload_dataset(file: UploadFile = File(...)):
    contents = await file.read()
    filename = file.filename or "uploaded_data"
    text = contents.decode("utf-8", errors="replace")

    try:
        if filename.endswith(".json") or text.strip().startswith("{") or text.strip().startswith("["):
            txs = parse_json_data(text)
        else:
            txs = parse_csv_data(text)
    except DataLoaderError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")

    _reload_state(txs, filename, is_synthetic=False)
    return {
        "status": "success",
        "message": f"Successfully validated and imported {len(txs)} transactions from '{filename}'",
        "dataset_name": filename,
        "is_synthetic": False,
        "total_transactions": len(state.transactions)
    }

@app.get("/api/dataset/stats", response_model=DatasetStats)
def get_dataset_stats():
    # Token volume summary
    vol_by_token: Dict[str, float] = {}
    for tx in state.transactions:
        vol_by_token[tx.token] = round(vol_by_token.get(tx.token, 0.0) + tx.amount, 4)

    timestamps = [tx.timestamp for tx in state.transactions]
    t_start = min(timestamps) if timestamps else None
    t_end = max(timestamps) if timestamps else None

    # Density: |E| / (|V| * (|V| - 1))
    v_count = len(state.graph.nodes_meta)
    e_count = len(state.graph.edge_map)
    max_e = v_count * (v_count - 1) if v_count > 1 else 1
    density = round(e_count / max_e, 5) if v_count > 1 else 0.0

    wcc = compute_connected_components(state.graph)

    flagged_count = sum(1 for m in state.graph.nodes_meta.values() if m["flagged"])

    return DatasetStats(
        total_transactions=len(state.transactions),
        unique_wallets=v_count,
        total_volume_by_token=vol_by_token,
        flagged_wallets_count=flagged_count,
        detected_patterns_count=len(state.findings),
        time_range_start=t_start,
        time_range_end=t_end,
        density=density,
        connected_components_count=wcc["total_components"]
    )

@app.get("/api/dataset/export")
def export_dataset_csv():
    csv_str = export_to_csv(state.transactions)
    return PlainTextResponse(
        content=csv_str,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={state.dataset_name}.csv"}
    )

# ----------------- TRANSACTIONS EXPLORER -----------------

@app.get("/api/transactions", response_model=PaginatedTransactions)
def get_transactions(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    search: Optional[str] = None,
    wallet_address: Optional[str] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    token: Optional[str] = None,
    sort_by: str = Query("timestamp"),
    sort_order: str = Query("desc")
):
    filtered = state.transactions

    if search:
        s = search.lower().strip()
        filtered = [
            tx for tx in filtered
            if s in tx.tx_hash.lower() or s in tx.from_address.lower() or s in tx.to_address.lower()
        ]

    if wallet_address:
        w = wallet_address.lower().strip()
        filtered = [tx for tx in filtered if tx.from_address.lower() == w or tx.to_address.lower() == w]

    if min_amount is not None:
        filtered = [tx for tx in filtered if tx.amount >= min_amount]

    if max_amount is not None:
        filtered = [tx for tx in filtered if tx.amount <= max_amount]

    if token:
        tk = token.upper().strip()
        filtered = [tx for tx in filtered if tx.token == tk]

    # Sort using our custom Merge Sort implementation
    descending = (sort_order.lower() == "desc")
    sorted_txs, _, _, _ = merge_sort(filtered, field=sort_by, descending=descending)

    total = len(sorted_txs)
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    start_idx = (page - 1) * page_size
    items = sorted_txs[start_idx : start_idx + page_size]

    return PaginatedTransactions(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )

@app.get("/api/transactions/{tx_hash}")
def get_transaction_detail(tx_hash: str):
    tx, elapsed_us, ops = state.index.lookup_hash_indexed(tx_hash.strip().lower())
    if not tx:
        # try exact case if not lower
        tx, elapsed_us, ops = state.index.lookup_hash_indexed(tx_hash.strip())
    if not tx:
        raise HTTPException(status_code=404, detail=f"Transaction '{tx_hash}' not found")
    
    return {
        "transaction": tx,
        "lookup_metrics": {
            "elapsed_us": round(elapsed_us, 2),
            "comparisons": ops,
            "method": "Hash Table O(1)"
        }
    }

# ----------------- GRAPH VISUALIZATION -----------------

@app.get("/api/graph", response_model=GraphData)
def get_graph_data(
    min_amount: float = Query(0.0, ge=0.0),
    start_time: Optional[int] = None,
    end_time: Optional[int] = None,
    wallet_filter: Optional[str] = None,
    neighborhood_hops: int = Query(0, ge=0, le=3),
    max_nodes: int = Query(250, ge=10, le=1000)
):
    return state.graph.get_graph_data(
        min_amount=min_amount,
        start_time=start_time,
        end_time=end_time,
        wallet_filter=wallet_filter,
        neighborhood_hops=neighborhood_hops,
        max_nodes=max_nodes
    )

# ----------------- WALLET ANALYTICS -----------------

@app.get("/api/wallets/{address}")
def get_wallet_profile_endpoint(address: str):
    profile = compute_wallet_profile(
        address=address,
        transactions=state.transactions,
        graph=state.graph,
        all_findings=state.findings
    )
    if not profile.get("found"):
        raise HTTPException(status_code=404, detail=profile.get("message"))
    return profile

# ----------------- PATTERNS INVESTIGATION -----------------

@app.get("/api/patterns/detect", response_model=List[InvestigationFinding])
def detect_patterns_endpoint(
    repeated_min_transfers: int = Query(5, ge=2),
    rapid_max_delay_seconds: int = Query(900, ge=30),
    rapid_amount_tolerance: float = Query(0.20, ge=0.01, le=1.0),
    high_activity_percentile: float = Query(95.0, ge=50.0, le=99.9),
    max_cycle_length: int = Query(5, ge=2, le=7),
    spike_multiplier: float = Query(3.0, ge=1.5),
    cluster_min_density: float = Query(0.6, ge=0.2, le=1.0)
):
    detector = PatternDetector(state.transactions, state.graph)
    findings = detector.detect_all(
        repeated_min_transfers=repeated_min_transfers,
        rapid_max_delay_seconds=rapid_max_delay_seconds,
        rapid_amount_tolerance=rapid_amount_tolerance,
        high_activity_percentile=high_activity_percentile,
        max_cycle_length=max_cycle_length,
        spike_multiplier=spike_multiplier,
        cluster_min_density=cluster_min_density
    )
    state.findings = findings
    return findings

# ----------------- ALGORITHM LABORATORY & BENCHMARKS -----------------

@app.get("/api/algorithms/lookup")
def compare_lookup_algorithm(tx_hash: Optional[str] = None):
    if not state.transactions:
        raise HTTPException(status_code=400, detail="No transactions loaded in dataset")

    target = tx_hash or state.transactions[len(state.transactions) // 2].tx_hash
    res = state.index.compare_lookup_methods(target)
    return res

@app.get("/api/algorithms/sort")
def compare_sort_algorithm(
    field: str = Query("amount"),
    descending: bool = Query(True),
    sample_limit: int = Query(500, ge=10, le=3000)
):
    slice_data = state.transactions[:sample_limit]
    res = compare_sort_algorithms(slice_data, field=field, descending=descending)
    
    # Also fetch mini trace for visual step display
    _, _, _, merge_trace = merge_sort(slice_data[:12], field=field, descending=descending, record_trace=True)
    _, _, _, ins_trace = insertion_sort(slice_data[:12], field=field, descending=descending, record_trace=True)
    
    res["merge_trace"] = merge_trace
    res["insertion_trace"] = ins_trace
    return res

@app.get("/api/algorithms/traverse")
def run_traversal_algorithm(
    start_wallet: Optional[str] = None,
    algorithm: str = Query("bfs", pattern="^(bfs|dfs)$"),
    max_depth: int = Query(8, ge=1, le=15)
):
    if not state.transactions:
        raise HTTPException(status_code=400, detail="No transactions loaded")

    w = start_wallet or state.transactions[0].from_address
    if algorithm.lower() == "bfs":
        res = run_bfs(state.graph, w, max_depth=max_depth, record_trace=True)
    else:
        res = run_dfs(state.graph, w, max_depth=max_depth, record_trace=True)

    return res

@app.get("/api/algorithms/shortest-path")
def run_shortest_path_endpoint(source: str, target: str):
    res = find_shortest_path_bfs(state.graph, source, target)
    return res

@app.get("/api/algorithms/cycles")
def run_cycle_detection_endpoint(max_length: int = Query(5, ge=2, le=6)):
    cycles = find_cycles(state.graph, max_cycle_length=max_length, max_cycles_to_find=15)
    return {
        "max_length": max_length,
        "cycles_found": cycles,
        "total_count": len(cycles),
        "complexity": f"O(V * d^{max_length}) bounded DFS",
        "description": "Finds closed directed transfer rings minimizing cycle explosion."
    }

@app.get("/api/algorithms/benchmarks")
def run_benchmarks_endpoint(sizes: Optional[str] = None):
    size_list = [100, 500, 1000, 2000]
    if sizes:
        try:
            size_list = [int(s.strip()) for s in sizes.split(",") if int(s.strip()) <= 5000]
        except Exception:
            size_list = [100, 500, 1000, 2000]
    
    return run_suite_benchmarks(sizes=size_list)

# ----------------- HACKER TERMINAL COMMAND CONSOLE -----------------

@app.post("/api/console/execute")
def execute_terminal_command(body: Dict[str, str] = Body(...)):
    raw_cmd = body.get("command", "").strip()
    if not raw_cmd:
        return {"output": "", "status": "empty"}

    log_audit("TERMINAL_CMD", raw_cmd)
    parts = raw_cmd.split()
    cmd = parts[0].lower()
    args = parts[1:]

    try:
        if cmd == "help":
            output = (
                "BLOCKSCOPE COMMAND INTERPRETER // SYSTEM V1.0.0\n"
                "---------------------------------------------------\n"
                "AVAILABLE COMMANDS:\n"
                "  status                  Display loaded dataset and subsystem status\n"
                "  stats                   Display dataset metrics and token volume breakdown\n"
                "  wallet <address>        Inspect forensic profile of a wallet\n"
                "  trace <address> [depth] Run BFS graph traversal starting from address\n"
                "  path <addr1> <addr2>    Find unweighted shortest path between two wallets\n"
                "  scan <type>             Run pattern scan (types: repeated, cycles, rapid,\n"
                "                          activity, spikes, clusters, all)\n"
                "  sort <field>            Sort transactions by field (amount, timestamp)\n"
                "  bench                   Run algorithmic benchmark suite (N=100..2000)\n"
                "  export                  Export current dataset to CSV format\n"
                "  demo                    Reload the standard deterministic demo dataset\n"
                "  clear                   Clear terminal display buffer\n"
            )
            return {"command": raw_cmd, "output": output, "status": "ok"}

        elif cmd == "status":
            output = (
                f"[SYS] DATASET: {state.dataset_name}\n"
                f"[SYS] MODE: {'SYNTHETIC DEMO' if state.is_synthetic else 'USER IMPORTED'}\n"
                f"[SYS] TRANSACTIONS: {len(state.transactions)}\n"
                f"[SYS] WALLETS (NODES): {len(state.graph.nodes_meta)}\n"
                f"[SYS] DIRECTED EDGES: {len(state.graph.edge_map)}\n"
                f"[SYS] ACTIVE FINDINGS: {len(state.findings)}\n"
                f"[SYS] INDEX STATUS: READY (O(1) Hash Map Active)\n"
                f"[SYS] RPC PROVIDER: {state.blockchain_provider.network_name}"
            )
            return {"command": raw_cmd, "output": output, "status": "ok"}

        elif cmd == "stats":
            vol_by_token: Dict[str, float] = {}
            for tx in state.transactions:
                vol_by_token[tx.token] = round(vol_by_token.get(tx.token, 0.0) + tx.amount, 2)
            vol_str = ", ".join([f"{amt} {tk}" for tk, amt in vol_by_token.items()])
            
            output = (
                f"[STATS] TOTAL TRANSACTIONS: {len(state.transactions)}\n"
                f"[STATS] UNIQUE WALLETS: {len(state.graph.nodes_meta)}\n"
                f"[STATS] VOLUME BY TOKEN: {vol_str}\n"
                f"[STATS] FLAGGED WALLETS: {sum(1 for m in state.graph.nodes_meta.values() if m['flagged'])}\n"
                f"[STATS] ANOMALY FINDINGS: {len(state.findings)}"
            )
            return {"command": raw_cmd, "output": output, "status": "ok"}

        elif cmd == "wallet":
            if not args:
                return {"command": raw_cmd, "output": "[ERROR] Missing wallet address. Usage: wallet <0x...>", "status": "error"}
            target_addr = args[0]
            profile = compute_wallet_profile(target_addr, state.transactions, state.graph, state.findings)
            if not profile.get("found"):
                return {"command": raw_cmd, "output": f"[WARN] Wallet '{target_addr}' not found in active dataset.", "status": "warn"}

            vol_in = ", ".join([f"{v} {k}" for k, v in profile['volume_in_by_token'].items()]) or "0"
            vol_out = ", ".join([f"{v} {k}" for k, v in profile['volume_out_by_token'].items()]) or "0"

            output = (
                f"[WALLET] ADDRESS: {profile['address']}\n"
                f"[WALLET] STATUS: [{profile['status_label']}]\n"
                f"[WALLET] TX COUNT: {profile['total_transactions']} (IN: {profile['total_incoming_txs']}, OUT: {profile['total_outgoing_txs']})\n"
                f"[WALLET] UNIQUE COUNTERPARTIES: {profile['unique_counterparties_count']}\n"
                f"[WALLET] VOLUME IN: {vol_in}\n"
                f"[WALLET] VOLUME OUT: {vol_out}\n"
                f"[WALLET] INVOLVED FINDINGS: {len(profile['involved_findings'])}"
            )
            return {"command": raw_cmd, "output": output, "status": "ok", "action": "OPEN_WALLET", "data": profile}

        elif cmd == "trace":
            if not args:
                return {"command": raw_cmd, "output": "[ERROR] Missing wallet address. Usage: trace <0x...> [depth]", "status": "error"}
            w = args[0]
            depth = int(args[1]) if len(args) > 1 and args[1].isdigit() else 4
            res = run_bfs(state.graph, w, max_depth=depth, record_trace=False)
            if "error" in res:
                return {"command": raw_cmd, "output": f"[ERROR] {res['error']}", "status": "error"}

            visited_list = [x["wallet"][:10] + f" (d={x['depth']})" for x in res["traversal_order"][:10]]
            output = (
                f"[TRACE] BFS ROOT: {res['start_wallet']}\n"
                f"[TRACE] NODES REACHED: {res['nodes_visited_count']} within depth {depth}\n"
                f"[TRACE] EDGES TRAVERSED: {res['edges_traversed_count']}\n"
                f"[TRACE] TIME: {res['elapsed_us']} us\n"
                f"[TRACE] VISITATION SAMPLE: {', '.join(visited_list)}"
            )
            return {"command": raw_cmd, "output": output, "status": "ok", "action": "HIGHLIGHT_TRACE", "data": res}

        elif cmd == "path":
            if len(args) < 2:
                return {"command": raw_cmd, "output": "[ERROR] Missing endpoints. Usage: path <src_wallet> <dst_wallet>", "status": "error"}
            src, dst = args[0], args[1]
            res = find_shortest_path_bfs(state.graph, src, dst)
            if not res.get("found"):
                return {"command": raw_cmd, "output": f"[PATH] {res.get('message', res.get('error', 'No path found'))}", "status": "warn"}

            path_str = " -> ".join([f"{w[:8]}..." for w in res["path"]])
            output = (
                f"[PATH] SHORTEST UNWEIGHTED ROUTE ({res['hop_count']} HOPS):\n"
                f"[PATH] {path_str}\n"
                f"[PATH] COMPUTED IN {res['elapsed_us']} us VIA BFS\n"
                f"[NOTE] Path minimizes edge count, not amount or transfer duration."
            )
            return {"command": raw_cmd, "output": output, "status": "ok", "action": "HIGHLIGHT_PATH", "data": res}

        elif cmd == "scan":
            scan_type = args[0].lower() if args else "all"
            detector = PatternDetector(state.transactions, state.graph)
            findings = []
            if scan_type in ["repeated", "all"]:
                findings.extend(detector.detect_repeated_transfers())
            if scan_type in ["cycles", "all"]:
                findings.extend(detector.detect_circular_flows())
            if scan_type in ["rapid", "all"]:
                findings.extend(detector.detect_rapid_fund_movements())
            if scan_type in ["activity", "all"]:
                findings.extend(detector.detect_high_activity())
            if scan_type in ["spikes", "all"]:
                findings.extend(detector.detect_activity_spikes())
            if scan_type in ["clusters", "all"]:
                findings.extend(detector.detect_dense_clusters())

            lines = [f"[SCAN] COMPLETED SCAN: {scan_type.upper()} ({len(findings)} FINDINGS)"]
            for f in findings[:6]:
                lines.append(f"  * [{f.severity}] {f.title}: {f.description[:90]}...")
            if len(findings) > 6:
                lines.append(f"  ... and {len(findings) - 6} additional findings.")

            return {"command": raw_cmd, "output": "\n".join(lines), "status": "ok", "action": "UPDATE_FINDINGS", "data": findings}

        elif cmd == "sort":
            field = args[0].lower() if args else "amount"
            cmp_res = compare_sort_algorithms(state.transactions, field=field, descending=True)
            output = (
                f"[SORT] COMPARING MERGE SORT VS INSERTION SORT ON N={cmp_res['dataset_size']} (FIELD: {field}):\n"
                f"[SORT] MERGE SORT: {cmp_res['merge_sort']['time_ms']} ms ({cmp_res['merge_sort']['comparisons']} comparisons) [O(N log N)]\n"
                f"[SORT] INSERTION SORT: {cmp_res['insertion_sort']['time_ms']} ms ({cmp_res['insertion_sort']['comparisons']} comparisons) [O(N^2)]\n"
                f"[SORT] SPEEDUP FACTOR: {cmp_res['speedup_factor']}x"
            )
            return {"command": raw_cmd, "output": output, "status": "ok"}

        elif cmd == "bench":
            b = run_suite_benchmarks(sizes=[100, 500, 1000])
            lines = [
                f"[BENCH] SUITE COMPLETED ON {b['environment']['platform']}:",
                "  SIZE | INDEX BUILD | HASH LOOKUP | LINEAR SCAN | MERGE SORT | BFS TRAVERSE",
                "  --------------------------------------------------------------------------"
            ]
            for n, r in b["results_by_size"].items():
                lines.append(
                    f"  {n:<4} | {r['index_build_us']:>9}us | {r['hash_lookup_us']:>9}us | {r['linear_lookup_us']:>9}us | {r['merge_sort_ms']:>8}ms | {r['bfs_traversal_us']:>10}us"
                )
            return {"command": raw_cmd, "output": "\n".join(lines), "status": "ok", "action": "OPEN_BENCH", "data": b}

        elif cmd == "demo":
            demo_txs = generate_synthetic_transactions(seed=42)
            _reload_state(demo_txs, "synthetic_demo_v1", is_synthetic=True)
            return {"command": raw_cmd, "output": f"[DONE] Reset and loaded demo dataset ({len(demo_txs)} txs).", "status": "ok"}

        elif cmd == "clear":
            return {"command": raw_cmd, "output": "", "status": "clear"}

        else:
            return {
                "command": raw_cmd,
                "output": f"[ERROR] Unknown command '{cmd}'. Type 'help' for available commands.",
                "status": "error"
            }

    except Exception as e:
        return {"command": raw_cmd, "output": f"[CRITICAL ERROR] Execution failed: {str(e)}", "status": "error"}

# ----------------- REPORTS ENDPOINTS -----------------

@app.post("/api/reports/save")
def save_report_endpoint(body: Dict[str, Any] = Body(...)):
    report_id = f"rep_{int(time.time())}"
    title = body.get("title", f"Investigation Report {report_id}")
    report_type = body.get("report_type", "FORENSIC_SUMMARY")
    content = body.get("content_markdown", "")
    metadata = body.get("metadata", {})

    saved = save_investigation_report(report_id, title, report_type, content, metadata)
    return {"status": "success", "report": saved}

@app.get("/api/reports/list")
def list_reports_endpoint():
    return list_saved_reports()

@app.get("/api/reports/{report_id}")
def get_report_endpoint(report_id: str):
    r = get_saved_report(report_id)
    if not r:
        raise HTTPException(status_code=404, detail="Report not found")
    return r

# ----------------- LIVE BLOCKCHAIN PROVIDER -----------------

@app.get("/api/blockchain/lookup")
def query_blockchain_address(address: str):
    res = state.blockchain_provider.query_wallet_transactions(address)
    return res
