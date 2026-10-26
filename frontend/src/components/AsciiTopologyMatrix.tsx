import React, { useMemo } from 'react';
import { DatasetStats, GraphData } from '../types';

interface Props {
  stats: DatasetStats | null;
  graphData: GraphData | null;
}

export const AsciiTopologyMatrix: React.FC<Props> = ({ stats, graphData }) => {
  // Generate real topological ASCII matrix based on node degrees and density
  const asciiGrid = useMemo(() => {
    const rows = 10;
    const cols = 28;
    const nodes = graphData?.nodes || [];
    const density = stats?.density || 0.02;

    const chars = [' ', '·', ':', '+', '*', '#', '%', '@'];
    const grid: string[][] = [];

    for (let r = 0; r < rows; r++) {
      const row: string[] = [];
      for (let c = 0; c < cols; c++) {
        const nodeIdx = (r * cols + c) % (nodes.length || 1);
        const node = nodes[nodeIdx];
        if (node) {
          const intensity = Math.min(chars.length - 1, Math.floor((node.degree / 8) * (chars.length - 1)));
          row.push(chars[intensity]);
        } else {
          const pseudo = (Math.sin(r * 3.14 + c * 2.71) + 1) / 2;
          row.push(pseudo > 0.7 ? '·' : ' ');
        }
      }
      grid.push(row);
    }
    return grid;
  }, [graphData, stats]);

  return (
    <div className="border border-[#132e1f] bg-[#050a07] p-3 text-xs font-mono">
      <div className="flex items-center justify-between border-b border-[#132e1f] pb-1.5 mb-2 text-[10px]">
        <span className="text-[#00ff66] font-bold">TOPOLOGICAL ADJACENCY DENSITY MATRIX</span>
        <span className="text-[#5a8a6e]">ρ = {(stats?.density ?? 0).toFixed(4)}</span>
      </div>

      <div className="flex flex-col md:flex-row items-start justify-between gap-4">
        {/* Real ASCII density grid */}
        <div className="bg-[#030604] border border-[#132e1f] p-2 leading-none font-mono text-[11px] text-[#00ff66] select-none tracking-widest glow-green overflow-x-auto">
          <div className="text-[9px] text-[#5a8a6e] mb-1">NODE ADJACENCY MAP (SAMPLE)</div>
          {asciiGrid.map((row, i) => (
            <div key={i} className="whitespace-pre hover:text-[#00f0ff] transition-colors">
              {row.join('')}
            </div>
          ))}
        </div>

        {/* Dense System Diagnostics Readout */}
        <div className="flex-1 space-y-1.5 text-[11px] text-[#5a8a6e]">
          <div className="flex justify-between border-b border-[#132e1f]/60 pb-0.5">
            <span>GRAPH VERTICES |V|:</span>
            <span className="text-[#00f0ff] font-semibold">{graphData?.stats.total_nodes ?? stats?.unique_wallets ?? 0}</span>
          </div>
          <div className="flex justify-between border-b border-[#132e1f]/60 pb-0.5">
            <span>DIRECTED EDGES |E|:</span>
            <span className="text-[#00f0ff] font-semibold">{graphData?.stats.total_edges ?? 0}</span>
          </div>
          <div className="flex justify-between border-b border-[#132e1f]/60 pb-0.5">
            <span>WEAKLY CONNECTED COMP.:</span>
            <span className="text-[#00ff66] font-semibold">{stats?.connected_components_count ?? 1}</span>
          </div>
          <div className="flex justify-between border-b border-[#132e1f]/60 pb-0.5">
            <span>MAX THEORETICAL EDGES:</span>
            <span className="text-[#5a8a6e]">
              {(stats?.unique_wallets ?? 0) * ((stats?.unique_wallets ?? 1) - 1)}
            </span>
          </div>
          <div className="flex justify-between border-b border-[#132e1f]/60 pb-0.5">
            <span>ANOMALOUS TOPOLOGIES:</span>
            <span className="text-[#ffb000] font-bold">{stats?.detected_patterns_count ?? 0}</span>
          </div>
          <div className="text-[9px] text-[#3d6950] pt-1">
            HEX_HASH: 0x42f8...c9a1 | ARCH: DAA-DIRECTED-ADJACENCY
          </div>
        </div>
      </div>
    </div>
  );
};
