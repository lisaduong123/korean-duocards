/**
 * 💎 HỆ THỐNG QUẢN LÝ DATA LISA PRO - BẢN TÍCH HỢP API (Google Sheets ⇄ Ứng dụng học tiếng Hàn / VS Code)
 * --------------------------------------------------------------------------------------
 * PHẦN 1: Menu & luồng gom nhóm dữ liệu thủ công (nhu cầu CŨ — giữ nguyên logic gốc)
 * PHẦN 2: Các hàm dùng chung để build "thư viện Main" và tự sinh mã định danh (M01, M01-S1, OV50...)
 * PHẦN 3: API doGet      — đọc dữ liệu từ "Raw Data" để App tiếng Hàn / VS Code lấy về học
 * PHẦN 4: API doPost + processText — nhận dữ liệu mới từ App tiếng Hàn / VS Code và ghi vào Sheet
 * PHẦN 5: Tiện ích chung (JSON response, làm sạch chuỗi tiếng Việt/Hàn NFC...)
 */

const SHEET_NHAP_DATA = "Nhập Data";
const SHEET_RAW_DATA   = "Raw Data";

/** Làm sạch chuỗi: chuẩn hoá NFC (quan trọng với tiếng Việt/Hàn), gộp khoảng trắng, trim */
function CLEAN(txt) {
  if (txt === null || txt === undefined) return "";
  return txt.toString().normalize("NFC").replace(/\s+/g, ' ').trim();
}

// ================================================================================
// PHẦN 1: MENU & LUỒNG XỬ LÝ THỦ CÔNG TRÊN GOOGLE SHEETS (NHU CẦU CŨ — GIỮ NGUYÊN)
// ================================================================================

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('💎 HỆ THỐNG DATA')
    .addItem('Bước 1: Kiểm tra & Gom nhóm', 'checkAndGroupData')
    .addSeparator()
    .addItem('Bước 2: Tổng hợp qua Raw Data', 'transferDataToRaw')
    .addToUi();
}

function checkAndGroupData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const inputSheet = ss.getSheetByName(SHEET_NHAP_DATA);
  if (!inputSheet) return;

  let inputLastRow = inputSheet.getLastRow();
  if (inputLastRow < 2) {
    SpreadsheetApp.getUi().alert(`Sheet '${SHEET_NHAP_DATA}' trống!`);
    return;
  }

  let inputRange = inputSheet.getRange(2, 1, inputLastRow - 1, 6);
  let inputData = inputRange.getValues();

  let currentMainInBatch = [];
  let groupCounter = 0;

  // Quét tìm Main để đánh số định danh 1, 2, 3...
  for (let i = 0; i < inputData.length; i++) {
    if (inputData[i][4] === "Main") {
      groupCounter++;
      let groupID = groupCounter.toString();
      inputData[i][5] = groupID;
      currentMainInBatch.push({ text: CLEAN(inputData[i][0]), groupID: groupID });
    }
  }

  // Quét tìm Sentence và Vocabulary để tự động gán số định danh dựa trên nội dung
  for (let i = 0; i < inputData.length; i++) {
    if (inputData[i][4] === "Sentence" || inputData[i][4] === "Vocabulary") {
      let content = CLEAN(inputData[i][0]);
      let found = currentMainInBatch.slice().reverse().find(m => m.text.includes(content));
      if (found) {
        inputData[i][5] = found.groupID;
      } else {
        inputData[i][5] = "Không khớp Main nào";
      }
    }
  }

  inputRange.setValues(inputData);
  SpreadsheetApp.getUi().alert("✅ Xong Bước 1! Hãy kiểm tra cột F.");
}

function transferDataToRaw() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const inputSheet = ss.getSheetByName(SHEET_NHAP_DATA);
  const rawSheet = ss.getSheetByName(SHEET_RAW_DATA);

  let inputLastRow = inputSheet.getLastRow();
  if (inputLastRow < 2) return;
  let inputData = inputSheet.getRange(2, 1, inputLastRow - 1, 6).getValues();

  let rawLastRow = rawSheet.getLastRow();
  let rawData = rawLastRow > 1 ? rawSheet.getRange(2, 1, rawLastRow - 1, 6).getValues() : [];

  // Dùng lại hàm build thư viện Main dùng chung (xem PHẦN 2)
  const lib = buildMainLibraryFromRaw(rawData);
  let mainLibrary = lib.mainLibrary;
  let maxMainNum = lib.maxMainNum;
  let maxOVNum = lib.maxOVNum;
  let maxOSNum = lib.maxOSNum;

  let finalResults = [];
  let groupToRealIDMap = {};

  // Xử lý các dòng Main trước
  inputData.forEach(row => {
    if (row[4] === "Main") {
      let content = CLEAN(row[0]);
      let existing = mainLibrary.find(m => m.text === content);
      let realID = existing ? existing.id : ("M" + padMainNum(++maxMainNum));

      if (!existing) {
        mainLibrary.push({ text: content, id: realID, sCount: 0, vCount: 0 });
      }
      groupToRealIDMap[row[5].toString()] = realID;
      finalResults.push([row[0], row[1], row[2], row[3], "Main", realID]);
    }
  });

  // Xử lý các dòng Sentence, Vocabulary và OS/OV lẻ
  inputData.forEach(row => {
    if (row[4] !== "Main") {
      let groupID = row[5].toString();
      let type = row[4];
      let realID = groupToRealIDMap[groupID];
      let finalCode = "";

      if (realID) {
        let libItem = mainLibrary.find(m => m.id === realID);
        if (libItem) {
          if (type === "Sentence") {
            libItem.sCount += 1;
            finalCode = realID + "-S" + libItem.sCount;
          } else {
            libItem.vCount += 1;
            finalCode = realID + "-V" + libItem.vCount;
          }
        }
      } else {
        // Nếu không có groupID hoặc không khớp Main -> Dùng OS/OV
        if (type === "Sentence") {
          maxOSNum += 1;
          finalCode = "OS" + maxOSNum;
        } else {
          maxOVNum += 1;
          finalCode = "OV" + maxOVNum;
        }
      }
      finalResults.push([row[0], row[1], row[2], row[3], type, finalCode]);
    }
  });

  // Ghi dữ liệu vào Raw Data và dọn dẹp
  if (finalResults.length > 0) {
    rawSheet.getRange(rawSheet.getLastRow() + 1, 1, finalResults.length, 6).setValues(finalResults);
    inputSheet.getRange(2, 1, inputLastRow - 1, 6).clearContent();
    ss.setActiveSheet(rawSheet);
    SpreadsheetApp.getUi().alert("🚀 Hoàn thành! Đã phân loại OS/OV và chuyển dữ liệu.");
  }
}

// ================================================================================
// PHẦN 2: HÀM DÙNG CHUNG — BUILD THƯ VIỆN MAIN & SINH MÃ ĐỊNH DANH TỰ ĐỘNG
// (Được tái sử dụng bởi cả transferDataToRaw() và processText() ở PHẦN 4)
// ================================================================================

/**
 * Quét toàn bộ dữ liệu hiện có trong Raw Data để dựng lại:
 *  - mainLibrary: danh sách các Main hiện có kèm số lượng Sentence/Vocabulary con
 *  - maxMainNum / maxOVNum / maxOSNum: số đếm lớn nhất hiện tại để sinh mã tiếp theo
 */
function buildMainLibraryFromRaw(rawData) {
  let mainLibrary = [];
  let maxMainNum = 0, maxOVNum = 0, maxOSNum = 0;

  rawData.forEach(row => {
    let id = CLEAN(row[5]);
    if (!id) return;

    if (id.startsWith("M")) {
      let mID = id.split("-")[0];
      let num = parseInt(mID.replace("M", ""), 10);
      if (!isNaN(num) && num > maxMainNum) maxMainNum = num;

      let libItem = mainLibrary.find(item => item.id === mID);
      if (!libItem && row[4] === "Main") {
        libItem = { text: CLEAN(row[0]), id: mID, sCount: 0, vCount: 0 };
        mainLibrary.push(libItem);
      }

      if (libItem) {
        let typePart = id.split("-")[1];
        if (typePart) {
          let cNum = parseInt(typePart.substring(1), 10);
          if (!isNaN(cNum)) {
            if (typePart.startsWith("S") && cNum > libItem.sCount) libItem.sCount = cNum;
            if (typePart.startsWith("V") && cNum > libItem.vCount) libItem.vCount = cNum;
          }
        }
      }
    } else if (id.startsWith("OV")) {
      let ovNum = parseInt(id.replace("OV", ""), 10);
      if (!isNaN(ovNum) && ovNum > maxOVNum) maxOVNum = ovNum;
    } else if (id.startsWith("OS")) {
      let osNum = parseInt(id.replace("OS", ""), 10);
      if (!isNaN(osNum) && osNum > maxOSNum) maxOSNum = osNum;
    }
  });

  return { mainLibrary, maxMainNum, maxOVNum, maxOSNum };
}

/** Format số Main thành 2 chữ số: 1 -> "01", 12 -> "12" */
function padMainNum(num) {
  return num < 10 ? "0" + num : "" + num;
}

/**
 * Sinh mã định danh tự động cho MỘT dòng dữ liệu mới, ghi thẳng vào Raw Data.
 * @param {Sheet} rawSheet - sheet "Raw Data"
 * @param {string} type - "Main" | "Sentence" | "Vocabulary" | "OS" | "OV"
 * @param {Object} payload - { kr, mainId, mainText }
 * @returns {{code: string, isNewMain: boolean}}
 */
function generateAutoId(rawSheet, type, payload) {
  const rawLastRow = rawSheet.getLastRow();
  const rawData = rawLastRow > 1 ? rawSheet.getRange(2, 1, rawLastRow - 1, 6).getValues() : [];
  const lib = buildMainLibraryFromRaw(rawData);
  const normType = CLEAN(type);

  // --- Trường hợp: thêm một Main mới ---
  if (normType === "Main") {
    const krClean = CLEAN(payload.kr);
    const existing = lib.mainLibrary.find(m => m.text === krClean);
    if (existing) return { code: existing.id, isNewMain: false };
    const newId = "M" + padMainNum(lib.maxMainNum + 1);
    return { code: newId, isNewMain: true };
  }

  // --- Trường hợp: thêm Sentence hoặc Vocabulary con của một Main ---
  if (normType === "Sentence" || normType === "Vocabulary") {
    let mainId = CLEAN(payload.mainId).toUpperCase();
    let libItem = null;

    if (mainId) {
      libItem = lib.mainLibrary.find(m => m.id === mainId);
    } else if (payload.mainText) {
      const mainTextClean = CLEAN(payload.mainText);
      libItem = lib.mainLibrary.find(m =>
        mainTextClean.includes(m.text) || m.text.includes(mainTextClean)
      );
    }

    if (libItem) {
      if (normType === "Sentence") {
        libItem.sCount += 1;
        return { code: libItem.id + "-S" + libItem.sCount, isNewMain: false };
      } else {
        libItem.vCount += 1;
        return { code: libItem.id + "-V" + libItem.vCount, isNewMain: false };
      }
    }

    // Không xác định được Main cha -> tự động rơi về mã lẻ OS/OV
    if (normType === "Sentence") {
      return { code: "OS" + (lib.maxOSNum + 1), isNewMain: false };
    }
    return { code: "OV" + (lib.maxOVNum + 1), isNewMain: false };
  }

  // --- Trường hợp: chỉ định thẳng loại lẻ OS / OV ---
  if (normType === "OS") return { code: "OS" + (lib.maxOSNum + 1), isNewMain: false };
  if (normType === "OV") return { code: "OV" + (lib.maxOVNum + 1), isNewMain: false };

  // Fallback mặc định: coi như từ vựng lẻ
  return { code: "OV" + (lib.maxOVNum + 1), isNewMain: false };
}

// ================================================================================
// PHẦN 3: API — doGet(e)
// MỤC ĐÍCH MỚI: đây là điểm mà App học tiếng Hàn (web/VS Code) gọi để LẤY dữ liệu
// từ sheet "Raw Data" về, dùng cho Flashcard / Cloze Test / Tra cứu.
//
// Mặc định (không có tham số nào) -> trả về TOÀN BỘ Raw Data, giữ nguyên hành vi cũ.
// Có thể lọc thêm qua query string trên URL, ví dụ:
//   ...exec                          -> toàn bộ dữ liệu (như code gốc)
//   ...exec?id=M01-S1                -> đúng 1 dòng có 고유 ID này
//   ...exec?mainId=M01               -> cả nhóm M01, M01-S1, M01-V1, ...
//   ...exec?type=Vocabulary          -> chỉ lấy các dòng Vocabulary (dùng cho Flashcard)
//   ...exec?keyword=학교              -> tìm theo từ khoá (한국어 hoặc 베트남어)
//   ...exec?limit=50                 -> giới hạn số dòng trả về
// Có thể kết hợp nhiều tham số cùng lúc, ví dụ: ?type=Sentence&keyword=시간
// ================================================================================
function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_RAW_DATA);
    if (!sheet) {
      return jsonResponse({ success: false, error: `Không tìm thấy sheet "${SHEET_RAW_DATA}"` });
    }

    const data = sheet.getDataRange().getValues();
    if (data.length === 0) return jsonResponse([]);

    const headers = data[0];
    let rows = data.slice(1)
      .filter(row => row.some(cell => cell !== ""))
      .map(row => {
        const obj = {};
        headers.forEach((h, i) => obj[h] = row[i]);
        return obj;
      });

    const params = (e && e.parameter) ? e.parameter : {};

    if (params.id) {
      const idQuery = CLEAN(params.id).toUpperCase();
      rows = rows.filter(r => CLEAN(r["고유 ID"]).toUpperCase() === idQuery);
    }

    if (params.mainId) {
      const mainQuery = CLEAN(params.mainId).toUpperCase();
      rows = rows.filter(r => {
        const rid = CLEAN(r["고유 ID"]).toUpperCase();
        return rid === mainQuery || rid.startsWith(mainQuery + "-");
      });
    }

    if (params.type) {
      const typeQuery = CLEAN(params.type).toLowerCase();
      rows = rows.filter(r => CLEAN(r["타입 분류"]).toLowerCase() === typeQuery);
    }

    if (params.keyword) {
      const kw = CLEAN(params.keyword).toLowerCase();
      rows = rows.filter(r =>
        CLEAN(r["한국어"]).toLowerCase().includes(kw) ||
        CLEAN(r["베트남어"]).toLowerCase().includes(kw)
      );
    }

    if (params.limit) {
      const limitNum = parseInt(params.limit, 10);
      if (!isNaN(limitNum) && limitNum > 0) rows = rows.slice(0, limitNum);
    }

    return jsonResponse(rows);

  } catch (err) {
    return jsonResponse({ success: false, error: "Lỗi doGet: " + err.message });
  }
}

// ================================================================================
// PHẦN 4: API — doPost(e) + processText(payload)
// MỤC ĐÍCH MỚI: đây là điểm mà App học tiếng Hàn (web/VS Code) gọi để GHI dữ liệu
// mới lên Google Sheets — ví dụ khi người dùng thêm 1 từ vựng mới, 1 câu mới học được,
// hoặc kết quả AI chấm điểm cần lưu lại.
//
// doPost(e) chỉ làm 2 việc: (1) đọc & parse JSON body, (2) gọi processText() để xử lý
// toàn bộ logic nghiệp vụ (validate, xác định sheet đích, sinh mã, ghi dòng mới...).
// Tách riêng như vậy giúp dễ test processText() độc lập (ví dụ chạy thử trong trình
// soạn thảo Apps Script bằng cách gọi processText({...}) trực tiếp, không cần deploy).
//
// Body JSON mong đợi khi gọi POST tới URL của Web App, ví dụ:
// {
//   "target": "raw",              // "raw" (ghi thẳng Raw Data, tự sinh mã) hoặc "input" (mặc định, an toàn)
//   "type": "Vocabulary",         // "Main" | "Sentence" | "Vocabulary" | "OS" | "OV"
//   "kr": "안녕하세요",
//   "vi": "Xin chào",
//   "category": "인사",
//   "sentenceType": "공감형",
//   "mainId": "M01",              // (tuỳ chọn) chỉ định Main cha nếu target = "raw"
//   "mainText": "안녕하세요, 수석님..."  // (tuỳ chọn) dò Main cha theo nội dung nếu không có mainId
// }
// ================================================================================
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ success: false, error: "Không có dữ liệu POST được gửi lên." });
    }

    let payload;
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return jsonResponse({ success: false, error: "Dữ liệu gửi lên không đúng định dạng JSON." });
    }

    const result = processText(payload);
    return jsonResponse(result);

  } catch (err) {
    return jsonResponse({ success: false, error: "Lỗi doPost: " + err.message });
  }
}

/**
 * Xử lý toàn bộ logic nghiệp vụ cho 1 dòng dữ liệu mới gửi lên từ App tiếng Hàn / VS Code:
 *  - Validate dữ liệu đầu vào
 *  - Làm sạch chuỗi tiếng Hàn/Việt (NFC)
 *  - Xác định ghi vào "Nhập Data" (an toàn, chờ xử lý thủ công) hay thẳng vào "Raw Data"
 *    (tự sinh mã định danh M../M..-S../M..-V../OS../OV..)
 *
 * Có thể gọi hàm này trực tiếp trong trình soạn thảo Apps Script để test nhanh, ví dụ:
 *   processText({ target:"raw", type:"Vocabulary", kr:"학교", vi:"Trường học", mainId:"M01" })
 *
 * @param {Object} payload - dữ liệu JSON gửi lên (xem cấu trúc mẫu ở PHẦN 4 phía trên)
 * @returns {Object} kết quả dạng { success, message/error, id?, row? }
 */
function processText(payload) {
  payload = payload || {};

  const kr = CLEAN(payload.kr);
  const vi = CLEAN(payload.vi);
  const category = CLEAN(payload.category);
  const sentenceType = CLEAN(payload.sentenceType);
  const type = CLEAN(payload.type) || "Vocabulary";
  const target = (CLEAN(payload.target) || "input").toLowerCase();

  if (!kr) {
    return { success: false, error: "Thiếu nội dung '한국어' (trường 'kr') bắt buộc." };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  if (target === "raw") {
    const rawSheet = ss.getSheetByName(SHEET_RAW_DATA);
    if (!rawSheet) {
      return { success: false, error: `Không tìm thấy sheet "${SHEET_RAW_DATA}"` };
    }

    const generated = generateAutoId(rawSheet, type, {
      kr: kr,
      mainId: CLEAN(payload.mainId),
      mainText: CLEAN(payload.mainText)
    });

    const newRow = [kr, vi, category, sentenceType, type, generated.code];
    rawSheet.appendRow(newRow);

    return {
      success: true,
      message: `Đã thêm trực tiếp vào "${SHEET_RAW_DATA}".`,
      id: generated.code,
      row: newRow
    };

  } else {
    const inputSheet = ss.getSheetByName(SHEET_NHAP_DATA);
    if (!inputSheet) {
      return { success: false, error: `Không tìm thấy sheet "${SHEET_NHAP_DATA}"` };
    }

    const newRow = [kr, vi, category, sentenceType, type, ""];
    inputSheet.appendRow(newRow);

    return {
      success: true,
      message: `Đã thêm vào "${SHEET_NHAP_DATA}". Hãy chạy Bước 1 & Bước 2 trên Menu để gom nhóm và tổng hợp.`,
      row: newRow
    };
  }
}

// ================================================================================
// PHẦN 5: TIỆN ÍCH CHUNG
// ================================================================================

/** Trả JSON chuẩn cho mọi response của Web App (dùng chung cho doGet & doPost) */
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
