"""
Sorting algorithms implementation module for BlockScope.
Implements:
1. Merge Sort: O(N log N) divide-and-conquer algorithm. Stable, optimal comparison sort.
2. Insertion Sort: O(N^2) comparison sort. Efficient for tiny / nearly sorted data, slow for large random data.
3. Instrumented comparison counting, execution timing, and optional visual step tracer.
"""

import time
from typing import List, Callable, Any, Tuple, Dict, Optional
from .models import Transaction

def _default_key(tx: Transaction, field: str = "timestamp") -> Any:
    if field == "timestamp":
        return tx.timestamp
    elif field == "amount":
        return tx.amount
    elif field == "from_address":
        return tx.from_address
    elif field == "to_address":
        return tx.to_address
    elif field == "block_number":
        return tx.block_number or 0
    return tx.timestamp

class SortBenchmarkResult:
    def __init__(self, algorithm: str, sorted_list: List[Transaction], elapsed_us: float, comparisons: int):
        self.algorithm = algorithm
        self.sorted_list = sorted_list
        self.elapsed_us = elapsed_us
        self.comparisons = comparisons

    def to_dict(self) -> Dict[str, Any]:
        return {
            "algorithm": self.algorithm,
            "count": len(self.sorted_list),
            "elapsed_us": round(self.elapsed_us, 2),
            "comparisons": self.comparisons,
        }

def merge_sort(
    arr: List[Transaction],
    field: str = "timestamp",
    descending: bool = False,
    record_trace: bool = False
) -> Tuple[List[Transaction], int, float, List[Dict[str, Any]]]:
    """
    Merge Sort implementation with comparison counting and recursive tree trace.
    Time Complexity: O(N log N) worst, average, and best cases.
    Space Complexity: O(N) auxiliary space.
    """
    comparisons = 0
    trace_steps: List[Dict[str, Any]] = []

    def _merge(left: List[Transaction], right: List[Transaction]) -> List[Transaction]:
        nonlocal comparisons
        merged: List[Transaction] = []
        i = 0
        j = 0
        while i < len(left) and j < len(right):
            comparisons += 1
            val_l = _default_key(left[i], field)
            val_r = _default_key(right[j], field)
            
            condition = (val_l >= val_r) if descending else (val_l <= val_r)
            if condition:
                merged.append(left[i])
                i += 1
            else:
                merged.append(right[j])
                j += 1

        while i < len(left):
            merged.append(left[i])
            i += 1
        while j < len(right):
            merged.append(right[j])
            j += 1
        return merged

    def _sort(sub: List[Transaction], depth: int = 0) -> List[Transaction]:
        if len(sub) <= 1:
            return sub
        mid = len(sub) // 2
        left_sub = _sort(sub[:mid], depth + 1)
        right_sub = _sort(sub[mid:], depth + 1)
        merged = _merge(left_sub, right_sub)
        
        if record_trace and len(trace_steps) < 30:
            trace_steps.append({
                "depth": depth,
                "action": "merge",
                "left_len": len(left_sub),
                "right_len": len(right_sub),
                "merged_len": len(merged),
                "left_sample": [_default_key(x, field) for x in left_sub[:3]],
                "right_sample": [_default_key(x, field) for x in right_sub[:3]],
                "merged_sample": [_default_key(x, field) for x in merged[:4]]
            })
        return merged

    t0 = time.perf_counter_ns()
    sorted_items = _sort(arr)
    t1 = time.perf_counter_ns()
    elapsed_us = (t1 - t0) / 1000.0

    return sorted_items, comparisons, elapsed_us, trace_steps

def insertion_sort(
    arr: List[Transaction],
    field: str = "timestamp",
    descending: bool = False,
    record_trace: bool = False
) -> Tuple[List[Transaction], int, float, List[Dict[str, Any]]]:
    """
    Insertion Sort implementation with comparison counting.
    Time Complexity:
    - Best Case (already sorted): O(N)
    - Average / Worst Case: O(N^2)
    Space Complexity: O(1) auxiliary space (in-place or O(N) copy).
    """
    items = list(arr)
    comparisons = 0
    trace_steps: List[Dict[str, Any]] = []

    t0 = time.perf_counter_ns()
    n = len(items)
    for i in range(1, n):
        key_item = items[i]
        key_val = _default_key(key_item, field)
        j = i - 1

        while j >= 0:
            comparisons += 1
            curr_val = _default_key(items[j], field)
            condition = (curr_val < key_val) if descending else (curr_val > key_val)
            if condition:
                items[j + 1] = items[j]
                j -= 1
            else:
                break
        items[j + 1] = key_item

        if record_trace and len(trace_steps) < 30:
            trace_steps.append({
                "step": i,
                "inserted_val": key_val,
                "target_pos": j + 1,
                "current_prefix": [_default_key(x, field) for x in items[:i + 1]]
            })

    t1 = time.perf_counter_ns()
    elapsed_us = (t1 - t0) / 1000.0

    return items, comparisons, elapsed_us, trace_steps

def compare_sort_algorithms(
    arr: List[Transaction],
    field: str = "amount",
    descending: bool = True
) -> Dict[str, Any]:
    """
    Runs both Merge Sort and Insertion Sort on an identical slice of data
    and returns metrics, speedup, and theoretical complexity comparison.
    Note: Insertion Sort is capped at 2500 items to avoid freezing on O(N^2).
    """
    sample_len = len(arr)
    merge_res, merge_cmp, merge_us, merge_trace = merge_sort(arr, field, descending, record_trace=False)

    ins_res = None
    ins_cmp = 0
    ins_us = 0.0
    capped = False

    if sample_len <= 3000:
        ins_res, ins_cmp, ins_us, _ = insertion_sort(arr, field, descending, record_trace=False)
    else:
        capped = True
        # run on 1500 items to estimate
        slice_arr = arr[:1500]
        _, ins_cmp, ins_us, _ = insertion_sort(slice_arr, field, descending, record_trace=False)
        ins_us = ins_us * ((sample_len / 1500) ** 2)
        ins_cmp = int(ins_cmp * ((sample_len / 1500) ** 2))

    speedup = (ins_us / merge_us) if merge_us > 0 else 1.0

    return {
        "dataset_size": sample_len,
        "field": field,
        "descending": descending,
        "merge_sort": {
            "name": "Merge Sort",
            "time_us": round(merge_us, 2),
            "time_ms": round(merge_us / 1000.0, 3),
            "comparisons": merge_cmp,
            "time_complexity": "O(N log N)",
            "space_complexity": "O(N)",
            "stability": "Stable"
        },
        "insertion_sort": {
            "name": "Insertion Sort",
            "time_us": round(ins_us, 2),
            "time_ms": round(ins_us / 1000.0, 3),
            "comparisons": ins_cmp,
            "time_complexity": "O(N^2) avg/worst, O(N) best",
            "space_complexity": "O(1)",
            "stability": "Stable",
            "extrapolated": capped
        },
        "speedup_factor": round(speedup, 2)
    }
