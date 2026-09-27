# User & Team Service — Resolve

Task 3 of the Resolve project. Owns user profiles, teams, and team
membership within a tenant.

> **Note:** this README is based on the service's API contract and known
> tooling choices — confirm endpoint-by-endpoint implementation status
> against what's actually built before treating this as exhaustive.

## Stack

- Node.js + Express
- PostgreSQL (via `pg`)
- Request validation via `zod`
- Flyway for database migrations
- IntelliJ Community Edition + Postman for local development/testing

## Owned data

| Table | Purpose |
|---|---|
| `users` | Profile fields (`email`, `username`, `fullName`, `status`). `password_hash` lives here but is written exclusively by Authentication. |
| `teams` | Team records, unique name per organization |
| `team_members` | Many-to-many between users and teams |

## Endpoints

| Method | Path | Notes |
|---|---|---|
| `POST` | `/api/v1/users` | Provision a user (`IAM_USER_MANAGE`, `Idempotency-Key` required) |
| `GET` | `/api/v1/users` | List users, paginated |
| `GET` | `/api/v1/users/{id}` | Get a user's profile |
| `PATCH` | `/api/v1/users/{id}` | Update profile fields / status |
| `POST` | `/api/v1/teams` | Create a team |
| `GET` | `/api/v1/teams` | List teams |
| `GET` | `/api/v1/teams/{id}` | Get a team |
| `PATCH` | `/api/v1/teams/{id}` | Rename a team |
| `DELETE` | `/api/v1/teams/{id}` | Delete a team |
| `POST` | `/api/v1/teams/{id}/members` | Add a member |
| `GET` | `/api/v1/teams/{id}/members` | List a team's members |
| `DELETE` | `/api/v1/teams/{id}/members/{userId}` | Remove a member |

Internal (service-to-service) endpoints exist for Authentication's login flow
(`/internal/v1/users/lookup`, `/internal/v1/users/{id}/verify-credentials`,
`/internal/v1/users/{id}/password-hash`) — see `Contracts/User_Team_Service.md`
for full request/response shapes.

## Conventions

- Base path: `/api/v1` (public), `/internal/v1` (service-to-service only)
- Every request scoped by the caller's tenant claim from the JWT
  — **confirm this is read as `tenantId`**, not `organization_id`; the
  contract doc's own prose says the latter, but Authentication's real JWT
  contract uses the former. Verify against the actual token before trusting
  either.
- Cross-tenant access returns `404`, never `403` (avoids leaking existence)
- Pagination: `?page=0&size=20&sort=createdAt,desc`
- `POST` endpoints require an `Idempotency-Key` header

## Local setup

1. Start Postgres (see `docker-compose.yml` in this repo).
2. Run Flyway migrations.
3. `npm install`
4. Configure `.env` (DB connection details).
5. `node src/index.js` (or your actual entrypoint).

## Auth status

Currently running with a temporary `permitAll`-style stopgap in place of
real JWT verification, until Authentication (Task 4) is reachable. Every
request is treated as authenticated. **Do not treat this as production-safe
— replace before any real integration testing.**

## Testing

Manual testing via Postman. No automated test suite currently documented —
add one here once it exists.
