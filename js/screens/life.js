// To-do, notes, alarms & reminders, notification inbox.
import * as db from '../db.js';
import { esc, icon, bn, ymd, hm, localISO, dateLabel, timeLabel, hmLabel, DAYS, COLORS } from '../util.js';
import { modal, confirmBox, toast, empty, swatches, bindSwatches, bindSeg, micFor, micBtn } from '../ui.js';
import { askPermission } from '../reminders.js';
import { go } from '../router.js';

const PRI = { high: ['জরুরি', 'warn'], normal: ['সাধারণ', ''], low: ['পরে করলেও চলবে', ''] };

// ---------- tasks ----------
export function tasks(el) {
  let tab = 'open';
  const draw = () => {
    const now = localISO();
    const all = db.all('tasks');
    const open = all.filter((t) => !t.done).sort((a, b) => (a.priority === 'high' ? -1 : 0) - (b.priority === 'high' ? -1 : 0) || (a.dueAt || '9') .localeCompare(b.dueAt || '9'));
    const done = all.filter((t) => t.done).sort((a, b) => (a.doneAt < b.doneAt ? 1 : -1));
    const list = tab === 'open' ? open : done;
    el.innerHTML = `<div class="row" style="margin-bottom:12px"><h1 class="grow" style="font-size:20px;margin:0">কাজ <span class="tag">${bn(open.length)}</span></h1>
      <div class="seg" style="min-width:200px"><button data-v="open" class="${tab === 'open' ? 'on' : ''}">চলমান</button><button data-v="done" class="${tab === 'done' ? 'on' : ''}">শেষ (${bn(done.length)})</button></div></div>
    <form id="qa" class="row card flat" style="padding:8px;gap:6px"><label class="grow"><span class="sr">নতুন কাজ</span><input class="input" id="qt" placeholder="নতুন কাজ লিখুন বা মাইকে বলুন…" autocomplete="off"></label>${micBtn('বলে কাজ লিখুন')}<button class="btn" aria-label="যোগ করুন">${icon('plus')}</button></form>
    <div class="list">${list.length ? list.map((t) => { const late = !t.done && t.dueAt && t.dueAt < now; return `<div class="item"><button class="check ${t.done ? 'on' : ''}" data-tog="${t.id}" aria-label="${t.done ? 'আবার চালু করুন' : 'শেষ হয়েছে'}">${icon('check')}</button>
      <button class="grow" data-id="${t.id}" style="background:none;border:0;text-align:left;cursor:pointer;padding:0"><div class="${t.done ? 'done-t' : ''}">${esc(t.title)}</div><div class="row" style="gap:6px;flex-wrap:wrap;margin-top:2px">${t.priority === 'high' ? '<span class="tag warn">জরুরি</span>' : ''}${t.dueAt ? `<span class="tag ${late ? 'warn' : ''}">${icon('calendar')} ${dateLabel(t.dueAt)} ${timeLabel(t.dueAt)}</span>` : ''}${t.remindAt && !t.done ? `<span class="tag ok">${icon('bell')} ${timeLabel(t.remindAt)}</span>` : ''}${t.done && t.doneAt ? `<span class="tag">শেষ ${dateLabel(t.doneAt)}</span>` : ''}</div></button></div>`; }).join('')
      : empty('list', tab === 'open' ? 'কোনো চলমান কাজ নেই' : 'এখনো কোনো কাজ শেষ হয়নি', tab === 'open' ? 'উপরের ঘরে লিখুন বা মাইক চেপে বলুন' : '')}</div>
    ${tab === 'done' && done.length ? '<button class="btn ghost" id="clr">শেষ হওয়া সব কাজ মুছুন</button>' : ''}`;
    bindSeg(el.querySelector('.seg'), (v) => { tab = v; draw(); });
    const qt = el.querySelector('#qt');
    micFor(el.querySelector('[data-mic]'), qt, { purpose: 'task', append: false });
    el.querySelector('#qa').onsubmit = async (e) => { e.preventDefault(); const title = qt.value.trim(); if (!title) return; await db.put('tasks', { title, done: false, priority: 'normal' }); toast('কাজ যোগ হয়েছে'); draw(); el.querySelector('#qt').focus(); };
    el.querySelectorAll('[data-tog]').forEach((b) => b.onclick = async () => { const t = db.get('tasks', b.dataset.tog); await db.put('tasks', { ...t, done: !t.done, doneAt: !t.done ? new Date().toISOString() : null }); if (!t.done) toast('সাবাস! কাজ শেষ ✓'); draw(); });
    el.querySelectorAll('[data-id]').forEach((b) => b.onclick = () => taskForm(db.get('tasks', b.dataset.id), draw));
    el.querySelector('#clr')?.addEventListener('click', async () => { if (await confirmBox('শেষ হওয়া সব কাজ মুছবেন?', { ok: 'মুছুন', danger: true })) { for (const t of done) await db.del('tasks', t.id); draw(); } });
  };
  draw();
  return { fab: [{ icon: 'plus', label: 'বিস্তারিত কাজ যোগ করুন', onClick: () => taskForm({ priority: 'normal' }, draw) }] };
}
function taskForm(t, after) {
  let pri = t.priority || 'normal';
  modal({ title: t.id ? 'কাজ বদলান' : 'নতুন কাজ',
    body: `<div class="row" style="align-items:flex-start"><label class="field grow"><span>কাজ</span><textarea class="input" id="tt" style="min-height:80px" autofocus>${esc(t.title || '')}</textarea></label>${micBtn()}</div>
    <div class="field"><span>গুরুত্ব</span><div class="seg" id="pr">${Object.entries(PRI).map(([k, v]) => `<button type="button" data-v="${k}" class="${pri === k ? 'on' : ''}">${v[0]}</button>`).join('')}</div></div>
    <label class="field"><span>শেষ করার সময় (ঐচ্ছিক)</span><input class="input" type="datetime-local" id="due" value="${t.dueAt || ''}"></label>
    <label class="field"><span>${icon('bell')} রিমাইন্ডার (ঐচ্ছিক)</span><input class="input" type="datetime-local" id="rem" value="${t.remindAt || ''}"></label>
    <div class="row" style="gap:6px;flex-wrap:wrap">${[['10', '১০ মিনিট পরে'], ['60', '১ ঘণ্টা পরে'], ['tm', 'কাল সকাল ৯টা']].map(([v, l]) => `<button type="button" class="chip" data-r="${v}">${l}</button>`).join('')}</div>`,
    onMount: (el) => {
      micFor(el.querySelector('[data-mic]'), el.querySelector('#tt'), { purpose: 'task' });
      bindSeg(el.querySelector('#pr'), (v) => pri = v);
      el.querySelectorAll('[data-r]').forEach((b) => b.onclick = () => { const d = new Date(); if (b.dataset.r === 'tm') { d.setDate(d.getDate() + 1); d.setHours(9, 0); } else d.setMinutes(d.getMinutes() + +b.dataset.r); el.querySelector('#rem').value = localISO(d); });
    },
    actions: [
      ...(t.id ? [{ label: 'মুছুন', kind: 'secondary', onClick: async () => { await db.del('tasks', t.id); after(); } }] : [{ label: 'বাতিল', kind: 'secondary' }]),
      { label: 'সেভ', onClick: async (el) => { const title = el.querySelector('#tt').value.trim(); if (!title) { toast('কাজটা লিখুন'); return false; } const remindAt = el.querySelector('#rem').value || null; if (remindAt) askPermission(); await db.put('tasks', { ...t, title, priority: pri, dueAt: el.querySelector('#due').value || null, remindAt, reminded: remindAt && remindAt !== t.remindAt ? false : t.reminded, done: !!t.done }); after(); } },
    ] });
}

// ---------- notes ----------
export function notes(el) {
  let q = '';
  const draw = () => {
    let ns = db.all('notes').sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (a.updatedAt < b.updatedAt ? 1 : -1));
    if (q) ns = ns.filter((n) => (n.title + ' ' + n.body).includes(q));
    el.innerHTML = `<div class="row" style="margin-bottom:12px"><h1 class="grow" style="font-size:20px;margin:0">নোট</h1><a class="btn sm secondary" href="#/voice">${icon('mic')} ভয়েস থেকে লেখা</a></div>
    <label><span class="sr">নোট খুঁজুন</span><input class="input" id="q" type="search" placeholder="নোট খুঁজুন" value="${esc(q)}" style="margin-bottom:12px"></label>
    ${ns.length ? `<div class="notes-grid">${ns.map((n) => `<a class="note-card" href="#/note/${n.id}" style="${n.color ? `border-top:4px solid ${n.color}` : ''}"><div class="row xs muted" style="margin-bottom:4px"><span class="grow">#${bn(n.serial)}</span>${n.pinned ? icon('pin') : ''}${n.remindAt && !n.reminded ? icon('bell') : ''}</div><h3>${esc(n.title || 'শিরোনাম নেই')}</h3><p>${esc(n.body)}</p><div class="xs muted" style="margin-top:8px">${dateLabel(n.updatedAt)}</div></a>`).join('')}</div>`
      : empty('note', q ? 'কিছু পাওয়া যায়নি' : 'কোনো নোট নেই', '+ চেপে লিখুন বা মুখে বলুন')}`;
    const qi = el.querySelector('#q'); qi.oninput = () => { q = qi.value.trim(); draw(); const n = el.querySelector('#q'); n.focus(); n.setSelectionRange(q.length, q.length); };
  };
  draw();
  return { fab: [{ icon: 'mic', label: 'বলে নোট লিখুন', alt: true, href: '#/note/new?voice=1' }, { icon: 'plus', label: 'নতুন নোট', href: '#/note/new' }] };
}
export function note(el, id, params = {}) {
  const isNew = id === 'new';
  const n = isNew ? { title: '', body: '', color: '', pinned: false } : db.get('notes', id);
  if (!n) { el.innerHTML = empty('note', 'নোটটা পাওয়া যায়নি'); return; }
  let reading = !isNew && params.read !== '0' && n.body.length > 0;
  const save = async () => {
    const title = el.querySelector('#nt')?.value.trim() ?? n.title; const body = el.querySelector('#nb')?.value ?? n.body;
    if (!title && !body.trim()) return null;
    if (!n.serial) n.serial = Math.max(0, ...db.all('notes').map((x) => x.serial || 0)) + 1;
    Object.assign(n, await db.put('notes', { ...n, title, body }));
    const h = el.querySelector('.pagehead h1'); if (h) h.textContent = '#' + bn(n.serial);
    return n;
  };
  const draw = () => {
    el.innerHTML = `<div class="pagehead"><button class="icon-btn" id="back" aria-label="ফিরে যান">${icon('back')}</button><h1>${n.serial ? '#' + bn(n.serial) : 'নতুন নোট'}</h1>
      <button class="icon-btn" id="pin" aria-pressed="${n.pinned}" aria-label="${n.pinned ? 'পিন সরান' : 'উপরে পিন করুন'}" style="${n.pinned ? 'color:var(--accent)' : ''}">${icon('pin')}</button>
      <button class="icon-btn" id="rem" aria-label="রিমাইন্ডার" style="${n.remindAt && !n.reminded ? 'color:var(--saffron)' : ''}">${icon('bell')}</button>
      <button class="icon-btn" id="mode" aria-label="${reading ? 'এডিট করুন' : 'পড়ার মোড'}">${icon(reading ? 'edit' : 'read')}</button>
      <button class="icon-btn" id="copy" aria-label="কপি করুন">${icon('copy')}</button>
      ${isNew && !n.id ? '' : `<button class="icon-btn" id="del" aria-label="মুছুন">${icon('trash')}</button>`}</div>
    ${reading ? `<article class="card"><h2 style="margin-top:0">${esc(n.title)}</h2><div class="reading">${esc(n.body)}</div></article>`
      : `<div class="card"><input class="input" id="nt" placeholder="শিরোনাম" value="${esc(n.title)}" style="font-weight:700;font-size:20px;border:0;padding-left:0" aria-label="শিরোনাম">
      <div class="row" style="align-items:flex-start"><textarea class="input" id="nb" placeholder="লিখুন… অথবা মাইক চেপে বলুন" style="min-height:50vh;border:0;padding-left:0" aria-label="নোট">${esc(n.body)}</textarea>${micBtn('বলে লিখুন')}</div>
      <div class="row small muted" style="flex-wrap:wrap;gap:8px"><span class="grow">রং:</span>${swatches(n.color)}</div></div>`}
    ${n.remindAt && !n.reminded ? `<p class="small c-saffron">${icon('bell')} রিমাইন্ডার: ${dateLabel(n.remindAt)} ${timeLabel(n.remindAt)}</p>` : ''}`;
    el.querySelector('#back').onclick = async () => { if (!reading) await save(); go('#/notes'); };
    el.querySelector('#mode').onclick = async () => { if (!reading) { if (!(await save())) { toast('কিছু লেখা নেই'); return; } } reading = !reading; draw(); };
    el.querySelector('#pin').onclick = async () => { n.pinned = !n.pinned; if (!reading) await save(); else Object.assign(n, await db.put('notes', n)); draw(); };
    el.querySelector('#copy').onclick = () => { const t = (el.querySelector('#nt')?.value ?? n.title) + '\n' + (el.querySelector('#nb')?.value ?? n.body); navigator.clipboard?.writeText(t.trim()).then(() => toast('কপি হয়েছে')); };
    el.querySelector('#rem').onclick = () => modal({ title: 'নোট রিমাইন্ডার', body: `<label class="field"><span>কখন মনে করাবো</span><input class="input" type="datetime-local" id="r" value="${n.remindAt || ''}"></label>`,
      actions: [{ label: 'সরান', kind: 'secondary', onClick: async () => { n.remindAt = null; await save() || db.put('notes', n); draw(); } }, { label: 'সেভ', onClick: async (m) => { const v = m.querySelector('#r').value; if (!v) return false; n.remindAt = v; n.reminded = false; askPermission(); if (!(await save())) { toast('আগে কিছু লিখুন'); return false; } toast('রিমাইন্ডার সেট হয়েছে'); draw(); } }] });
    el.querySelector('#del')?.addEventListener('click', async () => { if (await confirmBox('নোটটা মুছে ফেলবেন?', { ok: 'মুছুন', danger: true })) { if (n.id) await db.del('notes', n.id); go('#/notes'); } });
    if (!reading) {
      bindSwatches(el, (c) => { n.color = c; });
      micFor(el.querySelector('[data-mic]'), el.querySelector('#nb'), { purpose: 'note' });
      let t; el.querySelector('#nb').addEventListener('input', () => { clearTimeout(t); t = setTimeout(save, 1200); });
      if (isNew && !n.id) el.querySelector('#nb').focus();
    }
  };
  draw();
  if (params.voice === '1') setTimeout(() => el.querySelector('[data-mic]')?.click(), 300);
}

// ---------- alarms ----------
export function alarms(el) {
  const draw = () => {
    const as = db.all('alarms').sort((a, b) => a.time.localeCompare(b.time));
    const upcoming = [...db.all('tasks', (t) => !t.done && t.remindAt && !t.reminded).map((t) => ({ at: t.remindAt, title: t.title, kind: 'কাজ', href: '#/tasks' })),
      ...db.all('notes', (n) => n.remindAt && !n.reminded).map((n) => ({ at: n.remindAt, title: n.title || n.body.slice(0, 40), kind: 'নোট', href: '#/note/' + n.id }))].sort((a, b) => a.at.localeCompare(b.at));
    const perm = 'Notification' in window ? Notification.permission : 'unsupported';
    el.innerHTML = `<div class="row" style="margin-bottom:12px"><h1 class="grow" style="font-size:20px;margin:0">অ্যালার্ম ও রিমাইন্ডার</h1></div>
    ${perm !== 'granted' ? `<div class="card flat row" style="background:var(--saffron-soft)"><div class="grow small">${perm === 'denied' ? 'ব্রাউজারে নোটিফিকেশন বন্ধ করা আছে। ঠিকানা বারের পাশের আইকন থেকে চালু করুন।' : 'অন্য ট্যাবে থাকলেও যেন জানাতে পারি, নোটিফিকেশনের অনুমতি দিন।'}</div>${perm === 'default' ? '<button class="btn sm" id="perm">অনুমতি দিন</button>' : ''}</div>` : ''}
    <p class="xs muted">অ্যালার্ম বাজবে যখন কথাখাতা খোলা থাকবে (ট্যাবে বা ইনস্টল করা অ্যাপে)। ফোন লক থাকলেও বাজানোর জন্য পরের সংস্করণে Android অ্যাপ আসবে।</p>
    <div class="list">${as.length ? as.map((a) => `<div class="item"><button class="grow" data-id="${a.id}" style="background:none;border:0;text-align:left;cursor:pointer;padding:0"><div style="font-size:24px;font-weight:700;${a.enabled ? '' : 'opacity:.45'}">${hmLabel(a.time)}</div><div class="xs muted">${esc(a.label || 'অ্যালার্ম')} · ${a.days?.length ? (a.days.length === 7 ? 'প্রতিদিন' : a.days.map((d) => DAYS[d]).join(', ')) : 'একবার' + (a.date ? ' — ' + dateLabel(a.date + 'T00:00') : '')}${a.snoozeAt ? ' · স্নুজ ' + timeLabel(a.snoozeAt) : ''}</div></button>
      <label class="switch"><input type="checkbox" data-on="${a.id}" ${a.enabled ? 'checked' : ''} aria-label="অ্যালার্ম চালু/বন্ধ"><span></span></label></div>`).join('') : empty('alarm', 'কোনো অ্যালার্ম নেই', '+ চেপে অ্যালার্ম যোগ করুন')}</div>
    ${upcoming.length ? `<h2 class="small muted">সামনের রিমাইন্ডার</h2><div class="list">${upcoming.map((u) => `<a class="item" href="${u.href}"><span class="dot" style="--c:var(--saffron)">${icon('bell')}</span><div class="grow">${esc(u.title)}<div class="xs muted">${u.kind} · ${dateLabel(u.at)} ${timeLabel(u.at)}</div></div></a>`).join('')}</div>` : ''}
    <button class="btn secondary sm" id="test">${icon('bell')} শব্দ পরীক্ষা করুন</button>`;
    el.querySelector('#perm')?.addEventListener('click', async () => { await askPermission(); draw(); });
    el.querySelectorAll('[data-on]').forEach((b) => b.onchange = async () => { const a = db.get('alarms', b.dataset.on); await db.put('alarms', { ...a, enabled: b.checked, snoozeAt: null, lastFired: b.checked ? (a.time <= hm() ? ymd() : null) : a.lastFired, date: !a.days?.length && b.checked ? nextDate(a.time) : a.date }); draw(); });
    el.querySelectorAll('[data-id]').forEach((b) => b.onclick = () => alarmForm(db.get('alarms', b.dataset.id), draw));
    el.querySelector('#test').onclick = async () => { const d = new Date(Date.now() + 5000); await db.put('alarms', { label: 'পরীক্ষা অ্যালার্ম', time: hm(d), days: [], date: ymd(d), enabled: true, test: true }); toast('এক মিনিটের মধ্যে বাজবে — এই পাতাতেই থাকুন'); draw(); };
  };
  draw();
  return { fab: [{ icon: 'plus', label: 'নতুন অ্যালার্ম', onClick: () => alarmForm({ time: hm(new Date(Date.now() + 3600e3)), days: [], enabled: true }, draw) }] };
}
const nextDate = (time) => (time > hm() ? ymd() : ymd(new Date(Date.now() + 864e5)));
function alarmForm(a, after) {
  const days = new Set(a.days || []);
  modal({ title: a.id ? 'অ্যালার্ম বদলান' : 'নতুন অ্যালার্ম',
    body: `<label class="field"><span>সময়</span><input class="input big" type="time" id="t" value="${a.time}" autofocus></label>
    <label class="field"><span>নাম (ঐচ্ছিক)</span><input class="input" id="l" value="${esc(a.label || '')}" placeholder="যেমন: ফজরের নামাজ, ওষুধ খাওয়া"></label>
    <div class="field"><span>কোন দিন (কিছু না বাছলে একবার)</span><div class="row" style="gap:4px;flex-wrap:wrap">${DAYS.map((d, i) => `<button type="button" class="chip ${days.has(i) ? 'on' : ''}" data-d="${i}" aria-pressed="${days.has(i)}">${d}</button>`).join('')}<button type="button" class="chip" data-all>প্রতিদিন</button></div></div>`,
    onMount: (el) => {
      el.querySelectorAll('[data-d]').forEach((b) => b.onclick = () => { const i = +b.dataset.d; days.has(i) ? days.delete(i) : days.add(i); b.classList.toggle('on'); b.setAttribute('aria-pressed', days.has(i)); });
      el.querySelector('[data-all]').onclick = () => { for (let i = 0; i < 7; i++) days.add(i); el.querySelectorAll('[data-d]').forEach((b) => b.classList.add('on')); };
    },
    actions: [
      ...(a.id ? [{ label: 'মুছুন', kind: 'secondary', onClick: async () => { await db.del('alarms', a.id); after(); } }] : [{ label: 'বাতিল', kind: 'secondary' }]),
      { label: 'সেভ', onClick: async (el) => { const time = el.querySelector('#t').value; if (!time) return false; const ds = [...days].sort(); askPermission(); await db.put('alarms', { ...a, time, label: el.querySelector('#l').value.trim(), days: ds, date: ds.length ? null : nextDate(time), enabled: true, snoozeAt: null, lastFired: ds.length && time <= hm() ? ymd() : null }); toast('অ্যালার্ম সেট হয়েছে'); after(); } },
    ] });
}

// ---------- notification inbox ----------
export function inbox(el) {
  const draw = () => {
    const ns = db.all('notifications').sort((a, b) => (a.at < b.at ? 1 : -1));
    el.innerHTML = `<div class="pagehead"><a class="icon-btn" href="#/" aria-label="ফিরে যান">${icon('back')}</a><h1>নোটিফিকেশন</h1>${ns.length ? `<button class="btn sm secondary" id="read">সব পড়া হয়েছে</button><button class="icon-btn" id="clr" aria-label="সব মুছুন">${icon('trash')}</button>` : ''}</div>
    <div class="list">${ns.length ? ns.map((n) => `<div class="item"><span class="dot" style="--c:${n.type === 'task' ? 'var(--accent)' : n.type === 'note' ? 'var(--saffron)' : n.type === 'budget' ? 'var(--expense)' : 'var(--info)'}">${icon(n.type === 'task' ? 'list' : n.type === 'note' ? 'note' : 'bell')}</span><div class="grow"><div style="${n.read ? '' : 'font-weight:700'}">${esc(n.title)}</div><div class="small muted">${esc(n.body)}</div><div class="xs muted">${dateLabel(n.at)} ${timeLabel(n.at)}</div></div>${n.read ? '' : '<span class="tag ok">নতুন</span>'}</div>`).join('') : empty('bell', 'কোনো নোটিফিকেশন নেই')}</div>`;
    el.querySelector('#read')?.addEventListener('click', async () => { for (const n of ns.filter((x) => !x.read)) await db.put('notifications', { ...n, read: true }); draw(); });
    el.querySelector('#clr')?.addEventListener('click', async () => { if (await confirmBox('সব নোটিফিকেশন মুছবেন?', { ok: 'মুছুন', danger: true })) { for (const n of ns) await db.del('notifications', n.id); draw(); } });
  };
  draw();
}
