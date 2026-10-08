#!/usr/bin/env bash
set -euo pipefail
PROJECT_ID="${GCP_PROJECT:-aidirac-503309}"; REGION="asia-south1"; SA="careers-run@${PROJECT_ID}.iam.gserviceaccount.com"
gcloud services enable run.googleapis.com storage.googleapis.com bigquery.googleapis.com secretmanager.googleapis.com artifactregistry.googleapis.com --project "$PROJECT_ID"
gcloud iam service-accounts describe "$SA" --project "$PROJECT_ID" >/dev/null 2>&1 || gcloud iam service-accounts create careers-run --project "$PROJECT_ID"
for BUCKET in nelture-careers-cv-prod nelture-careers-cv-dev; do gcloud storage buckets describe "gs://$BUCKET" >/dev/null 2>&1 || gcloud storage buckets create "gs://$BUCKET" --location="$REGION" --uniform-bucket-level-access; gcloud storage buckets update "gs://$BUCKET" --versioning; gcloud storage buckets update "gs://$BUCKET" --lifecycle-file="$(dirname "$0")/lifecycle.json"; gcloud storage buckets add-iam-policy-binding "gs://$BUCKET" --member="serviceAccount:$SA" --role=roles/storage.objectAdmin; done
for BUCKET in nelture-careers-cv-prod nelture-careers-cv-dev; do gcloud storage buckets update "gs://$BUCKET" --cors-file="$(dirname "$0")/cors.json"; done
bq --project_id="$PROJECT_ID" query --use_legacy_sql=false < "$(dirname "$0")/../bq/001_init.sql"
bq --project_id="$PROJECT_ID" add-iam-policy-binding --member="serviceAccount:$SA" --role=roles/bigquery.dataEditor careers
gcloud artifacts repositories describe careers --location="$REGION" --project="$PROJECT_ID" >/dev/null 2>&1 || gcloud artifacts repositories create careers --repository-format=docker --location="$REGION" --project="$PROJECT_ID"
for SECRET in TURNSTILE_SECRET ADMIN_SESSION_SECRET IP_HASH_SALT; do gcloud secrets describe "$SECRET" --project "$PROJECT_ID" >/dev/null 2>&1 || gcloud secrets create "$SECRET" --project "$PROJECT_ID"; gcloud secrets add-iam-policy-binding "$SECRET" --member="serviceAccount:$SA" --role=roles/secretmanager.secretAccessor; done
gcloud projects add-iam-policy-binding "$PROJECT_ID" --member="serviceAccount:$SA" --role=roles/bigquery.jobUser
