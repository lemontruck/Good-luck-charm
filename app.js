"use strict";
// 오늘의 부적 · 앱 로직 (빌드 도구 없는 순수 JS). 데이터는 data/*.js, 이미지는 assets/ 에서 읽음
(() => {
const D = window.APP_DATA;   // data/fortune-data.js
const $ = (s) => document.querySelector(s);
const INK = "#1B1320";
const POP = ["#FF2E7E", "#00D2FF", "#FFE156", "#42E2B8", "#B19FFB", "#FF8811"];
const RETRO = ["#C9504A", "#D9A43B", "#5B7DB1", "#D98A93", "#7C8F4E", "#8A5A36"];
const TEXT_CATS = new Set(["number", "color", "word", "time"]);
const BASE = 320;                   // 스티커 원본 크기 (카드 논리 좌표 기준)
const CW = 1080; let CH = 1919;     // 카드 논리 크기 = 저장 이미지 크기. 세로 길이는 부적 틀 테마 비율을 따름
const MAX_STICKERS = 40;
const MAX_ROUNDS = 3;

// ---------- 저장소 (실패해도 앱은 동작) ----------
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
};

// ---------- 결정적 난수 ----------
function cyrb53(str) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) { const c = str.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// 저녁 이후에 들어오면 하루 일과가 끝난 뒤이므로 '내일을 위한 부적'을 기본으로 안내
const NIGHT_FROM = 18;   // 이 시각(0~23시)부터 내일 부적이 기본값
const dateKey = (offset = 0) => { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const todayKey = () => dateKey(0);
const isNight = () => new Date().getHours() >= NIGHT_FROM;
const relDay = (key) => (key === dateKey(0) ? "오늘" : key === dateKey(1) ? "내일" : "");
const shortDate = (k) => { const [, m, d] = k.split("-").map(Number); return `${m}월 ${d}일`; };
const dateLabel = (k) => { const [y, m, d] = k.split("-").map(Number); return `${y}년 ${m}월 ${d}일`; };
const byId = (cat, id) => D.DATA[cat].find((e) => e.id === id);
const idxOf = (cat, id) => D.DATA[cat].findIndex((e) => e.id === id);
const fortuneName = (id) => D.FT.find((f) => f.id === id).name;

function drawKeywords(seedStr, fortune) {
  const rng = mulberry32(cyrb53(seedStr) % 4294967296);
  const picks = {}; const chosen = [];
  for (const c of D.CATS) {
    const banned = new Set(D.EX.flatMap(([a, b]) => (chosen.includes(a) ? [b] : chosen.includes(b) ? [a] : [])));
    const list = D.DATA[c.id].filter((e) => !banned.has(e.id));
    const total = list.reduce((s, e) => s + e.weights[fortune], 0);
    let r = rng() * total, pick = list[list.length - 1];
    for (const e of list) { r -= e.weights[fortune]; if (r <= 0) { pick = e; break; } }
    picks[c.id] = pick.id; chosen.push(pick.id);
  }
  const lines = LINES[fortune];
  return { picks, line: lines[Math.floor(rng() * lines.length)] };
}

// ---------- 한 줄 문장 (조사 자동) ----------
const LINES = {
  job: ["{place}에서 {word}의 기회가 찾아와요", "{time}, {item}{을} 챙기면 일이 술술 풀려요", "{animal}처럼 {word}{을} 믿고 한 발 내디뎌 봐요"],
  love: ["{place}에서 {word}{이} 스며드는 날이에요", "{color}{을} 곁에 두면 호감이 커져요", "{time}, {animal}처럼 다정하게 먼저 다가가 봐요"],
  money: ["{item}{이} 작은 이득을 불러와요", "{time}에 {word}의 흐름을 잡아 봐요", "{place}에서 새는 돈을 막는 힌트를 얻어요"],
  people: ["{place}에서 {word}{이} 이어지는 하루예요", "{animal}처럼 먼저 웃어주면 관계가 풀려요", "{color}{을} 입으면 대화가 편안해져요"],
  study: ["{place}에서 {word}의 스위치가 켜져요", "{time}에 집중이 가장 잘 돼요", "{item}{을} 곁에 두고 한 가지에 몰입해 봐요"],
  daily: ["{place}에서 {word}{을} 발견하는 날이에요", "{animal}의 기운으로 가볍게 흘러가요", "{time}, 작은 행운이 슬쩍 찾아와요"],
};
const DIGIT_BATCHIM = { 0: 1, 1: 1, 2: 0, 3: 1, 4: 0, 5: 0, 6: 1, 7: 1, 8: 1, 9: 0 };
function hasBatchim(s) {
  const ch = s.trim().slice(-1);
  if (/\d/.test(ch)) return !!DIGIT_BATCHIM[ch];
  const c = ch.charCodeAt(0);
  if (c < 0xac00 || c > 0xd7a3) return false;
  return (c - 0xac00) % 28 !== 0;
}
function fillLine(tpl, picks) {
  return tpl.replace(/\{(\w+)\}(\{(을|이)\})?/g, (_, k, __, josa) => {
    const nm = byId(k, picks[k]).name;
    if (!josa) return nm;
    const b = hasBatchim(nm);
    return nm + (josa === "을" ? (b ? "을" : "를") : (b ? "이" : "가"));
  });
}

// ---------- 스티커 이미지 ----------
const imgCache = new Map();   // key -> 이미지 경로
const alphaCache = new Map(); // src -> 알파 채널 (투명 부분 터치 판정용)
const FOLDER = { animal: "animals", item: "items", symbol: "symbols", place: "places", color: "colors", word: "words", number: "numbers", time: "times" };
// 이미지 위치: data/config.js의 ASSET_BASE(비어 있으면 이 폴더). 다른 서버에 올렸다면 그 주소를 넣음
const ASSET_BASE = window.ASSET_BASE ? String(window.ASSET_BASE).replace(/\/+$/, "") + "/" : "";
const stickerPath = (ref, id, style) => `${ASSET_BASE}assets/stickers/${FOLDER[ref]}/${id}-${style}.webp`;
// 다른 주소의 이미지도 캔버스로 저장할 수 있게 CORS 요청으로 불러옴
const newImg = () => { const im = document.createElement("img"); im.crossOrigin = "anonymous"; return im; };

// 꾸미기 스티커 (SVG → PNG)
const spark = (cx, cy, r) => { const k = r * 0.28; return `M${cx} ${cy - r}Q${cx + k} ${cy - k} ${cx + r} ${cy}Q${cx + k} ${cy + k} ${cx} ${cy + r}Q${cx - k} ${cy + k} ${cx - r} ${cy}Q${cx - k} ${cy - k} ${cx} ${cy - r}Z`; };
const star5 = (cx, cy, R, r) => { let d = ""; for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, rad = k % 2 ? r : R; d += `${k ? "L" : "M"}${(cx + Math.cos(a) * rad).toFixed(1)} ${(cy + Math.sin(a) * rad).toFixed(1)}`; } return d + "Z"; };
const DECO = [
  { id: "sparkle", parts: [["path", { d: spark(160, 160, 120) }, "#FFE156"]] },
  { id: "heart", parts: [["path", { d: "M160 262C60 190 40 110 100 84C136 68 156 92 160 112C164 92 184 68 220 84C280 110 260 190 160 262Z" }, "#FF2E7E"]] },
  { id: "star", parts: [["path", { d: star5(160, 166, 118, 52) }, "#00D2FF"]] },
  { id: "smile", parts: [["circle", { cx: 160, cy: 160, r: 110 }, "#FFE156"]], extra: `<circle cx="122" cy="138" r="13" fill="${INK}"/><circle cx="198" cy="138" r="13" fill="${INK}"/><path d="M106 180Q160 238 214 180" fill="none" stroke="${INK}" stroke-width="12" stroke-linecap="round"/>` },
  { id: "cloud", parts: [["path", { d: "M92 220C44 220 40 160 86 154C82 108 142 92 164 124C182 84 250 94 246 146C290 146 296 220 240 220Z" }, "#FFFFFF"]] },
  { id: "daisy", parts: [...Array(8)].map((_, k) => ["ellipse", { cx: 160 + Math.cos((k * Math.PI) / 4) * 66, cy: 160 + Math.sin((k * Math.PI) / 4) * 66, rx: 44, ry: 30, transform: `rotate(${k * 45} ${160 + Math.cos((k * Math.PI) / 4) * 66} ${160 + Math.sin((k * Math.PI) / 4) * 66})` }, "#FFFFFF"]).concat([["circle", { cx: 160, cy: 160, r: 44 }, "#FFE156"]]) },
  { id: "bolt", parts: [["path", { d: "M186 40L84 180H154L128 282L236 136H166Z" }, "#FFE156"]] },
  { id: "moon", parts: [["path", { d: "M200 58A110 110 0 1 0 262 214A90 90 0 1 1 200 58Z" }, "#B19FFB"]] },
  { id: "mint-heart", parts: [["path", { d: "M160 262C60 190 40 110 100 84C136 68 156 92 160 112C164 92 184 68 220 84C280 110 260 190 160 262Z" }, "#42E2B8"]] },
  { id: "pink-spark", parts: [["path", { d: spark(120, 130, 80) }, "#FF2E7E"], ["path", { d: spark(222, 212, 54) }, "#00D2FF"]] },
  { id: "tape", raw: `<g transform="rotate(-14 160 160)"><rect x="40" y="120" width="240" height="80" rx="6" fill="#FFCCD5" opacity=".85"/><g stroke="#FF7B9C" stroke-width="10" opacity=".5">${[...Array(7)].map((_, k) => `<line x1="${60 + k * 34}" y1="120" x2="${40 + k * 34}" y2="200"/>`).join("")}</g></g>` },
  { id: "dots", parts: [["circle", { cx: 104, cy: 120, r: 40 }, "#FF2E7E"], ["circle", { cx: 214, cy: 128, r: 30 }, "#FFE156"], ["circle", { cx: 160, cy: 222, r: 34 }, "#00D2FF"]] },
];
function decoSVG(d) {
  if (d.raw) return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" width="320" height="320">${d.raw}</svg>`;
  const el = (t, a, extra) => `<${t} ${Object.entries(a).map(([k, v]) => `${k}="${v}"`).join(" ")} ${extra}/>`;
  const under = d.parts.map(([t, a]) => el(t, a, 'fill="#fff" stroke="#fff" stroke-width="44" stroke-linejoin="round"')).join("");
  const top = d.parts.map(([t, a, f]) => el(t, a, `fill="${f}" stroke="${INK}" stroke-width="10" stroke-linejoin="round"`)).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" width="320" height="320">${under}${top}${d.extra || ""}</svg>`;
}
const loadImg = (src) => new Promise((res, rej) => { const im = new Image(); im.crossOrigin = "anonymous"; im.onload = () => res(im); im.onerror = rej; im.src = src; });
async function rasterize(src) {
  const im = await loadImg(src); const c = document.createElement("canvas"); c.width = c.height = BASE;
  c.getContext("2d").drawImage(im, 0, 0, BASE, BASE); return c.toDataURL("image/png");
}

async function stickerSrc(ref, id, style) {
  const key = ref === "deco" ? `deco:${id}` : `${id}-${style}`;
  if (imgCache.has(key)) return imgCache.get(key);
  let src;
  if (ref === "deco") {
    const raw = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(decoSVG(DECO.find((d) => d.id === id)));
    try { src = await rasterize(raw); } catch { src = raw; }
  } else src = stickerPath(ref, id, style);
  imgCache.set(key, src); return src;
}
async function alphaOf(src) {
  if (alphaCache.has(src)) return alphaCache.get(src);
  try {
    const im = await loadImg(src); const c = document.createElement("canvas"); c.width = c.height = BASE;
    const x = c.getContext("2d"); x.drawImage(im, 0, 0, BASE, BASE);
    const a = x.getImageData(0, 0, BASE, BASE).data; alphaCache.set(src, a); return a;
  } catch { alphaCache.set(src, null); return null; }
}

// ---------- 상태 ----------
const S = {
  view: "home", fortune: null, target: 0, birth: "", noBirth: false,
  draw: null,      // {date, fortune, seedHash, round, picks, line}
  style: "y2k", theme: "y2k", layout: 0, stickers: [], sel: null,
  undo: [],
};
let uidN = 1;
const uid = () => `s${Date.now().toString(36)}${uidN++}`;

function saveDraft() {
  if (!S.draw) return;
  store.set("charm:draft:v3", { draw: S.draw, style: S.style, theme: S.theme, layout: S.layout, stickers: S.stickers });
}

// ---------- 화면 전환 ----------
function show(v) {
  S.view = v;
  document.querySelectorAll(".view").forEach((el) => el.classList.toggle("on", el.id === `v-${v}`));
  $("#app").classList.toggle("wide", v === "editor");
  window.scrollTo(0, 0);
  if (v === "home") renderHome();
  if (v === "gallery") renderGallery();
  if (v === "input" && !$("#day-chips").childElementCount) setTarget(isNight() ? 1 : 0);
  if (v === "editor") requestAnimationFrame(layoutBoard);
}
document.querySelectorAll("[data-back]").forEach((b) => b.addEventListener("click", () => show(b.dataset.back)));

function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("on"), 2400); }

// ---------- 홈 ----------
async function renderHome() {
  const hero = $("#hero");
  if (!hero.childElementCount) {
    const picks = [["num_077-y2k", 18, 30, 6], ["courage-retro", 190, 0, 8], ["time_1111-doodle", 300, 120, -6], ["cherry_pink-y2k", 60, 170, 12], ["jackpot-doodle", 180, 190, -4]];
    picks.forEach(([k, l, t, r]) => {
      const [id, st] = k.split("-"); const ref = D.CATS.map((c) => c.id).find((c) => D.DATA[c].some((e) => e.id === id));
      const im = newImg(); im.src = stickerPath(ref, id, st); im.alt = "";
      im.style.cssText = `left:${(l / 480) * 100}%;top:${t}px;transform:rotate(${r}deg)`; hero.appendChild(im);
    });
  }
  const d = store.get("charm:draft:v3", null);
  $("#go-resume").hidden = !(d && d.draw && d.draw.date >= todayKey());
  const night = isNight();
  $("#home-copy").textContent = night
    ? "오늘 하루 수고했어요. 내일을 위한 행운 키워드를 미리 뽑아, 스티커로 나만의 부적을 꾸며 두세요."
    : "생일과 날짜로 행운 키워드 8개를 뽑고, 그 키워드 스티커로 나만의 부적을 꾸며요.";
  $("#go-start").textContent = night ? "내일의 부적 만들기" : "오늘의 부적 만들기";
  $("#home-title").innerHTML = night ? "내일의<br>부적" : "오늘의<br>부적";
  document.title = night ? "내일의 부적" : "오늘의 부적";
  const n = store.get("charm:saved", []).length;
  $("#go-gallery").textContent = n ? `나의 부적 보기 (${n})` : "나의 부적 보기";
}
$("#go-start").addEventListener("click", () => { setTarget(isNight() ? 1 : 0); show("input"); });
$("#go-gallery").addEventListener("click", () => show("gallery"));
$("#go-resume").addEventListener("click", async () => {
  const d = store.get("charm:draft:v3", null); if (!d) return;
  Object.assign(S, { draw: d.draw, style: d.style, theme: themeId(d.theme), layout: d.layout, stickers: d.stickers, sel: null, undo: [] });
  await openEditor(false);
});

// ---------- 입력 ----------
// 날짜 선택 (오늘 / 내일)
function setTarget(off) {
  S.target = off;
  const box = $("#day-chips"); box.innerHTML = "";
  [[0, "오늘"], [1, "내일"]].forEach(([o, label]) => {
    const b = document.createElement("button"); b.className = "chip"; b.setAttribute("aria-pressed", String(o === off));
    b.innerHTML = `${label}<small>${shortDate(dateKey(o))}</small>`;
    b.addEventListener("click", () => setTarget(o));
    box.appendChild(b);
  });
  $("#night-note").hidden = !(isNight() && off === 1);
  $("#do-draw").textContent = `${off ? "내일" : "오늘"}의 키워드 뽑기`;
}
const chips = $("#fortune-chips");
D.FT.forEach((f) => {
  const b = document.createElement("button"); b.className = "chip"; b.textContent = f.name; b.setAttribute("aria-pressed", "false");
  b.addEventListener("click", () => { S.fortune = f.id; chips.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", String(c === b))); validate(); });
  chips.appendChild(b);
});
const birth = $("#birth");
birth.addEventListener("input", () => {
  const n = birth.value.replace(/\D/g, "").slice(0, 8);
  birth.value = n.length > 6 ? `${n.slice(0, 4)}.${n.slice(4, 6)}.${n.slice(6)}` : n.length > 4 ? `${n.slice(0, 4)}.${n.slice(4)}` : n;
  validate();
});
$("#no-birth").addEventListener("change", (e) => { S.noBirth = e.target.checked; birth.disabled = S.noBirth; validate(); });
function birthOK() {
  const m = birth.value.match(/^(\d{4})\.(\d{2})\.(\d{2})$/); if (!m) return false;
  const [y, mo, d] = [+m[1], +m[2], +m[3]]; const dt = new Date(y, mo - 1, d);
  return y >= 1900 && dt <= new Date() && dt.getMonth() === mo - 1 && dt.getDate() === d;
}
function validate() {
  const full = birth.value.length === 10;
  $("#birth-err").textContent = !S.noBirth && full && !birthOK() ? "날짜를 다시 확인해 주세요" : "";
  $("#do-draw").disabled = !(S.fortune && (S.noBirth || birthOK()));
}
$("#do-draw").addEventListener("click", () => {
  const date = dateKey(S.target);
  const b = S.noBirth ? "no-birth" : birth.value;
  const seedHash = String(cyrb53(b));      // 생년월일 원문은 보관하지 않음
  const round = store.get(`charm:round:${date}:${seedHash}:${S.fortune}`, 0);
  runDraw(date, S.fortune, seedHash, round);
});
function runDraw(date, fortune, seedHash, round) {
  const { picks, line } = drawKeywords(`${seedHash}|${fortune}|${date}|${round}`, fortune);
  S.draw = { date, fortune, seedHash, round, picks, line };
  S.stickers = []; S.layout = 0; S.sel = null; S.undo = [];
  renderReveal(); show("reveal");
}

// ---------- 결과 ----------
async function renderReveal() {
  const { picks, line, date, fortune, round } = S.draw;
  const rel = relDay(date);
  $("#rv-title").textContent = rel ? `${rel}의 키워드` : "뽑은 키워드";
  $("#rv-meta").textContent = `${rel ? rel + " " : ""}${dateLabel(date)} ${fortuneName(fortune)}`;
  $("#rv-line").textContent = fillLine(line, picks);
  const left = MAX_ROUNDS - 1 - round;
  const rb = $("#do-reroll"); rb.disabled = left <= 0;
  rb.textContent = left > 0 ? `다시 뽑기 (${left}번 남음)` : "이 날짜의 다시 뽑기를 다 썼어요";
  const grid = $("#kw-grid"); grid.innerHTML = "";
  let k = 0;
  for (const c of D.CATS) {
    const e = byId(c.id, picks[c.id]);
    const card = document.createElement("div"); card.className = "kw pop"; card.style.animationDelay = `${k++ * 90}ms`;
    const im = newImg(); im.alt = e.name; im.width = 112; im.height = 112;
    const cat = document.createElement("div"); cat.className = "cat"; cat.textContent = c.name;
    const nm = document.createElement("div"); nm.className = "nm"; nm.textContent = e.name;
    const mn = document.createElement("div"); mn.className = "mn"; mn.textContent = e.meaning;
    card.append(im, cat, nm, mn); grid.appendChild(card);
    stickerSrc(c.id, e.id, "y2k").then((s) => (im.src = s));
  }
}
$("#do-reroll").addEventListener("click", () => {
  const d = S.draw; const next = d.round + 1; if (next >= MAX_ROUNDS) return;
  store.set(`charm:round:${d.date}:${d.seedHash}:${d.fortune}`, next);
  runDraw(d.date, d.fortune, d.seedHash, next);
  toast("새 키워드를 뽑았어요");
});
$("#go-editor").addEventListener("click", () => openEditor(true));

// ---------- 배치 템플릿 (카드 1080×1350 기준, 윗부분은 제목 자리) ----------
// 부적 틀 안쪽(날짜 아래 ~ 한 줄 문장 위)에 맞춘 자동 배치 틀 [x, y, 크기]
const LAYOUTS = [
  [[270, 780, 1], [620, 760, 0.95], [870, 880, 0.85], [300, 1090, 1.05], [760, 1120, 1], [230, 1430, 0.9], [540, 1470, 0.95], [860, 1430, 0.9]],
  [[540, 1150, 1.5], [230, 790, 0.85], [540, 770, 0.8], [850, 790, 0.85], [210, 1180, 0.8], [880, 1180, 0.8], [300, 1520, 0.85], [780, 1520, 0.85]],
  [[250, 800, 0.9], [540, 780, 0.95], [830, 810, 0.9], [250, 1130, 0.95], [540, 1160, 0.9], [830, 1130, 0.95], [380, 1480, 0.95], [700, 1480, 0.95]],
  [[240, 790, 0.9], [520, 880, 1], [820, 800, 0.9], [330, 1110, 0.95], [720, 1160, 1.05], [230, 1450, 0.9], [520, 1520, 0.9], [830, 1450, 0.95]],
];
function autoPlace(layoutIdx, rnd = Math.random) {
  const cats = D.CATS.map((c) => c.id);
  let order;
  if (layoutIdx === 1) order = ["animal", ...cats.filter((c) => c !== "animal").sort(() => rnd() - 0.5)];
  else order = [...cats].sort(() => rnd() - 0.5);
  const t = frameOf().theme;
  return LAYOUTS[layoutIdx].map(([bx, by, bs], k) => {
    const { x, y, s } = toTheme({ x: bx, y: by, s: bs }, t);
    return { uid: uid(), ref: order[k], id: S.draw.picks[order[k]], st: S.style,
      x: x + (rnd() - 0.5) * 40, y: y + (rnd() - 0.5) * 40, s, r: Math.round((rnd() - 0.5) * 24) };
  });
}

// ---------- 편집기 ----------
const board = $("#board"), layer = $("#stk-layer"), selBox = $("#sel");
let K = 1;
async function openEditor(fresh) {
  if (fresh) {
    const d = store.get("charm:draft:v3", null);
    const same = d && d.draw && d.draw.date === S.draw.date && d.draw.seedHash === S.draw.seedHash && d.draw.fortune === S.draw.fortune && d.draw.round === S.draw.round;
    if (same) Object.assign(S, { style: d.style, theme: themeId(d.theme), layout: d.layout, stickers: d.stickers.map((x) => ({ ...x, st: x.ref === "deco" ? null : x.st || d.style })) });
    else { S.layout = Math.floor(Math.random() * LAYOUTS.length); S.stickers = autoPlace(S.layout); }
    S.sel = null; S.undo = [];
  }
  renderThemeSwatches(); renderStyleSeg(); applyCardSize(); renderCardText();
  show("editor");
  await renderStickers(); renderTray(); saveDraft();
}
// ---------- 부적 틀 ----------
// 틀은 처음 고른 운세에 맞춰 고정. 테마는 같은 운세의 다른 디자인 묶음이며, 2개 이상일 때만 선택 버튼이 보임.
// 새 테마 추가: data/frame-themes.js에 항목을 넣고 assets/frames/{테마id}/{운세id}.webp 이미지를 넣으면 끝.
const FRAME_THEMES = window.FRAME_THEMES;   // data/frame-themes.js
// 배치 틀(LAYOUTS)은 기본 테마 좌표로 적혀 있고, 테마의 area에 맞춰 옮겨 씀
const BASE_AREA = { y: [760, 1520] };
const chOf = (t) => Math.round((CW * t.size[1]) / t.size[0]);
function toTheme(p, t) {
  const [a0, a1] = BASE_AREA.y, [b0, b1] = t.area.y;
  return { x: 540 + (p.x - 540) * t.area.xk, y: b0 + ((p.y - a0) * (b1 - b0)) / (a1 - a0), s: p.s * t.area.sk };
}
function fromTheme(p, t) {
  const [a0, a1] = BASE_AREA.y, [b0, b1] = t.area.y;
  return { x: 540 + (p.x - 540) / t.area.xk, y: a0 + ((p.y - b0) * (a1 - a0)) / (b1 - b0), s: p.s / t.area.sk };
}
function applyCardSize() {
  const t = frameOf().theme; CH = chOf(t);
  const sh = $("#shell");
  sh.style.aspectRatio = `${t.size[0]} / ${t.size[1]}`;
  sh.style.width = `min(100%, calc(66vh * ${t.size[0]} / ${t.size[1]}))`;
}
const themeId = (id) => (!id || id === "basic" ? "y2k" : id);   // 예전 이름 "basic" 호환
function frameOf(themeId = S.theme, fortune = S.draw.fortune) {
  let t = FRAME_THEMES.find((x) => x.id === themeId && x.fortunes.includes(fortune));
  if (!t) t = FRAME_THEMES[0];                         // 해당 운세 틀이 없는 테마는 기본으로
  return { theme: t, src: `${ASSET_BASE}assets/frames/${t.id}/${fortune}.webp`, ...t.colors[fortune], text: t.text };
}
function renderThemeSwatches() {
  const wrap = $("#theme-sw"); wrap.innerHTML = "";
  const avail = FRAME_THEMES.filter((t) => t.fortunes.includes(S.draw.fortune));
  wrap.hidden = avail.length < 2;
  if (avail.length > 1) { const l = document.createElement("span"); l.className = "sw-label"; l.textContent = "틀"; wrap.appendChild(l); }
  avail.forEach((t) => {
    const b = document.createElement("button"); b.className = "sw frame-sw"; b.setAttribute("aria-label", `${t.name} 틀`);
    b.setAttribute("aria-pressed", String(frameOf().theme.id === t.id));
    b.style.backgroundImage = `url(${frameOf(t.id).src})`;
    b.addEventListener("click", () => {
      const from = frameOf().theme; if (from.id === t.id) return;
      pushUndo(); S.theme = t.id; const to = frameOf().theme;
      // 붙어 있는 스티커는 틀 안의 상대 위치를 유지한 채 새 틀로 옮김
      S.stickers.forEach((st) => { const p = toTheme(fromTheme(st, from), to); st.x = p.x; st.y = p.y; st.s = p.s; });
      renderThemeSwatches(); layoutBoard(); saveDraft();
    });
    wrap.appendChild(b);
  });
}
function renderStyleSeg() {
  $("#style-seg").querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.style === S.style)));
}
// 스타일은 아래 '오늘의 키워드' 트레이에만 적용. 이미 붙인 스티커는 각자 붙일 때의 스타일을 유지
const styleOf = (s) => s.st || S.style;
$("#style-seg").addEventListener("click", async (e) => {
  const b = e.target.closest("button"); if (!b || b.dataset.style === S.style) return;
  S.style = b.dataset.style; renderStyleSeg(); renderTray(); saveDraft();
});
function cardTexts() {
  const d = S.draw;
  return {
    title: "오늘의 부적",
    sub: `${dateLabel(d.date)} ${fortuneName(d.fortune)}`,
    foot: fillLine(d.line, d.picks),
  };
}
// 글자: 틀에 "○○운 부적" 제목이 그려져 있으므로 날짜와 한 줄 문장만 얹음
function renderCardText() {
  const f = frameOf(); const t = cardTexts();
  const fi = $("#frame-img"); if (fi.dataset.src !== f.src.slice(-40)) { fi.src = f.src; fi.dataset.src = f.src.slice(-40); }
  const set = (el, txt, y, size) => {
    el.textContent = txt; el.style.top = `${((y - size * 0.6) / CH) * 100}%`; el.style.fontSize = `${size * K}px`;
    el.style.fontFamily = "var(--body)"; el.style.color = f.ink; el.style.lineHeight = "1.2";
    const h = f.paper, w = Math.max(1, 5 * K);
    el.style.textShadow = `0 0 ${w}px ${h},0 0 ${w}px ${h},0 0 ${w * 2}px ${h},${w}px 0 ${h},-${w}px 0 ${h},0 ${w}px ${h},0 -${w}px ${h}`;
  };
  set($("#ct-sub"), t.sub, f.text.sub[0], f.text.sub[1]);
  set($("#ct-foot"), t.foot, f.text.foot[0], fitFootSize(t.foot, f.text.foot[1], f.text.foot[2]));
}
function fitFootSize(txt, start = 34, maxW = 940) { const c = document.createElement("canvas").getContext("2d"); let s = start; c.font = `${s}px "Gowun Dodum"`; while (c.measureText(txt).width > maxW && s > 20) { s--; c.font = `${s}px "Gowun Dodum"`; } return s; }

function layoutBoard() {
  applyCardSize();
  const w = board.clientWidth; if (!w) return;
  K = w / CW; renderCardText(); positionAll();
}
window.addEventListener("resize", () => { if (S.view === "editor") layoutBoard(); });
// 카드 크기가 바뀌는 모든 경우(틀 테마 변경, 화면 회전, 레이아웃 변화)에 실제 크기로 다시 계산
if (window.ResizeObserver) new ResizeObserver(() => { if (S.view === "editor" && board.clientWidth && Math.abs(board.clientWidth / CW - K) > 1e-4) { K = board.clientWidth / CW; renderCardText(); positionAll(); } }).observe(board);

async function renderStickers() {
  layer.innerHTML = "";
  for (const s of S.stickers) {
    const im = newImg(); im.className = "stk"; im.dataset.uid = s.uid; im.alt = ""; im.draggable = false;
    im.src = await stickerSrc(s.ref, s.id, styleOf(s));
    layer.appendChild(im);
  }
  layoutBoard(); updateSel();
}
function place(el, s) {
  const size = BASE * K;
  el.style.width = el.style.height = `${size}px`;
  el.style.transform = `translate(${s.x * K - size / 2}px,${s.y * K - size / 2}px) rotate(${s.r}deg) scale(${s.s})`;
}
function positionAll() { S.stickers.forEach((s) => { const el = layer.querySelector(`[data-uid="${s.uid}"]`); if (el) place(el, s); }); updateSel(); }
const cur = () => S.stickers.find((s) => s.uid === S.sel);
function updateSel() {
  const s = cur();
  selBox.classList.toggle("on", !!s);
  $("#hint").textContent = s ? "분홍 손잡이로 크기와 각도를, 위의 막대로 순서·스타일을 바꿔요" : "아래 스티커를 누르면 카드에 붙어요. 붙인 스티커는 끌어서 옮겨요.";
  if (!s) { $("#ftb").hidden = true; return; }
  const w = BASE * s.s * K * 0.86;
  selBox.style.width = selBox.style.height = `${w}px`;
  selBox.style.transform = `translate(${s.x * K - w / 2}px,${s.y * K - w / 2}px) rotate(${s.r}deg)`;
  placeToolbar(s, w);
}
function select(u) { S.sel = u; updateSel(); }
// 편집 막대: 선택한 스티커 바로 위(공간이 없으면 아래)에 붙고, 카드 폭 안으로 맞춤. 끄는 동안에는 숨김
function placeToolbar(s, w) {
  const tb = $("#ftb");
  if (drag && drag.moved) { tb.hidden = true; return; }
  const kw = s.ref !== "deco";
  tb.querySelectorAll("[data-kw]").forEach((el) => (el.hidden = !kw));
  tb.querySelectorAll(".ftb-st").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.act === `st:${styleOf(s)}`)));
  tb.hidden = false;
  const shellW = $("#shell").clientWidth, tw = tb.offsetWidth, th = tb.offsetHeight;
  const half = (w / 2) * (Math.abs(Math.cos((s.r * Math.PI) / 180)) + Math.abs(Math.sin((s.r * Math.PI) / 180)));
  const cx = s.x * K, cy = s.y * K;
  let top = cy - half - th - 22;                       // 위쪽 (분홍 손잡이와 겹치지 않게 여유)
  if (top < 2) top = cy + half + 14;                   // 위가 좁으면 아래로
  const left = Math.max(2, Math.min(shellW - tw - 2, cx - tw / 2));
  tb.style.transform = `translate(${left}px,${top}px)`;
}

// 되돌리기
function snapshot() { return JSON.stringify({ stickers: S.stickers, theme: S.theme, layout: S.layout }); }
function pushUndo(snap) { S.undo.push(snap || snapshot()); if (S.undo.length > 30) S.undo.shift(); $("#undo").disabled = false; }
$("#undo").addEventListener("click", async () => {
  const snap = S.undo.pop(); if (!snap) return;
  const d = JSON.parse(snap); Object.assign(S, d);
  if (!S.stickers.find((s) => s.uid === S.sel)) S.sel = null;
  $("#undo").disabled = !S.undo.length;
  renderThemeSwatches(); renderStyleSeg(); renderCardText(); await renderStickers(); renderTray(); saveDraft();
});

// 터치/마우스
const toLogical = (e) => { const r = board.getBoundingClientRect(); return { x: (e.clientX - r.left) / K, y: (e.clientY - r.top) / K }; };
async function hitTest(p) {
  for (let k = S.stickers.length - 1; k >= 0; k--) {
    const s = S.stickers[k];
    const dx = p.x - s.x, dy = p.y - s.y, a = (-s.r * Math.PI) / 180;
    let u = (dx * Math.cos(a) - dy * Math.sin(a)) / s.s, v = (dx * Math.sin(a) + dy * Math.cos(a)) / s.s;
    u += BASE / 2; v += BASE / 2;
    if (u < 0 || v < 0 || u >= BASE || v >= BASE) continue;
    if (s.uid === S.sel && Math.abs(u - 160) < 125 && Math.abs(v - 160) < 125) return s;
    const alpha = await alphaOf(await stickerSrc(s.ref, s.id, styleOf(s)));
    if (!alpha || alpha[(Math.floor(v) * BASE + Math.floor(u)) * 4 + 3] > 24) return s;
  }
  return null;
}
let drag = null;
// 눌렀다 바로 뗀 경우(이미지 판정이 끝나기 전에 손을 뗌)에는 선택만 하고 끌기 상태로 남지 않게
let pressing = false;
board.addEventListener("pointerdown", async (e) => {
  if (e.target.closest("#handle")) return;
  e.preventDefault(); pressing = true;
  const pid = e.pointerId; try { board.setPointerCapture(pid); } catch {}
  const p = toLogical(e); const hit = await hitTest(p);
  if (!hit) { select(null); return; }
  if (pressing) drag = { mode: "move", s: hit, sx: p.x, sy: p.y, ox: hit.x, oy: hit.y, snap: snapshot(), moved: false };
  select(hit.uid);
});
document.addEventListener("pointerup", () => { pressing = false; }, true);
document.addEventListener("pointercancel", () => { pressing = false; }, true);
$("#handle").addEventListener("pointerdown", (e) => {
  e.preventDefault(); e.stopPropagation();
  const s = cur(); if (!s) return;
  try { e.target.setPointerCapture(e.pointerId); } catch {}
  const p = toLogical(e);
  drag = { mode: "xform", s, a0: Math.atan2(p.y - s.y, p.x - s.x), d0: Math.hypot(p.x - s.x, p.y - s.y) || 1, s0: s.s, r0: s.r, snap: snapshot(), moved: false };
});
document.addEventListener("pointermove", (e) => {
  if (!drag) return;
  const p = toLogical(e); const s = drag.s;
  if (!drag.moved) { pushUndo(drag.snap); drag.moved = true; }
  if (drag.mode === "move") {
    s.x = Math.max(0, Math.min(CW, drag.ox + p.x - drag.sx)); s.y = Math.max(0, Math.min(CH, drag.oy + p.y - drag.sy));
  } else {
    const a = Math.atan2(p.y - s.y, p.x - s.x), d = Math.hypot(p.x - s.x, p.y - s.y);
    s.s = Math.max(0.35, Math.min(3, drag.s0 * (d / drag.d0)));
    s.r = Math.round(drag.r0 + ((a - drag.a0) * 180) / Math.PI);
  }
  const el = layer.querySelector(`[data-uid="${s.uid}"]`); if (el) place(el, s); updateSel();
});
const endDrag = () => { const moved = drag && drag.moved; drag = null; if (moved) { saveDraft(); updateSel(); } };
document.addEventListener("pointerup", endDrag);
document.addEventListener("pointercancel", endDrag);
document.addEventListener("keydown", (e) => {
  if (S.view !== "editor" || !cur() || e.target.matches("input")) return;
  const s = cur(); const step = e.shiftKey ? 30 : 8; let used = true;
  if (e.key === "Delete" || e.key === "Backspace") return doAct("del");
  if (e.key === "ArrowLeft") s.x -= step; else if (e.key === "ArrowRight") s.x += step;
  else if (e.key === "ArrowUp") s.y -= step; else if (e.key === "ArrowDown") s.y += step; else used = false;
  if (used) { e.preventDefault(); positionAll(); saveDraft(); }
});

// 도구
async function doAct(act) {
  const s = cur(); if (!s) return;
  pushUndo();
  const i = S.stickers.indexOf(s);
  if (act === "front" && i < S.stickers.length - 1) { S.stickers.splice(i, 1); S.stickers.push(s); }
  if (act === "back" && i > 0) { S.stickers.splice(i, 1); S.stickers.unshift(s); }
  if (act === "rotate") s.r += 15;
  if (act.startsWith("st:")) { if (s.ref === "deco" || s.st === act.slice(3)) { S.undo.pop(); return; } s.st = act.slice(3); }
  if (act === "del") { S.stickers.splice(i, 1); S.sel = null; }
  await renderStickers(); renderTray(); saveDraft();
}
$("#ftb").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) doAct(b.dataset.act); });
$("#ftb").addEventListener("pointerdown", (e) => e.stopPropagation());

// ---------- 일괄 편집 ----------
const STYLE_NAME = { y2k: "Y2K 팝", retro: "레트로", doodle: "두들" };
function openBulk() {
  const del = $("#bulk-del"); del.dataset.armed = ""; del.textContent = "스티커 모두 지우기";
  del.disabled = !S.stickers.length;
  $("#bulk-style").querySelectorAll("button").forEach((b) => (b.disabled = !S.stickers.some((x) => x.ref !== "deco")));
  $("#bulk").classList.add("on"); $("#bulk-close").focus();
}
const closeBulk = () => $("#bulk").classList.remove("on");
$("#do-bulk").addEventListener("click", openBulk);
$("#bulk-close").addEventListener("click", closeBulk);
$("#bulk").addEventListener("click", (e) => { if (e.target.id === "bulk") closeBulk(); });
// 붙인 키워드 스티커 전부 같은 스타일로 (트레이 스타일도 함께 맞춤)
$("#bulk-style").addEventListener("click", async (e) => {
  const b = e.target.closest("button"); if (!b) return;
  const st = b.dataset.style; pushUndo();
  S.stickers.forEach((x) => { if (x.ref !== "deco") x.st = st; });
  S.style = st; renderStyleSeg(); closeBulk();
  await renderStickers(); renderTray(); saveDraft(); toast(`붙인 스티커를 모두 ${STYLE_NAME[st]}로 바꿨어요`);
});
// 키워드 8개를 고른 스타일로 한 번에 (배치 틀 하나를 골라 자동 배치)
$("#bulk-add").addEventListener("click", async (e) => {
  const b = e.target.closest("button"); if (!b) return;
  const st = b.dataset.style;
  if (S.stickers.length + D.CATS.length > MAX_STICKERS) { toast(`스티커는 ${MAX_STICKERS}개까지예요. 몇 개를 지우고 다시 해 주세요`); return; }
  pushUndo();
  const set = autoPlace(Math.floor(Math.random() * LAYOUTS.length)).map((x) => ({ ...x, st }));
  S.stickers.push(...set); S.sel = null; closeBulk();
  await renderStickers(); renderTray(); saveDraft(); toast(`${STYLE_NAME[st]} 키워드 세트를 붙였어요`);
});
// 모두 지우기: 실수 방지로 두 번 눌러야 지워지고, 되돌리기로 복구 가능
$("#bulk-del").addEventListener("click", async (e) => {
  const b = e.currentTarget;
  if (!b.dataset.armed) { b.dataset.armed = "1"; b.textContent = "한 번 더 누르면 모두 지워져요"; return; }
  pushUndo(); S.stickers = []; S.sel = null; closeBulk();
  await renderStickers(); renderTray(); saveDraft(); toast("모두 지웠어요. 되돌리기(↶)로 복구할 수 있어요");
});

// 트레이
let tab = "kw";
document.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => {
  tab = b.dataset.tab; document.querySelectorAll("[data-tab]").forEach((t) => t.setAttribute("aria-selected", String(t === b)));
  $("#style-seg").hidden = tab !== "kw"; renderTray();
}));
async function renderTray() {
  const tray = $("#tray"); tray.innerHTML = "";
  const items = tab === "kw" ? D.CATS.map((c) => ({ ref: c.id, id: S.draw.picks[c.id], label: `${c.name} ${byId(c.id, S.draw.picks[c.id]).name}` }))
    : DECO.map((d) => ({ ref: "deco", id: d.id, label: "꾸미기 스티커" }));
  for (const it of items) {
    const b = document.createElement("button"); b.setAttribute("aria-label", `${it.label} 붙이기`);
    const im = newImg(); im.alt = ""; im.src = await stickerSrc(it.ref, it.id, it.ref === "deco" ? null : S.style);
    b.appendChild(im);
    const n = it.ref === "deco" ? 0 : S.stickers.filter((s) => s.ref === it.ref).length;
    if (n) { const c = document.createElement("span"); c.className = "cnt"; c.textContent = n; c.setAttribute("aria-hidden", "true"); b.appendChild(c); }
    b.addEventListener("click", () => addSticker(it.ref, it.id));
    tray.appendChild(b);
  }
}
async function addSticker(ref, id) {
  if (S.stickers.length >= MAX_STICKERS) return toast(`스티커는 ${MAX_STICKERS}개까지 붙일 수 있어요`);
  pushUndo();
  const s = { uid: uid(), ref, id, st: ref === "deco" ? null : S.style, x: 540 + (Math.random() - 0.5) * 160, y: 1150 + (Math.random() - 0.5) * 220, s: ref === "deco" ? 0.55 : 0.95, r: Math.round((Math.random() - 0.5) * 20) };
  S.stickers.push(s); S.sel = s.uid;
  await renderStickers(); renderTray(); saveDraft();
}
$("#do-shuffle").addEventListener("click", async () => {
  // 키워드별 첫 번째 스티커를 새 배치 틀 자리로 옮김. 스타일, 같은 키워드 추가분, 꾸미기 스티커는 그대로
  pushUndo();
  let n; do { n = Math.floor(Math.random() * LAYOUTS.length); } while (n === S.layout && LAYOUTS.length > 1);
  S.layout = n;
  autoPlace(n).forEach((slot) => {
    const s = S.stickers.find((x) => x.ref === slot.ref); if (!s) return;
    Object.assign(s, { x: slot.x, y: slot.y, s: slot.s, r: slot.r });
  });
  S.sel = null; await renderStickers(); renderTray(); saveDraft();
});

// ---------- 저장 ----------
async function renderCanvas(scale = 1) {
  await document.fonts.ready;
  const c = document.createElement("canvas"); c.width = CW * scale; c.height = CH * scale;
  const x = c.getContext("2d"); x.scale(scale, scale);
  const f = frameOf();
  const fr = await loadImg(f.src);
  x.save(); x.shadowColor = "rgba(27,19,32,.16)"; x.shadowBlur = 16; x.shadowOffsetY = 6; x.drawImage(fr, 0, 0, CW, CH); x.restore();
  const t = cardTexts(); x.fillStyle = f.ink; x.textAlign = "center"; x.textBaseline = "middle";
  const halo = (txt, y) => { x.save(); x.strokeStyle = f.paper; x.lineWidth = 12; x.lineJoin = "round"; x.strokeText(txt, CW / 2, y); x.restore(); x.fillText(txt, CW / 2, y); };
  x.font = `${f.text.sub[1]}px "Gowun Dodum"`; halo(t.sub, f.text.sub[0]);
  x.font = `${fitFootSize(t.foot, f.text.foot[1], f.text.foot[2])}px "Gowun Dodum"`; halo(t.foot, f.text.foot[0]);
  for (const s of S.stickers) {
    const im = await loadImg(await stickerSrc(s.ref, s.id, styleOf(s)));
    x.save(); x.translate(s.x, s.y); x.rotate((s.r * Math.PI) / 180); x.scale(s.s, s.s);
    x.drawImage(im, -BASE / 2, -BASE / 2, BASE, BASE); x.restore();
  }
  return c;
}
const toBlob = (c, type, q) => new Promise((r) => c.toBlob(r, type, q));
// 이미지 저장: 일반 다운로드 링크. 다운로드가 막힌 환경(일부 인앱 브라우저)에서는 이미지를 길게 눌러 저장
async function downloadCanvas(c, fname) {
  const blob = await toBlob(c, "image/png");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = fname;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

$("#do-save").addEventListener("click", async () => {
  select(null);
  const c = await renderCanvas(1);
  const url = c.toDataURL("image/png");
  const fname = `오늘의부적_${S.draw.date}.png`;
  openModal("부적이 완성됐어요", url, "저장이 안 되면 이미지를 길게 누르거나 오른쪽 클릭해서 저장할 수 있어요.", [
    ["이미지로 저장", "btn", async () => {
      try { await downloadCanvas(c, fname); toast("이미지를 저장했어요"); }
      catch { toast("여기서는 저장할 수 없어요. 이미지를 길게 눌러 저장해 주세요"); }
    }],
    ["나의 부적에 보관", "btn sub", async (btn) => { if (await keepCharm(c)) { btn.disabled = true; btn.textContent = "보관했어요"; } }],
    navigator.canShare && ["공유하기", "btn sub", async () => {
      try { const f = new File([await toBlob(c, "image/png")], fname, { type: "image/png" }); if (!navigator.canShare({ files: [f] })) throw 0; await navigator.share({ files: [f], title: "오늘의 부적" }); }
      catch (err) { if (!err || err.name !== "AbortError") toast("이 화면에서는 공유를 쓸 수 없어요"); }
    }],
    ["계속 꾸미기", "link", closeModal],
  ].filter(Boolean));
});
async function keepCharm(c) {
  const th = document.createElement("canvas"); const TH = Math.round((432 * CH) / CW); th.width = 432; th.height = TH; const tx = th.getContext("2d"); tx.fillStyle = "#FFFFFF"; tx.fillRect(0, 0, 432, TH); tx.drawImage(c, 0, 0, 432, TH);
  const list = store.get("charm:saved", []);
  const item = { id: uid(), date: S.draw.date, fortune: S.draw.fortune, thumb: th.toDataURL("image/jpeg", 0.82), words: D.CATS.map((k) => byId(k.id, S.draw.picks[k.id]).name) };
  const next = [item, ...list].slice(0, 24);
  if (!store.set("charm:saved", next)) { toast("보관함이 가득 찼어요. 오래된 부적을 지워 주세요"); return false; }
  toast("나의 부적에 보관했어요"); return true;
}

// ---------- 모달 ----------
function openModal(title, img, note, actions) {
  $("#m-title").textContent = title; $("#m-img").src = img; $("#m-img").alt = title; $("#m-note").textContent = note;
  const box = $("#m-actions"); box.innerHTML = "";
  actions.forEach(([label, cls, fn]) => { const b = document.createElement("button"); b.className = cls; b.textContent = label; b.addEventListener("click", () => fn(b)); box.appendChild(b); });
  $("#modal").classList.add("on"); box.querySelector("button")?.focus();
}
function closeModal() { $("#modal").classList.remove("on"); }
$("#modal").addEventListener("click", (e) => { if (e.target.id === "modal") closeModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") { closeModal(); closeBulk(); } });

// ---------- 나의 부적 ----------
function renderGallery() {
  const g = $("#gallery"); g.innerHTML = "";
  const list = store.get("charm:saved", []);
  if (!list.length) {
    g.style.display = "block";
    g.innerHTML = `<div class="empty">아직 보관한 부적이 없어요.<br>첫 부적을 만들어 볼까요?</div>`;
    const b = document.createElement("button"); b.className = "btn"; b.textContent = "부적 만들기"; b.addEventListener("click", () => show("input")); g.appendChild(b);
    return;
  }
  g.style.display = "";
  list.forEach((it) => {
    const b = document.createElement("button");
    const im = document.createElement("img"); im.src = it.thumb; im.alt = `${dateLabel(it.date)} ${fortuneName(it.fortune)} 부적`;
    const sp = document.createElement("span"); sp.textContent = `${dateLabel(it.date)} ${fortuneName(it.fortune)}`;
    b.append(im, sp);
    b.addEventListener("click", () => openModal(`${dateLabel(it.date)} ${fortuneName(it.fortune)}`, it.thumb, it.words.join(", "), [
      ["지우기", "btn sub", () => { store.set("charm:saved", store.get("charm:saved", []).filter((x) => x.id !== it.id)); closeModal(); renderGallery(); toast("지웠어요"); }],
      ["닫기", "link", closeModal],
    ]));
    g.appendChild(b);
  });
}

renderHome();
})();
