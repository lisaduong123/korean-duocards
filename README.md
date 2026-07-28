# 한국어 마스터 — Korean DuoCards

Ứng dụng học từ vựng tiếng Hàn bằng flashcard, chạy hoàn toàn trên trình duyệt (không cần server).

🔗 **Demo trực tiếp:** https://lisaduong123.github.io/korean-duocards/

## Tính năng

- **Flashcard + Spaced Repetition (SRS):** lật thẻ Hàn ⇄ Việt, đánh giá "Đã nhớ / Chưa nhớ", tự lên lịch ôn tập theo mức độ nhớ.
- **Điền từ (Cloze test):** chọn từ đúng để điền vào chỗ trống trong câu ví dụ.
- **Tra cứu từ vựng:** tìm kiếm nhanh theo tiếng Hàn / romaja / tiếng Việt.
- **AI chấm điểm bản dịch:** dán Gemini API Key của riêng bạn để AI chấm điểm bản dịch Hàn → Việt (key chỉ lưu trong `localStorage` của trình duyệt, không gửi đi đâu khác).
- **Đăng nhập Google & đồng bộ tiến độ chung:** đăng nhập bằng Google để tự động lưu tiến độ học (đã nhớ/chưa nhớ) lên Google Sheet dùng chung, thông qua Google Apps Script Web App (`gas/Code.gs`) có xác thực danh tính qua Google ID token.

## Cấu trúc project

```
index.html   Giao diện chính (3 tab: Flashcard, Điền từ, Tra cứu & AI)
style.css    Toàn bộ style
app.js       Logic app: SRS, cloze test, tra cứu, gọi Gemini API, đăng nhập Google & đồng bộ GAS
gas/Code.gs  Google Apps Script: API đọc/ghi Google Sheet + xác thực Google ID token
```

## Chạy thử ở local

Mở trực tiếp `index.html` bằng trình duyệt, hoặc dùng 1 static server bất kỳ (vd VS Code Live Server) vì tính năng Đăng nhập Google yêu cầu origin phải nằm trong danh sách "Authorized JavaScript origins" đã cấu hình trên Google Cloud Console.

## Dữ liệu lưu ở đâu

- Tiến độ SRS cá nhân: `localStorage` trên trình duyệt của mỗi người.
- Gemini API Key: `localStorage`, riêng theo từng người dùng.
- Tiến độ đồng bộ chung (khi đã đăng nhập Google): Google Sheet, sheet `Tiến Độ Học`.
