// কথাখাতা — app shell
import * as db from './db.js';
import * as M from './model.js';
import { icon, esc, bn } from './util.js';
import { route, start, current, go } from './router.js';
import { startScheduler } from './reminders.js';
import * as money from './screens/money.js';
import * as plans from './screens/plans.js';
import * as life from './screens/life.js';
import * as set from './screens/settings.js';
import { voicepad } from './screens/voicepad.js';
import { toast } from './ui.js';
import { setLang } from './util.js';
import { startTranslator, t } from './i18n.js';

export function applyLang() {
  setLang(db.settings().lang || 'bn');
  startTranslator();
  document.title = t('কথাখাতা');
}

const TABS = [
  ['#/', 'home', 'হিসাব', ['/', '/add', '/txn', '/categories', '/stats', '/report']],
  ['#/lenden', 'swap', 'পাবো-দিবো', ['/lenden', '/person']],
  ['#/budget', 'pie', 'বাজেট', ['/budget']],
  ['#/savings', 'piggy', 'সঞ্চয়', ['/savings']],
  ['#/voice', 'mic', 'ভয়েস লেখা', ['/voice']],
  ['#/tasks', 'list', 'কাজ', ['/tasks']],
  ['#/notes', 'note', 'নোট', ['/notes', '/note']],
  ['#/alarms', 'alarm', 'অ্যালার্ম', ['/alarms']],
  ['#/more', 'menu', 'আরও', ['/more', '/wallets', '/quick', '/recurring', '/settings', '/inbox']],
];
// on a phone the menu is a dock of five; the other sections open from "আরও"
const DOCK = ['#/', '#/lenden', '#/voice', '#/tasks', '#/more'];

route('/', money.home);
route('/add', (el, p) => money.editTxn(el, null, p));
route('/txn/:id', (el, p, id) => money.editTxn(el, id, p));
route('/categories', money.categories);
route('/stats', money.stats);
route('/wallets', money.wallets);
route('/quick', money.quick);
route('/recurring', money.recurring);
route('/report', money.report);
route('/lenden', plans.lenden);
route('/person/:id', (el, p, id) => plans.person(el, id));
route('/budget', plans.budget);
route('/savings', plans.savings);
route('/tasks', life.tasks);
route('/notes', life.notes);
route('/note/:id', (el, p, id) => life.note(el, id, p));
route('/alarms', life.alarms);
route('/inbox', life.inbox);
route('/more', set.more);
route('/settings', set.settingsScreen);
route('/voice', voicepad);

function shell() {
  document.body.innerHTML = `<a class="sr" href="#main">মূল অংশে যান</a>
  <header class="top"><div class="top-in">
    <a class="brand" href="#/" aria-label="কথাখাতা হোম"><img class="brand-mark" src="icons/icon.svg" alt="">কথাখাতা</a>
    <button class="book-chip" id="book" title="খাতা বদলান"></button>
    <div class="top-actions">
      <button class="icon-btn lang-btn" id="lang" translate="no"></button>
      <a class="icon-btn" href="#/inbox" id="bell" aria-label="নোটিফিকেশন">${icon('bell')}</a>
      <a class="icon-btn" href="#/settings" aria-label="সেটিংস">${icon('gear')}</a>
    </div></div>
    <nav class="tabs" aria-label="প্রধান মেনু">${TABS.map(([h, ic, l]) => `<a class="tab" href="${h}" data-tab="${h}"${DOCK.includes(h) ? ' data-dock' : ''}>${icon(ic)}<span>${l}</span></a>`).join('')}</nav>
  </header>
  <main id="main" tabindex="-1"></main><div class="fab" id="fab"></div>`;
  document.getElementById('book').onclick = () => go('#/more');
  document.getElementById('lang').onclick = () => switchLang(db.settings().lang === 'en' ? 'bn' : 'en');
}

export async function switchLang(l) {
  const s = db.settings();
  await db.saveSettings({ lang: l, voiceLang: l === 'en' ? 'en-US' : 'bn-BD' });
  shell();
  applyLang();
  render(current());
  toast(l === 'en' ? 'Language: English' : 'ভাষা: বাংলা');
}

function header(r) {
  const b = db.get('books', M.bookId());
  document.getElementById('book').textContent = b ? t(b.name) : '';
  const en = db.settings().lang === 'en';
  const lb = document.getElementById('lang');
  lb.textContent = en ? 'বাং' : 'EN';
  lb.setAttribute('aria-label', en ? 'বাংলায় দেখুন' : 'Switch to English');
  lb.title = lb.getAttribute('aria-label');
  const n = M.unread();
  document.getElementById('bell').innerHTML = icon('bell') + (n ? `<span class="badge">${bn(n > 9 ? '9+' : n)}</span>` : '');
  document.getElementById('bell').setAttribute('aria-label', n ? `${n}টি নতুন নোটিফিকেশন` : 'নোটিফিকেশন');
  let tucked = false;
  for (const a of document.querySelectorAll('.tab')) {
    const t = TABS.find((x) => x[0] === a.dataset.tab);
    const on = t[3].some((p) => (p === '/' ? r.path === '/' : r.path === p || r.path.startsWith(p + '/')));
    a.classList.toggle('on', on); on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current');
    if (on && !DOCK.includes(t[0])) tucked = true;
  }
  document.querySelector('.tab[data-tab="#/more"]').classList.toggle('on-dock', tucked);
}

let lastPath = '';
// a new screen fades up into place; the same screen redrawing does not move
function render(r) {
  const move = lastPath && r.path !== lastPath && document.startViewTransition && document.visibilityState === 'visible' && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!move) return paint(r);
  const vt = document.startViewTransition(() => paint(r));
  for (const p of [vt.ready, vt.finished, vt.updateCallbackDone]) p.catch(() => {}); // a skipped animation is not an error
}
function paint(r) {
  const main = document.getElementById('main');
  const fab = document.getElementById('fab');
  fab.innerHTML = '';
  header(r);
  let out;
  try { out = r.handler(main, r.params, ...r.args); }
  catch (e) { console.error(e); main.innerHTML = `<div class="empty"><b>কিছু একটা ভুল হয়েছে</b><div class="small">${esc(e.message)}</div></div>`; }
  for (const f of out?.fab || []) {
    const b = document.createElement('button');
    b.className = f.alt ? 'alt' : ''; b.setAttribute('aria-label', f.label); b.title = f.label; b.innerHTML = icon(f.icon);
    b.onclick = () => (f.href ? go(f.href) : f.onClick());
    fab.append(b);
  }
  if (r.path !== lastPath) { window.scrollTo(0, 0); lastPath = r.path; }
  document.title = t('কথাখাতা');
}

// refresh list screens when background events change data
const LIVE = ['/tasks', '/alarms', '/inbox', '/'];
let refreshT;
db.onChange(() => {
  clearTimeout(refreshT);
  refreshT = setTimeout(() => {
    const r = current();
    header(r);
    const a = document.activeElement;
    const busy = document.querySelector('.scrim, .lock') || a?.tagName === 'TEXTAREA' || a?.tagName === 'SELECT' || (a?.tagName === 'INPUT' && a.value);
    if (!busy && LIVE.includes(r.path)) render(r);
  }, 250);
});

addEventListener('ds:lang', (e) => switchLang(e.detail));

async function boot() {
  await db.init();
  await M.ensureSeed();
  if (db.DEMO) {
    // preview mode (?demo=1): sample data, light paper, no alarms, nothing saved
    await db.saveSettings({ lang: new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'bn', theme: 'light' });
    await M.seedDemo(db.settings().lang);
    document.documentElement.classList.add('demo');
  }
  set.applyTheme();
  setLang(db.settings().lang || 'bn');
  shell();
  applyLang();
  await set.lockScreen();
  const made = await M.runRecurring();
  start(render);
  if (made) toast(`${bn(made)}টি নিয়মিত এন্ট্রি যোগ হয়েছে`);
  if (db.DEMO) return;
  startScheduler();
  setInterval(() => M.runRecurring(), 60000);
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', set.applyTheme);
}
boot();
