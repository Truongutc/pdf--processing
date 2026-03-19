"""
PDF Processing Engine.
Trích xuất text, bảng, và metadata từ file PDF.
"""

import fitz  # PyMuPDF
import pdfplumber
import os


def extract_text(pdf_path):
    """
    Trích xuất toàn bộ text từ PDF bằng PyMuPDF.
    Returns: dict với text theo từng trang và full text.
    """
    doc = fitz.open(pdf_path)
    pages = []
    full_text = []

    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text("text")
        pages.append({
            "page": page_num + 1,
            "text": text.strip()
        })
        full_text.append(text.strip())

    doc.close()

    return {
        "pages": pages,
        "full_text": "\n\n".join(full_text),
        "page_count": len(pages)
    }


def extract_tables(pdf_path):
    """
    Trích xuất bảng từ PDF bằng pdfplumber.
    Returns: list of tables, mỗi table là dict với page, index, headers, rows.
    """
    tables_result = []

    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page_num, page in enumerate(pdf.pages):
                tables = page.extract_tables()
                if tables:
                    for table_idx, table in enumerate(tables):
                        if not table or len(table) < 1:
                            continue

                        # Dòng đầu làm header (nếu có)
                        headers = table[0] if table[0] else []
                        # Làm sạch headers
                        headers = [str(h).strip() if h else f"Col_{i}" for i, h in enumerate(headers)]

                        rows = []
                        for row in table[1:]:
                            cleaned_row = [str(cell).strip() if cell else "" for cell in row]
                            # Bỏ qua dòng trống hoàn toàn
                            if any(cell for cell in cleaned_row):
                                rows.append(cleaned_row)

                        if rows:
                            tables_result.append({
                                "page": page_num + 1,
                                "table_index": table_idx,
                                "headers": headers,
                                "rows": rows,
                                "row_count": len(rows)
                            })
    except Exception as e:
        print(f"Lỗi trích xuất bảng: {e}")

    return tables_result


def extract_metadata(pdf_path):
    """
    Trích xuất metadata từ PDF.
    Returns: dict metadata.
    """
    doc = fitz.open(pdf_path)
    meta = doc.metadata

    result = {
        "title": meta.get("title", ""),
        "author": meta.get("author", ""),
        "subject": meta.get("subject", ""),
        "creator": meta.get("creator", ""),
        "producer": meta.get("producer", ""),
        "creation_date": meta.get("creationDate", ""),
        "mod_date": meta.get("modDate", ""),
        "page_count": len(doc),
        "file_size": os.path.getsize(pdf_path)
    }

    doc.close()
    return result


def process_pdf(pdf_path):
    """
    Pipeline tổng hợp: trích xuất text + tables + metadata.
    Returns: dict với tất cả dữ liệu đã trích xuất.
    """
    text_data = extract_text(pdf_path)
    tables_data = extract_tables(pdf_path)
    metadata = extract_metadata(pdf_path)

    return {
        "text": text_data,
        "tables": tables_data,
        "metadata": metadata,
        "filename": os.path.basename(pdf_path)
    }
