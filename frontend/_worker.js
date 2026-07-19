const API_ORIGIN = 'https://translate-silence-lover-humans.trycloudflare.com';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // API routes — proxy to GCP tunnel
    if (url.pathname.startsWith('/api/') || url.pathname === '/api') {
      const apiPath = url.pathname.replace('/api', '');
      const targetUrl = `${API_ORIGIN}${apiPath}${url.search}`;
      
      const resp = await fetch(targetUrl, {
        method: request.method,
        headers: {
          'Accept': 'application/json',
        },
      });
      
      return new Response(resp.body, {
        status: resp.status,
        headers: {
          'Content-Type': resp.headers.get('Content-Type') || 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache',
        },
      });
    }
    
    // Static assets — serve from Cloudflare Pages
    return env.ASSETS.fetch(request);
  },
};
