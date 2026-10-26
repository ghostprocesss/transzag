import React from 'react';

export type NavTab =
  | 'overview'
  | 'transactions'
  | 'network'
  | 'investigate'
  | 'algorithms'
  | 'benchmarks'
  | 'console'
  | 'reports';

interface Props {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  findingsCount: number;
}

export const TerminalNav: React.FC<Props> = ({ activeTab, onSelectTab, findingsCount }) => {
  const tabs: { id: NavTab; label: string; badge?: string }[] = [
    { id: 'overview', label: '01:OVERVIEW' },
    { id: 'transactions', label: '02:TRANSACTIONS' },
    { id: 'network', label: '03:NETWORK_GRAPH' },
    { id: 'investigate', label: '04:INVESTIGATE', badge: findingsCount > 0 ? `${findingsCount}` : undefined },
    { id: 'algorithms', label: '05:DAA_LAB' },
    { id: 'benchmarks', label: '06:BENCHMARKS' },
    { id: 'console', label: '07:CONSOLE' },
    { id: 'reports', label: '08:REPORTS' },
  ];

  return (
    <nav className="border-b border-[#132e1f] bg-[#060c08] px-2 py-1 overflow-x-auto">
      <div className="flex items-center space-x-1 min-w-max text-xs">
        <span className="text-[#5a8a6e] px-2 py-1 text-[11px] font-bold tracking-wider">
          NAV &gt;
        </span>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex items-center space-x-1.5 px-3 py-1 font-mono transition-all text-xs tracking-wider ${
                isActive
                  ? 'border border-[#00f0ff] bg-[#00f0ff]/10 text-[#00f0ff] glow-cyan font-bold'
                  : 'border border-transparent text-[#5a8a6e] hover:border-[#132e1f] hover:text-[#00ff66]'
              }`}
            >
              <span>[ {tab.label} ]</span>
              {tab.badge && (
                <span className="border border-[#ffb000]/60 bg-[#ffb000]/20 px-1 py-0.2 text-[9px] text-[#ffb000] font-bold">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
