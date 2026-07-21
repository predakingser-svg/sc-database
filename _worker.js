// Cloudflare Pages Worker — SPA + suggestions + static JSON data
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Serve the database JSON directly (no worker processing)
    if (path === '/sc_database_es.json') {
      const resp = await env.ASSETS.fetch(new URL('/sc_database_es.json', request.url));
      if (resp.ok) return resp;
      return new Response('{"error":"not_found"}', { 
        status: 404, 
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
      });
    }

    // Admin page
    if (path === '/admin' || path === '/admin.html') {
      return env.ASSETS.fetch(new URL('/admin.html', request.url));
    }

    // API suggestions
    if (path === '/api/suggestions') {
      const corsH = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsH });
      if (request.method === 'GET') {
        try {
          const auth = request.headers.get('Authorization');
          const adminToken = env.ADMIN_TOKEN || '';
          if (!auth || auth !== `Bearer ${adminToken}`)
            return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { ...corsH, 'Content-Type': 'application/json' } });
          const allKeys = await env.SUGGESTIONS.list();
          const suggestions = [];
          for (const key of allKeys.keys) {
            const val = await env.SUGGESTIONS.get(key.name, 'json');
            if (val) suggestions.push(val);
          }
          suggestions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          return new Response(JSON.stringify(suggestions), { headers: { ...corsH, 'Content-Type': 'application/json' } });
        } catch (e) {
          return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsH, 'Content-Type': 'application/json' } });
        }
      }
      if (request.method === 'POST') {
        try {
          const body = await request.json();
          const { suggestion, email } = body;
          if (!suggestion || suggestion.trim().length < 10)
            return new Response(JSON.stringify({ error: 'Mínimo 10 caracteres' }), { status: 400, headers: { ...corsH, 'Content-Type': 'application/json' } });
          const id = `sug-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          await env.SUGGESTIONS.put(id, JSON.stringify({ id, suggestion: suggestion.trim(), email: email?.trim() || null, createdAt: new Date().toISOString(), read: false }));
          return new Response(JSON.stringify({ success: true }), { headers: { ...corsH, 'Content-Type': 'application/json' } });
        } catch {
          return new Response(JSON.stringify({ error: 'Error' }), { status: 500, headers: { ...corsH, 'Content-Type': 'application/json' } });
        }
      }
      return new Response('Method not allowed', { status: 405, headers: corsH });
    }

    // Static assets (js, css, etc.)
    if (/\.(html|js|css|png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|eot)$/i.test(path)) {
      return env.ASSETS.fetch(request);
    }

    // SPA fallback
    try {
      const asset = await env.ASSETS.fetch(request);
      if (asset.status !== 404) return asset;
    } catch {}
    return env.ASSETS.fetch(new URL('/index.html', request.url));
  }
};
