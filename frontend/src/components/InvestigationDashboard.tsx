import React, { useState, useMemo } from 'react';
import {
  Activity,
  Layers,
  Coins,
  AlertTriangle,
  Radio,
  Clock,
  ArrowUpRight,
  TrendingUp,
  Filter
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { DatasetStats, InvestigationFinding, GraphData } from '../types';
import { formatAddress, formatTimestamp, formatAmount, getSeverityColor } from '../utils/formatters';

interface Props {
  stats: DatasetStats | null;
  findings: InvestigationFinding[];
  graphData: GraphData | null;
  onSelectWallet: (address: string) => void;
  onSelectPattern: (finding: InvestigationFinding) => void;
  onNavigateToTab: (tab: any) => void;
}

export const InvestigationDashboard: React.FC<Props> = ({
  stats,
  findings,
  graphData,
  onSelectWallet,
  onSelectPattern,
  onNavigateToTab,
}) => {
  const [selectedToken, setSelectedToken] = useState<string>('ALL');
  const [minAmountFilter, setMinAmountFilter] = useState<number>(0);

  // Group top active wallets from graph data
  const topWallets = useMemo(() => {
    if (!graphData?.nodes) return [];
    return [...graphData.nodes]
      .sort((a, b) => b.degree - a.degree)
      .slice(0, 7);
  }, [graphData]);

  // Generate synthetic timeline aggregation from graph edges for demonstration chart
  const timelineData = useMemo(() => {
    if (!graphData?.edges) return [];
    const buckets: Record<string, { time: string; timestamp: number; volume: number; count: number }> = {};
    
    for (const e of graphData.edges) {
      if (minAmountFilter > 0 && e.total_amount < minAmountFilter) continue;
      if (selectedToken !== 'ALL' && e.token !== selectedToken) continue;

      const dateStr = new Date(e.latest_timestamp * 1000).toISOString().substring(5, 10);
      if (!buckets[dateStr]) {
        buckets[dateStr] = { time: dateStr, timestamp: e.latest_timestamp, volume: 0, count: 0 };
      }
      buckets[dateStr].volume += e.total_amount;
      buckets[dateStr].count += e.tx_count;
    }

    return Object.values(buckets).sort((a, b) => a.timestamp - b.timestamp);
  }, [graphData, selectedToken, minAmountFilter]);

  const tokensList = useMemo(() => {
    if (!stats?.total_volume_by_token) return ['ALL'];
    return ['ALL', ...Object.keys(stats.total_volume_by_token)];
  }, [stats]);

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Top Telemetry KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {/* Total TXs */}
        <div className="border border-[#132e1f] bg-[#060c08] p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#5a8a6e] text-[10px]">
            <span>TOTAL ANALYZED</span>
            <Activity className="h-3.5 w-3.5 text-[#00ff66]" />
          </div>
          <div className="mt-2 text-xl font-bold text-[#00ff66] glow-green">
            {stats?.total_transactions.toLocaleString() ?? '...'}
          </div>
          <div className="text-[10px] text-[#3e664d] mt-1">TRANSACTIONS LOGGED</div>
        </div>

        {/* Unique Wallets */}
        <div className="border border-[#132e1f] bg-[#060c08] p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#5a8a6e] text-[10px]">
            <span>UNIQUE WALLETS</span>
            <Layers className="h-3.5 w-3.5 text-[#00f0ff]" />
          </div>
          <div className="mt-2 text-xl font-bold text-[#00f0ff] glow-cyan">
            {stats?.unique_wallets.toLocaleString() ?? '...'}
          </div>
          <div className="text-[10px] text-[#3e664d] mt-1">NETWORK VERTICES |V|</div>
        </div>

        {/* Flagged Wallets */}
        <div className="border border-[#132e1f] bg-[#060c08] p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#5a8a6e] text-[10px]">
            <span>FLAGGED REVIEW</span>
            <AlertTriangle className="h-3.5 w-3.5 text-[#ffb000]" />
          </div>
          <div className="mt-2 text-xl font-bold text-[#ffb000] glow-amber">
            {stats?.flagged_wallets_count ?? 0}
          </div>
          <div className="text-[10px] text-[#ffb000]/60 mt-1">SIGNALS IDENTIFIED</div>
        </div>

        {/* Detected Patterns */}
        <div className="border border-[#132e1f] bg-[#060c08] p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#5a8a6e] text-[10px]">
            <span>ANOMALOUS PATTERNS</span>
            <Radio className="h-3.5 w-3.5 text-[#00ff66]" />
          </div>
          <div className="mt-2 text-xl font-bold text-[#00ff66]">
            {stats?.detected_patterns_count ?? 0}
          </div>
          <div className="text-[10px] text-[#3e664d] mt-1">DAA GRAPH ANOMALIES</div>
        </div>

        {/* Transferred Volume by Token */}
        <div className="border border-[#132e1f] bg-[#060c08] p-3 flex flex-col justify-between col-span-2 md:col-span-4 lg:col-span-1">
          <div className="flex items-center justify-between text-[#5a8a6e] text-[10px]">
            <span>VOLUME BY ASSET</span>
            <Coins className="h-3.5 w-3.5 text-[#00f0ff]" />
          </div>
          <div className="mt-1 space-y-0.5 text-[11px] overflow-hidden">
            {stats?.total_volume_by_token && Object.entries(stats.total_volume_by_token).map(([tk, val]) => (
              <div key={tk} className="flex justify-between items-center text-[#00ff66]">
                <span className="text-[#5a8a6e] font-semibold">{tk}:</span>
                <span className="font-bold">{formatAmount(val)}</span>
              </div>
            ))}
          </div>
          <div className="text-[9px] text-[#3e664d] mt-1">UNITS PRESERVED</div>
        </div>
      </div>

      {/* Global Filter Bar */}
      <div className="border border-[#132e1f] bg-[#050a07] p-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2">
          <Filter className="h-3.5 w-3.5 text-[#00f0ff]" />
          <span className="text-[#00f0ff] font-bold">[EXPLORATION FILTERS]:</span>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-1.5">
            <span className="text-[#5a8a6e]">ASSET:</span>
            <select
              value={selectedToken}
              onChange={(e) => setSelectedToken(e.target.value)}
              className="bg-[#040805] border border-[#132e1f] text-[#00ff66] px-2 py-0.5 text-xs focus:outline-none"
            >
              {tokensList.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="text-[#5a8a6e]">MIN AMOUNT:</span>
            <input
              type="number"
              min={0}
              step={1}
              value={minAmountFilter}
              onChange={(e) => setMinAmountFilter(Number(e.target.value) || 0)}
              className="w-20 bg-[#040805] border border-[#132e1f] text-[#00ff66] px-1.5 py-0.5 text-xs focus:outline-none"
            />
          </div>

          <button
            onClick={() => onNavigateToTab('network')}
            className="border border-[#00f0ff] hover:bg-[#00f0ff]/10 text-[#00f0ff] px-2.5 py-0.5 text-xs transition-colors flex items-center space-x-1"
          >
            <span>VIEW IN GRAPH CANVAS &gt;</span>
          </button>
        </div>
      </div>

      {/* Activity Timeline Chart + Most Active Wallets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Timeline Chart */}
        <div className="lg:col-span-2 border border-[#132e1f] bg-[#050a07] p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[#132e1f] pb-1.5 mb-3 text-[11px]">
            <div className="flex items-center space-x-2 text-[#00ff66]">
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="font-bold tracking-wider">AGGREGATED TRANSACTION ACTIVITY OVER TIME</span>
            </div>
            <span className="text-[#5a8a6e] text-[10px]">HISTORICAL TEMPORAL HISTOGRAM</span>
          </div>

          <div className="h-56 w-full">
            {timelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData}>
                  <defs>
                    <linearGradient id="neonGreen" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00ff66" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#00ff66" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#132e1f" strokeDasharray="2 2" />
                  <XAxis
                    dataKey="time"
                    stroke="#5a8a6e"
                    tick={{ fill: '#5a8a6e', fontSize: 10, fontFamily: 'monospace' }}
                  />
                  <YAxis
                    stroke="#5a8a6e"
                    tick={{ fill: '#5a8a6e', fontSize: 10, fontFamily: 'monospace' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#040705',
                      border: '1px solid #00ff66',
                      borderRadius: 0,
                      fontFamily: 'monospace',
                      fontSize: '11px',
                      color: '#00ff66',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="volume"
                    stroke="#00ff66"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#neonGreen)"
                    name="Transferred Value"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[#5a8a6e]">
                No temporal transaction data matching current filters
              </div>
            )}
          </div>
          <div className="text-[10px] text-[#3e664d] border-t border-[#132e1f] pt-1.5 mt-2 flex justify-between">
            <span>START: {formatTimestamp(stats?.time_range_start)}</span>
            <span>END: {formatTimestamp(stats?.time_range_end)}</span>
          </div>
        </div>

        {/* Most Active Wallets */}
        <div className="border border-[#132e1f] bg-[#050a07] p-3 flex flex-col">
          <div className="flex items-center justify-between border-b border-[#132e1f] pb-1.5 mb-2 text-[11px]">
            <span className="text-[#00f0ff] font-bold">TOP ACTIVE WALLET NODES</span>
            <span className="text-[#5a8a6e] text-[10px]">BY TOTAL DEGREE</span>
          </div>

          <div className="space-y-1.5 flex-1 overflow-y-auto">
            {topWallets.map((w, idx) => (
              <div
                key={w.id}
                onClick={() => onSelectWallet(w.address)}
                className="group border border-[#132e1f] hover:border-[#00f0ff] bg-[#040805] hover:bg-[#00f0ff]/5 p-2 cursor-pointer transition-all flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[#5a8a6e] font-bold">#{idx + 1}</span>
                    <span className="text-[#00ff66] group-hover:text-[#00f0ff] font-semibold">
                      {formatAddress(w.address)}
                    </span>
                  </div>
                  <div className="text-[10px] text-[#5a8a6e] space-x-2 mt-0.5">
                    <span>IN: {w.in_degree}</span>
                    <span>OUT: {w.out_degree}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`px-1.5 py-0.2 text-[9px] border ${
                    w.flagged ? 'border-[#ffb000]/50 text-[#ffb000] bg-[#ffb000]/10' : 'border-[#132e1f] text-[#5a8a6e]'
                  }`}>
                    {w.status_label}
                  </span>
                  <div className="text-[10px] text-[#00f0ff] mt-0.5">
                    deg: {w.degree}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Investigation Findings Feed */}
      <div className="border border-[#132e1f] bg-[#050a07] p-3">
        <div className="flex items-center justify-between border-b border-[#132e1f] pb-2 mb-3">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-[#ffb000]" />
            <span className="text-[#00ff66] font-bold text-sm tracking-wider">
              INVESTIGATION FINDINGS FEED ({findings.length} DETECTED)
            </span>
          </div>
          <button
            onClick={() => onNavigateToTab('investigate')}
            className="text-[11px] text-[#00f0ff] hover:underline flex items-center space-x-1"
          >
            <span>OPEN PATTERN CENTER &gt;</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {findings.slice(0, 6).map((finding) => {
            const sev = getSeverityColor(finding.severity);
            return (
              <div
                key={finding.id}
                onClick={() => onSelectPattern(finding)}
                className={`border ${sev.border} bg-[#040805] hover:bg-[#00f0ff]/5 p-2.5 cursor-pointer transition-all flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`px-1.5 py-0.2 text-[9px] font-bold border ${sev.border} ${sev.text} ${sev.bg}`}>
                      [{finding.severity}]
                    </span>
                    <span className="text-[#5a8a6e] text-[10px]">
                      {finding.pattern_type}
                    </span>
                  </div>
                  <h4 className="text-[#00ff66] font-semibold text-xs mt-1">
                    {finding.title}
                  </h4>
                  <p className="text-[#5a8a6e] text-[11px] mt-1 line-clamp-2">
                    {finding.description}
                  </p>
                </div>

                <div className="border-t border-[#132e1f] mt-2 pt-1.5 flex items-center justify-between text-[10px] text-[#5a8a6e]">
                  <span>WALLETS: {finding.involved_wallets.length}</span>
                  <span className="text-[#00f0ff] flex items-center space-x-0.5">
                    <span>INSPECT</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Disclaimer Banner */}
        <div className="border border-[#132e1f] bg-[#030604] p-2 mt-3 text-[10px] text-[#5a8a6e] flex items-start space-x-2">
          <span className="text-[#ffb000] font-bold">[DISCLAIMER]:</span>
          <span>
            Investigative signals indicate algorithmic structural anomalies (cycles, rapid hops, clusters)
            and do NOT establish criminal liability or fraud. Forensic corroboration is mandatory.
          </span>
        </div>
      </div>
    </div>
  );
};
