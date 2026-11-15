// More (tools + books), settings, PIN lock, backup.
import * as db from '../db.js';
import * as M from '../model.js';
import { esc, icon, bn, money, ymd } from '../util.js';
import { modal, confirmBox, toast, empty, bindSeg } from '../ui.js';
import { voiceSupported, aiKeys } from '../voice.js';
import { askPermission } from '../reminders.js';
import { go } from '../router.js';
import { t as tr } from '../i18n.js';

const tool = (href, ic, label, color) => `<a class="tool" href="${href}"><span class="dot" style="background:${color}">${icon(ic)}</span>${label}</a>`;

export function more(el) {
  const draw = () => {
    const s = db.settings();
    const books = db.all('books').sort((a, b) => (a.kind === 'personal' ? -1 : 1) - (b.kind === 'personal' ? -1 : 1));
    el.innerHTML = `<a class="card row" href="#/voice" style="text-decoration:none;color:inherit;background:var(--saffron-soft)"><span class="mic" style="width:48px;height:48px">${icon('mic')}</span><div class="grow"><b>ভয়েস থেকে লেখা</b><div class="small muted">বাংলা বা ইংরেজিতে বলুন — লেখা হয়ে যাবে। কপি করুন, নামান বা নোটে রাখুন।</div></div>${icon('right')}</a>
    <div class="tools" style="margin-bottom:16px">
      ${tool('#/voice', 'mic', 'ভয়েস থেকে লেখা', '#b45309')}${s.walletsOff ? '' : tool('#/wallets', 'wallet', 'ওয়ালেট', '#13803d')}${tool('#/stats', 'chart', 'বিশ্লেষণ', '#1d5fa8')}${tool('#/report', 'file', 'রিপোর্ট / PDF', '#0d6b5e')}
      ${tool('#/categories', 'tag', 'ক্যাটাগরি', '#7c3aed')}${tool('#/quick', 'bolt', 'কুইক এন্ট্রি', '#b45309')}${tool('#/recurring', 'repeat', 'নিয়মিত লেনদেন', '#0e7490')}
      ${tool('#/alarms', 'alarm', 'অ্যালার্ম', '#c2352b')}${tool('#/inbox', 'bell', 'নোটিফিকেশন', '#be185d')}${tool('#/settings', 'gear', 'সেটিংস', '#4d5b57')}
    </div>
    <div class="card flat row"><span class="grow">${icon('eye')} প্রাইভেসি মোড (টাকা ঝাপসা)</span><label class="switch"><input type="checkbox" id="pv" ${s.privacy ? 'checked' : ''} aria-label="প্রাইভেসি মোড"><span></span></label></div>
    <div class="row" style="margin:16px 0 8px"><h2 class="grow small" style="margin:0">খাতাসমূহ <span class="tag">${bn(books.length)}</span></h2><button class="btn sm secondary" id="addb">${icon('plus')} নতুন খাতা</button></div>
    <p class="xs muted" style="margin-top:0">ব্যক্তিগত, পরিবার, দোকান, অফিস — আলাদা খাতায় আলাদা হিসাব। কাজ, নোট আর অ্যালার্ম সব খাতায় একই থাকে।</p>
    <div class="list">${books.map((b) => { const on = b.id === s.activeBookId; return `<div class="item" style="${on ? 'background:var(--accent-soft)' : ''}"><button class="grow row" data-b="${b.id}" style="background:none;border:0;text-align:left;cursor:pointer;padding:0"><span class="dot" style="background:${on ? 'var(--accent)' : 'var(--border-input)'}">${on ? icon('check') : icon('book')}</span><div class="grow"><div style="${on ? 'font-weight:700;color:var(--accent)' : ''}">${esc(b.name)}</div><div class="xs muted">${b.kind === 'personal' ? 'মূল খাতা' : 'অতিরিক্ত খাতা'}</div></div></button><button class="icon-btn" data-eb="${b.id}" aria-label="খাতা বদলান">${icon('edit')}</button></div>`; }).join('')}</div>
    <p class="xs muted" style="text-align:center;margin-top:24px">কথাখাতা · সব তথ্য শুধু এই ডিভাইসে থাকে · সেটিংস থেকে নিয়মিত ব্যাকআপ নিন · <a href="privacy.html">গোপনীয়তা নীতি</a></p>`;
    el.querySelector('#pv').onchange = async (e) => { await db.saveSettings({ privacy: e.target.checked }); document.body.classList.toggle('privacy', e.target.checked); };
    el.querySelectorAll('[data-b]').forEach((b) => b.onclick = async () => { await db.saveSettings({ activeBookId: b.dataset.b }); toast(`খাতা: ${db.get('books', b.dataset.b).name}`); go('#/'); });
    el.querySelectorAll('[data-eb]').forEach((b) => b.onclick = () => bookForm(db.get('books', b.dataset.eb), draw));
    el.querySelector('#addb').onclick = () => bookForm({ kind: 'extra' }, draw);
  };
  draw();
}
export function bookForm(b, after) {
  modal({ title: b.id ? 'খাতা বদলান' : 'নতুন খাতা',
    body: `<label class="field"><span>খাতার নাম</span><input class="input" id="n" value="${esc(b.name || '')}" placeholder="যেমন: পরিবার, দোকান" autofocus></label>`,
    actions: [
      ...(b.id && b.kind !== 'personal' ? [{ label: 'মুছুন', kind: 'secondary', onClick: async () => {
        if (!(await confirmBox(`“${b.name}” খাতা ও এর সব হিসাব মুছে যাবে। ফেরত আনা যাবে না। মুছবেন?`, { ok: 'মুছুন', danger: true }))) return false;
        for (const s of ['categories', 'wallets', 'txns', 'recurring', 'quick', 'budgets', 'savings', 'people']) for (const r of db.all(s, (x) => x.bookId === b.id)) await db.del(s, r.id);
        await db.del('books', b.id);
        if (db.settings().activeBookId === b.id) await db.saveSettings({ activeBookId: db.all('books')[0]?.id });
        after?.();
      } }] : [{ label: 'বাতিল', kind: 'secondary' }]),
      { label: 'সেভ', onClick: async (el) => { const name = el.querySelector('#n').value.trim(); if (!name) { toast('নাম লিখুন'); return false; } const r = await db.put('books', { ...b, name }); if (!b.id) await M.seedBook(r.id); after?.(); } },
    ] });
}

async function sha(s) { const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('dinsathi:' + s)); return [...new Uint8Array(h)].map((x) => x.toString(16).padStart(2, '0')).join(''); }

export function settingsScreen(el) {
  const draw = () => {
    const s = db.settings();
    const keys = aiKeys();
    const cur = Math.min(s.aiKeyIdx || 0, Math.max(keys.length - 1, 0));
    el.innerHTML = `<div class="pagehead"><a class="icon-btn" href="#/more" aria-label="ফিরে যান">${icon('back')}</a><h1>সেটিংস</h1></div>
    <section class="card"><h2 class="small muted" style="margin-top:0">অ্যাপের ভাষা</h2><div class="seg" id="ln" translate="no"><button data-v="bn" class="${(s.lang || 'bn') === 'bn' ? 'on' : ''}">বাংলা</button><button data-v="en" class="${s.lang === 'en' ? 'on' : ''}">English</button></div></section>
    <section class="card"><h2 class="small muted" style="margin-top:0">থিম</h2><div class="seg" id="th">${['system:ডিভাইস অনুযায়ী', 'light:লাইট', 'dark:ডার্ক'].map((x) => { const [v, l] = x.split(':'); return `<button data-v="${v}" class="${(s.theme || 'system') === v ? 'on' : ''}">${l}</button>`; }).join('')}</div></section>
    <section class="card"><h2 class="small muted" style="margin-top:0">${icon('mic')} ভয়েস</h2>
      ${voiceSupported ? '' : '<p class="small c-expense">এই ব্রাউজারে ভয়েস টাইপিং নেই। Chrome বা Edge ব্যবহার করুন।</p>'}
      <div class="field"><span>কোন ভাষায় বলবেন</span><div class="seg" id="vl"><button data-v="bn-BD" class="${(s.voiceLang || 'bn-BD') === 'bn-BD' ? 'on' : ''}">বাংলা</button><button data-v="en-US" class="${s.voiceLang === 'en-US' ? 'on' : ''}">English</button></div></div>
      <div class="field"><span>নোট/কাজে বলা লেখা</span><div class="seg" id="vm"><button data-v="original" class="${s.voiceMode === 'original' ? 'on' : ''}">হুবহু</button><button data-v="refine" class="${(s.voiceMode || 'refine') === 'refine' ? 'on' : ''}">গুছিয়ে</button></div></div>
      <div class="row" style="margin-bottom:12px"><span class="grow small">বলা শেষে লেখা নিজে থেকে কপি</span><label class="switch"><input type="checkbox" id="ac" ${s.autoCopy ? 'checked' : ''} aria-label="অটো কপি"><span></span></label></div>
      <div class="field"><span>AI দিয়ে গোছানো (ঐচ্ছিক): আপনার নিজের Google Gemini API key</span>
        ${keys.map((k, i) => `<div class="row" style="margin-bottom:8px"><span class="grow small" translate="no">${bn(i + 1)}. ••••••${esc(k.slice(-4))}</span>${i === cur && keys.length > 1 ? '<span class="tag ok">এখন চলছে</span>' : ''}<button class="icon-btn" data-kd="${i}" aria-label="key মুছুন">${icon('trash')}</button></div>`).join('')}
        <div class="row" style="gap:8px"><input class="input grow" id="ak" type="password" autocomplete="off" aria-label="নতুন Gemini API key" placeholder="${keys.length ? 'আরেকটা key এখানে দিন' : 'key এখানে দিন'}"><button class="btn" id="aks">key যোগ করুন</button></div></div>
      <p class="xs muted" style="margin-top:-6px">একাধিক key রাখা যায়। একটার লিমিট শেষ হলে পরেরটা নিজে থেকে চলবে। key শুধু এই ডিভাইসে থাকে, সরাসরি Google-এর অফিসিয়াল API-তে যায়। key না দিলে অ্যাপ নিজেই সাধারণভাবে গুছিয়ে দেবে। key পাবেন aistudio.google.com থেকে।</p></section>
    <section class="card"><h2 class="small muted" style="margin-top:0">${icon('wallet')} ওয়ালেট</h2>
      <div class="row"><span class="grow">ওয়ালেট ব্যবহার করব</span><label class="switch"><input type="checkbox" id="wo" ${s.walletsOff ? '' : 'checked'} aria-label="ওয়ালেট ব্যবহার"><span></span></label></div>
      <p class="xs muted" style="margin-bottom:0">বন্ধ রাখলে এন্ট্রির ফর্মে ওয়ালেট আর ট্রান্সফার দেখাবে না। আগের তথ্য মুছবে না, আবার চালু করলে ফিরে আসবে।</p></section>
    <section class="card"><h2 class="small muted" style="margin-top:0">${icon('lock')} নিরাপত্তা</h2>
      <div class="row"><span class="grow">পিন লক ${s.pinHash ? '<span class="tag ok">চালু</span>' : ''}</span><button class="btn sm secondary" id="pin">${s.pinHash ? 'পিন বন্ধ করুন' : 'পিন সেট করুন'}</button></div>
      <div class="row" style="margin-top:12px"><span class="grow">নোটিফিকেশন</span><button class="btn sm secondary" id="np">${'Notification' in window && Notification.permission === 'granted' ? 'চালু আছে' : 'অনুমতি দিন'}</button></div></section>
    <section class="card"><h2 class="small muted" style="margin-top:0">${icon('file')} রিপোর্টের তথ্য (PDF-এর মাথায়)</h2>
      <label class="field"><span>নাম / প্রতিষ্ঠান</span><input class="input" id="rn" value="${esc(s.reportName || '')}"></label>
      <label class="field"><span>ছোট লাইন</span><input class="input" id="rs" value="${esc(s.reportSub || '')}"></label>
      <div class="row" style="gap:8px"><label class="field grow"><span>ফোন</span><input class="input" id="rp" value="${esc(s.reportPhone || '')}"></label><label class="field grow"><span>ঠিকানা</span><input class="input" id="ra" value="${esc(s.reportAddress || '')}"></label></div>
      <label class="field"><span>স্বাক্ষরকারীর নাম</span><input class="input" id="rg" value="${esc(s.reportSigner || '')}"></label>
      <div class="row" style="gap:8px;flex-wrap:wrap"><label class="btn sm secondary">${icon('upload')} লোগো<input type="file" accept="image/*" id="rl" hidden></label><label class="btn sm secondary">${icon('upload')} স্বাক্ষর<input type="file" accept="image/*" id="rsg" hidden></label>${s.reportLogo ? '<span class="tag ok">লোগো আছে</span>' : ''}${s.reportSign ? '<span class="tag ok">স্বাক্ষর আছে</span>' : ''}</div>
      <button class="btn sm" id="rsave" style="margin-top:12px">সেভ</button></section>
    <section class="card"><h2 class="small muted" style="margin-top:0">${icon('download')} ব্যাকআপ</h2>
      <p class="small muted">সব তথ্য এই ব্রাউজারে থাকে। ব্রাউজারের ডেটা মুছলে হিসাবও মুছে যাবে — তাই মাঝে মাঝে ব্যাকআপ ফাইল নামিয়ে রাখুন।</p>${s.lastBackup ? `<p class="small muted">শেষ ব্যাকআপ: ${bn(s.lastBackup)}</p>` : ''}
      <div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn sm" id="exp">${icon('download')} ব্যাকআপ নামান</button><label class="btn sm secondary">${icon('upload')} ব্যাকআপ থেকে ফেরত<input type="file" accept="application/json,.json" id="imp" hidden></label><button class="btn sm ghost" id="csv">CSV (এক্সেল)</button></div></section>
    <section class="card"><button class="btn danger sm" id="wipe">${icon('trash')} সব তথ্য মুছে নতুন করে শুরু</button></section>`;
    bindSeg(el.querySelector('#ln'), (v) => { if (v !== (db.settings().lang || 'bn')) dispatchEvent(new CustomEvent('ds:lang', { detail: v })); });
    bindSeg(el.querySelector('#th'), async (v) => { await db.saveSettings({ theme: v }); applyTheme(); });
    bindSeg(el.querySelector('#vl'), (v) => db.saveSettings({ voiceLang: v }));
    bindSeg(el.querySelector('#vm'), (v) => db.saveSettings({ voiceMode: v }));
    el.querySelector('#ac').onchange = (e) => db.saveSettings({ autoCopy: e.target.checked });
    el.querySelector('#aks').onclick = async () => {
      const k = el.querySelector('#ak').value.trim();
      if (!k) { toast('key লিখুন'); return; }
      if (keys.includes(k)) { toast('এই key আগেই যোগ করা আছে'); return; }
      await db.saveSettings({ aiKeys: [...keys, k], aiKey: '' }); toast('key সেভ হয়েছে'); draw();
    };
    el.querySelectorAll('[data-kd]').forEach((b) => b.onclick = async () => { await db.saveSettings({ aiKeys: keys.filter((_, i) => i !== +b.dataset.kd), aiKey: '', aiKeyIdx: 0 }); toast('key মুছে ফেলা হয়েছে'); draw(); });
    el.querySelector('#wo').onchange = async (e) => { await db.saveSettings({ walletsOff: !e.target.checked }); toast(e.target.checked ? 'ওয়ালেট চালু' : 'ওয়ালেট বন্ধ'); };
    el.querySelector('#np').onclick = async () => { const p = await askPermission(); toast(p === 'granted' ? 'নোটিফিকেশন চালু' : 'অনুমতি পাওয়া যায়নি'); draw(); };
    el.querySelector('#pin').onclick = async () => {
      if (s.pinHash) { if (await confirmBox('পিন লক বন্ধ করবেন?')) { await db.saveSettings({ pinHash: '' }); draw(); } return; }
      modal({ title: 'নতুন পিন (৪ সংখ্যা)', body: `<label class="field"><span>পিন</span><input class="input big" id="p1" inputmode="numeric" maxlength="4" type="password" autofocus></label><label class="field"><span>আবার লিখুন</span><input class="input big" id="p2" inputmode="numeric" maxlength="4" type="password"></label><p class="xs muted">পিন ভুলে গেলে ফেরত পাওয়ার উপায় নেই — তার আগে ব্যাকআপ নিয়ে রাখুন।</p>`,
        actions: [{ label: 'বাতিল', kind: 'secondary' }, { label: 'সেভ', onClick: async (m) => { const a = m.querySelector('#p1').value, b = m.querySelector('#p2').value; if (!/^\d{4}$/.test(a)) { toast('৪টি সংখ্যা দিন'); return false; } if (a !== b) { toast('দুইবার একই পিন দিন'); return false; } await db.saveSettings({ pinHash: await sha(a) }); toast('পিন লক চালু'); draw(); } }] });
    };
    const readImg = (input, key) => input.onchange = () => { const f = input.files[0]; if (!f) return; if (f.size > 400000) { toast('ছবিটা ৪০০KB-এর ছোট দিন'); return; } const r = new FileReader(); r.onload = async () => { await db.saveSettings({ [key]: r.result }); toast('সেভ হয়েছে'); draw(); }; r.readAsDataURL(f); };
    readImg(el.querySelector('#rl'), 'reportLogo'); readImg(el.querySelector('#rsg'), 'reportSign');
    el.querySelector('#rsave').onclick = async () => { await db.saveSettings({ reportName: el.querySelector('#rn').value.trim(), reportSub: el.querySelector('#rs').value.trim(), reportPhone: el.querySelector('#rp').value.trim(), reportAddress: el.querySelector('#ra').value.trim(), reportSigner: el.querySelector('#rg').value.trim() }); toast('সেভ হয়েছে'); };
    el.querySelector('#exp').onclick = async () => { download(`kothakhata-backup-${ymd()}.json`, JSON.stringify(db.exportAll(), null, 1), 'application/json'); await db.saveSettings({ lastBackup: ymd() }); draw(); };
    el.querySelector('#csv').onclick = () => {
      const rows = [['তারিখ', 'ধরন', 'ক্যাটাগরি', 'ওয়ালেট', 'টাকা', 'বিবরণ'].map(tr)];
      for (const t of M.txns().reverse()) rows.push([t.at.replace('T', ' '), tr(t.kind === 'income' ? 'আয়' : t.kind === 'expense' ? 'খরচ' : 'ট্রান্সফার'), tr(M.catById(t.categoryId)?.name || ''), tr(db.get('wallets', t.walletId)?.name || ''), (t.amount / 100).toFixed(2), t.note || '']);
      download(`kothakhata-${ymd()}.csv`, '﻿' + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n'), 'text/csv');
    };
    el.querySelector('#imp').onchange = async (e) => { const f = e.target.files[0]; if (!f) return; if (!(await confirmBox('এখনকার সব তথ্য মুছে ব্যাকআপের তথ্য বসবে। চালিয়ে যাবেন?', { ok: 'হ্যাঁ, ফেরত আনুন', danger: true }))) return; try { await db.importAll(JSON.parse(await f.text())); await M.ensureSeed(); toast('ব্যাকআপ থেকে ফেরত আনা হয়েছে'); go('#/'); } catch (err) { toast(err.message || 'ফাইলটা পড়া যায়নি'); } };
    el.querySelector('#wipe').onclick = async () => { if (await confirmBox('সব হিসাব, কাজ, নোট, অ্যালার্ম মুছে যাবে। ফেরত আনা যাবে না। নিশ্চিত?', { ok: 'সব মুছুন', danger: true })) { await db.clearAll(); await M.ensureSeed(); toast('নতুন করে শুরু হলো'); go('#/'); } };
  };
  draw();
}
function download(name, text, type) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }

export function applyTheme() {
  const t = db.settings().theme || 'system';
  if (t === 'system') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t);
  document.body.classList.toggle('privacy', !!db.settings().privacy);
}

export function lockScreen() {
  return new Promise((resolve) => {
    const s = db.settings(); if (!s.pinHash) return resolve();
    let pin = '';
    const box = document.createElement('div'); box.className = 'lock';
    const paint = () => { box.innerHTML = `<div style="text-align:center"><img src="icons/icon.svg" alt="" width="64" height="64"><h1 style="font-size:20px">কথাখাতা</h1><p class="muted small">পিন দিন</p><div class="pin-dots" aria-live="polite" aria-label="${pin.length} সংখ্যা দেওয়া হয়েছে">${[0, 1, 2, 3].map((i) => `<i class="${i < pin.length ? 'on' : ''}"></i>`).join('')}</div>
      <div class="pin-pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map((k) => k === '' ? '<span></span>' : `<button type="button" data-k="${k}" aria-label="${k === '⌫' ? 'মুছুন' : k}">${k === '⌫' ? k : bn(k)}</button>`).join('')}</div></div>`;
      box.querySelectorAll('[data-k]').forEach((b) => b.onclick = () => press(b.dataset.k)); };
    const press = async (k) => {
      if (k === '⌫') pin = pin.slice(0, -1); else if (pin.length < 4) pin += k;
      paint();
      if (pin.length === 4) { if ((await sha(pin)) === s.pinHash) { box.remove(); document.removeEventListener('keydown', onKey); resolve(); } else { pin = ''; paint(); box.querySelector('.pin-dots').classList.add('shake'); toast('ভুল পিন'); } }
    };
    const onKey = (e) => { if (/^\d$/.test(e.key)) press(e.key); else if (e.key === 'Backspace') press('⌫'); };
    document.addEventListener('keydown', onKey);
    paint(); document.body.append(box);
  });
}
