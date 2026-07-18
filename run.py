"""Unified server: API + Frontend"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))

from api.app import app
from flask import send_from_directory

FRONTEND = os.path.join(os.path.dirname(__file__), 'frontend')

# Remove the JSON root route and serve frontend instead
# We do this by adding a catch-all AFTER the API routes
@app.after_request
def add_header(r):
    r.headers["Access-Control-Allow-Origin"] = "*"
    return r

# Catch-all for frontend files - handle AFTER api routes
@app.route('/', defaults={'path': 'index.html'})
@app.route('/<path:path>')
def frontend(path):
    # Don't intercept API routes
    if path.startswith('api/') or path == 'stats' or path == 'missions' or \
       path.startswith('missions/') or path == 'blueprints' or path.startswith('blueprints/') or \
       path == 'weapons' or path.startswith('weapons/') or path == 'wikelo' or \
       path.startswith('wikelo/') or path == 'items' or path.startswith('items/') or \
       path == 'search' or path.startswith('search/'):
        from flask import request
        return app.full_dispatch_request() if hasattr(app, 'full_dispatch_request') else ('Not found', 404)
    
    filepath = os.path.join(FRONTEND, path)
    if os.path.isfile(filepath):
        return send_from_directory(FRONTEND, path)
    return send_from_directory(FRONTEND, 'index.html')

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    print(f"🚀 SC Database en http://0.0.0.0:{port}")
    print(f"   API: http://localhost:{port}/stats")
    print(f"   Web: http://localhost:{port}/ (frontend)")
    app.run(host='0.0.0.0', port=port, debug=False)
