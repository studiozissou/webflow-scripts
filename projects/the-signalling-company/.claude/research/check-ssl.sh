#!/usr/bin/env bash
# TSC SSL provisioning checker — launch incident 2026-07-16
# Exits 0 (with LIVE line) once the cert is served; exits 1 while still provisioning.
D=thesignallingcompany.com

cert=$(echo | openssl s_client -connect www.$D:443 -servername www.$D 2>/dev/null \
  | openssl x509 -noout -subject -issuer -dates 2>/dev/null)

code=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 15 https://www.$D/ 2>/dev/null)

if [ -n "$cert" ] && [ "$code" != "000" ]; then
  echo "LIVE — SSL certificate is being served."
  echo "HTTP $code"
  echo "$cert"
  exit 0
else
  echo "STILL PROVISIONING — no cert served yet (edge TLS handshake failing)."
  exit 1
fi
