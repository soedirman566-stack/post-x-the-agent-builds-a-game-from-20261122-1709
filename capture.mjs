/* capture.mjs — frame-by-frame capture of the video scenes.
   Drives headless Chromium over CDP: each page exposes window.__advance(dt),
   so the capture is deterministic — advance 1/30s, screenshot, repeat. */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const ROOT = new URL('.', import.meta.url).pathname;
const FPS = 30;
const scene = process.argv[2];
const seconds = parseFloat(process.argv[3] || '4');
const seed = process.argv[4] || '20261122';
const SCENES = {
  prompt: ROOT + 'scenes/prompt.html',
  editor: ROOT + 'scenes/editor.html',
  game: ROOT + 'game/neon-serpent.html?capture=1&seed=' + seed,
};
if (!SCENES[scene]) { console.error('unknown scene', scene); process.exit(1); }
const outDir = ROOT + 'frames/' + scene;
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const CHROME = process.env.CHROME_BIN ||
  '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1148/chrome-linux/headless_shell';
const chrome = spawn(CHROME, [
  '--headless', '--no-sandbox', '--remote-debugging-port=9333',
  '--user-data-dir=/tmp/xgame-profile-' + scene,
  '--window-size=1920,1080', '--hide-scrollbars', '--force-device-scale-factor=1',
  '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--font-render-hinting=none', 'about:blank',
], { stdio: 'ignore' });

async function wsUrl() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch('http://127.0.0.1:9333/json/version');
      const j = await r.json();
      if (j.webSocketDebuggerUrl) return j.webSocketDebuggerUrl;
    } catch (e) { /* not up yet */ }
    await sleep(250);
  }
  throw new Error('chromium did not start');
}

const ws = new WebSocket(await wsUrl());
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let msgId = 0;
const pending = new Map();
const events = [];
ws.onmessage = ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  else events.push(m);
};
function send(method, params = {}, sessionId) {
  const id = ++msgId;
  return new Promise(res => {
    pending.set(id, res);
    ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
}
async function waitEvent(method, sessionId, timeout = 15000) {
  const t0 = Date.now();
  for (;;) {
    const i = events.findIndex(e => e.method === method && e.sessionId === sessionId);
    if (i >= 0) return events.splice(i, 1)[0];
    if (Date.now() - t0 > timeout) throw new Error('timeout waiting ' + method);
    await sleep(30);
  }
}

const { result: { targetId } } = await send('Target.createTarget', { url: 'about:blank' });
const { result: { sessionId } } = await send('Target.attachToTarget', { targetId, flatten: true });
await send('Page.enable', {}, sessionId);
await send('Runtime.enable', {}, sessionId);
await send('Page.navigate', { url: 'file://' + SCENES[scene] }, sessionId);
await waitEvent('Page.loadEventFired', sessionId);
await sleep(150);

if (scene === 'editor') {
  const code = readFileSync(ROOT + 'game/neon-serpent.html', 'utf8');
  await send('Runtime.evaluate', {
    expression: 'window.__setCode(' + JSON.stringify(code) + ')',
  }, sessionId);
}
async function evaluate(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true }, sessionId);
  if (r.result && r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails));
  return r.result && r.result.result ? r.result.result.value : undefined;
}

const frames = Math.round(seconds * FPS);
for (let f = 0; f < frames; f++) {
  await evaluate('window.__advance(' + (1 / FPS) + ')');
  const shot = await send('Page.captureScreenshot',
    { format: 'jpeg', quality: 84, fromSurface: true }, sessionId);
  writeFileSync(outDir + '/f' + String(f).padStart(4, '0') + '.jpg',
    Buffer.from(shot.result.data, 'base64'));
  if (scene === 'game' && f % 150 === 0) {
    console.log('frame', f, JSON.stringify(await evaluate('window.__state()')));
  }
}
console.log('captured', frames, 'frames of', scene, '->', outDir);
ws.close(); chrome.kill('SIGKILL');
process.exit(0);
