/**
 * Zolexora IMS - Cloudflare Worker Custom Domain Reverse Proxy & Edge Session Cache
 * Custom Domain: ims.zolexora.com
 * KV Namespace: env.SESSION_KV
 */

const DEFAULT_GAS_EXEC_URL = 'https://script.google.com/macros/s/AKfycbyQpkaxpQrmcDyFtROLp4PNRGVxTFpBzg7KkNBiqPOxSOtxijB8VUarYIpTuprSB7f3/exec';
const DEFAULT_SESSION_TTL_SECONDS = 604800; // 7 days (in seconds)
const COOKIE_NAME = 'zolexora_session';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Handle CORS Preflight for edge APIs
    if (request.method === 'OPTIONS') {
      return handleCorsPreflight(request);
    }

    // -------------------------------------------------------------
    // 1. DEDICATED EDGE SESSION API ENDPOINTS
    // -------------------------------------------------------------
    if (url.pathname === '/api/session' || url.pathname.startsWith('/api/session/')) {
      return handleSessionApi(request, env, url);
    }

    // -------------------------------------------------------------
    // 2. TRANSPARENT EDGE PROXY WITH SESSION ENRICHMENT
    // -------------------------------------------------------------
    return handleProxyRequest(request, env, url);
  }
};

/**
 * Handles /api/session endpoints (GET, POST, DELETE, /health)
 */
async function handleSessionApi(request, env, url) {
  const method = request.method.toUpperCase();

  // Health check endpoint
  if (url.pathname === '/api/session/health') {
    return jsonResponse({
      status: 'healthy',
      service: 'zolexora-edge-session-store',
      kvConfigured: Boolean(env.SESSION_KV),
      edgeLocation: request.cf?.colo || 'UNKNOWN',
      timestamp: new Date().toISOString()
    }, 200, request);
  }

  // Verify KV binding availability
  if (!env.SESSION_KV) {
    return jsonResponse({
      success: false,
      error: 'KV namespace SESSION_KV is not bound in wrangler.toml or environment.'
    }, 500, request);
  }

  // GET /api/session: Retrieve edge-cached session
  if (method === 'GET') {
    const token = getSessionToken(request, url);
    if (!token) {
      return jsonResponse({
        success: false,
        cached: false,
        error: 'No session token found in cookie or headers.'
      }, 401, request);
    }

    const key = `session:${token}`;
    const sessionData = await env.SESSION_KV.get(key, { type: 'json' });

    if (!sessionData) {
      return jsonResponse({
        success: false,
        cached: false,
        error: 'Session not found or expired in edge cache.'
      }, 404, request);
    }

    return jsonResponse({
      success: true,
      cached: true,
      sessionId: token,
      user: sessionData.user,
      scope: sessionData.user?.scopeType || 'GLOBAL',
      assignedLocation: sessionData.user?.assignedLocation || 'ALL',
      expiresAt: sessionData.expiresAt,
      edgeLocation: request.cf?.colo || 'LOCAL'
    }, 200, request);
  }

  // POST /api/session: Store or refresh edge-cached session
  if (method === 'POST') {
    let payload;
    try {
      payload = await request.json();
    } catch (e) {
      return jsonResponse({ success: false, error: 'Invalid JSON request body.' }, 400, request);
    }

    const user = payload.user || payload;
    if (!user || (!user.email && !user.id)) {
      return jsonResponse({ success: false, error: 'User payload must contain email or id.' }, 400, request);
    }

    const ttl = Number(payload.ttl || env.SESSION_TTL_SECONDS || DEFAULT_SESSION_TTL_SECONDS);
    const sessionId = payload.sessionId || generateSessionId();
    const key = `session:${sessionId}`;
    const now = Date.now();
    const expiresAt = new Date(now + ttl * 1000).toISOString();

    const sessionRecord = {
      sessionId: sessionId,
      user: {
        id: user.id || ('USR_' + now.toString().slice(-4)),
        name: user.name || user.email,
        email: user.email,
        role: user.role || 'Staff',
        scopeType: user.scopeType || (user.assignedLocation?.startsWith('SP_') ? 'SELLING_POINT' : user.assignedLocation?.startsWith('S_') ? 'STORE' : 'ALL'),
        assignedLocation: user.assignedLocation || user.assignedStore || 'ALL',
        locationName: user.locationName || '',
        orgId: user.orgId || '',
        orgName: user.orgName || 'Zolexora IMS'
      },
      createdAt: now,
      updatedAt: now,
      expiresAt: expiresAt
    };

    // Store in Cloudflare KV with TTL
    await env.SESSION_KV.put(key, JSON.stringify(sessionRecord), {
      expirationTtl: Math.max(60, ttl),
      metadata: {
        email: user.email,
        role: user.role || 'Staff',
        scope: sessionRecord.user.scopeType,
        location: sessionRecord.user.assignedLocation
      }
    });

    const headers = new Headers();
    headers.set('Set-Cookie', `${COOKIE_NAME}=${sessionId}; Path=/; Max-Age=${ttl}; HttpOnly; Secure; SameSite=Lax`);

    return jsonResponse({
      success: true,
      cached: true,
      message: 'Session stored in edge KV successfully.',
      sessionId: sessionId,
      user: sessionRecord.user,
      expiresAt: expiresAt
    }, 200, request, headers);
  }

  // DELETE /api/session: Terminate / logout edge-cached session
  if (method === 'DELETE') {
    const token = getSessionToken(request, url);
    if (token) {
      await env.SESSION_KV.delete(`session:${token}`);
    }

    const headers = new Headers();
    headers.set('Set-Cookie', `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`);

    return jsonResponse({
      success: true,
      message: 'Session invalidated and removed from edge KV.'
    }, 200, request, headers);
  }

  return jsonResponse({ success: false, error: `Method ${method} not allowed on /api/session.` }, 405, request);
}

/**
 * Handles transparent reverse proxying to Google Apps Script
 * Injects edge session context into downstream request headers
 */
async function handleProxyRequest(request, env, url) {
  const gasExecUrl = env.GAS_EXEC_URL || DEFAULT_GAS_EXEC_URL;
  const targetUrl = new URL(gasExecUrl);

  // Pass all URL parameters to Apps Script
  url.searchParams.forEach((val, key) => {
    targetUrl.searchParams.set(key, val);
  });

  const modifiedHeaders = new Headers(request.headers);
  modifiedHeaders.set('Host', 'script.google.com');

  // Check edge-cached session to decorate downstream request
  let cacheStatus = 'NONE';
  if (env.SESSION_KV) {
    const token = getSessionToken(request, url);
    if (token) {
      try {
        const session = await env.SESSION_KV.get(`session:${token}`, { type: 'json' });
        if (session && session.user) {
          cacheStatus = 'HIT';
          modifiedHeaders.set('x-edge-auth', '1');
          modifiedHeaders.set('x-edge-session-id', token);
          modifiedHeaders.set('x-edge-user-id', session.user.id || '');
          modifiedHeaders.set('x-edge-user-email', session.user.email || '');
          modifiedHeaders.set('x-edge-user-role', session.user.role || '');
          modifiedHeaders.set('x-edge-user-scope', session.user.scopeType || '');
          modifiedHeaders.set('x-edge-user-location', session.user.assignedLocation || '');
        } else {
          cacheStatus = 'MISS';
        }
      } catch (e) {
        cacheStatus = 'ERROR';
      }
    }
  }

  const init = {
    method: request.method,
    headers: modifiedHeaders,
    redirect: 'follow'
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
  }

  const response = await fetch(targetUrl.toString(), init);

  const newHeaders = new Headers(response.headers);
  newHeaders.set('Access-Control-Allow-Origin', '*');
  newHeaders.set('Permissions-Policy', 'camera=*, microphone=*, geolocation=*, clipboard-write=*');
  newHeaders.delete('X-Frame-Options');
  newHeaders.set('x-edge-worker', 'zolexora-ims-proxy');
  newHeaders.set('x-edge-session-cache', cacheStatus);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}

/**
 * Extracts session token from Cookie, Authorization header, custom headers, or query string
 */
function getSessionToken(request, url) {
  // 1. From Cookie header
  const cookieHeader = request.headers.get('Cookie');
  if (cookieHeader) {
    const cookies = parseCookies(cookieHeader);
    if (cookies[COOKIE_NAME]) return cookies[COOKIE_NAME];
  }

  // 2. From Authorization Bearer header
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }

  // 3. From custom x-session-id or x-session-token header
  const customHeader = request.headers.get('x-session-id') || request.headers.get('x-session-token');
  if (customHeader) return customHeader.trim();

  // 4. From URL query parameter (?sessionId=... or ?sessionToken=...)
  if (url) {
    const qToken = url.searchParams.get('sessionId') || url.searchParams.get('sessionToken');
    if (qToken) return qToken.trim();
  }

  return null;
}

/**
 * Generates cryptographically secure random session ID
 */
function generateSessionId() {
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  return 'sess_' + Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Parses HTTP Cookie string
 */
function parseCookies(header) {
  const list = {};
  if (!header) return list;
  header.split(';').forEach(cookie => {
    let [name, ...rest] = cookie.split('=');
    name = name?.trim();
    if (!name) return;
    const value = rest.join('=').trim();
    list[name] = decodeURIComponent(value);
  });
  return list;
}

/**
 * Handles CORS Preflight
 */
function handleCorsPreflight(request) {
  const origin = request.headers.get('Origin') || '*';
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-session-id, x-session-token, x-requested-with',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400'
    }
  });
}

/**
 * Creates standardized JSON Response with CORS headers
 */
function jsonResponse(data, status = 200, request = null, extraHeaders = null) {
  const origin = request?.headers?.get('Origin') || '*';
  const headers = new Headers(extraHeaders);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Access-Control-Allow-Credentials', 'true');
  headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');

  return new Response(JSON.stringify(data, null, 2), {
    status: status,
    headers: headers
  });
}
