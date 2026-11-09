// Minimal Chrome DevTools Protocol driver shared by the test scripts.
export async function connect(port = 9333) {
  for (let i = 0; i < 20; i += 1) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = targets.find((t) => t.type === 'page');
      const ws = new WebSocket(page.webSocketDebuggerUrl);
      let id = 0; const pending = new Map(); const events = [];
      ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } else if (m.method) events.push(m); };
      await new Promise((r) => (ws.onopen = r));
      const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, (m) => r(m.result ?? m)); ws.send(JSON.stringify({ id: i, method, params })); });
      const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.value;
      return { send, evaluate, events, close: () => ws.close() };
    } catch { await new Promise((r) => setTimeout(r, 500)); }
  }
  throw new Error('Chrome not reachable');
}
export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
