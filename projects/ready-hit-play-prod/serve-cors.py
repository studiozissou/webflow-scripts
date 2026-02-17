#!/usr/bin/env python3
"""
Local dev server with CORS headers.
Use when viewing Webflow preview (rhpcircle.webflow.io) with localhost assets.
Fonts and other cross-origin resources will load correctly.

Run from repo root: python3 projects/ready-hit-play-prod/serve-cors.py
Then in Webflow custom code, point init/CSS to: http://localhost:8080/projects/ready-hit-play-prod/
"""
import http.server
import socketserver
import os

PORT = 8080
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.chdir(ROOT)


class CORSRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()


with socketserver.TCPServer(("", PORT), CORSRequestHandler) as httpd:
    print(f"CORS server: http://localhost:{PORT}")
    print(f"Assets base: http://localhost:{PORT}/projects/ready-hit-play-prod/")
    httpd.serve_forever()
