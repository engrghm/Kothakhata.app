// Voice to text: speak (Bangla or English) → editable text; tidy, copy, download, save as note.
import * as db from '../db.js';
import { esc, icon, bn, ymd } from '../util.js';
import { toast, bindSeg } from '../ui.js';
import { dictate, voiceSupported, localRefine, aiRefine, aiKeys } from '../voice.js';
import { t as tr } from '../i18n.js';
import { go } from '../router.js';

const PUNCT = ['।', ',', '?', '!', '-', ':', ';', '"', "'", '(', ')'];
let draft = '';

export function voicepad(el, params = {}) {
  const s = db.settings();
  let vlang = s.voiceLang || 'bn-BD';
  let mode = s.voiceMode || 'refine';
  let stop = null;
  let base = '';

  el.innerHTML = `<div class="pagehead"><a class="icon-btn" href="#/more" aria-label="ফিরে যান">${icon('back')}</a><h1>ভয়েস থেকে লেখা</h1></div>
  ${voiceSupported ? '' : '<div class="card flat small c-expense">এই ব্রাউজারে ভয়েস টাইপিং নেই। Chrome বা Edge ব্যবহার করুন।</div>'}
  <section class="card" style="text-align:center">
    <div class="row" style="justify-content:center;gap:8px;flex-wrap:wrap;margin-bottom:16px">
      <div class="seg" id="vl" role="group" aria-label="কোন ভাষায় বলবেন" translate="no"><button data-v="bn-BD" class="${vlang === 'bn-BD' ? 'on' : ''}">বাংলা</button><button data-v="en-US" class="${vlang === 'en-US' ? 'on' : ''}">English</button></div>
      <div class="seg" id="vm" role="group" aria-label="লেখার ধরন"><button data-v="original" class="${mode === 'original' ? 'on' : ''}">হুবহু</button><button data-v="refine" class="${mode === 'refine' ? 'on' : ''}">গুছিয়ে</button></div>
    </div>
    <button class="mic" id="mic" style="width:88px;height:88px;margin:0 auto" aria-pressed="false" aria-label="ট্যাপ করে কথা বলুন">${icon('mic')}</button>
    <p class="small muted" id="st" style="margin:12px 0 0">ট্যাপ করে কথা বলুন</p>
  </section>
  <section class="card">
    <label class="sr" for="vt">লেখা</label>
    <textarea class="input" id="vt" style="min-height:220px;font-size:18px;line-height:1.8" placeholder="কথা বলুন, লেখা এখানে আসবে">${esc(draft)}</textarea>
    <div class="row" style="flex-wrap:wrap;gap:6px;margin-top:8px" aria-label="যতিচিহ্ন">
      ${PUNCT.map((p) => `<button type="button" class="chip" data-p="${esc(p)}" translate="no">${esc(p)}</button>`).join('')}
      <button type="button" class="chip" data-p=" ">Space</button><button type="button" class="chip" data-p="\n">Enter</button><button type="button" class="chip" data-del>⌫</button>
    </div>
    <div class="row xs muted" style="margin-top:8px"><span class="grow" id="cnt"></span></div>
    <div class="row" style="flex-wrap:wrap;gap:8px;margin-top:8px">
      <button class="btn sm" id="ref">${icon('sparkle')} গুছিয়ে দিন</button>
      <button class="btn sm secondary" id="cp">${icon('copy')} কপি</button>
      <button class="btn sm secondary" id="dl">${icon('download')} .txt নামান</button>
      <button class="btn sm secondary" id="sv">${icon('note')} নোটে সেভ</button>
      <button class="btn sm ghost" id="clr">${icon('trash')} মুছে ফেলুন</button>
    </div>
  </section>
  <p class="xs muted">${aiKeys().length ? 'গুছিয়ে দিতে আপনার Gemini key ব্যবহার হবে।' : 'গুছিয়ে দেওয়া এখন সাধারণভাবে হবে। AI দিয়ে আরও ভালো করতে সেটিংসে নিজের Gemini key দিন।'}</p>`;

  const ta = el.querySelector('#vt'), mic = el.querySelector('#mic'), st = el.querySelector('#st'), cnt = el.querySelector('#cnt');
  const count = () => { draft = ta.value; const w = ta.value.trim() ? ta.value.trim().split(/\s+/).length : 0; cnt.textContent = `${bn(w)} শব্দ · ${bn(ta.value.length)} অক্ষর`; };
  count();
  ta.addEventListener('input', count);
  bindSeg(el.querySelector('#vl'), (v) => { vlang = v; db.saveSettings({ voiceLang: v }); });
  bindSeg(el.querySelector('#vm'), (v) => { mode = v; db.saveSettings({ voiceMode: v }); });

  const insert = (txt) => {
    const a = ta.selectionStart ?? ta.value.length, b = ta.selectionEnd ?? a;
    ta.value = ta.value.slice(0, a) + txt + ta.value.slice(b);
    ta.selectionStart = ta.selectionEnd = a + txt.length;
    ta.focus(); count();
  };
  el.querySelectorAll('[data-p]').forEach((b) => b.onclick = () => insert(b.dataset.p === ' ' || b.dataset.p === '\n' ? b.dataset.p : b.dataset.p + (/[(\"']/.test(b.dataset.p) ? '' : ' ')));
  el.querySelector('[data-del]').onclick = () => { const a = ta.selectionStart; if (a > 0) { ta.value = ta.value.slice(0, a - 1) + ta.value.slice(ta.selectionEnd); ta.selectionStart = ta.selectionEnd = a - 1; } ta.focus(); count(); };

  const setLive = (on) => { mic.classList.toggle('live', on); mic.setAttribute('aria-pressed', String(on)); st.textContent = tr(on ? 'শুনছি… থামাতে আবার চাপুন' : 'ট্যাপ করে কথা বলুন'); };
  async function finish(spoken) {
    if (!spoken) return;
    let out = spoken;
    if (mode === 'refine') { st.textContent = tr('গোছানো হচ্ছে…'); try { out = await aiRefine(spoken, 'note'); } catch (e) { toast(e.message); out = localRefine(spoken); } }
    else out = spoken.trim();
    ta.value = base + out; count();
    st.textContent = tr('ট্যাপ করে কথা বলুন');
    if (db.settings().autoCopy && navigator.clipboard) navigator.clipboard.writeText(ta.value).catch(() => {});
  }
  mic.onclick = () => {
    if (stop) { stop(); stop = null; return; }
    if (!voiceSupported) { toast(tr('ভয়েস টাইপিং-এর জন্য Chrome বা Edge লাগবে')); return; }
    base = ta.value ? ta.value.replace(/\s*$/, '') + (ta.value.trim() ? '\n' : '') : '';
    setLive(true);
    stop = dictate({
      lang: vlang,
      onText: (done, live) => { ta.value = base + [done, live].filter(Boolean).join(' '); ta.scrollTop = ta.scrollHeight; count(); },
      onError: (m) => toast(m, 4000),
      onEnd: (all) => { stop = null; setLive(false); finish(all); },
    });
  };

  el.querySelector('#ref').onclick = async () => {
    if (!ta.value.trim()) { toast(tr('কিছু লেখা নেই')); return; }
    st.textContent = tr('গোছানো হচ্ছে…');
    try { ta.value = await aiRefine(ta.value, 'note'); } catch (e) { toast(e.message); ta.value = localRefine(ta.value); }
    count(); st.textContent = tr('ট্যাপ করে কথা বলুন'); toast(tr('গোছানো হয়েছে'));
  };
  el.querySelector('#cp').onclick = () => { if (!ta.value.trim()) return toast(tr('কিছু লেখা নেই')); navigator.clipboard?.writeText(ta.value).then(() => toast(tr('কপি হয়েছে'))); };
  el.querySelector('#dl').onclick = () => {
    if (!ta.value.trim()) return toast(tr('কিছু লেখা নেই'));
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([ta.value], { type: 'text/plain;charset=utf-8' })); a.download = `kothakhata-voice-${ymd()}.txt`; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };
  el.querySelector('#sv').onclick = async () => {
    const body = ta.value.trim(); if (!body) return toast(tr('কিছু লেখা নেই'));
    const serial = Math.max(0, ...db.all('notes').map((x) => x.serial || 0)) + 1;
    const n = await db.put('notes', { serial, title: '', body, color: '', pinned: false });
    draft = ''; toast(tr('নোটে সেভ হয়েছে')); go('#/note/' + n.id);
  };
  el.querySelector('#clr').onclick = () => { ta.value = ''; count(); ta.focus(); };

  // stop listening when leaving the screen
  const onLeave = () => { if (stop) { stop(); stop = null; } removeEventListener('hashchange', onLeave); };
  addEventListener('hashchange', onLeave);
  if (params.start === '1' && voiceSupported) setTimeout(() => mic.click(), 300);
}
