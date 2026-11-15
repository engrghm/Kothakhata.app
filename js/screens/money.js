// Money screens: home, add/edit entry (with voice), categories, stats, wallets, quick, recurring, report.
import * as db from '../db.js';
import * as M from '../model.js';
import { esc, icon, money, bn, toPaisa, fromPaisa, ym, ymd, hm, localISO, monthLabel, addMonths, dateLabel, timeLabel, MONTHS, DAYS, monthShort, colorFor, initial, debounce } from '../util.js';
import { modal, confirmBox, toast, empty, swatches, bindSwatches, bindSeg } from '../ui.js';
import { listen, parseEntry, voiceSupported } from '../voice.js';
import { go } from '../router.js';
import { t as tr, lang } from '../i18n.js';

const state = { period: 'month', month: ym(), q: '', cat: null };

const catDot = (c) => `<span class="dot" style="background:${c?.color || '#4d5b57'}">${esc(initial(tr(c?.name || '?')))}</span>`;

function txnRow(t) {
  const c = M.catById(t.categoryId);
  const w = db.get('wallets', t.walletId);
  const title = t.kind === 'transfer' ? `ট্রান্সফার: ${esc(w?.name || '')} → ${esc(db.get('wallets', t.toWalletId)?.name || '')}` : esc(c?.name || (t.kind === 'income' ? 'আয়' : 'খরচ'));
  const cls = t.kind === 'income' ? 'c-income' : t.kind === 'expense' ? 'c-expense' : 'c-info';
  return `<a class="item" href="#/txn/${t.id}">${t.kind === 'transfer' ? `<span class="dot" style="background:var(--info)">${icon('swap')}</span>` : catDot(c)}
    <div class="grow"><div class="row" style="gap:6px">${title}${t.source === 'voice' ? `<span class="tag" title="বলে লেখা">${icon('mic')}</span>` : t.source === 'recurring' ? `<span class="tag" title="নিয়মিত">${icon('repeat')}</span>` : ''}</div><div class="xs muted">${timeLabel(t.at)}${t.note && t.note !== c?.name ? ' · ' + esc(t.note) : ''}${w && t.kind !== 'transfer' && !db.settings().walletsOff ? ' · ' + esc(w.name) : ''}</div></div>
    <span class="amt ${cls}">${t.kind === 'expense' ? '-' : t.kind === 'income' ? '+' : ''}${money(t.amount)}</span></a>`;
}

export function home(el) {
  const today = ymd();
  let list = state.period === 'today' ? M.dayTxns(today) : state.period === 'month' ? M.monthTxns(state.month) : M.txns();
  const sum = M.totals(list);
  const prevMonth = M.totals(M.monthTxns(addMonths(ym(), -1)));
  if (state.cat) list = list.filter((t) => t.categoryId === state.cat);
  if (state.q) { const q = state.q.toLowerCase(); list = list.filter((t) => (t.note || '').toLowerCase().includes(q) || (M.catById(t.categoryId)?.name || '').includes(state.q) || String(t.amount / 100).includes(q)); }
  const byDay = {};
  for (const t of list) (byDay[t.at.slice(0, 10)] ||= []).push(t);
  const usedCats = [...new Set(M.txns((t) => state.period !== 'month' || t.at.startsWith(state.month)).map((t) => t.categoryId).filter(Boolean))].map(M.catById).filter(Boolean);
  const pct = sum.income ? Math.min(100, Math.round((sum.expense / sum.income) * 100)) : 0;
  const quick = db.all('quick', M.inBook);
  // the week tray: Saturday to Friday, one compartment a day
  const wkStart = new Date(); wkStart.setDate(wkStart.getDate() - ((wkStart.getDay() + 1) % 7));
  const week = Array.from({ length: 7 }, (_, i) => { const d = new Date(wkStart); d.setDate(wkStart.getDate() + i); const k = ymd(d); return { k, d, exp: M.totals(M.dayTxns(k)).expense }; });
  const TINTS = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'];

  el.innerHTML = `
  ${prevMonth.income + prevMonth.expense === 0 && state.period === 'month' && M.txns().length === 0 ? `<div class="card flat small muted">প্রথম এন্ট্রি দিন — নিচের <b>+</b> বাটন চাপুন, অথবা <b>মাইক</b> চেপে বলুন “আজ বাজারে ৫০০ টাকা খরচ”।</div>` : ''}
  <div class="week-h"><h2>এই সপ্তাহের খরচ</h2><span class="small muted money">${money(week.reduce((a, x) => a + x.exp, 0))}</span></div>
  <div class="week" role="list">${week.map((x, i) => `<div class="well ${x.k === today ? 'today' : x.k > today ? 'ahead' : ''}" role="listitem" style="--t:var(--p-${TINTS[i]})"><small>${DAYS[x.d.getDay()]}</small><i>${bn(x.d.getDate())}</i><b class="money">${money(x.exp, { symbol: false })}</b></div>`).join('')}</div>
  <section class="card" aria-label="সারাংশ">
    <div class="month-nav">
      <div class="seg" role="group" aria-label="সময়">
        <button data-v="today" class="${state.period === 'today' ? 'on' : ''}" aria-pressed="${state.period === 'today'}">আজ</button>
        <button data-v="month" class="${state.period === 'month' ? 'on' : ''}" aria-pressed="${state.period === 'month'}">মাস</button>
        <button data-v="all" class="${state.period === 'all' ? 'on' : ''}" aria-pressed="${state.period === 'all'}">সব</button>
      </div>
      ${state.period === 'month' ? `<div class="row" style="gap:4px"><button class="icon-btn" data-m="-1" aria-label="আগের মাস">${icon('left')}</button><b>${monthLabel(state.month)}</b><button class="icon-btn" data-m="1" aria-label="পরের মাস">${icon('right')}</button></div>` : ''}
    </div>
    <div class="stats">
      <div class="stat income"><small>আয়</small><b>${money(sum.income)}</b></div>
      <div class="stat expense"><small>খরচ</small><b>${money(sum.expense)}</b></div>
      <div class="stat info"><small>বাকি</small><b>${money(sum.balance)}</b></div>
    </div>
    ${state.period === 'month' && sum.income ? `<div style="margin-top:12px"><div class="row xs muted"><span class="grow">আয়ের ${bn(pct)}% খরচ হয়েছে</span></div><div class="bar ${pct >= 100 ? 'over' : ''}" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div></div>` : ''}
  </section>
  ${quick.length ? `<div class="row" style="flex-wrap:wrap;gap:8px;margin-bottom:12px"><span class="xs muted">${icon('bolt')}</span>${quick.map((q) => `<button class="chip" data-quick="${q.id}">${esc(q.label)} · ${money(q.amount)}</button>`).join('')}</div>` : ''}
  <div class="row" style="margin-bottom:12px">
    <label class="grow" style="position:relative"><span class="sr">খুঁজুন</span><input class="input" id="q" type="search" placeholder="খুঁজুন: নোট, ক্যাটাগরি বা টাকা" value="${esc(state.q)}"></label>
    <a class="icon-btn" href="#/stats" aria-label="গ্রাফ ও বিশ্লেষণ" title="গ্রাফ">${icon('chart')}</a>
    <a class="icon-btn" href="#/categories" aria-label="ক্যাটাগরি" title="ক্যাটাগরি">${icon('tag')}</a>
  </div>
  ${usedCats.length ? `<div class="row" style="flex-wrap:wrap;gap:6px;margin-bottom:8px"><button class="chip ${!state.cat ? 'on' : ''}" data-cat="">সব</button>${usedCats.map((c) => `<button class="chip ${state.cat === c.id ? 'on' : ''}" data-cat="${c.id}">${esc(c.name)}</button>`).join('')}</div>` : ''}
  <div id="txlist">
  ${Object.keys(byDay).length ? Object.entries(byDay).map(([d, ts]) => { const s = M.totals(ts); return `<div class="day-h"><span>${dateLabel(d + 'T00:00')}</span><span class="money">${s.income ? `<span class="c-income">+${money(s.income)}</span> ` : ''}${s.expense ? `<span class="c-expense">-${money(s.expense)}</span>` : ''}</span></div><div class="list">${ts.map(txnRow).join('')}</div>`; }).join('')
    : empty('file', state.q || state.cat ? 'কিছু পাওয়া যায়নি' : 'এই সময়ে কোনো লেনদেন নেই', state.q ? '' : '+ চেপে প্রথম হিসাবটা লিখুন')}
  </div>`;

  el.querySelectorAll('.seg button').forEach((b) => b.onclick = () => { state.period = b.dataset.v; home(el); });
  el.querySelectorAll('[data-m]').forEach((b) => b.onclick = () => { state.month = addMonths(state.month, +b.dataset.m); home(el); });
  el.querySelectorAll('[data-cat]').forEach((b) => b.onclick = () => { state.cat = b.dataset.cat || null; home(el); });
  el.querySelectorAll('[data-quick]').forEach((b) => b.onclick = async () => {
    const q = db.get('quick', b.dataset.quick);
    await db.put('txns', { bookId: M.bookId(), kind: q.kind, amount: q.amount, categoryId: q.categoryId, walletId: q.walletId || M.wallets()[0]?.id, note: q.label, at: localISO(), source: 'quick' });
    toast(`${q.label} — ${money(q.amount)} যোগ হয়েছে`);
  });
  const qi = el.querySelector('#q');
  qi.addEventListener('input', debounce(() => { state.q = qi.value.trim(); const pos = qi.selectionStart; home(el); const n = el.querySelector('#q'); n.focus(); n.setSelectionRange(pos, pos); }, 300));
  return { fab: [{ icon: 'mic', label: 'বলে এন্ট্রি দিন', alt: true, href: '#/add?voice=1' }, { icon: 'plus', label: 'নতুন এন্ট্রি', href: '#/add' }] };
}

// ---------- add / edit ----------
export function editTxn(el, id, params = {}) {
  const old = id ? db.get('txns', id) : null;
  if (id && !old) { el.innerHTML = empty('file', 'এন্ট্রিটা পাওয়া যায়নি'); return; }
  const f = old ? { ...old } : { kind: params.kind || 'expense', amount: 0, categoryId: null, walletId: M.wallets()[0]?.id || null, note: '', at: localISO(), source: 'manual' };
  let rec = { on: false, freq: 'monthly', day: new Date().getDate(), time: hm() };

  const draw = () => {
    const cs = f.kind === 'transfer' ? [] : M.cats(f.kind);
    el.innerHTML = `
    <div class="pagehead"><a class="icon-btn" href="#/" aria-label="ফিরে যান">${icon('back')}</a><h1>${old ? 'এন্ট্রি বদলান' : 'নতুন এন্ট্রি'}</h1>${old ? `<button class="icon-btn" id="del" aria-label="মুছুন">${icon('trash')}</button>` : ''}</div>
    ${old ? '' : `<div class="voice-box"><button class="mic" id="mic" aria-label="বলে এন্ট্রি দিন" aria-pressed="false">${icon('mic')}</button><div class="grow"><b>বলে দিন</b><div class="heard muted" id="heard">${voiceSupported ? 'যেমন: “গতকাল রিকশা ভাড়া ৮০ টাকা” বা “বেতন পেলাম ২৫ হাজার”' : 'এই ব্রাউজারে ভয়েস নেই — Chrome বা Edge-এ খুলুন'}</div></div></div>`}
    <form id="f" class="card" novalidate>
      <div class="seg" role="group" aria-label="ধরন" style="margin-bottom:16px">
        <button type="button" data-v="income" class="income ${f.kind === 'income' ? 'on' : ''}" aria-pressed="${f.kind === 'income'}">আয়</button>
        <button type="button" data-v="expense" class="expense ${f.kind === 'expense' ? 'on' : ''}" aria-pressed="${f.kind === 'expense'}">খরচ</button>
        ${!db.settings().walletsOff || f.kind === 'transfer' ? `<button type="button" data-v="transfer" class="${f.kind === 'transfer' ? 'on' : ''}" aria-pressed="${f.kind === 'transfer'}">ট্রান্সফার</button>` : ''}
      </div>
      <label class="field"><span>টাকার পরিমাণ</span><input class="input big" id="amount" inputmode="decimal" autocomplete="off" placeholder="${bn(0)}" value="${f.amount ? fromPaisa(f.amount) : ''}" required></label>
      ${f.kind !== 'transfer' ? `<div class="field"><span>ক্যাটাগরি</span><div class="row" style="flex-wrap:wrap;gap:6px" id="cats">${cs.map((c) => `<button type="button" class="chip ${f.categoryId === c.id ? 'on' : ''}" data-c="${c.id}" aria-pressed="${f.categoryId === c.id}">${esc(c.name)}</button>`).join('')}<a class="chip" href="#/categories">+ নতুন</a></div></div>` : ''}
      ${!db.settings().walletsOff || f.kind === 'transfer' ? `<div class="row" style="gap:8px;flex-wrap:wrap">
        <label class="field grow"><span>${f.kind === 'transfer' ? 'যেখান থেকে' : 'ওয়ালেট'}</span><select class="input" id="wallet">${M.wallets().map((w) => `<option value="${w.id}" ${f.walletId === w.id ? 'selected' : ''}>${esc(w.name)}</option>`).join('')}</select></label>
        ${f.kind === 'transfer' ? `<label class="field grow"><span>যেখানে</span><select class="input" id="towallet">${M.wallets().map((w) => `<option value="${w.id}" ${f.toWalletId === w.id ? 'selected' : ''}>${esc(w.name)}</option>`).join('')}</select></label>` : ''}
      </div>` : ''}
      <div class="row" style="gap:8px">
        <label class="field grow"><span>তারিখ</span><input class="input" type="date" id="date" value="${f.at.slice(0, 10)}"></label>
        <label class="field grow"><span>সময়</span><input class="input" type="time" id="time" value="${f.at.slice(11, 16)}"></label>
      </div>
      <label class="field"><span>বিবরণ (ঐচ্ছিক)</span><input class="input" id="note" value="${esc(f.note)}" placeholder="কী নিয়ে?"></label>
      ${old || f.kind === 'transfer' ? '' : `<div class="row" style="margin-bottom:12px"><span class="grow">${icon('repeat')} নিয়মিত (রিপিট)</span><label class="switch"><input type="checkbox" id="rec" ${rec.on ? 'checked' : ''} aria-label="নিয়মিত এন্ট্রি"><span></span></label></div>
      <div id="recbox" ${rec.on ? '' : 'hidden'} class="card flat"><div class="seg" id="freq" style="margin-bottom:8px">${['daily:প্রতিদিন', 'monthly:প্রতি মাসে', 'yearly:প্রতি বছর'].map((x) => { const [v, l] = x.split(':'); return `<button type="button" data-v="${v}" class="${rec.freq === v ? 'on' : ''}">${l}</button>`; }).join('')}</div>
        <div class="row" style="gap:8px"><label class="field grow" id="dayf" ${rec.freq === 'daily' ? 'hidden' : ''}><span>তারিখ (মাসের)</span><input class="input" type="number" min="1" max="28" id="rday" value="${Math.min(rec.day, 28)}"></label><label class="field grow"><span>সময়</span><input class="input" type="time" id="rtime" value="${rec.time}"></label></div>
        <p class="xs muted" style="margin:0">প্রথম এন্ট্রি এখনই যোগ হবে, পরেরগুলো সময়মতো নিজে থেকে।</p></div>`}
      <button class="btn block" type="submit" id="save">${old ? 'সেভ করুন' : 'যোগ করুন'}</button>
    </form>`;

    bindSeg(el.querySelector('.seg'), (v) => { readForm(); f.kind = v; if (v !== 'transfer' && f.categoryId && M.catById(f.categoryId)?.kind !== v && M.catById(f.categoryId)?.kind !== 'both') f.categoryId = null; draw(); });
    el.querySelectorAll('[data-c]').forEach((b) => b.onclick = () => { readForm(); f.categoryId = f.categoryId === b.dataset.c ? null : b.dataset.c; draw(); });
    el.querySelector('#rec')?.addEventListener('change', (e) => { readForm(); rec.on = e.target.checked; draw(); });
    const fq = el.querySelector('#freq'); if (fq) bindSeg(fq, (v) => { readForm(); rec.freq = v; draw(); });
    el.querySelector('#del')?.addEventListener('click', async () => { if (await confirmBox('এন্ট্রিটা মুছে ফেলবেন?', { ok: 'মুছুন', danger: true })) { await db.del('txns', old.id); toast('মুছে ফেলা হয়েছে'); go('#/'); } });
    el.querySelector('#f').addEventListener('submit', save);
    const mic = el.querySelector('#mic');
    if (mic) mic.onclick = voice;
    if (!old) el.querySelector('#amount').focus();
  };
  const readForm = () => {
    const g = (s) => el.querySelector(s);
    if (!g('#amount')) return;
    f.amount = toPaisa(g('#amount').value);
    if (g('#wallet')) f.walletId = g('#wallet').value || null; // wallets switched off: keep what the entry had
    f.toWalletId = g('#towallet')?.value || null;
    f.at = `${g('#date').value}T${g('#time').value || '00:00'}`;
    f.note = g('#note').value.trim();
    if (g('#rday')) { rec.day = +g('#rday').value || 1; rec.time = g('#rtime').value || '09:00'; }
  };
  async function save(e) {
    e.preventDefault(); readForm();
    if (!f.amount || f.amount <= 0) { toast('টাকার পরিমাণ লিখুন'); el.querySelector('#amount').focus(); return; }
    if (f.kind === 'transfer' && f.walletId === f.toWalletId) { toast('আলাদা দুটি ওয়ালেট বেছে নিন'); return; }
    const recd = { ...f, bookId: f.bookId || M.bookId() };
    if (f.kind === 'transfer') recd.categoryId = null;
    if (rec.on && !old) {
      const r = await db.put('recurring', { bookId: M.bookId(), template: { kind: f.kind, amount: f.amount, categoryId: f.categoryId, walletId: f.walletId, note: f.note }, freq: rec.freq, day: rec.day, time: rec.time, nextAt: M.firstRun(rec.freq, rec.day, rec.time) });
      recd.recurringId = r.id;
    }
    await db.put('txns', recd);
    toast(old ? 'সেভ হয়েছে' : `${f.kind === 'income' ? 'আয়' : f.kind === 'expense' ? 'খরচ' : 'ট্রান্সফার'} ${money(f.amount)} যোগ হয়েছে`);
    go('#/');
  }
  let stop = null;
  function voice() {
    const mic = el.querySelector('#mic'); const heard = el.querySelector('#heard');
    if (stop) { stop(); return; }
    mic.classList.add('live'); mic.setAttribute('aria-pressed', 'true'); heard.textContent = 'শুনছি… বলুন';
    stop = listen({
      onInterim: (t) => { heard.textContent = t; },
      onFinal: (t) => {
        const p = parseEntry(t, M.cats());
        readForm();
        Object.assign(f, { kind: p.kind, amount: p.amount || f.amount, categoryId: p.categoryId || f.categoryId, at: p.at, note: p.note, source: 'voice' });
        draw();
        el.querySelector('#heard').innerHTML = `“${esc(t)}”<br><span class="c-saffron">${p.amount ? 'ঠিক আছে কিনা দেখে “যোগ করুন” চাপুন' : 'টাকার পরিমাণ বুঝিনি — লিখে দিন'}</span>`;
      },
      onError: (m) => toast(m, 4000),
      onEnd: () => { stop = null; const m = el.querySelector('#mic'); m?.classList.remove('live'); m?.setAttribute('aria-pressed', 'false'); },
    });
  }
  draw();
  if (params.voice === '1' && !old && voiceSupported) setTimeout(voice, 250);
}

// ---------- categories ----------
export function categories(el) {
  let tab = 'expense';
  const draw = () => {
    const list = M.cats().filter((c) => tab === 'all' || c.kind === tab || c.kind === 'both');
    el.innerHTML = `<div class="pagehead"><a class="icon-btn" href="#/" aria-label="ফিরে যান">${icon('back')}</a><h1>ক্যাটাগরি</h1></div>
    <div class="seg" style="margin-bottom:12px">${['expense:খরচ', 'income:আয়', 'all:সব'].map((x) => { const [v, l] = x.split(':'); return `<button data-v="${v}" class="${tab === v ? 'on' : ''}">${l}</button>`; }).join('')}</div>
    <div class="list">${list.length ? list.map((c) => `<button class="item" data-id="${c.id}">${catDot(c)}<div class="grow">${esc(c.name)}<div class="xs muted">${c.kind === 'income' ? 'আয়' : c.kind === 'expense' ? 'খরচ' : 'আয় ও খরচ'}${c.keywords ? ' · ভয়েস শব্দ: ' + esc(c.keywords.split(' ').filter((w) => (lang() === 'en') === /[a-z]/i.test(w)).slice(0, 4).join(', ')) : ''}</div></div>${icon('edit')}</button>`).join('') : empty('tag', 'কোনো ক্যাটাগরি নেই')}</div>`;
    bindSeg(el.querySelector('.seg'), (v) => { tab = v; draw(); });
    el.querySelectorAll('[data-id]').forEach((b) => b.onclick = () => catForm(db.get('categories', b.dataset.id), draw));
  };
  draw();
  return { fab: [{ icon: 'plus', label: 'নতুন ক্যাটাগরি', onClick: () => catForm({ kind: tab === 'all' ? 'expense' : tab }, draw) }] };
}
function catForm(c, after) {
  let color = c.color || '#0d6b5e', kind = c.kind || 'expense';
  modal({ title: c.id ? 'ক্যাটাগরি বদলান' : 'নতুন ক্যাটাগরি',
    body: `<div class="seg" id="k" style="margin-bottom:12px">${['income:আয়', 'expense:খরচ', 'both:দুটোই'].map((x) => { const [v, l] = x.split(':'); return `<button type="button" data-v="${v}" class="${kind === v ? 'on' : ''}">${l}</button>`; }).join('')}</div>
    <label class="field"><span>নাম</span><input class="input" id="n" value="${esc(c.name || '')}" autofocus></label>
    <label class="field"><span>ভয়েস চেনার শব্দ (স্পেস দিয়ে)</span><input class="input" id="kw" value="${esc(c.keywords || '')}" placeholder="যেমন: রিকশা বাস ভাড়া"></label>${swatches(color)}`,
    onMount: (el) => { bindSeg(el.querySelector('#k'), (v) => kind = v); bindSwatches(el, (v) => color = v); },
    actions: [
      ...(c.id ? [{ label: 'মুছুন', kind: 'secondary', onClick: async () => { const used = db.all('txns', (t) => t.categoryId === c.id).length; if (!(await confirmBox(used ? `${bn(used)}টি এন্ট্রিতে এটা আছে। মুছলে ওগুলো ক্যাটাগরি ছাড়া থাকবে। মুছবেন?` : 'মুছে ফেলবেন?', { ok: 'মুছুন', danger: true }))) return false; await db.del('categories', c.id); after(); } }] : []),
      { label: 'সেভ', onClick: async (el) => { const name = el.querySelector('#n').value.trim(); if (!name) { toast('নাম লিখুন'); return false; } await db.put('categories', { ...c, bookId: c.bookId || M.bookId(), name, kind, color, keywords: el.querySelector('#kw').value.trim() }); after(); } },
    ] });
}

// ---------- stats ----------
export function stats(el) {
  let key = ym(), kind = 'expense';
  const draw = () => {
    const list = M.monthTxns(key); const sum = M.totals(list);
    const [y, m] = key.split('-').map(Number);
    const days = new Date(y, m, 0).getDate();
    const has = new Set(list.map((t) => +t.at.slice(8, 10)));
    const months = Array.from({ length: 6 }, (_, i) => addMonths(key, i - 5));
    const series = months.map((k) => M.totals(M.monthTxns(k)));
    const max = Math.max(1, ...series.map((s) => Math.max(s.income, s.expense)));
    const W = 600, H = 200, bw = 30;
    const bars = series.map((s, i) => { const x = 30 + i * 95; const hi = (s.income / max) * 150, he = (s.expense / max) * 150; return `<rect x="${x}" y="${170 - hi}" width="${bw}" height="${hi}" rx="4" fill="var(--income)"><title>আয় ${money(s.income)}</title></rect><rect x="${x + bw + 4}" y="${170 - he}" width="${bw}" height="${he}" rx="4" fill="var(--expense)"><title>খরচ ${money(s.expense)}</title></rect><text x="${x + bw}" y="190" text-anchor="middle">${monthShort(+months[i].slice(5) - 1)}</text>`; }).join('');
    const byCat = {};
    for (const t of list.filter((t) => t.kind === kind)) byCat[t.categoryId || '-'] = (byCat[t.categoryId || '-'] || 0) + t.amount;
    const tot = Object.values(byCat).reduce((a, b) => a + b, 0);
    const rows = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
    // year at a glance
    const year = key.slice(0, 4);
    const ym12 = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);
    const yl = ym12.map((k) => ({ k, ...M.totals(M.monthTxns(k)) })).filter((r) => r.income || r.expense);
    const ysum = M.totals(M.txns((t) => t.at.startsWith(year)));
    el.innerHTML = `<div class="pagehead"><a class="icon-btn" href="#/" aria-label="ফিরে যান">${icon('back')}</a><h1>বিশ্লেষণ</h1><a class="btn sm secondary" href="#/report">${icon('file')} রিপোর্ট</a></div>
    <div class="month-nav"><button class="icon-btn" data-m="-1" aria-label="আগের মাস">${icon('left')}</button><b>${monthLabel(key)}</b><button class="icon-btn" data-m="1" aria-label="পরের মাস">${icon('right')}</button></div>
    <section class="card"><div class="small muted" style="margin-bottom:6px">হিসাবের ক্যালেন্ডার</div><div class="row" style="flex-wrap:wrap;gap:4px">${Array.from({ length: days }, (_, i) => { const d = i + 1; const fut = new Date(y, m - 1, d) > new Date(); return `<span class="tag ${has.has(d) ? 'ok' : ''}" style="min-width:28px;justify-content:center;${fut ? 'opacity:.4' : ''}" title="${has.has(d) ? 'হিসাব আছে' : 'হিসাব নেই'}">${bn(d)}</span>`; }).join('')}</div></section>
    <div class="stats" style="margin-bottom:12px"><div class="stat income"><small>মোট আয়</small><b>${money(sum.income)}</b></div><div class="stat expense"><small>মোট খরচ</small><b>${money(sum.expense)}</b></div><div class="stat info"><small>বাকি</small><b>${money(sum.balance)}</b></div></div>
    <section class="card"><div class="small muted">গত ৬ মাস</div><svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="গত ছয় মাসের আয় ও খরচ">${bars}<line x1="20" x2="${W - 10}" y1="170" y2="170" stroke="var(--border)"/></svg><div class="row xs muted" style="justify-content:center;gap:16px"><span><span class="c-income">■</span> আয়</span><span><span class="c-expense">■</span> খরচ</span></div></section>
    <section class="card"><div class="seg" style="margin-bottom:12px"><button data-v="expense" class="expense ${kind === 'expense' ? 'on' : ''}">খরচ কোথায়</button><button data-v="income" class="income ${kind === 'income' ? 'on' : ''}">আয় কোথা থেকে</button></div>
    ${rows.length ? rows.map(([cid, a]) => { const c = M.catById(cid); const p = Math.round((a / tot) * 100); return `<div style="margin-bottom:10px"><div class="row small"><span class="grow">${esc(c?.name || 'ক্যাটাগরি ছাড়া')}</span><span class="money">${money(a)} · ${bn(p)}%</span></div><div class="bar"><i style="width:${p}%;background:${c?.color || 'var(--accent)'}"></i></div></div>`; }).join('') : empty('pie', 'এই মাসে কিছু নেই')}</section>
    <section class="card"><div class="row"><b class="grow">${bn(year)} এক নজরে</b><span class="small money"><span class="c-income">${money(ysum.income)}</span> / <span class="c-expense">${money(ysum.expense)}</span></span></div>
    ${yl.length ? `<div class="list" style="margin:8px 0 0">${yl.map((r) => `<div class="item"><div class="grow">${MONTHS[+r.k.slice(5) - 1]}</div><span class="small c-income money">+${money(r.income)}</span><span class="small c-expense money">-${money(r.expense)}</span></div>`).join('')}</div>` : '<p class="small muted">এ বছরে এখনো হিসাব নেই</p>'}</section>`;
    el.querySelectorAll('[data-m]').forEach((b) => b.onclick = () => { key = addMonths(key, +b.dataset.m); draw(); });
    bindSeg(el.querySelectorAll('.seg')[0], (v) => { kind = v; draw(); });
  };
  draw();
}

// ---------- wallets ----------
export function wallets(el) {
  const draw = () => {
    const ws = M.wallets(); const total = ws.reduce((s, w) => s + M.walletBalance(w), 0);
    const transfers = M.txns((t) => t.kind === 'transfer').slice(0, 20);
    el.innerHTML = `<div class="pagehead"><a class="icon-btn" href="#/more" aria-label="ফিরে যান">${icon('back')}</a><h1>ওয়ালেট</h1></div>
    <section class="card" style="background:var(--accent-soft)"><div class="small muted">মোট ব্যালেন্স</div><div style="font-size:28px;font-weight:700" class="money">${money(total)}</div>
    <a class="btn sm" href="#/add?kind=transfer" style="margin-top:8px">${icon('swap')} ট্রান্সফার</a></section>
    <div class="list">${ws.length ? ws.map((w) => `<button class="item" data-id="${w.id}"><span class="dot" style="background:${w.color}">${icon('wallet')}</span><div class="grow">${esc(w.name)}<div class="xs muted">শুরুর ব্যালেন্স ${money(w.opening || 0)}</div></div><span class="amt money">${money(M.walletBalance(w))}</span></button>`).join('') : empty('wallet', 'কোনো ওয়ালেট নেই', '+ চেপে নগদ, ব্যাংক বা মোবাইল ব্যাংকিং যোগ করুন')}</div>
    ${transfers.length ? `<h2 class="small muted">ট্রান্সফারের ইতিহাস</h2><div class="list">${transfers.map(txnRow).join('')}</div>` : ''}`;
    el.querySelectorAll('[data-id]').forEach((b) => b.onclick = () => walletForm(db.get('wallets', b.dataset.id), draw));
  };
  draw();
  return { fab: [{ icon: 'plus', label: 'নতুন ওয়ালেট', onClick: () => walletForm({}, draw) }] };
}
function walletForm(w, after) {
  let color = w.color || '#13803d';
  modal({ title: w.id ? 'ওয়ালেট বদলান' : 'নতুন ওয়ালেট',
    body: `<label class="field"><span>নাম</span><input class="input" id="n" value="${esc(w.name || '')}" placeholder="যেমন: ব্যাংক, মোবাইল ব্যাংকিং" autofocus></label>
    <label class="field"><span>শুরুর ব্যালেন্স</span><input class="input" id="o" inputmode="decimal" value="${w.opening ? fromPaisa(w.opening) : ''}" placeholder="${bn(0)}"></label>${swatches(color)}`,
    onMount: (el) => bindSwatches(el, (v) => color = v),
    actions: [
      ...(w.id ? [{ label: 'মুছুন', kind: 'secondary', onClick: async () => { if (db.all('txns', (t) => t.walletId === w.id || t.toWalletId === w.id).length) { toast('এই ওয়ালেটে লেনদেন আছে, তাই মোছা যাবে না'); return false; } await db.del('wallets', w.id); after(); } }] : []),
      { label: 'সেভ', onClick: async (el) => { const name = el.querySelector('#n').value.trim(); if (!name) { toast('নাম লিখুন'); return false; } await db.put('wallets', { ...w, bookId: w.bookId || M.bookId(), name, opening: toPaisa(el.querySelector('#o').value), color }); after(); } },
    ] });
}

// ---------- quick entries ----------
export function quick(el) {
  const draw = () => {
    const qs = db.all('quick', M.inBook);
    el.innerHTML = `<div class="pagehead"><a class="icon-btn" href="#/more" aria-label="ফিরে যান">${icon('back')}</a><h1>কুইক এন্ট্রি</h1></div>
    <p class="small muted">রোজকার একই খরচ (চা, রিকশা) একবার সেভ করুন — হোম থেকে এক চাপে যোগ হবে।</p>
    <div class="list">${qs.length ? qs.map((q) => `<button class="item" data-id="${q.id}">${catDot(M.catById(q.categoryId))}<div class="grow">${esc(q.label)}<div class="xs muted">${esc(M.catById(q.categoryId)?.name || '')}</div></div><span class="amt ${q.kind === 'income' ? 'c-income' : 'c-expense'}">${money(q.amount)}</span></button>`).join('') : empty('bolt', 'কোনো কুইক এন্ট্রি নেই')}</div>`;
    el.querySelectorAll('[data-id]').forEach((b) => b.onclick = () => quickForm(db.get('quick', b.dataset.id), draw));
  };
  draw();
  return { fab: [{ icon: 'plus', label: 'নতুন কুইক এন্ট্রি', onClick: () => quickForm({ kind: 'expense' }, draw) }] };
}
function quickForm(q, after) {
  let kind = q.kind || 'expense';
  const opts = () => M.cats(kind).map((c) => `<option value="${c.id}" ${q.categoryId === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('');
  modal({ title: q.id ? 'কুইক এন্ট্রি বদলান' : 'নতুন কুইক এন্ট্রি',
    body: `<div class="seg" id="k" style="margin-bottom:12px"><button type="button" data-v="expense" class="expense ${kind === 'expense' ? 'on' : ''}">খরচ</button><button type="button" data-v="income" class="income ${kind === 'income' ? 'on' : ''}">আয়</button></div>
    <label class="field"><span>নাম</span><input class="input" id="l" value="${esc(q.label || '')}" placeholder="যেমন: সকালের চা" autofocus></label>
    <label class="field"><span>টাকা</span><input class="input" id="a" inputmode="decimal" value="${q.amount ? fromPaisa(q.amount) : ''}"></label>
    <label class="field"><span>ক্যাটাগরি</span><select class="input" id="c">${opts()}</select></label>`,
    onMount: (el) => bindSeg(el.querySelector('#k'), (v) => { kind = v; el.querySelector('#c').innerHTML = opts(); }),
    actions: [
      ...(q.id ? [{ label: 'মুছুন', kind: 'secondary', onClick: async () => { await db.del('quick', q.id); after(); } }] : []),
      { label: 'সেভ', onClick: async (el) => { const label = el.querySelector('#l').value.trim(); const amount = toPaisa(el.querySelector('#a').value); if (!label || !amount) { toast('নাম আর টাকা দুটোই লিখুন'); return false; } await db.put('quick', { ...q, bookId: q.bookId || M.bookId(), label, amount, kind, categoryId: el.querySelector('#c').value || null }); after(); } },
    ] });
}

// ---------- recurring ----------
export function recurring(el) {
  const F = { daily: 'প্রতিদিন', monthly: 'প্রতি মাসে', yearly: 'প্রতি বছর' };
  const draw = () => {
    const rs = db.all('recurring', M.inBook);
    el.innerHTML = `<div class="pagehead"><a class="icon-btn" href="#/more" aria-label="ফিরে যান">${icon('back')}</a><h1>নিয়মিত লেনদেন</h1></div>
    <p class="small muted">নতুন নিয়মিত এন্ট্রি দিতে: নতুন এন্ট্রি ফর্মে “নিয়মিত (রিপিট)” চালু করুন।</p>
    <div class="list">${rs.length ? rs.map((r) => `<div class="item">${catDot(M.catById(r.template.categoryId))}<div class="grow">${esc(M.catById(r.template.categoryId)?.name || r.template.note || 'এন্ট্রি')} · <span class="${r.template.kind === 'income' ? 'c-income' : 'c-expense'}">${money(r.template.amount)}</span><div class="xs muted">${F[r.freq]}${r.freq === 'monthly' ? ` ${bn(r.day)} তারিখে` : ''} · পরেরটা ${dateLabel(r.nextAt)}${r.paused ? ' · বন্ধ' : ''}</div></div>
      <label class="switch"><input type="checkbox" data-p="${r.id}" ${r.paused ? '' : 'checked'} aria-label="চালু/বন্ধ"><span></span></label><button class="icon-btn" data-d="${r.id}" aria-label="মুছুন">${icon('trash')}</button></div>`).join('') : empty('repeat', 'কোনো নিয়মিত লেনদেন নেই')}</div>`;
    el.querySelectorAll('[data-p]').forEach((b) => b.onchange = async () => { const r = db.get('recurring', b.dataset.p); await db.put('recurring', { ...r, paused: !b.checked }); draw(); });
    el.querySelectorAll('[data-d]').forEach((b) => b.onclick = async () => { if (await confirmBox('নিয়মিত এন্ট্রিটা বন্ধ করে মুছবেন? আগের এন্ট্রিগুলো থাকবে।', { ok: 'মুছুন', danger: true })) { await db.del('recurring', b.dataset.d); draw(); } });
  };
  draw();
}

// ---------- printable report ----------
export function report(el) {
  let mode = 'month', key = ym(), from = ymd(new Date(Date.now() - 30 * 864e5)), to = ymd();
  const draw = () => {
    const range = mode === 'day' ? [ymd(), ymd()] : mode === 'month' ? [key + '-01', key + '-31'] : mode === 'year' ? [key.slice(0, 4) + '-01-01', key.slice(0, 4) + '-12-31'] : [from, to];
    const list = M.txns((t) => t.at.slice(0, 10) >= range[0] && t.at.slice(0, 10) <= range[1] && t.kind !== 'transfer').reverse();
    const sum = M.totals(list);
    const byCat = {}; for (const t of list) { const k = (t.kind) + '|' + (t.categoryId || '-'); byCat[k] = (byCat[k] || 0) + t.amount; }
    const s = db.settings(); const book = db.get('books', M.bookId());
    const title = mode === 'day' ? dateLabel(ymd() + 'T00:00') : mode === 'month' ? monthLabel(key) : mode === 'year' ? bn(key.slice(0, 4)) + ' সাল' : `${bn(from)} থেকে ${bn(to)}`;
    el.innerHTML = `<div class="no-print"><div class="pagehead"><a class="icon-btn" href="#/stats" aria-label="ফিরে যান">${icon('back')}</a><h1>রিপোর্ট</h1><button class="btn sm" id="print">${icon('download')} PDF / প্রিন্ট</button></div>
    <div class="seg" style="margin-bottom:8px">${['day:আজ', 'month:মাস', 'year:বছর', 'custom:নিজে বাছুন'].map((x) => { const [v, l] = x.split(':'); return `<button data-v="${v}" class="${mode === v ? 'on' : ''}">${l}</button>`; }).join('')}</div>
    ${mode === 'month' || mode === 'year' ? `<div class="month-nav"><button class="icon-btn" data-m="-1" aria-label="আগে">${icon('left')}</button><b>${title}</b><button class="icon-btn" data-m="1" aria-label="পরে">${icon('right')}</button></div>` : ''}
    ${mode === 'custom' ? `<div class="row" style="gap:8px"><label class="field grow"><span>শুরু</span><input class="input" type="date" id="from" value="${from}"></label><label class="field grow"><span>শেষ</span><input class="input" type="date" id="to" value="${to}"></label></div>` : ''}
    <p class="xs muted">প্রিন্ট উইন্ডোতে “Save as PDF” বেছে নিলে PDF ফাইল হবে। রিপোর্টের মাথায় নাম/লোগো বসাতে: সেটিংস → রিপোর্টের তথ্য।</p></div>
    <article class="card report">
      <div class="row" style="align-items:flex-start">${s.reportLogo ? `<img src="${s.reportLogo}" alt="" style="width:56px;height:56px;object-fit:contain">` : ''}<div class="grow"><h1>${esc(s.reportName || 'কথাখাতা')}</h1><div class="small muted">${esc(s.reportSub || '')}${s.reportPhone ? ' · ' + esc(s.reportPhone) : ''}${s.reportAddress ? ' · ' + esc(s.reportAddress) : ''}</div></div><div class="small" style="text-align:right">আয়-ব্যয় রিপোর্ট<br><b>${title}</b><br><span class="muted">খাতা: ${esc(book?.name || '')}</span></div></div>
      <div class="stats" style="margin:16px 0"><div class="stat income"><small>আয়</small><b>${money(sum.income)}</b></div><div class="stat expense"><small>খরচ</small><b>${money(sum.expense)}</b></div><div class="stat info"><small>বাকি</small><b>${money(sum.balance)}</b></div></div>
      <h3 class="small">ক্যাটাগরি অনুযায়ী</h3>
      <table><thead><tr><th>ক্যাটাগরি</th><th>ধরন</th><th class="n">টাকা</th></tr></thead><tbody>${Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([k, a]) => { const [kd, cid] = k.split('|'); return `<tr><td>${esc(M.catById(cid)?.name || 'অন্যান্য')}</td><td>${kd === 'income' ? 'আয়' : 'খরচ'}</td><td class="n">${money(a)}</td></tr>`; }).join('') || '<tr><td colspan="3" class="muted">কোনো লেনদেন নেই</td></tr>'}</tbody></table>
      <h3 class="small" style="margin-top:16px">সব লেনদেন (${bn(list.length)}টি)</h3>
      <table><thead><tr><th>#</th><th>তারিখ</th><th>বিবরণ</th><th class="n">আয়</th><th class="n">খরচ</th></tr></thead><tbody>${list.map((t, i) => `<tr><td>${bn(i + 1)}</td><td>${bn(t.at.slice(0, 10).split('-').reverse().join('/'))}</td><td><span>${esc(M.catById(t.categoryId)?.name || '')}</span>${t.note ? ' — <span translate="no">' + esc(t.note) + '</span>' : ''}</td><td class="n">${t.kind === 'income' ? money(t.amount) : ''}</td><td class="n">${t.kind === 'expense' ? money(t.amount) : ''}</td></tr>`).join('')}</tbody></table>
      ${s.reportSign || s.reportSigner ? `<div style="margin-top:32px;text-align:right">${s.reportSign ? `<img src="${s.reportSign}" alt="স্বাক্ষর" style="height:48px">` : ''}<div class="small">${esc(s.reportSigner || '')}</div></div>` : ''}
      <p class="xs muted" style="margin-top:16px">তৈরি: ${dateLabel(localISO())} ${timeLabel(localISO())} · কথাখাতা</p>
    </article>`;
    bindSeg(el.querySelector('.seg'), (v) => { mode = v; draw(); });
    el.querySelectorAll('[data-m]').forEach((b) => b.onclick = () => { key = mode === 'year' ? addMonths(key, 12 * b.dataset.m) : addMonths(key, +b.dataset.m); draw(); });
    el.querySelector('#from')?.addEventListener('change', (e) => { from = e.target.value; draw(); });
    el.querySelector('#to')?.addEventListener('change', (e) => { to = e.target.value; draw(); });
    el.querySelector('#print').onclick = () => window.print();
  };
  draw();
}
