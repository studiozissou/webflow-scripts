Start a local Python HTTP server with CORS on port 8080, serving the repo root.

## Steps

1. Check if something is already listening on port 8080:
   ```
   lsof -ti:8080
   ```
   If a process is found, kill it first so the port is free.

2. Start the server in the background from the repo root using this exact Python one-liner:
   ```
   python3 -c "
   import http.server, sys

   class CORSHandler(http.server.SimpleHTTPRequestHandler):
       def end_headers(self):
           self.send_header('Access-Control-Allow-Origin', '*')
           self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
           self.send_header('Access-Control-Allow-Headers', '*')
           self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
           super().end_headers()
       def log_message(self, fmt, *args):
           print(fmt % args, flush=True)

   http.server.test(HandlerClass=CORSHandler, port=8080, bind='0.0.0.0')
   "
   ```

3. Wait 2 seconds, then verify the server is responding with a 200 from:
   ```
   http://localhost:8080/projects/ready-hit-play-prod/work-dial.js
   ```

4. Report back:
   - Confirm the server is live on `http://localhost:8080`
   - Remind the user that `init.js` detects `localhost` origin and loads all modules from disk automatically
   - Show the direct URL for the active project's entry file: `http://localhost:8080/projects/ready-hit-play-prod/init.js`
