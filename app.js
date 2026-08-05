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
   Personal Decks = do người dùng tự tạo, lưu trong localStorage, không đưa
   vào app.js để tránh làm file này phình to theo thời gian.
   -------------------------------------------------------------------------- */
const BASIC_DECK_ID = "basic";
const PERSONAL_DECKS_KEY = "koreanApp_personalDecks_v1";
const ACTIVE_DECK_KEY = "koreanApp_activeDeckId_v1";
const NEXT_VOCAB_ID_KEY = "koreanApp_nextVocabId_v1";

function loadPersonalDecks() {
  try {
    const raw = localStorage.getItem(PERSONAL_DECKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Lỗi đọc dữ liệu Personal Decks:", e);
    return [];
  }
}

function savePersonalDecks(decks) {
  localStorage.setItem(PERSONAL_DECKS_KEY, JSON.stringify(decks));
}

let personalDecks = loadPersonalDecks();

function loadNextVocabId() {
  const raw = localStorage.getItem(NEXT_VOCAB_ID_KEY);
  const num = raw ? parseInt(raw, 10) : 21;
  return isNaN(num) ? 21 : num;
}

function saveNextVocabId(id) {
  localStorage.setItem(NEXT_VOCAB_ID_KEY, String(id));
}

let nextVocabId = loadNextVocabId();

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

function createPersonalDeck(name) {
  const deck = { id: "deck_" + Date.now() + "_" + Math.floor(Math.random() * 10000), name, cards: [] };
  personalDecks.push(deck);
  savePersonalDecks(personalDecks);
  return deck;
}

function deletePersonalDeck(deckId) {
  const deck = personalDecks.find(d => d.id === deckId);
  if (deck) {
    deck.cards.forEach(c => {
      delete srsProgress[c.id];
    });
    saveSrsProgress(srsProgress);
  }
  personalDecks = personalDecks.filter(d => d.id !== deckId);
  savePersonalDecks(personalDecks);
  if (activeDeckId === deckId) {
    activeDeckId = BASIC_DECK_ID;
    saveActiveDeckId(activeDeckId);
  }
}

function addCardToDeck(deckId, cardData) {
  const deck = personalDecks.find(d => d.id === deckId);
  if (!deck) return null;
  const card = {
    id: nextVocabId++,
    kr: cardData.kr,
    romaja: cardData.romaja || "",
    vi: cardData.vi,
    example: cardData.example || "",
    exampleVi: cardData.exampleVi || "",
    blankWord: cardData.kr
  };
  deck.cards.push(card);
  saveNextVocabId(nextVocabId);
  savePersonalDecks(personalDecks);
  return card;
}

function updateCardInDeck(deckId, cardId, cardData) {
  const deck = personalDecks.find(d => d.id === deckId);
  if (!deck) return;
  const card = deck.cards.find(c => c.id === cardId);
  if (!card) return;
  card.kr = cardData.kr;
  card.romaja = cardData.romaja || "";
  card.vi = cardData.vi;
  card.example = cardData.example || "";
  card.exampleVi = cardData.exampleVi || "";
  card.blankWord = cardData.kr;
  savePersonalDecks(personalDecks);
}

function deleteCardFromDeck(deckId, cardId) {
  const deck = personalDecks.find(d => d.id === deckId);
  if (!deck) return;
  deck.cards = deck.cards.filter(c => c.id !== cardId);
  savePersonalDecks(personalDecks);
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
  document.getElementById("cardExample").textContent = `"${card.example}"`;

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
  clozeQueue = shuffleArray(getActiveDeckCards().filter(v => v.example && v.example.trim()));
  clozeIndex = 0;
  clozeAnswered = false;
  renderClozeQuestion();
}

function buildClozeOptions(correctWord) {
  const distractors = shuffleArray(
    getActiveDeckCards().filter(v => v.blankWord !== correctWord).map(v => v.blankWord)
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
  document.getElementById("btnGoogleSignOut").addEventListener("click", signOutGoogle);
  updateGoogleSyncUI();

  // Câu ví dụ ngẫu nhiên
  pickRandomSampleSentence();
  document.getElementById("btnRandomSentence").addEventListener("click", pickRandomSampleSentence);

  // Nút chấm điểm AI
  document.getElementById("btnGrade").addEventListener("click", handleGradeTranslation);
}

let currentSampleSentence = null;

function pickRandomSampleSentence() {
  let pool = getActiveDeckCards().filter(v => v.example && v.example.trim());
  if (pool.length === 0) pool = VOCAB_DATA;
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
  document.getElementById("btnCreateDeck").addEventListener("click", () => {
    const input = document.getElementById("newDeckNameInput");
    const name = input.value.trim();
    if (!name) {
      showToast("Vui lòng nhập tên deck");
      return;
    }
    createPersonalDeck(name);
    input.value = "";
    showToast(`✓ Đã tạo deck "${name}"`);
    renderDeckGrid();
  });

  document.getElementById("btnBackToDecks").addEventListener("click", showDeckListView);

  document.getElementById("btnSaveCard").addEventListener("click", handleSaveCard);
}

function showDeckListView() {
  editingDeckId = null;
  document.getElementById("deckListView").style.display = "block";
  document.getElementById("deckDetailView").style.display = "none";
  renderDeckGrid();
}

function renderDeckGrid() {
  const grid = document.getElementById("deckGrid");
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
      deleteBtn.addEventListener("click", () => {
        if (!confirm(`Xoá deck "${deck.name}" và toàn bộ thẻ trong đó?`)) return;
        deletePersonalDeck(deck.id);
        showToast(`Đã xoá deck "${deck.name}"`);
        renderDeckGrid();
      });
      actionsEl.appendChild(deleteBtn);
    }

    grid.appendChild(tile);
  });

  const addTile = document.createElement("div");
  addTile.className = "deck-tile deck-tile-add";
  addTile.innerHTML = `<div class="deck-tile-add-icon">+</div><div>Deck mới ở form trên</div>`;
  grid.appendChild(addTile);
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
  document.getElementById("cardFormKr").value = "";
  document.getElementById("cardFormRomaja").value = "";
  document.getElementById("cardFormVi").value = "";
  document.getElementById("cardFormExample").value = "";
  document.getElementById("cardFormExampleVi").value = "";
  document.getElementById("btnSaveCard").textContent = "Thêm thẻ";
}

function handleSaveCard() {
  const kr = document.getElementById("cardFormKr").value.trim();
  const vi = document.getElementById("cardFormVi").value.trim();
  const romaja = document.getElementById("cardFormRomaja").value.trim();
  const example = document.getElementById("cardFormExample").value.trim();
  const exampleVi = document.getElementById("cardFormExampleVi").value.trim();

  if (!kr || !vi) {
    showToast("⚠️ Vui lòng nhập ít nhất Từ tiếng Hàn và Nghĩa tiếng Việt");
    return;
  }

  const cardData = { kr, vi, romaja, example, exampleVi };

  if (editingCardId !== null) {
    updateCardInDeck(editingDeckId, editingCardId, cardData);
    showToast("✓ Đã cập nhật thẻ");
  } else {
    addCardToDeck(editingDeckId, cardData);
    showToast("✓ Đã thêm thẻ mới");
  }

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
    const item = document.createElement("div");
    item.className = "deck-card-item";
    item.innerHTML = `
      <div>
        <div class="vocab-item-kr">${card.kr}</div>
        <div class="vocab-item-romaja">${card.romaja || ""}</div>
      </div>
      <div class="vocab-item-vi">${card.vi}</div>
      <div class="deck-card-item-actions"></div>
    `;

    const actionsEl = item.querySelector(".deck-card-item-actions");

    const editBtn = document.createElement("button");
    editBtn.className = "btn btn-secondary btn-sm";
    editBtn.textContent = "Sửa";
    editBtn.addEventListener("click", () => {
      editingCardId = card.id;
      document.getElementById("cardFormKr").value = card.kr;
      document.getElementById("cardFormRomaja").value = card.romaja || "";
      document.getElementById("cardFormVi").value = card.vi;
      document.getElementById("cardFormExample").value = card.example || "";
      document.getElementById("cardFormExampleVi").value = card.exampleVi || "";
      document.getElementById("btnSaveCard").textContent = "Cập nhật thẻ";
    });
    actionsEl.appendChild(editBtn);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn btn-tertiary btn-sm";
    deleteBtn.textContent = "Xoá";
    deleteBtn.addEventListener("click", () => {
      if (!confirm(`Xoá thẻ "${card.kr}"?`)) return;
      deleteCardFromDeck(editingDeckId, card.id);
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
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${encodeURIComponent(apiKey)}`;

  const prompt = `Bạn là giáo viên tiếng Hàn. Câu tiếng Hàn gốc là: "${koreanSentence}".
Học viên đã dịch câu này sang tiếng Việt như sau: "${userTranslation}".

Hãy chấm điểm bản dịch trên thang điểm từ 0 đến 10 dựa trên độ chính xác về nghĩa và ngữ pháp.
Trả lời CHÍNH XÁC theo định dạng sau, không thêm bất kỳ nội dung nào khác:
Điểm: <số điểm>
Nhận xét: <nhận xét ngắn gọn 2-3 câu bằng tiếng Việt, chỉ ra điểm đúng/sai và gợi ý cải thiện>`;

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
  const rawText =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    "Không nhận được phản hồi hợp lệ từ Gemini API.";

  const scoreMatch = rawText.match(/Điểm:\s*(\d+(\.\d+)?)/i);
  const commentMatch = rawText.match(/Nhận xét:\s*([\s\S]*)/i);

  return {
    score: scoreMatch ? parseFloat(scoreMatch[1]) : null,
    text: commentMatch ? commentMatch[1].trim() : rawText.trim()
  };
}

/* --------------------------------------------------------------------------
   10. ĐĂNG NHẬP GOOGLE + ĐỒNG BỘ TIẾN ĐỘ VỚI GOOGLE APPS SCRIPT (GAS)
   URL của Apps Script Web App dùng chung cho mọi người dùng (gắn cứng sẵn).
   Chỉ khi người dùng đã đăng nhập Google thì tiến độ mới được gửi lên,
   kèm theo idToken để phía Apps Script xác thực danh tính trước khi ghi Sheet.
   -------------------------------------------------------------------------- */
const GAS_URL = "https://script.google.com/macros/s/AKfycbwzFDh1tW2SziRMPZVO6a2VXwx0qQEvPETuSi3GUJI6w9eiIAWOyScDKtDebYrcUAE0/exec";

let currentGoogleIdToken = null;
let currentGoogleUser = null; // { email, name }

function decodeJwtPayload(jwt) {
  const base64Url = jwt.split(".")[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(decodeURIComponent(escape(atob(base64))));
}

function handleGoogleCredentialResponse(response) {
  currentGoogleIdToken = response.credential;
  const payload = decodeJwtPayload(response.credential);
  currentGoogleUser = { email: payload.email, name: payload.name || payload.email };
  showToast(`✓ Đã đăng nhập Google: ${currentGoogleUser.name}`);
  updateGoogleSyncUI();
}
window.handleGoogleCredentialResponse = handleGoogleCredentialResponse;

function signOutGoogle() {
  currentGoogleIdToken = null;
  currentGoogleUser = null;
  if (window.google?.accounts?.id) google.accounts.id.disableAutoSelect();
  showToast("Đã đăng xuất Google");
  updateGoogleSyncUI();
}

function updateGoogleSyncUI() {
  const statusText = document.getElementById("gsyncStatusText");
  const signInBtn = document.getElementById("googleSignInButton");
  const signOutBtn = document.getElementById("btnGoogleSignOut");

  if (currentGoogleUser) {
    statusText.textContent = `✓ Đã đăng nhập: ${currentGoogleUser.name} (${currentGoogleUser.email}) — tiến độ học đang tự động đồng bộ.`;
    signInBtn.style.display = "none";
    signOutBtn.style.display = "inline-flex";
  } else {
    statusText.textContent = "Đăng nhập Google để tự động lưu tiến độ học (đã nhớ/chưa nhớ) lên hệ thống chung.";
    signInBtn.style.display = "block";
    signOutBtn.style.display = "none";
  }
}

async function sendProgressToGAS(vocabId, action, value) {
  if (GAS_URL.startsWith("REPLACE_WITH_")) return; // Chưa cấu hình URL GAS -> bỏ qua
  if (!currentGoogleIdToken) return; // Chưa đăng nhập Google -> chỉ lưu local, không đồng bộ

  const payload = {
    mode: "progress",
    idToken: currentGoogleIdToken,
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
