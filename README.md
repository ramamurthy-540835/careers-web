# NELTURE Careers

Mobile-first application portal for on-site climate-intelligence roles at UN project locations worldwide.

## Local setup

Copy `.env.example` to `.env.local`, provide non-secret public configuration, install dependencies, then run `npm run dev`. Production secrets are Secret Manager values injected into Cloud Run, never local example values.

## Verification

Run `npm run build`, `npm test`, `npm run e2e`, `npm audit --production`, and `docker build -t nelture-careers .`. The health endpoint is `/api/health`.

## Deployment

Run the idempotent `infra/gcloud/setup.sh`, then `gcloud builds submit --config cloudbuild.yaml --project aidirac-503309`. Deployment creates only the `preview-v1` no-traffic revision. See `infra/README.md` and `infra/twa/README.md`.
