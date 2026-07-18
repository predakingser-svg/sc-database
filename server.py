"""Single-file server: API + Frontend"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from api.app import app
from flask import send_from_directory

FRONTEND = os.path.join(os.path.dirname(__file__), 'frontend')

@app.route('/')
def index():
    return send_from_directory(FRONTEND, 'index.html')

@app.route('/style.css')
def style_css():
    return send_from_directory(FRONTEND, 'style.css')

@app.route('/app.js')
def app_js():
    return send_from_directory(FRONTEND, 'app.js')

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    print(f"🚀 API + Frontend en http://0.0.0.0:{port}")
    app.run(host='0.0.0.0', port=port, debug=False)
