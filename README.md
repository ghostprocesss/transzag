# BLOCKSCOPE // Blockchain Transaction Intelligence Workstation
> **Cybersecurity Transaction Analysis, Forensic Graph Visualization & DAA Algorithm Laboratory**

BlockScope is a full-stack, retro-futuristic cyber-intelligence investigation workstation designed for analyzing blockchain transaction records, identifying topological fund-flow patterns, and demonstrating core **Design and Analysis of Algorithms (DAA)** concepts in real-time.

---

## 1. Architectural Overview

```
                      +---------------------------------------+
                      |       USER BROWSER / OPERATOR         |
                      |  [Retro Terminal BIOS / CRT Surface]  |
                      +---------------------------------------+
                                          |
                +-------------------------+-------------------------+
                | HTTP / JSON REST                                  |
                v                                                   v
+-------------------------------+               +-------------------------------+
|       REACT + TYPESCRIPT      |               |     FASTAPI PYTHON SERVER     |
|          FRONTEND             |               |            BACKEND            |
|-------------------------------|               |-------------------------------|
| - Terminal Header & Nav       |               | - Data Loader & Validation    |
| - Command Console (TTY TTY_1) | <===========> | - Multi-Key Hash Indexer      |
| - ASCII Density Matrix        |               | - Merge & Insertion Sort      |
| - Cytoscape.js Directed Graph |               | - BFS / DFS Traversals        |
| - Recharts Temporal Charts    |               | - Unweighted Shortest Path    |
| - Investigation Dossier Modal |               | - Bounded Cycle Detection     |
| - DAA Lab & Benchmarks Suite  |               | - Pattern Detector (6 Rules)  |
| - SQLite Reports Viewer       |               | - SQLite Persistence Engine   |
+-------------------------------+               +-------------------------------+
```

---

## 2. Key Features

### A. Retro BIOS / Cyberpunk Hacker Terminal UI
- **Phosphor Green & High-Tech Cyan Visuals**: Authentic cyberpunk monospace terminal with CRT scanline simulation, glowing headers, and rectangular technical panels.
- **Topological Adjacency Density Matrix**: Distinctive animated ASCII character-based visualization mapping real graph density ($\rho$), vertex counts, and structural clustering.
- **Interactive Command Console (`root@blockscope:~$`)**: Real command-line interpreter supporting command history (Up/Down arrow navigation), tab execution, and direct API synchronization (`status`, `stats`, `wallet <addr>`, `trace <addr>`, `path <addr1> <addr2>`, `scan <type>`, `sort <field>`, `bench`, `demo`, `clear`).

### B. Interactive Wallet Relationship Graph (Cytoscape.js)
- Wallets represented as glowing vertices, directed transfers as arrows.
- Dynamic node sizing by degree and edge thickness by cumulative volume/frequency.
- **Explainable Anomaly Statuses**: `NORMAL` (Green), `REVIEW_RECOMMENDED` (Cyan), `PRIORITY_REVIEW` (Amber).
- Real-time physics layouts: `COSE`, `Concentric`, `Circle`, `Hierarchical (BFS)`.
- Interactive BFS Pathfinder to calculate unweighted shortest transfer hops.

### C. Pattern Investigation Center
Identifies 6 key topological signals with configurable parameter sliders:
1. **Repeated Transfers**: Unusually frequent pairs transacting above threshold count.
2. **Rapid Fund Movement**: Candidate peeling / pass-through chains where inflow is transferred onward within $\Delta t \le 900$s.
3. **High Activity Hubs**: Outlier wallets exceeding non-parametric percentile bounds ($\ge 95$th percentile).
4. **Circular Flows**: Elementary directed cycles ($k \in [2, 6]$) with transaction-chain reconstruction.
5. **Dense Clusters**: Subgraphs with internal density $\ge 60\%$.
6. **Activity Spikes**: Sudden hourly burst volumes exceeding $3\times$ baseline.
*Every finding includes transparent mathematical evidence, plain-language forensic explanations, and explicit non-accusatory disclaimers.*

### D. DAA Algorithm Laboratory & Empirical Benchmarking Suite
- **Hash Table Indexing vs. Linear Scan**: Direct empirical lookup comparison demonstrating $O(1)$ expected vs. $O(N)$ sequential iterations and speedup factor.
- **Merge Sort vs. Insertion Sort**: Divide-and-conquer $O(N \log N)$ vs. $O(N^2)$ quadratic overhead with recursive conquer step-trace visualizer.
- **Graph Traversal (BFS & DFS)**: Queue-based level-order vs. stack-based depth traversal with live discovery order and depth metrics.
- **Unweighted Shortest Path (BFS)**: Minimizes intermediary wallet hops.
- **Benchmark Suite**: Multi-scale performance benchmark across $N \in [100, 500, 1000, 2000]$, plotting scaling curves and operation tables.

---

## 3. Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS v4, Cytoscape.js, Recharts, Lucide Icons.
- **Backend**: Python 3.14+, FastAPI, Pydantic v2, Uvicorn, SQLite3.
- **Algorithms**: Hand-crafted custom algorithmic implementations (Zero black-box graph libraries used for core DAA logic).
- **Testing**: Pytest automated test suite.

---

## 4. Formal DAA Complexity Specification

| Algorithm | Problem Addressed | Worst-Case Time | Average Time | Space Complexity | Algorithmic Paradigm |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Hash Table Indexing** | Instant transaction lookup by hash/address | $O(N)$ | $O(1)$ | $O(N)$ | Cryptographic Hashing |
| **Linear Scan** | Brute-force unsorted transaction scan | $O(N)$ | $O(N)$ | $O(1)$ | Exhaustive Search |
| **Merge Sort** | Stable ledger sorting by amount / timestamp | $O(N \log N)$ | $O(N \log N)$ | $O(N)$ | Divide and Conquer |
| **Insertion Sort** | Quadratic comparison sort benchmark | $O(N^2)$ | $O(N^2)$ | $O(1)$ | Incremental Placement |
| **BFS Traversal** | Level-order discovery & unweighted shortest hops | $O(V + E)$ | $O(V + E)$ | $O(V)$ | Queue-based Frontier |
| **DFS Traversal** | Deep chain probe & reachable components | $O(V + E)$ | $O(V + E)$ | $O(V)$ | Recursive Stack Backtracking |
| **Cycle Detection** | Circular wash-trading loop detection ($k \le 6$) | $O(V \cdot d^k)$ | $O(V \cdot d^k)$ | $O(V + k)$ | Bounded Pruned DFS |
| **Weakly Connected Comp.** | Disjoint cluster / community isolation | $O(V + E)$ | $O(V + E)$ | $O(V)$ | Undirected Disjoint BFS |

---

## 5. Dataset Schema

BlockScope supports CSV and JSON imports conforming to the following structure:

```csv
tx_hash,from_address,to_address,amount,token,timestamp,block_number,status
0x42f8...c9a1,0x1111...1111,0x2222...2222,14.5,ETH,1710000000,19450000,confirmed
```

- `tx_hash` (Required): Unique transaction hash starting with `0x`.
- `from_address` (Required): Sender wallet address starting with `0x`.
- `to_address` (Required): Recipient wallet address starting with `0x`.
- `amount` (Required): Non-negative numeric transfer value.
- `token` (Optional, default `ETH`): Asset symbol (`ETH`, `USDT`, `DAI`). Strictly separated in forensic accounting.
- `timestamp` (Required): Unix timestamp in seconds.
- `block_number` (Optional): Positive integer block number.
- `status` (Optional): Execution status (default `confirmed`).

A pre-packaged deterministic synthetic dataset with 224 transactions and realistic topological patterns is located at `data/sample_transactions.csv`.

---

## 6. Installation & Run Instructions

### Prerequisites
- Python 3.10+ (Tested on Python 3.14.3)
- Node.js v18+ and npm v9+ (Tested on Node v24.16.0 / npm 11.13.0)

### Backend Setup & Launch
```bash
# 1. Install backend dependencies (if needed)
python -m pip install fastapi uvicorn pydantic pytest

# 2. Launch FastAPI backend server (port 8000)
python backend/run.py
```
Backend will be available at `http://127.0.0.1:8000` (API documentation at `http://127.0.0.1:8000/docs`).

### Frontend Setup & Launch
```bash
# 1. Navigate to frontend directory and install dependencies
cd frontend
npm install

# 2. Launch Vite development workstation
npm run dev
```
Workstation UI will be available at `http://127.0.0.1:5173`.

### Running Automated Test Suite
```bash
# Execute the comprehensive Pytest suite from workspace root
python -m pytest backend/tests -v
```

---

## 7. Interactive Terminal Console Guide

The workstation features a live terminal console prompt (`root@blockscope:~$`). Operators can execute:

- `help`: Display list of terminal commands.
- `status`: Display loaded dataset, node count, edge count, and subsystem telemetry.
- `stats`: Display asset volume totals and flagged wallet counts.
- `wallet <address>`: Open detailed wallet investigation dossier.
- `trace <address> [depth]`: Run BFS exploration from target wallet.
- `path <addr1> <addr2>`: Calculate unweighted shortest path between wallets.
- `scan <type>`: Run pattern detection (`repeated`, `cycles`, `rapid`, `activity`, `spikes`, `clusters`, `all`).
- `sort <field>`: Benchmark Merge Sort vs. Insertion Sort on active transactions.
- `bench`: Execute empirical benchmark suite across dataset sizes.
- `demo`: Reset and reload the deterministic synthetic dataset.
- `clear`: Clear terminal screen.

---

## 8. Evidentiary Disclaimer & Ethical Guidelines

> **IMPORTANT FORENSIC NOTICE:**
> Signals surfaced by BlockScope (e.g., circular paths, rapid hops, high transaction frequency) reflect mathematical and algorithmic graph anomalies. They do **NOT** constitute legal evidence of fraud, money laundering, or criminal wrongdoing. Legitimate market behaviors (such as automated market makers, decentralized exchange arbitrage, batch settlement contracts, and exchange hot wallets) routinely exhibit these exact patterns. Forensic analysts must always conduct manual corroboration and independent investigation.
