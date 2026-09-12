# Emstan Tech storefront

A responsive Next.js storefront for managed domain registration and hosting
packages from Emstan Tech.

## Current functionality

- `.com`, `.org` and `.net` first-year packages
- Responsive domain request form
- Server-side validation
- Private order storage in Supabase
- Manual domain approval before payment
- Paystack test-mode NGN checkout after approval; direct USD checkout remains gated
- Daily USD/NGN reference rate, 15-minute locked Naira quote, and source attribution
- Server-side payment verification and signed Paystack webhook
- Order-status page and printable payment receipt after verification
- Safe refund and renewal information
- Direct WhatsApp support

## Local development

1. Copy `.env.example` to `.env.local` and add your own test credentials.
2. Install dependencies with `pnpm install`.
3. Run `pnpm dev`.

See `VERCEL_DEPLOYMENT.md` for the full deployment checklist.

Important: no automatic availability lookup, registration, hosting provisioning, or
email delivery is included. An approved request means a person has checked it;
payment is not proof the domain has already been registered.
Dollar reference pricing is $20 for .com/.org and $23 for .net. For NGN checkout,
the server converts using ExchangeRate-API's daily USD/NGN reference rate
(https://www.exchangerate-api.com), optionally adding the explicitly configured
`FX_MARGIN_PERCENT` (default 0). Each approved order receives a 15-minute locked
quote. If a fresh rate cannot be obtained, NGN checkout is unavailable until a
valid rate returns. The customer's foreign-card issuer may use a different rate
and add fees. The website charges NGN, not USD, unless USD checkout is separately enabled.
