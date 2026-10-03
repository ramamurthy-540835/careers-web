# Security controls

- `lib/schema.ts` validates every application field on client and server and enforces passport, travel, certification, Prism AI, consent, motivation, URL and CV-size gates.
- `lib/google.ts` signs V4 uploads for ten minutes with declared MIME type and content-length range, verifies size and magic bytes before submission, and uses parameterized BigQuery queries. It rejects query text containing `${`.
- `lib/security.ts` hashes the source IP with a salt, returns safe errors, prevents cached API responses, and fails closed for Turnstile in production.
- CV metadata contains only application ID, role and upload time. Application errors and audit logs identify the application only.
- Cloud Run uses a dedicated service account; GCS is uniform-access, versioned, private and lifecycle-managed.
