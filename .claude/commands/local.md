Start a local Python HTTPS server with CORS + ngrok tunnel for mobile dev. Worktree-aware: auto-detects worktree root and picks a free port.

## Steps

0. Check that `localhost+1.pem` and `localhost+1-key.pem` exist in the repo root. If either is missing, tell the user to run:
   ```
   brew install mkcert
   mkcert -install
   mkcert localhost 127.0.0.1
   ```
   Then stop — do not continue until the certs exist.

   **Find cert paths:** Certs always live in the main repo root (not the worktree). Resolve via:
   ```
   MAIN_ROOT=$(git worktree list | head -1 | awk '{print $1}')
   ```
   Use `$MAIN_ROOT/localhost+1.pem` and `$MAIN_ROOT/localhost+1-key.pem` in step 2.

0.5. **Detect worktree:**
   ```
   git rev-parse --git-dir
   ```
   If the output contains `/worktrees/` → you are in a worktree.

   ```
   SERVE_ROOT=$(git rev-parse --show-toplevel)
   ```
   This is the directory the server will serve from (worktree root or main repo root).

1. **Find a free port:**
   - Start at 8080. Check each port with `lsof -ti:<port>`.
   - If 8080 is free, use it.
   - If 8080 is in use:
     - If NOT in a worktree: kill the process holding 8080 (existing behaviour).
     - If in a worktree: don't kill — try 8081, 8082, ... up to 8089. Use the first free port.
   - If all ports 8080–8089 are taken, stop and tell the user.
   - Store the chosen port as `PORT`.

2. Start the server in the background from `SERVE_ROOT` using this exact Python one-liner (with `MAIN_ROOT` for cert paths and `PORT` for the port):
   ```
   cd "$SERVE_ROOT" && python3 -c "
   import ssl, http.server

   class CORSHandler(http.server.SimpleHTTPRequestHandler):
       def end_headers(self):
           self.send_header('Access-Control-Allow-Origin', '*')
           self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
           self.send_header('Access-Control-Allow-Headers', '*')
           self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
           super().end_headers()
       def do_OPTIONS(self):
           self.send_response(200)
           self.end_headers()
       def log_message(self, fmt, *args):
           print(fmt % args, flush=True)

   ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
   ctx.load_cert_chain('$MAIN_ROOT/localhost+1.pem', '$MAIN_ROOT/localhost+1-key.pem')
   s = http.server.HTTPServer(('0.0.0.0', $PORT), CORSHandler)
   s.socket = ctx.wrap_socket(s.socket, server_side=True)
   print('HTTPS server on https://localhost:$PORT')
   s.serve_forever()
   "
   ```

3. Wait 2 seconds, then verify the server is responding with a 200 from:
   ```
   curl -k https://localhost:$PORT/projects/ready-hit-play-prod/work-dial.js
   ```

4. Kill any existing ngrok process, then start an ngrok tunnel with the traffic policy:
   ```
   pkill -f "ngrok http" 2>/dev/null
   ngrok http https://localhost:$PORT --traffic-policy-file ngrok-policy.yml
   ```
   Run in background. Wait 3 seconds, then get the public URL:
   ```
   curl -s http://127.0.0.1:4040/api/tunnels | python3 -c "import sys,json; t=json.load(sys.stdin)['tunnels']; print(t[0]['public_url'] if t else 'no tunnel')"
   ```
   Extract just the subdomain (everything before `.ngrok-free.dev`).

5. Report back:
   - **Serving from:** `$SERVE_ROOT` (note if worktree or main repo)
   - **Port:** `$PORT`
   - **Desktop dev URL:** `https://localhost:$PORT/projects/ready-hit-play-prod/init.js`
   - **Staging with local override:** `https://rhpcircle.webflow.io/?rhp=local&rhp-port=$PORT`
   - If worktree and port ≠ 8080: note "`?rhp-port=$PORT` persists the port to localStorage — init.js will load from this worktree's server on every page until `?rhp=cdn` clears it"
   - Confirm the ngrok tunnel is live
   - Show the mobile dev URL: `https://rhpcircle.webflow.io/?dev=<subdomain>`
   - Remind: `?rhp=cdn` on any page to revert to CDN (clears both source and port)
   - Remind: orange dot top-left = loading from local machine
