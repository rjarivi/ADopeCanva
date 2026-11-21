/**
 * AdopeCanva Studio — service worker for the HyperFrames Studio embed.
 *
 * Implements the @hyperframes/studio-server REST contract the embedded
 * Studio app expects. All project state and parser-heavy logic is relayed
 * to the embedding page (studio.html) over MessageChannel — the SW stays
 * a thin transport. Vite serves this file verbatim from /public.
 */
const HANDLED = /^\/api\/projects(\/.*)?$/;
let relaySeq = 0;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

async function relayToPage(request) {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  const targets = clients.filter(c => c.url.includes('studio.html'));
  if (!targets.length) return null;
  // Prefer a focused client, else first
  const client = targets.find(c => c.focused) ?? targets[0];
  relaySeq += 1;
  const relayId = `sw${Date.now()}${relaySeq}`;
  const url = new URL(request.url);
  const payload = {
    type: 'studio-request',
    relayId,
    method: request.method,
    path: url.pathname,
    query: url.search,
    ifMatch: request.headers.get('If-Match'),
    ifNoneMatch: request.headers.get('If-None-Match'),
    contentType: request.headers.get('Content-Type'),
  };
  const body = await request.text().catch(() => null);

  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => {
      resolve(new Response(JSON.stringify({ error: 'studio host unreachable' }), { status: 503 }));
    }, 15000);
    channel.port1.onmessage = (ev) => {
      clearTimeout(timer);
      const { status = 200, headers = {}, body: resBody = null } = ev.data || {};
      const init = { status, headers: { 'content-type': headers.contentType || 'application/json' } };
      if (headers.etag) init.headers['ETag'] = headers.etag;
      if (headers.coop) init.headers['Cross-Origin-Opener-Policy'] = headers.coop;
      if (headers.coep) init.headers['Cross-Origin-Embedder-Policy'] = headers.coep;
      resolve(resBody === null ? new Response(null, init) : new Response(resBody, init));
    };
    client.postMessage({ ...payload, body }, [channel.port2]);
    console.log('[studio-sw] relayed', payload.path);
  });
}

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'echo-clients') {
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const port = event.ports[0];
      port.postMessage({ clients: clients.map(c => c.url), focused: clients.map(c => c.focused) });
    });
  }
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (!HANDLED.test(url.pathname)) return;
  // Let the page answer; it decides semantics (project store, parsers)
  const maybe = relayToPage(event.request);
  if (maybe) event.respondWith(maybe);
});

