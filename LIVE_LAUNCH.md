# Emstan Tech: staged live NGN launch

This release can take **real NGN** payments only after you explicitly enable them. Direct USD collection remains off. The $20 reference package for .com/.org is charged at **₦28,400**, fixed; the $23 reference package for .net still receives a converted NGN quote. A foreign-issued card may pay the NGN amount if Paystack and its bank accept the card; conversion and fees are determined by the issuer.

## Before uploading any code

1. Confirm your Paystack business is **approved for live NGN collection** (not just Pre-Approved) and your Vercel plan allows a commercial site. Confirm you can supply the stated one-year domain/hosting package and a refund process.
2. In **Supabase → SQL Editor**, run `supabase/live-migration.sql` exactly **once** for your existing `orders` table. This preserves all existing records as `test`, and permits a new live order for a domain previously used in a test order. If it fails, stop and inspect the SQL error; do not deploy this code against an unmigrated table.
3. Upload this project’s **contents** to GitHub (`app`, `lib`, `supabase`, files at the root). Never upload `.env.local`, real keys, or `node_modules`. Wait for Vercel to deploy the new GitHub commit.

## Stage in Vercel (Production environment)

In Project → Settings → Environment Variables, set:

| Name | Value |
| --- | --- |
| `PAYSTACK_MODE` | `live` |
| `LIVE_CHECKOUT_ENABLED` | `false` |
| `PAYSTACK_LIVE_SECRET_KEY` | Your actual **live** secret starting `sk_live_` (secret, server-side only) |
| `PAYSTACK_SECRET_KEY` | Keep the existing `sk_test_` key so old pending test orders can still be verified |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY` | Your existing project URL and server-side secret |
| `APP_BASE_URL` | `https://emstan-tech-storefront-ecru.vercel.app` or your current production HTTPS origin |
| `PAYSTACK_TEST_USD_ENABLED` | `false` |

`NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`, `PRICE_*_NGN_KOBO`, and `PAYSTACK_USD_ENABLED` are not used by this checkout. **No public variable should contain a secret key.** Set variables in Vercel only, never in GitHub, a screenshot, or chat. Redeploy Production after changing variables; an existing deployment does not automatically pick up all new values.

In **Paystack Live dashboard → Settings → API Keys & Webhooks**, set the live webhook URL to `https://emstan-tech-storefront-ecru.vercel.app/api/paystack/webhook` (replace with your actual production origin if changed). The handler authenticates Paystack's SHA-512 signature with the matching live/test secret, then independently verifies the payment reference, email, amount, and currency before marking a matching-mode order paid. Your HTTPS callback and webhook must reach the deployed app.

## Verify while real charging remains off

Optional customer email: before deploying this release, run `supabase/payment-email-migration.sql` in Supabase SQL Editor (safe for existing orders). To send Emstan Tech-branded confirmation emails, verify **your own** sending domain with Resend and set `RESEND_API_KEY` as a Vercel Production Secret plus `PAYMENT_EMAIL_FROM` as an address on that verified domain. Redeploy. Do not use a customer's requested domain as sender or paste an API key in GitHub/chat. After a verified **live** payment, the email lists the domain, reference, charged amount, one-year registration, 20 GB SSD hosting, 30 professional mailboxes, AI for WordPress and AI Website Builder. It explicitly says registration and hosting setup are pending. Test orders do not trigger this email. If email configuration is absent, payment can still be recorded as paid, but no custom email is sent. Investigate delivery errors in Vercel and Resend logs; a stuck `payment_email_claimed_at` should be reconciled against Resend before it is reset to prevent duplicate confirmations.

1. Create a **new** domain request; in Supabase `orders`, its `payment_mode` should be `live`, `status` should be `awaiting_review`.
2. The storefront now queries the `.com`, `.org` and `.net` registration records and prevents a new request or checkout when it finds a registered domain. **"No registration record found" does not prove the name can be bought:** independently check availability at the registrar, reserved/premium status, current cost, ownership data, and your hosting capacity. Only then edit that row's `status` to exactly `approved`. A registry outage temporarily blocks requests and new checkout attempts; do not bypass it by accepting payment manually without checking the domain.
3. At `/order`, use its reference and email. For a .com/.org order confirm it shows **₦28,400** and **Checkout unavailable**. Old test orders stay labeled `TEST ORDER`; they cannot be charged with the live key. An old pending payment link generated at another price must be reconciled manually; do not reuse it.
4. Verify Vercel Production environment, Paystack live webhook, final quote/markup, business readiness, and the appropriate customer terms. This application does **not** automatically register domains, provision hosting, or email confirmations.

## Enable a controlled real transaction

Change **only** `LIVE_CHECKOUT_ENABLED` to `true` in Vercel Production and **redeploy**. Approve a new, independently available domain request and make a small controlled real NGN purchase only if you are prepared to fulfill it or refund it. Confirm the amount on Paystack's hosted checkout, then verify payment in Paystack Live transactions **and** `orders.status = paid`, `payment_currency = NGN`, `payment_mode = live` before registering the domain or supplying hosting. A callback alone does not prove payment. Check that `/order` shows a real receipt for that live order. Verify an abandoned checkout stays `payment_pending`.

If anything goes wrong, set `LIVE_CHECKOUT_ENABLED=false` in Production and redeploy. This blocks **new** checkout initializations and links on the website, but **cannot cancel an existing Paystack checkout URL that a customer already opened**. To halt those as well, ask Paystack to disable collections and reconcile pending transactions. Do not delete paid records or mislabel test receipts. Handle refunds via Paystack and your stated policy.

For live NGN orders, direct USD is always disabled regardless of old USD flags. Do not enable real USD until Paystack formally supports your USD collection and settlement arrangements.
