// UI primitives: modal, confirm, toast, empty state, mic button.
import { esc, icon, COLORS } from './util.js';
import { listen, voiceSupported, localRefine, aiRefine } from './voice.js';
import * as db from './db.js';

export function toast(msg, ms = 2600) {
  let box = document.querySelector('.toasts');
  if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite'); document.body.append(box); }
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; box.append(t);
  setTimeout(() => t.remove(), ms);
}

// modal({title, body(html), onMount(el, close), actions:[{label, kind, onClick(el, close) -> false to keep open}]})
export function modal({ title, body = '', onMount, actions = [], wide = false, dismissable = true }) {
  const prev = document.activeElement;
  const scrim = document.createElement('div');
  scrim.className = 'scrim';
  scrim.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title || '')}" ${wide ? 'style="max-width:620px"' : ''}>
    ${title ? `<h2>${esc(title)}</h2>` : ''}<div class="m-body">${body}</div>
    ${actions.length ? `<div class="actions">${actions.map((a, i) => `<button type="button" class="btn ${a.kind || ''}" data-i="${i}">${esc(a.label)}</button>`).join('')}</div>` : ''}
  </div>`;
  const el = scrim.querySelector('.modal');
  const close = () => { scrim.remove(); document.removeEventListener('keydown', onKey); prev?.focus?.(); };
  const onKey = (e) => { if (e.key === 'Escape' && dismissable) close(); };
  document.addEventListener('keydown', onKey);
  if (dismissable) scrim.addEventListener('mousedown', (e) => { if (e.target === scrim) close(); });
  scrim.querySelectorAll('.actions button').forEach((b) => b.addEventListener('click', async () => {
    const a = actions[+b.dataset.i];
    if (a.onClick) { const r = await a.onClick(el, close); if (r === false) return; }
    close();
  }));
  document.body.append(scrim);
  onMount?.(el, close);
  (el.querySelector('[autofocus]') || el.querySelector('input, select, textarea, button'))?.focus();
  return { el, close };
}

export function confirmBox(msg, { ok = 'হ্যাঁ', danger = false } = {}) {
  return new Promise((res) => {
    modal({ title: msg, actions: [{ label: 'না', kind: 'secondary', onClick: () => res(false) }, { label: ok, kind: danger ? 'danger' : '', onClick: () => res(true) }] });
  });
}

export const empty = (ic, title, hint = '') => `<div class="empty">${icon(ic)}<b>${esc(title)}</b>${hint ? `<div class="small">${esc(hint)}</div>` : ''}</div>`;

export const swatches = (sel) => `<div class="swatches" role="radiogroup" aria-label="রং">${COLORS.map((c) => `<button type="button" role="radio" aria-checked="${c === sel}" aria-label="রং ${c}" class="${c === sel ? 'on' : ''}" data-color="${c}" style="background:${c}"></button>`).join('')}</div>`;
export function bindSwatches(el, onPick) {
  el.querySelectorAll('[data-color]').forEach((b) => b.addEventListener('click', () => {
    el.querySelectorAll('[data-color]').forEach((x) => { x.classList.remove('on'); x.setAttribute('aria-checked', 'false'); });
    b.classList.add('on'); b.setAttribute('aria-checked', 'true'); onPick(b.dataset.color);
  }));
}
export function bindSeg(el, onPick) {
  el.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
    el.querySelectorAll('button').forEach((x) => { x.classList.remove('on'); x.setAttribute('aria-pressed', 'false'); });
    b.classList.add('on'); b.setAttribute('aria-pressed', 'true'); onPick(b.dataset.v);
  }));
}

// A small mic button that dictates into a text field. mode: 'original' | 'refine'
export function micFor(button, target, { purpose = 'note', append = true } = {}) {
  if (!voiceSupported) { button.title = 'এই ব্রাউজারে ভয়েস টাইপিং নেই'; }
  let stop = null;
  button.addEventListener('click', () => {
    if (stop) { stop(); return; }
    if (!voiceSupported) { toast('ভয়েস টাইপিং-এর জন্য Chrome বা Edge লাগবে'); return; }
    const before = target.value;
    button.classList.add('live'); button.setAttribute('aria-pressed', 'true');
    stop = listen({
      onInterim: (t) => { target.value = (append && before ? before + ' ' : '') + t; },
      onFinal: async (t) => {
        const mode = db.settings().voiceMode || 'refine';
        let out = t;
        if (mode === 'refine') { try { out = await aiRefine(t, purpose); } catch (e) { toast(e.message); out = localRefine(t); } }
        target.value = (append && before ? before + (purpose === 'note' ? '\n' : ' ') : '') + out;
        target.dispatchEvent(new Event('input', { bubbles: true }));
        if (db.settings().autoCopy && navigator.clipboard) navigator.clipboard.writeText(out).catch(() => {});
      },
      onError: (m) => toast(m, 4000),
      onEnd: () => { stop = null; button.classList.remove('live'); button.setAttribute('aria-pressed', 'false'); },
    });
  });
}
export const micBtn = (label = 'বলে লিখুন') => `<button type="button" class="mic-sm" data-mic aria-pressed="false" aria-label="${esc(label)}" title="${esc(label)}">${icon('mic')}</button>`;
