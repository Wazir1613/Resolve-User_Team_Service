
# User & Team Service

Express.js + PostgreSQL service for Resolve users, teams, and team membership.

## How to run

```bash
docker compose up -d
npm install
copy .env.example .env
npm start
```

Migrations run on startup. To run them alone: `npm run migrate`.

Health check: `GET http://localhost:8080/health`

## Phase 4 (current)

Public user, team, team-member, and `/internal/v1` endpoints are live. Jest + Supertest integration coverage is included under `tests/`.

Use a UUID for `organizationId` on every public request, for example:

`11111111-1111-1111-1111-111111111111`

### Create user

```bash
curl -X POST "http://localhost:8080/api/v1/users?organizationId=11111111-1111-1111-1111-111111111111" ^
  -H "Content-Type: application/json" ^
  -H "Idempotency-Key: create-jane-1" ^
  -d "{\"email\":\"jane.doe@resolve.com\",\"username\":\"jane.doe\",\"fullName\":\"Jane Doe\",\"status\":\"ACTIVE\"}"
```

### List users

```bash
curl "http://localhost:8080/api/v1/users?organizationId=11111111-1111-1111-1111-111111111111&page=0&size=20&sort=createdAt,desc"
```

### Get one user

```bash
curl "http://localhost:8080/api/v1/users/<user-id>?organizationId=11111111-1111-1111-1111-111111111111"
```

### Patch user

```bash
curl -X PATCH "http://localhost:8080/api/v1/users/<user-id>?organizationId=11111111-1111-1111-1111-111111111111" ^
  -H "Content-Type: application/json" ^
  -d "{\"fullName\":\"Jane D.\"}"
```

### Create team

```bash
curl -X POST "http://localhost:8080/api/v1/teams?organizationId=11111111-1111-1111-1111-111111111111" ^
  -H "Content-Type: application/json" ^
  -H "Idempotency-Key: create-investigations-1" ^
  -d "{\"name\":\"Investigations Team\"}"
```

### List teams

```bash
curl "http://localhost:8080/api/v1/teams?organizationId=11111111-1111-1111-1111-111111111111&page=0&size=20&sort=createdAt,desc"
```

### Get one team

```bash
curl "http://localhost:8080/api/v1/teams/<team-id>?organizationId=11111111-1111-1111-1111-111111111111"
```

### Rename team

```bash
curl -X PATCH "http://localhost:8080/api/v1/teams/<team-id>?organizationId=11111111-1111-1111-1111-111111111111" ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Escalations Team\"}"
```

### Delete team

```bash
curl -X DELETE "http://localhost:8080/api/v1/teams/<team-id>?organizationId=11111111-1111-1111-1111-111111111111"
```

### Add team member

```bash
curl -X POST "http://localhost:8080/api/v1/teams/<team-id>/members?organizationId=11111111-1111-1111-1111-111111111111" ^
  -H "Content-Type: application/json" ^
  -H "Idempotency-Key: add-member-1" ^
  -d "{\"userId\":\"<user-id>\"}"
```

### List team members

```bash
curl "http://localhost:8080/api/v1/teams/<team-id>/members?organizationId=11111111-1111-1111-1111-111111111111&page=0&size=20"
```

### Remove team member

```bash
curl -X DELETE "http://localhost:8080/api/v1/teams/<team-id>/members/<user-id>?organizationId=11111111-1111-1111-1111-111111111111"
```

## Remaining phases

- Cross-service integration with the future Authentication and Organization services

## Endpoints so far

| Method | Path | Description |
| --- | --- | --- |
| GET | `/health` | Liveness check |
| POST | `/api/v1/users` | Create a user (requires `Idempotency-Key`) |
| GET | `/api/v1/users` | List users in an organization |
| GET | `/api/v1/users/:id` | Get one user in an organization |
| PATCH | `/api/v1/users/:id` | Partially update a user |
| POST | `/api/v1/teams` | Create a team (requires `Idempotency-Key`) |
| GET | `/api/v1/teams` | List teams in an organization |
| GET | `/api/v1/teams/:id` | Get one team in an organization |
| PATCH | `/api/v1/teams/:id` | Rename a team |
| DELETE | `/api/v1/teams/:id` | Delete a team |
| POST | `/api/v1/teams/:id/members` | Add a user to a team (requires `Idempotency-Key`) |
| GET | `/api/v1/teams/:id/members` | List a team's members |
| DELETE | `/api/v1/teams/:id/members/:userId` | Remove a user from a team |
| GET | `/internal/v1/users/lookup` | Lookup a user for Authentication by `organizationId` and `email` |
| POST | `/internal/v1/users/:id/verify-credentials` | Verify a provided credential value against the stored password field |
| PATCH | `/internal/v1/users/:id/password-hash` | Set a user's password field through the internal Authentication handoff |
| GET | `/internal/v1/users/:id` | Check internal user existence/status |
=======
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
>>>>>>> edeea3496a939c888806c387950afa8f75161234
