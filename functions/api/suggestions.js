// Cloudflare Pages Function — Buzón de Sugerencias
// Guarda sugerencias en KV Storage

export async function onRequest(context) {
    const { request, env } = context;
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    // GET — devolver todas las sugerencias (solo para admin)
    if (request.method === 'GET') {
        try {
            // Verificar token simple en header
            const auth = request.headers.get('Authorization');
            const adminToken = env.ADMIN_TOKEN || '';
            
            if (!auth || auth !== `Bearer ${adminToken}`) {
                return new Response(JSON.stringify({ error: 'No autorizado' }), {
                    status: 401,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            const allKeys = await env.SUGGESTIONS.list();
            const suggestions = [];
            for (const key of allKeys.keys) {
                const val = await env.SUGGESTIONS.get(key.name, 'json');
                suggestions.push(val);
            }
            suggestions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            return new Response(JSON.stringify(suggestions), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (e) {
            return new Response(JSON.stringify({ error: e.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }

    // POST — recibir nueva sugerencia
    if (request.method === 'POST') {
        try {
            const body = await request.json();
            const { suggestion, email } = body;

            if (!suggestion || suggestion.trim().length < 10) {
                return new Response(JSON.stringify({ 
                    error: 'La sugerencia debe tener al menos 10 caracteres' 
                }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            const id = `sug-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            const entry = {
                id,
                suggestion: suggestion.trim(),
                email: email?.trim() || null,
                createdAt: new Date().toISOString(),
                read: false
            };

            await env.SUGGESTIONS.put(id, JSON.stringify(entry));

            return new Response(JSON.stringify({ 
                success: true,
                message: '¡Gracias! Tu sugerencia ha sido recibida'
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (e) {
            return new Response(JSON.stringify({ error: 'Error al procesar la sugerencia' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }

    return new Response('Method not allowed', { status: 405 });
}
