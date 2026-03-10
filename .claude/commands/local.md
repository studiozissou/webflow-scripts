Start a local Python HTTPS server with CORS on port 8080, serving the repo root.

## Steps

0. Check that `localhost+1.pem` and `localhost+1-key.pem` exist in the repo root. If either is missing, tell the user to run:
   ```
   brew install mkcert
   mkcert -install
   mkcert localhost 127.0.0.1
   ```
   Then stop — do not continue until the certs exist.

1. Check if something is already listening on port 8080:
   ```
   lsof -ti:8080
   ```
   If a process is found, kill it first so the port is free.

2. Start the server in the background from the repo root using this exact Python one-liner:
   ```
   python3 -c "
   import ssl, http.server

   class CORSHandler(http.server.SimpleHTTPRequestHandler):
       def end_headers(self):
           self.send_header('Access-Control-Allow-Origin', '*')
           self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
           self.send_header('Access-Control-Allow-Headers', '*')
           self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
           super().end_headers()
       def log_message(self, fmt, *args):
           print(fmt % args, flush=True)

   ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
   ctx.load_cert_chain('localhost+1.pem', 'localhost+1-key.pem')
   s = http.server.HTTPServer(('0.0.0.0', 8080), CORSHandler)
   s.socket = ctx.wrap_socket(s.socket, server_side=True)
   print('HTTPS server on https://localhost:8080')
   s.serve_forever()
   "
   ```

3. Wait 2 seconds, then verify the server is responding with a 200 from:
   ```
   curl -k https://localhost:8080/projects/ready-hit-play-prod/work-dial.js
   ```

4. Report back:
   - Confirm the server is live on `https://localhost:8080`
   - Remind the user that `init.js` detects `localhost` origin and loads all modules from disk automatically
   - Show the direct URL for the active project's entry file: `https://localhost:8080/projects/ready-hit-play-prod/init.js`
