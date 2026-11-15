// Tiny hash router.
const routes = [];
let onRoute = () => {};
export function route(pattern, handler) {
  const keys = [];
  const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
  routes.push({ re, keys, handler, pattern });
}
export function current() {
  const h = location.hash.slice(1) || '/';
  const [path, qs] = h.split('?');
  const params = Object.fromEntries(new URLSearchParams(qs || ''));
  for (const r of routes) { const m = path.match(r.re); if (m) return { ...r, path, args: m.slice(1).map(decodeURIComponent), params }; }
  return { ...routes[0], path: '/', args: [], params };
}
export const go = (hash) => { if (location.hash === hash) onRoute(current()); else location.hash = hash; };
export function start(fn) { onRoute = fn; addEventListener('hashchange', () => fn(current())); fn(current()); }
