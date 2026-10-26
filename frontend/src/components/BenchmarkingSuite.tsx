import React, { useState } from 'react';
import {
  BarChart2,
  Cpu,
  RefreshCw,
  TrendingUp,
  Server,
  Zap
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { AlgorithmBenchmarkSuite } from '../types';
import { fetchBenchmarks } from '../api';

export const BenchmarkingSuite: React.FC = () => {
  const [suiteData, setSuiteData] = useState<AlgorithmBenchmarkSuite | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRunSuite = async () => {
    setLoading(true);
    try {
      const res = await fetchBenchmarks('100,500,1000,2000');
      setSuiteData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart series from results
  const chartData = suiteData
    ? Object.values(suiteData.results_by_size).map((r) => ({
        size: r.size,
        hash_lookup: r.hash_lookup_us,
        linear_lookup: r.linear_lookup_us,
        merge_sort_ms: r.merge_sort_ms,
        insertion_sort_ms: r.insertion_sort_ms,
        bfs_traversal: r.bfs_traversal_us,
        dfs_traversal: r.dfs_traversal_us,
      }))
    : [];

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Header and Run Trigger */}
      <div className="border border-[#132e1f] bg-[#050a07] p-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2 text-[#00ff66]">
            <Cpu className="h-4 w-4" />
            <h3 className="font-bold text-sm tracking-wider">
              EMPIRICAL ALGORITHM BENCHMARKING SUITE
            </h3>
          </div>
          <p className="text-[#5a8a6e] text-xs mt-1">
            Empirically verifies computational scaling laws on synthetic deterministic test datasets across N=[100, 500, 1000, 2000].
          </p>
        </div>

        <button
          onClick={handleRunSuite}
          disabled={loading}
          className="border border-[#00f0ff] bg-[#00f0ff]/10 hover:bg-[#00f0ff]/20 text-[#00f0ff] px-4 py-2 text-xs font-bold transition-colors flex items-center space-x-2"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'EXECUTING DAA TEST HARNESS...' : '[RUN FULL BENCHMARK SUITE]'}</span>
        </button>
      </div>

      {suiteData && (
        <div className="space-y-4">
          {/* Environment Metadata Badge */}
          <div className="border border-[#132e1f] bg-[#030604] p-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#5a8a6e]">
            <div className="flex items-center space-x-2">
              <Server className="h-3.5 w-3.5 text-[#00ff66]" />
              <span>TEST RUNTIME:</span>
              <span className="text-[#00ff66]">Python {suiteData.environment.python_version}</span>
            </div>
            <div>
              <span>HOST ARCH:</span> <span className="text-[#00f0ff]">{suiteData.environment.platform}</span>
            </div>
            <div>
              <span>PROCESSOR:</span> <span className="text-[#00f0ff]">{suiteData.environment.processor}</span>
            </div>
          </div>

          {/* Runtime Scaling Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Sorting Scale */}
            <div className="border border-[#132e1f] bg-[#050a07] p-3">
              <div className="text-[11px] text-[#00ff66] font-bold border-b border-[#132e1f] pb-1.5 mb-2">
                SORTING: MERGE SORT O(N log N) VS INSERTION SORT O(N²) (ms)
              </div>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid stroke="#132e1f" strokeDasharray="2 2" />
                    <XAxis dataKey="size" stroke="#5a8a6e" tick={{ fill: '#5a8a6e', fontSize: 10 }} />
                    <YAxis stroke="#5a8a6e" tick={{ fill: '#5a8a6e', fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#040705',
                        border: '1px solid #00ff66',
                        fontFamily: 'monospace',
                        fontSize: '11px',
                        color: '#00ff66',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Line type="monotone" dataKey="merge_sort_ms" stroke="#00ff66" strokeWidth={2} name="Merge Sort (ms)" />
                    <Line type="monotone" dataKey="insertion_sort_ms" stroke="#ffb000" strokeWidth={2} name="Insertion Sort (ms)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Lookup Scale */}
            <div className="border border-[#132e1f] bg-[#050a07] p-3">
              <div className="text-[11px] text-[#00f0ff] font-bold border-b border-[#132e1f] pb-1.5 mb-2">
                SEARCHING: HASH TABLE O(1) VS LINEAR SCAN O(N) (µs)
              </div>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid stroke="#132e1f" strokeDasharray="2 2" />
                    <XAxis dataKey="size" stroke="#5a8a6e" tick={{ fill: '#5a8a6e', fontSize: 10 }} />
                    <YAxis stroke="#5a8a6e" tick={{ fill: '#5a8a6e', fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#040705',
                        border: '1px solid #00f0ff',
                        fontFamily: 'monospace',
                        fontSize: '11px',
                        color: '#00f0ff',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Line type="monotone" dataKey="hash_lookup" stroke="#00f0ff" strokeWidth={2} name="Hash Lookup (µs)" />
                    <Line type="monotone" dataKey="linear_lookup" stroke="#ff3344" strokeWidth={2} name="Linear Scan (µs)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Full Metrics Comparison Table */}
          <div className="border border-[#132e1f] bg-[#050a07] overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#132e1f] bg-[#07120a] text-[#5a8a6e] text-[11px]">
                  <th className="p-2.5">DATASET SIZE (N)</th>
                  <th className="p-2.5">INDEX BUILD (µs)</th>
                  <th className="p-2.5">HASH LOOKUP (µs)</th>
                  <th className="p-2.5">LINEAR SCAN (µs)</th>
                  <th className="p-2.5">MERGE SORT (ms)</th>
                  <th className="p-2.5">INSERTION SORT (ms)</th>
                  <th className="p-2.5">BFS TRAVERSAL (µs)</th>
                  <th className="p-2.5">DFS TRAVERSAL (µs)</th>
                  <th className="p-2.5">CYCLES SCAN (µs)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#132e1f]/60 font-mono">
                {Object.values(suiteData.results_by_size).map((row) => (
                  <tr key={row.size} className="hover:bg-[#00ff66]/5">
                    <td className="p-2.5 text-[#00ff66] font-bold">N = {row.size}</td>
                    <td className="p-2.5 text-[#5a8a6e]">{row.index_build_us.toLocaleString()}</td>
                    <td className="p-2.5 text-[#00ff66] font-bold">{row.hash_lookup_us}</td>
                    <td className="p-2.5 text-[#ffb000]">{row.linear_lookup_us}</td>
                    <td className="p-2.5 text-[#00ff66] font-bold">{row.merge_sort_ms}</td>
                    <td className="p-2.5 text-[#ffb000]">{row.insertion_sort_ms}</td>
                    <td className="p-2.5 text-[#00f0ff]">{row.bfs_traversal_us}</td>
                    <td className="p-2.5 text-[#00f0ff]">{row.dfs_traversal_us}</td>
                    <td className="p-2.5 text-[#5a8a6e]">{row.cycle_detection_us}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!suiteData && (
        <div className="border border-[#132e1f] bg-[#050a07] p-12 text-center text-[#5a8a6e]">
          Click [RUN FULL BENCHMARK SUITE] above to initiate empirical measurements across N=100, 500, 1000, 2000.
        </div>
      )}
    </div>
  );
};
