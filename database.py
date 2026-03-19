"""
Database layer cho PDF Processing Agent.
Sử dụng SQLite + FTS5 để lưu trữ và tìm kiếm full-text.
"""

import sqlite3
import os
import json
from datetime import datetime

DB_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
DB_PATH = os.path.join(DB_DIR, "pdf_agent.db")


def get_connection():
    """Tạo kết nối đến SQLite database."""
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    """Khởi tạo database schema với FTS5."""
    conn = get_connection()
    cursor = conn.cursor()

    # Bảng documents chính
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            filepath TEXT NOT NULL,
            doc_type TEXT DEFAULT 'other',
            title TEXT,
            company TEXT,
            total_amount TEXT,
            doc_date TEXT,
            summary TEXT,
            items_json TEXT,
            page_count INTEGER DEFAULT 0,
            raw_text TEXT,
            upload_date TEXT NOT NULL,
            gemini_response TEXT
        )
    """)

    # Bảng lưu dữ liệu bảng từ PDF
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tables_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            document_id INTEGER NOT NULL,
            page_number INTEGER,
            table_index INTEGER,
            table_json TEXT,
            headers TEXT,
            row_count INTEGER DEFAULT 0,
            FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
        )
    """)

    # FTS5 virtual table cho full-text search
    cursor.execute("""
        CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
            filename,
            doc_type,
            title,
            company,
            summary,
            raw_text,
            content='documents',
            content_rowid='id',
            tokenize='unicode61'
        )
    """)

    # Triggers để đồng bộ FTS với bảng documents
    cursor.execute("""
        CREATE TRIGGER IF NOT EXISTS documents_ai AFTER INSERT ON documents BEGIN
            INSERT INTO documents_fts(rowid, filename, doc_type, title, company, summary, raw_text)
            VALUES (new.id, new.filename, new.doc_type, new.title, new.company, new.summary, new.raw_text);
        END
    """)

    cursor.execute("""
        CREATE TRIGGER IF NOT EXISTS documents_ad AFTER DELETE ON documents BEGIN
            INSERT INTO documents_fts(documents_fts, rowid, filename, doc_type, title, company, summary, raw_text)
            VALUES ('delete', old.id, old.filename, old.doc_type, old.title, old.company, old.summary, old.raw_text);
        END
    """)

    cursor.execute("""
        CREATE TRIGGER IF NOT EXISTS documents_au AFTER UPDATE ON documents BEGIN
            INSERT INTO documents_fts(documents_fts, rowid, filename, doc_type, title, company, summary, raw_text)
            VALUES ('delete', old.id, old.filename, old.doc_type, old.title, old.company, old.summary, old.raw_text);
            INSERT INTO documents_fts(rowid, filename, doc_type, title, company, summary, raw_text)
            VALUES (new.id, new.filename, new.doc_type, new.title, new.company, new.summary, new.raw_text);
        END
    """)

    conn.commit()
    conn.close()


def insert_document(doc_data):
    """
    Chèn document mới vào database.
    doc_data: dict với các key: filename, filepath, doc_type, title, company,
              total_amount, doc_date, summary, items_json, page_count, raw_text, gemini_response
    Returns: document id
    """
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO documents (filename, filepath, doc_type, title, company,
                               total_amount, doc_date, summary, items_json,
                               page_count, raw_text, upload_date, gemini_response)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        doc_data.get("filename", ""),
        doc_data.get("filepath", ""),
        doc_data.get("doc_type", "other"),
        doc_data.get("title"),
        doc_data.get("company"),
        doc_data.get("total_amount"),
        doc_data.get("doc_date"),
        doc_data.get("summary"),
        json.dumps(doc_data.get("items", []), ensure_ascii=False) if doc_data.get("items") else None,
        doc_data.get("page_count", 0),
        doc_data.get("raw_text", ""),
        datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        doc_data.get("gemini_response")
    ))

    doc_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return doc_id


def insert_table(document_id, page_number, table_index, table_data, headers=None):
    """Chèn dữ liệu bảng vào database."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO tables_data (document_id, page_number, table_index, table_json, headers, row_count)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        document_id,
        page_number,
        table_index,
        json.dumps(table_data, ensure_ascii=False),
        json.dumps(headers, ensure_ascii=False) if headers else None,
        len(table_data) if table_data else 0
    ))

    conn.commit()
    conn.close()


def search_documents(query, doc_type=None, limit=50):
    """
    Tìm kiếm tài liệu bằng FTS5.
    Trả về danh sách documents với snippet highlight.
    """
    conn = get_connection()
    cursor = conn.cursor()

    # Escape query cho FTS5
    safe_query = query.replace('"', '""')

    if doc_type and doc_type != "all":
        cursor.execute("""
            SELECT d.*, 
                   snippet(documents_fts, 5, '<mark>', '</mark>', '...', 40) as snippet_text,
                   rank
            FROM documents_fts fts
            JOIN documents d ON d.id = fts.rowid
            WHERE documents_fts MATCH ? AND d.doc_type = ?
            ORDER BY rank
            LIMIT ?
        """, (f'"{safe_query}"', doc_type, limit))
    else:
        cursor.execute("""
            SELECT d.*, 
                   snippet(documents_fts, 5, '<mark>', '</mark>', '...', 40) as snippet_text,
                   rank
            FROM documents_fts fts
            JOIN documents d ON d.id = fts.rowid
            WHERE documents_fts MATCH ?
            ORDER BY rank
            LIMIT ?
        """, (f'"{safe_query}"', limit))

    results = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return results


def get_all_documents(doc_type=None, limit=100):
    """Lấy tất cả tài liệu, có thể filter theo loại."""
    conn = get_connection()
    cursor = conn.cursor()

    if doc_type and doc_type != "all":
        cursor.execute("""
            SELECT * FROM documents WHERE doc_type = ?
            ORDER BY upload_date DESC LIMIT ?
        """, (doc_type, limit))
    else:
        cursor.execute("""
            SELECT * FROM documents ORDER BY upload_date DESC LIMIT ?
        """, (limit,))

    results = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return results


def get_document(doc_id):
    """Lấy chi tiết 1 tài liệu kèm dữ liệu bảng."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM documents WHERE id = ?", (doc_id,))
    doc = cursor.fetchone()

    if not doc:
        conn.close()
        return None

    doc_dict = dict(doc)

    # Lấy tables
    cursor.execute("""
        SELECT * FROM tables_data WHERE document_id = ?
        ORDER BY page_number, table_index
    """, (doc_id,))
    doc_dict["tables"] = [dict(row) for row in cursor.fetchall()]

    conn.close()
    return doc_dict


def delete_document(doc_id):
    """Xóa tài liệu khỏi database."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM documents WHERE id = ?", (doc_id,))
    conn.commit()
    conn.close()


def get_stats():
    """Lấy thống kê tổng quan."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) as total FROM documents")
    total = cursor.fetchone()["total"]

    cursor.execute("""
        SELECT doc_type, COUNT(*) as count 
        FROM documents GROUP BY doc_type
    """)
    by_type = {row["doc_type"]: row["count"] for row in cursor.fetchall()}

    conn.close()
    return {"total": total, "by_type": by_type}
