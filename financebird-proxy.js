/**
 * FinanceBird — Worker A: financebird-proxy
 * Blind CORS-Proxy zu api.notion.com
 * Prüft X-FB-Key (Shared Secret) + X-FB-License (Lizenz-Key per KV)
 * Kein Logging, kein Datenzugriff, sieht keine Finanzdaten.
 *
 * KV-Binding: LICENSE_KV (= selber Namespace wie Worker B OAUTH_KV, read-only)
 * Env: FB_SHARED_SECRET
 *
 * Audit-Fix 2026-03-22:
 *   - KV-Lookup nutzt jetzt 'license:' Prefix (konsistent mit Worker B)
 *   - Lizenz-Key wird uppercase-normalisiert (konsistent mit Worker B)
 *
 * Deploy: https://financebird-proxy.holy-forest-0174.workers.dev/v1
 */

const WORKER_VERSION = '1.2.0'; // Major.Minor.Patch — bei jedem Deploy hochzählen

export default {
  async fetch(request, env) {
    const url  = new URL(request.url);
    const path = url.pathname;

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(request) });
    }

    // Health-Check (kein Auth nötig)
    if (path === '/health' && request.method === 'GET') {
      let kvOk = false;
      try { await env.LICENSE_KV.get('__health__'); kvOk = true; } catch {}
      return json({ ok: true, service: 'financebird-proxy', version: WORKER_VERSION, kv: kvOk, ts: new Date().toISOString() });
    }

    // 1. Shared Secret prüfen (Spam-Filter)
    const fbKey = request.headers.get('X-FB-Key');
    if (!fbKey || fbKey !== env.FB_SHARED_SECRET) {
      return json({ error: 'Unauthorized' }, 401);
    }

    // 2. Lizenz-Key prüfen (KV-Lookup mit 'license:' Prefix)
    const licenseKey = (request.headers.get('X-FB-License') || '').toUpperCase().trim();
    if (!licenseKey) {
      return json({ error: 'License key required' }, 403);
    }

    const entry = await env.LICENSE_KV.get(`license:${licenseKey}`, { type: 'json' }).catch(() => null);
    if (!entry || entry.active === false) {
      return json({ error: 'Invalid or expired license' }, 403);
    }

    // Optional: Ablaufdatum prüfen
    if (entry.expiresAt && new Date(entry.expiresAt) < new Date()) {
      return json({ error: 'License expired' }, 403);
    }

    // 3. Device-Token prüfen (Triple-Auth)
    const deviceToken = (request.headers.get('X-FB-Device') || '').trim();
    if (!deviceToken) {
      return json({ error: 'device_not_registered', action: 'reauth' }, 401);
    }

    const deviceData = await env.LICENSE_KV.get(`device:${licenseKey}:${deviceToken}`, { type: 'json' }).catch(() => null);
    if (!deviceData) {
      return json({ error: 'device_not_registered', action: 'reauth' }, 401);
    }

    // lastSeen aktualisieren (max 1×/Stunde um KV-Writes zu sparen)
    const now = new Date().toISOString();
    if (!deviceData.lastSeen || deviceData.lastSeen.slice(0, 13) !== now.slice(0, 13)) {
      deviceData.lastSeen = now;
      env.LICENSE_KV.put(`device:${licenseKey}:${deviceToken}`, JSON.stringify(deviceData)).catch(() => {});
    }

    // 4. Request an Notion weiterleiten (blind — kein Logging)
    const notionPath = url.pathname.replace(/^\/v1/, '') || '/';
    const notionUrl  = 'https://api.notion.com/v1' + notionPath + url.search;

    const headers = new Headers(request.headers);
    headers.delete('X-FB-Key');
    headers.delete('X-FB-License');
    headers.delete('X-FB-Device');
    headers.set('Host', 'api.notion.com');

    const notionResp = await fetch(notionUrl, {
      method:  request.method,
      headers: headers,
      body:    ['GET', 'HEAD'].includes(request.method) ? null : request.body,
    });

    const respHeaders = new Headers(notionResp.headers);
    Object.entries(corsHeaders(request)).forEach(([k, v]) => respHeaders.set(k, v));

    return new Response(notionResp.body, {
      status:  notionResp.status,
      headers: respHeaders,
    });
  }
};

function corsHeaders(request) {
  const origin = request?.headers?.get('Origin') || '';
  const allowed = [
    'https://financebird.app',
    'https://financebird.github.io',
    'http://localhost:8080',
    'http://127.0.0.1:8080',
  ];
  const allowOrigin = allowed.includes(origin) ? origin : allowed[0];
  return {
    'Access-Control-Allow-Origin':  allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, Notion-Version, X-FB-Key, X-FB-License, X-FB-Device',
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}
