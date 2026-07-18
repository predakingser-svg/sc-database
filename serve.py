"""SC Database - Unified server: API + Frontend"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))

# Import the Flask app
from api.app import app
from flask import send_from_directory

FRONTEND = os.path.join(os.path.dirname(__file__), 'frontend')

# Override root to serve frontend
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def catch_all(path):
    if path == '' or path == '/':
        return send_from_directory(FRONTEND, 'index.html')
    filepath = os.path.join(FRONTEND, path)
    if os.path.isfile(filepath):
        return send_from_directory(FRONTEND, path)
    return send_from_directory(FRONTEND, 'index.html')

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=False)
