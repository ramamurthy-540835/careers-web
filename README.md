# NELTURE Careers

Mobile-first application portal for on-site climate-intelligence roles at UN project locations worldwide.

## Local setup

Copy `.env.example` to `.env.local`, provide non-secret public configuration, install dependencies, then run `npm run dev`. Production secrets are Secret Manager values injected into Cloud Run, never local example values.

## Verification

Run `npm run build`, `npm test`, `npm run e2e`, `npm audit --production`, and `docker build -t nelture-careers .`. The health endpoint is `/api/health`.

## Deployment

Run the idempotent `infra/gcloud/setup.sh`. Create a Cloudflare Turnstile widget for the Cloud Run hostname and add its private secret as a version of GCP Secret Manager `TURNSTILE_SECRET`. Deploy with `gcloud builds submit --config cloudbuild.yaml --project aidirac-503309 --substitutions "_TURNSTILE_SITE_KEY=<public-site-key>"`. The public site key is passed to Cloud Run at runtime; the private key is read from Secret Manager. See `infra/README.md` and `infra/twa/README.md`.
