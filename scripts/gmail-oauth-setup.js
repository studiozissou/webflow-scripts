#!/usr/bin/env node
/**
 * Gmail OAuth Setup — one-time script to get a refresh token for e2e tests.
 *
 * Prerequisites:
 *   1. Go to https://console.cloud.google.com/apis/library/gmail.googleapis.com
 *   2. Enable the Gmail API
 *   3. Go to Credentials → Create Credentials → OAuth Client ID
 *   4. Application type: "Desktop app"
 *   5. Download the JSON and note the client_id and client_secret
 *
 * Usage:
 *   node scripts/gmail-oauth-setup.js <client_id> <client_secret>
 *
 * The script will:
 *   1. Open a browser for Google login
 *   2. Listen on localhost:3000 for the redirect
 *   3. Exchange the code for tokens
 *   4. Print the refresh token to add to .env.test
 */

const http = require('http');
const { google } = require('googleapis');
const { exec } = require('child_process');

const clientId = process.argv[2];
const clientSecret = process.argv[3];

if (!clientId || !clientSecret) {
  console.error('\nUsage: node scripts/gmail-oauth-setup.js <client_id> <client_secret>\n');
  console.error('Get these from Google Cloud Console → APIs & Services → Credentials');
  console.error('Create an OAuth 2.0 Client ID with type "Desktop app"\n');
  process.exit(1);
}

const REDIRECT_URI = 'http://localhost:3000/oauth2callback';
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent', // force refresh token
});

const server = http.createServer(async (req, res) => {
  if (!req.url.startsWith('/oauth2callback')) {
    res.writeHead(404);
    res.end();
    return;
  }

  const url = new URL(req.url, 'http://localhost:3000');
  const code = url.searchParams.get('code');

  if (!code) {
    res.writeHead(400);
    res.end('No authorization code received.');
    server.close();
    return;
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<h1>Done! You can close this tab.</h1><p>Check your terminal for the refresh token.</p>');

    console.log('\n✓ OAuth setup complete!\n');
    console.log('Add these to your .env.test:\n');
    console.log(`GMAIL_CLIENT_ID=${clientId}`);
    console.log(`GMAIL_CLIENT_SECRET=${clientSecret}`);
    console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log(`GMAIL_TEST_ADDRESS=will@teamzzissou.io`);
    console.log('');
  } catch (err) {
    res.writeHead(500);
    res.end('Token exchange failed: ' + err.message);
    console.error('Token exchange failed:', err.message);
  }

  server.close();
});

server.listen(3000, () => {
  console.log('\nGmail OAuth Setup');
  console.log('=================\n');
  console.log('Opening browser for Google login...\n');
  console.log('If the browser doesn\'t open, visit:\n');
  console.log(authUrl + '\n');

  // Open browser (macOS)
  exec(`open "${authUrl}"`);
});
