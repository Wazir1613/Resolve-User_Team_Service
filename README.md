# User & Team Service — Resolve Task 3

This service owns users (profile fields), teams, and team membership. It is synchronous REST only and emits no Kafka events in the initial scope.

## Run locally

```bash
docker compose up -d
npm install
cp .env.example .env
# Configure JWT, internal service auth, and Organization Service connection values.
npm start
```

Migrations run at startup (`npm run migrate` to run separately). Health check: `/health`; API docs: `/api-docs`.

## Public API

All `/api/v1` routes require a JWT bearer access token. The tenant comes only from the JWT `tenantId` claim; request query/body organization IDs cannot set scope. Relevant permission claims are `IAM_USER_MANAGE`, `IAM_USER_VIEW`, `IAM_TEAM_MANAGE`, and `IAM_TEAM_VIEW`. Cross-tenant IDs return 404. Users can always read their own profile and can edit only their own `fullName` absent manage permission. User deletion and public password changes are not provided. Resource-creating POSTs require `Idempotency-Key`.

## Organization dependency

Creating users and teams calls the Organization Service at `ORGANIZATION_SERVICE_URL/internal/v1/organizations/{organizationId}`. Configure `ORGANIZATION_SERVICE_TOKEN`; the service fails closed when the dependency is missing/unavailable and only proceeds when organization status is `ACTIVE`. Confirm that this URL and service authentication match the deployed Organization Service contract.

## Internal API

`/internal/v1` is service-to-service only. It accepts mTLS (when client certificate verification is configured) or a signed internal JWT with a `service` claim. Never forward the end-user token. Internal endpoints: lookup by resolved organization ID/email, get user by ID, verify credentials, and update password from plaintext. Bcrypt hashing/comparison occurs here. Password hashes are never returned or logged.

The idempotency store is in-memory and adequate only for one service process; production multi-instance deployment needs shared durable storage.

## Tests

`npm test` requires PostgreSQL. Jest's auth bypass is test-only (`NODE_ENV=test` and `TEST_AUTH_BYPASS=true`) and must never be enabled in runtime environments.
