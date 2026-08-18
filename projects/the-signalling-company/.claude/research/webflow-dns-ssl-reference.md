# Webflow DNS / SSL — Reference & Launch Notes (TSC)

## Key resource
- **Webflow "Site down" troubleshooting hub:** https://support.webflow.com/resources/site-down
- Manually connect a custom domain: https://help.webflow.com/hc/en-us/articles/33961239562387-Manually-connect-a-custom-domain
- Manually migrate DNS records: https://help.webflow.com/hc/en-us/articles/42394305646611-How-do-I-manually-migrate-my-DNS-records
- Why does my domain show an error status: https://help.webflow.com/hc/en-us/articles/33961341714835-Why-does-my-domain-show-an-error-status

## Correct DNS records (post April-2025 Webflow migration)
Registrar: **Gandi** (NS: `*.dns.gandi.net`)

| Host | Type | Value |
|------|------|-------|
| `@` (apex) | A | `198.202.211.1` |
| `www` | CNAME | `cdn.webflow.com` |
| `_webflow` | TXT | `one-time-verification=…` (from Webflow Publishing panel) |

**Note:** These REPLACED the older values (`75.2.70.75` / `99.83.190.102` / `proxy-ssl.webflow.com`)
in Webflow's April 2025 DNS migration. The panel (Site settings → Publishing → Production)
always shows the authoritative per-site values.

## Launch incident — 2026-07-16
**Symptom:** `ERR_SSL_VERSION_OR_CIPHER_MISMATCH` in browser; live edge returned
`HTTP 409 / Cloudflare error code 1001` (DNS resolution error); no TLS cert served.

**Diagnosis:** NOT a DNS or records problem. DNS was correct and both domains showed
**Connected** in Webflow. Webflow panel showed SSL certificate = **"Update needed"** —
i.e. the certificate was still auto-provisioning after the first Connected publish.

**Root cause:** SSL cert issuance is automatic on the new DNS setup and takes minutes → ~2h
(worst case 48h) after the first publish to the custom domain. During that window the edge
throws 409 / error 1001 and browsers show the cipher-mismatch error.

**Resolution:** Wait for auto-provisioning. Do NOT unpublish, change DNS, or re-add the
domain — each resets the provisioning clock. There is **no manual "regenerate SSL" button**
on the new setup (the `•••` menu only has "Remove domain").

**If stuck > ~2h:** Webflow support chat, exact line:
> "Both domains show Connected but SSL certificate = 'Update needed' after the April 2025
> DNS migration. DNS is correct and verified. Please force-regenerate the certificate."

## Quick diagnostic commands
```bash
D=thesignallingcompany.com
# Live cert check (prints subject/issuer/dates when live; empty = not issued yet)
echo | openssl s_client -connect www.$D:443 -servername www.$D 2>/dev/null | openssl x509 -noout -subject -issuer -dates
# Edge status (409 + "error code: 1001" = SSL still provisioning)
curl -sS -o /dev/null -w "HTTP %{http_code}\n" http://www.$D/ && curl -sS http://www.$D/ | head -1
# Confirm DNS records
dig +short $D A          # expect 198.202.211.1 (single record, no conflicts)
dig +short www.$D CNAME  # expect cdn.webflow.com
dig +short _webflow.$D TXT
```
