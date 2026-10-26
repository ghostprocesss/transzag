import {
  DatasetStats,
  PaginatedTransactions,
  GraphData,
  InvestigationFinding,
  WalletProfile,
  ShortestPathResult,
  AlgorithmBenchmarkSuite
} from './types';

const BASE_URL = ''; // Relative URL handled by Vite proxy or direct

export async function fetchDatasetStats(): Promise<DatasetStats> {
  const res = await fetch(`${BASE_URL}/api/dataset/stats`);
  if (!res.ok) throw new Error('Failed to fetch dataset stats');
  return res.json();
}

export async function fetchTransactions(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  wallet?: string;
  minAmount?: number;
  maxAmount?: number;
  token?: string;
  sortBy?: string;
  sortOrder?: string;
}): Promise<PaginatedTransactions> {
  const q = new URLSearchParams();
  if (params.page) q.set('page', params.page.toString());
  if (params.pageSize) q.set('page_size', params.pageSize.toString());
  if (params.search) q.set('search', params.search);
  if (params.wallet) q.set('wallet_address', params.wallet);
  if (params.minAmount !== undefined) q.set('min_amount', params.minAmount.toString());
  if (params.maxAmount !== undefined) q.set('max_amount', params.maxAmount.toString());
  if (params.token) q.set('token', params.token);
  if (params.sortBy) q.set('sort_by', params.sortBy);
  if (params.sortOrder) q.set('sort_order', params.sortOrder);

  const res = await fetch(`${BASE_URL}/api/transactions?${q.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch transactions');
  return res.json();
}

export async function fetchGraphData(params: {
  minAmount?: number;
  walletFilter?: string;
  neighborhoodHops?: number;
  maxNodes?: number;
}): Promise<GraphData> {
  const q = new URLSearchParams();
  if (params.minAmount !== undefined) q.set('min_amount', params.minAmount.toString());
  if (params.walletFilter) q.set('wallet_filter', params.walletFilter);
  if (params.neighborhoodHops !== undefined) q.set('neighborhood_hops', params.neighborhoodHops.toString());
  if (params.maxNodes !== undefined) q.set('max_nodes', params.maxNodes.toString());

  const res = await fetch(`${BASE_URL}/api/graph?${q.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch graph data');
  return res.json();
}

export async function fetchWalletProfile(address: string): Promise<WalletProfile> {
  const res = await fetch(`${BASE_URL}/api/wallets/${encodeURIComponent(address)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to fetch wallet' }));
    throw new Error(err.detail || 'Wallet not found');
  }
  return res.json();
}

export async function fetchPatterns(params: {
  repeatedMin?: number;
  rapidMaxSec?: number;
  rapidTolerance?: number;
  highActPercentile?: number;
  maxCycleLen?: number;
  spikeMultiplier?: number;
  clusterMinDensity?: number;
}): Promise<InvestigationFinding[]> {
  const q = new URLSearchParams();
  if (params.repeatedMin !== undefined) q.set('repeated_min_transfers', params.repeatedMin.toString());
  if (params.rapidMaxSec !== undefined) q.set('rapid_max_delay_seconds', params.rapidMaxSec.toString());
  if (params.rapidTolerance !== undefined) q.set('rapid_amount_tolerance', params.rapidTolerance.toString());
  if (params.highActPercentile !== undefined) q.set('high_activity_percentile', params.highActPercentile.toString());
  if (params.maxCycleLen !== undefined) q.set('max_cycle_length', params.maxCycleLen.toString());
  if (params.spikeMultiplier !== undefined) q.set('spike_multiplier', params.spikeMultiplier.toString());
  if (params.clusterMinDensity !== undefined) q.set('cluster_min_density', params.clusterMinDensity.toString());

  const res = await fetch(`${BASE_URL}/api/patterns/detect?${q.toString()}`);
  if (!res.ok) throw new Error('Failed to run pattern detection');
  return res.json();
}

export async function executeConsoleCommand(command: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/console/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command }),
  });
  if (!res.ok) throw new Error('Console command execution failed');
  return res.json();
}

export async function fetchShortestPath(source: string, target: string): Promise<ShortestPathResult> {
  const q = new URLSearchParams({ source, target });
  const res = await fetch(`${BASE_URL}/api/algorithms/shortest-path?${q.toString()}`);
  if (!res.ok) throw new Error('Shortest path query failed');
  return res.json();
}

export async function fetchTraversal(wallet?: string, algorithm: 'bfs' | 'dfs' = 'bfs', depth: number = 8): Promise<any> {
  const q = new URLSearchParams({ algorithm, max_depth: depth.toString() });
  if (wallet) q.set('start_wallet', wallet);
  const res = await fetch(`${BASE_URL}/api/algorithms/traverse?${q.toString()}`);
  if (!res.ok) throw new Error('Traversal query failed');
  return res.json();
}

export async function fetchLookupComparison(txHash?: string): Promise<any> {
  const q = new URLSearchParams();
  if (txHash) q.set('tx_hash', txHash);
  const res = await fetch(`${BASE_URL}/api/algorithms/lookup?${q.toString()}`);
  if (!res.ok) throw new Error('Lookup comparison failed');
  return res.json();
}

export async function fetchSortComparison(field: string = 'amount', descending: boolean = true): Promise<any> {
  const q = new URLSearchParams({ field, descending: descending.toString() });
  const res = await fetch(`${BASE_URL}/api/algorithms/sort?${q.toString()}`);
  if (!res.ok) throw new Error('Sort comparison failed');
  return res.json();
}

export async function fetchBenchmarks(sizes?: string): Promise<AlgorithmBenchmarkSuite> {
  const q = new URLSearchParams();
  if (sizes) q.set('sizes', sizes);
  const res = await fetch(`${BASE_URL}/api/algorithms/benchmarks?${q.toString()}`);
  if (!res.ok) throw new Error('Benchmark run failed');
  return res.json();
}

export async function loadDemoDataset(): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/dataset/load-demo`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to load demo dataset');
  return res.json();
}

export async function uploadDatasetFile(file: File): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${BASE_URL}/api/dataset/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(err.detail || 'Upload failed');
  }
  return res.json();
}

export async function queryBlockchain(address: string): Promise<any> {
  const q = new URLSearchParams({ address });
  const res = await fetch(`${BASE_URL}/api/blockchain/lookup?${q.toString()}`);
  if (!res.ok) throw new Error('Blockchain lookup failed');
  return res.json();
}

export async function saveReport(title: string, markdown: string, metadata: any): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/reports/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content_markdown: markdown, metadata }),
  });
  if (!res.ok) throw new Error('Failed to save report');
  return res.json();
}

export async function listSavedReports(): Promise<any[]> {
  const res = await fetch(`${BASE_URL}/api/reports/list`);
  if (!res.ok) throw new Error('Failed to list reports');
  return res.json();
}
