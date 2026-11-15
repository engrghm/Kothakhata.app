// Reminder & alarm scheduler. Fires while the app is open (tab or installed PWA).
import * as db from './db.js';
import { modal, toast } from './ui.js';
import { esc, icon, hm, ymd, localISO, hmLabel, bn } from './util.js';
import { notify } from './model.js';

let audioCtx = null, beepTimer = null;
function startTone() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    audioCtx.resume?.();
    const ring = () => {
      const t0 = audioCtx.currentTime;
      [0, 0.25, 0.5].forEach((dt, i) => {
        const o = audioCtx.createOscillator(); const g = audioCtx.createGain();
        o.type = 'sine'; o.frequency.value = i === 1 ? 988 : 784;
        g.gain.setValueAtTime(0.0001, t0 + dt); g.gain.exponentialRampToValueAtTime(0.35, t0 + dt + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dt + 0.22);
        o.connect(g).connect(audioCtx.destination); o.start(t0 + dt); o.stop(t0 + dt + 0.24);
      });
    };
    ring(); beepTimer = setInterval(ring, 1400);
  } catch (e) { /* audio blocked until user interacts */ }
  navigator.vibrate?.([400, 200, 400, 200, 400]);
}
function stopTone() { clearInterval(beepTimer); beepTimer = null; navigator.vibrate?.(0); }

async function systemNotify(title, body, tag) {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) reg.showNotification(title, { body, tag, icon: 'icons/icon.svg', badge: 'icons/icon.svg', requireInteraction: true, vibrate: [300, 100, 300] });
    else new Notification(title, { body, tag });
  } catch {}
}
export async function askPermission() {
  if (!('Notification' in window)) { toast('এই ব্রাউজারে নোটিফিকেশন নেই'); return 'denied'; }
  if (Notification.permission === 'default') return Notification.requestPermission();
  return Notification.permission;
}

const queue = [];
let showing = false;
function ring({ title, body, kind, onSnooze, onDone }) {
  queue.push({ title, body, kind, onSnooze, onDone });
  if (!showing) next();
}
function next() {
  const r = queue.shift(); if (!r) { showing = false; return; }
  showing = true; startTone();
  systemNotify(r.title, r.body, r.kind);
  modal({
    dismissable: false,
    body: `<div class="ringing">${icon('bell', 'bell')}<div class="big-time">${bn(hm())}</div><h2 style="margin:8px 0">${esc(r.title)}</h2>${r.body ? `<p class="muted">${esc(r.body)}</p>` : ''}</div>`,
    actions: [
      { label: '১০ মিনিট পরে', kind: 'secondary', onClick: () => { stopTone(); r.onSnooze?.(10); setTimeout(next, 300); } },
      { label: r.kind === 'task' ? 'কাজ শেষ' : 'বন্ধ করুন', onClick: () => { stopTone(); r.onDone?.(); setTimeout(next, 300); } },
    ],
  });
}

const addMin = (m) => localISO(new Date(Date.now() + m * 60000));

async function tick() {
  const now = localISO();
  // tasks with reminders
  for (const t of db.all('tasks', (x) => !x.done && x.remindAt && !x.reminded && x.remindAt <= now)) {
    await db.put('tasks', { ...t, reminded: true });
    await notify('কাজের রিমাইন্ডার', t.title, 'task');
    ring({ title: t.title, body: 'কাজের সময় হয়েছে', kind: 'task',
      onSnooze: (m) => db.put('tasks', { ...db.get('tasks', t.id), remindAt: addMin(m), reminded: false }),
      onDone: () => db.put('tasks', { ...db.get('tasks', t.id), done: true, doneAt: new Date().toISOString() }) });
  }
  // note reminders
  for (const n of db.all('notes', (x) => x.remindAt && !x.reminded && x.remindAt <= now)) {
    await db.put('notes', { ...n, reminded: true });
    await notify('নোট রিমাইন্ডার', n.title || n.body.slice(0, 60), 'note');
    ring({ title: n.title || 'নোট', body: (n.body || '').slice(0, 120), kind: 'note',
      onSnooze: (m) => db.put('notes', { ...db.get('notes', n.id), remindAt: addMin(m), reminded: false }) });
  }
  // alarms
  const d = new Date(); const today = ymd(d); const time = hm(d);
  for (const a of db.all('alarms', (x) => x.enabled)) {
    const due = a.snoozeAt ? a.snoozeAt <= now : (a.time <= time && (a.days?.length ? a.days.includes(d.getDay()) : (!a.date || a.date <= today)));
    if (!due) continue;
    if (!a.snoozeAt && a.lastFired === today) continue;
    const fresh = { ...a, lastFired: today, snoozeAt: null };
    if (!a.days?.length && !a.snoozeAt) fresh.enabled = false; // one-time alarm
    await db.put('alarms', fresh);
    // missed by more than 10 minutes (app was closed): log it instead of ringing late
    const [ah, am] = a.time.split(':').map(Number);
    const late = a.snoozeAt ? 0 : (a.date && a.date < today ? 9999 : (d.getHours() * 60 + d.getMinutes()) - (ah * 60 + am));
    if (late > 10) { await notify('অ্যালার্ম মিস হয়েছে', `${a.label || 'অ্যালার্ম'} — ${hmLabel(a.time)} (তখন অ্যাপ বন্ধ ছিল)`, 'alarm'); continue; }
    ring({ title: a.label || 'অ্যালার্ম', body: hmLabel(a.time), kind: 'alarm',
      onSnooze: (m) => db.put('alarms', { ...db.get('alarms', a.id), enabled: true, snoozeAt: addMin(m) }) });
  }
}

export function startScheduler() {
  tick();
  setInterval(tick, 15000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
}
