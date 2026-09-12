# Emstan Tech storefront

A responsive Next.js storefront for managed domain registration and hosting
packages from Emstan Tech.

## Current functionality

- `.com`, `.org` and `.net` first-year packages
- Responsive domain request form
- Server-side validation
- Private order storage in Supabase
- Manual domain approval before payment
- Paystack test-mode checkout after approval and configured NGN prices
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
