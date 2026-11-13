# User & Team Service — Resolve Task 3

This service owns users (profile fields), teams, and team membership. It is synchronous REST only and emits no Kafka events in the initial scope.

## Run locally

```powershell
Copy-Item .env.example .env -ErrorAction SilentlyContinue
npm install
docker compose up -d
npm test
```

The default local DB URL uses the Compose credentials. Integration tests delete rows from `users`, `teams`, and `team_members`; use only a disposable test database.

## Public API and auth

Public routes under `/api/v1` require an access bearer JWT. Tenant scope comes only from `tenantId`; query/body organization values do not set tenant scope. Permission claims are `IAM_USER_MANAGE`, `IAM_USER_VIEW`, `IAM_TEAM_MANAGE`, and `IAM_TEAM_VIEW`. Cross-tenant resources return 404. Self profile reads are allowed; self PATCH may change only `fullName`. User hard delete and public password changes are not exposed. All creating POSTs require an Idempotency-Key.

## Dependencies and internal routes

Before creating users/teams, the service calls Organization Service at `ORGANIZATION_SERVICE_URL/internal/v1/organizations/{organizationId}` and proceeds only when status is ACTIVE. Configure its service token. Missing/unavailable dependency fails closed.

Internal `/internal/v1` routes require a verified mTLS client certificate or an internal signed JWT containing a `service` claim. Never forward the end-user bearer token. Credential endpoints accept plaintext only on the protected service channel, hash/compare using bcrypt, and never return hashes.

## Local install note

The project uses jose 6 (ESM). The service loads its JWT helpers with dynamic imports for CommonJS compatibility. `package-lock.json` must stay committed in sync with `package.json`; use `npm ci` on clean checkouts.
