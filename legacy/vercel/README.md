# Vercel Static Proxy (Legacy Deployment)

This directory contains the legacy Vercel static wrapper that previously embedded the Google Apps Script web app inside an iframe.

## Files
- `vercel.json`: Vercel routing and security header configuration
- `public/index.html`: Wrapper loading screen and iframe embedding

## Modern Replacement
The application now runs natively on Cloudflare Workers edge network (`apps/ims/` and `apps/admin/`) with zero iframe wrappers.
