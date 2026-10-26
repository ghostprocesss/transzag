# Backend models for BlockScope
from typing import List, Dict, Optional, Any, Tuple
from pydantic import BaseModel, Field
from datetime import datetime

class Transaction(BaseModel):
    tx_hash: str = Field(..., description="Unique transaction hash (hex)")
    from_address: str = Field(..., description="Sender wallet address (0x...)")
    to_address: str = Field(..., description="Recipient wallet address (0x...)")
    amount: float = Field(..., description="Transaction numerical amount")
    token: str = Field(default="ETH", description="Token or currency symbol (e.g. ETH, USDT, DAI)")
    timestamp: int = Field(..., description="Unix timestamp (seconds)")
    block_number: Optional[int] = Field(default=None, description="Block number if known")
    status: Optional[str] = Field(default="confirmed", description="Transaction execution status")

class TransactionFilter(BaseModel):
    from_address: Optional[str] = None
    to_address: Optional[str] = None
    wallet_address: Optional[str] = None
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None
    token: Optional[str] = None
    start_time: Optional[int] = None
    end_time: Optional[int] = None
    search: Optional[str] = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=50, ge=1, le=500)
    sort_by: Optional[str] = "timestamp"
    sort_order: Optional[str] = "desc"

class PaginatedTransactions(BaseModel):
    items: List[Transaction]
    total: int
    page: int
    page_size: int
    total_pages: int

class WalletSummary(BaseModel):
    address: str
    first_seen: Optional[int] = None
    last_seen: Optional[int] = None
    total_in_transfers: int = 0
    total_out_transfers: int = 0
    total_volume_in: Dict[str, float] = Field(default_factory=dict)
    total_volume_out: Dict[str, float] = Field(default_factory=dict)
    unique_counterparties: int = 0
    in_degree: int = 0
    out_degree: int = 0
    degree: int = 0
    flagged: bool = False
    flag_reasons: List[str] = Field(default_factory=list)
    detected_patterns: List[str] = Field(default_factory=list)

class GraphNode(BaseModel):
    id: str
    address: str
    label: str
    degree: int
    in_degree: int
    out_degree: int
    flagged: bool
    status_label: str = "NORMAL"
    reasons: List[str] = Field(default_factory=list)
    total_in_value: float = 0.0
    total_out_value: float = 0.0

class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    tx_count: int
    total_amount: float
    token: str
    latest_timestamp: int
    tx_hashes: List[str] = Field(default_factory=list)

class GraphData(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]
    stats: Dict[str, Any]

class InvestigationFinding(BaseModel):
    id: str
    pattern_type: str
    title: str
    severity: str = "REVIEW_RECOMMENDED"  # INFORMATIONAL, REVIEW_RECOMMENDED, PRIORITY_REVIEW
    description: str
    evidence: Dict[str, Any]
    involved_wallets: List[str]
    involved_tx_hashes: List[str]
    timestamps: List[int]
    detection_rule: str
    disclaimer: str = (
        "NOTICE: This investigative finding reflects an algorithmic graph anomaly "
        "or structural pattern. It is NOT definitive proof of fraud, illegality, "
        "or malicious intent. Further manual verification is required."
    )

class DatasetStats(BaseModel):
    total_transactions: int
    unique_wallets: int
    total_volume_by_token: Dict[str, float]
    flagged_wallets_count: int
    detected_patterns_count: int
    time_range_start: Optional[int]
    time_range_end: Optional[int]
    density: float
    connected_components_count: int

class AlgorithmBenchmarkResult(BaseModel):
    algorithm_name: str
    category: str
    input_size: int
    time_microseconds: float
    operations_count: int
    theoretical_time_complexity: str
    theoretical_space_complexity: str
    description: str

class AlgorithmTrace(BaseModel):
    algorithm: str
    input_summary: Dict[str, Any]
    steps: List[Dict[str, Any]]
    result: Any
    elapsed_us: float
    comparison_count: int
    theoretical_complexity: str
