# Phase 4: Domain Cutover & Cloudflare Worker Deployment Guide

All mutable brand names, domains, PromptPay IDs, and persistence drivers are decoupled so swapping placeholders requires zero UI or psychological logic changes.

## 1. Swap Placeholder Domains & Brand Names
1. Update environment variables in `.env` (or Cloudflare Worker `[vars]` in `cloudflare/wrangler.toml`):
   - `DOMAIN_HOROSCOPE` / `VITE_DOMAIN_HOROSCOPE` -> your live Horoscope domain
   - `DOMAIN_TAROT` / `VITE_DOMAIN_TAROT` -> your live Tarot domain
   - `DOMAIN_DREAM` / `VITE_DOMAIN_DREAM` -> your live Dream domain
2. Optionally edit Thai copy, pricing tiers (`99` / `129` / `199` THB), or free articles inside `src/config/site.config.ts`.

## 2. Native Free Cloudflare Workers + KV Cutover (Zero External DB APIs)
1. Create a free Cloudflare KV namespace:
   ```bash
   npx wrangler kv namespace create PILGRIM_KV
   ```
2. Uncomment `[[kv_namespaces]]` in `cloudflare/wrangler.toml` and insert your namespace ID.
3. Upload server secrets via Wrangler (never expose these with `VITE_`):
   ```bash
   npx wrangler secret put GEMINI_API_KEY
   npx wrangler secret put IP_HASH_SALT
   npx wrangler secret put TOKEN_SIGNING_SECRET
   npx wrangler secret put PROMPTPAY_WEBHOOK_SECRET
   ```
4. Build the Vite frontend (`npm run build`) and deploy with Cloudflare Workers & Assets.

## 3. PromptPay & Gmail OAuth Production Checklist
- Set `PROMPTPAY_ID` to your verified Thai PromptPay mobile number (10 digits) or National ID / Tax ID (13 digits).
- Point your payment gateway webhook to `POST https://<your-domain>/api/webhooks/promptpay` with header `x-promptpay-signature` signed via HMAC-SHA256 using `PROMPTPAY_WEBHOOK_SECRET`.
- Add your production custom domains to Firebase Auth **Authorized domains** in Google Cloud / Firebase Console for Google Sign-In (`gmail.readonly`).
