/**
 * FinanceBird — Worker B: financebird-auth
 * OAuth, Lizenz-Verwaltung, Device-Pairing, Admin, Feedback, Health
 *
 * KV-Binding: OAUTH_KV  (OAuth-Tokens, Pairing-Codes, Lizenz-Keys — alle in einem NS mit Prefix)
 * Env:
 *   NOTION_CLIENT_ID
 *   NOTION_CLIENT_SECRET
 *   OAUTH_REDIRECT_URI   = https://financebird-auth.holy-forest-0174.workers.dev/oauth/callback
 *   APP_URL              = https://financebird.app/financebird_v2.html
 *   FB_SHARED_SECRET     = [32-char random string]
 *   FB_ADMIN_SECRET      = [separate string for admin console]
 *   FEEDBACK_DB_ID       = Notion DB ID für Feedback
 *   FEEDBACK_TOKEN       = Notion Integration Token für Feedback-DB
 *
 * Audit-Fix 2026-03-22:
 *   - callbackPage: Weg C Fallback bekommt payload direkt (nicht aus query-params)
 *   - callbackPage: XSS-Escaping für title/message
 *   - callbackPage: Weg C code-Element ist klickbar (copy to clipboard)
 *   - Fragment-Keys bleiben fb_token + fb_state (App wird angepasst)
 *
 * Deploy: https://financebird-auth.holy-forest-0174.workers.dev
 */

const WORKER_VERSION = '1.4.0'; // Major.Minor.Patch — bei jedem Deploy hochzählen

export default {
  async fetch(request, env) {
    const url  = new URL(request.url);
    const path = url.pathname;

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return resp(null, 204, corsHeaders(request));
    }

    // Shared Secret prüfen (ausser OAuth-Endpoints + Health — werden vom Browser direkt aufgerufen)
    if (path !== '/oauth/callback' && path !== '/oauth/start' && path !== '/health') {
      const fbKey = request.headers.get('X-FB-Key');
      if (!fbKey || fbKey !== env.FB_SHARED_SECRET) {
        return json({ error: 'Unauthorized' }, 401);
      }
    }

    // Router (S12 BL-053: Rate-Limiting auf kritische Endpoints)
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

    if (path === '/oauth/start'    && request.method === 'GET')  return oauthStart(request, env, url);
    if (path === '/oauth/callback' && request.method === 'GET')  return oauthCallback(request, env, url);
    if (path === '/oauth/poll'     && request.method === 'GET') {
      if (!await checkRateLimit(env, `poll:${ip}`, 60))  return json({ error: 'Too many requests' }, 429);
      return oauthPoll(request, env, url);
    }
    // Device-Token Registration (kein Device-Check nötig — hier WIRD der Token erstellt)
    if (path === '/device/register' && request.method === 'POST') {
      if (!await checkRateLimit(env, `devreg:${ip}`, 5)) return json({ error: 'Too many requests' }, 429);
      return deviceRegister(request, env);
    }

    // Bootstrap-Endpoints: kein Device-Check (neues Gerät hat noch keinen Token)
    if (path === '/license/verify' && request.method === 'POST') {
      if (!await checkRateLimit(env, `verify:${ip}`, 10)) return json({ error: 'Too many requests' }, 429);
      return licenseVerify(request, env);
    }
    if (path === '/device/claim'   && request.method === 'POST') {
      if (!await checkRateLimit(env, `claim:${ip}`, 5))  return json({ error: 'Too many requests' }, 429);
      return deviceClaim(request, env);
    }

    // Health (kein Device-Check nötig)
    if (path === '/health'         && request.method === 'GET')  return healthCheck(request, env);

    // Device-Token Check für alle folgenden Endpoints
    const deviceErr = await checkDeviceToken(request, env);
    if (deviceErr) return deviceErr;

    if (path === '/device/setup'   && request.method === 'POST') {
      if (!await checkRateLimit(env, `setup:${ip}`, 5))  return json({ error: 'Too many requests' }, 429);
      return deviceSetup(request, env);
    }
    if (path === '/feedback'       && request.method === 'POST') {
      if (!await checkRateLimit(env, `feedback:${ip}`, 3)) return json({ error: 'Too many requests' }, 429);
      return feedbackPost(request, env);
    }

    // Admin-Endpoints (gesondert geschützt)
    if (path.startsWith('/admin/')) {
      const adminKey = request.headers.get('X-FB-Admin');
      if (!adminKey || adminKey !== env.FB_ADMIN_SECRET) {
        return json({ error: 'Admin unauthorized' }, 401);
      }
      if (path === '/admin/keys' && request.method === 'GET')    return adminListKeys(request, env);
      if (path === '/admin/keys' && request.method === 'POST')   return adminCreateKey(request, env);
      if (path.match(/^\/admin\/keys\/.+/) && request.method === 'PUT')    return adminUpdateKey(request, env, path);
      if (path.match(/^\/admin\/keys\/.+/) && request.method === 'DELETE') return adminDeleteKey(request, env, path);
      if (path === '/admin/feedback' && request.method === 'GET') return adminListFeedback(request, env);
    }

    return json({ error: 'Not found' }, 404);
  }
};

/* ─────────────────────────────────────────────────────────────
   OAuth
───────────────────────────────────────────────────────────── */

async function oauthStart(request, env, url) {
  const state = url.searchParams.get('state');
  if (!state) return json({ error: 'state required' }, 400);

  const authUrl = 'https://api.notion.com/v1/oauth/authorize?' + new URLSearchParams({
    client_id:     env.NOTION_CLIENT_ID,
    response_type: 'code',
    owner:         'user',
    redirect_uri:  env.OAUTH_REDIRECT_URI,
    state:         state,
  });

  // BUG-042 Fix (v1.2.3): Mobile mit Notion-App installiert -> iOS Universal Links
  // fangen api.notion.com ab und oeffnen die Notion-App statt Safari.
  // meta-refresh umgeht Universal Links zuverlaessig (Standard-Workaround fuer iOS).
  const ua = request.headers.get('User-Agent') || '';
  const isMobile = /iPhone|iPad|iPod|Android/i.test(ua);

  if (isMobile) {
    return new Response(oauthBridgePage(authUrl), {
      headers: { 'Content-Type': 'text/html;charset=utf-8' }
    });
  }

  // Desktop: sofortiger 302-Redirect (unveraendert)
  return Response.redirect(authUrl, 302);
}

async function oauthCallback(request, env, url) {
  const code  = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code || !state) {
    return new Response(callbackPage('Verbindung fehlgeschlagen', 'Kein Code oder State erhalten.', null, env.APP_URL), {
      headers: { 'Content-Type': 'text/html;charset=utf-8' }
    });
  }

  const tokenResp = await fetch('https://api.notion.com/v1/oauth/token', {
    method:  'POST',
    headers: {
      'Authorization': 'Basic ' + btoa(env.NOTION_CLIENT_ID + ':' + env.NOTION_CLIENT_SECRET),
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({ grant_type: 'authorization_code', code, redirect_uri: env.OAUTH_REDIRECT_URI }),
  });

  if (!tokenResp.ok) {
    return new Response(callbackPage('Verbindung fehlgeschlagen', 'Notion hat keinen Token ausgestellt.', null, env.APP_URL), {
      headers: { 'Content-Type': 'text/html;charset=utf-8' }
    });
  }

  const tokenData = await tokenResp.json();
  const payload   = JSON.stringify({ access_token: tokenData.access_token, bot_id: tokenData.bot_id, workspace_name: tokenData.workspace_name });

  await env.OAUTH_KV.put('oauth:' + state, payload, { expirationTtl: 600 });

  const appUrl   = env.APP_URL;
  const fragment = 'fb_token=' + encodeURIComponent(payload) + '&fb_state=' + encodeURIComponent(state);

  const ua = request.headers.get('User-Agent') || '';
  const isMobile = /iPhone|iPad|iPod|Android/i.test(ua);

  return new Response(callbackPage('Verbindung erfolgreich!', 'FinanceBird wurde mit deinem Notion verbunden.', fragment, appUrl, payload, isMobile), {
    headers: { 'Content-Type': 'text/html;charset=utf-8' }
  });
}

async function oauthPoll(request, env, url) {
  const state = url.searchParams.get('state');
  if (!state) return json({ ready: false, error: 'state required' }, 400);

  const stored = await env.OAUTH_KV.get('oauth:' + state);
  if (!stored) return json({ ready: false });

  await env.OAUTH_KV.delete('oauth:' + state);
  return json({ ready: true, token: stored });
}

/* ─────────────────────────────────────────────────────────────
   Lizenz
───────────────────────────────────────────────────────────── */

async function licenseVerify(request, env) {
  let body;
  try { body = await request.json(); } catch { return json({ valid: false, reason: 'invalid_request' }, 400); }

  const key = (body.key || '').toUpperCase().trim();
  if (!key.startsWith('LK-')) return json({ valid: false, reason: 'not_found' });

  const entry = await env.OAUTH_KV.get('license:' + key, { type: 'json' }).catch(() => null);
  if (!entry)                 return json({ valid: false, reason: 'not_found' });
  if (entry.active === false) return json({ valid: false, reason: 'not_found' });

  if (entry.expiresAt && new Date(entry.expiresAt) < new Date()) {
    return json({ valid: false, reason: 'expired' });
  }

  return json({ valid: true, plan: entry.plan || 'core', expiresAt: entry.expiresAt || null });
}

/* ─────────────────────────────────────────────────────────────
   Device Registration (Sprint 1: Triple-Auth)
───────────────────────────────────────────────────────────── */

async function deviceRegister(request, env) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'invalid_request' }, 400); }

  // Lizenz-Key aus Header (bereits durch Secret-Check gegangen)
  const licenseKey = (request.headers.get('X-FB-License') || '').toUpperCase().trim();
  if (!licenseKey || !licenseKey.startsWith('LK-')) {
    return json({ error: 'license_required' }, 400);
  }

  // Lizenz muss gültig sein
  const entry = await env.OAUTH_KV.get('license:' + licenseKey, { type: 'json' }).catch(() => null);
  if (!entry || entry.active === false) {
    return json({ error: 'invalid_license' }, 403);
  }

  // Device-Token generieren (32 hex chars)
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  const token = Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');

  // In KV speichern: device:{licenseKey}:{token}
  const deviceData = {
    created: new Date().toISOString(),
    userAgent: (body.userAgent || '').slice(0, 500),
    lastSeen: new Date().toISOString(),
  };
  await env.OAUTH_KV.put(`device:${licenseKey}:${token}`, JSON.stringify(deviceData));

  return json({ token });
}

async function checkDeviceToken(request, env) {
  const deviceToken = (request.headers.get('X-FB-Device') || '').trim();
  const licenseKey  = (request.headers.get('X-FB-License') || '').toUpperCase().trim();

  if (!deviceToken || !licenseKey) {
    return json({ error: 'device_not_registered', action: 'reauth' }, 401);
  }

  const kvKey = `device:${licenseKey}:${deviceToken}`;
  const deviceData = await env.OAUTH_KV.get(kvKey, { type: 'json' }).catch(() => null);
  if (!deviceData) {
    return json({ error: 'device_not_registered', action: 'reauth' }, 401);
  }

  // lastSeen aktualisieren (max 1×/Stunde um KV-Writes zu sparen)
  const now = new Date().toISOString();
  if (!deviceData.lastSeen || deviceData.lastSeen.slice(0, 13) !== now.slice(0, 13)) {
    deviceData.lastSeen = now;
    env.OAUTH_KV.put(kvKey, JSON.stringify(deviceData)).catch(() => {});
  }

  return null; // kein Fehler — Token gültig
}

/* ─────────────────────────────────────────────────────────────
   Device Pairing
───────────────────────────────────────────────────────────── */

async function deviceSetup(request, env) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'invalid_request' }, 400); }

  const licenseKey = (body.licenseKey || '').toUpperCase().trim();
  if (!licenseKey.startsWith('LK-')) return json({ error: 'invalid_license' }, 400);

  const entry = await env.OAUTH_KV.get('license:' + licenseKey, { type: 'json' }).catch(() => null);
  if (!entry || entry.active === false) return json({ error: 'invalid_license' }, 403);

  const charset = 'abcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  const arr = new Uint8Array(6);
  crypto.getRandomValues(arr);
  for (const b of arr) code += charset[b % charset.length];

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  await env.OAUTH_KV.put('pair:' + code, JSON.stringify({ licenseKey, expiresAt }), { expirationTtl: 600 });

  return json({ code, expiresAt });
}

async function deviceClaim(request, env) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'invalid_request' }, 400); }

  const code = (body.code || '').toLowerCase().trim();
  if (!code || code.length !== 6) return json({ error: 'invalid_code' }, 400);

  const stored = await env.OAUTH_KV.get('pair:' + code, { type: 'json' }).catch(() => null);
  if (!stored) return json({ error: 'expired' }, 410);

  // S14: Max 5 claims instead of one-shot delete (BL-059 / BUG-049)
  const claims = (stored.claims || 0) + 1;
  if (claims >= 5) {
    await env.OAUTH_KV.delete('pair:' + code);
    return json({ error: 'expired' }, 410);
  }
  // Increment counter, preserve remaining TTL
  const remainingTtl = Math.max(1, Math.floor((new Date(stored.expiresAt) - Date.now()) / 1000));
  await env.OAUTH_KV.put('pair:' + code, JSON.stringify({
    ...stored, claims
  }), { expirationTtl: remainingTtl });

  const licKey = (stored.licenseKey || '').toUpperCase();
  const entry  = await env.OAUTH_KV.get('license:' + licKey, { type: 'json' }).catch(() => null);
  if (!entry || entry.active === false) return json({ error: 'invalid_license' }, 403);

  return json({ licenseKey: licKey, plan: entry.plan || 'core' });
}

/* ─────────────────────────────────────────────────────────────
   Feedback
───────────────────────────────────────────────────────────── */

async function feedbackPost(request, env) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'invalid_request' }, 400); }

  const { message, context } = body;
  if (!message) return json({ error: 'message required' }, 400);

  const license = (request.headers.get('X-FB-License') || '').slice(0, 20);

  const notionResp = await fetch('https://api.notion.com/v1/pages', {
    method:  'POST',
    headers: {
      'Authorization':  'Bearer ' + env.FEEDBACK_TOKEN,
      'Notion-Version': '2022-06-28',
      'Content-Type':   'application/json',
    },
    body: JSON.stringify({
      parent:     { database_id: env.FEEDBACK_DB_ID },
      properties: {
        'Nachricht': { title: [{ text: { content: (message || '').slice(0, 2000) } }] },
        'Typ':       { select: { name: body.type || 'bug' } },
        'Kontext':   { rich_text: [{ text: { content: (context || '').slice(0, 2000) } }] },
        'Version':   { rich_text: [{ text: { content: (body.version || '').slice(0, 50) } }] },
        'Lizenz':    { rich_text: [{ text: { content: license } }] },
        'Datum':     { date: { start: new Date().toISOString() } },
        'Status':    { select: { name: 'Neu' } },
      },
    }),
  });

  if (!notionResp.ok) return json({ error: 'notion_error' }, 502);
  return json({ ok: true });
}

/* ─────────────────────────────────────────────────────────────
   Health
───────────────────────────────────────────────────────────── */

async function healthCheck(request, env) {
  let kvOk = false;
  try {
    await env.OAUTH_KV.get('__health__');
    kvOk = true;
  } catch {}
  return json({ ok: true, service: 'financebird-auth', version: WORKER_VERSION, kv: kvOk, ts: new Date().toISOString() });
}

/* ─────────────────────────────────────────────────────────────
   Admin
───────────────────────────────────────────────────────────── */

async function adminListKeys(request, env) {
  const list = await env.OAUTH_KV.list({ prefix: 'license:' });
  const keys = await Promise.all(
    list.keys.map(async ({ name }) => {
      const data = await env.OAUTH_KV.get(name, { type: 'json' }).catch(() => null);
      return { key: name.replace('license:', ''), ...data };
    })
  );
  return json({ keys });
}

async function adminCreateKey(request, env) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'invalid_request' }, 400); }

  const { plan, expiresAt, email } = body;
  const charset = 'abcdefghjkmnpqrstuvwxyz23456789';
  let suffix = '';
  const arr = new Uint8Array(8);
  crypto.getRandomValues(arr);
  for (const b of arr) suffix += charset[b % charset.length];

  const key   = 'LK-' + suffix;
  const entry = { plan: plan || 'core', expiresAt: expiresAt || null, email: email || null, active: true, createdAt: new Date().toISOString() };

  await env.OAUTH_KV.put('license:' + key, JSON.stringify(entry));
  return json({ key, ...entry });
}

async function adminUpdateKey(request, env, path) {
  const key = path.replace('/admin/keys/', '').toUpperCase();
  let body;
  try { body = await request.json(); } catch { return json({ error: 'invalid_request' }, 400); }

  const existing = await env.OAUTH_KV.get('license:' + key, { type: 'json' }).catch(() => null);
  if (!existing) return json({ error: 'not_found' }, 404);

  const updated = { ...existing, ...body, updatedAt: new Date().toISOString() };
  await env.OAUTH_KV.put('license:' + key, JSON.stringify(updated));
  return json({ key, ...updated });
}

async function adminDeleteKey(request, env, path) {
  const key = path.replace('/admin/keys/', '').toUpperCase();
  const existing = await env.OAUTH_KV.get('license:' + key, { type: 'json' }).catch(() => null);
  if (!existing) return json({ error: 'not_found' }, 404);

  const updated = { ...existing, active: false, deactivatedAt: new Date().toISOString() };
  await env.OAUTH_KV.put('license:' + key, JSON.stringify(updated));
  return json({ key, deactivated: true });
}

/* ─────────────────────────────────────────────────────────────
   Admin: Feedback
───────────────────────────────────────────────────────────── */

async function adminListFeedback(request, env) {
  if (!env.FEEDBACK_DB_ID || !env.FEEDBACK_TOKEN) {
    return json({ error: 'Feedback DB not configured', feedbacks: [] });
  }
  try {
    const resp = await fetch('https://api.notion.com/v1/databases/' + env.FEEDBACK_DB_ID + '/query', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + env.FEEDBACK_TOKEN,
        'Notion-Version': '2022-06-28',
        'Content-Type':   'application/json',
      },
      body: JSON.stringify({
        sorts: [{ property: 'Created', direction: 'descending' }],
        page_size: 50,
      }),
    });
    if (!resp.ok) return json({ error: 'Notion query failed: ' + resp.status, feedbacks: [] });
    const data = await resp.json();
    const feedbacks = (data.results || []).map(page => {
      const props = page.properties || {};
      return {
        id:      page.id,
        date:    page.created_time,
        message: props['Nachricht']?.title?.[0]?.plain_text || props['Name']?.title?.[0]?.plain_text || props['Message']?.title?.[0]?.plain_text || '',
        type:    props['Typ']?.select?.name || '',
        context: props['Kontext']?.rich_text?.[0]?.plain_text || props['Context']?.rich_text?.[0]?.plain_text || '',
        version: props['Version']?.rich_text?.[0]?.plain_text || '',
        license: props['Lizenz']?.rich_text?.[0]?.plain_text || '',
        status:  props['Status']?.select?.name || '',
        email:   props['Email']?.email || '',
      };
    });
    return json({ feedbacks, total: feedbacks.length });
  } catch (e) {
    return json({ error: e.message, feedbacks: [] });
  }
}

/* ─────────────────────────────────────────────────────────────
   Callback-Page
───────────────────────────────────────────────────────────── */

function callbackPage(title, message, fragment, appUrl, payload, isMobile) {
  const redirectUrl    = fragment ? appUrl + '#' + fragment : null;
  const escapedPayload = (payload || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>FinanceBird — ${title.replace(/</g,'&lt;')}</title>
<style>
  body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; background:#faf6f1; color:#2c1f0e; }
  .card { background:white; border-radius:18px; padding:32px 28px; max-width:420px; width:100%; text-align:center; box-shadow:0 4px 24px rgba(44,31,14,.12); }
  h1 { font-size:22px; margin-bottom:8px; }
  p  { font-size:14px; color:#7a6a5a; line-height:1.6; }
  .btn { display:inline-block; margin-top:20px; padding:12px 24px; background:#c4441a; color:white; border-radius:10px; text-decoration:none; font-weight:600; font-size:14px; }
  .btn-subtle { display:inline-block; margin-top:12px; padding:10px 20px; background:none; color:#7a6a5a; border:1.5px solid #d5cdc2; border-radius:10px; text-decoration:none; font-size:13px; }
  code { background:#f4ede4; padding:8px 12px; border-radius:6px; font-family:monospace; font-size:11px; word-break:break-all; display:block; margin-top:12px; cursor:pointer; user-select:all; max-height:80px; overflow-y:auto; text-align:left; }
  .fallback { display:none; margin-top:20px; padding-top:16px; border-top:1px solid #e8e0d6; }
</style>
<script>
${isMobile && redirectUrl
  ? `// S12 BUG-037: Mobile auto-redirect nach 1.5s
setTimeout(function() { window.location.href = "${redirectUrl.replace(/"/g, '\\"')}"; }, 1500);`
  : `// Desktop: Tab schliessen nach 2s, Fallback nach 4s
setTimeout(function() { try { window.close(); } catch(e) {} }, 2000);
setTimeout(function() { var fb = document.getElementById('fallback'); if (fb) fb.style.display = 'block'; }, 4000);`
}
</script>
</head>
<body>
<div class="card">
  <div style="font-size:48px;margin-bottom:12px">${title.includes('erfolgreich') ? '✅' : '❌'}</div>
  <h1>${title.replace(/</g,'&lt;')}</h1>
  <p>${message}</p>
  ${isMobile && redirectUrl
    ? '<p style="margin-top:16px;font-size:14px;color:#2c1f0e;font-weight:600">Du wirst automatisch zurückgeleitet…</p><p style="font-size:12px;color:#7a6a5a;margin-top:8px"><a href="' + redirectUrl + '" style="color:#c4441a">Falls nicht, hier tippen →</a></p>'
    : (redirectUrl
      ? '<p style="margin-top:16px;font-size:15px;color:#2c1f0e;font-weight:600">Du kannst dieses Fenster schliessen.</p><p style="font-size:13px;color:#7a6a5a;margin-top:6px">Die Verbindung wird im anderen Tab automatisch erkannt.</p><div id="fallback" class="fallback"><p style="font-size:12px;color:#b0a090;margin-bottom:8px">Tab hat sich nicht geschlossen?</p><a href="' + redirectUrl + '" class="btn-subtle">Manuell zurück zu FinanceBird →</a></div>'
      : (escapedPayload
        ? '<p style="margin-top:16px;font-size:12px">Kein automatischer Redirect möglich. Kopiere diesen Token:</p><code onclick="navigator.clipboard.writeText(this.textContent).then(()=>this.style.background=\'#e8f3ea\')">' + escapedPayload + '</code>'
        : '<p style="margin-top:16px;font-size:12px;color:#c4441a">Verbindung fehlgeschlagen. Bitte erneut versuchen.</p>'))
  }
</div>
</body>
</html>`;
}

/* ─────────────────────────────────────────────────────────────
   OAuth Bridge Page (BUG-042, v1.2.3)
───────────────────────────────────────────────────────────── */

function oauthBridgePage(authUrl) {
  const escaped = authUrl.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="refresh" content="1;url=${escaped}">
<title>FinanceBird — Verbindung</title>
<style>
  body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; background:#faf6f1; color:#2c1f0e; }
  .card { text-align:center; padding:32px 28px; }
  .spinner { width:32px; height:32px; border:3px solid #e8e0d6; border-top-color:#c4441a; border-radius:50%; animation:spin .8s linear infinite; margin:0 auto 16px; }
  @keyframes spin { to { transform:rotate(360deg); } }
</style>
</head>
<body>
<div class="card">
  <div class="spinner"></div>
  <div style="font-size:15px;font-weight:600;margin-bottom:6px">Verbindung mit Notion</div>
  <div style="font-size:13px;color:#7a6a5a">Einen Moment…</div>
</div>
</body>
</html>`;
}

/* ─────────────────────────────────────────────────────────────
   Rate Limiting (S12 BL-053)
───────────────────────────────────────────────────────────── */

async function checkRateLimit(env, key, maxPerMinute = 10) {
  const rlKey = 'rl:' + key;
  try {
    const entry = await env.OAUTH_KV.get(rlKey, { type: 'json' });
    const now = Date.now();
    if (entry && entry.count >= maxPerMinute && (now - entry.start) < 60000) {
      return false; // rate limited
    }
    if (!entry || (now - entry.start) >= 60000) {
      await env.OAUTH_KV.put(rlKey, JSON.stringify({ count: 1, start: now }), { expirationTtl: 120 });
    } else {
      entry.count++;
      await env.OAUTH_KV.put(rlKey, JSON.stringify(entry), { expirationTtl: 120 });
    }
  } catch (e) {
    // KV error — fail open
    console.error('Rate limit check failed:', e);
  }
  return true;
}

/* ─────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────── */

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
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, Notion-Version, X-FB-Key, X-FB-License, X-FB-Admin, X-FB-Device',
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}

function resp(body, status = 200, headers = {}) {
  return new Response(body, { status, headers: { ...corsHeaders(), ...headers } });
}
