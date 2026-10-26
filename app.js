/* ==========================================================================
   한국어 마스터 — app.js
   Toàn bộ logic: chuyển tab, flashcard + Spaced Repetition, Cloze test,
   Tra cứu từ vựng, AI chấm điểm qua Gemini API, đồng bộ Google Apps Script.
   ========================================================================== */

/* --------------------------------------------------------------------------
   1. DỮ LIỆU TỪ VỰNG GỐC
   -------------------------------------------------------------------------- */
const VOCAB_DATA = [
  { id: 1,  kr: "안녕하세요", romaja: "annyeonghaseyo", vi: "Xin chào",
    example: "안녕하세요, 만나서 반갑습니다.", exampleVi: "Xin chào, rất vui được gặp bạn.", blankWord: "안녕하세요" },
  { id: 2,  kr: "감사합니다", romaja: "gamsahamnida", vi: "Cảm ơn",
    example: "도와주셔서 감사합니다.", exampleVi: "Cảm ơn vì đã giúp đỡ tôi.", blankWord: "감사합니다" },
  { id: 3,  kr: "사랑해요", romaja: "saranghaeyo", vi: "Yêu bạn / Anh yêu em",
    example: "나는 당신을 사랑해요.", exampleVi: "Tôi yêu bạn.", blankWord: "사랑해요" },
  { id: 4,  kr: "학교", romaja: "hakgyo", vi: "Trường học",
    example: "저는 매일 학교에 가요.", exampleVi: "Tôi đến trường mỗi ngày.", blankWord: "학교" },
  { id: 5,  kr: "친구", romaja: "chingu", vi: "Bạn bè",
    example: "그는 저의 가장 친한 친구예요.", exampleVi: "Anh ấy là bạn thân nhất của tôi.", blankWord: "친구" },
  { id: 6,  kr: "물", romaja: "mul", vi: "Nước",
    example: "저는 물을 마시고 싶어요.", exampleVi: "Tôi muốn uống nước.", blankWord: "물" },
  { id: 7,  kr: "음식", romaja: "eumsik", vi: "Đồ ăn / Món ăn",
    example: "이 음식은 정말 맛있어요.", exampleVi: "Món ăn này thực sự rất ngon.", blankWord: "음식" },
  { id: 8,  kr: "가족", romaja: "gajok", vi: "Gia đình",
    example: "저는 가족과 함께 살아요.", exampleVi: "Tôi sống cùng gia đình.", blankWord: "가족" },
  { id: 9,  kr: "시간", romaja: "sigan", vi: "Thời gian",
    example: "시간이 얼마나 걸려요?", exampleVi: "Mất bao lâu thời gian?", blankWord: "시간" },
  { id: 10, kr: "오늘", romaja: "oneul", vi: "Hôm nay",
    example: "오늘 날씨가 좋아요.", exampleVi: "Hôm nay thời tiết đẹp.", blankWord: "오늘" },
  { id: 11, kr: "내일", romaja: "naeil", vi: "Ngày mai",
    example: "내일 다시 만나요.", exampleVi: "Ngày mai gặp lại nhé.", blankWord: "내일" },
  { id: 12, kr: "행복하다", romaja: "haengbokhada", vi: "Hạnh phúc",
    example: "저는 지금 정말 행복해요.", exampleVi: "Bây giờ tôi thực sự hạnh phúc.", blankWord: "행복해요" },
  { id: 13, kr: "공부하다", romaja: "gongbuhada", vi: "Học tập",
    example: "저는 한국어를 공부해요.", exampleVi: "Tôi học tiếng Hàn.", blankWord: "공부해요" },
  { id: 14, kr: "일하다", romaja: "ilhada", vi: "Làm việc",
    example: "아버지는 회사에서 일해요.", exampleVi: "Bố tôi làm việc ở công ty.", blankWord: "일해요" },
  { id: 15, kr: "먹다", romaja: "meokda", vi: "Ăn",
    example: "저는 아침을 먹어요.", exampleVi: "Tôi ăn sáng.", blankWord: "먹어요" },
  { id: 16, kr: "가다", romaja: "gada", vi: "Đi",
    example: "저는 집에 가요.", exampleVi: "Tôi đi về nhà.", blankWord: "가요" },
  { id: 17, kr: "예쁘다", romaja: "yeppeuda", vi: "Đẹp / Xinh",
    example: "그녀는 정말 예뻐요.", exampleVi: "Cô ấy thực sự rất xinh.", blankWord: "예뻐요" },
  { id: 18, kr: "맛있다", romaja: "masitda", vi: "Ngon",
    example: "이 커피는 맛있어요.", exampleVi: "Cà phê này ngon.", blankWord: "맛있어요" },
  { id: 19, kr: "날씨", romaja: "nalssi", vi: "Thời tiết",
    example: "오늘 날씨가 어때요?", exampleVi: "Thời tiết hôm nay thế nào?", blankWord: "날씨" },
  { id: 20, kr: "여행", romaja: "yeohaeng", vi: "Du lịch",
    example: "저는 여행을 좋아해요.", exampleVi: "Tôi thích du lịch.", blankWord: "여행" }
];

/* --------------------------------------------------------------------------
   1b. THƯ VIỆN (LIBRARY) & DECK CÁ NHÂN
   Basic Deck = VOCAB_DATA ở trên (chỉ xem/học, không sửa được).
   Personal Decks = do người dùng tự tạo, lưu trên Google Sheet qua GAS
   (sheet "Decks Cá Nhân"), gắn theo email đã đăng nhập Google — cần đăng
   nhập mới tạo/quản lý được, tránh làm app.js phình to theo thời gian.
   -------------------------------------------------------------------------- */
const BASIC_DECK_ID = "basic";
const ACTIVE_DECK_KEY = "koreanApp_activeDeckId_v1";

let personalDecks = [];
let decksLoaded = false;

function loadActiveDeckId() {
  return localStorage.getItem(ACTIVE_DECK_KEY) || BASIC_DECK_ID;
}

function saveActiveDeckId(deckId) {
  localStorage.setItem(ACTIVE_DECK_KEY, deckId);
}

let activeDeckId = loadActiveDeckId();

function getAllDecks() {
  return [
    { id: BASIC_DECK_ID, name: "Basic Deck", isBasic: true, cards: VOCAB_DATA },
    ...personalDecks
  ];
}

function getDeckById(deckId) {
  return getAllDecks().find(d => d.id === deckId) || null;
}

function getActiveDeck() {
  return getDeckById(activeDeckId) || getDeckById(BASIC_DECK_ID);
}

function getActiveDeckCards() {
  return getActiveDeck().cards;
}

/**
 * Chuẩn hoá câu ví dụ của 1 thẻ về dạng mảng [{example, exampleVi, blankWord}], bất kể thẻ là:
 *  - Basic Deck (VOCAB_DATA): 1 câu ví dụ duy nhất ở dạng field đơn `example`/`exampleVi`/`blankWord`.
 *  - Deck cá nhân: tối đa 5 câu ví dụ ở dạng mảng `examples`, mỗi câu tự mang `blankWord` riêng
 *    (vì tiếng Hàn chia động từ/tính từ theo ngữ cảnh — dạng gốc như "회자되다" hầu như không xuất
 *    hiện y nguyên trong câu thật, mỗi câu có thể chia thành 1 dạng khác nhau).
 */
function getCardExamples(card) {
  if (Array.isArray(card.examples)) return card.examples;
  if (card.example) return [{ example: card.example, exampleVi: card.exampleVi, blankWord: card.blankWord }];
  return [];
}

/** Gọi Google Apps Script và đọc JSON trả về (khác sendProgressToGAS: cần đọc kết quả nên không dùng no-cors). */
async function callGAS(payload) {
  const response = await fetch(GAS_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  });
  return response.json();
}

async function fetchPersonalDecks() {
  const user = firebaseAuth.currentUser;
  if (!user) {
    personalDecks = [];
    decksLoaded = true;
    return;
  }
  try {
    const idToken = await user.getIdToken();
    const result = await callGAS({ mode: "listDecks", idToken });
    personalDecks = result.success ? result.decks : [];
    if (!result.success) console.warn("Không tải được deck cá nhân:", result.error);
  } catch (err) {
    console.warn("Lỗi khi tải deck cá nhân:", err);
    personalDecks = [];
  } finally {
    decksLoaded = true;
  }
}

async function loadLearningSources() {
  const list = document.getElementById("sourceHistoryList");
  if (!firebaseAuth.currentUser) {
    learningSources = [];
    list.innerHTML = "<p class=\"hint-text\">Đăng nhập Google để lưu và xem history nguồn học.</p>";
    document.getElementById("btnAnalyzeSource").disabled = true;
    document.getElementById("sourceLoginHint").textContent = "Đăng nhập Google trong tab Tôi để dùng nguồn học cá nhân.";
    return;
  }

  document.getElementById("btnAnalyzeSource").disabled = false;
  document.getElementById("sourceLoginHint").textContent = "Đoạn nhập và từ đã trích xuất được lưu riêng theo tài khoản Google của bạn.";
  list.innerHTML = "<p class=\"hint-text\">Đang tải history...</p>";
  try {
    const idToken = await firebaseAuth.currentUser.getIdToken();
    const result = await callGAS({ mode: "listLearningSources", idToken });
    if (!result.success) throw new Error(result.error || "Không tải được history.");
    learningSources = result.sources || [];
    renderLearningSources();
  } catch (err) {
    list.textContent = "Không tải được history: " + err.message;
  }
}

async function createPersonalDeck(name) {
  const user = firebaseAuth.currentUser;
  if (!user) return null;
  const idToken = await user.getIdToken();
  const result = await callGAS({ mode: "createDeck", idToken, deckName: name });
  if (!result.success) {
    showToast("⚠️ Không tạo được deck: " + (result.error || "Lỗi không rõ"));
    return null;
  }
  const deck = { id: result.deckId, name: result.name, cards: [] };
  personalDecks.push(deck);
  return deck;
}

async function deletePersonalDeck(deckId) {
  const user = firebaseAuth.currentUser;
  if (!user) return;
  const idToken = await user.getIdToken();
  const result = await callGAS({ mode: "deleteDeck", idToken, deckId });
  if (!result.success) {
    showToast("⚠️ Không xoá được deck: " + (result.error || "Lỗi không rõ"));
    return;
  }
  const deck = personalDecks.find(d => d.id === deckId);
  if (deck) {
    deck.cards.forEach(c => delete srsProgress[c.id]);
    saveSrsProgress(srsProgress);
  }
  personalDecks = personalDecks.filter(d => d.id !== deckId);
  if (activeDeckId === deckId) {
    activeDeckId = BASIC_DECK_ID;
    saveActiveDeckId(activeDeckId);
  }
}

async function addCardToDeck(deckId, cardData, sourceLink = {}) {
  const user = firebaseAuth.currentUser;
  if (!user) return null;
  const deck = personalDecks.find(d => d.id === deckId);
  if (!deck) return null;

  const idToken = await user.getIdToken();
  const examples = cardData.examples || [];
  const result = await callGAS({
    mode: "addCard", idToken, deckId, deckName: deck.name,
    kr: cardData.kr, romaja: cardData.romaja || "", vi: cardData.vi,
    examples, sourceId: sourceLink.sourceId || "", extractionId: sourceLink.extractionId || ""
  });
  if (!result.success) {
    showToast("⚠️ Không thêm được thẻ: " + (result.error || "Lỗi không rõ"));
    return null;
  }

  const card = {
    id: result.cardId, kr: cardData.kr, romaja: cardData.romaja || "", vi: cardData.vi,
    examples, sourceId: sourceLink.sourceId || "", extractionId: sourceLink.extractionId || ""
  };
  if (!result.alreadyExists) deck.cards.push(card);
  else card.alreadyExists = true;
  return card;
}

async function updateCardInDeck(deckId, cardId, cardData) {
  const user = firebaseAuth.currentUser;
  if (!user) return;
  const deck = personalDecks.find(d => d.id === deckId);
  const card = deck && deck.cards.find(c => c.id === cardId);
  if (!card) return;

  const idToken = await user.getIdToken();
  const examples = cardData.examples || [];
  const result = await callGAS({
    mode: "updateCard", idToken, deckId, cardId,
    kr: cardData.kr, romaja: cardData.romaja || "", vi: cardData.vi,
    examples
  });
  if (!result.success) {
    showToast("⚠️ Không cập nhật được thẻ: " + (result.error || "Lỗi không rõ"));
    return;
  }

  card.kr = cardData.kr;
  card.romaja = cardData.romaja || "";
  card.vi = cardData.vi;
  card.examples = examples;
}

async function deleteCardFromDeck(deckId, cardId) {
  const user = firebaseAuth.currentUser;
  if (!user) return;
  const idToken = await user.getIdToken();
  const result = await callGAS({ mode: "deleteCard", idToken, deckId, cardId });
  if (!result.success) {
    showToast("⚠️ Không xoá được thẻ: " + (result.error || "Lỗi không rõ"));
    return;
  }
  const deck = personalDecks.find(d => d.id === deckId);
  if (deck) deck.cards = deck.cards.filter(c => c.id !== cardId);
  delete srsProgress[cardId];
  saveSrsProgress(srsProgress);
}

/* --------------------------------------------------------------------------
   2. THUẬT TOÁN SPACED REPETITION (SRS) CƠ BẢN
   Mỗi từ có 1 "level" (0 -> 6). Level càng cao, khoảng cách ôn tập càng dài.
   -------------------------------------------------------------------------- */
const SRS_INTERVALS_DAYS = [0, 0.0007, 1, 3, 7, 15, 30]; // level 1 ~ 1 phút để test nhanh
const SRS_STORAGE_KEY = "koreanApp_srsProgress_v1";

function loadSrsProgress() {
  try {
    const raw = localStorage.getItem(SRS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error("Lỗi đọc dữ liệu SRS:", e);
    return {};
  }
}

function saveSrsProgress(progress) {
  try {
    localStorage.setItem(SRS_STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    console.error("Lỗi lưu dữ liệu SRS:", e);
  }
}

let srsProgress = loadSrsProgress();

function getCardState(id) {
  if (!srsProgress[id]) {
    srsProgress[id] = { level: 0, due: Date.now(), reviews: 0 };
  }
  return srsProgress[id];
}

function isDue(id) {
  const state = getCardState(id);
  return state.due <= Date.now();
}

function isBasicDeckCard(id) {
  return VOCAB_DATA.some(v => v.id === id);
}

function markRemembered(id) {
  const state = getCardState(id);
  state.level = Math.min(state.level + 1, SRS_INTERVALS_DAYS.length - 1);
  state.reviews += 1;
  const intervalDays = SRS_INTERVALS_DAYS[state.level];
  state.due = Date.now() + intervalDays * 24 * 60 * 60 * 1000;
  saveSrsProgress(srsProgress);
  // Chỉ đồng bộ lên sheet chung với thẻ thuộc Basic Deck (ID ổn định, giống nhau ở mọi người) —
  // thẻ deck cá nhân không đồng bộ vì ID/nội dung là riêng theo từng người, dễ gây nhầm lẫn.
  if (isBasicDeckCard(id)) sendProgressToGAS(id, "remember", state.level);
}

function markForgotten(id) {
  const state = getCardState(id);
  state.level = 0;
  state.reviews += 1;
  state.due = Date.now() + 5 * 1000; // ôn lại gần như ngay lập tức (5 giây)
  saveSrsProgress(srsProgress);
  if (isBasicDeckCard(id)) sendProgressToGAS(id, "forget", state.level);
}

function getVocabStatusLabel(id) {
  const state = getCardState(id);
  if (state.reviews === 0) return { text: "Mới", cls: "status-new" };
  if (state.level >= 4) return { text: "Đã thuộc", cls: "status-mastered" };
  return { text: "Đang học", cls: "status-learning" };
}

/* --------------------------------------------------------------------------
   3. STATE CHUNG
   -------------------------------------------------------------------------- */
let currentTab = "flashcard";
let flashQueue = [];
let flashIndex = 0;
let isFlipped = false;

let clozeQueue = [];
let clozeIndex = 0;
let clozeAnswered = false;
let learningSources = [];
let currentPracticeSource = null;
let practiceLines = [];
let practiceIndex = 0;

/* --------------------------------------------------------------------------
   4. TIỆN ÍCH CHUNG
   -------------------------------------------------------------------------- */
function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2200);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  })[character]);
}

function updateStatsPill() {
  const cards = getActiveDeckCards();
  const dueCount = cards.filter(v => isDue(v.id)).length;
  const masteredCount = cards.filter(v => getCardState(v.id).level >= 4).length;
  document.getElementById("statDue").textContent = dueCount;
  document.getElementById("statLearned").textContent = masteredCount;
}

function updateActiveDeckLabels() {
  const deckName = getActiveDeck().name;
  const text = `📚 Đang học: ${deckName}`;
  const clozeLabel = document.getElementById("clozeActiveDeckLabel");
  const lookupLabel = document.getElementById("lookupActiveDeckLabel");
  if (clozeLabel) clozeLabel.textContent = text;
  if (lookupLabel) lookupLabel.textContent = text;
  renderDeckSelector();
}

/* --------------------------------------------------------------------------
   5. CHUYỂN TAB
   -------------------------------------------------------------------------- */
function initTabs() {
  const tabButtons = document.querySelectorAll(".tab-btn");

  tabButtons.forEach((btn, index) => {
    btn.addEventListener("click", () => {
      switchTab(btn.dataset.tab, index);
    });
  });

  moveIndicatorTo(0);
  window.addEventListener("resize", () => {
    const activeIndex = [...tabButtons].findIndex(btn => btn.dataset.tab === currentTab);
    if (activeIndex >= 0) moveIndicatorTo(activeIndex);
  });
}

function moveIndicatorTo(index) {
  const nav = document.querySelector(".tab-nav");
  const indicator = document.getElementById("tabIndicator");
  const button = nav.querySelectorAll(".tab-btn")[index];
  if (!button) return;

  const navRect = nav.getBoundingClientRect();
  const buttonRect = button.getBoundingClientRect();
  const baseLeft = Number.parseFloat(getComputedStyle(indicator).left) || 0;
  indicator.style.width = `${buttonRect.width}px`;
  indicator.style.transform = `translateX(${buttonRect.left - navRect.left - baseLeft}px)`;
}

function switchTab(tabName, index) {
  currentTab = tabName;

  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });

  document.querySelectorAll(".tab-panel").forEach(panel => {
    panel.classList.toggle("active", panel.id === `panel-${tabName}`);
  });

  moveIndicatorTo(index);

  if (tabName === "flashcard") {
    refreshFlashQueue();
  } else if (tabName === "cloze") {
    refreshClozeQueue();
  } else if (tabName === "lookup") {
    updateActiveDeckLabels();
    renderVocabList();
  } else if (tabName === "library") {
    showDeckListView();
  } else if (tabName === "sources") {
    loadLearningSources();
  }
}

/* --------------------------------------------------------------------------
   6. TAB 1 — FLASHCARD + SRS
   -------------------------------------------------------------------------- */
function refreshFlashQueue() {
  updateActiveDeckLabels();
  flashQueue = getActiveDeckCards().filter(v => isDue(v.id));
  flashIndex = 0;
  isFlipped = false;
  renderFlashcard();
  updateStatsPill();
}

function renderFlashcard() {
  const zone = document.getElementById("flashcardZone");
  const actions = document.getElementById("flashActions");
  const emptyState = document.getElementById("flashEmptyState");
  const flashcardEl = document.getElementById("flashcard");
  const totalCards = getActiveDeckCards().length;

  if (flashQueue.length === 0 || flashIndex >= flashQueue.length) {
    zone.style.display = "none";
    actions.style.display = "none";
    emptyState.style.display = "block";
    document.getElementById("flashProgressFill").style.width = "100%";
    document.getElementById("flashProgressLabel").textContent = `${totalCards} / ${totalCards}`;

    const emptyTitle = document.getElementById("flashEmptyTitle");
    const emptyText = document.getElementById("flashEmptyText");
    const reviewBtn = document.getElementById("btnReviewAllAgain");
    if (totalCards === 0) {
      emptyTitle.textContent = "Deck này chưa có thẻ nào";
      emptyText.textContent = "Vào tab Thư viện để thêm flashcard cho deck này nhé.";
      reviewBtn.style.display = "none";
    } else {
      emptyTitle.textContent = "Tuyệt vời! Bạn đã ôn hết thẻ hôm nay";
      emptyText.textContent = "Quay lại sau để tiếp tục ôn tập theo lịch lặp lại ngắt quãng.";
      reviewBtn.style.display = "inline-flex";
    }
    return;
  }

  zone.style.display = "flex";
  actions.style.display = "flex";
  emptyState.style.display = "none";

  const card = flashQueue[flashIndex];
  const state = getCardState(card.id);

  isFlipped = false;
  flashcardEl.classList.remove("flipped");

  document.getElementById("cardKr").textContent = card.kr;
  document.getElementById("cardRomaja").textContent = card.romaja;
  document.getElementById("cardVi").textContent = card.vi;
  const firstExample = getCardExamples(card)[0];
  const exampleEl = document.getElementById("cardExample");
  exampleEl.textContent = firstExample ? `"${firstExample.example}"` : "";
  exampleEl.style.display = firstExample ? "block" : "none";

  const levelBadge = document.getElementById("cardLevelBadge");
  if (state.reviews === 0) levelBadge.textContent = "Mới";
  else levelBadge.textContent = `Cấp độ ${state.level}`;

  const total = totalCards;
  const done = total - flashQueue.length + flashIndex;
  document.getElementById("flashProgressFill").style.width = `${(done / total) * 100}%`;
  document.getElementById("flashProgressLabel").textContent = `${done} / ${total}`;
}

function flipFlashcard() {
  isFlipped = !isFlipped;
  document.getElementById("flashcard").classList.toggle("flipped", isFlipped);
}

function nextFlashcard() {
  flashIndex += 1;
  renderFlashcard();
  updateStatsPill();
}

function initFlashcardTab() {
  document.getElementById("flashcard").addEventListener("click", flipFlashcard);

  document.getElementById("flashDeckSelector").addEventListener("change", (e) => {
    changeActiveDeck(e.target.value);
  });

  document.getElementById("btnRemember").addEventListener("click", () => {
    if (flashQueue.length === 0) return;
    const card = flashQueue[flashIndex];
    markRemembered(card.id);
    showToast(`✓ Đã ghi nhớ "${card.kr}"`);
    nextFlashcard();
  });

  document.getElementById("btnForget").addEventListener("click", () => {
    if (flashQueue.length === 0) return;
    const card = flashQueue[flashIndex];
    markForgotten(card.id);
    showToast(`Sẽ ôn lại "${card.kr}" sớm hơn`);
    nextFlashcard();
  });

  document.getElementById("btnReviewAllAgain").addEventListener("click", () => {
    getActiveDeckCards().forEach(v => {
      const state = getCardState(v.id);
      state.due = Date.now();
    });
    saveSrsProgress(srsProgress);
    refreshFlashQueue();
  });
}

/* --------------------------------------------------------------------------
   7. TAB 2 — CLOZE TEST (ĐIỀN TỪ)
   -------------------------------------------------------------------------- */
function refreshClozeQueue() {
  updateActiveDeckLabels();
  // Mỗi câu ví dụ của mỗi thẻ trở thành 1 câu hỏi riêng — thẻ có nhiều câu ví dụ
  // (deck cá nhân, tối đa 5) sẽ xuất hiện nhiều lần với câu khác nhau. blankWord lấy
  // theo TỪNG câu (không dùng chung từ gốc của thẻ) vì tiếng Hàn chia động từ/tính từ
  // theo ngữ cảnh — mỗi câu có thể chứa 1 dạng chia khác nhau của cùng 1 từ.
  const items = getActiveDeckCards().flatMap(card =>
    getCardExamples(card)
      .filter(ex => ex.example && ex.example.trim() && ex.blankWord && ex.example.includes(ex.blankWord))
      .map(ex => ({ cardId: card.id, kr: card.kr, example: ex.example, exampleVi: ex.exampleVi, blankWord: ex.blankWord }))
  );
  clozeQueue = shuffleArray(items);
  clozeIndex = 0;
  clozeAnswered = false;
  renderClozeQuestion();
}

function buildClozeOptions(correctWord) {
  const allBlankWords = getActiveDeckCards().flatMap(card =>
    [...getCardExamples(card).map(ex => ex.blankWord).filter(Boolean), card.kr].filter(Boolean)
  );
  const candidates = [...new Set(allBlankWords)].filter(word => word !== correctWord);
  const endings = ["습니다", "ㅂ니다", "어요", "아요", "해요", "했어요", "입니다", "예요", "다", "요"];
  const endingOf = word => endings.find(ending => word.endsWith(ending)) || "";
  const initialSyllable = word => word.charAt(0);
  const similarity = word => {
    const lengthDifference = Math.abs(word.length - correctWord.length);
    let score = Math.max(0, 4 - lengthDifference * 2);
    if (initialSyllable(word) === initialSyllable(correctWord)) score += 4;
    if (endingOf(word) && endingOf(word) === endingOf(correctWord)) score += 3;
    if (word.includes(correctWord.slice(0, 2)) || correctWord.includes(word.slice(0, 2))) score += 2;
    return score;
  };
  const distractors = shuffleArray(candidates)
    .sort((left, right) => similarity(right) - similarity(left))
    .slice(0, 3);
  return shuffleArray([correctWord, ...distractors]);
}

function renderClozeQuestion() {
  const total = clozeQueue.length;

  document.getElementById("btnClozeNext").style.display = "none";
  document.getElementById("clozeFeedback").textContent = "";
  document.getElementById("clozeFeedback").className = "cloze-feedback";

  if (clozeIndex >= total) {
    document.getElementById("clozeSentence").innerHTML = total === 0
      ? "Deck này chưa có câu ví dụ nào để làm bài điền từ."
      : "🎉 Bạn đã hoàn thành toàn bộ bài tập điền từ!";
    document.getElementById("clozeTranslation").textContent = total === 0
      ? "Vào tab Thư viện để thêm thẻ có kèm câu ví dụ."
      : "";
    document.getElementById("clozeOptions").innerHTML = "";
    document.getElementById("clozeProgressFill").style.width = "100%";
    document.getElementById("clozeProgressLabel").textContent = `${total} / ${total}`;

    if (total > 0) {
      const restartBtn = document.createElement("button");
      restartBtn.className = "btn btn-primary btn-block";
      restartBtn.textContent = "Làm lại từ đầu";
      restartBtn.addEventListener("click", refreshClozeQueue);
      document.getElementById("clozeOptions").appendChild(restartBtn);
    }
    return;
  }

  clozeAnswered = false;
  const item = clozeQueue[clozeIndex];
  const sentenceEl = document.getElementById("clozeSentence");
  const blankIndex = item.example.indexOf(item.blankWord);
  sentenceEl.replaceChildren(
    document.createTextNode(item.example.slice(0, blankIndex)),
    Object.assign(document.createElement("span"), {
      className: "cloze-blank",
      id: "clozeBlankSpan",
      textContent: "_____"
    }),
    document.createTextNode(item.example.slice(blankIndex + item.blankWord.length))
  );
  document.getElementById("clozeTranslation").textContent = item.exampleVi;

  const options = buildClozeOptions(item.blankWord);
  const optionsWrap = document.getElementById("clozeOptions");
  optionsWrap.innerHTML = "";

  options.forEach(opt => {
    const btn = document.createElement("button");
    btn.className = "cloze-option-btn";
    btn.textContent = opt;
    btn.addEventListener("click", () => handleClozeAnswer(opt, item.blankWord, btn));
    optionsWrap.appendChild(btn);
  });

  document.getElementById("clozeProgressFill").style.width = `${(clozeIndex / total) * 100}%`;
  document.getElementById("clozeProgressLabel").textContent = `${clozeIndex} / ${total}`;
}

function handleClozeAnswer(selected, correct, btnEl) {
  if (clozeAnswered) return;
  clozeAnswered = true;

  const allButtons = document.querySelectorAll(".cloze-option-btn");
  allButtons.forEach(b => (b.disabled = true));

  const blankSpan = document.getElementById("clozeBlankSpan");
  const feedbackEl = document.getElementById("clozeFeedback");

  if (selected === correct) {
    btnEl.classList.add("correct");
    if (blankSpan) {
      blankSpan.textContent = correct;
      blankSpan.classList.add("filled-correct");
    }
    feedbackEl.textContent = "✓ Chính xác! Làm tốt lắm.";
    feedbackEl.classList.add("ok");
  } else {
    btnEl.classList.add("wrong");
    allButtons.forEach(b => {
      if (b.textContent === correct) b.classList.add("correct");
    });
    if (blankSpan) {
      blankSpan.textContent = correct;
      blankSpan.classList.add("filled-wrong");
    }
    feedbackEl.textContent = `✕ Chưa đúng. Đáp án đúng là "${correct}".`;
    feedbackEl.classList.add("bad");
  }

  document.getElementById("btnClozeNext").style.display = "inline-flex";
}

function initClozeTab() {
  document.getElementById("btnClozeNext").addEventListener("click", () => {
    clozeIndex += 1;
    renderClozeQuestion();
  });
}

/* --------------------------------------------------------------------------
   8. TAB 3 — TRA CỨU & AI CHẤM ĐIỂM
   -------------------------------------------------------------------------- */
function renderVocabList(filterText = "") {
  const listEl = document.getElementById("vocabList");
  listEl.innerHTML = "";

  const query = filterText.trim().toLowerCase();
  const filtered = getActiveDeckCards().filter(v =>
    v.kr.toLowerCase().includes(query) ||
    v.vi.toLowerCase().includes(query) ||
    (v.romaja || "").toLowerCase().includes(query)
  );

  if (filtered.length === 0) {
    listEl.innerHTML = `<p style="color:var(--color-text-soft); font-size:14px;">Không tìm thấy từ vựng phù hợp.</p>`;
    return;
  }

  filtered.forEach(v => {
    const status = getVocabStatusLabel(v.id);
    const item = document.createElement("div");
    item.className = "vocab-item";
    item.innerHTML = `
      <div>
        <div class="vocab-item-kr">${escapeHtml(v.kr)}</div>
        <div class="vocab-item-romaja">${escapeHtml(v.romaja)}</div>
        <span class="vocab-item-status ${status.cls}">${status.text}</span>
      </div>
      <div class="vocab-item-vi">${escapeHtml(v.vi)}</div>
    `;
    listEl.appendChild(item);
  });
}

function initLookupTab() {
  document.getElementById("searchVocab").addEventListener("input", (e) => {
    renderVocabList(e.target.value);
  });

  // Câu ví dụ ngẫu nhiên
  pickRandomSampleSentence();
  document.getElementById("btnRandomSentence").addEventListener("click", pickRandomSampleSentence);

  // Nút chấm điểm AI
  document.getElementById("btnGrade").addEventListener("click", handleGradeTranslation);
}

/* --------------------------------------------------------------------------
   8b2. TAB 5 — TÔI (tài khoản Google, Gemini API Key, cài đặt/vá dữ liệu)
   -------------------------------------------------------------------------- */
function initMeTab() {
  // API Key Gemini — dùng chung cho AI chấm điểm (Tra cứu & AI) và AI tạo thẻ (Thư viện)
  const apiKeyInput = document.getElementById("apiKeyInput");
  apiKeyInput.value = localStorage.getItem("koreanApp_geminiKey") || "";

  document.getElementById("btnSaveKey").addEventListener("click", () => {
    const key = apiKeyInput.value.trim();
    if (!key) {
      showToast("Vui lòng nhập API Key trước khi lưu");
      return;
    }
    localStorage.setItem("koreanApp_geminiKey", key);
    showToast("✓ Đã lưu API Key");
  });

  // Đồng bộ Google (Sign-In)
  document.getElementById("btnGoogleSignIn").addEventListener("click", signInWithGoogle);
  document.getElementById("btnGoogleSignOut").addEventListener("click", signOutGoogle);
  updateGoogleSyncUI();

  // Vá dữ liệu câu ví dụ cũ
  document.getElementById("btnRepairBlankWords").addEventListener("click", handleRepairBlankWords);
}

let currentSampleSentence = null;

function flattenExamplesForCards(cards) {
  return cards.flatMap(card =>
    getCardExamples(card)
      .filter(ex => ex.example && ex.example.trim())
      .map(ex => ({ id: card.id, example: ex.example, exampleVi: ex.exampleVi }))
  );
}

function pickRandomSampleSentence() {
  let pool = flattenExamplesForCards(getActiveDeckCards());
  if (pool.length === 0) pool = flattenExamplesForCards(VOCAB_DATA);
  const randomItem = pool[Math.floor(Math.random() * pool.length)];
  currentSampleSentence = randomItem;
  document.getElementById("sampleSentenceBox").textContent = randomItem.example;
}

/* --------------------------------------------------------------------------
   8b. TAB 4 — THƯ VIỆN (LIBRARY / DECKS)
   -------------------------------------------------------------------------- */
let editingDeckId = null; // deck đang được quản lý thẻ (trong deckDetailView)
let editingCardId = null; // null = đang thêm thẻ mới, có giá trị = đang sửa thẻ đó

function initLibraryTab() {
  document.getElementById("btnCreateDeck").addEventListener("click", async () => {
    const input = document.getElementById("newDeckNameInput");
    const name = input.value.trim();
    if (!name) {
      showToast("Vui lòng nhập tên deck");
      return;
    }
    const deck = await createPersonalDeck(name);
    if (deck) {
      input.value = "";
      showToast(`✓ Đã tạo deck "${name}"`);
      renderDeckGrid();
    }
  });

  document.getElementById("btnBackToDecks").addEventListener("click", showDeckListView);

  document.getElementById("btnSaveCard").addEventListener("click", handleSaveCard);
  document.getElementById("btnGenerateAllExamples").addEventListener("click", handleGenerateAllExamples);

  setupAiAutoFill();
}

function normalizeKoreanWord(word) {
  return (word || "").normalize("NFC").toLowerCase().replace(/\s+/g, "").trim();
}

function parseGeminiJson(rawText) {
  const cleanText = rawText.replace(/```(?:json)?/gi, "").trim();
  const start = cleanText.indexOf("{");
  const end = cleanText.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("AI trả về JSON không hợp lệ.");
  return JSON.parse(cleanText.slice(start, end + 1));
}

async function handleAnalyzeSource() {
  const apiKey = localStorage.getItem("koreanApp_geminiKey");
  const content = document.getElementById("sourceTextInput").value.trim();
  const titleInput = document.getElementById("sourceTitleInput");
  const status = document.getElementById("sourceImportStatus");
  const button = document.getElementById("btnAnalyzeSource");
  if (!firebaseAuth.currentUser) return showToast("⚠️ Đăng nhập Google trước khi lưu nguồn học");
  if (!apiKey) return showToast("⚠️ Hãy lưu Gemini API Key trong tab Tôi trước");
  if (!content) return showToast("⚠️ Hãy nhập đoạn văn hoặc hội thoại trước");
  if (content.length > 20000) return showToast("⚠️ Nội dung tối đa 20.000 ký tự");

  const knownWords = [...new Set(getAllDecks().flatMap(deck => deck.cards.map(card => card.kr)).filter(Boolean))];
  const prompt = `Đọc nội dung tiếng Hàn dưới đây và tìm tối đa 30 từ hoặc cụm từ đáng học, KHÔNG có trong danh sách từ đã biết.
Từ tiếng Hàn có thể bị chia; hãy trả về dạng từ điển trong "kr" và đúng dạng xuất hiện trong đoạn ở "surface".
Chỉ lấy từ/cụm thực sự có trong nguồn, ưu tiên từ hữu ích, tránh tên riêng và từ chức năng quá cơ bản.
Mỗi từ cần romaja, nghĩa Việt ngắn, một ngữ cảnh trích nguyên văn ngắn từ nguồn và 1-2 câu ví dụ mới bám sát chủ đề/văn phong nguồn. Mỗi ví dụ gồm example, exampleVi, blankWord; blankWord phải xuất hiện nguyên dạng trong example.
Danh sách từ đã biết: ${JSON.stringify(knownWords)}
Nguồn:
${content}

Trả về JSON duy nhất dạng {"words":[{"kr":"...","romaja":"...","vi":"...","surface":"...","context":"...","examples":[{"example":"...","exampleVi":"...","blankWord":"..."}]}]}.`;

  button.disabled = true;
  status.textContent = "Đang phân tích nội dung và tạo ví dụ theo ngữ cảnh...";
  try {
    const parsed = parseGeminiJson(await callGeminiText(apiKey, prompt));
    const known = new Set(knownWords.map(normalizeKoreanWord));
    const seen = new Set();
    const words = (Array.isArray(parsed.words) ? parsed.words : []).filter(word => {
      const key = normalizeKoreanWord(word.kr);
      if (!key || !word.vi || known.has(key) || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).map(word => ({
      ...word,
      examples: (Array.isArray(word.examples) ? word.examples : []).filter(example =>
        example.example && example.exampleVi && example.blankWord && example.example.includes(example.blankWord)
      ).slice(0, 2)
    })).filter(word => word.examples.length > 0);

    const idToken = await firebaseAuth.currentUser.getIdToken();
    const result = await callGAS({
      mode: "saveLearningSource", idToken, title: titleInput.value.trim(), content, words
    });
    if (!result.success) throw new Error(result.error || "Không lưu được nguồn học.");
    document.getElementById("sourceTextInput").value = "";
    titleInput.value = "";
    status.textContent = `Đã lưu nguồn và ${result.savedCount} từ mới. Mở history bên dưới để duyệt và thêm vào deck.`;
    await loadLearningSources();
  } catch (err) {
    status.textContent = "Không thể phân tích/lưu nội dung: " + err.message;
  } finally {
    button.disabled = false;
  }
}

async function updateExtractionStatus(extractionId, status) {
  const idToken = await firebaseAuth.currentUser.getIdToken();
  const result = await callGAS({ mode: "updateExtraction", idToken, extractionId, status });
  if (!result.success) throw new Error(result.error || "Không cập nhật được trạng thái.");
}

function renderLearningSources() {
  const list = document.getElementById("sourceHistoryList");
  list.replaceChildren();
  if (!learningSources.length) {
    list.innerHTML = "<p class=\"hint-text\">Chưa có nguồn học nào. Nhập một đoạn ở trên để bắt đầu.</p>";
    return;
  }

  learningSources.forEach(source => {
    const article = document.createElement("article");
    article.className = "source-history-item";
    const heading = document.createElement("div");
    heading.className = "source-history-heading";
    const title = document.createElement("h3");
    title.className = "source-history-title";
    title.textContent = source.title;
    const actions = document.createElement("div");
    actions.className = "deck-card-item-actions";
    const practiceButton = document.createElement("button");
    practiceButton.className = "btn btn-secondary btn-sm";
    practiceButton.textContent = "Luyện dịch";
    practiceButton.addEventListener("click", () => startPracticeFromSource(source));
    const deleteButton = document.createElement("button");
    deleteButton.className = "btn btn-tertiary btn-sm";
    deleteButton.textContent = "Xóa nguồn";
    deleteButton.addEventListener("click", async () => {
      if (!confirm("Xóa nội dung nguồn và history từ đã trích xuất? Các thẻ đã thêm vào deck sẽ được giữ lại.")) return;
      const idToken = await firebaseAuth.currentUser.getIdToken();
      const result = await callGAS({ mode: "deleteLearningSource", idToken, sourceId: source.id });
      if (!result.success) return showToast("⚠️ " + (result.error || "Không xóa được nguồn"));
      learningSources = learningSources.filter(item => item.id !== source.id);
      renderLearningSources();
    });
    actions.append(practiceButton, deleteButton);
    heading.append(title, actions);
    article.appendChild(heading);

    const details = document.createElement("details");
    details.className = "source-content-details";
    const summary = document.createElement("summary");
    summary.textContent = `Xem nội dung nguồn · ${source.words.length} từ trích xuất`;
    const content = document.createElement("p");
    content.className = "source-original-text";
    content.textContent = source.content;
    details.append(summary, content);
    article.appendChild(details);

    const wordList = document.createElement("div");
    wordList.className = "source-extracted-words";
    source.words.forEach(word => wordList.appendChild(renderExtractedWord(source, word)));
    article.appendChild(wordList);
    list.appendChild(article);
  });
}

function renderExtractedWord(source, word) {
  const item = document.createElement("div");
  item.className = "source-word-item";
  const copy = document.createElement("div");
  copy.className = "source-word-copy";
  const term = document.createElement("strong");
  term.textContent = `${word.kr} · ${word.vi}`;
  const context = document.createElement("p");
  context.textContent = `${word.surface || word.kr} — ${word.context || ""}`;
  copy.append(term, context);
  const example = word.examples && word.examples[0];
  if (example) {
    const exampleLine = document.createElement("p");
    exampleLine.className = "source-word-example";
    exampleLine.textContent = `${example.example} (${example.exampleVi})`;
    copy.appendChild(exampleLine);
  }
  item.appendChild(copy);

  const controls = document.createElement("div");
  controls.className = "source-word-controls";
  const status = document.createElement("span");
  status.className = "source-word-status";
  const labels = { pending: "Chờ duyệt", skipped: "Đã bỏ qua", added: "Đã thêm", already_in_deck: "Đã có trong deck" };
  status.textContent = labels[word.status] || word.status;
  controls.appendChild(status);

  if (word.status === "pending" && personalDecks.length) {
    const select = document.createElement("select");
    select.className = "input-field source-deck-select";
    personalDecks.forEach(deck => {
      const option = document.createElement("option");
      option.value = deck.id;
      option.textContent = deck.name;
      select.appendChild(option);
    });
    const addButton = document.createElement("button");
    addButton.className = "btn btn-primary btn-sm";
    addButton.textContent = "Thêm vào deck";
    addButton.addEventListener("click", async () => {
      addButton.disabled = true;
      try {
        const card = await addCardToDeck(select.value, {
          kr: word.kr, romaja: word.romaja || "", vi: word.vi, examples: word.examples || []
        }, { sourceId: source.id, extractionId: word.id });
        if (!card) throw new Error("Không thêm được thẻ.");
        word.status = card.alreadyExists ? "already_in_deck" : "added";
        word.deckId = select.value;
        renderLearningSources();
        showToast(card.alreadyExists ? "Từ đã có trong deck, đã liên kết history." : "✓ Đã thêm từ vào deck");
      } catch (err) {
        showToast("⚠️ " + err.message);
        addButton.disabled = false;
      }
    });
    controls.append(select, addButton);
  } else if (word.status === "pending") {
    const hint = document.createElement("span");
    hint.className = "hint-text";
    hint.textContent = "Tạo deck cá nhân trong Thư viện để thêm từ.";
    controls.appendChild(hint);
  }

  if (word.status === "pending") {
    const skipButton = document.createElement("button");
    skipButton.className = "btn btn-tertiary btn-sm";
    skipButton.textContent = "Bỏ qua";
    skipButton.addEventListener("click", async () => {
      await updateExtractionStatus(word.id, "skipped");
      word.status = "skipped";
      renderLearningSources();
    });
    controls.appendChild(skipButton);
  }
  item.appendChild(controls);
  return item;
}

function initSourceTab() {
  document.getElementById("btnAnalyzeSource").addEventListener("click", handleAnalyzeSource);
  document.getElementById("btnRefreshSources").addEventListener("click", loadLearningSources);
  document.getElementById("btnGeneratePractice").addEventListener("click", generatePracticeConversation);
  document.getElementById("btnRevealPractice").addEventListener("click", revealPracticeAnswer);
  document.getElementById("btnNextPractice").addEventListener("click", nextPracticeLine);
  document.getElementById("btnSpeakPractice").addEventListener("click", speakPracticeLine);
  document.getElementById("practiceDirection").addEventListener("change", renderPracticeLine);
}

function startPracticeFromSource(source) {
  currentPracticeSource = source;
  document.getElementById("sourcePracticeBlock").style.display = "block";
  document.getElementById("practiceSourceTitle").textContent = source.title;
  document.getElementById("practiceStatus").textContent = "Tạo một hội thoại ngắn dựa trên chủ đề và cách dùng trong nguồn.";
  document.getElementById("sourcePracticeBlock").scrollIntoView({ behavior: "smooth", block: "start" });
  generatePracticeConversation();
}

async function generatePracticeConversation() {
  if (!currentPracticeSource) return showToast("Hãy chọn nguồn học trước");
  const apiKey = localStorage.getItem("koreanApp_geminiKey");
  if (!apiKey) return showToast("⚠️ Hãy lưu Gemini API Key trong tab Tôi trước");
  const button = document.getElementById("btnGeneratePractice");
  const status = document.getElementById("practiceStatus");
  button.disabled = true;
  status.textContent = "AI đang tạo hội thoại theo nguồn học...";
  try {
    const prompt = `Dựa trên đoạn tiếng Hàn bên dưới, tạo một hội thoại mô phỏng mới gồm 6-8 lượt lời tự nhiên, giữ chủ đề, tình huống và sắc thái giao tiếp tương tự nhưng không chép nguyên văn toàn bộ nguồn. Dùng từ vựng thực tế, mức độ sơ-trung cấp. Mỗi lượt có câu tiếng Hàn và bản dịch tiếng Việt chính xác.
Nguồn:
${currentPracticeSource.content}

Trả về JSON duy nhất dạng {"lines":[{"ko":"...","vi":"...","speaker":"A"}]}.`;
    const parsed = parseGeminiJson(await callGeminiText(apiKey, prompt));
    practiceLines = (Array.isArray(parsed.lines) ? parsed.lines : [])
      .filter(line => line.ko && line.vi)
      .slice(0, 12);
    if (!practiceLines.length) throw new Error("AI chưa tạo được câu luyện hợp lệ.");
    practiceIndex = 0;
    document.getElementById("btnRevealPractice").disabled = false;
    document.getElementById("btnNextPractice").disabled = false;
    document.getElementById("btnSpeakPractice").disabled = false;
    status.textContent = `${practiceLines.length} lượt hội thoại đã sẵn sàng.`;
    renderPracticeLine();
  } catch (err) {
    status.textContent = "Không tạo được hội thoại: " + err.message;
  } finally {
    button.disabled = false;
  }
}

function renderPracticeLine() {
  const sentence = document.getElementById("practiceSentence");
  const answer = document.getElementById("practiceAnswer");
  const direction = document.getElementById("practiceDirection").value;
  answer.style.display = "none";
  answer.textContent = "";
  if (!practiceLines.length) {
    sentence.textContent = "Chọn một nguồn học để bắt đầu.";
    return;
  }
  if (practiceIndex >= practiceLines.length) {
    sentence.textContent = "🎉 Bạn đã hoàn thành hội thoại.";
    document.getElementById("btnRevealPractice").disabled = true;
    document.getElementById("btnSpeakPractice").disabled = true;
    document.getElementById("btnNextPractice").textContent = "Làm lại";
    return;
  }
  const line = practiceLines[practiceIndex];
  const displayedText = direction === "ko-vi" ? line.ko : line.vi;
  sentence.textContent = `${practiceIndex + 1}/${practiceLines.length}${line.speaker ? ` · ${line.speaker}` : ""}  ${displayedText}`;
  document.getElementById("btnRevealPractice").disabled = false;
  document.getElementById("btnSpeakPractice").disabled = direction !== "ko-vi";
  document.getElementById("btnNextPractice").textContent = practiceIndex === practiceLines.length - 1 ? "Hoàn tất" : "Câu tiếp theo →";
}

function revealPracticeAnswer() {
  if (!practiceLines[practiceIndex]) return;
  const line = practiceLines[practiceIndex];
  const direction = document.getElementById("practiceDirection").value;
  const answer = document.getElementById("practiceAnswer");
  answer.textContent = direction === "ko-vi" ? line.vi : line.ko;
  answer.style.display = "block";
}

function nextPracticeLine() {
  if (practiceIndex >= practiceLines.length) {
    practiceIndex = 0;
    document.getElementById("btnRevealPractice").disabled = false;
    document.getElementById("btnSpeakPractice").disabled = false;
    document.getElementById("btnNextPractice").textContent = "Câu tiếp theo →";
  } else {
    practiceIndex += 1;
  }
  renderPracticeLine();
}

function speakPracticeLine() {
  const line = practiceLines[practiceIndex];
  if (!line || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(line.ko);
  utterance.lang = "ko-KR";
  window.speechSynthesis.speak(utterance);
}

/**
 * Quét toàn bộ deck cá nhân đang có, tìm câu ví dụ nào bị thiếu/sai `blankWord`
 * (không tìm thấy đúng cụm chữ trong câu — ví dụ do được tạo trước khi field này
 * tồn tại), dùng AI dò lại đúng dạng chữ đã xuất hiện trong câu đó rồi lưu lại.
 * An toàn để chạy lại nhiều lần: câu đã có blankWord hợp lệ sẽ được bỏ qua.
 * Đây là cơ chế chung để "vá" dữ liệu cũ mỗi khi cách lưu 1 field nào đó đổi,
 * không cần người dùng vào từng thẻ sửa tay.
 */
async function handleRepairBlankWords() {
  const apiKey = localStorage.getItem("koreanApp_geminiKey");
  if (!apiKey) {
    showToast("⚠️ Vui lòng lưu Gemini API Key ở tab Tra cứu & AI trước");
    return;
  }
  if (!firebaseAuth.currentUser) {
    showToast("⚠️ Cần đăng nhập Google trước");
    return;
  }

  const btn = document.getElementById("btnRepairBlankWords");
  const statusEl = document.getElementById("repairStatusText");
  btn.disabled = true;

  await fetchPersonalDecks(); // đảm bảo đang xét đúng dữ liệu mới nhất trên Sheet

  let checked = 0, fixed = 0, failed = 0;

  for (const deck of personalDecks) {
    for (const card of deck.cards) {
      const examples = getCardExamples(card);
      let changed = false;

      for (const ex of examples) {
        if (!ex.example) continue;
        if (ex.blankWord && ex.example.includes(ex.blankWord)) continue; // đã đúng, bỏ qua

        checked++;
        statusEl.textContent = `Đang kiểm tra... (${checked} câu, đã vá ${fixed})`;
        try {
          const detected = await detectBlankWordForExample(apiKey, card.kr, ex.example);
          if (detected && ex.example.includes(detected)) {
            ex.blankWord = detected;
            changed = true;
            fixed++;
          } else {
            failed++;
          }
        } catch (err) {
          failed++;
        }
      }

      if (changed) {
        await updateCardInDeck(deck.id, card.id, { kr: card.kr, vi: card.vi, romaja: card.romaja, examples });
      }
    }
  }

  btn.disabled = false;
  statusEl.textContent = checked === 0
    ? "✓ Không có câu ví dụ nào cần vá — dữ liệu đã ổn."
    : `✓ Đã kiểm tra ${checked} câu, vá được ${fixed}, không xác định được ${failed}.`;
  renderDeckGrid();
}

/**
 * AI xác định đúng cụm chữ mà 1 từ tiếng Hàn đã xuất hiện trong 1 câu CÓ SẴN
 * (khác aiGenerateExampleSentences: không tạo câu mới, chỉ dò lại câu đã có).
 * @returns {Promise<string>} chuỗi rỗng nếu AI không xác định được
 */
async function detectBlankWordForExample(apiKey, krWord, exampleSentence) {
  const prompt = `Cho câu tiếng Hàn sau: "${exampleSentence}".
Từ gốc (dạng từ điển) là "${krWord}". Từ này xuất hiện trong câu ở dạng chia nào?
Trả lời CHÍNH XÁC đúng cụm chữ liên tục đã xuất hiện trong câu trên (copy nguyên văn từ câu, không thêm giải thích, không thêm dấu câu thừa).`;

  const rawText = await callGeminiText(apiKey, prompt);
  return rawText.trim();
}

async function showDeckListView() {
  editingDeckId = null;
  document.getElementById("deckListView").style.display = "block";
  document.getElementById("deckDetailView").style.display = "none";

  if (!decksLoaded || firebaseAuth.currentUser) {
    // Tải lại mỗi lần vào tab để phản ánh đúng trạng thái đăng nhập hiện tại.
    document.getElementById("deckGrid").innerHTML = `<p style="color:var(--color-text-soft); font-size:14px;">Đang tải deck...</p>`;
    await fetchPersonalDecks();
  }
  renderDeckGrid();
}

function renderDeckGrid() {
  const grid = document.getElementById("deckGrid");
  const loginPrompt = document.getElementById("libraryLoginPrompt");
  const personalSection = document.getElementById("personalDecksSection");
  const isLoggedIn = !!firebaseAuth.currentUser;

  loginPrompt.style.display = isLoggedIn ? "none" : "block";
  personalSection.style.display = isLoggedIn ? "block" : "none";

  grid.innerHTML = "";

  getAllDecks().forEach(deck => {
    const tile = document.createElement("div");
    tile.className = "deck-tile";
    tile.innerHTML = `
      <div class="deck-tile-name">${deck.isBasic ? "📖" : "📁"} ${escapeHtml(deck.name)}</div>
      <div class="deck-tile-count">${deck.cards.length} thẻ</div>
      <div class="deck-tile-actions"></div>
    `;

    const actionsEl = tile.querySelector(".deck-tile-actions");

    if (!deck.isBasic) {
      const manageBtn = document.createElement("button");
      manageBtn.className = "btn btn-secondary btn-sm";
      manageBtn.textContent = "Quản lý";
      manageBtn.addEventListener("click", () => openDeckDetail(deck.id));
      actionsEl.appendChild(manageBtn);

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "btn btn-tertiary btn-sm";
      deleteBtn.textContent = "Xoá";
      deleteBtn.addEventListener("click", async () => {
        if (!confirm(`Xoá deck "${deck.name}" và toàn bộ thẻ trong đó?`)) return;
        await deletePersonalDeck(deck.id);
        showToast(`Đã xoá deck "${deck.name}"`);
        renderDeckGrid();
      });
      actionsEl.appendChild(deleteBtn);
    }

    grid.appendChild(tile);
  });

  if (isLoggedIn) {
    const addTile = document.createElement("div");
    addTile.className = "deck-tile deck-tile-add";
    addTile.innerHTML = `<div class="deck-tile-add-icon">+</div><div>Deck mới ở form trên</div>`;
    grid.appendChild(addTile);
  }
}

/** Đổi deck đang học, gọi khi người dùng chọn 1 deck khác ở dropdown trong tab Flashcard. */
function changeActiveDeck(deckId) {
  if (deckId === activeDeckId) return;
  activeDeckId = deckId;
  saveActiveDeckId(deckId);
  refreshFlashQueue();
}

/** Render lại dropdown chọn deck ở tab Flashcard, phản ánh đúng danh sách deck hiện có. */
function renderDeckSelector() {
  const select = document.getElementById("flashDeckSelector");
  if (!select) return;

  select.innerHTML = "";
  getAllDecks().forEach(deck => {
    const option = document.createElement("option");
    option.value = deck.id;
    option.textContent = `${deck.isBasic ? "📖" : "📁"} ${deck.name} (${deck.cards.length} thẻ)`;
    select.appendChild(option);
  });

  select.value = getActiveDeck().id;
}

function openDeckDetail(deckId) {
  editingDeckId = deckId;
  editingCardId = null;
  const deck = getDeckById(deckId);
  if (!deck) return;

  document.getElementById("deckListView").style.display = "none";
  document.getElementById("deckDetailView").style.display = "block";
  document.getElementById("deckDetailTitle").textContent = `📁 ${deck.name}`;
  resetCardForm();
  renderDeckCardList();
}

function resetCardForm() {
  editingCardId = null;
  lastAiFilledKr = "";
  document.getElementById("cardFormKr").value = "";
  document.getElementById("cardFormRomaja").value = "";
  document.getElementById("cardFormVi").value = "";
  document.getElementById("cardFormAiStatus").textContent = "Ngừng gõ 1 chút, AI sẽ tự điền phiên âm + nghĩa tiếng Việt (cần đã lưu Gemini API Key ở trên).";
  renderExampleSlots([]);
  document.getElementById("btnSaveCard").textContent = "Thêm thẻ";
}

/* --------------------------------------------------------------------------
   8c. AI HỖ TRỢ TẠO THẺ: tự điền phiên âm/nghĩa khi ngừng gõ từ Hàn,
   và tạo câu ví dụ theo từng slot khi bấm nút (tối đa 5 slot/thẻ).
   -------------------------------------------------------------------------- */
const MAX_EXAMPLES_PER_CARD = 5;
let aiFillDebounceTimer = null;
let lastAiFilledKr = "";

function setupAiAutoFill() {
  document.getElementById("cardFormKr").addEventListener("input", () => {
    clearTimeout(aiFillDebounceTimer);
    aiFillDebounceTimer = setTimeout(triggerAiAutoFill, 900);
  });
}

async function triggerAiAutoFill() {
  const kr = document.getElementById("cardFormKr").value.trim();
  const statusEl = document.getElementById("cardFormAiStatus");
  if (!kr || kr === lastAiFilledKr) return;

  const apiKey = localStorage.getItem("koreanApp_geminiKey");
  if (!apiKey) return; // im lặng bỏ qua nếu chưa có key, hint text đã giải thích sẵn

  lastAiFilledKr = kr;
  statusEl.textContent = "🤖 AI đang điền phiên âm + nghĩa...";
  try {
    const info = await aiFillWordInfo(apiKey, kr);
    if (document.getElementById("cardFormKr").value.trim() !== kr) return; // từ đã đổi trong lúc chờ
    if (info.romaja) document.getElementById("cardFormRomaja").value = info.romaja;
    if (info.vi) document.getElementById("cardFormVi").value = info.vi;
    statusEl.textContent = "✓ AI đã điền — bạn có thể sửa lại nếu cần.";
  } catch (err) {
    statusEl.textContent = "⚠️ AI điền thất bại: " + err.message;
  }
}

function renderExampleSlots(existingExamples) {
  const container = document.getElementById("exampleSlotsContainer");
  container.innerHTML = "";

  for (let i = 0; i < MAX_EXAMPLES_PER_CARD; i++) {
    const existing = existingExamples[i] || { example: "", exampleVi: "", blankWord: "" };
    const slot = document.createElement("div");
    slot.className = "example-slot";
    slot.innerHTML = `
      <div class="example-slot-header">
        <span class="example-slot-label">Câu ví dụ ${i + 1}</span>
      </div>
      <textarea class="input-field example-kr-input" rows="2" placeholder="Câu tiếng Hàn..."></textarea>
      <input type="text" class="input-field example-blank-input" placeholder="Từ cần khuyết trong câu này (để trống = giống từ Hàn ở trên)">
      <textarea class="input-field example-vi-input" rows="2" placeholder="Dịch tiếng Việt..."></textarea>
    `;

    slot.querySelector(".example-kr-input").value = existing.example;
    slot.querySelector(".example-blank-input").value = existing.blankWord || "";
    slot.querySelector(".example-vi-input").value = existing.exampleVi;

    container.appendChild(slot);
  }
}

async function handleGenerateAllExamples() {
  const kr = document.getElementById("cardFormKr").value.trim();
  if (!kr) {
    showToast("⚠️ Nhập từ tiếng Hàn trước khi tạo câu ví dụ");
    return;
  }
  const apiKey = localStorage.getItem("koreanApp_geminiKey");
  if (!apiKey) {
    showToast("⚠️ Vui lòng lưu Gemini API Key ở tab Tra cứu & AI trước");
    return;
  }

  const genBtn = document.getElementById("btnGenerateAllExamples");
  genBtn.disabled = true;
  genBtn.textContent = "Đang tạo 5 câu...";
  const statusEl = document.getElementById("generateExamplesStatus");
  statusEl.textContent = "🤖 Đang gọi Gemini API, có thể mất vài chục giây...";
  statusEl.className = "hint-text";

  try {
    const results = await aiGenerateExampleSentences(apiKey, kr, MAX_EXAMPLES_PER_CARD);
    if (results.length === 0) {
      const msg = "⚠️ AI không trả về câu ví dụ hợp lệ (có thể do sai định dạng hoặc từ trong câu không khớp) — thử bấm lại. Xem Console (F12) để đọc nguyên văn phản hồi của AI.";
      showToast("⚠️ AI không trả về câu ví dụ hợp lệ, thử bấm lại");
      statusEl.textContent = msg;
      statusEl.className = "hint-text status-error-text";
      console.warn("[handleGenerateAllExamples] AI trả về 0 câu hợp lệ. Kiểm tra log '[aiGenerateExampleSentences]' phía trên để xem raw text AI trả về.");
      return;
    }
    const slots = document.querySelectorAll("#exampleSlotsContainer .example-slot");
    slots.forEach((slot, i) => {
      slot.querySelector(".example-kr-input").value = results[i] ? results[i].example : "";
      slot.querySelector(".example-blank-input").value = results[i] ? results[i].blankWord : "";
      slot.querySelector(".example-vi-input").value = results[i] ? results[i].exampleVi : "";
    });
    showToast(`✓ Đã tạo ${results.length} câu ví dụ`);
    statusEl.textContent = `✓ Đã tạo ${results.length}/${MAX_EXAMPLES_PER_CARD} câu ví dụ.`;
  } catch (err) {
    console.error("[handleGenerateAllExamples] Lỗi khi gọi AI tạo câu ví dụ:", err);
    showToast("⚠️ Lỗi tạo câu ví dụ, xem chi tiết bên dưới nút");
    statusEl.textContent = "⚠️ Lỗi: " + err.message + " — xem thêm chi tiết trong Console (F12 → tab Console).";
    statusEl.className = "hint-text status-error-text";
  } finally {
    genBtn.disabled = false;
    genBtn.textContent = "✨ Tạo 5 câu bằng AI";
  }
}

function collectExamplesFromForm() {
  const kr = document.getElementById("cardFormKr").value.trim();
  const examples = [];
  document.querySelectorAll("#exampleSlotsContainer .example-slot").forEach(slot => {
    const example = slot.querySelector(".example-kr-input").value.trim();
    const exampleVi = slot.querySelector(".example-vi-input").value.trim();
    const blankWord = slot.querySelector(".example-blank-input").value.trim() || kr;
    if (example) examples.push({ example, exampleVi, blankWord });
  });
  return examples;
}

async function handleSaveCard() {
  const kr = document.getElementById("cardFormKr").value.trim();
  const vi = document.getElementById("cardFormVi").value.trim();
  const romaja = document.getElementById("cardFormRomaja").value.trim();
  const examples = collectExamplesFromForm();

  if (!kr || !vi) {
    showToast("⚠️ Vui lòng nhập ít nhất Từ tiếng Hàn và Nghĩa tiếng Việt");
    return;
  }

  const cardData = { kr, vi, romaja, examples };
  const saveBtn = document.getElementById("btnSaveCard");
  saveBtn.disabled = true;

  if (editingCardId !== null) {
    await updateCardInDeck(editingDeckId, editingCardId, cardData);
    showToast("✓ Đã cập nhật thẻ");
  } else {
    await addCardToDeck(editingDeckId, cardData);
    showToast("✓ Đã thêm thẻ mới");
  }

  saveBtn.disabled = false;
  resetCardForm();
  renderDeckCardList();
}

function renderDeckCardList() {
  const listEl = document.getElementById("deckCardList");
  listEl.innerHTML = "";

  const deck = getDeckById(editingDeckId);
  if (!deck || deck.cards.length === 0) {
    listEl.innerHTML = `<p style="color:var(--color-text-soft); font-size:14px;">Deck này chưa có thẻ nào.</p>`;
    return;
  }

  deck.cards.forEach(card => {
    const exampleCount = getCardExamples(card).length;
    const item = document.createElement("div");
    item.className = "deck-card-item";
    item.innerHTML = `
      <div class="deck-card-item-main">
        <div class="deck-card-item-kr-row">
          <span class="deck-card-item-kr">${escapeHtml(card.kr)}</span>
          ${card.romaja ? `<span class="deck-card-item-romaja">${escapeHtml(card.romaja)}</span>` : ""}
        </div>
        <div class="deck-card-item-vi">${escapeHtml(card.vi)}</div>
        ${exampleCount > 0 ? `<div class="deck-card-item-example-count">📝 ${exampleCount} câu ví dụ</div>` : ""}
      </div>
      <div class="deck-card-item-actions"></div>
    `;

    const actionsEl = item.querySelector(".deck-card-item-actions");

    const editBtn = document.createElement("button");
    editBtn.className = "btn btn-secondary btn-sm";
    editBtn.textContent = "Sửa";
    editBtn.addEventListener("click", () => {
      editingCardId = card.id;
      lastAiFilledKr = card.kr; // tránh AI tự điền lại đè lên dữ liệu đã có khi mở sửa
      document.getElementById("cardFormKr").value = card.kr;
      document.getElementById("cardFormRomaja").value = card.romaja || "";
      document.getElementById("cardFormVi").value = card.vi;
      document.getElementById("cardFormAiStatus").textContent = "Sửa từ tiếng Hàn nếu muốn AI điền lại phiên âm/nghĩa.";
      renderExampleSlots(getCardExamples(card));
      document.getElementById("btnSaveCard").textContent = "Cập nhật thẻ";
    });
    actionsEl.appendChild(editBtn);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn btn-tertiary btn-sm";
    deleteBtn.textContent = "Xoá";
    deleteBtn.addEventListener("click", async () => {
      if (!confirm(`Xoá thẻ "${card.kr}"?`)) return;
      await deleteCardFromDeck(editingDeckId, card.id);
      if (editingCardId === card.id) resetCardForm();
      renderDeckCardList();
    });
    actionsEl.appendChild(deleteBtn);

    listEl.appendChild(item);
  });
}

/* --------------------------------------------------------------------------
   9. GỌI API GEMINI ĐỂ CHẤM ĐIỂM BẢN DỊCH
   -------------------------------------------------------------------------- */
async function handleGradeTranslation() {
  const apiKey = localStorage.getItem("koreanApp_geminiKey");
  const userTranslation = document.getElementById("userTranslation").value.trim();
  const resultBox = document.getElementById("aiResult");
  const gradeBtn = document.getElementById("btnGrade");
  const gradeBtnText = document.getElementById("gradeBtnText");

  if (!apiKey) {
    showToast("⚠️ Vui lòng nhập và lưu API Key Gemini trước");
    return;
  }
  if (!userTranslation) {
    showToast("⚠️ Vui lòng nhập bản dịch của bạn");
    return;
  }
  if (!currentSampleSentence) {
    showToast("⚠️ Chưa có câu ví dụ để chấm điểm");
    return;
  }

  gradeBtn.disabled = true;
  gradeBtnText.textContent = "Đang chấm điểm...";

  try {
    const feedback = await callGeminiGrading(
      apiKey,
      currentSampleSentence.example,
      userTranslation
    );

    resultBox.style.display = "block";
    document.getElementById("aiScoreBadge").textContent = feedback.score !== null ? `${feedback.score}/10` : "N/A";
    document.getElementById("aiResultText").textContent = feedback.text;

    if (isBasicDeckCard(currentSampleSentence.id)) {
      sendProgressToGAS(currentSampleSentence.id, "ai_grading", feedback.score);
    }
  } catch (err) {
    console.error("Lỗi khi gọi Gemini API:", err);
    resultBox.style.display = "block";
    document.getElementById("aiScoreBadge").textContent = "Lỗi";
    document.getElementById("aiResultText").textContent =
      "Đã xảy ra lỗi khi kết nối với Gemini API. Vui lòng kiểm tra lại API Key hoặc kết nối mạng.\n\nChi tiết: " + err.message;
  } finally {
    gradeBtn.disabled = false;
    gradeBtnText.textContent = "✨ Chấm điểm bằng AI";
  }
}

/**
 * Gọi Gemini API (generateContent) để chấm điểm bản dịch của người dùng.
 * @param {string} apiKey - Gemini API Key do người dùng cung cấp.
 * @param {string} koreanSentence - Câu gốc tiếng Hàn.
 * @param {string} userTranslation - Bản dịch tiếng Việt của người dùng.
 * @returns {Promise<{score: number|null, text: string}>}
 */
async function callGeminiGrading(apiKey, koreanSentence, userTranslation) {
  const prompt = `Bạn là giáo viên tiếng Hàn. Câu tiếng Hàn gốc là: "${koreanSentence}".
Học viên đã dịch câu này sang tiếng Việt như sau: "${userTranslation}".

Hãy chấm điểm bản dịch trên thang điểm từ 0 đến 10 dựa trên độ chính xác về nghĩa và ngữ pháp.
Trả lời CHÍNH XÁC theo định dạng sau, không thêm bất kỳ nội dung nào khác:
Điểm: <số điểm>
Nhận xét: <nhận xét ngắn gọn 2-3 câu bằng tiếng Việt, chỉ ra điểm đúng/sai và gợi ý cải thiện>`;

  const rawText = await callGeminiText(apiKey, prompt);
  const scoreMatch = rawText.match(/Điểm:\s*(\d+(\.\d+)?)/i);
  const commentMatch = rawText.match(/Nhận xét:\s*([\s\S]*)/i);

  return {
    score: scoreMatch ? parseFloat(scoreMatch[1]) : null,
    text: commentMatch ? commentMatch[1].trim() : rawText.trim()
  };
}

/**
 * Gọi Gemini API (generateContent), trả về text thô. Dùng chung cho mọi tính năng AI trong app.
 * Tự động thử lại (tối đa 2 lần, chờ tăng dần 2s/4s) khi gặp lỗi 503 "model đang quá tải" —
 * đây là lỗi tạm thời từ phía Google (model UNAVAILABLE do spike nhu cầu), thường tự hết
 * sau vài giây, không phải lỗi do API Key hay code sai.
 */
async function callGeminiText(apiKey, prompt, retriesLeft = 2) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });

  if (!response.ok) {
    const errText = await response.text();

    if (response.status === 503 && retriesLeft > 0) {
      const delayMs = (3 - retriesLeft) * 2000; // lần 1: 2s, lần 2: 4s
      console.warn(`[callGeminiText] Model đang quá tải (503), thử lại sau ${delayMs}ms (còn ${retriesLeft} lần)...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return callGeminiText(apiKey, prompt, retriesLeft - 1);
    }

    throw new Error(`HTTP ${response.status} - ${errText}`);
  }

  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    "Không nhận được phản hồi hợp lệ từ Gemini API.";
}

/**
 * AI điền phiên âm (romaja) + nghĩa tiếng Việt cho 1 từ tiếng Hàn.
 * @returns {Promise<{romaja: string, vi: string}>}
 */
async function aiFillWordInfo(apiKey, krWord) {
  const prompt = `Từ tiếng Hàn: "${krWord}".
Trả lời CHÍNH XÁC theo định dạng sau, không thêm nội dung nào khác:
Phiên âm: <romaja của từ này>
Nghĩa: <nghĩa tiếng Việt ngắn gọn, có thể ghi vài nghĩa cách nhau bằng dấu / nếu từ có nhiều nghĩa>`;

  const rawText = await callGeminiText(apiKey, prompt);
  const romajaMatch = rawText.match(/Phiên âm:\s*(.+)/i);
  const meaningMatch = rawText.match(/Nghĩa:\s*([\s\S]*)/i);

  return {
    romaja: romajaMatch ? romajaMatch[1].trim() : "",
    vi: meaningMatch ? meaningMatch[1].trim() : ""
  };
}

/**
 * AI tạo cùng lúc N câu ví dụ tiếng Hàn (kèm dịch tiếng Việt) có chứa từ đã cho.
 * Gọi 1 lần duy nhất (không phải N lần riêng) để AI có ngữ cảnh tạo ra các câu
 * thực sự khác chủ đề/độ dài nhau, tránh tình trạng mỗi câu sinh riêng lẻ lại
 * xoay quanh cùng 1 chủ đề mặc định.
 *
 * Mỗi câu cũng yêu cầu AI trả về đúng "dạng chữ" của từ khi nó xuất hiện trong
 * câu đó (blankWord) — vì tiếng Hàn chia động từ/tính từ theo ngữ cảnh, dạng gốc
 * (krWord) hầu như không xuất hiện y nguyên trong câu tự nhiên. Nếu chỉ khuyết
 * đúng dạng gốc, tab "Điền từ" sẽ không tìm thấy chữ để tạo chỗ trống.
 * @returns {Promise<Array<{example: string, exampleVi: string, blankWord: string}>>}
 */
async function aiGenerateExampleSentences(apiKey, krWord, count) {
  const writtenCount = Math.round(count * 0.6); // vd count=5 -> 3 câu 문어체
  const spokenCount = count - writtenCount;      //              -> 2 câu 구어체

  const prompt = `Viết ${count} câu ví dụ tiếng Hàn khác nhau, mỗi câu đều có chứa từ "${krWord}" (ở dạng đã chia phù hợp ngữ cảnh câu, không cần giữ nguyên dạng gốc).
Yêu cầu bắt buộc:
- ${count} câu phải thuộc ${count} chủ đề/tình huống khác nhau (ví dụ: đời thường, công việc, học tập, du lịch, tình cảm, tin tức, trò chuyện bạn bè...) — không để 2 câu cùng chủ đề.
- Nội dung câu nên thiên về đời sống thường ngày và cách dùng thực tế (실무) mà người Hàn thực sự dùng trong công việc/cuộc sống hàng ngày — tránh câu mang tính học thuật, giáo trình, gượng gạo không tự nhiên.
- Trong ${count} câu: khoảng ${writtenCount} câu viết theo văn phong **문어체** (trang trọng/văn viết, kết thúc bằng "-다") và ${spokenCount} câu theo văn phong **구어체** (khẩu ngữ/giao tiếp đời thường, dùng "-아요/어요", "-죠", "-네요"...) — để đa dạng cách diễn đạt.
- Độ dài đa dạng: có câu ngắn, có câu trung bình, có câu dài — không để các câu dài ngắn giống nhau.
- Mỗi câu kèm bản dịch tiếng Việt tương ứng.
- Với mỗi câu, ghi rõ ĐÚNG NGUYÊN VĂN cụm chữ của từ "${krWord}" như nó xuất hiện trong câu đó (ví dụ nếu câu chia thành "회자되었습니다" thì ghi đúng "회자되었습니다", không ghi lại dạng gốc).

Trả lời CHÍNH XÁC theo định dạng sau (đánh số từ 1 đến ${count}), không thêm nội dung nào khác:
1. Câu: <câu tiếng Hàn>
Từ trong câu: <đúng cụm chữ của từ như xuất hiện trong câu này>
Dịch: <bản dịch tiếng Việt>
2. Câu: <câu tiếng Hàn>
Từ trong câu: <đúng cụm chữ của từ như xuất hiện trong câu này>
Dịch: <bản dịch tiếng Việt>
(tiếp tục đến hết ${count} câu theo đúng mẫu trên)`;

  const rawText = await callGeminiText(apiKey, prompt);
  console.log("[aiGenerateExampleSentences] Raw text AI trả về:\n" + rawText);

  const results = [];
  const skipped = [];
  const blockRegex = /\d+\.\s*Câu:\s*(.+?)\s*[\r\n]+\s*Từ trong câu:\s*(.+?)\s*[\r\n]+\s*Dịch:\s*(.+?)(?=[\r\n]+\s*\d+\.\s*Câu:|$)/gs;
  let match;
  while ((match = blockRegex.exec(rawText)) !== null) {
    const example = match[1].trim();
    const blankWord = match[2].trim();
    // Phòng trường hợp AI vẫn lỡ ghi sai/không khớp câu — bỏ qua để không tạo ra
    // câu không thể khuyết được, thay vì âm thầm lưu 1 blankWord vô nghĩa.
    if (!example.includes(blankWord)) {
      skipped.push({ example, blankWord });
      continue;
    }
    results.push({ example, exampleVi: match[3].trim(), blankWord });
  }

  if (skipped.length > 0) {
    console.warn(`[aiGenerateExampleSentences] Bỏ qua ${skipped.length} câu vì "Từ trong câu" không khớp với câu:`, skipped);
  }
  console.log(`[aiGenerateExampleSentences] Parse được ${results.length}/${count} câu hợp lệ.`);

  return results.slice(0, count);
}

/* --------------------------------------------------------------------------
   10. ĐĂNG NHẬP GOOGLE (FIREBASE AUTH) + ĐỒNG BỘ TIẾN ĐỘ VỚI GOOGLE APPS SCRIPT
   Dùng Firebase Authentication để có phiên đăng nhập bền (tự làm mới ngầm,
   không mất khi refresh trang) thay vì token gốc của Google Identity Services
   (chỉ sống ~60 phút và không tự nhớ qua các lần tải lại trang).
   URL của Apps Script Web App dùng chung cho mọi người dùng (gắn cứng sẵn).
   -------------------------------------------------------------------------- */
const GAS_URL = "https://script.google.com/macros/s/AKfycbwzFDh1tW2SziRMPZVO6a2VXwx0qQEvPETuSi3GUJI6w9eiIAWOyScDKtDebYrcUAE0/exec";

const firebaseConfig = {
  apiKey: "AIzaSyDW_XugXe6yA2WdPd4hzVNuSGttJyK62og",
  authDomain: "korean-duocards.firebaseapp.com",
  projectId: "korean-duocards",
  storageBucket: "korean-duocards.firebasestorage.app",
  messagingSenderId: "454230080460",
  appId: "1:454230080460:web:81a31ee0c5b105dc37fb69"
};
firebase.initializeApp(firebaseConfig);
const firebaseAuth = firebase.auth();

let currentGoogleUser = null; // { email, name } — cập nhật qua onAuthStateChanged

function signInWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  firebaseAuth.signInWithPopup(provider).catch(err => {
    console.error("Lỗi đăng nhập Google:", err);
    showToast("⚠️ Đăng nhập thất bại: " + err.message);
  });
}

function signOutGoogle() {
  firebaseAuth.signOut();
}

firebaseAuth.onAuthStateChanged(async user => {
  currentGoogleUser = user ? { email: user.email, name: user.displayName || user.email } : null;
  if (user) showToast(`✓ Đã đăng nhập Google: ${currentGoogleUser.name}`);
  updateGoogleSyncUI();

  // Đăng xuất -> quay về Basic Deck nếu đang học deck cá nhân, vì deck cá nhân
  // chỉ tồn tại gắn theo tài khoản đã đăng nhập.
  if (!user) {
    personalDecks = [];
    decksLoaded = true;
    if (activeDeckId !== BASIC_DECK_ID) {
      activeDeckId = BASIC_DECK_ID;
      saveActiveDeckId(activeDeckId);
    }
  } else {
    // Luôn tải deck cá nhân khi đăng nhập, không chỉ khi đang ở tab Thư viện —
    // dropdown chọn deck ở tab Flashcard cũng cần danh sách này.
    await fetchPersonalDecks();
  }

  if (currentTab === "library") renderDeckGrid();
  else if (currentTab === "flashcard") refreshFlashQueue();
  else if (currentTab === "cloze") refreshClozeQueue();
  else if (currentTab === "lookup") updateActiveDeckLabels();
  else if (currentTab === "sources") loadLearningSources();
});

function updateGoogleSyncUI() {
  const statusText = document.getElementById("gsyncStatusText");
  const signInBtn = document.getElementById("btnGoogleSignIn");
  const signOutBtn = document.getElementById("btnGoogleSignOut");

  if (currentGoogleUser) {
    statusText.textContent = `✓ Đã đăng nhập: ${currentGoogleUser.name} (${currentGoogleUser.email}) — tiến độ học đang tự động đồng bộ.`;
    signInBtn.style.display = "none";
    signOutBtn.style.display = "inline-flex";
  } else {
    statusText.textContent = "Đăng nhập Google để tự động lưu tiến độ học (đã nhớ/chưa nhớ) lên hệ thống chung.";
    signInBtn.style.display = "inline-flex";
    signOutBtn.style.display = "none";
  }
}

async function sendProgressToGAS(vocabId, action, value) {
  if (GAS_URL.startsWith("REPLACE_WITH_")) return; // Chưa cấu hình URL GAS -> bỏ qua
  const user = firebaseAuth.currentUser;
  if (!user) return; // Chưa đăng nhập Google -> chỉ lưu local, không đồng bộ

  // getIdToken() tự trả token còn hạn dùng, hoặc tự làm mới ngầm nếu đã hết hạn.
  const idToken = await user.getIdToken();

  const payload = {
    mode: "progress",
    idToken,
    vocabId,
    action,     // "remember" | "forget" | "ai_grading"
    value,      // level SRS hoặc điểm AI
    timestamp: new Date().toISOString()
  };

  try {
    await fetch(GAS_URL, {
      method: "POST",
      mode: "no-cors", // Apps Script Web App thường yêu cầu no-cors từ trình duyệt
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });
    // Do chế độ no-cors nên không thể đọc response, chỉ best-effort gửi đi.
  } catch (err) {
    console.warn("Không thể đồng bộ với Google Apps Script:", err);
  }
}

/* --------------------------------------------------------------------------
   11. KHỞI TẠO ỨNG DỤNG
   -------------------------------------------------------------------------- */
function initApp() {
  initTabs();
  initFlashcardTab();
  initClozeTab();
  initLookupTab();
  initLibraryTab();
  initSourceTab();
  initMeTab();

  refreshFlashQueue();
  updateStatsPill();

  // Tự động cập nhật số thẻ "cần ôn" mỗi phút để phản ánh SRS theo thời gian thực
  setInterval(updateStatsPill, 60 * 1000);
}

document.addEventListener("DOMContentLoaded", initApp);
