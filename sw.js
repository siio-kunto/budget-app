// FinanceBird Service Worker — Web Share Target Handler
// Fängt NUR Share-Target-POSTs ab — alle anderen Requests werden unberührt durchgelassen

const CACHE_NAME = 'financebird-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Alles ausser Share-Target-POST explizit durchlassen
  const isShareTarget = event.request.method === 'POST'
    && url.pathname.includes('financebird_v1.html');

  if (!isShareTarget) {
    // Normaler Netzwerk-Request — SW macht nichts, Browser handled normal
    return;
  }

  // Ab hier: Share-Target-POST verarbeiten
  event.respondWith((async () => {
    try {
      const formData = await event.request.formData();
      const file = formData.get('beleg');

      if (file && file instanceof File) {
        const arrayBuffer = await file.arrayBuffer();
        const base64 = arrayBufferToBase64(arrayBuffer);
        const sharedData = {
          name: file.name,
          type: file.type,
          data: `data:${file.type};base64,${base64}`,
          timestamp: Date.now()
        };

        const allClients = await clients.matchAll({ includeUncontrolled: true, type: 'window' });
        if (allClients.length > 0) {
          allClients[0].postMessage({ type: 'SHARED_BELEG', payload: sharedData });
          allClients[0].focus();
        } else {
          const cache = await caches.open(CACHE_NAME);
          await cache.put('/__shared_beleg__', new Response(JSON.stringify(sharedData), {
            headers: { 'Content-Type': 'application/json' }
          }));
        }
      }
    } catch(e) {
      console.warn('SW share handler error:', e);
    }

    return Response.redirect('/budget-app/financebird_v1.html?shared=1', 303);
  })());
});

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
