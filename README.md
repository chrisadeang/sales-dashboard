# Outlet performance dashboard

Vite + vanilla JS dashboard reading the `outlet_weeks` table from Supabase.

## Run locally
```bash
npm install
cp .env.example .env
npm run dev
```

## Deploy to Vercel
1. Push this folder to a GitHub repository.
2. In Vercel: **Add New > Project**, import the repo. The Vite preset is detected automatically
   (build command `npm run build`, output directory `dist`).
3. Before deploying, open **Environment Variables** and add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   (values are in `.env.example`)
4. Click **Deploy**.

If you change an environment variable later, redeploy so the new value is built in.

## Data
Table `public.outlet_weeks`: `outlet, week, sales, target, orders, returns`.
Public read-only access is enforced by Row Level Security. All data loading lives in `src/data.js`.
