import React from 'react';
import { Terminal, Shield, Database, Globe, Tv, RefreshCw } from 'lucide-react';
import { DatasetStats } from '../types';

interface Props {
  stats: DatasetStats | null;
  datasetName: string;
  isSynthetic: boolean;
  scanlinesEnabled: boolean;
  onToggleScanlines: () => void;
  onOpenDatasetModal: () => void;
  onOpenBlockchainModal: () => void;
  onResetDemo: () => void;
}

export const TerminalHeader: React.FC<Props> = ({
  stats,
  datasetName,
  isSynthetic,
  scanlinesEnabled,
  onToggleScanlines,
  onOpenDatasetModal,
  onOpenBlockchainModal,
  onResetDemo,
}) => {
  return (
    <header className="border-b border-[#132e1f] bg-[#040705] px-4 py-2 text-xs tracking-wider">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Identity */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-[#00ff66]">
            <Terminal className="h-4 w-4 animate-pulse text-[#00ff66]" />
            <span className="font-bold tracking-widest text-[#00ff66] glow-green text-sm sm:text-base">
              BLOCKSCOPE // TRANSACTION INTELLIGENCE
            </span>
          </div>
          <span className="hidden sm:inline-block border border-[#132e1f] px-1.5 py-0.5 text-[10px] text-[#5a8a6e]">
            OS_BUILD v1.0.4-DAA
          </span>
          <span className="inline-flex items-center space-x-1 border border-[#00ff66]/30 bg-[#00ff66]/10 px-2 py-0.5 text-[10px] text-[#00ff66]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00ff66] animate-ping" />
            <span>[SYS: ONLINE]</span>
          </span>
        </div>

        {/* Telemetry metadata */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#5a8a6e]">
          <div className="flex items-center space-x-1.5">
            <Database className="h-3.5 w-3.5 text-[#00f0ff]" />
            <span>DATASET:</span>
            <span className="text-[#00f0ff] font-semibold">{datasetName}</span>
            <span className={`px-1 py-0.2 text-[9px] border ${isSynthetic ? 'border-[#ffb000]/40 text-[#ffb000]' : 'border-[#00ff66]/40 text-[#00ff66]'}`}>
              {isSynthetic ? '[SYNTHETIC DEMO]' : '[IMPORTED LIVE]'}
            </span>
          </div>

          <div className="hidden md:flex items-center space-x-1">
            <span>TXS:</span>
            <span className="text-[#00ff66] font-mono">{stats?.total_transactions ?? '...'}</span>
          </div>

          <div className="hidden md:flex items-center space-x-1">
            <span>WALLETS:</span>
            <span className="text-[#00ff66] font-mono">{stats?.unique_wallets ?? '...'}</span>
          </div>

          <div className="hidden lg:flex items-center space-x-1">
            <span>FLAGGED:</span>
            <span className="text-[#ffb000] font-mono font-bold">{stats?.flagged_wallets_count ?? '0'}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onOpenDatasetModal}
            className="flex items-center space-x-1 border border-[#132e1f] hover:border-[#00ff66] hover:bg-[#00ff66]/10 px-2 py-1 text-[10px] text-[#00ff66] transition-colors"
            title="Import or Export Dataset"
          >
            <Database className="h-3 w-3" />
            <span>[IMPORT/EXPORT]</span>
          </button>

          <button
            onClick={onOpenBlockchainModal}
            className="flex items-center space-x-1 border border-[#132e1f] hover:border-[#00f0ff] hover:bg-[#00f0ff]/10 px-2 py-1 text-[10px] text-[#00f0ff] transition-colors"
            title="Query Public EVM Blockchain RPC"
          >
            <Globe className="h-3 w-3" />
            <span>[EVM RPC]</span>
          </button>

          <button
            onClick={onResetDemo}
            className="flex items-center space-x-1 border border-[#132e1f] hover:border-[#ffb000] hover:bg-[#ffb000]/10 px-2 py-1 text-[10px] text-[#ffb000] transition-colors"
            title="Reset to deterministic sample dataset"
          >
            <RefreshCw className="h-3 w-3" />
            <span>[RESET DEMO]</span>
          </button>

          <button
            onClick={onToggleScanlines}
            className={`border px-2 py-1 text-[10px] transition-colors ${
              scanlinesEnabled ? 'border-[#00ff66] bg-[#00ff66]/20 text-[#00ff66]' : 'border-[#132e1f] text-[#5a8a6e]'
            }`}
            title="Toggle CRT Scanline Overlay"
          >
            <Tv className="h-3 w-3" />
          </button>
        </div>
      </div>
    </header>
  );
};
