import React, { useState, useEffect } from 'react';
import { TerminalHeader } from './components/TerminalHeader';
import { TerminalNav, NavTab } from './components/TerminalNav';
import { CommandConsole } from './components/CommandConsole';
import { AsciiTopologyMatrix } from './components/AsciiTopologyMatrix';
import { InvestigationDashboard } from './components/InvestigationDashboard';
import { TransactionExplorer } from './components/TransactionExplorer';
import { WalletRelationshipGraph } from './components/WalletRelationshipGraph';
import { PatternInvestigationCenter } from './components/PatternInvestigationCenter';
import { AlgorithmLaboratory } from './components/AlgorithmLaboratory';
import { BenchmarkingSuite } from './components/BenchmarkingSuite';
import { ReportsView } from './components/ReportsView';
import { WalletProfileModal } from './components/WalletProfileModal';
import { DatasetManager } from './components/DatasetManager';
import { BlockchainQueryModal } from './components/BlockchainQueryModal';
import {
  DatasetStats,
  GraphData,
  InvestigationFinding,
  TerminalLogEntry,
  ShortestPathResult
} from './types';
import {
  fetchDatasetStats,
  fetchGraphData,
  fetchPatterns,
  loadDemoDataset
} from './api';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [scanlinesEnabled, setScanlinesEnabled] = useState(true);

  // Core Data State
  const [stats, setStats] = useState<DatasetStats | null>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [findings, setFindings] = useState<InvestigationFinding[]>([]);
  const [datasetName, setDatasetName] = useState('synthetic_demo_v1');
  const [isSynthetic, setIsSynthetic] = useState(true);

  // Modals & Active Selections
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [datasetModalOpen, setDatasetModalOpen] = useState(false);
  const [blockchainModalOpen, setBlockchainModalOpen] = useState(false);
  const [highlightedPath, setHighlightedPath] = useState<ShortestPathResult | null>(null);

  // Terminal Logs
  const [logs, setLogs] = useState<TerminalLogEntry[]>([
    {
      id: 'log-0',
      timestamp: '00:00:01',
      type: 'INFO',
      message: 'BLOCKSCOPE // TRANSACTION INTELLIGENCE WORKSTATION BOOT SEQUENCE INITIALIZED',
    },
    {
      id: 'log-1',
      timestamp: '00:00:02',
      type: 'DONE',
      message: '[SYS] CORE SUBSYSTEM: ONLINE | DAA ALGORITHM ENGINE: READY',
    },
    {
      id: 'log-2',
      timestamp: '00:00:03',
      type: 'INFO',
      message: '[INDEX] Multi-key hash tables initialized. Lookup complexity: O(1) expected.',
    },
  ]);

  const addLog = (entry: Omit<TerminalLogEntry, 'id'>) => {
    setLogs((prev) => [
      ...prev,
      {
        ...entry,
        id: `log-${Date.now()}-${Math.random()}`,
      },
    ]);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  // Load all dataset states
  const refreshAllData = async () => {
    try {
      const statsRes = await fetchDatasetStats();
      setStats(statsRes);

      const graphRes = await fetchGraphData({ maxNodes: 250 });
      setGraphData(graphRes);

      const patternsRes = await fetchPatterns({});
      setFindings(patternsRes);

      addLog({
        timestamp: new Date().toTimeString().split(' ')[0],
        type: 'DONE',
        message: `[DATA] Synced state: ${statsRes.total_transactions} txs, ${statsRes.unique_wallets} wallets, ${patternsRes.length} patterns.`,
      });
    } catch (err: any) {
      console.error(err);
      addLog({
        timestamp: new Date().toTimeString().split(' ')[0],
        type: 'ERROR',
        message: `[ERROR] Failed to sync data: ${err.message}`,
      });
    }
  };

  useEffect(() => {
    refreshAllData();
  }, []);

  // Handle Command Console GUI callbacks
  const handleConsoleAction = (action: string, data: any) => {
    if (action === 'OPEN_WALLET' && data?.address) {
      setSelectedWallet(data.address);
    } else if (action === 'HIGHLIGHT_PATH') {
      setHighlightedPath(data);
      setActiveTab('network');
    } else if (action === 'UPDATE_FINDINGS') {
      if (Array.isArray(data)) {
        setFindings(data);
      }
    } else if (action === 'OPEN_BENCH') {
      setActiveTab('benchmarks');
    }
  };

  const handleResetDemo = async () => {
    try {
      await loadDemoDataset();
      setDatasetName('synthetic_demo_v1');
      setIsSynthetic(true);
      await refreshAllData();
      addLog({
        timestamp: new Date().toTimeString().split(' ')[0],
        type: 'DONE',
        message: '[RESET] Reloaded deterministic demo dataset.',
      });
    } catch (err: any) {
      addLog({
        timestamp: new Date().toTimeString().split(' ')[0],
        type: 'ERROR',
        message: `[ERROR] Reset failed: ${err.message}`,
      });
    }
  };

  const handleTraceInGraph = (address: string) => {
    setSelectedWallet(null);
    setActiveTab('network');
  };

  return (
    <div className="min-h-screen bg-[#040705] text-[#00ff66] flex flex-col font-mono relative">
      {/* Optional CRT Scanlines */}
      {scanlinesEnabled && <div className="crt-overlay" />}

      {/* Top Header */}
      <TerminalHeader
        stats={stats}
        datasetName={datasetName}
        isSynthetic={isSynthetic}
        scanlinesEnabled={scanlinesEnabled}
        onToggleScanlines={() => setScanlinesEnabled(!scanlinesEnabled)}
        onOpenDatasetModal={() => setDatasetModalOpen(true)}
        onOpenBlockchainModal={() => setBlockchainModalOpen(true)}
        onResetDemo={handleResetDemo}
      />

      {/* BIOS Menu Navigation Strip */}
      <TerminalNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        findingsCount={findings.length}
      />

      {/* Main OS Workspace */}
      <main className="flex-1 p-3 space-y-4 max-w-[1920px] w-full mx-auto">
        {/* Dynamic Asymmetric Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* Main Content Area */}
          <div className={`${activeTab === 'console' ? 'hidden' : 'lg:col-span-8'} space-y-4`}>
            {activeTab === 'overview' && (
              <InvestigationDashboard
                stats={stats}
                findings={findings}
                graphData={graphData}
                onSelectWallet={setSelectedWallet}
                onSelectPattern={(f) => {
                  setActiveTab('investigate');
                }}
                onNavigateToTab={setActiveTab}
              />
            )}

            {activeTab === 'transactions' && (
              <TransactionExplorer
                onSelectWallet={setSelectedWallet}
              />
            )}

            {activeTab === 'network' && (
              <WalletRelationshipGraph
                graphData={graphData}
                onSelectWallet={setSelectedWallet}
                highlightedPath={highlightedPath}
                onClearPath={() => setHighlightedPath(null)}
              />
            )}

            {activeTab === 'investigate' && (
              <PatternInvestigationCenter
                findings={findings}
                onRefreshFindings={setFindings}
                onSelectWallet={setSelectedWallet}
                onHighlightWalletsInGraph={(wallets) => {
                  setActiveTab('network');
                }}
              />
            )}

            {activeTab === 'algorithms' && (
              <AlgorithmLaboratory
                onSelectWallet={setSelectedWallet}
              />
            )}

            {activeTab === 'benchmarks' && (
              <BenchmarkingSuite />
            )}

            {activeTab === 'reports' && (
              <ReportsView
                stats={stats}
                findings={findings}
              />
            )}
          </div>

          {/* Side Auxiliary Workstation (Command Console + ASCII Density Matrix) */}
          <div className={`${activeTab === 'console' ? 'lg:col-span-12' : 'lg:col-span-4'} space-y-3`}>
            {/* Real ASCII Density Topology Matrix */}
            <AsciiTopologyMatrix stats={stats} graphData={graphData} />

            {/* Interactive Cyber Command Console */}
            <CommandConsole
              logs={logs}
              onAddLog={addLog}
              onClearLogs={clearLogs}
              onAction={handleConsoleAction}
              heightClass={activeTab === 'console' ? 'h-[750px]' : 'h-[520px]'}
            />
          </div>
        </div>
      </main>

      {/* Modals */}
      <WalletProfileModal
        address={selectedWallet}
        onClose={() => setSelectedWallet(null)}
        onNavigateToWallet={setSelectedWallet}
        onTraceInGraph={handleTraceInGraph}
      />

      <DatasetManager
        isOpen={datasetModalOpen}
        onClose={() => setDatasetModalOpen(false)}
        onDatasetChanged={refreshAllData}
        datasetName={datasetName}
      />

      <BlockchainQueryModal
        isOpen={blockchainModalOpen}
        onClose={() => setBlockchainModalOpen(false)}
        onSelectWallet={(addr) => {
          setBlockchainModalOpen(false);
          setSelectedWallet(addr);
        }}
      />
    </div>
  );
};

export default App;
