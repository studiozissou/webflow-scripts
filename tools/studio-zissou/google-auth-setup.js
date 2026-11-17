// One-time Google OAuth consent for the Search Console read-only scope that stores the SZ_GOOGLE_* values in the macOS Keychain (service mcp) and prints only their names.
import { createServer } from 'node:http';
import { execFile, execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = 3000;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;
const SCOPES = ['https://www.googleapis.com/auth/webmasters.readonly'];

export const KEYCHAIN_SERVICE = 'mcp';
export const KEYCHAIN_ACCOUNTS = Object.freeze({
  SZ_GOOGLE_CLIENT_ID: 'sz-google-client-id',
  SZ_GOOGLE_CLIENT_SECRET: 'sz-google-client-secret',
  SZ_GOOGLE_REFRESH_TOKEN: 'sz-google-refresh-token',
});

export function keychainStore(account, value) {
  execFileSync('security', ['add-generic-password', '-U', '-s', KEYCHAIN_SERVICE, '-a', account, '-T', '/usr/bin/security', '-w', value], { stdio: 'ignore' });
}

export function saveTokens({ clientId, clientSecret, tokens }, { store = keychainStore, stdout = process.stdout, stderr = process.stderr } = {}) {
  if (!tokens?.refresh_token) {
    stderr.write('Google returned no refresh token. Revoke the app at myaccount.google.com/permissions and run this again.\n');
    return 1;
  }
  const values = { SZ_GOOGLE_CLIENT_ID: clientId, SZ_GOOGLE_CLIENT_SECRET: clientSecret, SZ_GOOGLE_REFRESH_TOKEN: tokens.refresh_token };
  for (const [name, account] of Object.entries(KEYCHAIN_ACCOUNTS)) store(account, values[name]);
  stdout.write(
    `\nStored in the Keychain (service ${KEYCHAIN_SERVICE}): ${Object.keys(KEYCHAIN_ACCOUNTS).join(', ')}.\n` +
      'report.js reads them from there. Add SZ_GSC_SITE_URL=sc-domain:studiozissou.io to .env.test (not a secret).\n\n',
  );
  return 0;
}

export async function main(argv, { stdout = process.stdout, stderr = process.stderr } = {}) {
  const [clientId, clientSecret] = argv;
  if (!clientId || !clientSecret) {
    stderr.write(
      'usage: node tools/studio-zissou/google-auth-setup.js <client_id> <client_secret>\n' +
        'Create a Desktop OAuth client in Google Cloud Console with the Search Console API enabled.\n',
    );
    return 2;
  }

  const { google } = await import('googleapis');
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);
  const authUrl = oauth2Client.generateAuthUrl({ access_type: 'offline', scope: SCOPES, prompt: 'consent' });

  return new Promise((done) => {
    const server = createServer(async (req, res) => {
      if (!req.url.startsWith('/oauth2callback')) {
        res.writeHead(404);
        res.end();
        return;
      }
      const code = new URL(req.url, `http://localhost:${PORT}`).searchParams.get('code');
      let exitCode = 1;
      if (!code) {
        res.writeHead(400);
        res.end('No authorization code received.');
        stderr.write('No authorization code received.\n');
      } else {
        try {
          const { tokens } = await oauth2Client.getToken(code);
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<h1>Done. You can close this tab.</h1><p>Check your terminal.</p>');
          exitCode = saveTokens({ clientId, clientSecret, tokens }, { stdout, stderr });
        } catch (err) {
          res.writeHead(500);
          res.end('Token exchange failed.');
          stderr.write(`Token exchange failed: ${err.message}\n`);
        }
      }
      server.close(() => done(exitCode));
    });

    server.listen(PORT, () => {
      stdout.write(`\nSearch Console OAuth setup\n\nOpening the browser. If it does not open, visit:\n\n${authUrl}\n\n`);
      execFile('open', [authUrl], () => {});
    });
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2));
}
