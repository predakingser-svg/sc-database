// Star Citizen Database — Cloudflare Pages Worker
// Sirve archivos estáticos. Sin backend, sin tunnel.
export default {
  async fetch(request, env) {
    return env.ASSETS.fetch(request);
  },
};
