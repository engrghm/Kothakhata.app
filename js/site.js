// কথাখাতা landing page: language switch, and the app's own sentence reader running live.
import { parseEntry, listen, voiceSupported } from './voice.js';
import { demoCats } from './model.js';
import { setLang, money, dateLabel } from './util.js';

const $ = (s) => document.querySelector(s);
const cats = demoCats();
const EN_CAT = { 'বাজার': 'Groceries', 'খাবার': 'Food', 'যাতায়াত': 'Transport', 'বাসা ভাড়া': 'House rent', 'বিল': 'Bills', 'মোবাইল রিচার্জ': 'Mobile recharge', 'চিকিৎসা': 'Medical', 'শিক্ষা': 'Education', 'কেনাকাটা': 'Shopping', 'বিনোদন': 'Entertainment', 'দান-সদকা': 'Charity', 'বেতন': 'Salary', 'ব্যবসা': 'Business', 'উপহার': 'Gift' };
let lang = 'bn';
try { lang = localStorage.getItem('ds-lang') === 'en' ? 'en' : 'bn'; } catch {}

// ---- the reader ----
function read() {
  const text = $('#said').value.trim();
  const r = text ? parseEntry(text, cats) : null;
  const en = lang === 'en';
  const blank = en ? 'not found' : 'পাওয়া যায়নি';
  $('#o-kind').textContent = !r ? blank : r.kind === 'income' ? (en ? 'Income' : 'আয়') : (en ? 'Expense' : 'খরচ');
  $('#o-amt').textContent = r?.amount ? money(r.amount) : blank;
  $('#o-cat').textContent = r?.categoryId ? (en ? EN_CAT[r.categoryId] || r.categoryId : r.categoryId) : (en ? 'Other' : 'অন্যান্য');
  $('#o-date').textContent = r ? dateLabel(r.at) : blank;
  document.querySelector('.label').classList.toggle('is-empty', !r?.amount);
  for (const k of document.querySelectorAll('#samples .key')) k.setAttribute('aria-pressed', String(k.textContent === text));
}
$('#said').addEventListener('input', read);
for (const k of document.querySelectorAll('#samples .key')) k.addEventListener('click', () => { $('#said').value = k.textContent; read(); });

// ---- the microphone, where the browser has one ----
const mic = $('#mic');
let stop = null;
if (voiceSupported) {
  mic.hidden = false;
  mic.addEventListener('click', () => {
    if (stop) { stop(); return; }
    mic.setAttribute('aria-pressed', 'true');
    $('#heard').textContent = lang === 'en' ? 'Listening.' : 'শুনছি।';
    stop = listen({
      lang: lang === 'en' ? 'en-US' : 'bn-BD',
      onInterim: (t) => { $('#said').value = t; },
      onFinal: (t) => { $('#said').value = t; read(); },
      onEnd: () => { stop = null; mic.setAttribute('aria-pressed', 'false'); $('#heard').textContent = ''; read(); },
      onError: (e) => { stop = null; mic.setAttribute('aria-pressed', 'false'); $('#heard').textContent = (lang === 'en' ? 'The microphone did not work: ' : 'মাইক কাজ করেনি: ') + String(e || ''); },
    });
  });
}

// ---- language ----
function applyLang() {
  const en = lang === 'en';
  document.documentElement.lang = lang;
  setLang(lang);
  for (const el of document.querySelectorAll('[data-en]')) {
    if (el.dataset.bn === undefined) el.dataset.bn = el.textContent;
    el.textContent = en ? el.dataset.en : el.dataset.bn;
  }
  const b = $('#lang');
  b.textContent = en ? 'বাং' : 'EN';
  b.setAttribute('aria-label', en ? 'বাংলায় দেখুন' : 'Switch to English');
  document.title = en ? 'KothaKhata: money, tasks, notes and alarms, by voice' : 'কথাখাতা: হিসাব, কাজ, নোট আর অ্যালার্ম, বাংলায় বলে';
  mic.setAttribute('aria-label', en ? 'Tap the mic and speak' : 'মাইক চেপে বলুন');
  for (const f of document.querySelectorAll('iframe[data-route]')) {
    const src = `app.html?demo=1${en ? '&lang=en' : ''}${f.dataset.route}`;
    if (!f.src.endsWith(src)) f.src = src;
  }
  $('#said').value = document.querySelector('#samples .key').textContent;
  read();
}
$('#lang').addEventListener('click', () => { lang = lang === 'en' ? 'bn' : 'en'; try { localStorage.setItem('ds-lang', lang); } catch {} applyLang(); });
applyLang();
