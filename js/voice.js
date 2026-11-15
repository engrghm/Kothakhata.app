// Voice: speech recognition wrapper + Bangla entry parser + optional AI refine (user's own Gemini key).
import { enDigits, ymd, localISO, hm } from './util.js';
import * as db from './db.js';

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
export const voiceSupported = !!SR;

export function listen({ lang, onInterim, onFinal, onEnd, onError, silenceMs = 2500 } = {}) {
  if (!SR) { onError?.('এই ব্রাউজারে ভয়েস টাইপিং নেই। Chrome বা Edge ব্যবহার করুন।'); onEnd?.(); return () => {}; }
  const r = new SR();
  r.lang = lang || db.settings().voiceLang || 'bn-BD';
  r.interimResults = true;
  r.continuous = true;
  r.maxAlternatives = 1;
  let finalText = '';
  let silence;
  let stopped = false;
  const arm = () => { clearTimeout(silence); if (silenceMs) silence = setTimeout(() => { stopped = true; r.stop(); }, silenceMs); };
  r.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) finalText += (finalText ? ' ' : '') + t.trim(); else interim += t;
    }
    onInterim?.((finalText + ' ' + interim).trim());
    arm();
  };
  r.onerror = (e) => {
    const map = { 'not-allowed': 'মাইক্রোফোনের অনুমতি দেওয়া হয়নি। ঠিকানা বারের পাশে মাইক আইকন থেকে অনুমতি দিন।', 'no-speech': 'কোনো কথা শোনা যায়নি, আবার চেষ্টা করুন।', network: 'ভয়েস টাইপিং-এর জন্য ইন্টারনেট দরকার।', 'audio-capture': 'মাইক্রোফোন পাওয়া যায়নি।' };
    onError?.(map[e.error] || 'ভয়েস টাইপিং-এ সমস্যা: ' + e.error);
  };
  r.onend = () => { clearTimeout(silence); if (finalText) onFinal?.(finalText); onEnd?.(); };
  try { r.start(); arm(); } catch (e) { onError?.(String(e)); onEnd?.(); }
  return () => { stopped = true; try { r.stop(); } catch {} };
}

// Long dictation: keeps listening (restarts after the browser's own pauses) until stop() is called.
export function dictate({ lang, onText, onEnd, onError }) {
  let active = true, committed = '', cur = null;
  const startOne = () => {
    cur = listen({
      lang, silenceMs: 0,
      onInterim: (t) => onText(committed, t),
      onFinal: (t) => { committed += (committed ? ' ' : '') + t; onText(committed, ''); },
      onError: (m) => { if (!/কোনো কথা শোনা যায়নি/.test(m)) { active = false; onError?.(m); } },
      onEnd: () => { if (active) setTimeout(startOne, 150); else onEnd?.(committed); },
    });
  };
  startOne();
  return () => { active = false; cur?.(); };
}

// ---------------- number words ----------------
const UNITS = {
  'শূন্য': 0, 'এক': 1, 'দুই': 2, 'দু': 2, 'তিন': 3, 'চার': 4, 'পাঁচ': 5, 'পাচ': 5, 'ছয়': 6, 'ছয়': 6, 'ছ': 6, 'সাত': 7, 'আট': 8, 'নয়': 9, 'নয়': 9, 'দশ': 10,
  'এগারো': 11, 'এগার': 11, 'বারো': 12, 'বার': 12, 'তেরো': 13, 'তের': 13, 'চৌদ্দ': 14, 'পনেরো': 15, 'পনের': 15, 'ষোলো': 16, 'ষোল': 16, 'সতেরো': 17, 'সতের': 17, 'আঠারো': 18, 'আঠার': 18, 'উনিশ': 19, 'ঊনিশ': 19,
  'বিশ': 20, 'কুড়ি': 20, 'একুশ': 21, 'বাইশ': 22, 'তেইশ': 23, 'চব্বিশ': 24, 'পঁচিশ': 25, 'পচিশ': 25, 'ছাব্বিশ': 26, 'সাতাশ': 27, 'আঠাশ': 28, 'ঊনত্রিশ': 29, 'উনত্রিশ': 29,
  'ত্রিশ': 30, 'তিরিশ': 30, 'পঁয়ত্রিশ': 35, 'চল্লিশ': 40, 'পঁয়তাল্লিশ': 45, 'পঞ্চাশ': 50, 'পঞ্চান্ন': 55, 'ষাট': 60, 'পঁয়ষট্টি': 65, 'সত্তর': 70, 'পঁচাত্তর': 75, 'আশি': 80, 'পঁচাশি': 85, 'নব্বই': 90, 'পঁচানব্বই': 95,
  'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10, 'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50, 'hundred': 100,
};
const FRACT = { 'আড়াই': 2.5, 'আড়াই': 2.5, 'দেড়': 1.5, 'দেড়': 1.5 };
const MULT = { 'শো': 100, 'শ': 100, 'শত': 100, 'হাজার': 1000, 'k': 1000, 'হাজ়ার': 1000, 'লাখ': 100000, 'লক্ষ': 100000, 'কোটি': 10000000, 'thousand': 1000, 'lakh': 100000 };

const norm = (s) => String(s || '').normalize('NFC');
for (const T of [UNITS, FRACT, MULT]) for (const k of Object.keys(T)) { const n = norm(k); if (n !== k) T[n] = T[k]; }
function tokenize(text) {
  const toks = enDigits(norm(text))
    .replace(/(\d),(\d)/g, '$1$2')
    .replace(/(\d)\s*(k|K)\b/g, '$1 k')
    .replace(/(\d)(হাজার|লাখ|লক্ষ|শো|শত|টাকা|টাকার|টাকায়)/g, '$1 $2')
    .replace(/[,।!?.]/g, ' ')
    .split(/\s+/).filter(Boolean);
  // পাঁচশো → পাঁচ শো, বারোশো → বারো শো (only when the stem is a number word)
  const out = [];
  for (const t of toks) {
    const m = !(t in UNITS) && t.match(/^(.+?)(শো|শ|শত)$/);
    if (m && (m[1] in UNITS || m[1] in FRACT)) out.push(m[1], m[2]); else out.push(t);
  }
  return out;
}

// Find number spans in token list. Returns [{value, start, end}]
export function findNumbers(tokens) {
  const out = [];
  let i = 0;
  while (i < tokens.length) {
    let t = tokens[i];
    const prefixAt = i;
    let half = 0;
    if (t === norm('সাড়ে') || t === norm('সাড়ে')) { half = 0.5; i++; t = tokens[i]; }
    let quarterLess = 0;
    if (t === 'পৌনে') { quarterLess = 0.25; i++; t = tokens[i]; }
    const isNum = (x) => x !== undefined && (/^\d+(\.\d+)?$/.test(x) || x in UNITS || x in FRACT);
    if (!isNum(t)) { i = prefixAt + 1; continue; }
    const start = prefixAt;
    let total = 0, cur = 0;
    while (i < tokens.length) {
      const x = tokens[i];
      if (/^\d+(\.\d+)?$/.test(x)) cur += parseFloat(x);
      else if (x in UNITS) cur += UNITS[x];
      else if (x in FRACT) cur += FRACT[x];
      else if (x in MULT && (cur || total)) {
        const m = MULT[x];
        if (m === 100) cur = (cur || 1) * 100;
        else { total += ((cur || 1) + (half && !total ? half : 0) - (quarterLess && !total ? quarterLess : 0)) * m; cur = 0; half = 0; quarterLess = 0; }
      } else break;
      i++;
    }
    total += cur + (half ? half : 0) - (quarterLess ? quarterLess : 0);
    if (total > 0) out.push({ value: Math.round(total * 100) / 100, start, end: i });
  }
  return out;
}

const INCOME_WORDS = ['পেলাম', 'পেয়েছি', 'পেয়েছি', 'পাইছি', 'পাইলাম', 'আয়', 'আয়', 'ইনকাম', 'বেতন', 'স্যালারি', 'বিক্রি', 'জমা পেলাম', 'লাভ', 'received', 'income', 'salary', 'got'];
const EXPENSE_WORDS = ['খরচ', 'দিলাম', 'কিনলাম', 'কিনেছি', 'পরিশোধ', 'বিল', 'ভাড়া', 'ভাড়া', 'spent', 'paid', 'bought'];

export function parseEntry(text, categories = []) {
  const raw = norm(text).trim();
  const tokens = tokenize(raw);
  const nums = findNumbers(tokens);
  // prefer number right before "টাকা", else the largest
  let pick = null;
  for (const n of nums) if (/^টাকা/.test(tokens[n.end] || '')) pick = n;
  if (!pick && nums.length) pick = nums.reduce((a, b) => (b.value > a.value ? b : a));
  const lower = raw.toLowerCase();
  const has = (w) => lower.includes(norm(w).toLowerCase());
  let kind = 'expense';
  const inc = INCOME_WORDS.some(has);
  const exp = EXPENSE_WORDS.some(has);
  if (inc && !exp) kind = 'income';
  if (inc && exp) kind = /পেলাম|পেয়েছি|পেয়েছি|বেতন|received|salary/.test(raw) ? 'income' : 'expense';

  // date
  const d = new Date();
  if (/গতকাল|গত কাল|yesterday/.test(raw)) d.setDate(d.getDate() - 1);
  else if (/পরশু/.test(raw) && /আগে|গত/.test(raw)) d.setDate(d.getDate() - 2);

  // category: score keyword hits
  let best = null, bestScore = 0;
  for (const c of categories) {
    if (c.kind !== 'both' && c.kind !== kind) continue;
    const words = [...new Set(norm(c.name + ' ' + (c.keywords || '')).toLowerCase().split(/\s+/).filter((w) => w.length > 1))];
    let score = 0;
    for (const w of words) if (lower.includes(w)) score += w.length;
    if (score > bestScore) { best = c; bestScore = score; }
  }
  // note = text without amount/taka words
  let note = tokens.filter((_, i) => !(pick && i >= pick.start && i < pick.end)).join(' ')
    .replace(/\s*টাকা(র|য়|য়)?(?=\s|$)/g, ' ').replace(/\s+/g, ' ').trim();
  return { kind, amount: pick ? Math.round(pick.value * 100) : 0, categoryId: best?.id || null, at: `${ymd(d)}T${hm()}`, note: note || raw, raw };
}

// ---------------- text refine ----------------
export function localRefine(text) {
  let t = String(text || '').replace(/\s+/g, ' ').trim();
  if (!t) return t;
  t = t.replace(/\s+([,।?!])/g, '$1');
  if (!/[।?!.]$/.test(t)) t += /[a-zA-Z]$/.test(t) ? '.' : '।';
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// The user's own Gemini keys, in the order they were added (the old single-key setting counts as the first).
export const aiKeys = () => [...new Set([db.settings().aiKey, ...(db.settings().aiKeys || [])].filter(Boolean))];

export async function aiRefine(text, purpose = 'note') {
  const keys = aiKeys();
  if (!keys.length) return localRefine(text);
  const en = db.settings().lang === 'en' || db.settings().voiceLang === 'en-US';
  const prompt = en
    ? (purpose === 'task' ? `Turn this into one short, clear to-do sentence in the same language. Reply with the sentence only.\n\n${text}` : `Clean up this dictated text: fix spelling and punctuation, keep the meaning and language, add nothing. Reply with the text only.\n\n${text}`)
    : purpose === 'task'
    ? `নিচের কথাটা থেকে একটা ছোট, পরিষ্কার করণীয় কাজের বাক্য বানাও। শুধু বাক্যটা দাও, আর কিছু না।\n\n${text}`
    : `নিচের মুখে বলা বাংলা লেখাটা গুছিয়ে, বানান ও যতিচিহ্ন ঠিক করে লেখো। অর্থ বদলাবে না, নতুন তথ্য যোগ করবে না। শুধু লেখাটা দাও।\n\n${text}`;
  const model = db.settings().aiModel || 'gemini-2.5-flash';
  // Start from the key that worked last time. When one is refused (limit reached, wrong key, server busy), move to the next.
  const first = Math.min(db.settings().aiKeyIdx || 0, keys.length - 1);
  let status = 0;
  for (let n = 0; n < keys.length; n++) {
    const i = (first + n) % keys.length;
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': keys[i] },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2 } }),
    });
    if (!res.ok) { status = res.status; continue; }
    if (i !== (db.settings().aiKeyIdx || 0)) await db.saveSettings({ aiKeyIdx: i });
    const j = await res.json();
    return j?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('').trim() || localRefine(text);
  }
  throw new Error(keys.length > 1 ? `কোনো key দিয়েই AI কাজ করেনি (${status})। সেটিংসে key গুলো দেখুন।` : 'AI কাজ করেনি (' + status + ')। সেটিংসে key দেখুন।');
}

export const nowISO = localISO;
