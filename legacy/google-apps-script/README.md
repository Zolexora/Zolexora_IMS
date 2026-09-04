# Google Apps Script (Legacy Deployment)

This directory contains the original Google Apps Script (GAS) deployment files for Zolexora IMS.

## Structure
- `appsscript.json`: Google Apps Script manifest
- `.clasp.json`: Clasp configuration pointing to the Apps Script project
- `.claspignore`: Clasp push filter
- `server/`: Server-side `.js` scripts (formerly executed in GAS runtime)
- `client/`: HTML templates rendered via `HtmlService`

## Modern Migration
The active production application has been migrated to Cloudflare Workers with Cloudflare D1 (SQLite) and KV sessions:
- Multi-Tenant Business IMS: `apps/ims/` (deployed at https://ims.zolexora.workers.dev)
- Platform SuperAdmin Console: `apps/admin/` (deployed at https://admin-ims.zolexora.workers.dev)
