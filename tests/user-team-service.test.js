const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/db/pool');
const { runMigrations } = require('../src/db/migrate');
const { resetIdempotencyStore } = require('../src/middleware/idempotency');
const bcrypt = require('bcryptjs');

const ORG_A = '11111111-1111-1111-1111-111111111111';
const ORG_B = '22222222-2222-2222-2222-222222222222';
let sequence = 0;
function key(prefix) { sequence += 1; return `${prefix}-${Date.now()}-${sequence}`; }
function tenant(req, organizationId = ORG_A) { return req.set('x-test-organization-id', organizationId); }

async function createUser(overrides = {}, defaultOrg = ORG_A) {
  const { organizationId = defaultOrg, ...fields } = overrides;
  sequence += 1;
  const body = {
    email: `user-${Date.now()}-${sequence}@resolve.test`,
    username: `user-${Date.now()}-${sequence}`,
    fullName: 'Test User',
    ...fields,
  };
  const response = await tenant(request(app).post('/api/v1/users').set('Idempotency-Key', key('user')), organizationId).send(body);
  expect(response.status).toBe(201);
  return response.body;
}
async function createTeam(overrides = {}, defaultOrg = ORG_A) {
  const { organizationId = defaultOrg, ...fields } = overrides;
  const body = { name: `Team ${Date.now()} ${sequence}`, ...fields };
  const response = await tenant(request(app).post('/api/v1/teams').set('Idempotency-Key', key('team')), organizationId).send(body);
  expect(response.status).toBe(201);
  return response.body;
}

beforeAll(async () => { await runMigrations(pool); });
afterEach(async () => {
  resetIdempotencyStore();
  await pool.query('DELETE FROM team_members');
  await pool.query('DELETE FROM teams');
  await pool.query('DELETE FROM users');
});
afterAll(async () => { await pool.end(); });

describe('public user API', () => {
  test('health endpoint is available', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
  });
  test('creates a tenant-scoped user without exposing or accepting credentials', async () => {
    const response = await tenant(request(app).post('/api/v1/users').set('Idempotency-Key', key('create')), ORG_A)
      .send({ email: 'jane@resolve.test', username: 'jane', fullName: 'Jane Doe' });
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ organizationId: ORG_A, email: 'jane@resolve.test', status: 'ACTIVE' });
    expect(response.body).not.toHaveProperty('passwordHash');
    expect(response.body).not.toHaveProperty('password_hash');
  });
  test('rejects password fields on public provisioning', async () => {
    const response = await tenant(request(app).post('/api/v1/users').set('Idempotency-Key', key('credential')), ORG_A)
      .send({ email: 'pw@resolve.test', username: 'pw', fullName: 'Password User', passwordHash: 'nope' });
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('USER_VALIDATION_ERROR');
  });
  test('requires idempotency and rejects reuse with a changed body', async () => {
    const idempotencyKey = key('reused');
    const first = await tenant(request(app).post('/api/v1/users').set('Idempotency-Key', idempotencyKey), ORG_A)
      .send({ email: 'retry@resolve.test', username: 'retry', fullName: 'Retry' });
    expect(first.status).toBe(201);
    const retry = await tenant(request(app).post('/api/v1/users').set('Idempotency-Key', idempotencyKey), ORG_A)
      .send({ email: 'retry2@resolve.test', username: 'retry2', fullName: 'Retry 2' });
    expect(retry.status).toBe(409);
    expect(retry.body.code).toBe('IDEMPOTENCY_KEY_REUSED');
  });
  test('lists only JWT/test-header tenant users with pagination', async () => {
    await createUser({ email: 'a@resolve.test', username: 'a' }, ORG_A);
    await createUser({ email: 'b@resolve.test', username: 'b' }, ORG_B);
    const response = await tenant(request(app).get('/api/v1/users?page=0&size=20'), ORG_A);
    expect(response.status).toBe(200);
    expect(response.body.totalElements).toBe(1);
    expect(response.body.content[0].organizationId).toBe(ORG_A);
  });
  test('supports teamId filter', async () => {
    const user = await createUser({ email: 'team-filter@resolve.test', username: 'team-filter' });
    const team = await createTeam({ name: 'Filter Team' });
    await tenant(request(app).post(`/api/v1/teams/${team.id}/members`).set('Idempotency-Key', key('member')), ORG_A).send({ userId: user.id });
    const response = await tenant(request(app).get(`/api/v1/users?teamId=${team.id}`), ORG_A);
    expect(response.status).toBe(200);
    expect(response.body.content.map((u) => u.id)).toContain(user.id);
  });
  test('allows self profile read and hides cross-tenant profiles as 404', async () => {
    const user = await createUser();
    const own = await tenant(request(app).get(`/api/v1/users/${user.id}`).set('x-test-user-id', user.id), ORG_A);
    expect(own.status).toBe(200);
    const otherTenant = await tenant(request(app).get(`/api/v1/users/${user.id}`), ORG_B);
    expect(otherTenant.status).toBe(404);
    expect(otherTenant.body.code).toBe('USER_NOT_FOUND');
  });
  test('allows self fullName edit, but rejects self status edit', async () => {
    const user = await createUser();
    const self = () => tenant(request(app).patch(`/api/v1/users/${user.id}`).set('x-test-user-id', user.id), ORG_A);
    expect((await self().send({ fullName: 'Updated Name' })).status).toBe(200);
    const forbidden = await self().send({ status: 'SUSPENDED' });
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.code).toBe('USER_FORBIDDEN');
  });
  test('returns a validation error for an invalid status before database update', async () => {
    const user = await createUser();
    const response = await tenant(request(app).patch(`/api/v1/users/${user.id}`), ORG_A).send({ status: 'DISABLED' });
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('USER_INVALID_STATUS');
    expect(response.body.errors[0].field).toBe('status');
  });
  test('returns user conflict for duplicate email and username', async () => {
    await createUser({ email: 'taken@resolve.test', username: 'taken' });
    const duplicateEmail = await tenant(request(app).post('/api/v1/users').set('Idempotency-Key', key('duplicate')), ORG_A)
      .send({ email: 'taken@resolve.test', username: 'different', fullName: 'Duplicate' });
    expect(duplicateEmail.status).toBe(409);
    expect(duplicateEmail.body.code).toBe('USER_EMAIL_TAKEN');
  });
});

describe('public team and membership API', () => {
  test('creates/lists/renames/deletes teams within tenant scope', async () => {
    const team = await createTeam({ name: 'Investigations' });
    expect((await tenant(request(app).get('/api/v1/teams'), ORG_A)).body.totalElements).toBe(1);
    const renamed = await tenant(request(app).patch(`/api/v1/teams/${team.id}`), ORG_A).send({ name: 'Investigations 2' });
    expect(renamed.status).toBe(200);
    const deleted = await tenant(request(app).delete(`/api/v1/teams/${team.id}`), ORG_A);
    expect(deleted.status).toBe(204);
  });
  test('requires team view/manage permission for lists (auth bypass supplies permission in tests)', async () => {
    const response = await tenant(request(app).get('/api/v1/teams'), ORG_A);
    expect(response.status).toBe(200);
  });
  test('adds, lists, and removes only same-tenant memberships', async () => {
    const user = await createUser({ email: 'member@resolve.test', username: 'member' });
    const team = await createTeam({ name: 'Members' });
    const added = await tenant(request(app).post(`/api/v1/teams/${team.id}/members`).set('Idempotency-Key', key('add')), ORG_A).send({ userId: user.id });
    expect(added.status).toBe(201);
    const listed = await tenant(request(app).get(`/api/v1/teams/${team.id}/members`), ORG_A);
    expect(listed.body.content[0]).toMatchObject({ userId: user.id, email: 'member@resolve.test' });
    expect((await tenant(request(app).delete(`/api/v1/teams/${team.id}/members/${user.id}`), ORG_A)).status).toBe(204);
  });
  test('returns 404 for cross-organization team/user references', async () => {
    const foreignUser = await createUser({ email: 'foreign@resolve.test', username: 'foreign' }, ORG_B);
    const team = await createTeam({ name: 'Local Team' }, ORG_A);
    const response = await tenant(request(app).post(`/api/v1/teams/${team.id}/members`).set('Idempotency-Key', key('foreign')), ORG_A).send({ userId: foreignUser.id });
    expect(response.status).toBe(404);
    expect(response.body.code).toBe('USER_NOT_FOUND');
  });
});

describe('protected internal authentication API', () => {
  test('lookup requires resolved organizationId and returns only user id/status', async () => {
    const user = await createUser({ email: 'lookup@resolve.test', username: 'lookup' });
    const response = await request(app).get(`/internal/v1/users/lookup?organizationId=${ORG_A}&email=lookup%40resolve.test`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ userId: user.id, status: 'ACTIVE' });
    expect(response.body).not.toHaveProperty('passwordHash');
  });
  test('lookup rejects slug-only requests', async () => {
    const response = await request(app).get(`/internal/v1/users/lookup?organizationSlug=${ORG_A}&email=missing%40resolve.test`);
    expect(response.status).toBe(400);
  });
  test('hashes plaintext internally and verifies matching/mismatching passwords without returning hash', async () => {
    const user = await createUser({ email: 'credential@resolve.test', username: 'credential' });
    expect((await request(app).patch(`/internal/v1/users/${user.id}/password-hash`).send({ newPlaintextPassword: 'TempPass!2026' })).status).toBe(204);
    const stored = await pool.query('SELECT password_hash FROM users WHERE id=$1', [user.id]);
    expect(await bcrypt.compare('TempPass!2026', stored.rows[0].password_hash)).toBe(true);
    const valid = await request(app).post(`/internal/v1/users/${user.id}/verify-credentials`).send({ plaintextPassword: 'TempPass!2026' });
    expect(valid.body.valid).toBe(true);
    const invalid = await request(app).post(`/internal/v1/users/${user.id}/verify-credentials`).send({ plaintextPassword: 'WrongPass!2026' });
    expect(invalid.body.valid).toBe(false);
    expect(valid.body).not.toHaveProperty('passwordHash');
  });
  test('internal get-by-id returns the contract identity fields', async () => {
    const user = await createUser({ fullName: 'Internal User' });
    const response = await request(app).get(`/internal/v1/users/${user.id}`);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: user.id, organizationId: ORG_A, fullName: 'Internal User', status: 'ACTIVE' });
  });
});
