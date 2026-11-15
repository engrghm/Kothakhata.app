// Domain logic on top of db.js
import * as db from './db.js';
import { ym, ymd, localISO, COLORS } from './util.js';

export const bookId = () => db.settings().activeBookId;
export const inBook = (r) => r.bookId === bookId();

const DEFAULT_CATS = [
  ['বাজার', 'expense', 'বাজার সবজি মাছ মাংস চাল ডাল তেল মুদি ডিম দুধ'],
  ['খাবার', 'expense', 'খাবার নাস্তা নাশতা লাঞ্চ ডিনার রেস্টুরেন্ট চা কফি হোটেল বিরিয়ানি'],
  ['যাতায়াত', 'expense', 'রিকশা রিক্সা বাস সিএনজি ভাড়া উবার পাঠাও ট্রেন লঞ্চ যাতায়াত গাড়ি তেল পেট্রোল অকটেন'],
  ['বাসা ভাড়া', 'expense', 'বাসা ভাড়া বাড়ি ভাড়া রেন্ট'],
  ['বিল', 'expense', 'বিদ্যুৎ কারেন্ট গ্যাস পানি বিল ইন্টারনেট ওয়াইফাই ডিশ'],
  ['মোবাইল রিচার্জ', 'expense', 'মোবাইল রিচার্জ ফ্লেক্সি এমবি'],
  ['চিকিৎসা', 'expense', 'ওষুধ ঔষধ ডাক্তার হাসপাতাল চিকিৎসা টেস্ট'],
  ['শিক্ষা', 'expense', 'বই খাতা স্কুল কলেজ টিউশন বেতন ফি কোর্স শিক্ষা'],
  ['কেনাকাটা', 'expense', 'জামা কাপড় জুতা শপিং কেনাকাটা শাড়ি পাঞ্জাবি'],
  ['বিনোদন', 'expense', 'সিনেমা ঘোরা ভ্রমণ ট্যুর বিনোদন'],
  ['দান-সদকা', 'expense', 'দান সদকা যাকাত মসজিদ সাহায্য'],
  ['অন্যান্য খরচ', 'expense', ''],
  ['বেতন', 'income', 'বেতন স্যালারি মাইনে salary'],
  ['ব্যবসা', 'income', 'ব্যবসা বিক্রি লাভ দোকান'],
  ['উপহার', 'income', 'উপহার গিফট সালামি বকশিশ'],
  ['অন্যান্য আয়', 'income', ''],
];

// English voice keywords for the default categories (so English speech also matches)
const EN_KW = {
  'বাজার': 'groceries grocery market vegetables fish meat rice eggs milk', 'খাবার': 'food breakfast lunch dinner restaurant tea coffee snacks',
  'যাতায়াত': 'rickshaw bus cng uber taxi train transport fare fuel petrol', 'বাসা ভাড়া': 'rent house rent', 'বিল': 'electricity gas water bill internet wifi',
  'মোবাইল রিচার্জ': 'mobile recharge top-up data', 'চিকিৎসা': 'medicine doctor hospital medical pharmacy', 'শিক্ষা': 'book books school college tuition course fees',
  'কেনাকাটা': 'shopping clothes shoes dress', 'বিনোদন': 'movie cinema travel trip entertainment', 'দান-সদকা': 'charity donation zakat mosque',
  'বেতন': 'salary pay paycheck wages', 'ব্যবসা': 'business sale sales profit shop', 'উপহার': 'gift gifts bonus tip',
};
async function addEnglishKeywords() {
  for (const c of db.all('categories')) {
    const en = EN_KW[c.name];
    if (en && !(c.keywords || '').includes(en.split(' ')[0])) await db.put('categories', { ...c, keywords: `${c.keywords || ''} ${en}`.trim() });
  }
}

export async function ensureSeed() {
  if (db.all('books').length) { if (!bookId() || !db.get('books', bookId())) await db.saveSettings({ activeBookId: db.all('books')[0].id }); await addEnglishKeywords(); return; }
  const book = await db.put('books', { name: 'ব্যক্তিগত', kind: 'personal' });
  await seedBook(book.id);
  await db.saveSettings({ activeBookId: book.id, theme: 'system', voiceLang: 'bn-BD', voiceMode: 'refine', autoCopy: false, privacy: false });
  await db.put('notifications', { type: 'system', title: 'কথাখাতায় স্বাগতম', body: 'হিসাব, কাজ, নোট আর রিমাইন্ডার — সব এক জায়গায়। মাইক চেপে বাংলায় বলেও এন্ট্রি দিতে পারবেন।', at: new Date().toISOString(), read: false });
}
export async function seedBook(id) {
  await db.putMany('categories', DEFAULT_CATS.map(([name, kind, keywords], i) => ({ bookId: id, name, kind, keywords: `${keywords} ${EN_KW[name] || ''}`.trim(), color: COLORS[i % COLORS.length] })));
  await db.put('wallets', { bookId: id, name: 'নগদ', opening: 0, color: COLORS[3] });
}

export const cats = (kind) => db.all('categories', (c) => inBook(c) && (!kind || c.kind === kind || c.kind === 'both')).sort((a, b) => a.name.localeCompare(b.name, 'bn'));
export const catById = (id) => db.get('categories', id);
export const wallets = () => db.all('wallets', inBook);
export const txns = (pred) => db.all('txns', (t) => inBook(t) && (!pred || pred(t))).sort((a, b) => (a.at < b.at ? 1 : -1));

export function totals(list) {
  let income = 0, expense = 0;
  for (const t of list) { if (t.kind === 'income') income += t.amount; else if (t.kind === 'expense') expense += t.amount; }
  return { income, expense, balance: income - expense };
}
export const monthTxns = (key) => txns((t) => t.at.startsWith(key));
export const dayTxns = (key) => txns((t) => t.at.startsWith(key));

export function walletBalance(w) {
  let b = w.opening || 0;
  for (const t of db.all('txns', (x) => x.bookId === w.bookId)) {
    if (t.kind === 'income' && t.walletId === w.id) b += t.amount;
    if (t.kind === 'expense' && t.walletId === w.id) b -= t.amount;
    if (t.kind === 'transfer') { if (t.walletId === w.id) b -= t.amount; if (t.toWalletId === w.id) b += t.amount; }
  }
  return b;
}

// budgets
export function budgetsFor(key) {
  return db.all('budgets', (b) => inBook(b) && (b.repeat === 'monthly' ? b.month <= key : b.month === key));
}
export function budgetStatus(b, key) {
  const list = monthTxns(key);
  const income = totals(list).income;
  const limit = b.mode === 'percent' ? Math.round((income * b.value) / 100) : b.value;
  const spent = list.filter((t) => t.kind === 'expense' && (!b.categoryId || t.categoryId === b.categoryId)).reduce((s, t) => s + t.amount, 0);
  return { limit, spent, left: limit - spent, pct: limit ? Math.min(999, Math.round((spent / limit) * 100)) : spent ? 100 : 0 };
}

// savings
export const potSaved = (p) => db.all('deposits', (d) => d.savingsId === p.id).reduce((s, d) => s + d.amount, 0);

// lend/borrow: positive = they owe me (পাবো), negative = I owe (দিবো)
export function personBalance(pid) {
  let b = 0;
  for (const e of db.all('lenden', (x) => x.personId === pid)) {
    if (e.dir === 'give') b += e.amount; else if (e.dir === 'receive') b -= e.amount;
    else if (e.dir === 'take') b -= e.amount; else if (e.dir === 'repay') b += e.amount;
  }
  return b;
}
export const people = () => db.all('people', inBook);

// recurring: create due entries (idempotent by recurringId + date)
function nextRun(r, from) {
  const d = new Date(from);
  if (r.freq === 'daily') d.setDate(d.getDate() + 1);
  else if (r.freq === 'monthly') { d.setDate(1); d.setMonth(d.getMonth() + 1); d.setDate(Math.min(r.day || 1, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())); }
  else d.setFullYear(d.getFullYear() + 1);
  return localISO(d);
}
export async function runRecurring() {
  const now = localISO();
  let made = 0;
  for (const r of db.all('recurring')) {
    if (r.paused) continue;
    let guard = 0;
    while (r.nextAt && r.nextAt <= now && guard++ < 400) {
      const key = ymd(new Date(r.nextAt));
      const exists = db.all('txns', (t) => t.recurringId === r.id && t.at.startsWith(key)).length;
      if (!exists) { await db.put('txns', { ...r.template, bookId: r.bookId, at: r.nextAt, recurringId: r.id, source: 'recurring' }); made++; }
      r.nextAt = nextRun(r, r.nextAt);
    }
    await db.put('recurring', r);
  }
  return made;
}
export function firstRun(freq, day, time) {
  const now = new Date();
  const [h, m] = (time || '09:00').split(':').map(Number);
  const d = new Date(now.getFullYear(), now.getMonth(), freq === 'monthly' ? Math.min(day || 1, 28) : now.getDate(), h, m);
  if (freq === 'yearly') d.setMonth(now.getMonth());
  if (d < now) { if (freq === 'daily') d.setDate(d.getDate() + 1); else if (freq === 'monthly') d.setMonth(d.getMonth() + 1); else d.setFullYear(d.getFullYear() + 1); }
  return localISO(d);
}

export const unread = () => db.all('notifications', (n) => !n.read).length;
export async function notify(title, body, type = 'reminder') {
  await db.put('notifications', { type, title, body, at: new Date().toISOString(), read: false });
}
export const thisMonth = () => ym();

// Sample data for the landing page's live screens (?demo=1). Memory only: db.init() opens no database in demo mode.
export async function seedDemo(lang) {
  const en = lang === 'en';
  const book = bookId();
  const cat = (n) => db.all('categories').find((c) => c.name === n)?.id;
  const w = wallets()[0]?.id;
  const day = (back, h, m = 0) => { const d = new Date(); d.setDate(d.getDate() - back); d.setHours(h, m, 0, 0); return localISO(d); };
  const rows = [
    [0, 9, 'expense', 250, 'বাজার', en ? 'Vegetables and fish' : 'সবজি আর মাছ', 'voice'], [0, 8, 'expense', 60, 'যাতায়াত', en ? 'Rickshaw' : 'রিকশা ভাড়া', 'voice'],
    [1, 13, 'expense', 180, 'খাবার', en ? 'Lunch' : 'দুপুরের খাবার', ''], [1, 19, 'expense', 99, 'মোবাইল রিচার্জ', '', ''],
    [2, 10, 'expense', 1250, 'বিল', en ? 'Electricity bill' : 'বিদ্যুৎ বিল', ''], [3, 11, 'expense', 420, 'বাজার', '', 'voice'],
    [4, 18, 'expense', 350, 'চিকিৎসা', en ? 'Medicine' : 'ওষুধ', ''], [5, 10, 'expense', 12000, 'বাসা ভাড়া', '', 'recurring'],
    [6, 10, 'income', 35000, 'বেতন', '', ''],
  ];
  for (const [back, h, kind, taka, c, note, source] of rows) await db.put('txns', { bookId: book, kind, amount: taka * 100, categoryId: cat(c), walletId: w, note, at: day(back, h), source });
  await db.put('budgets', { bookId: book, mode: 'fixed', value: 2500000, repeat: 'monthly', color: '#0d6b5e', categoryId: null, month: ym() });
  for (const [title, done] of [[en ? 'Pay the electricity bill' : 'বিদ্যুৎ বিল দিতে হবে', true], [en ? 'Call the landlord' : 'বাড়িওয়ালাকে ফোন', false], [en ? 'Buy medicine for mother' : 'মায়ের ওষুধ কিনতে হবে', false]]) await db.put('tasks', { title, done, priority: done ? 'normal' : 'high', doneAt: done ? new Date().toISOString() : null });
  await db.put('notes', { serial: 1, title: en ? 'Market list' : 'বাজারের ফর্দ', body: en ? 'Rice 5 kg\nLentils 1 kg\nEggs, one dozen\nOil 2 litres' : 'চাল ৫ কেজি\nডাল ১ কেজি\nডিম এক ডজন\nতেল ২ লিটার', color: '', pinned: true });
  await db.put('notes', { serial: 2, title: en ? 'Meeting notes' : 'মিটিংয়ের নোট', body: en ? 'Send the report by Thursday.' : 'বৃহস্পতিবারের মধ্যে রিপোর্ট পাঠাতে হবে।', color: '', pinned: false });
  await db.put('alarms', { label: en ? 'Morning walk' : 'সকালে হাঁটা', time: '06:00', days: [0, 1, 2, 3, 4, 6], date: null, enabled: true, snoozeAt: null, lastFired: ymd() });
  await db.put('alarms', { label: en ? 'Medicine' : 'ওষুধ খাওয়া', time: '21:30', days: [0, 1, 2, 3, 4, 5, 6], date: null, enabled: true, snoozeAt: null, lastFired: ymd() });
}

// The default categories as plain rows, for the landing page's live sentence reader (no database needed).
export const demoCats = () => DEFAULT_CATS.map(([name, kind, keywords]) => ({ id: name, name, kind, keywords: `${keywords} ${EN_KW[name] || ''}`.trim() }));
