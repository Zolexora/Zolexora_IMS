/**
 * Zolexora IMS - Cloudflare Worker Custom Domain Reverse Proxy
 * Custom Domain: ims.zolexora.com
 */

const GAS_EXEC_URL = 'https://script.google.com/macros/s/AKfycbyQpkaxpQrmcDyFtROLp4PNRGVxTFpBzg7KkNBiqPOxSOtxijB8VUarYIpTuprSB7f3/exec';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const targetUrl = new URL(GAS_EXEC_URL);

    // Pass all query parameters to Apps Script
    url.searchParams.forEach((val, key) => {
      targetUrl.searchParams.set(key, val);
    });

    const modifiedHeaders = new Headers(request.headers);
    modifiedHeaders.set('Host', 'script.google.com');

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
    newHeaders.set('Permissions-Policy', 'camera=*, microphone=*, clipboard-write=*');
    newHeaders.delete('X-Frame-Options');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });
  }
};
