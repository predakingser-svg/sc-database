// Cloudflare Pages Worker — SPA + admin + API data from static JSON
// v2.1 - serves all API endpoints from sc_database_es.json

// Cache the parsed database
let dbCache = null;
async function getDB(env) {
  if (dbCache) return dbCache;
  try {
    const resp = await env.ASSETS.fetch(new URL('/sc_database_es.json', 'https://placeholder'));
    if (!resp.ok) return null;
    dbCache = await resp.json();
    return dbCache;
  } catch { return null; }
}

function corsHeaders(origin = '*') {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS preflight
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders() });

    // Serve static assets
    const staticExt = /\.(html|js|css|png|jpg|jpeg|gif|svg|ico|json|webp|woff2?|ttf|eot)$/i;
    if (staticExt.test(path) || path === '/admin.html') {
      return env.ASSETS.fetch(request);
    }

    // API: /stats
    if (path === '/stats') {
      const db = await getDB(env);
      if (!db) return new Response(JSON.stringify({ error: 'No data' }), { status: 503, headers: corsHeaders() });
      return new Response(JSON.stringify({
        total_missions: (db.missions || []).length,
        total_blueprints: (db.blueprints || []).length,
        total_weapons: (db.weapons || []).length,
        total_components: (db.components || []).length,
        total_minerals: (db.minerals || []).length,
        total_items: (db.items || []).length,
        total_wikelo: (db.wikelo || []).length,
        total_ships: (db.ships || []).length,
        version: db.version || '4.9.0-live',
      }), { headers: corsHeaders() });
    }

    // API: /missions
    if (path === '/missions') {
      const db = await getDB(env);
      if (!db) return new Response('[]', { status: 200, headers: corsHeaders() });
      const perPage = parseInt(url.searchParams.get('per_page')) || 500;
      return new Response(JSON.stringify((db.missions || []).slice(0, perPage)), { headers: corsHeaders() });
    }

    // API: /blueprints
    if (path === '/blueprints') {
      const db = await getDB(env);
      if (!db) return new Response('[]', { status: 200, headers: corsHeaders() });
      const perPage = parseInt(url.searchParams.get('per_page')) || 500;
      return new Response(JSON.stringify((db.blueprints || []).slice(0, perPage)), { headers: corsHeaders() });
    }

    // API: /weapons
    if (path === '/weapons') {
      const db = await getDB(env);
      return new Response(JSON.stringify(db?.weapons || []), { headers: corsHeaders() });
    }

    // API: /items
    if (path === '/items') {
      const db = await getDB(env);
      return new Response(JSON.stringify(db?.items || []), { headers: corsHeaders() });
    }

    // API: /wikelo
    if (path === '/wikelo') {
      const db = await getDB(env);
      return new Response(JSON.stringify(db?.wikelo || []), { headers: corsHeaders() });
    }

    // API: /api/suggestions (unchanged)
    if (path === '/api/suggestions') {
      // ... keep existing suggestions code
      const corsH = corsHeaders();
      if (request.method === 'GET') {
        try {
          const auth = request.headers.get('Authorization');
          const adminToken = env.ADMIN_TOKEN || '';
          if (!auth || auth !== `Bearer ${adminToken}`)
            return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { ...corsH } });
          const allKeys = await env.SUGGESTIONS.list();
          const suggestions = [];
          for (const key of allKeys.keys) {
            const val = await env.SUGGESTIONS.get(key.name, 'json');
            if (val) suggestions.push(val);
          }
          suggestions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          return new Response(JSON.stringify(suggestions), { headers: corsH });
        } catch (e) {
          return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsH });
        }
      }
      if (request.method === 'POST') {
        try {
          const body = await request.json();
          const { suggestion, email } = body;
          if (!suggestion || suggestion.trim().length < 10)
            return new Response(JSON.stringify({ error: 'Mínimo 10 caracteres' }), { status: 400, headers: corsH });
          const id = `sug-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          await env.SUGGESTIONS.put(id, JSON.stringify({ id, suggestion: suggestion.trim(), email: email?.trim() || null, createdAt: new Date().toISOString(), read: false }));
          return new Response(JSON.stringify({ success: true, message: '¡Gracias!' }), { headers: corsH });
        } catch { return new Response(JSON.stringify({ error: 'Error' }), { status: 500, headers: corsH }); }
      }
      return new Response('Method not allowed', { status: 405, headers: corsH });
    }

    // SPA fallback
    try {
      const asset = await env.ASSETS.fetch(request);
      if (asset.status !== 404) return asset;
    } catch {}
    return env.ASSETS.fetch(new URL('/index.html', request.url));
  }
};
