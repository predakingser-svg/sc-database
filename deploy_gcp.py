"""Serve the app on GCP - Flask serves both API and frontend"""
from api.app import app
import os

@app.route('/<path:path>')
def serve_frontend(path):
    import os
    frontend_dir = os.path.join(os.path.dirname(__file__), 'frontend')
    filepath = os.path.join(frontend_dir, path)
    if os.path.isfile(filepath):
        with open(filepath) as f:
            content = f.read()
        if path.endswith('.css'):
            from flask import Response
            return Response(content, mimetype='text/css')
        if path.endswith('.js'):
            from flask import Response
            return Response(content, mimetype='application/javascript')
        if path.endswith('.html'):
            return content
    # Default to index.html
    with open(os.path.join(frontend_dir, 'index.html')) as f:
        return f.read()

@app.route('/')
def root():
    with open(os.path.join(os.path.dirname(__file__), 'frontend', 'index.html')) as f:
        return f.read()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    print(f"🚀 Servidor en http://0.0.0.0:{port}")
    app.run(host='0.0.0.0', port=port, debug=False)
