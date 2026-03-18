/**
 * FinanceBird · Cloudflare Worker v2
 * ─────────────────────────────────────────────────────────────────────────────
 * Endpoints:
 *   GET/POST /v1/*           → Notion API CORS-Proxy (blind — liest nichts)
 *   GET  /oauth/start        → Notion OAuth initiieren
 *   GET  /oauth/callback     → Notion OAuth abschliessen + KV-Speicherung
 *   GET  /oauth/poll         → PWA holt Token aus KV (iOS PWA Fix)
 *   POST /feedback           → Feedback an Osis Notion
 *   GET  /health             → Status-Check
 *
 * Environment Variables (in Cloudflare Dashboard setzen):
 *   NOTION_TOKEN          Notion Integration Token (ntn_…) — für Proxy-Fallback
 *   NOTION_CLIENT_ID      Notion OAuth App Client ID
 *   NOTION_CLIENT_SECRET  Notion OAuth App Client Secret
 *   OAUTH_REDIRECT_URI    z.B. https://dein-worker.workers.dev/oauth/callback
 *   APP_URL               z.B. https://siio-kunto.github.io/budget-app/financebird_v2.html
 *   FEEDBACK_DB_ID        Notion DB ID für Feedback (optional)
 *   FEEDBACK_TOKEN        Separater Token für Feedback-DB (optional)
 *   FB_SHARED_SECRET      Shared Secret — muss mit App übereinstimmen (Missbrauchsschutz)
 *
 * KV Binding (in Cloudflare Dashboard einrichten):
 *   OAUTH_KV              KV Namespace für OAuth-Token-Polling
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VER = '2022-06-28';

/* ── CORS Header ── */
const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Notion-Version, X-FB-Key',
  'Access-Control-Max-Age':       '86400',
};

/* ── OAuth Token TTL in KV: 10 Minuten ── */
const OAUTH_TOKEN_TTL = 600;

/* ═══════════════════════════════════════════════════════
   MAIN HANDLER
   ═══════════════════════════════════════════════════════ */
export default {
  async fetch(request, env) {
    const url    = new URL(request.url);
    const path   = url.pathname;
    const method = request.method;

    // Preflight
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    try {
      // ── Health (kein Auth nötig) ──
      if (path === '/health' || path === '/') {
        const kvOk = await checkKV(env);
        return jsonResponse({
          ok:      true,
          version: '2.1',
          service: 'FinanceBird Worker',
          kv:      kvOk,
        });
      }

      // ── OAuth Callback (kein Auth — kommt von Notion) ──
      if (path === '/oauth/callback') {
        return handleOAuthCallback(url, env);
      }

      // ── Shared Secret Prüfung für alle anderen Endpoints ──
      // Schützt vor Missbrauch als offener Proxy.
      // OAuth/callback ist ausgenommen weil er von Notion kommt.
      if (!checkSharedSecret(request, env)) {
        return jsonResponse({ error: 'Unauthorized' }, 401);
      }

      // ── Routes (nach Secret-Check) ──
      if (path === '/oauth/start') {
        return handleOAuthStart(url, env);
      }

      if (path === '/oauth/poll') {
        return handleOAuthPoll(url, env);
      }

      if (path === '/feedback' && method === 'POST') {
        return handleFeedback(request, env);
      }

      if (path.startsWith('/v1/')) {
        return handleNotionProxy(request, url, path, env);
      }

      return jsonResponse({ error: 'Not found' }, 404);

    } catch (e) {
      console.error('[Worker] Unhandled error:', e.message);
      return jsonResponse({ error: 'Internal server error' }, 500);
    }
  }
};

/* ═══════════════════════════════════════════════════════
   SHARED SECRET CHECK
   App sendet X-FB-Key Header mit jedem Request.
   Worker prüft gegen env.FB_SHARED_SECRET.
   Kein Secret konfiguriert → alles erlaubt (Dev-Mode).
   ═══════════════════════════════════════════════════════ */
function checkSharedSecret(request, env) {
  if (!env.FB_SHARED_SECRET) return true; // Dev-Mode: kein Secret → offen
  const key = request.headers.get('X-FB-Key') || '';
  return key === env.FB_SHARED_SECRET;
}

/* ═══════════════════════════════════════════════════════
   KV CHECK
   Prüft ob KV-Binding vorhanden und erreichbar.
   ═══════════════════════════════════════════════════════ */
async function checkKV(env) {
  if (!env.OAUTH_KV) return false;
  try {
    await env.OAUTH_KV.get('__health_check__');
    return true;
  } catch {
    return false;
  }
}

/* ═══════════════════════════════════════════════════════
   NOTION API PROXY (blind)
   Leitet Requests an Notion weiter.
   Liest Inhalt nicht. Loggt nichts.
   Token kommt vom Client (Authorization-Header).
   env.NOTION_TOKEN als Fallback (nur für Osis Tests).
   ═══════════════════════════════════════════════════════ */
async function handleNotionProxy(request, url, path, env) {
  const notionPath = path.replace(/^\/v1/, '');
  const notionUrl  = NOTION_API + notionPath + url.search;

  // Token: Client-Token bevorzugt, env als Fallback
  const clientAuth = request.headers.get('Authorization') || '';
  const token = (env.NOTION_TOKEN && env.NOTION_TOKEN.trim())
    ? `Bearer ${env.NOTION_TOKEN}`
    : clientAuth;

  if (!token) {
    return jsonResponse({ error: 'No Notion token' }, 401);
  }

  const body = ['GET', 'HEAD'].includes(request.method)
    ? undefined
    : await request.text();

  const notionResp = await fetch(notionUrl, {
    method:  request.method,
    headers: {
      'Authorization':  token,
      'Notion-Version': NOTION_VER,
      'Content-Type':   'application/json',
    },
    body,
  });

  const respBody = await notionResp.text();

  return new Response(respBody, {
    status:  notionResp.status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

/* ═══════════════════════════════════════════════════════
   OAUTH — START
   Startet den Notion OAuth Flow.
   ═══════════════════════════════════════════════════════ */
function handleOAuthStart(url, env) {
  const clientId    = env.NOTION_CLIENT_ID;
  const redirectUri = env.OAUTH_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return jsonResponse({
      error: 'OAuth not configured',
      hint:  'Set NOTION_CLIENT_ID and OAUTH_REDIRECT_URI in Worker environment'
    }, 503);
  }

  // State aus URL — CSRF-Schutz, kommt von der App
  const state = url.searchParams.get('state') || crypto.randomUUID();

  const authUrl = new URL('https://api.notion.com/v1/oauth/authorize');
  authUrl.searchParams.set('client_id',     clientId);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('owner',         'user');
  authUrl.searchParams.set('redirect_uri',  redirectUri);
  authUrl.searchParams.set('state',         state);

  return Response.redirect(authUrl.toString(), 302);
}

/* ═══════════════════════════════════════════════════════
   OAUTH — CALLBACK
   Tauscht Code gegen Token.
   Zwei Übergabe-Wege parallel:
   A) KV-Speicherung für Polling (iOS PWA Fix)
   B) Redirect mit Fragment für direkten Browser-Empfang
   C) Fallback-Seite mit kopierbarem Token (manuell)
   ═══════════════════════════════════════════════════════ */
async function handleOAuthCallback(url, env) {
  const code  = url.searchParams.get('code');
  const state = url.searchParams.get('state') || '';
  const error = url.searchParams.get('error');
  const appUrl = env.APP_URL || 'https://siio-kunto.github.io/budget-app/financebird_v2.html';

  if (error || !code) {
    return htmlPage('Verbindung fehlgeschlagen', `
      <p>Notion hat die Verbindung abgebrochen: <strong>${error || 'Kein Code erhalten'}</strong></p>
      <p>Bitte schliesse dieses Fenster und versuche es erneut.</p>
      <a href="${appUrl}" class="btn">← Zurück zur App</a>
    `);
  }

  const clientId     = env.NOTION_CLIENT_ID;
  const clientSecret = env.NOTION_CLIENT_SECRET;
  const redirectUri  = env.OAUTH_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return htmlPage('Worker nicht konfiguriert', `
      <p>OAuth ist auf dem Worker nicht vollständig eingerichtet.</p>
      <p>Bitte setze NOTION_CLIENT_ID, NOTION_CLIENT_SECRET und OAUTH_REDIRECT_URI.</p>
    `);
  }

  // Code gegen Token tauschen
  let tokenData;
  try {
    const credentials = btoa(`${clientId}:${clientSecret}`);
    const tokenResp   = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization':  `Basic ${credentials}`,
        'Content-Type':   'application/json',
        'Notion-Version': NOTION_VER,
      },
      body: JSON.stringify({
        grant_type:   'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResp.ok) {
      const errText = await tokenResp.text();
      console.error('[OAuth] Token exchange failed:', errText);
      throw new Error('Token exchange failed');
    }

    tokenData = await tokenResp.json();
  } catch (e) {
    return htmlPage('Verbindung fehlgeschlagen', `
      <p>Der Verbindungs-Code konnte nicht eingelöst werden.</p>
      <p>Bitte schliesse dieses Fenster und versuche es erneut.</p>
      <a href="${appUrl}" class="btn">← Zurück zur App</a>
    `);
  }

  const tokenPayload = JSON.stringify({
    access_token:   tokenData.access_token,
    workspace_name: tokenData.workspace_name,
    workspace_id:   tokenData.workspace_id,
    bot_id:         tokenData.bot_id,
  });

  // ── Weg A: KV-Speicherung für Polling ──
  let kvStored = false;
  if (env.OAUTH_KV && state) {
    try {
      await env.OAUTH_KV.put(
        `oauth_token_${state}`,
        tokenPayload,
        { expirationTtl: OAUTH_TOKEN_TTL }
      );
      kvStored = true;
    } catch (e) {
      console.error('[OAuth] KV write failed:', e.message);
      // Kein Hard-Fail — Weg B und C funktionieren noch
    }
  }

  // ── Weg B: Fragment-Redirect für direkten Browser-Empfang ──
  // Funktioniert wenn Redirect in demselben Browser-Kontext landet.
  const fragment  = encodeURIComponent(tokenPayload);
  const directUrl = `${appUrl}?oauth_success=1&state=${encodeURIComponent(state)}#token=${fragment}`;

  // ── Weg C: Fallback-Seite mit kopierbarem Token ──
  // Immer anzeigen — Browser zeigt sie wenn Redirect nicht klappt (iOS PWA).
  // Nach 2s versucht JS automatisch den Redirect (Weg B).
  // Token-Feld ist versteckt, bei Tap wird kopiert.
  return htmlPage('Notion verbunden ✓', `
    <div class="success-icon">✓</div>
    <h2>Verbindung erfolgreich</h2>
    <p>Wechsle zurück zu FinanceBird — die App wird automatisch verbunden.</p>

    <div id="auto-redirect-msg" style="margin:20px 0;padding:12px 16px;background:#e8f3ea;border-radius:8px;font-size:13px;color:#2c5e2e">
      Weiterleitung läuft… <span id="countdown">3</span>
    </div>

    <a href="${directUrl}" class="btn" id="manual-redirect" style="display:none">
      → Zur App wechseln
    </a>

    <!-- Manueller Fallback — sichtbar nach 4s wenn Auto-Redirect fehlschlägt -->
    <div id="manual-fallback" style="display:none;margin-top:24px;padding:16px;background:#f5f0e8;border:1px solid #d8ccb8;border-radius:10px">
      <p style="font-size:12px;color:#6b5c47;margin-bottom:10px">
        Auto-Verbindung hat nicht geklappt? Tippe auf das Feld unten — der Code wird kopiert.
        Dann zurück zur App und einfügen.
      </p>
      <div id="token-copy-field"
        onclick="copyToken()"
        style="background:#2c1f0e;color:#fce8c0;padding:14px 16px;border-radius:8px;
               font-family:monospace;font-size:11px;cursor:pointer;
               letter-spacing:.05em;word-break:break-all;
               -webkit-user-select:all;user-select:all"
        title="Tippen zum Kopieren">
        ••••••••••••••••••••••••••••••••••••••••
      </div>
      <div id="copy-confirm" style="display:none;margin-top:8px;font-size:12px;color:#4a7a52;font-weight:600">
        ✓ Kopiert — jetzt in FinanceBird einfügen
      </div>
    </div>

    <script>
      const TOKEN_DATA = ${JSON.stringify(tokenPayload)};
      const APP_URL    = '${directUrl}';

      // Countdown + Auto-Redirect
      let secs = 3;
      const cd = document.getElementById('countdown');
      const interval = setInterval(() => {
        secs--;
        if (cd) cd.textContent = secs;
        if (secs <= 0) {
          clearInterval(interval);
          window.location.href = APP_URL;
        }
      }, 1000);

      // Nach 4s: Auto-Redirect-Banner ausblenden, manuelle Optionen zeigen
      setTimeout(() => {
        const msg = document.getElementById('auto-redirect-msg');
        const btn = document.getElementById('manual-redirect');
        const fb  = document.getElementById('manual-fallback');
        if (msg) msg.style.display = 'none';
        if (btn) btn.style.display = 'block';
        if (fb)  fb.style.display  = 'block';
      }, 4000);

      function copyToken() {
        navigator.clipboard.writeText(TOKEN_DATA).then(() => {
          const confirm = document.getElementById('copy-confirm');
          if (confirm) confirm.style.display = 'block';
          // Token kurz sichtbar machen
          const field = document.getElementById('token-copy-field');
          if (field) {
            field.textContent = TOKEN_DATA.slice(0, 40) + '…';
            setTimeout(() => { field.textContent = '••••••••••••••••••••••••••••••••••••••••'; }, 3000);
          }
        }).catch(() => {
          // Clipboard API nicht verfügbar — Token sichtbar machen zum manuellen Kopieren
          const field = document.getElementById('token-copy-field');
          if (field) {
            field.textContent = TOKEN_DATA;
            field.style.fontSize = '9px';
          }
        });
      }
    </script>
  `);
}

/* ═══════════════════════════════════════════════════════
   OAUTH — POLL
   PWA fragt periodisch ob Token bereit liegt.
   iOS PWA Fix: Token landet in KV, PWA holt ihn ab.
   State-Code ist einmalig — Token wird nach Abholung gelöscht.
   ═══════════════════════════════════════════════════════ */
async function handleOAuthPoll(url, env) {
  const state = url.searchParams.get('state');

  if (!state) {
    return jsonResponse({ ready: false, error: 'No state parameter' }, 400);
  }

  if (!env.OAUTH_KV) {
    return jsonResponse({ ready: false, error: 'KV not configured' });
  }

  const key = `oauth_token_${state}`;

  try {
    const tokenPayload = await env.OAUTH_KV.get(key);

    if (!tokenPayload) {
      // Noch nicht bereit
      return jsonResponse({ ready: false });
    }

    // Token gefunden — sofort löschen (einmalig abrufbar)
    await env.OAUTH_KV.delete(key);

    const tokenData = JSON.parse(tokenPayload);
    return jsonResponse({ ready: true, token: tokenData });

  } catch (e) {
    console.error('[Poll] KV error:', e.message);
    return jsonResponse({ ready: false, error: 'KV error' });
  }
}

/* ═══════════════════════════════════════════════════════
   FEEDBACK
   Speichert Feedback in Osis Notion-DB.
   ═══════════════════════════════════════════════════════ */
async function handleFeedback(request, env) {
  const dbId = env.FEEDBACK_DB_ID;
  if (!dbId) {
    return jsonResponse({ ok: true, stored: false });
  }

  const token = env.FEEDBACK_TOKEN || env.NOTION_TOKEN;
  if (!token) {
    return jsonResponse({ ok: false, error: 'No token for feedback' }, 503);
  }

  let body;
  try { body = await request.json(); }
  catch { return jsonResponse({ error: 'Invalid JSON' }, 400); }

  const { text = '', email = '', version = '', diagnostics = '' } = body;

  const page = {
    parent: { database_id: dbId },
    properties: {
      'Name':    { title:     [{ text: { content: text.slice(0, 100) || '(kein Text)' } }] },
      'Email':   { email:     email || null },
      'Version': { rich_text: [{ text: { content: version } }] },
      'Datum':   { date:      { start: new Date().toISOString().split('T')[0] } },
    },
  };

  if (diagnostics) {
    page.children = [{
      object: 'block', type: 'code',
      code: {
        rich_text: [{ type: 'text', text: { content: diagnostics.slice(0, 2000) } }],
        language: 'json',
      },
    }];
  }

  const resp = await fetch(`${NOTION_API}/pages`, {
    method:  'POST',
    headers: {
      'Authorization':  `Bearer ${token}`,
      'Notion-Version': NOTION_VER,
      'Content-Type':   'application/json',
    },
    body: JSON.stringify(page),
  });

  if (!resp.ok) {
    console.error('[Feedback] Notion error:', resp.status);
    return jsonResponse({ ok: false, error: 'Notion write failed' }, 502);
  }

  return jsonResponse({ ok: true, stored: true });
}

/* ═══════════════════════════════════════════════════════
   HTML PAGE HELPER
   Für OAuth-Callback-Seiten (nicht-JSON Responses).
   ═══════════════════════════════════════════════════════ */
function htmlPage(title, content) {
  const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>FinanceBird — ${title}</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: 'Plus Jakarta Sans', sans-serif;
  background: #f5f0e8; color: #2c1f0e;
  min-height: 100vh; display: flex; align-items: center; justify-content: center;
  padding: 24px;
}
.card {
  background: #faf7f2; border: 1px solid #d8ccb8; border-radius: 16px;
  padding: 32px 28px; max-width: 420px; width: 100%;
  box-shadow: 0 4px 24px rgba(44,31,14,.08);
}
.logo {
  font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 600;
  color: #2c1f0e; margin-bottom: 24px; text-align: center;
}
.logo em { color: #c8922a; font-style: italic; }
.success-icon {
  width: 56px; height: 56px; border-radius: 50%;
  background: #e8f3ea; color: #4a7a52;
  font-size: 24px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 16px;
}
h2 { font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 600; margin-bottom: 10px; text-align: center; }
p { font-size: 13.5px; color: #4a3520; line-height: 1.6; margin-bottom: 10px; text-align: center; }
.btn {
  display: block; width: 100%; padding: 13px; margin-top: 16px;
  background: #2c1f0e; color: white; border-radius: 10px;
  text-decoration: none; font-size: 14px; font-weight: 600;
  text-align: center; cursor: pointer;
}
</style>
</head>
<body>
<div class="card">
  <div class="logo">Finance<em>Bird</em></div>
  ${content}
</div>
</body>
</html>`;
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html;charset=utf-8', ...CORS },
  });
}

/* ── JSON Helper ── */
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
