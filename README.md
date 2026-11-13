# User & Team Service — Resolve Task 3

Node.js/Express/PostgreSQL service owning user profiles, teams, and team membership.

## Run locally

```bash
docker compose up -d
npm install
cp .env.example .env
# Set JWT secrets and configure the Organization Service URL/token in .env.
npm start
```

Migrations run at service startup; run them separately with `npm run migrate`. Health check: `GET /health`; OpenAPI UI: `/api-docs`.

## Public API and auth

Public endpoints use `/api/v1` and require `Authorization: Bearer <JWT>`. Tenant scope comes only from the JWT's `tenantId` claim; request query/body organization IDs never override it. The JWT must include permissions such as `IAM_USER_MANAGE`, `IAM_USER_VIEW`, `IAM_TEAM_MANAGE`, or `IAM_TEAM_VIEW`. A user may always read their own profile and may update only their own `fullName`. Tenant-scoped lookups hide cross-organization resources as 404. User deletion is deliberately not exposed; deactivate users by PATCHing status.

Resource-creating POST endpoints require `Idempotency-Key`. The included idempotency cache is process-memory only: use a shared durable store for multi-instance production deployments.

## Organization dependency

Before creating a user or team, the service calls `GET {ORGANIZATION_SERVICE_URL}/internal/v1/organizations/{organizationId}` with the configured service token and requires `status: ACTIVE`. Without this integration configured, create operations fail closed with 503. This service does not create, update, or otherwise modify another repository/service.

## Internal service API

`/internal/v1/*` is guarded by a verified mTLS client certificate or an internal JWT signed with `INTERNAL_JWT_SECRET` and containing a non-empty `service` claim. Never forward a public user's bearer token. Endpoints are user lookup by resolved organization ID/email, get-by-ID, bcrypt credential verification, and password update from plaintext over the protected service channel. Password hashes are never returned, and plaintext passwords are not logged.

Internal paths: `GET /internal/v1/users/lookup?organizationId=...&email=...`, `GET /internal/v1/users/{id}`, `POST /internal/v1/users/{id}/verify-credentials`, and `PATCH /internal/v1/users/{id}/password-hash`.

## Tests

`npm test` requires PostgreSQL (`docker compose up -d`). A dedicated Jest setup enables a test-only auth bypass; the bypass is conditioned on `NODE_ENV=test` and has no effect in normal runtime.
