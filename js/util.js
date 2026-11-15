// Shared helpers: Bangla digits, money, dates, html, icons.
const BN = '০১২৩৪৫৬৭৮৯';
let LANG = 'bn';
// bn(): show digits in the UI language (Bangla digits, or Latin in English mode)
export const bn = (v) => (LANG === 'en' ? String(v).replace(/[০-৯]/g, (d) => BN.indexOf(d)) : String(v).replace(/[0-9]/g, (d) => BN[d]));
export const enDigits = (s) => String(s).replace(/[০-৯]/g, (d) => BN.indexOf(d));

export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// money: integer paisa → "৳১২,৩৪৫" (South Asian grouping)
export function money(paisa, { sign = false, symbol = true } = {}) {
  const neg = paisa < 0;
  const abs = Math.abs(Math.round(paisa));
  const taka = Math.floor(abs / 100);
  const ps = abs % 100;
  let s = String(taka);
  if (s.length > 3) {
    const last3 = s.slice(-3);
    const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    s = rest + ',' + last3;
  }
  if (ps) s += '.' + String(ps).padStart(2, '0');
  return (neg ? '-' : sign ? '+' : '') + (symbol ? '৳' : '') + bn(s);
}
export const toPaisa = (v) => {
  const n = parseFloat(enDigits(String(v)).replace(/,/g, ''));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
};
export const fromPaisa = (p) => (p / 100).toString();

// dates (local)
const MONTHS_BN = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
const DAYS_BN = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MONTHS = [...MONTHS_BN];
export const DAYS = [...DAYS_BN];
export const getLang = () => LANG;
export function setLang(l) {
  LANG = l === 'en' ? 'en' : 'bn';
  MONTHS.splice(0, 12, ...(LANG === 'en' ? MONTHS_EN : MONTHS_BN));
  DAYS.splice(0, 7, ...(LANG === 'en' ? DAYS_EN : DAYS_BN));
}
export const monthShort = (i) => (LANG === 'en' ? MONTHS[i].slice(0, 3) : MONTHS[i].slice(0, 4));
const pad = (n) => String(n).padStart(2, '0');
export const ymd = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const ym = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
export const hm = (d = new Date()) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
export const localISO = (d = new Date()) => `${ymd(d)}T${hm(d)}`;
export const parseLocal = (s) => new Date(s);
export const monthLabel = (key) => { const [y, m] = key.split('-'); return `${MONTHS[+m - 1]} ${bn(y)}`; };
export const addMonths = (key, n) => { const [y, m] = key.split('-').map(Number); return ym(new Date(y, m - 1 + n, 1)); };
export function dateLabel(iso) {
  const d = new Date(iso);
  const today = ymd(); const y = ymd(new Date(Date.now() - 864e5)); const t = ymd(new Date(Date.now() + 864e5));
  const k = ymd(d);
  const en = LANG === 'en';
  if (k === today) return en ? 'Today' : 'আজ';
  if (k === y) return en ? 'Yesterday' : 'গতকাল';
  if (k === t) return en ? 'Tomorrow' : 'আগামীকাল';
  return `${bn(d.getDate())} ${en ? MONTHS[d.getMonth()].slice(0, 3) : MONTHS[d.getMonth()]}${d.getFullYear() !== new Date().getFullYear() ? ' ' + bn(d.getFullYear()) : ''}, ${DAYS[d.getDay()]}`;
}
export function timeLabel(iso) {
  const d = new Date(iso); let h = d.getHours(); const m = pad(d.getMinutes());
  if (LANG === 'en') return `${h % 12 || 12}:${m} ${h < 12 ? 'AM' : 'PM'}`;
  const part = h < 5 ? 'রাত' : h < 12 ? 'সকাল' : h < 16 ? 'দুপুর' : h < 18 ? 'বিকেল' : h < 20 ? 'সন্ধ্যা' : 'রাত';
  h = h % 12 || 12;
  return `${part} ${bn(h)}:${bn(m)}`;
}
export const hmLabel = (t) => timeLabel(`2000-01-01T${t}`);

export const COLORS = ['#0d6b5e', '#1d5fa8', '#c2352b', '#13803d', '#b45309', '#7c3aed', '#0e7490', '#be185d', '#4d5b57'];
export const colorFor = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return COLORS[h % COLORS.length]; };
export const initial = (s) => (String(s || '?').trim()[0] || '?');

export function debounce(fn, ms = 200) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

// Inline icon set (own simple line icons).
const P = {
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  swap: '<path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>',
  pie: '<path d="M21 12A9 9 0 1 1 12 3v9z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15z"/>',
  piggy: '<path d="M5 11a7 6 0 0 1 13-2h2v4h-2a7 6 0 0 1-3 3v3h-3v-2h-2v2H7v-3a6 6 0 0 1-2-5z"/><circle cx="15" cy="10" r="1"/>',
  check: '<path d="M5 12l5 5 9-11"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/>',
  note: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>',
  alarm: '<circle cx="12" cy="13" r="7"/><path d="M12 10v3l2 2M5 4L3 6M19 4l2 2"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7 7 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  left: '<path d="M15 6l-6 6 6 6"/>',
  right: '<path d="M9 6l6 6-6 6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  wallet: '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18M16 15h2"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  file: '<path d="M6 3h9l4 4v14H6z"/><path d="M9 13h6M9 17h6"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  book: '<path d="M4 4h10a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4z"/><path d="M4 16a4 4 0 0 1 4-4h10"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.5"/>',
  repeat: '<path d="M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
  upload: '<path d="M12 21V9M7 14l5-5 5 5M4 3h16"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>',
  pin: '<path d="M12 17v5M5 17h14l-2-5V4H7v8z"/>',
  read: '<path d="M2 5h7a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H2zM22 5h-7a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h8z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  phone: '<path d="M5 3h4l2 5-3 2a11 11 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  sparkle: '<path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  filter: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
  copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
};
export const icon = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ''}</svg>`;
