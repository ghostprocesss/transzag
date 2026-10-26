"""
Data loader and validation module for BlockScope.
Supports CSV, JSON, built-in synthetic demo data, and schema validation.
"""

import csv
import json
import io
from typing import List, Dict, Any, Tuple
from .models import Transaction
from .sample_data import generate_synthetic_transactions

REQUIRED_FIELDS = ["tx_hash", "from_address", "to_address", "amount", "timestamp"]

class DataLoaderError(Exception):
    def __init__(self, message: str, details: Any = None):
        super().__init__(message)
        self.message = message
        self.details = details

def validate_and_parse_record(row: Dict[str, Any], row_idx: int) -> Transaction:
    missing = [f for f in REQUIRED_FIELDS if f not in row or row[f] is None or str(row[f]).strip() == ""]
    if missing:
        raise DataLoaderError(f"Row {row_idx}: Missing required fields: {', '.join(missing)}")
    
    tx_hash = str(row["tx_hash"]).strip()
    from_addr = str(row["from_address"]).strip().lower()
    to_addr = str(row["to_address"]).strip().lower()

    if not tx_hash.startswith("0x") or len(tx_hash) < 10:
        raise DataLoaderError(f"Row {row_idx}: Invalid tx_hash format '{tx_hash}'")

    if not from_addr.startswith("0x") or len(from_addr) < 10:
        raise DataLoaderError(f"Row {row_idx}: Invalid from_address '{from_addr}'")

    if not to_addr.startswith("0x") or len(to_addr) < 10:
        raise DataLoaderError(f"Row {row_idx}: Invalid to_address '{to_addr}'")

    try:
        amount = float(row["amount"])
        if amount < 0:
            raise ValueError()
    except (ValueError, TypeError):
        raise DataLoaderError(f"Row {row_idx}: Amount must be a non-negative float, got '{row.get('amount')}'")

    try:
        timestamp = int(float(row["timestamp"]))
        if timestamp < 0:
            raise ValueError()
    except (ValueError, TypeError):
        raise DataLoaderError(f"Row {row_idx}: Timestamp must be a valid integer, got '{row.get('timestamp')}'")

    token = str(row.get("token", "ETH")).strip().upper() or "ETH"
    
    block_number = None
    if row.get("block_number") not in [None, ""]:
        try:
            block_number = int(row["block_number"])
        except (ValueError, TypeError):
            block_number = None

    status = str(row.get("status", "confirmed")).strip().lower() or "confirmed"

    return Transaction(
        tx_hash=tx_hash,
        from_address=from_addr,
        to_address=to_addr,
        amount=amount,
        token=token,
        timestamp=timestamp,
        block_number=block_number,
        status=status
    )

def parse_csv_data(csv_text: str) -> List[Transaction]:
    f = io.StringIO(csv_text.strip())
    reader = csv.DictReader(f)
    if not reader.fieldnames:
        raise DataLoaderError("Empty CSV file or header missing")
    
    transactions: List[Transaction] = []
    seen_hashes = set()
    errors = []

    for idx, row in enumerate(reader, start=1):
        try:
            tx = validate_and_parse_record(row, idx)
            if tx.tx_hash in seen_hashes:
                # Flag duplicate hash warning/skip or reject based on requirements
                # We record unique transactions
                continue
            seen_hashes.add(tx.tx_hash)
            transactions.append(tx)
        except DataLoaderError as e:
            errors.append(str(e))
            if len(errors) > 20:
                raise DataLoaderError(f"Validation failed with multiple errors: {'; '.join(errors[:5])}...")

    if errors:
        raise DataLoaderError(f"Validation errors encountered:\n" + "\n".join(errors[:10]))
    
    if not transactions:
        raise DataLoaderError("No valid transactions found in CSV")

    return transactions

def parse_json_data(json_text: str) -> List[Transaction]:
    try:
        data = json.loads(json_text)
    except Exception as e:
        raise DataLoaderError(f"Invalid JSON format: {str(e)}")

    if isinstance(data, dict) and "transactions" in data:
        items = data["transactions"]
    elif isinstance(data, list):
        items = data
    else:
        raise DataLoaderError("JSON must be a list of transactions or an object with a 'transactions' key")

    transactions: List[Transaction] = []
    seen_hashes = set()
    errors = []

    for idx, item in enumerate(items, start=1):
        try:
            tx = validate_and_parse_record(item, idx)
            if tx.tx_hash in seen_hashes:
                continue
            seen_hashes.add(tx.tx_hash)
            transactions.append(tx)
        except DataLoaderError as e:
            errors.append(str(e))
            if len(errors) > 20:
                raise DataLoaderError(f"Validation failed with multiple errors: {'; '.join(errors[:5])}...")

    if errors:
        raise DataLoaderError(f"Validation errors encountered:\n" + "\n".join(errors[:10]))

    if not transactions:
        raise DataLoaderError("No valid transactions found in JSON")

    return transactions

def export_to_csv(transactions: List[Transaction]) -> str:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["tx_hash", "from_address", "to_address", "amount", "token", "timestamp", "block_number", "status"])
    for t in transactions:
        writer.writerow([
            t.tx_hash,
            t.from_address,
            t.to_address,
            t.amount,
            t.token,
            t.timestamp,
            t.block_number if t.block_number is not None else "",
            t.status
        ])
    return output.getvalue()
