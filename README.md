# 한국어 마스터 — Korean DuoCards

Ứng dụng học từ vựng tiếng Hàn bằng flashcard, chạy hoàn toàn trên trình duyệt (không cần server riêng).

🔗 **Demo trực tiếp:** https://lisaduong123.github.io/korean-duocards/

---

## 1. Tính năng

- **Flashcard + Spaced Repetition (SRS):** lật thẻ Hàn ⇄ Việt, đánh giá "Đã nhớ / Chưa nhớ", tự lên lịch ôn tập theo mức độ nhớ.
- **Điền từ (Cloze test):** chọn từ đúng để điền vào chỗ trống trong câu ví dụ.
- **Tra cứu từ vựng:** tìm kiếm nhanh theo tiếng Hàn / romaja / tiếng Việt.
- **AI chấm điểm bản dịch:** dán Gemini API Key của riêng bạn để AI chấm điểm bản dịch Hàn → Việt. Key chỉ lưu trong `localStorage` của trình duyệt người dùng đó, ai dùng key của người ấy — không lộ, không dùng chung.
- **Đăng nhập Google (Firebase Auth) & đồng bộ tiến độ chung:** đăng nhập bằng Google — phiên đăng nhập bền, tự làm mới ngầm, không mất khi refresh trang — để tự động lưu tiến độ học (đã nhớ/chưa nhớ) lên 1 Google Sheet dùng chung, thông qua Google Apps Script Web App (`gas/Code.gs`).
- **Thư viện (Library) & Deck cá nhân:** tab "Thư viện" **chỉ để quản lý deck** (tạo/xoá deck, thêm/sửa/xoá flashcard trong đó) — **Basic Deck** (20 từ có sẵn, chỉ xem, không sửa) và **deck cá nhân tự tạo**, lưu trên Google Sheet gắn theo tài khoản Google đã đăng nhập. **Chọn deck nào để học** lại làm ở dropdown ngay tại tab Flashcard (không làm ở Thư viện) — chọn xong, tab Điền từ và Tra cứu & AI sẽ hiện "📚 Đang học: <tên deck>" để biết đang học deck nào; đổi deck thì quay lại tab Flashcard chọn deck khác.
- **AI hỗ trợ tạo thẻ trong deck cá nhân:** gõ từ tiếng Hàn xong ngừng gõ ~1 giây, AI tự điền phiên âm + nghĩa tiếng Việt (dùng chung Gemini API Key đã lưu ở tab "Tôi"). Mỗi thẻ có tối đa **5 slot câu ví dụ** — bấm 1 nút **"✨ Tạo 5 câu bằng AI"** để sinh cả 5 câu cùng lúc (yêu cầu AI cho 5 chủ đề/độ dài khác nhau, tránh tình trạng sinh riêng lẻ ra 5 câu cùng 1 mô típ), không bắt buộc điền đủ, và có thể sửa tay từng câu sau khi AI tạo.
- **Tab "Tôi":** nơi quản lý tài khoản/cài đặt chung — đăng nhập Google, Gemini API Key, và nút "🔧 Quét & vá dữ liệu câu ví dụ" (quét toàn bộ deck cá nhân, tự dò lại bằng AI những câu ví dụ bị thiếu/sai dữ liệu — ví dụ do được tạo trước 1 bản cập nhật đổi cấu trúc lưu trữ — và lưu lại, không cần sửa tay từng thẻ, an toàn bấm lại nhiều lần).

## 2. Cấu trúc project

```
index.html   Giao diện chính (5 tab: Flashcard, Điền từ, Tra cứu & AI, Thư viện, Tôi)
style.css    Toàn bộ style
app.js       Logic app: SRS, deck cá nhân, cloze test, tra cứu, gọi Gemini API, đăng nhập Google & đồng bộ GAS
gas/Code.gs  Google Apps Script: API đọc/ghi Google Sheet + xác thực Google ID token
```

### 2.1. Deck cá nhân lưu ở đâu?

Để tránh `app.js` phình to theo thời gian, deck cá nhân **không** được thêm vào mảng `VOCAB_DATA` trong code — mà lưu trên **Google Sheet** (sheet `Decks Cá Nhân`), qua các API mới trong `gas/Code.gs` (`listDecks`, `createDeck`, `deleteDeck`, `addCard`, `updateCard`, `deleteCard`). Basic Deck (20 từ, id 1–20) vẫn nằm cứng trong `app.js` vì đó là bộ từ mẫu dùng chung, không cần sửa/đồng bộ, và học được **không cần đăng nhập**.

Mỗi deck/thẻ cá nhân được cấp 1 ID dạng UUID (sinh bởi `Utilities.getUuid()` phía server), gắn theo email đã đăng nhập — vì vậy **bắt buộc phải đăng nhập Google** mới tạo/xem/sửa được deck cá nhân (tab Thư viện sẽ hiện thông báo yêu cầu đăng nhập nếu chưa đăng nhập). Đổi lại, deck cá nhân tự động đồng bộ đa thiết bị (đăng nhập cùng tài khoản ở máy khác vẫn thấy đúng deck đó), và không có rủi ro trùng ID giữa những người dùng khác nhau (UUID không bao giờ trùng).

Tiến độ SRS (đã nhớ/chưa nhớ) của thẻ cá nhân vẫn chỉ lưu **local** (`localStorage`, xem mục 6) — không đồng bộ lên sheet `Tiến Độ Học` dùng chung, để tách bạch: `Tiến Độ Học` chỉ ghi lại lịch sử học Basic Deck (bộ từ chung), còn deck cá nhân là nội dung riêng tư của từng người.

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

### 3.4. Thêm đăng nhập Google (Firebase Auth) để đồng bộ tiến độ + deck cá nhân

**Vì sao không hardcode thẳng bí mật vào code:** repo là public nên bất kỳ ai cũng đọc được `app.js`/`index.html` trên GitHub. Vì vậy:

- Gemini API Key: **giữ nguyên là ô nhập UI**, mỗi người dùng tự dán key của họ, key tự trả phí cho người đó — không có gì để lộ.
- Google Apps Script URL (endpoint ghi dữ liệu chung): **được phép hardcode** vì nó không phải bí mật tốn phí, chỉ là 1 địa chỉ nhận dữ liệu. Nhưng vì ai cũng gọi được endpoint này, cần một lớp xác thực để biết **dữ liệu gửi lên là của ai** → dùng đăng nhập Google.

**Vì sao dùng Firebase Authentication thay vì Google Identity Services (GIS) thuần:** GIS chỉ cấp `idToken` sống ~60 phút, không tự nhớ qua các lần tải lại trang (phải bấm đăng nhập lại liên tục — rất bất tiện khi dùng hàng ngày). Firebase Authentication bọc quanh Google Sign-In, tự quản lý phiên đăng nhập bền (nhiều ngày/tuần, tự làm mới token ngầm), lưu trong `IndexedDB` của trình duyệt — không cần backend riêng, chỉ cần nhúng SDK JS + 1 project Firebase miễn phí.

**Cách hoạt động:**
1. Người dùng bấm nút "🔑 Đăng nhập bằng Google" trên tab "Tra cứu & AI" → Firebase SDK xử lý popup đăng nhập Google.
2. `firebaseAuth.onAuthStateChanged()` tự động cập nhật trạng thái đăng nhập mỗi khi tải trang (kể cả không bấm gì) — đây là cơ chế "nhớ đăng nhập".
3. Mỗi khi đồng bộ tiến độ hoặc thao tác deck cá nhân, `app.js` gọi `user.getIdToken()` (Firebase tự trả token còn hạn dùng hoặc tự làm mới ngầm) và gửi kèm lên Google Apps Script.
4. `Code.gs` **giải mã** payload của token (không kiểm tra chữ ký mã hoá — xem lý do & rủi ro ở mục 7), kiểm tra `aud`/`iss` khớp đúng project Firebase, và kiểm tra `email` nằm trong danh sách `ALLOWED_EMAILS`.
5. Nếu hợp lệ: ghi vào sheet `Tiến Độ Học` (tiến độ Basic Deck) hoặc sheet `Decks Cá Nhân` (deck/thẻ cá nhân) — tách biệt hoàn toàn với các sheet cũ (`Nhập Data`, `Raw Data`, `Nhập Data (Ngôn ngữ user)`, `Cặp từ`).

#### Bước A — Tạo Firebase project

1. Vào `https://console.firebase.google.com` → **Add project** → đặt tên bất kỳ → có thể tắt Google Analytics → **Create project**.
2. Bấm biểu tượng Web (`</>`) → **Register app** → copy đoạn `firebaseConfig` hiện ra (các giá trị này **không phải bí mật**, an toàn để public).
3. Vào **Build → Authentication** → tab **Sign-in method** → **Add new provider** → **Google** → **Enable** → chọn email hỗ trợ → **Save**.
4. Vẫn trong Authentication → tab **Settings** → **Authorized domains** → **Add domain** → thêm domain GitHub Pages, vd `lisaduong123.github.io`.
5. **Không cần** tick "Also set up Firebase Hosting" — project đã có GitHub Pages làm nơi host rồi.

#### Bước B — Điền cấu hình vào code phía client

Dán `firebaseConfig` từ Bước A vào `app.js` (hằng số `firebaseConfig`, gần đầu mục 10).

#### Bước C — Cập nhật & redeploy Google Apps Script

1. Mở project Apps Script chứa `Code.gs`, dán đè bằng nội dung mới nhất trong `gas/Code.gs` của repo này (bao gồm cả `gas/appsscript.json`).
2. Điền `FIREBASE_PROJECT_ID` (hằng số ở đầu file) đúng bằng `projectId` trong `firebaseConfig`.
3. Thêm email của bạn (và bạn bè nếu chia sẻ app) vào mảng `ALLOWED_EMAILS`.
4. Deploy đúng bản mới nhất — khuyến nghị dùng `clasp` thay vì thao tác tay trên giao diện web (xem mục 9, vì UI web rất dễ khiến deployment bị "ghim" vào version cũ mà không biết):
   ```bash
   clasp push --force
   clasp deploy --deploymentId <id đúng bằng URL .../exec đang dùng>
   ```

Sau đó commit & push lại lên GitHub, GitHub Pages sẽ tự cập nhật.

---

## 4. Chạy thử / kiểm tra local

Mở trực tiếp `index.html` bằng trình duyệt, hoặc dùng 1 static server bất kỳ (vd VS Code Live Server). Lưu ý: tính năng Đăng nhập Google chỉ hoạt động nếu domain đang mở nằm trong danh sách **Authorized domains** của Firebase (Bước A.4) — muốn test local thì thêm cả `localhost` vào đó (Firebase mặc định đã cho phép `localhost`).

## 5. Cách test end-to-end tính năng đồng bộ

1. Mở link demo → tab **Tra cứu & AI** → bấm **🔑 Đăng nhập bằng Google**, đăng nhập thành công sẽ thấy dòng "✓ Đã đăng nhập: ...".
2. Qua tab **Flashcard**, bấm "Đã nhớ" / "Chưa nhớ" vài từ (thuộc Basic Deck).
3. Mở Google Sheet gốc → kiểm tra sheet **`Tiến Độ Học`** có dòng mới ghi đúng email/tên + vocab ID + hành động.
4. Qua tab **Thư viện** → tạo 1 deck cá nhân, thêm/sửa/xoá vài thẻ → kiểm tra sheet **`Decks Cá Nhân`** phản ánh đúng thay đổi.
5. Đóng trình duyệt, mở lại link demo → xác nhận vẫn thấy trạng thái "✓ Đã đăng nhập" mà không cần bấm lại (đây là điểm khác biệt so với GIS thuần trước đây).
6. Các sheet cũ (`Nhập Data`, `Raw Data`, `Nhập Data (Ngôn ngữ user)`, `Cặp từ`) phải giữ nguyên, không có gì thay đổi.

## 6. Dữ liệu lưu ở đâu

- Tiến độ SRS cá nhân (không cần đăng nhập, kể cả thẻ trong deck cá nhân): `localStorage` trên trình duyệt của mỗi người.
- Gemini API Key: `localStorage`, riêng theo từng người dùng, không gửi lên đâu ngoài Google Gemini API.
- Tiến độ đồng bộ chung của Basic Deck (chỉ khi đã đăng nhập Google): Google Sheet, sheet `Tiến Độ Học`.
- Deck cá nhân + flashcard tự tạo (chỉ khi đã đăng nhập Google): Google Sheet, sheet `Decks Cá Nhân`.

### 6.1. Ý nghĩa các cột trong sheet `Tiến Độ Học`

| Cột | Ý nghĩa |
|---|---|
| Thời gian | Thời điểm server ghi nhận dòng dữ liệu (giờ server Google, không phải giờ trình duyệt người dùng). |
| Email / Tên | Danh tính giải mã từ Firebase ID token (xem mục 7 về giới hạn của cách xác thực này). |
| **Vocab ID** | ID của từ vựng, khớp với trường `id` trong mảng `VOCAB_DATA` ở đầu file `app.js` (hiện đánh số 1–20, mỗi số ứng với đúng 1 từ, ví dụ `id: 1` là "안녕하세요"). Muốn tra từ nào ứng với ID nào thì mở `app.js`, tìm `id: <số đó>`. Chỉ áp dụng cho Basic Deck — thẻ deck cá nhân không đồng bộ vào sheet này (xem mục 2.1). |
| Hành động | Một trong 3 giá trị: `remember` (bấm "Đã nhớ" ở tab Flashcard), `forget` (bấm "Chưa nhớ"), hoặc `ai_grading` (dùng tính năng chấm điểm AI ở tab Tra cứu & AI). |
| **Giá trị** | Ý nghĩa phụ thuộc vào cột "Hành động": với `remember`/`forget` là **cấp độ SRS** sau khi cập nhật (số nguyên 0–6, càng cao nghĩa là càng nhớ chắc — xem mảng `SRS_INTERVALS_DAYS` trong `app.js` để biết mỗi cấp độ ứng với bao lâu mới ôn lại); với `ai_grading` là **điểm số AI chấm** cho bản dịch (thang 0–10). |

### 6.2. Cấu trúc sheet `Decks Cá Nhân`

Bảng phẳng, mỗi dòng là 1 thẻ; riêng deck rỗng có 1 "dòng đánh dấu" (cột `CardID` để trống) để deck vẫn tồn tại dù chưa có thẻ nào.

| Cột | Ý nghĩa |
|---|---|
| Email | Chủ sở hữu deck/thẻ (giải mã từ Firebase ID token). |
| DeckID / CardID | UUID sinh tự động phía server (`Utilities.getUuid()`), không trùng lặp giữa các người dùng. |
| Tên Deck | Tên deck do người dùng đặt. |
| Hàn / Romaja / Việt | Nội dung cơ bản của thẻ, tương ứng các trường `kr/romaja/vi` trong `VOCAB_DATA`. |
| Ví Dụ (JSON) | Mảng JSON tối đa 5 câu ví dụ dạng `[{"example":"...","exampleVi":"...","blankWord":"..."}]`. Dùng JSON trong 1 cột thay vì cột cố định vì số câu ví dụ mỗi thẻ là tuỳ chọn (0–5, xem mục 1 "AI hỗ trợ tạo thẻ"). `blankWord` là đúng dạng chữ của từ **như nó xuất hiện trong câu đó** (không phải dạng từ điển) — xem mục 8b để hiểu vì sao cần tách riêng field này. |

**Lịch sử schema:** ban đầu cột này tách riêng `Ví Dụ` / `Ví Dụ Việt` (1 câu ví dụ/thẻ, dùng chung `blankWord` = từ dạng từ điển của cả thẻ). Khi nâng lên tối đa 5 câu, đã gộp thành 1 cột JSON; sau đó phát hiện bug (mục 8b) nên thêm field `blankWord` riêng cho từng câu. Mỗi lần đổi cấu trúc như vậy đều chạy 1 lần hàm migrate tạm (đọc dữ liệu cũ, ghi lại đúng định dạng mới, sau đó xoá hàm migrate) để không mất dữ liệu thẻ đã tạo trước đó — xem mục 9 (`clasp`) cho quy trình.

## 7. Lưu ý bảo mật

- Repo này là **public** — không bao giờ hardcode Gemini API Key hoặc bất kỳ secret nào tốn phí vào code, vì ai cũng đọc được trên GitHub. `firebaseConfig` trong `app.js` thì an toàn để public (Google thiết kế các giá trị này không phải bí mật).
- GAS Web App URL được hardcode có chủ đích (không phải secret tốn phí), nhưng vì endpoint này công khai, mọi request ghi dữ liệu đều được kiểm tra qua `verifyFirebaseIdToken()` trước khi ghi Sheet.
- **Giới hạn quan trọng cần biết:** `verifyFirebaseIdToken()` chỉ **giải mã** payload của token — **không kiểm tra chữ ký mã hoá (RSA)**, vì Apps Script không có sẵn công cụ verify RSA và tự viết thuật toán này khá rủi ro/dễ sai cho quy mô app này. Bù lại bằng 2 lớp kiểm tra không cần crypto:
  1. `aud`/`iss` trong token phải khớp đúng `FIREBASE_PROJECT_ID` của app này (chặn token từ project Firebase khác).
  2. `email` phải nằm trong mảng `ALLOWED_EMAILS` (chặn email lạ/ngẫu nhiên).

  **Rủi ro thực tế:** ai đó đủ hiểu kỹ thuật, tìm được URL Apps Script (public trên GitHub) và biết trước 1 email nằm trong `ALLOWED_EMAILS`, có thể tự soạn 1 "token giả" (JWT với chữ ký không hợp lệ nhưng payload đúng định dạng) để giả mạo đúng người đó ghi dữ liệu rác. **Không** ảnh hưởng tới tài khoản Google thật của người bị giả mạo (không đọc được Gmail/Drive/mật khẩu), chỉ ảnh hưởng tới dữ liệu trong Sheet của app này. Chấp nhận đánh đổi này vì quy mô dùng cá nhân/chia sẻ bạn bè thân thiết, không phải mục tiêu đáng để ai đó bỏ công tấn công.

## 8. Model Gemini đang dùng & lỗi 404 model not found

`app.js` gọi Gemini API bằng model **`gemini-flash-latest`** (trong hàm `callGeminiGrading`) thay vì ghi cứng 1 phiên bản cụ thể (vd `gemini-1.5-flash`, `gemini-2.5-flash`). Lý do: Google thường xuyên ngừng hỗ trợ (deprecate) các phiên bản model cụ thể, khiến API trả lỗi `404 NOT_FOUND`. Dùng alias `-latest` giúp code luôn tự trỏ vào bản flash mới nhất Google khuyến nghị, không cần sửa code mỗi lần Google đổi model mặc định.

Nếu sau này vẫn gặp lỗi `404` với thông báo kiểu "model ... is not found" hoặc "no longer available":
1. Kiểm tra chắc chắn đang test qua link GitHub Pages thật (không phải mở file `index.html` trực tiếp) và đã hard-refresh (Ctrl+Shift+R) để loại trừ cache trình duyệt.
2. Nếu vẫn lỗi, có thể alias `-latest` cũng đã bị đổi tên/ngừng hỗ trợ — vào `https://aistudio.google.com`, chọn "Get code" ở 1 model bất kỳ để xem tên model hiện tại Google đang đề xuất cho tài khoản của bạn, rồi cập nhật lại trong `app.js`.

## 8b. Vì sao mỗi câu ví dụ cần `blankWord` riêng, và cách vá dữ liệu cũ

**Bug đã gặp:** tab "Điền từ" tìm `kr` (dạng từ điển, ví dụ "회자되다") trong câu ví dụ để tạo chỗ trống. Nhưng tiếng Hàn chia động từ/tính từ theo ngữ cảnh — dạng từ điển hầu như không xuất hiện y nguyên trong câu tự nhiên (câu thật chứa "회자되었습니다", "회자될"...), nên phép so khớp chuỗi luôn thất bại, và Điền từ hiện cả câu mà không khuyết gì. Danh từ (không chia) như "선처"/"도배" không bị lỗi này vì tiểu từ chỉ nối thêm sau, không thay đổi phần đầu — nên bug chỉ lộ ra khi test đúng loại từ có chia (động từ/tính từ).

**Cách sửa:** mỗi câu ví dụ giờ tự mang `blankWord` riêng (đúng dạng chữ xuất hiện trong CÂU ĐÓ), không dùng chung 1 từ gốc cho cả thẻ:
- AI tạo câu (`aiGenerateExampleSentences`) được yêu cầu trả về luôn "từ trong câu" kèm mỗi câu, có tự kiểm tra khớp trước khi lưu.
- Gõ tay thì có ô nhỏ "Từ cần khuyết trong câu này" ở mỗi slot, để trống sẽ mặc định dùng từ Hàn của thẻ.
- `refreshClozeQueue` tự loại các câu mà `blankWord` không thực sự nằm trong câu (an toàn — bỏ qua câu lỗi thay vì hiện sai).

**Vá dữ liệu cũ (đã tạo trước khi có `blankWord`):** nút **"🔧 Quét & vá tất cả deck"** ở tab Thư viện — quét toàn bộ deck cá nhân, với mỗi câu thiếu/sai `blankWord` thì gọi AI dò lại đúng dạng chữ đã dùng trong câu đó (`detectBlankWordForExample`, khác hàm tạo câu mới — chỉ *phân tích* câu có sẵn) rồi lưu lại qua API `updateCard` có sẵn. An toàn bấm lại nhiều lần vì câu đã đúng sẽ tự bỏ qua.

Đây cũng là **cách chung để xử lý khi cấu trúc dữ liệu đổi mà dữ liệu cũ đã tồn tại nhiều**: viết 1 hàm quét + tự sửa ngay trong app (dùng lại API sẵn có), thay vì bắt người dùng sửa tay từng thẻ hoặc chạy migrate 1 lần rồi thôi. Nếu sau này phát sinh bug tương tự ở field khác, có thể làm theo đúng mẫu này.

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

2. **Thiếu quyền `script.external_request` cho `UrlFetchApp`.** (Gặp phải khi còn dùng cách xác thực cũ qua `oauth2.googleapis.com/tokeninfo` của Google Identity Services.) Khi thêm đoạn code gọi ra ngoài, Apps Script cần được cấp quyền mới. Vì `appsscript.json` gốc không khai báo `oauthScopes` rõ ràng, và code được đẩy lên qua API (`clasp push`) thay vì lưu trực tiếp trên trình duyệt, màn hình xin quyền không tự bật lên — khiến `UrlFetchApp.fetch` luôn ném lỗi `You do not have permission to call UrlFetchApp.fetch`, bị code tự bắt lỗi (`catch`) và trả về `null` một cách im lặng. Cách sửa: khai báo rõ `oauthScopes` trong `gas/appsscript.json`, push lại, rồi vào Apps Script editor chạy tay 1 hàm bất kỳ có gọi `UrlFetchApp` để màn hình "Authorization required" hiện ra và cấp quyền. Từ khi chuyển sang `verifyFirebaseIdToken()` (chỉ giải mã, không gọi mạng ra ngoài — xem mục 7), quyền này không còn thực sự cần thiết nữa, nhưng để nguyên trong `appsscript.json` cũng không hại gì.

**Mẹo debug nhanh khi gặp lại tình trạng tương tự:** viết 1 hàm tạm kiểu `function testXyz() { ... }` gọi trực tiếp hàm nghi ngờ với dữ liệu thật, `clasp push`, rồi vào editor chọn đúng hàm đó ở dropdown và bấm Run — "Execution log" hiện ra ngay dưới sẽ show đầy đủ `console.log` và exception thật, đáng tin cậy hơn nhiều so với xem qua mục "Executions" của 1 lần gọi `doPost` từ xa.

**Mẹo test API deck cá nhân bằng `curl` mà không cần trình duyệt:** vì `verifyFirebaseIdToken()` không kiểm tra chữ ký, có thể tự soạn 1 JWT giả (header + payload đúng định dạng, chữ ký để bậy) để gọi thẳng `doPost` — hữu ích để test nhanh `createDeck`/`addCard`/`listDecks`/... mà không cần đăng nhập thật qua trình duyệt. Lưu ý khi test trên Windows (Git Bash): **truyền JSON chứa ký tự tiếng Việt/Hàn qua tham số dòng lệnh của `curl` sẽ bị mã hoá sai** (ra dấu `?`) — phải ghi JSON ra 1 file UTF-8 rồi gửi bằng `curl --data-binary @file.json` mới đúng. Đây chỉ là hạn chế của môi trường test, không phải lỗi thật của app (trình duyệt luôn mã hoá UTF-8 đúng).
