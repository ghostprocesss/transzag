export interface Transaction {
  tx_hash: string;
  from_address: string;
  to_address: string;
  amount: number;
  token: string;
  timestamp: number;
  block_number?: number | null;
  status?: string;
}

export interface PaginatedTransactions {
  items: Transaction[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface DatasetStats {
  total_transactions: number;
  unique_wallets: number;
  total_volume_by_token: Record<string, number>;
  flagged_wallets_count: number;
  detected_patterns_count: number;
  time_range_start?: number | null;
  time_range_end?: number | null;
  density: number;
  connected_components_count: number;
}

export interface GraphNode {
  id: string;
  address: string;
  label: string;
  degree: number;
  in_degree: number;
  out_degree: number;
  flagged: boolean;
  status_label: string;
  reasons: string[];
  total_in_value: number;
  total_out_value: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  tx_count: number;
  total_amount: number;
  token: string;
  latest_timestamp: number;
  tx_hashes: string[];
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: {
    total_nodes: number;
    rendered_nodes: number;
    total_edges: number;
    rendered_edges: number;
    is_capped: boolean;
  };
}

export interface InvestigationFinding {
  id: string;
  pattern_type: string;
  title: string;
  severity: 'PRIORITY_REVIEW' | 'REVIEW_RECOMMENDED' | 'INFORMATIONAL';
  description: string;
  evidence: Record<string, any>;
  involved_wallets: string[];
  involved_tx_hashes: string[];
  timestamps: number[];
  detection_rule: string;
  disclaimer: string;
}

export interface WalletProfile {
  address: string;
  found: boolean;
  first_seen?: number | null;
  last_seen?: number | null;
  total_incoming_txs: number;
  total_outgoing_txs: number;
  total_transactions: number;
  unique_counterparties_count: number;
  volume_in_by_token: Record<string, number>;
  volume_out_by_token: Record<string, number>;
  top_senders: { address: string; count: number }[];
  top_recipients: { address: string; count: number }[];
  largest_incoming_transfers: {
    tx_hash: string;
    from_address: string;
    amount: number;
    token: string;
    timestamp: number;
  }[];
  largest_outgoing_transfers: {
    tx_hash: string;
    to_address: string;
    amount: number;
    token: string;
    timestamp: number;
  }[];
  activity_timeline: { timestamp: number; count: number }[];
  status_label: string;
  flagged: boolean;
  reasons: string[];
  involved_findings: {
    id: string;
    title: string;
    pattern_type: string;
    severity: string;
    description: string;
  }[];
}

export interface TerminalLogEntry {
  id: string;
  timestamp: string;
  type: 'INFO' | 'SCAN' | 'WARN' | 'ERROR' | 'DONE' | 'CMD';
  message: string;
}

export interface ShortestPathResult {
  found: boolean;
  source?: string;
  target?: string;
  hop_count?: number;
  path?: string[];
  edges?: {
    source: string;
    target: string;
    tx_count: number;
    total_amount: number;
    token: string;
    latest_timestamp: number;
  }[];
  elapsed_us?: number;
  time_complexity?: string;
  space_complexity?: string;
  disclaimer?: string;
  message?: string;
  error?: string;
}

export interface AlgorithmBenchmarkSuite {
  environment: {
    python_version: string;
    platform: string;
    processor: string;
    benchmark_timestamp: number;
  };
  results_by_size: Record<
    number,
    {
      size: number;
      index_build_us: number;
      hash_lookup_us: number;
      linear_lookup_us: number;
      lookup_speedup: number;
      merge_sort_ms: number;
      merge_sort_comparisons: number;
      insertion_sort_ms: number;
      insertion_sort_comparisons: number;
      sort_speedup: number;
      graph_build_us: number;
      bfs_traversal_us: number;
      dfs_traversal_us: number;
      cycle_detection_us: number;
      cycles_found_count: number;
    }
  >;
  complexity_matrix: {
    name: string;
    problem: string;
    time_complexity: string;
    space_complexity: string;
    category: string;
  }[];
}
