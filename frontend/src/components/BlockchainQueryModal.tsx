import React, { useState } from 'react';
import { Globe, Search, AlertTriangle, CheckCircle, RefreshCw, X } from 'lucide-react';
import { queryBlockchain } from '../api';
import { formatAddress } from '../utils/formatters';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectWallet: (address: string) => void;
}

export const BlockchainQueryModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSelectWallet,
}) => {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  if (!isOpen) return null;

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await queryBlockchain(address.trim());
      setResult(res);
    } catch (err: any) {
      setResult({ success: false, error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-xl border border-[#00f0ff] bg-[#050a07] text-xs font-mono shadow-2xl p-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#132e1f] pb-2 mb-3">
          <div className="flex items-center space-x-2 text-[#00f0ff]">
            <Globe className="h-4 w-4" />
            <span className="font-bold text-sm tracking-wider">[PUBLIC EVM RPC CONNECTOR]</span>
          </div>
          <button onClick={onClose} className="text-[#ff3344] hover:border border-[#ff3344] px-1.5 py-0.5">
            [X]
          </button>
        </div>

        <div className="space-y-3 text-[#5a8a6e]">
          <p className="text-xs leading-relaxed">
            Directly connect to public EVM-compatible RPC nodes to verify live on-chain balances and state
            for any target address.
          </p>

          <form onSubmit={handleQuery} className="flex space-x-2">
            <input
              type="text"
              placeholder="Enter Ethereum address (0x... 40 hex chars)"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="flex-1 bg-[#030604] border border-[#132e1f] px-2 py-1.5 text-xs text-[#00ff66] focus:outline-none focus:border-[#00f0ff]"
            />
            <button
              type="submit"
              disabled={loading || !address.trim()}
              className="border border-[#00f0ff] bg-[#00f0ff]/10 hover:bg-[#00f0ff]/20 text-[#00f0ff] px-4 py-1.5 font-bold transition-colors disabled:opacity-30"
            >
              {loading ? 'QUERYING RPC...' : '[QUERY LIVE NODE]'}
            </button>
          </form>

          {/* Quick sample addresses */}
          <div className="flex items-center space-x-1.5 text-[10px]">
            <span className="text-[#5a8a6e]">SAMPLES:</span>
            <button
              type="button"
              onClick={() => setAddress('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045')}
              className="text-[#00ff66] hover:underline"
            >
              vitalik.eth
            </button>
            <span className="text-[#5a8a6e]">|</span>
            <button
              type="button"
              onClick={() => setAddress('0x00000000219ab540356cBB839Cbe05303d7705Fa')}
              className="text-[#00ff66] hover:underline"
            >
              Eth2 Deposit Contract
            </button>
          </div>

          {/* Results display */}
          {result && (
            <div className="border border-[#132e1f] bg-[#030604] p-3 space-y-2 mt-2">
              <div className="flex justify-between border-b border-[#132e1f] pb-1">
                <span className="text-[#5a8a6e]">QUERY STATUS:</span>
                <span className={result.success ? 'text-[#00ff66] font-bold' : 'text-[#ff3344] font-bold'}>
                  {result.success ? '[RPC_SUCCESS]' : '[RPC_ERROR]'}
                </span>
              </div>

              {result.success ? (
                <div className="space-y-1.5 text-xs">
                  <div>
                    <span className="text-[#5a8a6e]">NETWORK:</span>
                    <p className="text-[#00f0ff] font-bold">{result.network}</p>
                  </div>
                  <div>
                    <span className="text-[#5a8a6e]">VERIFIED ADDRESS:</span>
                    <p className="text-[#00ff66] font-mono break-all">{result.address}</p>
                  </div>
                  <div className="flex justify-between border-t border-[#132e1f] pt-1">
                    <span className="text-[#5a8a6e]">ON-CHAIN BALANCE:</span>
                    <span className="text-[#00ff66] font-bold text-sm">{result.balance_eth} ETH</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#5a8a6e]">LATEST BLOCK CONFIRMED:</span>
                    <span className="text-[#00f0ff] font-mono">#{result.latest_scanned_block}</span>
                  </div>
                  <div className="border border-[#ffb000]/40 bg-[#ffb000]/5 p-2 text-[10px] text-[#ffb000]">
                    {result.partial_notice}
                  </div>
                </div>
              ) : (
                <div className="text-[#ff3344] text-xs">
                  {result.error}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 border-t border-[#132e1f] pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="border border-[#132e1f] hover:border-[#00f0ff] text-[#00f0ff] px-3 py-1"
          >
            DISMISS
          </button>
        </div>
      </div>
    </div>
  );
};
