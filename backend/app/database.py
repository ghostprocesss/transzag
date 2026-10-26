"""
SQLite database module for BlockScope.
Persists:
- Saved investigations & session notes
- Exported investigation reports
- Audit trail logs of commands and pattern scans
"""

import sqlite3
import json
import time
from typing import List, Dict, Any, Optional

DB_PATH = "blockscope_investigations.db"

def init_db(db_path: str = DB_PATH) -> None:
    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        
        # 1. Investigations / Case notes
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS investigations (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                target_wallet TEXT,
                notes TEXT,
                findings_json TEXT,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )
        """)

        # 2. Saved Reports
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS saved_reports (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                report_type TEXT NOT NULL,
                content_markdown TEXT NOT NULL,
                metadata_json TEXT,
                created_at INTEGER NOT NULL
            )
        """)

        # 3. System Audit Log
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                action TEXT NOT NULL,
                details TEXT,
                timestamp INTEGER NOT NULL
            )
        """)
        conn.commit()

def log_audit(action: str, details: str = "", db_path: str = DB_PATH) -> None:
    try:
        with sqlite3.connect(db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO audit_logs (action, details, timestamp) VALUES (?, ?, ?)",
                (action, details, int(time.time()))
            )
            conn.commit()
    except Exception:
        pass

def save_investigation_report(
    report_id: str,
    title: str,
    report_type: str,
    content_markdown: str,
    metadata: Dict[str, Any],
    db_path: str = DB_PATH
) -> Dict[str, Any]:
    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        now = int(time.time())
        cursor.execute("""
            INSERT OR REPLACE INTO saved_reports (id, title, report_type, content_markdown, metadata_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (report_id, title, report_type, content_markdown, json.dumps(metadata), now))
        conn.commit()
    return {"id": report_id, "title": title, "created_at": now}

def list_saved_reports(db_path: str = DB_PATH) -> List[Dict[str, Any]]:
    with sqlite3.connect(db_path) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT id, title, report_type, created_at, metadata_json FROM saved_reports ORDER BY created_at DESC")
        rows = cursor.fetchall()
        return [
            {
                "id": r["id"],
                "title": r["title"],
                "report_type": r["report_type"],
                "created_at": r["created_at"],
                "metadata": json.loads(r["metadata_json"]) if r["metadata_json"] else {}
            }
            for r in rows
        ]

def get_saved_report(report_id: str, db_path: str = DB_PATH) -> Optional[Dict[str, Any]]:
    with sqlite3.connect(db_path) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM saved_reports WHERE id = ?", (report_id,))
        r = cursor.fetchone()
        if not r:
            return None
        return {
            "id": r["id"],
            "title": r["title"],
            "report_type": r["report_type"],
            "content_markdown": r["content_markdown"],
            "created_at": r["created_at"],
            "metadata": json.loads(r["metadata_json"]) if r["metadata_json"] else {}
        }
