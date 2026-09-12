# Emstan Tech deployment checklist

## 1. Create the Supabase table

1. Open your Supabase project.
2. Select **SQL Editor**.
3. Open `supabase/schema.sql` from this project.
4. Copy the complete SQL into the editor and select **Run**.

If you already created the `orders` table, **do not recreate it**. Instead,
run the additive `supabase/payment-migration.sql` in the Supabase SQL Editor.
It retains existing orders and adds payment and exchange-quote fields. If you ran
an earlier version of this migration, run the updated version again **before**
uploading the updated website files.

## 2. Get the Supabase credentials

In Supabase, open **Project Settings > API** (or **Connect** if your dashboard
shows the newer interface). Copy the project URL and the server-side secret
key. Do not share the secret key or upload it to GitHub.

## 3. Upload this project to GitHub

Open your empty `emstan-tech-storefront` repository, choose **Add file > Upload
files**, and upload the contents of this extracted folder. Commit the files to
the `main` branch.

## 4. Import the repository into Vercel

1. In Vercel, select **Add New > Project**.
2. Import `emstan-tech-storefront` from GitHub.
3. Keep **Framework Preset** as Next.js and **Root Directory** as `./`.
4. Add `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, your Paystack test keys and
   `APP_BASE_URL` as environment variables.
   Set `APP_BASE_URL` to the exact HTTPS address of your production website.
   Set `PAYSTACK_USD_ENABLED=false`. Optionally set `FX_MARGIN_PERCENT=0`
   (default 0%; a larger percentage explicitly raises the NGN price). The old
   `PRICE_*_NGN_KOBO` variables are no longer used and may be removed. No FX API
   key is required. The USD reference prices are fixed at `$20` for `.com` or
   `.org` and `$23` for `.net`.
5. Select **Deploy**.

## 5. Configure the test checkout

1. Keep the Paystack secret key in **test mode** (`sk_test_`). This app deliberately
   rejects live keys while this payment flow is being tested. Never put it in GitHub.
   USD checkout is disabled until you confirm Paystack has activated USD
   transactions for your business. For a Nigeria-based business, Paystack says
   USD payout requires a verified Zenith Bank USD domiciliary account. Once
   confirmed, add `PAYSTACK_USD_ENABLED=true` in Vercel and redeploy. Without
   that flag, the website can display USD prices but will not initiate USD charges.
2. On your Paystack test dashboard, set the test webhook URL to
   `https://YOUR-SITE.vercel.app/api/paystack/webhook`.
3. Submit a test domain request. In Supabase **Table Editor → orders**, confirm
   the new row has `awaiting_review`. Independently check the domain can be
   registered and you can supply the advertised hosting. Then set its
   `status` to `approved` and save. Never approve based on the website's search
   field: it only collects the domain; it does not query a registrar.
4. At `/order`, enter the order reference and customer's email. The website
   retrieves a daily USD/NGN rate from ExchangeRate-API and displays an exact
   NGN amount locked for 15 minutes. Select NGN, check the price, open Paystack
   and use a Paystack test payment. If the quote expires, press **Check status**
   for a new price; if rates are unavailable or stale, checkout stays blocked.
   International cards may be charged in NGN if Paystack and the issuing bank
   accept them; the issuer decides any currency conversion and fees.
   Return to `/order` and press **Check status** if needed. Once independently
   verified, the paid order shows a printable Emstan Tech payment receipt.
5. Check unsuccessful/abandoned payments do **not** mark orders paid. For a
   stuck or unsuccessful first checkout, contact Emstan Tech; this initial
   release reuses one Paystack checkout link rather than automatically issuing
   multiple attempts for one order.

## Important launch limits

- This is **test checkout only**; no real money can be accepted with test keys.
- There is no automatic email, domain availability check, registration, hosting
  setup, or automated refund. Fulfil approved paid orders manually.
- Verify your domain availability, pricing, hosting supplier, policies and
  commercial hosting plan before enabling a real payment method. Do not
  switch to a live key without a separate live-readiness and security review.
