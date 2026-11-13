const { pool } = require('../db/pool');

const PUBLIC_COLUMNS = `id, organization_id, email, username, full_name, status, created_at, updated_at`;
function toPublicUser(row) {
  if (!row) return null;
  return { id: row.id, organizationId: row.organization_id, email: row.email, username: row.username, fullName: row.full_name, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at };
}
function toInternalLookupUser(row) { return row ? { id: row.id, organizationId: row.organization_id, status: row.status } : null; }
function toInternalStatusUser(row) { return row ? { id: row.id, organizationId: row.organization_id, fullName: row.full_name, status: row.status } : null; }
function isUniqueViolation(err) { return Boolean(err && err.code === '23505'); }

async function insertUser({ organizationId, email, username, fullName, status }) {
  const result = await pool.query(`INSERT INTO users (organization_id, email, username, full_name, status) VALUES ($1,$2,$3,$4,$5) RETURNING ${PUBLIC_COLUMNS}`, [organizationId, email, username, fullName, status]);
  return toPublicUser(result.rows[0]);
}
async function findByIdInOrg(id, organizationId) {
  const result = await pool.query(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id=$1 AND organization_id=$2`, [id, organizationId]);
  return toPublicUser(result.rows[0]);
}
async function listUsers({ organizationId, email, username, status, teamId, limit, offset, sortColumn, sortDirection }) {
  const conditions = ['u.organization_id=$1'];
  const params = [organizationId];
  for (const [field, value] of [['email', email], ['username', username], ['status', status]]) {
    if (value !== undefined && value !== '') { params.push(value); conditions.push(`u.${field}=$${params.length}`); }
  }
  if (teamId) { params.push(teamId); conditions.push(`EXISTS (SELECT 1 FROM team_members tm JOIN teams t ON t.id=tm.team_id WHERE tm.user_id=u.id AND t.organization_id=u.organization_id AND tm.team_id=$${params.length})`); }
  const where = conditions.join(' AND ');
  const count = await pool.query(`SELECT COUNT(*)::int AS total FROM users u WHERE ${where}`, params);
  params.push(limit, offset);
  const result = await pool.query(`SELECT ${PUBLIC_COLUMNS.split(',').map((c) => `u.${c.trim()}`).join(',')} FROM users u WHERE ${where} ORDER BY u.${sortColumn} ${sortDirection} LIMIT $${params.length-1} OFFSET $${params.length}`, params);
  return { rows: result.rows.map(toPublicUser), totalElements: count.rows[0].total };
}
async function updateUser(id, organizationId, fields) {
  const columns = { email: 'email', username: 'username', fullName: 'full_name', status: 'status' };
  const sets = []; const params = [];
  for (const [key, column] of Object.entries(columns)) if (fields[key] !== undefined) { params.push(fields[key]); sets.push(`${column}=$${params.length}`); }
  if (!sets.length) return findByIdInOrg(id, organizationId);
  sets.push('updated_at=now()'); params.push(id, organizationId);
  const result = await pool.query(`UPDATE users SET ${sets.join(',')} WHERE id=$${params.length-1} AND organization_id=$${params.length} RETURNING ${PUBLIC_COLUMNS}`, params);
  return toPublicUser(result.rows[0]);
}
async function findForInternalLookup({ organizationId, email }) {
  const result = await pool.query('SELECT id, organization_id, status FROM users WHERE organization_id=$1 AND email=$2', [organizationId, email]);
  return toInternalLookupUser(result.rows[0]);
}
async function findCredentialRecordById(id) {
  const result = await pool.query('SELECT organization_id, status, password_hash FROM users WHERE id=$1', [id]);
  const row = result.rows[0];
  return row ? { organizationId: row.organization_id, status: row.status, passwordHash: row.password_hash } : null;
}
async function updatePasswordHash(id, passwordHash) {
  const result = await pool.query('UPDATE users SET password_hash=$1, updated_at=now() WHERE id=$2', [passwordHash, id]);
  return result.rowCount > 0;
}
async function findInternalStatusById(id) {
  const result = await pool.query('SELECT id, organization_id, full_name, status FROM users WHERE id=$1', [id]);
  return toInternalStatusUser(result.rows[0]);
}
module.exports = { insertUser, findByIdInOrg, listUsers, updateUser, findForInternalLookup, findCredentialRecordById, updatePasswordHash, findInternalStatusById, isUniqueViolation, toPublicUser };