import React, { useEffect, useRef, useState } from 'react';
import cytoscape, { Core, EventObject } from 'cytoscape';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  Route
} from 'lucide-react';
import type { GraphData, GraphNode, GraphEdge, ShortestPathResult } from '../types';
import { fetchShortestPath } from '../api';
import { formatAmount } from '../utils/formatters';

interface Props {
  graphData: GraphData | null;
  onSelectWallet: (address: string) => void;
  highlightedPath?: ShortestPathResult | null;
  onClearPath?: () => void;
}

export const WalletRelationshipGraph: React.FC<Props> = ({
  graphData,
  onSelectWallet,
  highlightedPath,
  onClearPath,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);

  const [layoutName, setLayoutName] = useState<'cose' | 'concentric' | 'circle' | 'breadthfirst'>('cose');
  const [walletSearch, setWalletSearch] = useState<string>('');
  const [pathSource, setPathSource] = useState<string>('');
  const [pathTarget, setPathTarget] = useState<string>('');
  const [localPath, setLocalPath] = useState<ShortestPathResult | null>(null);
  const [selectedEdgeData, setSelectedEdgeData] = useState<GraphEdge | null>(null);
  const [selectedNodeData, setSelectedNodeData] = useState<GraphNode | null>(null);

  const activePath = highlightedPath || localPath;

  useEffect(() => {
    if (!containerRef.current || !graphData) return;

    const elements: cytoscape.ElementDefinition[] = [];

    // Add Nodes
    for (const node of graphData.nodes) {
      const size = Math.min(50, Math.max(16, 16 + node.degree * 2.5));

      let nodeColor = '#00ff66';
      let borderColor = '#00ff66';
      if (node.status_label === 'PRIORITY_REVIEW') {
        nodeColor = '#ffb000';
        borderColor = '#ff3344';
      } else if (node.status_label === 'REVIEW_RECOMMENDED') {
        nodeColor = '#00f0ff';
        borderColor = '#00f0ff';
      }

      elements.push({
        group: 'nodes',
        data: {
          id: node.id,
          label: node.label,
          address: node.address,
          degree: node.degree,
          in_degree: node.in_degree,
          out_degree: node.out_degree,
          flagged: node.flagged,
          status_label: node.status_label,
          total_in_value: node.total_in_value,
          total_out_value: node.total_out_value,
          nodeColor,
          borderColor,
          size,
        },
      });
    }

    // Add Edges
    for (const edge of graphData.edges) {
      const width = Math.min(8, Math.max(1.5, 1.5 + Math.log10(edge.total_amount + 1) * 1.5));

      elements.push({
        group: 'edges',
        data: {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          tx_count: edge.tx_count,
          total_amount: edge.total_amount,
          token: edge.token,
          latest_timestamp: edge.latest_timestamp,
          tx_hashes: edge.tx_hashes,
          width,
        },
      });
    }

    if (cyRef.current) {
      cyRef.current.destroy();
    }

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': 'data(nodeColor)',
            'border-width': 2,
            'border-color': 'data(borderColor)',
            width: 'data(size)',
            height: 'data(size)',
            label: 'data(label)',
            color: '#88c5a0',
            'font-size': '10px',
            'font-family': 'monospace',
            'text-valign': 'bottom',
            'text-margin-y': 4,
            'text-background-opacity': 0.8,
            'text-background-color': '#040705',
            'text-background-padding': '2px',
          },
        },
        {
          selector: 'node:selected',
          style: {
            'border-color': '#00f0ff',
            'border-width': 4,
          },
        },
        {
          selector: 'edge',
          style: {
            width: 'data(width)',
            'line-color': '#163826',
            'target-arrow-color': '#163826',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'arrow-scale': 1.1,
            opacity: 0.8,
          },
        },
        {
          selector: 'edge:selected',
          style: {
            'line-color': '#00f0ff',
            'target-arrow-color': '#00f0ff',
            width: 4,
            opacity: 1,
          },
        },
        {
          selector: '.highlighted-node',
          style: {
            'border-color': '#00f0ff',
            'border-width': 4,
            'background-color': '#00f0ff',
          },
        },
        {
          selector: '.path-node',
          style: {
            'border-color': '#ffb000',
            'border-width': 5,
            'background-color': '#ffb000',
          },
        },
        {
          selector: '.path-edge',
          style: {
            'line-color': '#ffb000',
            'target-arrow-color': '#ffb000',
            width: 5,
            opacity: 1,
            'z-index': 999,
          },
        },
        {
          selector: '.connected-edge',
          style: {
            'line-color': '#00ff66',
            'target-arrow-color': '#00ff66',
            width: 3,
            opacity: 1,
          },
        },
        {
          selector: '.dimmed',
          style: {
            opacity: 0.15,
          },
        },
      ],
      layout: {
        name: layoutName,
        animate: false,
        padding: 40,
      },
    });

    cy.on('tap', 'node', (evt: EventObject) => {
      const node = evt.target;
      const nodeData = node.data();
      setSelectedNodeData(nodeData);
      setSelectedEdgeData(null);

      cy.elements().removeClass('connected-edge dimmed');
      const connectedEdges = node.connectedEdges();
      const connectedNodes = connectedEdges.connectedNodes();
      
      cy.elements().addClass('dimmed');
      node.removeClass('dimmed');
      connectedNodes.removeClass('dimmed');
      connectedEdges.removeClass('dimmed').addClass('connected-edge');
    });

    cy.on('dbltap', 'node', (evt: EventObject) => {
      const addr = evt.target.data('address');
      onSelectWallet(addr);
    });

    cy.on('tap', 'edge', (evt: EventObject) => {
      const edge = evt.target;
      setSelectedEdgeData(edge.data());
      setSelectedNodeData(null);
    });

    cy.on('tap', (evt: EventObject) => {
      if (evt.target === cy) {
        cy.elements().removeClass('connected-edge dimmed highlighted-node');
        setSelectedEdgeData(null);
        setSelectedNodeData(null);
      }
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [graphData, layoutName]);

  useEffect(() => {
    if (!cyRef.current) return;
    const cy = cyRef.current;

    cy.elements().removeClass('path-node path-edge');

    if (activePath?.found && activePath.path && activePath.path.length > 0) {
      const pathSet = new Set(activePath.path.map((w) => w.toLowerCase()));

      cy.nodes().forEach((n) => {
        if (pathSet.has(n.data('address').toLowerCase())) {
          n.addClass('path-node');
        }
      });

      for (let i = 0; i < activePath.path.length - 1; i++) {
        const u = activePath.path[i].toLowerCase();
        const v = activePath.path[i + 1].toLowerCase();
        cy.edges().forEach((e) => {
          if (e.source().data('address').toLowerCase() === u && e.target().data('address').toLowerCase() === v) {
            e.addClass('path-edge');
          }
        });
      }

      const pathNodes = cy.nodes('.path-node');
      if (pathNodes.length > 0) {
        cy.fit(pathNodes, 50);
      }
    }
  }, [activePath]);

  const handleSearchWallet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cyRef.current || !walletSearch.trim()) return;
    const cy = cyRef.current;
    const query = walletSearch.toLowerCase().trim();

    const targetNode = cy.nodes().filter((n) => n.data('address').toLowerCase().includes(query));
    if (targetNode.length > 0) {
      cy.elements().removeClass('highlighted-node dimmed');
      targetNode.addClass('highlighted-node');
      cy.animate({
        center: { eles: targetNode },
        zoom: 1.8,
        duration: 400,
      });
      setSelectedNodeData(targetNode.first().data());
    }
  };

  const handleRunShortestPath = async () => {
    if (!pathSource.trim() || !pathTarget.trim()) return;
    try {
      const res = await fetchShortestPath(pathSource.trim(), pathTarget.trim());
      setLocalPath(res);
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetLayout = () => {
    if (!cyRef.current) return;
    cyRef.current.elements().removeClass('connected-edge dimmed highlighted-node path-node path-edge');
    cyRef.current.layout({ name: layoutName, animate: true }).run();
    cyRef.current.fit(undefined, 30);
    setLocalPath(null);
    if (onClearPath) onClearPath();
  };

  return (
    <div className="border border-[#132e1f] bg-[#040705] flex flex-col h-[750px] relative font-mono text-xs select-none">
      {/* Top Graph Control Bar */}
      <div className="border-b border-[#132e1f] bg-[#060c08] p-2 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 border border-[#132e1f] bg-[#030604] p-0.5">
            <button
              onClick={() => cyRef.current?.zoom(cyRef.current.zoom() * 1.25)}
              className="p-1 hover:text-[#00ff66] text-[#5a8a6e]"
              title="Zoom In"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => cyRef.current?.zoom(cyRef.current.zoom() * 0.8)}
              className="p-1 hover:text-[#00ff66] text-[#5a8a6e]"
              title="Zoom Out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => cyRef.current?.fit(undefined, 30)}
              className="p-1 hover:text-[#00ff66] text-[#5a8a6e]"
              title="Fit to Bounds"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleResetLayout}
              className="p-1 hover:text-[#ffb000] text-[#5a8a6e]"
              title="Re-run Layout Engine"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex items-center space-x-1 text-xs">
            <span className="text-[#5a8a6e]">LAYOUT:</span>
            <select
              value={layoutName}
              onChange={(e) => setLayoutName(e.target.value as any)}
              className="bg-[#030604] border border-[#132e1f] text-[#00ff66] px-2 py-0.5 text-xs focus:outline-none"
            >
              <option value="cose">COSE (PHYSICS)</option>
              <option value="concentric">CONCENTRIC</option>
              <option value="circle">CIRCLE</option>
              <option value="breadthfirst">HIERARCHICAL (BFS)</option>
            </select>
          </div>
        </div>

        {/* Center: Search Node in Graph */}
        <form onSubmit={handleSearchWallet} className="flex items-center space-x-1.5">
          <input
            type="text"
            value={walletSearch}
            onChange={(e) => setWalletSearch(e.target.value)}
            placeholder="Search address in graph (0x...)"
            className="w-48 sm:w-64 bg-[#030604] border border-[#132e1f] px-2 py-0.5 text-xs text-[#00ff66] focus:outline-none focus:border-[#00ff66]"
          />
          <button
            type="submit"
            className="border border-[#132e1f] hover:border-[#00ff66] hover:bg-[#00ff66]/10 text-[#00ff66] px-2 py-0.5 text-xs"
          >
            [LOCATE]
          </button>
        </form>

        <div className="flex items-center space-x-2">
          <span className="border border-[#132e1f] px-2 py-0.5 text-[10px] text-[#5a8a6e]">
            RENDERED: {graphData?.stats.rendered_nodes ?? 0}V / {graphData?.stats.rendered_edges ?? 0}E
          </span>
          {graphData?.stats.is_capped && (
            <span className="border border-[#ffb000]/40 text-[#ffb000] px-1.5 py-0.5 text-[9px]">
              [DENSITY CAPPED]
            </span>
          )}
        </div>
      </div>

      {/* Pathfinder Toolbar */}
      <div className="border-b border-[#132e1f] bg-[#050906] px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <div className="flex items-center space-x-2">
          <Route className="h-3.5 w-3.5 text-[#ffb000]" />
          <span className="text-[#ffb000] font-bold">[BFS PATHFINDER]:</span>
          <input
            type="text"
            placeholder="Source wallet (0x...)"
            value={pathSource}
            onChange={(e) => setPathSource(e.target.value)}
            className="w-36 bg-[#030604] border border-[#132e1f] px-1.5 py-0.5 text-[11px] text-[#00ff66] focus:outline-none"
          />
          <span className="text-[#5a8a6e]">➔</span>
          <input
            type="text"
            placeholder="Target wallet (0x...)"
            value={pathTarget}
            onChange={(e) => setPathTarget(e.target.value)}
            className="w-36 bg-[#030604] border border-[#132e1f] px-1.5 py-0.5 text-[11px] text-[#00ff66] focus:outline-none"
          />
          <button
            onClick={handleRunShortestPath}
            className="border border-[#ffb000] bg-[#ffb000]/10 hover:bg-[#ffb000]/20 text-[#ffb000] px-2 py-0.5 text-[10px] font-bold transition-colors"
          >
            [CALCULATE MIN HOPS]
          </button>
        </div>

        {activePath && (
          <div className="flex items-center space-x-2 text-[10px]">
            {activePath.found ? (
              <span className="text-[#00ff66]">
                ROUTE FOUND: {activePath.hop_count} HOPS ({activePath.elapsed_us} µs)
              </span>
            ) : (
              <span className="text-[#ff3344]">{activePath.message || 'NO DIRECTED ROUTE'}</span>
            )}
            <button
              onClick={() => {
                setLocalPath(null);
                if (onClearPath) onClearPath();
              }}
              className="text-[#5a8a6e] hover:text-[#ff3344] underline"
            >
              CLEAR
            </button>
          </div>
        )}
      </div>

      {/* Main Cytoscape Canvas */}
      <div ref={containerRef} className="flex-1 w-full h-full bg-[#030604] cursor-grab active:cursor-grabbing" />

      {/* Interactive Floating Node / Edge Inspector Overlay */}
      {selectedNodeData && (
        <div className="absolute left-3 bottom-3 max-w-sm border border-[#00f0ff] bg-[#050a07]/95 p-3 text-xs shadow-2xl backdrop-blur-xs">
          <div className="flex items-center justify-between border-b border-[#132e1f] pb-1 mb-2">
            <span className="text-[#00f0ff] font-bold">[SELECTED WALLET VERTEX]</span>
            <button
              onClick={() => setSelectedNodeData(null)}
              className="text-[#ff3344] hover:font-bold"
            >
              [X]
            </button>
          </div>
          <div className="space-y-1 text-[#5a8a6e]">
            <p className="text-[#00ff66] font-semibold break-all">{selectedNodeData.address}</p>
            <div className="flex justify-between">
              <span>STATUS SIGNAL:</span>
              <span className="text-[#00f0ff] font-bold">[{selectedNodeData.status_label}]</span>
            </div>
            <div className="flex justify-between">
              <span>IN-DEGREE (TRANSFERS):</span>
              <span className="text-[#00ff66]">{selectedNodeData.in_degree}</span>
            </div>
            <div className="flex justify-between">
              <span>OUT-DEGREE (TRANSFERS):</span>
              <span className="text-[#00ff66]">{selectedNodeData.out_degree}</span>
            </div>
            <div className="flex justify-between">
              <span>TOTAL VALUE IN:</span>
              <span className="text-[#00ff66]">{formatAmount(selectedNodeData.total_in_value)}</span>
            </div>
            <div className="flex justify-between">
              <span>TOTAL VALUE OUT:</span>
              <span className="text-[#00ff66]">{formatAmount(selectedNodeData.total_out_value)}</span>
            </div>
          </div>
          <div className="mt-3 flex space-x-2 pt-2 border-t border-[#132e1f]">
            <button
              onClick={() => onSelectWallet(selectedNodeData.address)}
              className="flex-1 border border-[#00ff66] bg-[#00ff66]/10 hover:bg-[#00ff66]/20 text-[#00ff66] py-1 text-center font-bold"
            >
              OPEN FULL PROFILE
            </button>
            <button
              onClick={() => setPathSource(selectedNodeData.address)}
              className="border border-[#132e1f] hover:border-[#ffb000] text-[#ffb000] px-2 py-1"
              title="Set as path source"
            >
              PATH SRC
            </button>
          </div>
        </div>
      )}

      {selectedEdgeData && (
        <div className="absolute right-3 bottom-3 max-w-sm border border-[#00ff66] bg-[#050a07]/95 p-3 text-xs shadow-2xl backdrop-blur-xs">
          <div className="flex items-center justify-between border-b border-[#132e1f] pb-1 mb-2">
            <span className="text-[#00ff66] font-bold">[DIRECTED TRANSFER EDGE]</span>
            <button
              onClick={() => setSelectedEdgeData(null)}
              className="text-[#ff3344] hover:font-bold"
            >
              [X]
            </button>
          </div>
          <div className="space-y-1.5 text-[#5a8a6e]">
            <div>
              <span>SOURCE:</span>
              <p className="text-[#00ff66] break-all">{selectedEdgeData.source}</p>
            </div>
            <div>
              <span>TARGET:</span>
              <p className="text-[#00ff66] break-all">{selectedEdgeData.target}</p>
            </div>
            <div className="flex justify-between border-t border-[#132e1f] pt-1">
              <span>TRANSFER COUNT:</span>
              <span className="text-[#00f0ff] font-bold">{selectedEdgeData.tx_count} transactions</span>
            </div>
            <div className="flex justify-between">
              <span>CUMULATIVE AMOUNT:</span>
              <span className="text-[#00ff66] font-bold">
                {formatAmount(selectedEdgeData.total_amount)} {selectedEdgeData.token}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Graph Legend Overlay */}
      <div className="absolute left-3 top-20 border border-[#132e1f] bg-[#040705]/90 p-2 text-[10px] space-y-1 select-none pointer-events-none">
        <div className="text-[#5a8a6e] font-bold mb-1 border-b border-[#132e1f] pb-0.5">LEGEND // EXPLAINABLE</div>
        <div className="flex items-center space-x-1.5">
          <span className="h-2 w-2 rounded-full bg-[#00ff66]" />
          <span className="text-[#00ff66]">NORMAL ACTIVITY</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="h-2 w-2 rounded-full bg-[#00f0ff]" />
          <span className="text-[#00f0ff]">REVIEW RECOMMENDED</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="h-2 w-2 rounded-full bg-[#ffb000]" />
          <span className="text-[#ffb000]">PRIORITY REVIEW (ANOMALY)</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="h-0.5 w-3 bg-[#ffb000]" />
          <span className="text-[#ffb000]">SHORTEST BFS PATH</span>
        </div>
      </div>
    </div>
  );
};
