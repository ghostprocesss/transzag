import React, { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldAlert,
  Coins,
  Radio,
  Clock
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { WalletProfile } from '../types';
import { fetchWalletProfile } from '../api';
import { formatAddress, formatTimestamp, formatAmount } from '../utils/formatters';

interface Props {
  address: string | null;
  onClose: () => void;
  onNavigateToWallet: (address: string) => void;
  onTraceInGraph?: (address: string) => void;
}

export const WalletProfileModal: React.FC<Props> = ({
  address,
  onClose,
  onNavigateToWallet,
  onTraceInGraph,
}) => {
  const [profile, setProfile] = useState<WalletProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    fetchWalletProfile(address)
      .then((res) => setProfile(res))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [address]);

  if (!address) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-4xl border border-[#00f0ff] bg-[#050a07] text-xs font-mono shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#132e1f] bg-[#07120a] p-3 text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-[#00f0ff] font-bold text-sm tracking-widest">
              [WALLET INVESTIGATION DOSSIER]
            </span>
            {profile && (
              <span className={`px-2 py-0.5 text-[10px] font-bold border ${
                profile.flagged ? 'border-[#ffb000] text-[#ffb000] bg-[#ffb000]/10' : 'border-[#00ff66] text-[#00ff66]'
              }`}>
                [{profile.status_label}]
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-[#ff3344] hover:border border-[#ff3344] px-2 py-0.5 font-bold transition-colors"
          >
            [CLOSE_ESC]
          </button>
        </div>

        {loading ? (
          <div className="p-16 text-center text-[#00f0ff] animate-pulse">
            [*] Querying transaction index and computing forensic ledger metrics...
          </div>
        ) : profile ? (
          <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
            {/* Address Banner with Copy & Quick Action */}
            <div className="border border-[#132e1f] bg-[#030604] p-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[10px] text-[#5a8a6e]">TARGET WALLET ADDRESS:</span>
                <p className="text-[#00ff66] font-bold text-sm break-all">{profile.address}</p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center space-x-1 border border-[#132e1f] hover:border-[#00ff66] px-2 py-1 text-xs text-[#00ff66] transition-colors"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-[#00ff66]" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? 'COPIED' : 'COPY'}</span>
                </button>

                {onTraceInGraph && (
                  <button
                    onClick={() => {
                      onTraceInGraph(profile.address);
                      onClose();
                    }}
                    className="border border-[#00f0ff] bg-[#00f0ff]/10 hover:bg-[#00f0ff]/20 px-2.5 py-1 text-xs text-[#00f0ff] transition-colors"
                  >
                    TRACE IN GRAPH
                  </button>
                )}
              </div>
            </div>

            {/* Core Stats Overview Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="border border-[#132e1f] bg-[#040805] p-2.5">
                <div className="text-[10px] text-[#5a8a6e]">ACTIVITY TIMESTAMPS</div>
                <div className="mt-1 text-[11px] text-[#00ff66]">
                  <div>FIRST: {formatTimestamp(profile.first_seen)}</div>
                  <div className="mt-0.5">LAST: {formatTimestamp(profile.last_seen)}</div>
                </div>
              </div>

              <div className="border border-[#132e1f] bg-[#040805] p-2.5">
                <div className="text-[10px] text-[#5a8a6e]">TRANSFER COUNTS</div>
                <div className="mt-1 text-[11px] text-[#00ff66]">
                  <div>INCOMING: {profile.total_incoming_txs} txs</div>
                  <div className="mt-0.5">OUTGOING: {profile.total_outgoing_txs} txs</div>
                </div>
              </div>

              <div className="border border-[#132e1f] bg-[#040805] p-2.5">
                <div className="text-[10px] text-[#5a8a6e]">UNIQUE COUNTERPARTIES</div>
                <div className="mt-1 text-lg font-bold text-[#00f0ff]">
                  {profile.unique_counterparties_count}
                </div>
                <div className="text-[9px] text-[#3e664d]">DISTINCT ENTITIES</div>
              </div>

              <div className="border border-[#132e1f] bg-[#040805] p-2.5">
                <div className="text-[10px] text-[#5a8a6e]">DETECTED SIGNALS</div>
                <div className="mt-1 text-lg font-bold text-[#ffb000]">
                  {profile.involved_findings.length}
                </div>
                <div className="text-[9px] text-[#3e664d]">ANOMALIES INVOLVED</div>
              </div>
            </div>

            {/* Token-Separated Volumes (Financial Integrity) */}
            <div className="border border-[#132e1f] bg-[#040805] p-3">
              <div className="flex items-center space-x-1.5 text-[11px] text-[#00ff66] font-bold border-b border-[#132e1f] pb-1.5 mb-2">
                <Coins className="h-3.5 w-3.5" />
                <span>ASSET VOLUME BREAKDOWN (PRESERVING TOKEN SEPARATION)</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] text-[#5a8a6e] font-semibold mb-1 flex items-center space-x-1">
                    <ArrowDownLeft className="h-3 w-3 text-[#00ff66]" />
                    <span>INCOMING VOLUME:</span>
                  </div>
                  <div className="space-y-1">
                    {Object.entries(profile.volume_in_by_token).length > 0 ? (
                      Object.entries(profile.volume_in_by_token).map(([tk, val]) => (
                        <div key={tk} className="flex justify-between bg-[#030604] p-1.5 border border-[#132e1f]">
                          <span className="text-[#5a8a6e]">{tk}:</span>
                          <span className="text-[#00ff66] font-bold">{val.toLocaleString()} {tk}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-[#5a8a6e]">0.00</span>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-[#5a8a6e] font-semibold mb-1 flex items-center space-x-1">
                    <ArrowUpRight className="h-3 w-3 text-[#00f0ff]" />
                    <span>OUTGOING VOLUME:</span>
                  </div>
                  <div className="space-y-1">
                    {Object.entries(profile.volume_out_by_token).length > 0 ? (
                      Object.entries(profile.volume_out_by_token).map(([tk, val]) => (
                        <div key={tk} className="flex justify-between bg-[#030604] p-1.5 border border-[#132e1f]">
                          <span className="text-[#5a8a6e]">{tk}:</span>
                          <span className="text-[#00f0ff] font-bold">{val.toLocaleString()} {tk}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-[#5a8a6e]">0.00</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Activity Histogram Chart */}
            {profile.activity_timeline.length > 0 && (
              <div className="border border-[#132e1f] bg-[#040805] p-3">
                <div className="flex items-center space-x-1.5 text-[11px] text-[#00ff66] font-bold border-b border-[#132e1f] pb-1.5 mb-2">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>TRANSACTION FREQUENCY TIMELINE</span>
                </div>
                <div className="h-36 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={profile.activity_timeline}>
                      <CartesianGrid stroke="#132e1f" strokeDasharray="2 2" />
                      <XAxis
                        dataKey="timestamp"
                        tickFormatter={(ts) => new Date(ts * 1000).toISOString().substring(5, 10)}
                        stroke="#5a8a6e"
                        tick={{ fill: '#5a8a6e', fontSize: 9 }}
                      />
                      <YAxis stroke="#5a8a6e" tick={{ fill: '#5a8a6e', fontSize: 9 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#040705',
                          border: '1px solid #00f0ff',
                          borderRadius: 0,
                          fontSize: '10px',
                          color: '#00f0ff',
                        }}
                      />
                      <Bar dataKey="count" fill="#00ff66" name="Transactions" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Counterparties & Largest Transfers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Top Counterparties */}
              <div className="border border-[#132e1f] bg-[#040805] p-3">
                <div className="text-[11px] text-[#00ff66] font-bold border-b border-[#132e1f] pb-1.5 mb-2">
                  FREQUENT COUNTERPARTIES
                </div>
                <div className="space-y-1.5">
                  <div className="text-[10px] text-[#5a8a6e]">SENDERS:</div>
                  {profile.top_senders.map((s) => (
                    <div
                      key={s.address}
                      onClick={() => onNavigateToWallet(s.address)}
                      className="flex justify-between bg-[#030604] p-1 text-[11px] hover:border-[#00f0ff] border border-transparent cursor-pointer"
                    >
                      <span className="text-[#00ff66]">{formatAddress(s.address, 7)}</span>
                      <span className="text-[#5a8a6e]">{s.count} txs</span>
                    </div>
                  ))}
                  <div className="text-[10px] text-[#5a8a6e] pt-1">RECIPIENTS:</div>
                  {profile.top_recipients.map((r) => (
                    <div
                      key={r.address}
                      onClick={() => onNavigateToWallet(r.address)}
                      className="flex justify-between bg-[#030604] p-1 text-[11px] hover:border-[#00f0ff] border border-transparent cursor-pointer"
                    >
                      <span className="text-[#00ff66]">{formatAddress(r.address, 7)}</span>
                      <span className="text-[#5a8a6e]">{r.count} txs</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Largest Transfers */}
              <div className="border border-[#132e1f] bg-[#040805] p-3">
                <div className="text-[11px] text-[#00ff66] font-bold border-b border-[#132e1f] pb-1.5 mb-2">
                  LARGEST RECORDED TRANSFERS
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <div className="text-[10px] text-[#5a8a6e]">INFLOWS:</div>
                  {profile.largest_incoming_transfers.slice(0, 3).map((t) => (
                    <div key={t.tx_hash} className="bg-[#030604] p-1 border border-[#132e1f] flex justify-between">
                      <span className="text-[#5a8a6e]">{formatAddress(t.from_address, 5)}</span>
                      <span className="text-[#00ff66] font-bold">{t.amount} {t.token}</span>
                    </div>
                  ))}
                  <div className="text-[10px] text-[#5a8a6e] pt-1">OUTFLOWS:</div>
                  {profile.largest_outgoing_transfers.slice(0, 3).map((t) => (
                    <div key={t.tx_hash} className="bg-[#030604] p-1 border border-[#132e1f] flex justify-between">
                      <span className="text-[#5a8a6e]">{formatAddress(t.to_address, 5)}</span>
                      <span className="text-[#00f0ff] font-bold">{t.amount} {t.token}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Linked Pattern Findings */}
            {profile.involved_findings.length > 0 && (
              <div className="border border-[#ffb000]/40 bg-[#ffb000]/5 p-3">
                <div className="flex items-center space-x-1.5 text-[11px] text-[#ffb000] font-bold mb-2">
                  <ShieldAlert className="h-4 w-4" />
                  <span>INVESTIGATIVE ANOMALY FINDINGS LINKED TO THIS WALLET ({profile.involved_findings.length})</span>
                </div>
                <div className="space-y-1.5">
                  {profile.involved_findings.map((f) => (
                    <div key={f.id} className="bg-[#030604] border border-[#ffb000]/30 p-2">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-[#ffb000] font-bold">[{f.severity}] {f.title}</span>
                        <span className="text-[#5a8a6e]">{f.pattern_type}</span>
                      </div>
                      <p className="text-[11px] text-[#88c5a0] mt-1">{f.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center text-[#ff3344]">
            Wallet profile not found in active dataset.
          </div>
        )}

        <div className="border-t border-[#132e1f] bg-[#07120a] p-3 flex justify-end">
          <button
            onClick={onClose}
            className="border border-[#132e1f] hover:border-[#00ff66] text-[#00ff66] px-4 py-1"
          >
            DISMISS
          </button>
        </div>
      </div>
    </div>
  );
};
