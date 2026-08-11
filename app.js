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
 * Chuẩn hoá câu ví dụ của 1 thẻ về dạng mảng [{example, exampleVi}], bất kể thẻ là:
 *  - Basic Deck (VOCAB_DATA): 1 câu ví dụ duy nhất ở dạng field đơn `example`/`exampleVi`.
 *  - Deck cá nhân: tối đa 5 câu ví dụ ở dạng mảng `examples`.
 */
function getCardExamples(card) {
  if (Array.isArray(card.examples)) return card.examples;
  if (card.example) return [{ example: card.example, exampleVi: card.exampleVi }];
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

async function addCardToDeck(deckId, cardData) {
  const user = firebaseAuth.currentUser;
  if (!user) return null;
  const deck = personalDecks.find(d => d.id === deckId);
  if (!deck) return null;

  const idToken = await user.getIdToken();
  const examples = cardData.examples || [];
  const result = await callGAS({
    mode: "addCard", idToken, deckId, deckName: deck.name,
    kr: cardData.kr, romaja: cardData.romaja || "", vi: cardData.vi,
    examples
  });
  if (!result.success) {
    showToast("⚠️ Không thêm được thẻ: " + (result.error || "Lỗi không rõ"));
    return null;
  }

  const card = {
    id: result.cardId, kr: cardData.kr, romaja: cardData.romaja || "", vi: cardData.vi,
    examples
  };
  deck.cards.push(card);
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
  const flashLabel = document.getElementById("flashActiveDeckLabel");
  const clozeLabel = document.getElementById("clozeActiveDeckLabel");
  if (flashLabel) flashLabel.textContent = text;
  if (clozeLabel) clozeLabel.textContent = text;
}

/* --------------------------------------------------------------------------
   5. CHUYỂN TAB
   -------------------------------------------------------------------------- */
function initTabs() {
  const tabButtons = document.querySelectorAll(".tab-btn");
  const indicator = document.getElementById("tabIndicator");

  tabButtons.forEach((btn, index) => {
    btn.addEventListener("click", () => {
      switchTab(btn.dataset.tab, index);
    });
  });

  // Đặt vị trí ban đầu của indicator
  moveIndicatorTo(0);
}

function moveIndicatorTo(index) {
  const indicator = document.getElementById("tabIndicator");
  indicator.style.transform = `translateX(${index * 100}%)`;
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
    renderVocabList();
  } else if (tabName === "library") {
    showDeckListView();
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
  // (deck cá nhân, tối đa 5) sẽ xuất hiện nhiều lần với câu khác nhau.
  const items = getActiveDeckCards().flatMap(card =>
    getCardExamples(card)
      .filter(ex => ex.example && ex.example.trim())
      .map(ex => ({ cardId: card.id, kr: card.kr, example: ex.example, exampleVi: ex.exampleVi, blankWord: card.kr }))
  );
  clozeQueue = shuffleArray(items);
  clozeIndex = 0;
  clozeAnswered = false;
  renderClozeQuestion();
}

function buildClozeOptions(correctWord) {
  const distractors = shuffleArray(
    getActiveDeckCards().map(v => v.kr).filter(kr => kr !== correctWord)
  ).slice(0, 3);
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
  const sentenceWithBlank = item.example.replace(
    item.blankWord,
    `<span class="cloze-blank" id="clozeBlankSpan">_____</span>`
  );

  document.getElementById("clozeSentence").innerHTML = sentenceWithBlank;
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
        <div class="vocab-item-kr">${v.kr}</div>
        <div class="vocab-item-romaja">${v.romaja}</div>
        <span class="vocab-item-status ${status.cls}">${status.text}</span>
      </div>
      <div class="vocab-item-vi">${v.vi}</div>
    `;
    listEl.appendChild(item);
  });
}

function initLookupTab() {
  document.getElementById("searchVocab").addEventListener("input", (e) => {
    renderVocabList(e.target.value);
  });

  // API Key Gemini
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

  // Câu ví dụ ngẫu nhiên
  pickRandomSampleSentence();
  document.getElementById("btnRandomSentence").addEventListener("click", pickRandomSampleSentence);

  // Nút chấm điểm AI
  document.getElementById("btnGrade").addEventListener("click", handleGradeTranslation);
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
      <div class="deck-tile-name">${deck.isBasic ? "📖" : "📁"} ${deck.name}</div>
      <div class="deck-tile-count">${deck.cards.length} thẻ</div>
      <div class="deck-tile-actions"></div>
    `;

    const actionsEl = tile.querySelector(".deck-tile-actions");

    const studyBtn = document.createElement("button");
    studyBtn.className = "btn btn-primary btn-sm";
    studyBtn.textContent = "Học deck này";
    studyBtn.addEventListener("click", () => selectDeckAndStudy(deck.id));
    actionsEl.appendChild(studyBtn);

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

function selectDeckAndStudy(deckId) {
  activeDeckId = deckId;
  saveActiveDeckId(deckId);
  switchTab("flashcard", 0);
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
    const existing = existingExamples[i] || { example: "", exampleVi: "" };
    const slot = document.createElement("div");
    slot.className = "example-slot";
    slot.innerHTML = `
      <div class="example-slot-header">
        <span class="example-slot-label">Câu ví dụ ${i + 1}</span>
      </div>
      <textarea class="input-field example-kr-input" rows="2" placeholder="Câu tiếng Hàn..."></textarea>
      <textarea class="input-field example-vi-input" rows="2" placeholder="Dịch tiếng Việt..."></textarea>
    `;

    slot.querySelector(".example-kr-input").value = existing.example;
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
  try {
    const results = await aiGenerateExampleSentences(apiKey, kr, MAX_EXAMPLES_PER_CARD);
    if (results.length === 0) {
      showToast("⚠️ AI không trả về câu ví dụ hợp lệ, thử bấm lại");
      return;
    }
    const slots = document.querySelectorAll("#exampleSlotsContainer .example-slot");
    slots.forEach((slot, i) => {
      slot.querySelector(".example-kr-input").value = results[i] ? results[i].example : "";
      slot.querySelector(".example-vi-input").value = results[i] ? results[i].exampleVi : "";
    });
    showToast(`✓ Đã tạo ${results.length} câu ví dụ`);
  } catch (err) {
    showToast("⚠️ Lỗi tạo câu ví dụ: " + err.message);
  } finally {
    genBtn.disabled = false;
    genBtn.textContent = "✨ Tạo 5 câu bằng AI";
  }
}

function collectExamplesFromForm() {
  const examples = [];
  document.querySelectorAll("#exampleSlotsContainer .example-slot").forEach(slot => {
    const example = slot.querySelector(".example-kr-input").value.trim();
    const exampleVi = slot.querySelector(".example-vi-input").value.trim();
    if (example) examples.push({ example, exampleVi });
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
          <span class="deck-card-item-kr">${card.kr}</span>
          ${card.romaja ? `<span class="deck-card-item-romaja">${card.romaja}</span>` : ""}
        </div>
        <div class="deck-card-item-vi">${card.vi}</div>
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

/** Gọi Gemini API (generateContent), trả về text thô. Dùng chung cho mọi tính năng AI trong app. */
async function callGeminiText(apiKey, prompt) {
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
 * @returns {Promise<Array<{example: string, exampleVi: string}>>}
 */
async function aiGenerateExampleSentences(apiKey, krWord, count) {
  const prompt = `Viết ${count} câu ví dụ tiếng Hàn khác nhau, mỗi câu đều có chứa đúng từ "${krWord}".
Yêu cầu bắt buộc:
- ${count} câu phải thuộc ${count} chủ đề/tình huống khác nhau (ví dụ: đời thường, công việc, học tập, du lịch, tình cảm, tin tức, trò chuyện bạn bè...) — không để 2 câu cùng chủ đề.
- Độ dài đa dạng: có câu ngắn, có câu trung bình, có câu dài — không để các câu dài ngắn giống nhau.
- Mỗi câu kèm bản dịch tiếng Việt tương ứng.

Trả lời CHÍNH XÁC theo định dạng sau (đánh số từ 1 đến ${count}), không thêm nội dung nào khác:
1. Câu: <câu tiếng Hàn>
Dịch: <bản dịch tiếng Việt>
2. Câu: <câu tiếng Hàn>
Dịch: <bản dịch tiếng Việt>
(tiếp tục đến hết ${count} câu theo đúng mẫu trên)`;

  const rawText = await callGeminiText(apiKey, prompt);
  const results = [];
  const blockRegex = /\d+\.\s*Câu:\s*(.+?)\s*[\r\n]+\s*Dịch:\s*(.+?)(?=[\r\n]+\s*\d+\.\s*Câu:|$)/gs;
  let match;
  while ((match = blockRegex.exec(rawText)) !== null) {
    results.push({ example: match[1].trim(), exampleVi: match[2].trim() });
  }
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
    if (activeDeckId !== BASIC_DECK_ID) {
      activeDeckId = BASIC_DECK_ID;
      saveActiveDeckId(activeDeckId);
    }
  }

  if (currentTab === "library") {
    await fetchPersonalDecks();
    renderDeckGrid();
  } else {
    decksLoaded = false; // tải lại khi mở tab Thư viện lần tới
  }

  if (currentTab === "flashcard") refreshFlashQueue();
  else if (currentTab === "cloze") refreshClozeQueue();
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

  refreshFlashQueue();
  updateStatsPill();

  // Tự động cập nhật số thẻ "cần ôn" mỗi phút để phản ánh SRS theo thời gian thực
  setInterval(updateStatsPill, 60 * 1000);
}

document.addEventListener("DOMContentLoaded", initApp);
