# 한국어 마스터 — Korean DuoCards

Ứng dụng học từ vựng tiếng Hàn bằng flashcard, chạy hoàn toàn trên trình duyệt (không cần server riêng).

🔗 **Demo trực tiếp:** https://lisaduong123.github.io/korean-duocards/

---

## 1. Tính năng

- **Flashcard + Spaced Repetition (SRS):** lật thẻ Hàn ⇄ Việt, đánh giá "Đã nhớ / Chưa nhớ", tự lên lịch ôn tập theo mức độ nhớ.
- **Điền từ (Cloze test):** chọn từ đúng để điền vào chỗ trống trong câu ví dụ.
- **Tra cứu từ vựng:** tìm kiếm nhanh theo tiếng Hàn / romaja / tiếng Việt.
- **AI chấm điểm bản dịch:** dán Gemini API Key của riêng bạn để AI chấm điểm bản dịch Hàn → Việt. Key chỉ lưu trong `localStorage` của trình duyệt người dùng đó, ai dùng key của người ấy — không lộ, không dùng chung.
- **Đăng nhập Google & đồng bộ tiến độ chung:** đăng nhập bằng Google để tự động lưu tiến độ học (đã nhớ/chưa nhớ) lên 1 Google Sheet dùng chung cho mọi người, thông qua Google Apps Script Web App (`gas/Code.gs`) có xác thực danh tính qua Google ID token.

## 2. Cấu trúc project

```
index.html   Giao diện chính (3 tab: Flashcard, Điền từ, Tra cứu & AI)
style.css    Toàn bộ style
app.js       Logic app: SRS, cloze test, tra cứu, gọi Gemini API, đăng nhập Google & đồng bộ GAS
gas/Code.gs  Google Apps Script: API đọc/ghi Google Sheet + xác thực Google ID token
```

---

## 3. Lịch sử triển khai — guideline từ đầu đến hiện tại

Phần này ghi lại toàn bộ các bước đã làm để đưa app từ 3 file tĩnh trên máy thành 1 trang web public có đăng nhập & đồng bộ dữ liệu chung. Dùng để tra cứu lại khi cần làm y hệt cho project khác, hoặc khi cần sửa/redeploy sau này.

### 3.1. Vấn đề ban đầu: chia sẻ file rời rạc bị lỗi hiển thị

`index.html` gọi tới 2 file riêng qua đường dẫn tương đối:

```html
<link rel="stylesheet" href="style.css">
<script src="app.js"></script>
```

Nếu chỉ gửi mỗi `index.html` (qua Zalo/email...) mà không kèm `style.css` và `app.js` cùng thư mục, người nhận mở lên sẽ thấy giao diện vỡ hoàn toàn và không bấm được gì. → Giải pháp đúng là **host cả 3 file cùng nhau** bằng GitHub Pages (mục 3.2–3.3), lúc đó chỉ cần gửi 1 link.

### 3.2. Đưa code lên GitHub

```bash
git init
git add index.html style.css app.js gas
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<username>/<repo>.git
git push -u origin main
```

Repo hiện tại: `https://github.com/lisaduong123/korean-duocards`

### 3.3. Bật GitHub Pages (để có link public dùng chung)

1. Vào `https://github.com/<username>/<repo>/settings` → cuối trang, **Danger Zone** → **Change visibility** → **Make public** (GitHub Pages miễn phí chỉ chạy được với repo public).
2. Vẫn trong Settings → mục **Pages** → **Build and deployment** → **Source: Deploy from a branch** → **Branch: `main` / `(root)`** → **Save**.
3. Đợi ~1 phút, link chạy tại: `https://<username>.github.io/<repo>/`

### 3.4. Thêm đăng nhập Google để đồng bộ tiến độ chung

**Vì sao không hardcode thẳng bí mật vào code:** repo là public nên bất kỳ ai cũng đọc được `app.js`/`index.html` trên GitHub. Vì vậy:

- Gemini API Key: **giữ nguyên là ô nhập UI**, mỗi người dùng tự dán key của họ, key tự trả phí cho người đó — không có gì để lộ.
- Google Apps Script URL (endpoint ghi dữ liệu chung): **được phép hardcode** vì nó không phải bí mật tốn phí, chỉ là 1 địa chỉ nhận dữ liệu. Nhưng vì ai cũng gọi được endpoint này, cần một lớp xác thực để biết **dữ liệu gửi lên là của ai** → dùng **Google Sign-In**.

**Cách hoạt động:**
1. Người dùng bấm nút "Sign in with Google" trên tab "Tra cứu & AI".
2. Google trả về 1 `idToken` (JWT) cho trình duyệt.
3. Mỗi khi đồng bộ tiến độ (bấm Đã nhớ/Chưa nhớ), `app.js` gửi kèm `idToken` này lên Google Apps Script.
4. `Code.gs` gọi endpoint chính thức của Google (`https://oauth2.googleapis.com/tokeninfo`) để **xác thực chữ ký + hạn dùng** của token, lấy ra email/tên đã được Google xác minh — không thể giả mạo.
5. Ghi 1 dòng vào sheet `Tiến Độ Học` kèm email/tên đó, tách biệt hoàn toàn với các sheet cũ (`Nhập Data`, `Raw Data`, `Nhập Data (Ngôn ngữ user)`, `Cặp từ`) — logic cũ trong `Code.gs` không bị đụng tới (chỉ thêm nhánh rẽ mới trong `doPost`, dựa trên field `mode: "progress"` mà payload cũ không có).

#### Bước A — Tạo Google OAuth Client ID

1. Vào `https://console.cloud.google.com/apis/credentials` (tạo project mới nếu chưa có).
2. **Create Credentials** → **OAuth client ID**. Nếu chưa có "OAuth consent screen" thì tạo trước: chọn **External**, điền tên app + email, lưu.
3. Application type: **Web application**.
4. **Authorized JavaScript origins** → thêm domain GitHub Pages của bạn, ví dụ `https://lisaduong123.github.io` (chỉ domain, không path, không dấu `/` cuối).
5. **Authorized redirect URIs**: để trống — flow này dùng Google Identity Services trả `idToken` trực tiếp qua callback JS, không redirect.
6. **Create** → copy **Client ID** dạng `xxxxx.apps.googleusercontent.com`.

#### Bước B — Cập nhật & redeploy Google Apps Script

1. Mở project Apps Script chứa `Code.gs`, dán đè bằng nội dung mới nhất trong `gas/Code.gs` của repo này.
2. Điền `GOOGLE_CLIENT_ID` (hằng số ở đầu file) đúng bằng Client ID ở Bước A.
3. **Deploy** → **Manage deployments** → chọn deployment hiện có → ✏️ **Edit** → **Version: New version** → **Deploy** (giữ nguyên URL `.../exec` cũ, không tạo deployment mới).

#### Bước C — Điền cấu hình vào code phía client

Điền đúng 2 giá trị vào các hằng số tương ứng:

| Giá trị | Nơi điền |
|---|---|
| Google Client ID | `index.html` → `data-client_id="..."` trong div `#g_id_onload` |
| Google Client ID (trùng) | `gas/Code.gs` → hằng số `GOOGLE_CLIENT_ID` |
| GAS Web App URL | `app.js` → hằng số `GAS_URL` |

Sau đó commit & push lại lên GitHub, GitHub Pages sẽ tự cập nhật.

---

## 4. Chạy thử / kiểm tra local

Mở trực tiếp `index.html` bằng trình duyệt, hoặc dùng 1 static server bất kỳ (vd VS Code Live Server). Lưu ý: tính năng Đăng nhập Google chỉ hoạt động nếu origin đang mở nằm trong danh sách "Authorized JavaScript origins" đã cấu hình ở Bước A.3 — muốn test local thì thêm cả origin local (vd `http://localhost:5500`) vào đó.

## 5. Cách test end-to-end tính năng đồng bộ

1. Mở link demo → tab **Tra cứu & AI** → bấm **Sign in with Google**, đăng nhập thành công sẽ thấy dòng "✓ Đã đăng nhập: ...".
2. Qua tab **Flashcard**, bấm "Đã nhớ" / "Chưa nhớ" vài từ.
3. Mở Google Sheet gốc → kiểm tra sheet **`Tiến Độ Học`** có dòng mới ghi đúng email/tên + vocab ID + hành động.
4. Các sheet cũ (`Nhập Data`, `Raw Data`, `Nhập Data (Ngôn ngữ user)`, `Cặp từ`) phải giữ nguyên, không có gì thay đổi.

## 6. Dữ liệu lưu ở đâu

- Tiến độ SRS cá nhân (không cần đăng nhập): `localStorage` trên trình duyệt của mỗi người.
- Gemini API Key: `localStorage`, riêng theo từng người dùng, không gửi lên đâu ngoài Google Gemini API.
- Tiến độ đồng bộ chung (chỉ khi đã đăng nhập Google): Google Sheet, sheet `Tiến Độ Học`.

## 7. Lưu ý bảo mật

- Repo này là **public** — không bao giờ hardcode Gemini API Key hoặc bất kỳ secret nào tốn phí vào code, vì ai cũng đọc được trên GitHub.
- GAS Web App URL được hardcode có chủ đích (không phải secret tốn phí), nhưng vì endpoint này công khai, mọi request ghi dữ liệu **bắt buộc phải có `idToken` hợp lệ** được `Code.gs` xác thực qua Google trước khi ghi Sheet — tránh bị spam dữ liệu rác vô danh.

## 8. Model Gemini đang dùng & lỗi 404 model not found

`app.js` gọi Gemini API bằng model **`gemini-flash-latest`** (trong hàm `callGeminiGrading`) thay vì ghi cứng 1 phiên bản cụ thể (vd `gemini-1.5-flash`, `gemini-2.5-flash`). Lý do: Google thường xuyên ngừng hỗ trợ (deprecate) các phiên bản model cụ thể, khiến API trả lỗi `404 NOT_FOUND`. Dùng alias `-latest` giúp code luôn tự trỏ vào bản flash mới nhất Google khuyến nghị, không cần sửa code mỗi lần Google đổi model mặc định.

Nếu sau này vẫn gặp lỗi `404` với thông báo kiểu "model ... is not found" hoặc "no longer available":
1. Kiểm tra chắc chắn đang test qua link GitHub Pages thật (không phải mở file `index.html` trực tiếp) và đã hard-refresh (Ctrl+Shift+R) để loại trừ cache trình duyệt.
2. Nếu vẫn lỗi, có thể alias `-latest` cũng đã bị đổi tên/ngừng hỗ trợ — vào `https://aistudio.google.com`, chọn "Get code" ở 1 model bất kỳ để xem tên model hiện tại Google đang đề xuất cho tài khoản của bạn, rồi cập nhật lại trong `app.js`.
