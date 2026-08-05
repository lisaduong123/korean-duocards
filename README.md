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
- **Thư viện (Library) & Deck cá nhân:** tab "Thư viện" cho xem tất cả deck — **Basic Deck** (20 từ có sẵn, chỉ xem/học, không sửa) và **deck cá nhân tự tạo** (bấm "+" để tạo deck mới, tự thêm/sửa/xoá flashcard). Deck đang chọn sẽ là deck được dùng ở tab Flashcard, Điền từ và Tra cứu.

## 2. Cấu trúc project

```
index.html   Giao diện chính (4 tab: Flashcard, Điền từ, Tra cứu & AI, Thư viện)
style.css    Toàn bộ style
app.js       Logic app: SRS, deck cá nhân, cloze test, tra cứu, gọi Gemini API, đăng nhập Google & đồng bộ GAS
gas/Code.gs  Google Apps Script: API đọc/ghi Google Sheet + xác thực Google ID token
```

### 2.1. Deck cá nhân lưu ở đâu?

Để tránh `app.js` phình to theo thời gian, deck cá nhân **không** được thêm vào mảng `VOCAB_DATA` trong code — mà lưu trong `localStorage` của trình duyệt (`koreanApp_personalDecks_v1`), tương tự cách lưu tiến độ SRS. Basic Deck (20 từ, id 1–20) vẫn nằm cứng trong `app.js` vì đó là bộ từ mẫu dùng chung, không cần sửa/đồng bộ.

Mỗi thẻ cá nhân được cấp 1 ID toàn cục duy nhất bắt đầu từ **21** trở đi (đếm tăng dần, lưu ở `koreanApp_nextVocabId_v1`), để không trùng với ID của Basic Deck khi lưu tiến độ SRS.

**Đánh đổi đã chọn (so với lưu trên Google Sheet):** deck cá nhân chỉ có trên trình duyệt/máy hiện tại, không tự đồng bộ đa thiết bị, và **không** được đồng bộ lên sheet "Tiến Độ Học" dùng chung — vì ID/nội dung deck cá nhân là riêng theo từng người, đưa vào 1 sheet chung sẽ gây nhầm lẫn (2 người khác nhau có thể có thẻ cùng ID nhưng nội dung khác nhau). Nếu sau này cần đồng bộ đa thiết bị, có thể thêm Google Sheets làm lớp đồng bộ tuỳ chọn, tái dùng hạ tầng đăng nhập Google đã có.

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

### 6.1. Ý nghĩa các cột trong sheet `Tiến Độ Học`

| Cột | Ý nghĩa |
|---|---|
| Thời gian | Thời điểm server ghi nhận dòng dữ liệu (giờ server Google, không phải giờ trình duyệt người dùng). |
| Email / Tên | Danh tính đã được xác thực qua Google ID token — không thể giả mạo, do chính `Code.gs` kiểm tra với Google trước khi ghi. |
| **Vocab ID** | ID của từ vựng, khớp với trường `id` trong mảng `VOCAB_DATA` ở đầu file `app.js` (hiện đánh số 1–20, mỗi số ứng với đúng 1 từ, ví dụ `id: 1` là "안녕하세요"). Muốn tra từ nào ứng với ID nào thì mở `app.js`, tìm `id: <số đó>`. |
| Hành động | Một trong 3 giá trị: `remember` (bấm "Đã nhớ" ở tab Flashcard), `forget` (bấm "Chưa nhớ"), hoặc `ai_grading` (dùng tính năng chấm điểm AI ở tab Tra cứu & AI). |
| **Giá trị** | Ý nghĩa phụ thuộc vào cột "Hành động": với `remember`/`forget` là **cấp độ SRS** sau khi cập nhật (số nguyên 0–6, càng cao nghĩa là càng nhớ chắc — xem mảng `SRS_INTERVALS_DAYS` trong `app.js` để biết mỗi cấp độ ứng với bao lâu mới ôn lại); với `ai_grading` là **điểm số AI chấm** cho bản dịch (thang 0–10). |

## 7. Lưu ý bảo mật

- Repo này là **public** — không bao giờ hardcode Gemini API Key hoặc bất kỳ secret nào tốn phí vào code, vì ai cũng đọc được trên GitHub.
- GAS Web App URL được hardcode có chủ đích (không phải secret tốn phí), nhưng vì endpoint này công khai, mọi request ghi dữ liệu **bắt buộc phải có `idToken` hợp lệ** được `Code.gs` xác thực qua Google trước khi ghi Sheet — tránh bị spam dữ liệu rác vô danh.

## 8. Model Gemini đang dùng & lỗi 404 model not found

`app.js` gọi Gemini API bằng model **`gemini-flash-latest`** (trong hàm `callGeminiGrading`) thay vì ghi cứng 1 phiên bản cụ thể (vd `gemini-1.5-flash`, `gemini-2.5-flash`). Lý do: Google thường xuyên ngừng hỗ trợ (deprecate) các phiên bản model cụ thể, khiến API trả lỗi `404 NOT_FOUND`. Dùng alias `-latest` giúp code luôn tự trỏ vào bản flash mới nhất Google khuyến nghị, không cần sửa code mỗi lần Google đổi model mặc định.

Nếu sau này vẫn gặp lỗi `404` với thông báo kiểu "model ... is not found" hoặc "no longer available":
1. Kiểm tra chắc chắn đang test qua link GitHub Pages thật (không phải mở file `index.html` trực tiếp) và đã hard-refresh (Ctrl+Shift+R) để loại trừ cache trình duyệt.
2. Nếu vẫn lỗi, có thể alias `-latest` cũng đã bị đổi tên/ngừng hỗ trợ — vào `https://aistudio.google.com`, chọn "Get code" ở 1 model bất kỳ để xem tên model hiện tại Google đang đề xuất cho tài khoản của bạn, rồi cập nhật lại trong `app.js`.

## 9. Debug Google Apps Script bằng `clasp` (khi đồng bộ tiến độ không hoạt động)

Nếu đăng nhập Google trong app thành công, request có gửi tới `script.google.com`, nhưng sheet `Tiến Độ Học` vẫn không có dữ liệu mới — đây là quy trình đã dùng để chẩn đoán và sửa tận gốc, giữ lại để lần sau không phải làm lại từ đầu.

**Công cụ:** [`clasp`](https://github.com/google/clasp) — CLI chính thức của Google để quản lý Apps Script từ terminal, thay vì copy-paste tay qua giao diện web (vốn dễ gây ra tình trạng "tưởng đã cập nhật nhưng thực ra chưa").

```bash
npm install -g @google/clasp
clasp login          # đăng nhập Google, mở trình duyệt để xác nhận
clasp clone <scriptId>   # scriptId lấy ở Apps Script editor > ⚙️ Project Settings
clasp push --force       # đẩy code local lên Apps Script (ghi đè HEAD)
clasp deployments        # liệt kê các deployment và version chúng đang trỏ tới
clasp deploy --deploymentId <id> --description "..."   # tạo version mới TỪ HEAD và gắn vào đúng deployment đang dùng
```

Lưu ý: cần bật **Google Apps Script API** tại `https://script.google.com/home/usersettings` trước khi `clasp` hoạt động được (tài khoản Google báo lỗi `User has not enabled the Apps Script API` nếu chưa bật).

**2 nguyên nhân thực tế đã gặp, theo đúng thứ tự đã chẩn đoán:**

1. **Deployment bị ghim vào version cũ, không phải HEAD.** `clasp deployments` cho thấy deployment ứng với URL `.../exec` đang dùng bị gắn vào 1 "version" cụ thể (snapshot), không tự động cập nhật theo code mới nhất trong editor — dù bạn đã "dán đè" code mới và bấm "Deploy" trên giao diện web, deployment vẫn có thể không thực sự tạo version mới nếu thao tác trên UI không đúng. Cách sửa chắc chắn 100%: `clasp deploy --deploymentId <id đúng bằng URL đang dùng>` — lệnh này luôn tạo version mới từ HEAD hiện tại và gắn thẳng vào deployment đó.

2. **Thiếu quyền `script.external_request` cho `UrlFetchApp`.** Khi thêm đoạn code gọi ra ngoài (`UrlFetchApp.fetch` tới `oauth2.googleapis.com` để xác thực Google ID token), Apps Script cần được cấp quyền mới. Vì `appsscript.json` gốc không khai báo `oauthScopes` rõ ràng, và code được đẩy lên qua API (`clasp push`) thay vì lưu trực tiếp trên trình duyệt, màn hình xin quyền không tự bật lên — khiến `UrlFetchApp.fetch` luôn ném lỗi `You do not have permission to call UrlFetchApp.fetch`, bị code tự bắt lỗi (`catch`) và trả về `null` một cách im lặng (không có gì hiện ra ở Executions). Cách sửa: khai báo rõ `oauthScopes` trong `gas/appsscript.json` (đã làm, xem file này trong repo), push lại, rồi vào Apps Script editor chạy tay 1 hàm bất kỳ có gọi `UrlFetchApp` để màn hình "Authorization required" hiện ra và cấp quyền.

**Mẹo debug nhanh khi gặp lại tình trạng tương tự:** viết 1 hàm tạm kiểu `function testXyz() { ... }` gọi trực tiếp hàm nghi ngờ với dữ liệu thật, `clasp push`, rồi vào editor chọn đúng hàm đó ở dropdown và bấm Run — "Execution log" hiện ra ngay dưới sẽ show đầy đủ `console.log` và exception thật, đáng tin cậy hơn nhiều so với xem qua mục "Executions" của 1 lần gọi `doPost` từ xa.
