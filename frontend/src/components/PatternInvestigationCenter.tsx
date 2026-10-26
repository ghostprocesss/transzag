import React, { useState } from 'react';
import {
  ShieldAlert,
  Sliders,
  Filter,
  CheckCircle2,
  ExternalLink,
  Info,
  RefreshCw,
  Clock,
  Layers,
  ArrowRight
} from 'lucide-react';
import { InvestigationFinding } from '../types';
import { fetchPatterns } from '../api';
import { formatAddress, formatTimestamp, getSeverityColor } from '../utils/formatters';

interface Props {
  findings: InvestigationFinding[];
  onRefreshFindings: (newFindings: InvestigationFinding[]) => void;
  onSelectWallet: (address: string) => void;
  onHighlightWalletsInGraph: (wallets: string[]) => void;
}

export const PatternInvestigationCenter: React.FC<Props> = ({
  findings,
  onRefreshFindings,
  onSelectWallet,
  onHighlightWalletsInGraph,
}) => {
  // Configurable Rule Parameters
  const [repeatedMin, setRepeatedMin] = useState(5);
  const [rapidMaxSec, setRapidMaxSec] = useState(900);
  const [rapidTolerance, setRapidTolerance] = useState(0.20);
  const [highActPercentile, setHighActPercentile] = useState(95);
  const [maxCycleLen, setMaxCycleLen] = useState(5);
  const [spikeMultiplier, setSpikeMultiplier] = useState(3.0);
  const [clusterDensity, setClusterDensity] = useState(0.6);

  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState('ALL');
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [selectedFinding, setSelectedFinding] = useState<InvestigationFinding | null>(null);

  const handleReRunDetection = async () => {
    setLoading(true);
    try {
      const res = await fetchPatterns({
        repeatedMin,
        rapidMaxSec,
        rapidTolerance,
        highActPercentile,
        maxCycleLen,
        spikeMultiplier,
        clusterMinDensity: clusterDensity,
      });
      onRefreshFindings(res);
      if (res.length > 0) {
        setSelectedFinding(res[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const patternCategories = [
    'ALL',
    'REPEATED_TRANSFERS',
    'RAPID_FUND_MOVEMENT',
    'HIGH_ACTIVITY_WALLET',
    'CIRCULAR_FLOW',
    'ACTIVITY_SPIKE',
    'DENSE_CLUSTER',
  ];

  const filteredFindings = findings.filter((f) => {
    if (filterType !== 'ALL' && f.pattern_type !== filterType) return false;
    if (filterSeverity !== 'ALL' && f.severity !== filterSeverity) return false;
    return true;
  });

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Parameters Configuration Accordion */}
      <div className="border border-[#132e1f] bg-[#050a07] p-3">
        <div className="flex items-center justify-between border-b border-[#132e1f] pb-2 mb-3">
          <div className="flex items-center space-x-2 text-[#00ff66]">
            <Sliders className="h-4 w-4" />
            <span className="font-bold tracking-wider">CONFIGURABLE ALGORITHMIC DETECTION PARAMETERS</span>
          </div>
          <button
            onClick={handleReRunDetection}
            disabled={loading}
            className="flex items-center space-x-1.5 border border-[#00ff66] bg-[#00ff66]/10 hover:bg-[#00ff66]/20 px-3 py-1 text-xs text-[#00ff66] font-bold transition-colors"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            <span>[RE-SCAN TOPOLOGY]</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs text-[#5a8a6e]">
          <div>
            <div className="flex justify-between mb-1">
              <span>REPEATED TRANSFERS MIN:</span>
              <span className="text-[#00ff66] font-bold">{repeatedMin} txs</span>
            </div>
            <input
              type="range"
              min={2}
              max={15}
              value={repeatedMin}
              onChange={(e) => setRepeatedMin(Number(e.target.value))}
              className="w-full accent-[#00ff66]"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span>RAPID MOVEMENT WINDOW:</span>
              <span className="text-[#00ff66] font-bold">{Math.round(rapidMaxSec / 60)} min ({rapidMaxSec}s)</span>
            </div>
            <input
              type="range"
              min={60}
              max={3600}
              step={60}
              value={rapidMaxSec}
              onChange={(e) => setRapidMaxSec(Number(e.target.value))}
              className="w-full accent-[#00ff66]"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span>RAPID AMOUNT TOLERANCE:</span>
              <span className="text-[#00ff66] font-bold">{Math.round(rapidTolerance * 100)}%</span>
            </div>
            <input
              type="range"
              min={0.05}
              max={0.5}
              step={0.05}
              value={rapidTolerance}
              onChange={(e) => setRapidTolerance(Number(e.target.value))}
              className="w-full accent-[#00ff66]"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span>MAX CYCLE LENGTH (DFS):</span>
              <span className="text-[#00ff66] font-bold">{maxCycleLen} nodes</span>
            </div>
            <input
              type="range"
              min={2}
              max={6}
              value={maxCycleLen}
              onChange={(e) => setMaxCycleLen(Number(e.target.value))}
              className="w-full accent-[#00ff66]"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span>HIGH ACTIVITY PERCENTILE:</span>
              <span className="text-[#00ff66] font-bold">{highActPercentile}th %ile</span>
            </div>
            <input
              type="range"
              min={70}
              max={99}
              value={highActPercentile}
              onChange={(e) => setHighActPercentile(Number(e.target.value))}
              className="w-full accent-[#00ff66]"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span>ACTIVITY SPIKE MULTIPLIER:</span>
              <span className="text-[#00ff66] font-bold">{spikeMultiplier}x baseline</span>
            </div>
            <input
              type="range"
              min={1.5}
              max={6.0}
              step={0.5}
              value={spikeMultiplier}
              onChange={(e) => setSpikeMultiplier(Number(e.target.value))}
              className="w-full accent-[#00ff66]"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span>CLUSTER MIN DENSITY:</span>
              <span className="text-[#00ff66] font-bold">{Math.round(clusterDensity * 100)}%</span>
            </div>
            <input
              type="range"
              min={0.3}
              max={0.9}
              step={0.05}
              value={clusterDensity}
              onChange={(e) => setClusterDensity(Number(e.target.value))}
              className="w-full accent-[#00ff66]"
            />
          </div>
        </div>
      </div>

      {/* Filter and Findings Split View */}
      <div className="border border-[#132e1f] bg-[#050a07] p-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-1.5">
            <span className="text-[#5a8a6e]">CATEGORY:</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-[#030604] border border-[#132e1f] text-[#00ff66] px-2 py-0.5 text-xs focus:outline-none"
            >
              {patternCategories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="text-[#5a8a6e]">SEVERITY:</span>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="bg-[#030604] border border-[#132e1f] text-[#00ff66] px-2 py-0.5 text-xs focus:outline-none"
            >
              <option value="ALL">ALL SEVERITIES</option>
              <option value="PRIORITY_REVIEW">PRIORITY_REVIEW</option>
              <option value="REVIEW_RECOMMENDED">REVIEW_RECOMMENDED</option>
              <option value="INFORMATIONAL">INFORMATIONAL</option>
            </select>
          </div>
        </div>

        <div className="text-[#5a8a6e] text-[11px]">
          SHOWING {filteredFindings.length} OF {findings.length} DETECTED PATTERNS
        </div>
      </div>

      {/* Main 2-Column Findings Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left List */}
        <div className="lg:col-span-5 space-y-2 max-h-[600px] overflow-y-auto pr-1">
          {filteredFindings.map((finding) => {
            const isSelected = selectedFinding?.id === finding.id;
            const sev = getSeverityColor(finding.severity);

            return (
              <div
                key={finding.id}
                onClick={() => setSelectedFinding(finding)}
                className={`border p-2.5 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-[#00f0ff] bg-[#00f0ff]/10 glow-cyan'
                    : 'border-[#132e1f] bg-[#040805] hover:border-[#5a8a6e]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`px-1.5 py-0.2 text-[9px] font-bold border ${sev.border} ${sev.text} ${sev.bg}`}>
                    [{finding.severity}]
                  </span>
                  <span className="text-[10px] text-[#5a8a6e]">{finding.pattern_type}</span>
                </div>

                <h4 className="text-[#00ff66] font-semibold text-xs mt-1">
                  {finding.title}
                </h4>

                <p className="text-[#5a8a6e] text-[11px] mt-1 line-clamp-2">
                  {finding.description}
                </p>

                <div className="mt-2 text-[10px] text-[#3e664d] flex justify-between">
                  <span>INVOLVED WALLETS: {finding.involved_wallets.length}</span>
                  <span className="text-[#00f0ff]">INSPECT EVIDENCE &gt;</span>
                </div>
              </div>
            );
          })}

          {filteredFindings.length === 0 && (
            <div className="border border-[#132e1f] bg-[#040805] p-8 text-center text-[#5a8a6e]">
              No pattern findings matching selected filter criteria.
            </div>
          )}
        </div>

        {/* Right Details Panel */}
        <div className="lg:col-span-7 border border-[#132e1f] bg-[#050a07] p-4 flex flex-col justify-between">
          {selectedFinding ? (
            <div className="space-y-3">
              <div className="border-b border-[#132e1f] pb-2 flex items-center justify-between">
                <div>
                  <span className={`px-2 py-0.5 text-[10px] font-bold border ${getSeverityColor(selectedFinding.severity).border} ${getSeverityColor(selectedFinding.severity).text} ${getSeverityColor(selectedFinding.severity).bg}`}>
                    [{selectedFinding.severity}]
                  </span>
                  <h3 className="text-[#00ff66] text-base font-bold mt-1">
                    {selectedFinding.title}
                  </h3>
                </div>

                <button
                  onClick={() => onHighlightWalletsInGraph(selectedFinding.involved_wallets)}
                  className="border border-[#00f0ff] hover:bg-[#00f0ff]/10 text-[#00f0ff] px-3 py-1 text-xs"
                >
                  HIGHLIGHT IN GRAPH
                </button>
              </div>

              {/* Plain Language Explanation */}
              <div>
                <span className="text-[#00f0ff] font-bold text-xs">[PLAIN-LANGUAGE EXPLANATION]:</span>
                <p className="text-[#00ff66] bg-[#030604] border border-[#132e1f] p-2.5 mt-1 leading-relaxed text-xs">
                  {selectedFinding.description}
                </p>
              </div>

              {/* Detection Rule Used */}
              <div>
                <span className="text-[#5a8a6e] font-bold text-xs">[FORMAL DETECTION RULE]:</span>
                <p className="text-[#5a8a6e] bg-[#030604] border border-[#132e1f] p-2 mt-1 text-[11px] font-mono">
                  {selectedFinding.detection_rule}
                </p>
              </div>

              {/* Evidence & Metrics Breakdown */}
              <div>
                <span className="text-[#00f0ff] font-bold text-xs">[COMPUTED FORENSIC MEASUREMENTS]:</span>
                <div className="bg-[#030604] border border-[#132e1f] p-2.5 mt-1 grid grid-cols-2 gap-2 text-[11px]">
                  {Object.entries(selectedFinding.evidence).map(([key, val]) => (
                    <div key={key} className="border-b border-[#132e1f]/40 pb-1">
                      <span className="text-[#5a8a6e] block uppercase text-[10px]">{key.replace(/_/g, ' ')}:</span>
                      <span className="text-[#00ff66] font-semibold">
                        {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Involved Wallets List with Clickable Links */}
              <div>
                <span className="text-[#5a8a6e] font-bold text-xs">
                  [INVOLVED WALLET VERTICES ({selectedFinding.involved_wallets.length})]:
                </span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {selectedFinding.involved_wallets.map((addr) => (
                    <button
                      key={addr}
                      onClick={() => onSelectWallet(addr)}
                      className="border border-[#132e1f] hover:border-[#00ff66] bg-[#030604] px-2 py-1 text-[#00ff66] text-xs hover:text-[#00f0ff] transition-colors"
                      title="Inspect wallet profile"
                    >
                      {formatAddress(addr, 7)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Legal / Forensic Disclaimer */}
              <div className="border border-[#ffb000]/40 bg-[#ffb000]/5 p-2.5 text-[10px] text-[#ffb000]/90">
                <span className="font-bold">[EVIDENTIARY DISCLAIMER]: </span>
                {selectedFinding.disclaimer}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-[#5a8a6e]">
              Select a pattern finding from the left list to inspect evidence.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
