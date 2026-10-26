import React, { useState } from 'react';
import {
  Cpu,
  Layers,
  Search,
  ArrowUpDown,
  Route,
  RefreshCw,
  Play,
  RotateCcw,
  CheckCircle2,
  FileCode2,
  Info
} from 'lucide-react';
import {
  fetchLookupComparison,
  fetchSortComparison,
  fetchTraversal,
  fetchShortestPath
} from '../api';
import { formatAddress } from '../utils/formatters';

interface Props {
  onSelectWallet: (address: string) => void;
}

export const AlgorithmLaboratory: React.FC<Props> = ({ onSelectWallet }) => {
  const [activeSubTab, setActiveSubTab] = useState<'indexing' | 'sorting' | 'traversal' | 'cycles' | 'complexity'>('indexing');

  // State for Lookup
  const [targetHash, setTargetHash] = useState('');
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  // State for Sorting
  const [sortField, setSortField] = useState('amount');
  const [sortSampleSize, setSortSampleSize] = useState(250);
  const [sortResult, setSortResult] = useState<any>(null);
  const [sortLoading, setSortLoading] = useState(false);

  // State for Traversal
  const [traversalWallet, setTraversalWallet] = useState('');
  const [traversalAlgo, setTraversalAlgo] = useState<'bfs' | 'dfs'>('bfs');
  const [traversalResult, setTraversalResult] = useState<any>(null);
  const [traversalLoading, setTraversalLoading] = useState(false);

  const runLookupTest = async () => {
    setLookupLoading(true);
    try {
      const res = await fetchLookupComparison(targetHash.trim() || undefined);
      setLookupResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLookupLoading(false);
    }
  };

  const runSortTest = async () => {
    setSortLoading(true);
    try {
      const res = await fetchSortComparison(sortField, true);
      setSortResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setSortLoading(false);
    }
  };

  const runTraversalTest = async () => {
    setTraversalLoading(true);
    try {
      const res = await fetchTraversal(traversalWallet.trim() || undefined, traversalAlgo, 8);
      setTraversalResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setTraversalLoading(false);
    }
  };

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Sub navigation for lab modules */}
      <div className="border border-[#132e1f] bg-[#060c08] p-1.5 flex flex-wrap gap-2 text-xs">
        {[
          { id: 'indexing', label: '1. HASH INDEXING VS LINEAR SCAN' },
          { id: 'sorting', label: '2. MERGE SORT VS INSERTION SORT' },
          { id: 'traversal', label: '3. GRAPH TRAVERSAL (BFS / DFS)' },
          { id: 'complexity', label: '4. THEORETICAL COMPLEXITY MATRIX' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`px-3 py-1.5 font-bold transition-colors ${
              activeSubTab === tab.id
                ? 'border border-[#00f0ff] bg-[#00f0ff]/10 text-[#00f0ff] glow-cyan'
                : 'border border-transparent text-[#5a8a6e] hover:border-[#132e1f] hover:text-[#00ff66]'
            }`}
          >
            [ {tab.label} ]
          </button>
        ))}
      </div>

      {/* 1. HASH INDEXING VS LINEAR SCAN */}
      {activeSubTab === 'indexing' && (
        <div className="space-y-3">
          <div className="border border-[#132e1f] bg-[#050a07] p-3">
            <h3 className="text-[#00ff66] font-bold text-sm mb-1">
              DEMONSTRATION: MULTI-KEY HASH INDEXING VS LINEAR SEQUENTIAL SCAN
            </h3>
            <p className="text-[#5a8a6e] text-xs leading-relaxed">
              In high-throughput blockchain networks with millions of transactions, linear scanning requires inspecting
              every record sequentially (O(N) time and comparisons). By building an in-memory Hash Table index with cryptographic
              keys (tx_hash, sender, receiver), lookup achieves O(1) expected constant time.
            </p>

            <div className="mt-3 flex items-center space-x-2">
              <input
                type="text"
                placeholder="Target Transaction Hash (leave empty for sample record)..."
                value={targetHash}
                onChange={(e) => setTargetHash(e.target.value)}
                className="flex-1 bg-[#030604] border border-[#132e1f] px-2 py-1.5 text-xs text-[#00ff66] focus:outline-none focus:border-[#00ff66]"
              />
              <button
                onClick={runLookupTest}
                disabled={lookupLoading}
                className="border border-[#00ff66] bg-[#00ff66]/10 hover:bg-[#00ff66]/20 text-[#00ff66] px-4 py-1.5 font-bold transition-colors"
              >
                {lookupLoading ? 'EXECUTING TEST...' : '[RUN COMPARISON BENCHMARK]'}
              </button>
            </div>
          </div>

          {lookupResult && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Hash Table Card */}
              <div className="border border-[#00ff66] bg-[#00ff66]/5 p-4 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between border-b border-[#00ff66]/40 pb-1 mb-2">
                    <span className="text-[#00ff66] font-bold text-sm">HASH TABLE INDEXED</span>
                    <span className="text-[#00ff66] font-mono">[O(1) EXPECTED]</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#5a8a6e]">EXECUTION TIME:</span>
                      <span className="text-[#00ff66] font-bold text-sm">{lookupResult.indexed.elapsed_us} µs</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#5a8a6e]">KEY COMPARISONS:</span>
                      <span className="text-[#00ff66] font-bold">{lookupResult.indexed.comparisons} hash probe</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#5a8a6e]">THEORETICAL TIME:</span>
                      <span className="text-[#00ff66]">O(1) average, O(N) worst-case collision</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#5a8a6e]">SPACE COMPLEXITY:</span>
                      <span className="text-[#00ff66]">O(N) heap allocation</span>
                    </div>
                  </div>
                </div>
                <div className="border-t border-[#00ff66]/40 pt-2 mt-4 text-[11px] text-[#00ff66]">
                  STATUS: INSTANT RETRIEVAL VERIFIED
                </div>
              </div>

              {/* Linear Scan Card */}
              <div className="border border-[#ffb000] bg-[#ffb000]/5 p-4 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between border-b border-[#ffb000]/40 pb-1 mb-2">
                    <span className="text-[#ffb000] font-bold text-sm">LINEAR SEQUENTIAL SCAN</span>
                    <span className="text-[#ffb000] font-mono">[O(N)]</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#5a8a6e]">EXECUTION TIME:</span>
                      <span className="text-[#ffb000] font-bold text-sm">{lookupResult.linear_scan.elapsed_us} µs</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#5a8a6e]">ELEMENT COMPARISONS:</span>
                      <span className="text-[#ffb000] font-bold">{lookupResult.linear_scan.comparisons} iterations</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#5a8a6e]">TOTAL RECORDS SEARCHED:</span>
                      <span className="text-[#ffb000]">{lookupResult.total_records} transactions</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#5a8a6e]">THEORETICAL TIME:</span>
                      <span className="text-[#ffb000]">O(N) proportional to dataset length</span>
                    </div>
                  </div>
                </div>
                <div className="border-t border-[#ffb000]/40 pt-2 mt-4 text-[11px] text-[#ffb000]">
                  SPEEDUP FACTOR: {lookupResult.speedup_factor}x FASTER VIA HASH TABLE
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. MERGE SORT VS INSERTION SORT */}
      {activeSubTab === 'sorting' && (
        <div className="space-y-3">
          <div className="border border-[#132e1f] bg-[#050a07] p-3">
            <h3 className="text-[#00ff66] font-bold text-sm mb-1">
              DEMONSTRATION: MERGE SORT (O(N log N)) VS INSERTION SORT (O(N²))
            </h3>
            <p className="text-[#5a8a6e] text-xs leading-relaxed">
              Sorting transactions by value or timestamp is vital for forensic timeline reconstruction.
              Merge Sort guarantees O(N log N) divide-and-conquer runtime in all cases. In contrast, Insertion Sort
              exhibits quadratic O(N²) growth as dataset size expands.
            </p>

            <div className="mt-3 flex items-center space-x-3">
              <span className="text-[#5a8a6e]">SORT FIELD:</span>
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value)}
                className="bg-[#030604] border border-[#132e1f] text-[#00ff66] px-2 py-1 text-xs"
              >
                <option value="amount">Amount</option>
                <option value="timestamp">Timestamp</option>
              </select>

              <button
                onClick={runSortTest}
                disabled={sortLoading}
                className="border border-[#00f0ff] bg-[#00f0ff]/10 hover:bg-[#00f0ff]/20 text-[#00f0ff] px-4 py-1 font-bold transition-colors"
              >
                {sortLoading ? 'BENCHMARKING SORTS...' : '[RUN DUAL SORT BENCHMARK]'}
              </button>
            </div>
          </div>

          {sortResult && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Merge Sort */}
                <div className="border border-[#00f0ff] bg-[#00f0ff]/5 p-4">
                  <div className="flex justify-between border-b border-[#00f0ff]/40 pb-1 mb-2">
                    <span className="text-[#00f0ff] font-bold text-sm">MERGE SORT</span>
                    <span className="text-[#00f0ff] font-mono">[O(N log N)]</span>
                  </div>
                  <div className="space-y-1.5 text-xs text-[#5a8a6e]">
                    <div className="flex justify-between">
                      <span>TIME ELAPSED:</span>
                      <span className="text-[#00ff66] font-bold">{sortResult.merge_sort.time_ms} ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span>COMPARISONS:</span>
                      <span className="text-[#00ff66] font-bold">{sortResult.merge_sort.comparisons.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>STABILITY:</span>
                      <span className="text-[#00ff66]">Stable (Preserves arrival order)</span>
                    </div>
                  </div>
                </div>

                {/* Insertion Sort */}
                <div className="border border-[#ffb000] bg-[#ffb000]/5 p-4">
                  <div className="flex justify-between border-b border-[#ffb000]/40 pb-1 mb-2">
                    <span className="text-[#ffb000] font-bold text-sm">INSERTION SORT</span>
                    <span className="text-[#ffb000] font-mono">[O(N²)]</span>
                  </div>
                  <div className="space-y-1.5 text-xs text-[#5a8a6e]">
                    <div className="flex justify-between">
                      <span>TIME ELAPSED:</span>
                      <span className="text-[#ffb000] font-bold">{sortResult.insertion_sort.time_ms} ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span>COMPARISONS:</span>
                      <span className="text-[#ffb000] font-bold">{sortResult.insertion_sort.comparisons.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>QUADRATIC OVERHEAD:</span>
                      <span className="text-[#ffb000] font-bold">{sortResult.speedup_factor}x slower</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step Trace Visualizer */}
              {sortResult.merge_trace && (
                <div className="border border-[#132e1f] bg-[#050a07] p-3">
                  <div className="text-[11px] text-[#00ff66] font-bold border-b border-[#132e1f] pb-1.5 mb-2">
                    MERGE SORT RECURSIVE SUBDIVISION &amp; CONQUER TRACE (FIRST 8 SUB-STEPS)
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px]">
                    {sortResult.merge_trace.slice(0, 8).map((st: any, idx: number) => (
                      <div key={idx} className="bg-[#030604] border border-[#132e1f] p-2 space-y-0.5">
                        <div className="text-[#00f0ff] font-bold">DEPTH {st.depth} // MERGE</div>
                        <div>LEFT ({st.left_len}): [{st.left_sample.join(', ')}]</div>
                        <div>RIGHT ({st.right_len}): [{st.right_sample.join(', ')}]</div>
                        <div className="text-[#00ff66]">OUT: [{st.merged_sample.join(', ')}...]</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3. GRAPH TRAVERSAL (BFS / DFS) */}
      {activeSubTab === 'traversal' && (
        <div className="space-y-3">
          <div className="border border-[#132e1f] bg-[#050a07] p-3">
            <h3 className="text-[#00ff66] font-bold text-sm mb-1">
              DEMONSTRATION: BREADTH-FIRST SEARCH (BFS) &amp; DEPTH-FIRST SEARCH (DFS)
            </h3>
            <p className="text-[#5a8a6e] text-xs leading-relaxed">
              BFS uses a FIFO queue to explore wallet counterparties level-by-level, making it ideal for finding
              shortest transfer hops. DFS uses a LIFO call stack to probe deep laundering chains and cycles.
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="Root wallet address (leave empty for first wallet in graph)..."
                value={traversalWallet}
                onChange={(e) => setTraversalWallet(e.target.value)}
                className="flex-1 min-w-[280px] bg-[#030604] border border-[#132e1f] px-2 py-1.5 text-xs text-[#00ff66] focus:outline-none"
              />

              <div className="flex items-center space-x-1 border border-[#132e1f] bg-[#030604] p-1">
                <button
                  onClick={() => setTraversalAlgo('bfs')}
                  className={`px-2 py-0.5 text-xs font-bold ${
                    traversalAlgo === 'bfs' ? 'bg-[#00ff66]/20 text-[#00ff66] border border-[#00ff66]' : 'text-[#5a8a6e]'
                  }`}
                >
                  BFS (QUEUE)
                </button>
                <button
                  onClick={() => setTraversalAlgo('dfs')}
                  className={`px-2 py-0.5 text-xs font-bold ${
                    traversalAlgo === 'dfs' ? 'bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]' : 'text-[#5a8a6e]'
                  }`}
                >
                  DFS (STACK)
                </button>
              </div>

              <button
                onClick={runTraversalTest}
                disabled={traversalLoading}
                className="border border-[#00ff66] bg-[#00ff66]/10 hover:bg-[#00ff66]/20 text-[#00ff66] px-3 py-1.5 font-bold transition-colors"
              >
                {traversalLoading ? 'TRAVERSING...' : '[EXECUTE TRAVERSAL]'}
              </button>
            </div>
          </div>

          {traversalResult && (
            <div className="space-y-3">
              <div className="border border-[#132e1f] bg-[#050a07] p-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[#5a8a6e]">ALGORITHM:</span>
                  <p className="text-[#00ff66] font-bold">{traversalResult.algorithm}</p>
                </div>
                <div>
                  <span className="text-[#5a8a6e]">REACHABLE VERTICES:</span>
                  <p className="text-[#00f0ff] font-bold">{traversalResult.nodes_visited_count} nodes</p>
                </div>
                <div>
                  <span className="text-[#5a8a6e]">EDGES TRAVERSED:</span>
                  <p className="text-[#00ff66] font-bold">{traversalResult.edges_traversed_count} directed edges</p>
                </div>
                <div>
                  <span className="text-[#5a8a6e]">TIME:</span>
                  <p className="text-[#ffb000] font-bold">{traversalResult.elapsed_us} µs</p>
                </div>
              </div>

              {/* Traversal Order Breakdown */}
              <div className="border border-[#132e1f] bg-[#050a07] p-3">
                <div className="text-[11px] text-[#00ff66] font-bold border-b border-[#132e1f] pb-1.5 mb-2">
                  EXPLORATION DISCOVERY SEQUENCE
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
                  {traversalResult.traversal_order?.map((item: any, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => onSelectWallet(item.wallet)}
                      className="border border-[#132e1f] hover:border-[#00ff66] bg-[#030604] px-2 py-0.5 text-[10px] text-[#00ff66]"
                    >
                      #{idx + 1} {formatAddress(item.wallet, 4)} (d={item.depth})
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. THEORETICAL COMPLEXITY MATRIX */}
      {activeSubTab === 'complexity' && (
        <div className="border border-[#132e1f] bg-[#050a07] p-4 space-y-3">
          <div className="border-b border-[#132e1f] pb-2">
            <h3 className="text-[#00ff66] font-bold text-sm">
              DESIGN AND ANALYSIS OF ALGORITHMS (DAA) FORMAL COMPLEXITY SPECIFICATION
            </h3>
            <p className="text-[#5a8a6e] text-xs mt-1">
              Theoretical Big-O asymptotic runtime bounds and space memory footprints implemented across the BlockScope platform.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#132e1f] bg-[#07120a] text-[#5a8a6e]">
                  <th className="p-2">ALGORITHM</th>
                  <th className="p-2">PROBLEM SOLVED</th>
                  <th className="p-2">WORST TIME</th>
                  <th className="p-2">AVERAGE TIME</th>
                  <th className="p-2">SPACE</th>
                  <th className="p-2">PARADIGM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#132e1f]/60">
                <tr className="hover:bg-[#00ff66]/5">
                  <td className="p-2 text-[#00ff66] font-bold">Hash Table Indexing</td>
                  <td className="p-2 text-[#5a8a6e]">O(1) transaction retrieval by hash/address</td>
                  <td className="p-2 text-[#ffb000]">O(N)</td>
                  <td className="p-2 text-[#00ff66]">O(1)</td>
                  <td className="p-2 text-[#00f0ff]">O(N)</td>
                  <td className="p-2 text-[#5a8a6e]">Hashing &amp; Direct Addressing</td>
                </tr>
                <tr className="hover:bg-[#00ff66]/5">
                  <td className="p-2 text-[#00ff66] font-bold">Merge Sort</td>
                  <td className="p-2 text-[#5a8a6e]">Stable sorting of ledger by timestamp/value</td>
                  <td className="p-2 text-[#00ff66]">O(N log N)</td>
                  <td className="p-2 text-[#00ff66]">O(N log N)</td>
                  <td className="p-2 text-[#00f0ff]">O(N)</td>
                  <td className="p-2 text-[#5a8a6e]">Divide and Conquer</td>
                </tr>
                <tr className="hover:bg-[#00ff66]/5">
                  <td className="p-2 text-[#ffb000] font-bold">Insertion Sort</td>
                  <td className="p-2 text-[#5a8a6e]">Quadratic comparison sort benchmark</td>
                  <td className="p-2 text-[#ff3344]">O(N²)</td>
                  <td className="p-2 text-[#ffb000]">O(N²)</td>
                  <td className="p-2 text-[#00ff66]">O(1)</td>
                  <td className="p-2 text-[#5a8a6e]">Incremental Placement</td>
                </tr>
                <tr className="hover:bg-[#00ff66]/5">
                  <td className="p-2 text-[#00ff66] font-bold">Breadth-First Search (BFS)</td>
                  <td className="p-2 text-[#5a8a6e]">Level-order traversal &amp; unweighted shortest path</td>
                  <td className="p-2 text-[#00ff66]">O(V + E)</td>
                  <td className="p-2 text-[#00ff66]">O(V + E)</td>
                  <td className="p-2 text-[#00f0ff]">O(V)</td>
                  <td className="p-2 text-[#5a8a6e]">Queue-based Frontier Exploration</td>
                </tr>
                <tr className="hover:bg-[#00ff66]/5">
                  <td className="p-2 text-[#00ff66] font-bold">Depth-First Search (DFS)</td>
                  <td className="p-2 text-[#5a8a6e]">Deep chain exploration &amp; reachable components</td>
                  <td className="p-2 text-[#00ff66]">O(V + E)</td>
                  <td className="p-2 text-[#00ff66]">O(V + E)</td>
                  <td className="p-2 text-[#00f0ff]">O(V)</td>
                  <td className="p-2 text-[#5a8a6e]">Stack-based Recursive Backtracking</td>
                </tr>
                <tr className="hover:bg-[#00ff66]/5">
                  <td className="p-2 text-[#00ff66] font-bold">Bounded Cycle Detection</td>
                  <td className="p-2 text-[#5a8a6e]">Circular wash-trading loops of length ≤ k</td>
                  <td className="p-2 text-[#ffb000]">O(V · d^k)</td>
                  <td className="p-2 text-[#ffb000]">O(V · d^k)</td>
                  <td className="p-2 text-[#00f0ff]">O(V + k)</td>
                  <td className="p-2 text-[#5a8a6e]">Pruned Depth-Bounded DFS</td>
                </tr>
                <tr className="hover:bg-[#00ff66]/5">
                  <td className="p-2 text-[#00ff66] font-bold">Weakly Connected Components</td>
                  <td className="p-2 text-[#5a8a6e]">Identification of disjoint wallet communities</td>
                  <td className="p-2 text-[#00ff66]">O(V + E)</td>
                  <td className="p-2 text-[#00ff66]">O(V + E)</td>
                  <td className="p-2 text-[#00f0ff]">O(V)</td>
                  <td className="p-2 text-[#5a8a6e]">Undirected BFS Disjoint Sets</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
