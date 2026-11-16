// Lend/borrow (পাবো-দিবো), budget, savings.
import * as db from '../db.js';
import * as M from '../model.js';
import { esc, icon, money, bn, toPaisa, fromPaisa, ym, ymd, localISO, monthLabel, addMonths, dateLabel, colorFor, initial } from '../util.js';
import { modal, confirmBox, toast, empty, swatches, bindSwatches, bindSeg } from '../ui.js';
import { go } from '../router.js';

// ---------- lend / borrow ----------
export function lenden(el) {
  let q = '', sort = 'amount';
  const draw = () => {
    let ps = M.people().map((p) => ({ ...p, bal: M.personBalance(p.id) }));
    const paabo = ps.filter((p) => p.bal > 0).reduce((s, p) => s + p.bal, 0);
    const dibo = ps.filter((p) => p.bal < 0).reduce((s, p) => s - p.bal, 0);
    if (q) ps = ps.filter((p) => p.name.includes(q) || (p.phone || '').includes(q));
    ps.sort(sort === 'amount' ? (a, b) => Math.abs(b.bal) - Math.abs(a.bal) : (a, b) => a.name.localeCompare(b.name, 'bn'));
    el.innerHTML = `<div class="stats" style="margin-bottom:12px"><div class="stat income"><small>পাবো</small><b>${money(paabo)}</b></div><div class="stat expense"><small>দিবো</small><b>${money(dibo)}</b></div><div class="stat info"><small>মানুষ</small><b>${bn(M.people().length)} জন</b></div></div>
    <div class="row" style="margin-bottom:12px"><label class="grow"><span class="sr">খুঁজুন</span><input class="input" id="q" type="search" placeholder="নাম বা ফোন নম্বর দিয়ে খুঁজুন" value="${esc(q)}"></label>
    <button class="icon-btn" id="sort" aria-label="সাজান: ${sort === 'amount' ? 'টাকা' : 'নাম'}" title="সাজান">${icon('filter')}</button></div>
    <div class="list">${ps.length ? ps.map((p) => `<a class="item" href="#/person/${p.id}"><span class="dot" style="--c:${colorFor(p.name)}">${esc(initial(p.name))}</span><div class="grow">${esc(p.name)}<div class="xs muted">${p.phone ? esc(p.phone) : ''}</div></div><div style="text-align:right"><div class="amt ${p.bal > 0 ? 'c-income' : p.bal < 0 ? 'c-expense' : 'muted'}">${money(Math.abs(p.bal))}</div><div class="xs muted">${p.bal > 0 ? 'পাবো' : p.bal < 0 ? 'দিবো' : 'শোধ'}</div></div></a>`).join('') : empty('user', q ? 'কাউকে পাওয়া যায়নি' : 'কোনো দেনা-পাওনা নেই', '+ চেপে মানুষ যোগ করুন, তারপর কত দিলেন/নিলেন লিখুন')}</div>`;
    const qi = el.querySelector('#q'); qi.oninput = () => { q = qi.value.trim(); draw(); const n = el.querySelector('#q'); n.focus(); n.setSelectionRange(q.length, q.length); };
    el.querySelector('#sort').onclick = () => { sort = sort === 'amount' ? 'name' : 'amount'; toast(sort === 'amount' ? 'টাকা অনুযায়ী সাজানো' : 'নাম অনুযায়ী সাজানো'); draw(); };
  };
  draw();
  return { fab: [{ icon: 'plus', label: 'নতুন মানুষ', onClick: () => personForm({}, (p) => go('#/person/' + p.id)) }] };
}
function personForm(p, after) {
  modal({ title: p.id ? 'তথ্য বদলান' : 'নতুন মানুষ',
    body: `<label class="field"><span>নাম</span><input class="input" id="n" value="${esc(p.name || '')}" autofocus></label>
    <label class="field"><span>ফোন (ঐচ্ছিক)</span><input class="input" id="ph" type="tel" inputmode="tel" value="${esc(p.phone || '')}"></label>
    <label class="field"><span>ঠিকানা (ঐচ্ছিক)</span><input class="input" id="ad" value="${esc(p.address || '')}"></label>`,
    actions: [{ label: 'বাতিল', kind: 'secondary' }, { label: 'সেভ', onClick: async (el) => { const name = el.querySelector('#n').value.trim(); if (!name) { toast('নাম লিখুন'); return false; } const r = await db.put('people', { ...p, bookId: p.bookId || M.bookId(), name, phone: el.querySelector('#ph').value.trim(), address: el.querySelector('#ad').value.trim() }); after(r); } }] });
}
const DIR = { give: ['দিলাম (ধার)', 'c-income', 'পাবো বাড়লো'], take: ['নিলাম (ধার)', 'c-expense', 'দিবো বাড়লো'], receive: ['ফেরত পেলাম', 'c-info', 'পাবো কমলো'], repay: ['ফেরত দিলাম', 'c-info', 'দিবো কমলো'] };
export function person(el, id) {
  const p = db.get('people', id);
  if (!p) { el.innerHTML = empty('user', 'পাওয়া যায়নি'); return; }
  const draw = () => {
    const bal = M.personBalance(id);
    const es = db.all('lenden', (e) => e.personId === id).sort((a, b) => (a.at < b.at ? 1 : -1));
    el.innerHTML = `<div class="pagehead"><a class="icon-btn" href="#/lenden" aria-label="ফিরে যান">${icon('back')}</a><h1>${esc(p.name)}</h1><button class="icon-btn" id="edit" aria-label="তথ্য বদলান">${icon('edit')}</button></div>
    <section class="card" style="text-align:center"><div class="small muted">${bal > 0 ? `${esc(p.name)} আপনাকে দেবেন` : bal < 0 ? `আপনি ${esc(p.name)}-কে দেবেন` : 'কোনো বাকি নেই'}</div>
    <div style="font-size:32px;font-weight:700" class="money ${bal > 0 ? 'c-income' : bal < 0 ? 'c-expense' : ''}">${money(Math.abs(bal))}</div>
    <div class="row" style="justify-content:center;gap:8px;margin-top:8px;flex-wrap:wrap">
      <button class="btn sm" data-dir="give">দিলাম</button><button class="btn sm danger" data-dir="take">নিলাম</button>
      ${bal ? `<button class="btn sm secondary" data-dir="${bal > 0 ? 'receive' : 'repay'}">${bal > 0 ? 'ফেরত পেলাম' : 'ফেরত দিলাম'}</button>` : ''}
      <button class="btn sm secondary" id="share">${icon('share')} হোয়াটসঅ্যাপে পাঠান</button>
      ${p.phone ? `<a class="btn sm ghost" href="tel:${esc(p.phone)}">${icon('phone')} কল</a>` : ''}
    </div></section>
    <div class="list">${es.length ? es.map((e) => `<button class="item" data-e="${e.id}"><div class="grow"><div class="${DIR[e.dir][1]}">${DIR[e.dir][0]}</div><div class="xs muted">${dateLabel(e.at)}${e.note ? ' · ' + esc(e.note) : ''}</div></div><span class="amt">${money(e.amount)}</span></button>`).join('') : empty('swap', 'এখনো কোনো লেনদেন নেই')}</div>
    <button class="btn ghost" id="delp" style="color:var(--expense)">${icon('trash')} এই মানুষটিকে মুছুন</button>`;
    el.querySelectorAll('[data-dir]').forEach((b) => b.onclick = () => entryForm({ personId: id, dir: b.dataset.dir }, draw));
    el.querySelectorAll('[data-e]').forEach((b) => b.onclick = () => entryForm(db.get('lenden', b.dataset.e), draw));
    el.querySelector('#edit').onclick = () => personForm(p, (r) => { Object.assign(p, r); draw(); });
    el.querySelector('#share').onclick = () => {
      const lines = es.slice(0, 15).reverse().map((e) => `${e.at.slice(0, 10).split('-').reverse().join('/')} — ${DIR[e.dir][0]} ${money(e.amount)}${e.note ? ' (' + e.note + ')' : ''}`);
      const en = db.settings().lang === 'en';
      const lbl = (d) => (en ? { give: 'Lent', take: 'Borrowed', receive: 'Got back', repay: 'Paid back' }[d] : DIR[d][0]);
      const lines2 = es.slice(0, 15).reverse().map((e) => `${e.at.slice(0, 10).split('-').reverse().join('/')} — ${lbl(e.dir)} ${money(e.amount)}${e.note ? ' (' + e.note + ')' : ''}`);
      const txt = en
        ? `Hello ${p.name},\nOur account:\n${lines2.join('\n')}\n\n${bal > 0 ? `You owe me: ${money(bal)}` : bal < 0 ? `I owe you: ${money(-bal)}` : 'All settled.'}\n— sent from KothaKhata`
        : `আসসালামু আলাইকুম ${p.name},\nআমাদের হিসাব:\n${lines.join('\n')}\n\n${bal > 0 ? `আপনার কাছে পাওনা: ${money(bal)}` : bal < 0 ? `আমার কাছে আপনার পাওনা: ${money(-bal)}` : 'সব হিসাব শোধ।'}\n— কথাখাতা থেকে পাঠানো`;
      const phone = (p.phone || '').replace(/\D/g, '').replace(/^0/, '880');
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(txt)}`, '_blank', 'noopener');
    };
    el.querySelector('#delp').onclick = async () => { if (await confirmBox(`${p.name} ও তাঁর সব লেনদেন মুছে ফেলবেন?`, { ok: 'মুছুন', danger: true })) { for (const e of es) await db.del('lenden', e.id); await db.del('people', id); go('#/lenden'); } };
  };
  draw();
}
function entryForm(e, after) {
  let dir = e.dir;
  modal({ title: e.id ? 'লেনদেন বদলান' : DIR[dir][0],
    body: `<div class="seg" id="d" style="margin-bottom:12px">${Object.entries(DIR).map(([k, v]) => `<button type="button" data-v="${k}" class="${dir === k ? 'on' : ''}" style="font-size:12px">${v[0]}</button>`).join('')}</div>
    <label class="field"><span>টাকা</span><input class="input big" id="a" inputmode="decimal" value="${e.amount ? fromPaisa(e.amount) : ''}" autofocus></label>
    <label class="field"><span>তারিখ</span><input class="input" type="date" id="dt" value="${(e.at || localISO()).slice(0, 10)}"></label>
    <label class="field"><span>নোট (ঐচ্ছিক)</span><input class="input" id="n" value="${esc(e.note || '')}"></label>`,
    onMount: (el) => bindSeg(el.querySelector('#d'), (v) => dir = v),
    actions: [
      ...(e.id ? [{ label: 'মুছুন', kind: 'secondary', onClick: async () => { await db.del('lenden', e.id); after(); } }] : [{ label: 'বাতিল', kind: 'secondary' }]),
      { label: 'সেভ', onClick: async (el) => { const amount = toPaisa(el.querySelector('#a').value); if (!amount) { toast('টাকা লিখুন'); return false; } await db.put('lenden', { ...e, dir, amount, at: el.querySelector('#dt').value + 'T12:00', note: el.querySelector('#n').value.trim() }); toast('সেভ হয়েছে'); after(); } },
    ] });
}

// ---------- budget ----------
export function budget(el) {
  let key = ym();
  const draw = () => {
    const bs = M.budgetsFor(key);
    const st = bs.map((b) => ({ b, s: M.budgetStatus(b, key) }));
    const overall = st.find((x) => !x.b.categoryId);
    const totalLimit = overall ? overall.s.limit : st.reduce((a, x) => a + x.s.limit, 0);
    const totalSpent = overall ? overall.s.spent : st.reduce((a, x) => a + x.s.spent, 0);
    const pct = totalLimit ? Math.round((totalSpent / totalLimit) * 100) : 0;
    el.innerHTML = `<div class="month-nav"><button class="icon-btn" data-m="-1" aria-label="আগের মাস">${icon('left')}</button><b>${monthLabel(key)}</b><button class="icon-btn" data-m="1" aria-label="পরের মাস">${icon('right')}</button></div>
    <section class="card row"><div class="ring ${pct >= 100 ? 'over' : ''}" style="--p:${Math.min(100, pct)}" data-label="${bn(pct)}%" role="img" aria-label="বাজেটের ${pct}% খরচ"></div>
      <div class="grow"><div class="row"><b class="grow">মোট বাকি</b><b class="money ${totalLimit - totalSpent < 0 ? 'c-expense' : 'c-info'}">${money(totalLimit - totalSpent)}</b></div>
      <div class="row small muted"><span class="grow">খরচ হয়েছে</span><span class="money">${money(totalSpent)}</span></div><div class="row small muted"><span class="grow">মোট বাজেট</span><span class="money">${money(totalLimit)}</span></div></div></section>
    ${st.length ? st.map(({ b, s }) => `<button class="card item" style="display:block;border:1px solid var(--border)" data-id="${b.id}"><div class="row"><b class="grow">${esc(b.categoryId ? M.catById(b.categoryId)?.name || 'ক্যাটাগরি' : 'সব খরচ')}</b>${s.pct >= 100 ? '<span class="tag warn">সীমা পার</span>' : s.pct >= 80 ? '<span class="tag warn">প্রায় শেষ</span>' : ''}</div>
      <div class="xs muted">${b.mode === 'percent' ? `আয়ের ${bn(b.value)}%` : 'নির্দিষ্ট টাকা'} · ${b.repeat === 'monthly' ? 'প্রতি মাসে' : 'শুধু এই মাসে'}</div>
      <div class="bar ${s.pct >= 100 ? 'over' : ''}" style="margin:8px 0"><i style="width:${Math.min(100, s.pct)}%;background:${s.pct >= 100 ? '' : b.color || ''}"></i></div>
      <div class="row small"><span class="grow money">${money(s.spent)} / ${money(s.limit)}</span><span class="money ${s.left < 0 ? 'c-expense' : 'c-income'}">${s.left < 0 ? 'বেশি ' + money(-s.left) : 'বাকি ' + money(s.left)}</span></div></button>`).join('') : empty('pie', 'কোনো বাজেট নেই', '+ চেপে মাসের খরচের সীমা ঠিক করুন')}`;
    el.querySelectorAll('[data-m]').forEach((b) => b.onclick = () => { key = addMonths(key, +b.dataset.m); draw(); });
    el.querySelectorAll('[data-id]').forEach((b) => b.onclick = () => budgetForm(db.get('budgets', b.dataset.id), key, draw));
  };
  draw();
  return { fab: [{ icon: 'plus', label: 'নতুন বাজেট', onClick: () => budgetForm({}, key, draw) }] };
}
function budgetForm(b, key, after) {
  let mode = b.mode || 'fixed', repeat = b.repeat || 'monthly', color = b.color || '#0d6b5e';
  modal({ title: b.id ? 'বাজেট বদলান' : 'নতুন বাজেট',
    body: `<div class="seg" id="mo" style="margin-bottom:12px"><button type="button" data-v="fixed" class="${mode === 'fixed' ? 'on' : ''}">নির্দিষ্ট টাকা</button><button type="button" data-v="percent" class="${mode === 'percent' ? 'on' : ''}">আয়ের %</button></div>
    <label class="field"><span>ক্যাটাগরি</span><select class="input" id="c"><option value="">সব খরচ (মোট)</option>${M.cats('expense').map((c) => `<option value="${c.id}" ${b.categoryId === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
    <label class="field"><span id="vl">${mode === 'percent' ? 'আয়ের কত শতাংশ' : 'টাকা'}</span><input class="input" id="v" inputmode="decimal" value="${b.value ? (mode === 'percent' ? b.value : fromPaisa(b.value)) : ''}"></label>
    <div class="seg" id="rp" style="margin-bottom:12px"><button type="button" data-v="monthly" class="${repeat === 'monthly' ? 'on' : ''}">প্রতি মাসে</button><button type="button" data-v="once" class="${repeat === 'once' ? 'on' : ''}">শুধু ${monthLabel(key)}</button></div>${swatches(color)}`,
    onMount: (el) => { bindSeg(el.querySelector('#mo'), (v) => { mode = v; el.querySelector('#vl').textContent = v === 'percent' ? 'আয়ের কত শতাংশ' : 'টাকা'; }); bindSeg(el.querySelector('#rp'), (v) => repeat = v); bindSwatches(el, (v) => color = v); },
    actions: [
      ...(b.id ? [{ label: 'মুছুন', kind: 'secondary', onClick: async () => { await db.del('budgets', b.id); after(); } }] : [{ label: 'বাতিল', kind: 'secondary' }]),
      { label: 'সেভ', onClick: async (el) => { const raw = el.querySelector('#v').value; const value = mode === 'percent' ? Math.min(100, parseFloat(raw.replace(/[০-৯]/g, (d) => '০১২৩৪৫৬৭৮৯'.indexOf(d))) || 0) : toPaisa(raw); if (!value) { toast('পরিমাণ লিখুন'); return false; } await db.put('budgets', { ...b, bookId: b.bookId || M.bookId(), mode, value, repeat, color, categoryId: el.querySelector('#c').value || null, month: b.month || key }); after(); } },
    ] });
}

// ---------- savings ----------
export function savings(el) {
  const draw = () => {
    const ps = db.all('savings', M.inBook);
    const total = ps.reduce((s, p) => s + M.potSaved(p), 0);
    el.innerHTML = `${ps.length ? `<section class="card" style="background:var(--accent-soft)"><div class="small muted">মোট সঞ্চয়</div><div style="font-size:28px;font-weight:700" class="money">${money(total)}</div></section>` : ''}
    ${ps.length ? ps.map((p) => { const s = M.potSaved(p); const pct = p.target ? Math.min(100, Math.round((s / p.target) * 100)) : 0; return `<section class="card"><div class="row"><span class="dot" style="--c:${p.color}">${icon('piggy')}</span><div class="grow"><b>${esc(p.name)}</b><div class="xs muted">লক্ষ্য ${money(p.target)} · ${bn(pct)}%</div></div><button class="icon-btn" data-edit="${p.id}" aria-label="বদলান">${icon('edit')}</button></div>
      <div class="bar" style="margin:10px 0"><i style="width:${pct}%;background:${p.color}"></i></div>
      <div class="row"><span class="grow money"><b>${money(s)}</b> <span class="small muted">জমা · বাকি ${money(Math.max(0, p.target - s))}</span></span><button class="btn sm secondary" data-out="${p.id}">তুলুন</button><button class="btn sm" data-in="${p.id}">জমা দিন</button></div>
      ${pct >= 100 ? '<p class="small c-income" style="margin:8px 0 0">🎉 লক্ষ্য পূরণ হয়েছে!</p>' : ''}</section>`; }).join('') : empty('piggy', 'কোনো সঞ্চয়ের খাত নেই', '+ চেপে লক্ষ্য ঠিক করুন — যেমন “ঈদের কেনাকাটা” বা “জরুরি তহবিল”')}`;
    el.querySelectorAll('[data-edit]').forEach((b) => b.onclick = () => potForm(db.get('savings', b.dataset.edit), draw));
    el.querySelectorAll('[data-in],[data-out]').forEach((b) => b.onclick = () => {
      const out = !!b.dataset.out; const pid = b.dataset.in || b.dataset.out; const p = db.get('savings', pid);
      modal({ title: `${p.name} — ${out ? 'টাকা তুলুন' : 'জমা দিন'}`, body: `<label class="field"><span>টাকা</span><input class="input big" id="a" inputmode="decimal" autofocus></label><label class="field"><span>নোট (ঐচ্ছিক)</span><input class="input" id="n"></label>`,
        actions: [{ label: 'বাতিল', kind: 'secondary' }, { label: 'সেভ', onClick: async (el) => { const a = toPaisa(el.querySelector('#a').value); if (!a) { toast('টাকা লিখুন'); return false; } if (out && a > M.potSaved(p)) { toast('এত টাকা জমা নেই'); return false; } await db.put('deposits', { savingsId: pid, amount: out ? -a : a, at: localISO(), note: el.querySelector('#n').value.trim() }); draw(); } }] });
    });
  };
  draw();
  return { fab: [{ icon: 'plus', label: 'নতুন সঞ্চয়ের খাত', onClick: () => potForm({}, draw) }] };
}
function potForm(p, after) {
  let color = p.color || '#b45309';
  modal({ title: p.id ? 'খাত বদলান' : 'নতুন সঞ্চয়ের খাত',
    body: `<label class="field"><span>খাতের নাম</span><input class="input" id="n" value="${esc(p.name || '')}" autofocus></label><label class="field"><span>লক্ষ্য (টাকা)</span><input class="input" id="t" inputmode="decimal" value="${p.target ? fromPaisa(p.target) : ''}"></label>${swatches(color)}`,
    onMount: (el) => bindSwatches(el, (v) => color = v),
    actions: [
      ...(p.id ? [{ label: 'মুছুন', kind: 'secondary', onClick: async () => { if (!(await confirmBox('খাত ও এর সব জমা মুছবেন?', { ok: 'মুছুন', danger: true }))) return false; for (const d of db.all('deposits', (d) => d.savingsId === p.id)) await db.del('deposits', d.id); await db.del('savings', p.id); after(); } }] : [{ label: 'বাতিল', kind: 'secondary' }]),
      { label: 'সেভ', onClick: async (el) => { const name = el.querySelector('#n').value.trim(); const target = toPaisa(el.querySelector('#t').value); if (!name || !target) { toast('নাম আর লক্ষ্য দুটোই লিখুন'); return false; } await db.put('savings', { ...p, bookId: p.bookId || M.bookId(), name, target, color, startAt: p.startAt || ymd() }); after(); } },
    ] });
}
