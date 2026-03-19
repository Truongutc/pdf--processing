"""
AI Classifier sử dụng Google Gemini API.
Phân loại tài liệu và trích xuất dữ liệu cấu trúc từ PDF text.
"""

import json
import os
import re
from google import genai
from dotenv import load_dotenv

load_dotenv()

# Khởi tạo Gemini client
client = None


def get_client():
    """Lazy init Gemini client."""
    global client
    if client is None:
        api_key = os.getenv("GEMINI_API_KEY", "")
        if not api_key or api_key == "YOUR_API_KEY":
            return None
        client = genai.Client(api_key=api_key)
    return client


CLASSIFICATION_PROMPT = """Bạn là AI chuyên phân tích tài liệu PDF tiếng Việt. Hãy phân tích nội dung văn bản sau và trả về JSON theo format bên dưới.

## Phân loại tài liệu
Phân loại vào 1 trong các loại:
- "quotation" (Báo giá): tài liệu báo giá sản phẩm/dịch vụ
- "price_list" (Bảng giá): danh sách giá sản phẩm
- "contract" (Hợp đồng): hợp đồng, thỏa thuận  
- "invoice" (Hóa đơn): hóa đơn thanh toán, phiếu thu
- "report" (Báo cáo): báo cáo, biên bản
- "letter" (Công văn): công văn, thông báo
- "other" (Khác): các loại khác

## Trích xuất thông tin
Trích xuất các thông tin quan trọng từ văn bản.

## Output Format (JSON)
```json
{
  "doc_type": "quotation|price_list|contract|invoice|report|letter|other",
  "doc_type_vi": "Tên loại tài liệu bằng tiếng Việt",
  "title": "Tiêu đề tài liệu (nếu có)",
  "company": "Tên công ty/tổ chức phát hành (nếu có)",
  "recipient": "Tên công ty/người nhận (nếu có)",
  "doc_date": "Ngày tháng trên tài liệu (format: YYYY-MM-DD nếu có)",
  "total_amount": "Tổng số tiền (nếu có, giữ nguyên đơn vị VND/USD...)",
  "summary": "Tóm tắt ngắn gọn nội dung tài liệu (2-3 câu tiếng Việt)",
  "items": [
    {
      "name": "Tên sản phẩm/hạng mục",
      "quantity": "Số lượng",
      "unit": "Đơn vị",
      "unit_price": "Đơn giá",
      "amount": "Thành tiền"
    }
  ],
  "key_terms": ["Từ khóa quan trọng 1", "Từ khóa 2", "..."],
  "confidence": 0.95
}
```

Lưu ý:
- Nếu không tìm thấy thông tin nào, để giá trị null
- items chỉ trả về khi tài liệu có danh sách sản phẩm/dịch vụ
- confidence là mức độ tự tin phân loại (0.0 - 1.0)
- CHỈ trả về JSON, không giải thích thêm

## Nội dung văn bản cần phân tích:
{text}
"""


def classify_with_gemini(text, max_text_length=15000):
    """
    Phân loại và trích xuất dữ liệu bằng Gemini API.
    Returns: dict kết quả phân tích hoặc None nếu lỗi.
    """
    gemini_client = get_client()
    if not gemini_client:
        return None

    # Cắt text nếu quá dài
    truncated_text = text[:max_text_length] if len(text) > max_text_length else text

    prompt = CLASSIFICATION_PROMPT.replace("{text}", truncated_text)

    try:
        response = gemini_client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt
        )

        response_text = response.text.strip()

        # Loại bỏ markdown code block nếu có
        if response_text.startswith("```"):
            response_text = re.sub(r"^```(?:json)?\s*\n?", "", response_text)
            response_text = re.sub(r"\n?```\s*$", "", response_text)

        result = json.loads(response_text)
        return result

    except json.JSONDecodeError as e:
        print(f"Lỗi parse JSON từ Gemini: {e}")
        print(f"Response: {response_text[:500]}")
        return None
    except Exception as e:
        print(f"Lỗi Gemini API: {e}")
        return None


def classify_fallback(text):
    """
    Phân loại fallback bằng keyword khi Gemini API không khả dụng.
    Returns: dict với doc_type và summary cơ bản.
    """
    text_lower = text.lower()

    # Keyword patterns cho từng loại
    patterns = {
        "quotation": [
            "báo giá", "bao gia", "quotation", "quote",
            "đề nghị báo giá", "chào giá"
        ],
        "price_list": [
            "bảng giá", "bang gia", "price list", "danh mục giá",
            "giá bán lẻ", "giá bán sỉ"
        ],
        "contract": [
            "hợp đồng", "hop dong", "contract", "thỏa thuận",
            "cam kết", "điều khoản", "bên a", "bên b"
        ],
        "invoice": [
            "hóa đơn", "hoa don", "invoice", "phiếu thu",
            "biên lai", "thanh toán", "payment"
        ],
        "report": [
            "báo cáo", "bao cao", "report", "biên bản",
            "kết quả", "thống kê"
        ],
        "letter": [
            "công văn", "cong van", "thông báo", "kính gửi",
            "v/v:", "trân trọng"
        ]
    }

    type_vi = {
        "quotation": "Báo giá",
        "price_list": "Bảng giá",
        "contract": "Hợp đồng",
        "invoice": "Hóa đơn",
        "report": "Báo cáo",
        "letter": "Công văn",
        "other": "Văn bản khác"
    }

    scores = {}
    for doc_type, keywords in patterns.items():
        score = sum(1 for kw in keywords if kw in text_lower)
        if score > 0:
            scores[doc_type] = score

    if scores:
        best_type = max(scores, key=scores.get)
    else:
        best_type = "other"

    # Tạo summary cơ bản
    first_lines = text[:500].strip().split("\n")
    summary = " ".join(line.strip() for line in first_lines[:3] if line.strip())
    if len(summary) > 200:
        summary = summary[:200] + "..."

    return {
        "doc_type": best_type,
        "doc_type_vi": type_vi.get(best_type, "Văn bản khác"),
        "title": None,
        "company": None,
        "recipient": None,
        "doc_date": None,
        "total_amount": None,
        "summary": summary,
        "items": [],
        "key_terms": [],
        "confidence": 0.3
    }


def classify_document(text):
    """
    Phân loại tài liệu. Thử Gemini trước, fallback nếu lỗi.
    Returns: dict kết quả phân tích.
    """
    # Thử Gemini trước
    result = classify_with_gemini(text)

    if result:
        result["_method"] = "gemini"
        return result

    # Fallback sang keyword-based
    result = classify_fallback(text)
    result["_method"] = "fallback"
    return result
