"""
Flask Backend API cho PDF Processing Agent.
"""

import os
import json
from flask import Flask, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename
from dotenv import load_dotenv

from database import init_db, insert_document, insert_table, search_documents, get_all_documents, get_document, delete_document, get_stats
from pdf_processor import process_pdf
from classifier import classify_document

load_dotenv()

app = Flask(__name__)

# Config
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024  # 50MB max

ALLOWED_EXTENSIONS = {"pdf"}


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route("/api/upload", methods=["POST"])
def upload_pdf():
    """Upload và xử lý file PDF."""
    if "file" not in request.files:
        return jsonify({"error": "Không có file trong request"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "Chưa chọn file"}), 400

    if not allowed_file(file.filename):
        return jsonify({"error": "Chỉ chấp nhận file PDF"}), 400

    filename = secure_filename(file.filename)
    # Giữ tên tiếng Việt nếu secure_filename xóa hết
    if not filename or filename == ".pdf":
        filename = file.filename.replace("/", "_").replace("\\", "_")

    filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)

    # Tránh trùng tên
    base, ext = os.path.splitext(filename)
    counter = 1
    while os.path.exists(filepath):
        filename = f"{base}_{counter}{ext}"
        filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)
        counter += 1

    file.save(filepath)

    try:
        # 1. Trích xuất PDF
        pdf_data = process_pdf(filepath)

        # 2. Phân loại bằng Gemini AI
        classification = classify_document(pdf_data["text"]["full_text"])

        # 3. Lưu vào database
        doc_data = {
            "filename": filename,
            "filepath": filepath,
            "doc_type": classification.get("doc_type", "other"),
            "title": classification.get("title"),
            "company": classification.get("company"),
            "total_amount": classification.get("total_amount"),
            "doc_date": classification.get("doc_date"),
            "summary": classification.get("summary"),
            "items": classification.get("items", []),
            "page_count": pdf_data["metadata"]["page_count"],
            "raw_text": pdf_data["text"]["full_text"],
            "gemini_response": json.dumps(classification, ensure_ascii=False)
        }

        doc_id = insert_document(doc_data)

        # 4. Lưu dữ liệu bảng
        for table in pdf_data["tables"]:
            insert_table(
                document_id=doc_id,
                page_number=table["page"],
                table_index=table["table_index"],
                table_data=table["rows"],
                headers=table["headers"]
            )

        return jsonify({
            "success": True,
            "document_id": doc_id,
            "filename": filename,
            "classification": classification,
            "page_count": pdf_data["metadata"]["page_count"],
            "tables_found": len(pdf_data["tables"]),
            "text_length": len(pdf_data["text"]["full_text"])
        })

    except Exception as e:
        # Xóa file nếu xử lý lỗi
        if os.path.exists(filepath):
            os.remove(filepath)
        return jsonify({"error": f"Lỗi xử lý PDF: {str(e)}"}), 500


@app.route("/api/search", methods=["GET"])
def search():
    """Tìm kiếm tài liệu."""
    query = request.args.get("q", "").strip()
    doc_type = request.args.get("type", "all")

    if not query:
        return jsonify({"results": [], "query": ""})

    try:
        results = search_documents(query, doc_type)
        # Loại bỏ raw_text khỏi kết quả tìm kiếm (quá nặng)
        for r in results:
            r.pop("raw_text", None)
            r.pop("gemini_response", None)
        return jsonify({"results": results, "query": query})
    except Exception as e:
        return jsonify({"error": str(e), "results": []}), 500


@app.route("/api/documents", methods=["GET"])
def list_documents():
    """Lấy danh sách tài liệu."""
    doc_type = request.args.get("type", "all")
    docs = get_all_documents(doc_type)
    for d in docs:
        d.pop("raw_text", None)
        d.pop("gemini_response", None)
    return jsonify({"documents": docs})


@app.route("/api/documents/<int:doc_id>", methods=["GET"])
def document_detail(doc_id):
    """Lấy chi tiết tài liệu."""
    doc = get_document(doc_id)
    if not doc:
        return jsonify({"error": "Không tìm thấy tài liệu"}), 404

    # Parse items_json và gemini_response
    if doc.get("items_json"):
        try:
            doc["items"] = json.loads(doc["items_json"])
        except:
            doc["items"] = []
    else:
        doc["items"] = []

    if doc.get("gemini_response"):
        try:
            doc["gemini_data"] = json.loads(doc["gemini_response"])
        except:
            doc["gemini_data"] = None

    # Parse table data
    for table in doc.get("tables", []):
        if table.get("table_json"):
            try:
                table["rows"] = json.loads(table["table_json"])
            except:
                table["rows"] = []
        if table.get("headers"):
            try:
                table["headers"] = json.loads(table["headers"])
            except:
                pass

    return jsonify({"document": doc})


@app.route("/api/documents/<int:doc_id>", methods=["DELETE"])
def remove_document(doc_id):
    """Xóa tài liệu."""
    doc = get_document(doc_id)
    if not doc:
        return jsonify({"error": "Không tìm thấy tài liệu"}), 404

    # Xóa file vật lý
    if doc.get("filepath") and os.path.exists(doc["filepath"]):
        os.remove(doc["filepath"])

    delete_document(doc_id)
    return jsonify({"success": True})


@app.route("/api/stats", methods=["GET"])
def statistics():
    """Thống kê tổng quan."""
    return jsonify(get_stats())


@app.route("/api/documents/<int:doc_id>/download", methods=["GET"])
def download_pdf(doc_id):
    """Download file PDF gốc."""
    doc = get_document(doc_id)
    if not doc:
        return jsonify({"error": "Không tìm thấy tài liệu"}), 404

    filepath = doc.get("filepath", "")
    if not os.path.exists(filepath):
        return jsonify({"error": "File không tồn tại"}), 404

    directory = os.path.dirname(filepath)
    filename = os.path.basename(filepath)
    return send_from_directory(directory, filename, as_attachment=True)


if __name__ == "__main__":
    init_db()
    print("=" * 50)
    print("PDF Processing Agent - Backend API")
    print("Server: http://localhost:5000")
    print("=" * 50)
    app.run(debug=True, port=5000)
