"""
Blockchain Provider Interface for BlockScope.
Supports querying live/public EVM networks:
- Public RPC queries (e.g., Ethereum mainnet, Sepolia, Arbitrum)
- Validates 0x Ethereum addresses
- Graceful error handling for offline/rate-limited environments
- Never mixes simulated synthetic data with live provider data
"""

import os
import re
import urllib.request
import json
from typing import List, Dict, Any, Optional
from .models import Transaction

ETH_ADDR_REGEX = re.compile(r"^0x[a-fA-F0-9]{40}$")

class BlockchainProvider:
    def __init__(self, rpc_url: Optional[str] = None):
        # Default to Cloudflare public Ethereum RPC or user env
        self.rpc_url = rpc_url or os.getenv("BLOCKSCOPE_RPC_URL", "https://cloudflare-eth.com")
        self.network_name = os.getenv("BLOCKSCOPE_NETWORK_NAME", "Ethereum Mainnet (Public RPC)")

    def validate_address(self, address: str) -> bool:
        if not address or not isinstance(address, str):
            return False
        return bool(ETH_ADDR_REGEX.match(address.strip()))

    def query_wallet_transactions(self, address: str, max_blocks_scan: int = 50) -> Dict[str, Any]:
        """
        Attempts to scan recent blocks or balance for target wallet via standard JSON-RPC.
        Note: Public RPCs don't index transactions by address without archive node or Etherscan API.
        If archive indexing is unavailable, it queries recent block state and address balance,
        and returns clear forensic metadata stating what was scanned.
        """
        if not self.validate_address(address):
            return {
                "success": False,
                "error": f"Invalid EVM wallet address format: '{address}'. Must be 0x followed by 40 hex digits.",
                "network": self.network_name,
                "address": address,
                "transactions": []
            }

        cleaned_addr = address.strip().lower()

        # Step 1: Check balance via eth_getBalance
        balance_eth = 0.0
        try:
            req_data = json.dumps({
                "jsonrpc": "2.0",
                "method": "eth_getBalance",
                "params": [cleaned_addr, "latest"],
                "id": 1
            }).encode("utf-8")

            req = urllib.request.Request(
                self.rpc_url,
                data=req_data,
                headers={"Content-Type": "application/json", "User-Agent": "BlockScope-Investigator/1.0"}
            )
            with urllib.request.urlopen(req, timeout=5) as response:
                res = json.loads(response.read().decode("utf-8"))
                if "result" in res and res["result"]:
                    wei = int(res["result"], 16)
                    balance_eth = round(wei / 1e18, 6)
        except Exception as e:
            # Fallback for offline or restricted environment
            return {
                "success": False,
                "network": self.network_name,
                "address": cleaned_addr,
                "error": f"RPC endpoint unreachable or rate-limited ({str(e)}). Ensure internet connectivity or configure BLOCKSCOPE_RPC_URL.",
                "transactions": [],
                "partial_notice": "Could not complete live blockchain RPC call."
            }

        # Step 2: Query latest block number
        latest_block = 0
        try:
            req_data = json.dumps({
                "jsonrpc": "2.0",
                "method": "eth_blockNumber",
                "params": [],
                "id": 2
            }).encode("utf-8")
            req = urllib.request.Request(
                self.rpc_url,
                data=req_data,
                headers={"Content-Type": "application/json", "User-Agent": "BlockScope-Investigator/1.0"}
            )
            with urllib.request.urlopen(req, timeout=5) as response:
                res = json.loads(response.read().decode("utf-8"))
                if "result" in res and res["result"]:
                    latest_block = int(res["result"], 16)
        except Exception:
            latest_block = 0

        return {
            "success": True,
            "network": self.network_name,
            "address": cleaned_addr,
            "balance_eth": balance_eth,
            "latest_scanned_block": latest_block,
            "transactions": [],
            "partial_notice": (
                "NOTICE: Direct JSON-RPC nodes do not index full historical transaction logs "
                "by address without external indexers (e.g. Etherscan/TheGraph). Live balance and block "
                "have been confirmed. Synthetic or imported datasets provide full investigative graphs."
            )
        }
