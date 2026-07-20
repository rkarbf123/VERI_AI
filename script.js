/* =========================================================
   ⚙️ 설정 (CONFIG)
   ========================================================= */
const CONFIG = {
  // ⬇️⬇️⬇️ 여기에 본인의 OpenAI API 키를 입력하세요 ⬇️⬇️⬇️
  // 예: "sk-proj-xxxxxxxxxxxxxxxxxxxxxxxx"
  API_KEY: "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",
  // ⬆️⬆️⬆️ ------------------------------------------ ⬆️⬆️⬆️

  API_URL: "https://api.openai.com/v1/chat/completions",
  MODEL: "gpt-4o-mini", // 필요시 gpt-4o, gpt-4.1-mini 등으로 변경 가능
  MAX_HISTORY_TURNS: 15, // 이전 대화 중 API에 함께 보낼 최근 turn 수 (기억 유지용)
};

/* 주의: 이 방식은 API 키가 브라우저(클라이언트)에 그대로 노출됩니다.
   개인 테스트/학교 과제용으로만 사용하고, 실제 배포 시에는
   서버(백엔드)를 통해 API를 호출하도록 구조를 바꾸는 것이 안전합니다.
   또한 API 키를 채팅창이나 공개된 곳에 절대 붙여넣지 마세요. */

const STORAGE_KEY = "veri_conversations_v1";
const CURRENT_KEY = "veri_current_id_v1";
const SETTINGS_KEY = "veri_settings_v1";

/* =========================================================
   DOM 참조
   ========================================================= */
const chatLog = document.getElementById("chatLog");
const inputForm = document.getElementById("inputForm");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const appEl = document.querySelector(".app");
const historyList = document.getElementById("historyList");
const newChatBtn = document.getElementById("newChatBtn");
const searchInput = document.getElementById("searchInput");
const collapseSidebarBtn = document.getElementById("collapseSidebarBtn");

const settingsBtn = document.getElementById("settingsBtn");
const settingsOverlay = document.getElementById("settingsOverlay");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");
const darkModeToggle = document.getElementById("darkModeToggle");
const claimModeToggle = document.getElementById("claimModeToggle");
const confidenceToggle = document.getElementById("confidenceToggle");
const verificationToggle = document.getElementById("verificationToggle");
const sourceToggle = document.getElementById("sourceToggle");
const customInstructionInput = document.getElementById("customInstructionInput");
const saveCustomBtn = document.getElementById("saveCustomBtn");
const saveStatus = document.getElementById("saveStatus");

/* =========================================================
   설정 (기능 on/off, 다크모드, 사용자 지정 기능)
   ========================================================= */
function defaultSettings() {
  return {
    darkMode: false,
    claimMode: false,
    showConfidence: true,
    showVerification: true,
    showSource: false,
    customInstruction: "",
  };
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultSettings();
    return { ...defaultSettings(), ...JSON.parse(raw) };
  } catch (e) {
    return defaultSettings();
  }
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(currentSettings));
}

let currentSettings = loadSettings();

function applySettingsToUI() {
  darkModeToggle.checked = currentSettings.darkMode;
  claimModeToggle.checked = currentSettings.claimMode;
  confidenceToggle.checked = currentSettings.showConfidence;
  verificationToggle.checked = currentSettings.showVerification;
  sourceToggle.checked = currentSettings.showSource;
  customInstructionInput.value = currentSettings.customInstruction || "";

  document.documentElement.setAttribute("data-theme", currentSettings.darkMode ? "dark" : "light");
  appEl.classList.toggle("claim-mode", currentSettings.claimMode);
  userInput.placeholder = currentSettings.claimMode
    ? "판단하고 싶은 주장을 입력하세요 (예: OO는 XX해야 한다)"
    : "궁금한 것을 물어보세요...";
}

darkModeToggle.addEventListener("change", () => {
  currentSettings.darkMode = darkModeToggle.checked;
  saveSettings();
  applySettingsToUI();
});
claimModeToggle.addEventListener("change", () => {
  currentSettings.claimMode = claimModeToggle.checked;
  saveSettings();
  applySettingsToUI();
});
confidenceToggle.addEventListener("change", () => {
  currentSettings.showConfidence = confidenceToggle.checked;
  saveSettings();
});
verificationToggle.addEventListener("change", () => {
  currentSettings.showVerification = verificationToggle.checked;
  saveSettings();
});
sourceToggle.addEventListener("change", () => {
  currentSettings.showSource = sourceToggle.checked;
  saveSettings();
});
saveCustomBtn.addEventListener("click", () => {
  currentSettings.customInstruction = customInstructionInput.value.trim();
  saveSettings();
  saveStatus.textContent = "저장되었습니다.";
  setTimeout(() => { saveStatus.textContent = ""; }, 2000);
});

settingsBtn.addEventListener("click", () => settingsOverlay.classList.add("open"));
closeSettingsBtn.addEventListener("click", () => settingsOverlay.classList.remove("open"));
settingsOverlay.addEventListener("click", (e) => {
  if (e.target === settingsOverlay) settingsOverlay.classList.remove("open");
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") settingsOverlay.classList.remove("open");
});

/* ===== 사이드바 접기/펴기 ===== */
const SIDEBAR_COLLAPSED_KEY = "veri_sidebar_collapsed_v1";

function applySidebarState() {
  const collapsed = localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
  appEl.classList.toggle("sidebar-collapsed", collapsed);
  collapseSidebarBtn.textContent = collapsed ? "⟩" : "⟨";
}

collapseSidebarBtn.addEventListener("click", () => {
  const isCollapsed = appEl.classList.contains("sidebar-collapsed");
  localStorage.setItem(SIDEBAR_COLLAPSED_KEY, (!isCollapsed).toString());
  applySidebarState();
});

applySidebarState();

/* =========================================================
   프롬프트 설계 (Prompt Design)
   ========================================================= */
const ANSWER_BASE_INSTRUCTIONS = `
당신은 정확성과 신중함을 최우선으로 하는 AI 어시스턴트입니다.
이전 대화 맥락이 있다면 참고하여 자연스럽게 이어서 답변하세요.
사용자의 질문에 답변하되, "그럴듯하지만 근거가 약한 답변"을 피하고
확실하지 않은 내용은 신뢰도를 낮게 평가하세요.
사용자가 코드, 프로그램, 함수, 스크립트 작성을 요청하면 절대 설명만 하고 끝내지 마세요.
반드시 code.present를 true로 설정하고 code.content에 실제로 동작하는 완전한 코드를 작성하세요.
코드 작성 요청인데 code.present가 false이거나 code.content가 비어있는 답변은 잘못된 답변입니다.
수식이 필요하면 LaTeX 문법을 사용하세요: 문장 속 인라인 수식은 $...$ 로,
독립된 줄로 강조할 수식은 $$...$$ 로 감싸서 작성하세요 (예: $E=mc^2$, $$\\int_0^1 x^2\\,dx$$).
`;

function buildAnswerSystemPrompt(settings) {
  let schema = `{
  "answer": "사용자 질문에 대한 설명 답변 (한국어). 코드는 여기에 넣지 말고 반드시 code 필드에만 작성하세요.",
  "confidence": 0부터 100 사이의 정수 (스스로 판단한 답변의 신뢰도),
  "code": {
    "present": true 또는 false (코드가 필요한 요청이면 true, 아니면 false),
    "language": "프로그래밍 언어 이름 (예: python, javascript, html). 코드가 없으면 빈 문자열",
    "content": "실제로 동작하는 완전한 코드 전체. 줄바꿈은 \\n으로 표현. 코드가 없으면 빈 문자열"
  }`;

  let sourceInstruction = "";
  if (settings.showSource) {
    schema += `,
  "source": {
    "cited": true 또는 false,
    "description": "출처에 대한 짧은 설명 (인용하지 않았다면 빈 문자열)",
    "url": "실제로 확실히 아는 유효한 URL (없다면 빈 문자열)"
  }`;
    sourceInstruction = `
답변의 근거가 되는 명확한 출처(공식 문서, 논문, 잘 알려진 웹사이트 등)를 실제로 알고 있을 때만 "cited": true로 설정하고 정확한 url을 적으세요.
확실한 출처가 없거나 일반 지식에 기반한 답변이라면 반드시 "cited": false로 설정하고 url은 빈 문자열로 두세요. 출처를 지어내지 마세요.`;
  }
  schema += `
}`;

  let prompt = `${ANSWER_BASE_INSTRUCTIONS}${sourceInstruction}

반드시 아래 JSON 형식으로만 응답하세요. JSON 앞뒤로 다른 설명이나 접두사를 붙이지 마세요.
${schema}`;

  if (settings.customInstruction && settings.customInstruction.trim()) {
    prompt += `

사용자가 추가로 지정한 규칙 (반드시 지켜서 답변하세요):
${settings.customInstruction.trim()}`;
  }
  return prompt;
}

const VERIFY_SYSTEM_PROMPT = `
당신은 다른 AI가 작성한 답변을 검증하는 깐깐한 팩트체커입니다.
주어진 [질문]과 [답변]을 검토하여, 확실히 맞는 부분과
과장되었거나 예외/주의가 필요한 부분을 구분하세요.
수식을 언급할 때는 LaTeX 문법을 사용하세요: 인라인 수식은 $...$ 로, 독립된 줄 수식은 $$...$$ 로 감싸세요.

반드시 아래 JSON 형식으로만 응답하세요. 다른 설명 없이 JSON만 출력합니다.
{
  "correct_points": ["확인된 정확한 부분 1", "확인된 정확한 부분 2"],
  "warnings": ["주의가 필요하거나 예외가 있는 부분 1", "..."]
}
warnings가 없다면 빈 배열 []을 반환하세요.
`;

const CLAIM_STANCE_PROMPT_BASE = `
당신은 비판적 사고 훈련을 돕는 AI입니다.
이전 대화 맥락이 있다면 참고하되, 이번에 입력된 문장을 하나의 "주장"으로 간주하고 다음 세 가지 관점을 작성하세요.
1. 그 주장에 찬성하는 입장에서의 논거 (2~3문장)
2. 중립적/균형적 관점, 양쪽을 모두 고려한 시각 (2~3문장)
3. 그 주장에 반대하는 입장에서의 논거 (2~3문장)

반드시 아래 JSON 형식으로만 응답하세요. 다른 설명 없이 JSON만 출력합니다.
{
  "pro": "찬성 입장 논거",
  "neutral": "중립적 관점",
  "con": "반대 입장 논거"
}
`;

// 논리적 허점은 별도의 AI가 원문 주장만 놓고 교차검증하는 방식으로 진행한다.
// (찬반 논거를 만든 AI와 다른 시점/다른 역할로 검토해 "성급한 일반화" 같은
//  진단명만 반복해서 붙이지 않고, 실제 문구를 근거로 구체적으로 짚도록 강제한다.)
const CLAIM_FLAW_PROMPT_BASE = `
당신은 주장문을 정밀하게 교차검증하는 논리 분석 전문가입니다.
주어진 [주장]을 냉철하게 검토해서 실제로 존재하는 논리적 허점만 찾아내세요.

반드시 지켜야 할 규칙:
- "성급한 일반화", "근거 부족", "흑백논리" 같은 진단명을 그 자체로 나열하지 마세요.
- 허점이 있다면 주장에서 실제로 사용된 표현이나 구절을 직접 인용하고, 그 부분이 왜 논리적으로 문제가 되는지 이 주장에 한정해서 구체적으로 설명하세요.
  예시: "'다들 그렇게 생각한다'는 표현은 실제 근거 없이 다수의 동의를 전제로 하고 있어, 주장을 뒷받침하는 근거가 되지 못합니다."
- 정말 문제가 없는 부분까지 억지로 지적하지 마세요. 근거가 이미 충분하거나 표현이 신중하다면 flaws를 빈 배열로 반환하세요.
- 반대로 실제 문제가 있다면 관대하게 넘어가지 말고 정확히 짚으세요.
- 같은 주장이라도 매번 똑같은 상투적 표현을 반복하지 말고, 이번 주장의 실제 내용에 맞춰 검토하세요.

반드시 아래 JSON 형식으로만 응답하세요. 다른 설명 없이 JSON만 출력합니다.
{
  "flaws": ["구체적인 허점 설명 1", "구체적인 허점 설명 2"]
}
flaws가 없다면 빈 배열 []을 반환하세요.
`;

function buildClaimStancePrompt(settings) {
  let prompt = CLAIM_STANCE_PROMPT_BASE;
  if (settings.customInstruction && settings.customInstruction.trim()) {
    prompt += `

사용자가 추가로 지정한 규칙 (반드시 지켜서 답변하세요):
${settings.customInstruction.trim()}`;
  }
  return prompt;
}

function buildClaimFlawPrompt(settings) {
  let prompt = CLAIM_FLAW_PROMPT_BASE;
  if (settings.customInstruction && settings.customInstruction.trim()) {
    prompt += `

사용자가 추가로 지정한 규칙 (반드시 지켜서 답변하세요):
${settings.customInstruction.trim()}`;
  }
  return prompt;
}

/* =========================================================
   대화 저장소 (localStorage)
   ========================================================= */
function loadAllConversations() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveAllConversations(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function getCurrentId() {
  return localStorage.getItem(CURRENT_KEY);
}

function setCurrentId(id) {
  localStorage.setItem(CURRENT_KEY, id);
}

function createConversation() {
  return {
    id: Date.now().toString(),
    title: "새 대화",
    createdAt: Date.now(),
    messages: [],
  };
}

let conversations = loadAllConversations();
let currentConversation = null;

function initConversation() {
  const savedId = getCurrentId();
  let found = conversations.find(c => c.id === savedId);
  if (!found) {
    found = createConversation();
    conversations.unshift(found);
    saveAllConversations(conversations);
    setCurrentId(found.id);
  }
  currentConversation = found;
}

function persist() {
  const idx = conversations.findIndex(c => c.id === currentConversation.id);
  if (idx !== -1) conversations[idx] = currentConversation;
  saveAllConversations(conversations);
}

/* =========================================================
   사이드바 대화 기록 렌더링
   ========================================================= */
function truncate(text, n) {
  return text.length > n ? text.slice(0, n) + "…" : text;
}

function renderHistoryList(filter = "") {
  historyList.innerHTML = "";
  const q = filter.trim().toLowerCase();

  const filtered = conversations.filter(c => {
    if (!q) return true;
    if (c.title.toLowerCase().includes(q)) return true;
    return c.messages.some(m => {
      const text = m.text || m.question || "";
      return text.toLowerCase().includes(q);
    });
  });

  if (filtered.length === 0) {
    historyList.innerHTML = `<div class="history-empty">검색 결과가 없습니다.</div>`;
    return;
  }

  filtered
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .forEach(c => {
      const item = document.createElement("div");
      item.className = "history-item" + (c.id === currentConversation.id ? " active" : "");
      item.innerHTML = `
        <span class="history-item-title"></span>
        <button class="history-item-delete" title="삭제">×</button>
      `;
      item.querySelector(".history-item-title").textContent = c.title;
      item.addEventListener("click", (e) => {
        if (e.target.classList.contains("history-item-delete")) return;
        switchConversation(c.id);
      });
      item.querySelector(".history-item-delete").addEventListener("click", (e) => {
        e.stopPropagation();
        deleteConversation(c.id);
      });
      historyList.appendChild(item);
    });
}

function switchConversation(id) {
  const found = conversations.find(c => c.id === id);
  if (!found) return;
  currentConversation = found;
  setCurrentId(id);
  renderConversationMessages();
  renderHistoryList(searchInput.value);
}

function deleteConversation(id) {
  const target = conversations.find(c => c.id === id);
  const label = target ? target.title : "이 대화";
  const confirmed = window.confirm(`"${label}" 대화를 삭제하시겠습니까?\n삭제한 대화는 복구할 수 없습니다.`);
  if (!confirmed) return;

  conversations = conversations.filter(c => c.id !== id);
  saveAllConversations(conversations);

  if (currentConversation.id === id) {
    if (conversations.length > 0) {
      currentConversation = conversations[0];
    } else {
      currentConversation = createConversation();
      conversations.push(currentConversation);
      saveAllConversations(conversations);
    }
    setCurrentId(currentConversation.id);
    renderConversationMessages();
  }
  renderHistoryList(searchInput.value);
}

newChatBtn.addEventListener("click", () => {
  currentConversation = createConversation();
  conversations.unshift(currentConversation);
  saveAllConversations(conversations);
  setCurrentId(currentConversation.id);
  renderConversationMessages();
  renderHistoryList(searchInput.value);
});

searchInput.addEventListener("input", () => {
  renderHistoryList(searchInput.value);
});

/* =========================================================
   OpenAI API 호출
   ========================================================= */
async function callOpenAI(systemPrompt, userText, history = [], temperature = 0.4) {
  if (!CONFIG.API_KEY || CONFIG.API_KEY.includes("여기에")) {
    throw new Error("API 키가 설정되지 않았습니다. script.js 상단의 CONFIG.API_KEY를 입력해주세요.");
  }

  const response = await fetch(CONFIG.API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${CONFIG.API_KEY}`,
    },
    body: JSON.stringify({
      model: CONFIG.MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        ...history,
        { role: "user", content: userText },
      ],
      temperature: temperature,
      max_tokens: 1600,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`API 요청 실패 (${response.status}): ${errBody}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

function safeParseJSON(raw) {
  let text = raw.trim();
  text = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("JSON 형식을 찾을 수 없습니다.");
  return JSON.parse(text.slice(start, end + 1));
}

// 대화 기억: 저장된 메시지들을 OpenAI 메시지 형식으로 변환 (현재 turn 제외)
function buildHistoryMessages() {
  const msgs = currentConversation.messages.slice(0, -1); // 방금 추가된 사용자 메시지 제외
  const recent = msgs.slice(-CONFIG.MAX_HISTORY_TURNS * 2);
  const result = [];
  for (const m of recent) {
    if (m.type === "user") {
      result.push({ role: "user", content: m.text });
    } else if (m.type === "ai-normal" || m.type === "ai-claim") {
      result.push({ role: "assistant", content: m.raw });
    }
  }
  return result;
}

function clampConfidence(v) {
  return Math.max(0, Math.min(100, Number(v) || 0));
}

function normalizeSource(source) {
  if (!source || typeof source !== "object") {
    return { cited: false, description: "", url: "" };
  }
  return {
    cited: !!source.cited,
    description: source.description || "",
    url: source.url || "",
  };
}

/* =========================================================
   렌더링 함수 - 공통
   ========================================================= */
function hideEmptyState() {
  const el = document.getElementById("emptyState");
  if (el) el.style.display = "none";
}

function scrollToBottom() {
  chatLog.scrollTop = chatLog.scrollHeight;
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function renderUserMessage(text) {
  hideEmptyState();
  const wrap = document.createElement("div");
  wrap.className = "msg user";
  wrap.innerHTML = `<div class="bubble-user"></div>`;
  wrap.querySelector(".bubble-user").textContent = text;
  chatLog.appendChild(wrap);
  scrollToBottom();
}

function renderLoading() {
  hideEmptyState();
  const wrap = document.createElement("div");
  wrap.className = "msg ai";
  wrap.innerHTML = `
    <div class="card loading-card">
      <div class="loading-dots"><span></span><span></span><span></span></div>
      <span class="loading-text">AI가 답변을 생각하는 중...</span>
    </div>
  `;
  chatLog.appendChild(wrap);
  scrollToBottom();
  return wrap;
}

function renderError(msg) {
  hideEmptyState();
  const wrap = document.createElement("div");
  wrap.className = "msg ai";
  wrap.innerHTML = `<div class="card"><p class="error-text">⚠️ ${escapeHTML(msg)}</p></div>`;
  chatLog.appendChild(wrap);
  scrollToBottom();
}

/* =========================================================
   코드 블록 파싱 & 복사 기능
   ========================================================= */
function parseAnswerSegments(text) {
  const segments = [];
  const regex = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", content: text.slice(lastIndex, match.index) });
    }
    segments.push({ type: "code", lang: match[1] || "code", content: match[2].replace(/\n$/, "") });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    segments.push({ type: "text", content: text.slice(lastIndex) });
  }
  return segments;
}

function buildCodeBlockHTML(lang, content) {
  return `
    <div class="code-block">
      <div class="code-block-header">
        <span class="code-lang">${escapeHTML(lang || "code")}</span>
        <button type="button" class="copy-btn">복사</button>
      </div>
      <pre><code>${escapeHTML(content)}</code></pre>
    </div>
  `;
}

function buildAnswerBodyHTML(text) {
  const segments = parseAnswerSegments(text);
  return segments
    .map(seg => {
      if (seg.type === "text") {
        const trimmed = seg.content.trim();
        if (!trimmed) return "";
        return `<p class="answer-text">${escapeHTML(trimmed)}</p>`;
      }
      return buildCodeBlockHTML(seg.lang, seg.content);
    })
    .join("");
}

function attachCopyButtons(wrap) {
  wrap.querySelectorAll(".code-block").forEach(block => {
    const btn = block.querySelector(".copy-btn");
    const codeEl = block.querySelector("code");
    btn.addEventListener("click", () => {
      navigator.clipboard.writeText(codeEl.textContent)
        .then(() => {
          const original = btn.textContent;
          btn.textContent = "복사됨!";
          setTimeout(() => { btn.textContent = original; }, 1500);
        })
        .catch(() => {
          btn.textContent = "복사 실패";
        });
    });
  });
}

// LaTeX 수식을 KaTeX로 렌더링 ($...$, $$...$$, \(...\), \[...\] 지원)
// pre/code 태그는 auto-render가 기본적으로 건너뛰므로 코드 블록과 충돌하지 않음
// CDN 로딩이 늦어질 수 있으므로 잠시 재시도한다
function renderMathIn(el, attemptsLeft = 20) {
  if (window.renderMathInElement) {
    try {
      window.renderMathInElement(el, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "\\[", right: "\\]", display: true },
          { left: "$", right: "$", display: false },
          { left: "\\(", right: "\\)", display: false },
        ],
        throwOnError: false,
      });
    } catch (e) {
      // KaTeX 렌더링 실패 시 원문 텍스트를 그대로 둠
    }
    return;
  }
  if (attemptsLeft > 0) {
    setTimeout(() => renderMathIn(el, attemptsLeft - 1), 150);
  } else {
    console.warn("KaTeX 라이브러리를 불러오지 못해 수식이 원문으로 표시됩니다. 인터넷 연결이나 CDN 차단 여부를 확인해주세요.");
  }
}

/* =========================================================
   검증 / 출처 섹션 렌더링
   ========================================================= */
function buildVerifyBodyHTML(verification) {
  if (!verification) {
    return `<div class="loading-dots" style="margin-top:2px"><span></span><span></span><span></span></div>`;
  }
  if (verification.error) {
    return `<p class="error-text">⚠️ 검증 단계 실패: ${escapeHTML(verification.error)}</p>`;
  }
  const correctItems = (verification.correct_points || [])
    .map(p => `<div class="verify-item correct"><span class="verify-icon">✅</span><span>${escapeHTML(p)}</span></div>`)
    .join("");
  const warnItems = (verification.warnings || [])
    .map(p => `<div class="verify-item warn"><span class="verify-icon">⚠️</span><span>${escapeHTML(p)}</span></div>`)
    .join("");
  return `
    ${correctItems}
    ${warnItems || `<div class="verify-item correct"><span class="verify-icon">✅</span><span>추가로 발견된 주의 사항이 없습니다.</span></div>`}
  `;
}

function attachVerifyToggle(wrap) {
  const header = wrap.querySelector(".verify-header");
  const body = wrap.querySelector(".verify-body");
  if (!header || !body) return;
  header.addEventListener("click", () => {
    body.classList.toggle("collapsed");
    header.classList.toggle("collapsed");
  });
}

function buildSourceHTML(source) {
  if (!source || !source.cited) {
    return `<p class="source-not-cited">인용하지 않았음</p>`;
  }
  const label = escapeHTML(source.description || source.url || "출처 보기");
  if (source.url) {
    return `<p class="source-cited">🔗 <a href="${escapeHTML(source.url)}" target="_blank" rel="noopener noreferrer">${label}</a></p>`;
  }
  return `<p class="source-cited">🔗 ${label}</p>`;
}

/* =========================================================
   AI 답변 카드 렌더링 (일반 모드)
   msgData: { answer, raw, confidence?, source?, verification? }
   verification === null  → 검증 진행 중(로딩)
   verification === {...} → 검증 결과
   verification 키 자체가 없으면 → 검증 기능 비활성화(섹션 숨김)
   ========================================================= */
function renderAnswerCard(msgData) {
  hideEmptyState();
  const wrap = document.createElement("div");
  wrap.className = "msg ai";

  let gaugeHTML = "";
  if (msgData.confidence !== undefined) {
    const conf = clampConfidence(msgData.confidence);
    gaugeHTML = `
      <div class="gauge-wrap">
        <span class="gauge-label">신뢰도</span>
        <div class="gauge-track">
          <div class="gauge-fill" style="width:${conf}%"></div>
          <div class="gauge-ticks">${"<span></span>".repeat(5)}</div>
        </div>
        <span class="gauge-value">${conf}%</span>
      </div>
    `;
  }

  const hasCode = Object.prototype.hasOwnProperty.call(msgData, "code");
  const codeHTML = hasCode ? buildCodeBlockHTML(msgData.code.language, msgData.code.content) : "";

  const hasSource = Object.prototype.hasOwnProperty.call(msgData, "source");
  let sourceHTML = "";
  if (hasSource) {
    sourceHTML = `
      <hr class="divider">
      <p class="verify-title">자료 출처</p>
      <div class="source-section">${buildSourceHTML(msgData.source)}</div>
    `;
  }

  const hasVerification = Object.prototype.hasOwnProperty.call(msgData, "verification");
  let verifyHTML = "";
  if (hasVerification) {
    verifyHTML = `
      <hr class="divider">
      <div class="verify-header">
        <span class="verify-title">교차 검증 결과</span>
        <span class="verify-chevron">▾</span>
      </div>
      <div class="verify-body">${buildVerifyBodyHTML(msgData.verification)}</div>
    `;
  }

  wrap.innerHTML = `
    <div class="card">
      ${gaugeHTML}
      ${buildAnswerBodyHTML(msgData.answer)}
      ${codeHTML}
      ${sourceHTML}
      ${verifyHTML}
    </div>
  `;
  chatLog.appendChild(wrap);
  attachCopyButtons(wrap);
  renderMathIn(wrap);
  if (hasVerification) attachVerifyToggle(wrap);
  scrollToBottom();

  return hasVerification ? wrap.querySelector(".verify-body") : null;
}

function buildFlawBodyHTML(flaws) {
  if (flaws === null || flaws === undefined) {
    return `<div class="loading-dots" style="margin-top:2px"><span></span><span></span><span></span></div>`;
  }
  if (flaws.error) {
    return `<p class="error-text">⚠️ 허점 검증 실패: ${escapeHTML(flaws.error)}</p>`;
  }
  if (!flaws.length) {
    return `<div class="flaw-item"><span class="flaw-icon">✅</span><span>뚜렷한 논리적 허점이 발견되지 않았습니다.</span></div>`;
  }
  return flaws.map(f => `<div class="flaw-item"><span class="flaw-icon">⚠️</span><span>${escapeHTML(f)}</span></div>`).join("");
}

// msgData: { question, pro, neutral, con, flaws }
// flaws: null(교차검증 진행 중) | 배열(결과) | {error}
function renderClaimCard(msgData) {
  hideEmptyState();
  const wrap = document.createElement("div");
  wrap.className = "msg ai";

  wrap.innerHTML = `
    <div class="card">
      <p class="claim-original">"${escapeHTML(msgData.question)}"에 대한 주장 분석</p>
      <div class="stance-grid">
        <div class="stance-card pro"><span class="stance-title">찬성</span>${escapeHTML(msgData.pro)}</div>
        <div class="stance-card neutral"><span class="stance-title">중립</span>${escapeHTML(msgData.neutral)}</div>
        <div class="stance-card con"><span class="stance-title">반대</span>${escapeHTML(msgData.con)}</div>
      </div>
      <hr class="divider">
      <div class="verify-header">
        <span class="verify-title">논리적 허점 점검 (교차 검증)</span>
        <span class="verify-chevron">▾</span>
      </div>
      <div class="flaw-body">${buildFlawBodyHTML(msgData.flaws)}</div>
    </div>
  `;
  chatLog.appendChild(wrap);
  renderMathIn(wrap);

  const header = wrap.querySelector(".verify-header");
  const body = wrap.querySelector(".flaw-body");
  header.addEventListener("click", () => {
    body.classList.toggle("collapsed");
    header.classList.toggle("collapsed");
  });

  scrollToBottom();
  return body;
}
// 저장된 대화를 불러올 때 전체 메시지를 다시 그림
function renderConversationMessages() {
  chatLog.innerHTML = `
    <div class="empty-state" id="emptyState">
      <p>질문을 입력하면 답변, 신뢰도, 검증 결과를 확인할 수 있어요.</p>
      <p>설정에서 "주장 판단하기"를 켜면 입력한 문장을 주장으로 분석합니다.</p>
    </div>
  `;
  if (currentConversation.messages.length === 0) return;

  for (const m of currentConversation.messages) {
    if (m.type === "user") {
      renderUserMessage(m.text);
    } else if (m.type === "ai-normal") {
      renderAnswerCard(m);
    } else if (m.type === "ai-claim") {
      renderClaimCard(m);
    } else if (m.type === "ai-error") {
      renderError(m.message);
    }
  }
}

/* =========================================================
   메인 로직: 전송 처리
   ========================================================= */
async function handleNormalMode(text) {
  const history = buildHistoryMessages();
  const loadingEl = renderLoading();
  try {
    const systemPrompt = buildAnswerSystemPrompt(currentSettings);
    const rawAnswer = await callOpenAI(systemPrompt, text, history);
    const parsedAnswer = safeParseJSON(rawAnswer);
    loadingEl.remove();

    const msgObj = {
      type: "ai-normal",
      question: text,
      answer: parsedAnswer.answer,
      raw: rawAnswer,
    };
    if (currentSettings.showConfidence) {
      msgObj.confidence = clampConfidence(parsedAnswer.confidence);
    }
    if (parsedAnswer.code && parsedAnswer.code.present && parsedAnswer.code.content && parsedAnswer.code.content.trim()) {
      msgObj.code = {
        language: parsedAnswer.code.language || "code",
        content: parsedAnswer.code.content,
      };
    }
    if (currentSettings.showSource) {
      msgObj.source = normalizeSource(parsedAnswer.source);
    }
    if (currentSettings.showVerification) {
      msgObj.verification = null; // 로딩 표시용
    }

    const verifyBodyEl = renderAnswerCard(msgObj);
    currentConversation.messages.push(msgObj);
    persist();

    if (currentSettings.showVerification) {
      try {
        const verifyInput = `[질문]\n${text}\n\n[답변]\n${parsedAnswer.answer}`;
        const rawVerify = await callOpenAI(VERIFY_SYSTEM_PROMPT, verifyInput);
        const parsedVerify = safeParseJSON(rawVerify);
        msgObj.verification = parsedVerify;
      } catch (verifyErr) {
        msgObj.verification = { error: verifyErr.message };
      }
      if (verifyBodyEl) {
        verifyBodyEl.innerHTML = buildVerifyBodyHTML(msgObj.verification);
        renderMathIn(verifyBodyEl);
      }
      persist();
    }
  } catch (err) {
    loadingEl.remove();
    renderError(err.message);
    currentConversation.messages.push({ type: "ai-error", message: err.message });
    persist();
  }
}

async function handleClaimMode(text) {
  const history = buildHistoryMessages();
  const loadingEl = renderLoading();
  try {
    const stancePrompt = buildClaimStancePrompt(currentSettings);
    const raw = await callOpenAI(stancePrompt, text, history);
    const parsedStance = safeParseJSON(raw);
    loadingEl.remove();

    const msgObj = {
      type: "ai-claim",
      question: text,
      pro: parsedStance.pro,
      neutral: parsedStance.neutral,
      con: parsedStance.con,
      raw: raw,
      flaws: null, // 교차 검증 로딩 표시용
    };

    const flawBodyEl = renderClaimCard(msgObj);
    currentConversation.messages.push(msgObj);
    persist();

    try {
      const flawPrompt = buildClaimFlawPrompt(currentSettings);
      const flawInput = `[주장]\n${text}`;
      const rawFlaw = await callOpenAI(flawPrompt, flawInput);
      const parsedFlaw = safeParseJSON(rawFlaw);
      msgObj.flaws = parsedFlaw.flaws || [];
    } catch (flawErr) {
      msgObj.flaws = { error: flawErr.message };
    }
    if (flawBodyEl) {
      flawBodyEl.innerHTML = buildFlawBodyHTML(msgObj.flaws);
      renderMathIn(flawBodyEl);
    }
    persist();
  } catch (err) {
    loadingEl.remove();
    renderError(err.message);
    currentConversation.messages.push({ type: "ai-error", message: err.message });
    persist();
  }
}

async function handleSend() {
  const text = userInput.value.trim();
  if (!text) return;

  if (currentConversation.title === "새 대화") {
    currentConversation.title = truncate(text, 24);
  }

  renderUserMessage(text);
  currentConversation.messages.push({ type: "user", text });
  persist();
  renderHistoryList(searchInput.value);

  userInput.value = "";
  userInput.style.height = "auto";
  sendBtn.disabled = true;

  if (currentSettings.claimMode) {
    await handleClaimMode(text);
  } else {
    await handleNormalMode(text);
  }

  sendBtn.disabled = false;
  userInput.focus();
}

/* =========================================================
   이벤트 리스너
   ========================================================= */
inputForm.addEventListener("submit", (e) => {
  e.preventDefault();
  handleSend();
});

userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
});

userInput.addEventListener("input", () => {
  userInput.style.height = "auto";
  userInput.style.height = userInput.scrollHeight + "px";
});

/* =========================================================
   초기화
   ========================================================= */
applySettingsToUI();
initConversation();
renderConversationMessages();
renderHistoryList();
