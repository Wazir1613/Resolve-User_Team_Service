Resolve User & Team Service — Node.js, Express, and PostgreSQL

## Run locally

```bash
docker compose up -d
npm install
cp .env.example .env
npm start
```

Database migrations run on startup. Run them separately with `npm run migrate`.
Health check: `GET http://localhost:8080/health`. API documentation: `/api-docs`.

## Authentication and tenancy

All `/api/v1/*` requests require a bearer access JWT. The service derives the tenant exclusively from its `tenantId` claim; a query-string or body `organizationId` never changes tenant scope. JWTs must carry `permissions` containing the applicable `IAM_USER_*` or `IAM_TEAM_*` permission. Users can read their own profile and update only their own `fullName` without management permission. Cross-tenant IDs return 404.

All `/internal/v1/*` routes require a verified mTLS client certificate or an internal bearer JWT signed with `INTERNAL_JWT_SECRET` and containing a non-empty `service` claim. Forwarded end-user access tokens are not accepted as internal credentials. Never log plaintext passwords. Password hashes are never returned; internal password updates accept plaintext only over the protected service channel and hash it in this service.

The Organization Service must be integrated to validate that organizations exist and are active before creating users or teams; this repository does not yet have a configured outbound Organization Service client. Do not treat arbitrary tenant IDs as verified organizations until that integration is configured.

## API surface

Public users: `POST/GET /api/v1/users`, `GET/PATCH /api/v1/users/{id}`. Public teams: `POST/GET /api/v1/teams`, `GET/PATCH/DELETE /api/v1/teams/{id}`, `POST/GET /api/v1/teams/{id}/members`, `DELETE /api/v1/teams/{id}/members/{userId}`. Resource-creating POSTs require `Idempotency-Key`.

Internal Authentication/dependent-service endpoints: `GET /internal/v1/users/lookup?organizationId=&email=`, `GET /internal/v1/users/{id}`, `POST /internal/v1/users/{id}/verify-credentials`, and `PATCH /internal/v1/users/{id}/password-hash`.

## Tests

Integration tests require PostgreSQL (`docker compose up -d`) and run with `npm test`. Their explicit `TEST_AUTH_BYPASS` is enabled only in the test process and is not honored outside `NODE_ENV=test`.
