# Bob-Tails Player Assessment

## Structure

```
backend/   FastAPI + MySQL
frontend/  React (Vite) → GitHub Pages
```

## Backend setup (VPS)

```bash
cd backend
cp .env.example .env
# edit .env with your DATABASE_URL, COACH_API_KEY, ALLOWED_ORIGINS

uv run uvicorn app.main:app --host 0.0.0.0 --port 8000
```

The API creates tables automatically on first run.

Serve behind nginx with an SSL cert (certbot). Example nginx location block:

```nginx
location / {
    proxy_pass http://127.0.0.1:8000;
    proxy_set_header Host $host;
}
```

## Frontend setup

```bash
cd frontend
cp .env.example .env.local
# set VITE_API_URL=https://your-api-domain.com

npm install
npm run dev        # local dev
npm run build      # production build → dist/
```

### GitHub Pages deploy

1. Push this repo to GitHub.
2. Add `VITE_API_URL` as a repository secret (Settings → Secrets → Actions).
3. Enable GitHub Pages from the `gh-pages` branch (Settings → Pages).
4. Push to `main` — the workflow in `.github/workflows/deploy.yml` builds and deploys automatically.

Player URL: `https://<user>.github.io/player_assessment/`
Coach URL:  `https://<user>.github.io/player_assessment/coach`

## Periods

Create a period via the coach interface or directly via the API:

```bash
curl -X POST https://your-api/periods \
  -H "x-api-key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"label": "Summer 2026", "is_active": true}'
```
