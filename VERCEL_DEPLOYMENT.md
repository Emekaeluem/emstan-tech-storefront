# Emstan Tech deployment checklist

## 1. Create the Supabase table

1. Open your Supabase project.
2. Select **SQL Editor**.
3. Open `supabase/schema.sql` from this project.
4. Copy the complete SQL into the editor and select **Run**.

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
5. Select **Deploy**.

## Important launch note

This version saves domain requests securely in Supabase. It intentionally does
not charge customers yet. Paystack initialization, verification, webhook
handling, naira prices and receipt generation must be completed and tested
before live payments are enabled.
