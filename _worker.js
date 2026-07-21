// Cloudflare Pages Worker — SPA + admin + API suggestions
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Admin page
    if (path === '/admin' || path === '/admin.html') {
      return env.ASSETS.fetch(new URL('/admin.html', request.url));
    }

    // API suggestions
    if (path === '/api/suggestions') {
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      };
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });

      if (request.method === 'GET') {
        try {
          const auth = request.headers.get('Authorization');
          const adminToken = env.ADMIN_TOKEN || '';
          if (!auth || auth !== `Bearer ${adminToken}`)
            return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          const allKeys = await env.SUGGESTIONS.list();
          const suggestions = [];
          for (const key of allKeys.keys) {
            const val = await env.SUGGESTIONS.get(key.name, 'json');
            if (val) suggestions.push(val);
          }
          suggestions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          return new Response(JSON.stringify(suggestions), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        } catch (e) {
          return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      }

      if (request.method === 'POST') {
        try {
          const body = await request.json();
          const { suggestion, email } = body;
          if (!suggestion || suggestion.trim().length < 10)
            return new Response(JSON.stringify({ error: 'Mínimo 10 caracteres' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          const id = `sug-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          await env.SUGGESTIONS.put(id, JSON.stringify({ id, suggestion: suggestion.trim(), email: email?.trim() || null, createdAt: new Date().toISOString(), read: false }));
          return new Response(JSON.stringify({ success: true, message: '¡Gracias! Tu sugerencia ha sido recibida' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        } catch (e) {
          return new Response(JSON.stringify({ error: 'Error al procesar' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      }
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    // API data — serve from static JSON (no Flask needed)
    if (path.startsWith('/api/')) {
      // Try the static database file first
      if (path === '/api/data' || path === '/api/database') {
        return env.ASSETS.fetch(new URL('/sc_database_es.json', request.url));
      }
      return env.ASSETS.fetch(request);
    }

    // Static files
    const ext = /\.(html|js|css|png|jpg|jpeg|gif|svg|ico|json|webp|woff2?|ttf|eot)$/i;
    if (ext.test(path)) return env.ASSETS.fetch(request);

    // SPA fallback
    try {
      const asset = await env.ASSETS.fetch(request);
      if (asset.status !== 404) return asset;
    } catch (e) {}
    return env.ASSETS.fetch(new URL('/index.html', request.url));
  }
};
