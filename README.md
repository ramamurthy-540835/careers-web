# NELTURE Careers

Mobile-first application portal for on-site climate-intelligence roles at UN project locations worldwide.

## Local setup

Copy `.env.example` to `.env.local`, provide non-secret public configuration, install dependencies, then run `npm run dev`. Production secrets are Secret Manager values injected into Cloud Run, never local example values.

## Verification

Run `npm run build`, `npm test`, `npm run e2e`, `npm audit --production`, and `docker build -t nelture-careers .`. The health endpoint is `/api/health`.

## Deployment

Run the idempotent `infra/gcloud/setup.sh`, then `gcloud builds submit --config cloudbuild.yaml --project aidirac-503309`. The application uses a hidden spam-trap field by default. Cloudflare Turnstile can be enabled later by configuring both `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET` on Cloud Run; a partially configured pair blocks submissions. See `infra/README.md` and `infra/twa/README.md`.
