# Emstan Tech storefront

A responsive Next.js storefront for managed domain registration and hosting
packages from Emstan Tech.

## Current functionality

- `.com`, `.org` and `.net` first-year packages
- Responsive domain request form
- Registry RDAP lookup for `.com`, `.org` and `.net`: identifies already-registered names and blocks them before request or new checkout
- Server-side validation
- Private order storage in Supabase
- Manual domain approval before payment
- Isolated test/live Paystack orders; live NGN checkout requires explicit rollout flags
- Fixed ₦28,400 first-year checkout for .com/.org ($20 reference); .net retains a 15-minute converted Naira quote ($23 reference)
- Server-side payment verification and signed Paystack webhook
- Order-status page and printable payment receipt after verification
- Safe refund and renewal information
- Direct WhatsApp support

## Local development

1. Copy `.env.example` to `.env.local` and add your own test credentials.
2. Install dependencies with `pnpm install`.
3. Run `pnpm dev`.

See `VERCEL_DEPLOYMENT.md` for the full deployment checklist.

Important: a missing RDAP registration record is **not** a guarantee that a name can
be purchased (it could be reserved, premium, or unavailable at your registrar).
An unreachable registry returns "could not verify" and prevents a new request or
checkout rather than claiming the name is available. Check the exact name, cost,
and registrability in your registrar before approving a request. No automatic
registration, hosting provisioning, or email delivery is included. An approved request means a person has checked it;
payment is not proof the domain has already been registered.
Dollar reference pricing is $20 for .com/.org and $23 for .net. Checkout charges
₦28,400 for .com/.org, independently of exchange-rate fluctuations. For .net,
the server still converts the $23 reference price using ExchangeRate-API's daily
USD/NGN rate (https://www.exchangerate-api.com), optionally adding the configured
`FX_MARGIN_PERCENT` (default 0). Each approved order receives a 15-minute locked
quote. If a fresh rate cannot be obtained, .net NGN checkout is unavailable until
one returns; .com/.org remain unaffected. Foreign-card issuers may use a different
rate and add fees. The website charges NGN by default. You can opt in to USD
  **test** checkout with `PAYSTACK_TEST_USD_ENABLED=true`; this never enables
real USD collection. See `LIVE_LAUNCH.md` before enabling real NGN payments.
