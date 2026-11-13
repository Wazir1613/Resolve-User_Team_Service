const { pool } = require('../db/pool');
const TEAM_COLUMNS = 'id, organization_id, name, created_at, updated_at';
function toTeam(row) { return row ? { id: row.id, organizationId: row.organization_id, name: row.name, createdAt: row.created_at, updatedAt: row.updated_at } : null; }
function toTeamMember(row) { return row ? { teamId: row.team_id, userId: row.user_id, joinedAt: row.joined_at } : null; }
function toTeamMemberUser(row) { return row ? { userId: row.user_id, fullName: row.full_name, email: row.email, joinedAt: row.joined_at } : null; }
function isUniqueViolation(err) { return Boolean(err && err.code === '23505'); }
async function insertTeam({ organizationId, name }) { const r = await pool.query(`INSERT INTO teams (organization_id,name) VALUES ($1,$2) RETURNING ${TEAM_COLUMNS}`, [organizationId,name]); return toTeam(r.rows[0]); }
async function findTeamByIdInOrg(id, organizationId) { const r = await pool.query(`SELECT ${TEAM_COLUMNS} FROM teams WHERE id=$1 AND organization_id=$2`, [id,organizationId]); return toTeam(r.rows[0]); }
async function listTeams({ organizationId, name, limit, offset, sortColumn, sortDirection }) {
  const conditions=['organization_id=$1']; const params=[organizationId];
  if (name) { params.push(name); conditions.push(`name=$${params.length}`); }
  const where=conditions.join(' AND '); const count=await pool.query(`SELECT COUNT(*)::int AS total FROM teams WHERE ${where}`,params);
  params.push(limit,offset); const rows=await pool.query(`SELECT ${TEAM_COLUMNS} FROM teams WHERE ${where} ORDER BY ${sortColumn} ${sortDirection} LIMIT $${params.length-1} OFFSET $${params.length}`,params);
  return { rows: rows.rows.map(toTeam), totalElements: count.rows[0].total };
}
async function updateTeamName(id, organizationId, name) { const r=await pool.query(`UPDATE teams SET name=$1,updated_at=now() WHERE id=$2 AND organization_id=$3 RETURNING ${TEAM_COLUMNS}`,[name,id,organizationId]); return toTeam(r.rows[0]); }
async function deleteTeam(id, organizationId) { const r=await pool.query('DELETE FROM teams WHERE id=$1 AND organization_id=$2',[id,organizationId]); return r.rowCount>0; }
async function findUserByIdInOrg(userId, organizationId) { const r=await pool.query('SELECT id FROM users WHERE id=$1 AND organization_id=$2',[userId,organizationId]); return r.rows[0]||null; }
async function isTeamMember(teamId,userId,organizationId) { const r=await pool.query('SELECT 1 FROM team_members tm JOIN teams t ON t.id=tm.team_id WHERE tm.team_id=$1 AND tm.user_id=$2 AND t.organization_id=$3',[teamId,userId,organizationId]); return r.rowCount>0; }
async function addMember(teamId,userId) { const r=await pool.query('INSERT INTO team_members (team_id,user_id) VALUES ($1,$2) RETURNING team_id,user_id,joined_at',[teamId,userId]); return toTeamMember(r.rows[0]); }
async function listMembers({teamId,limit,offset}) { const count=await pool.query('SELECT COUNT(*)::int AS total FROM team_members WHERE team_id=$1',[teamId]); const r=await pool.query('SELECT tm.user_id,u.full_name,u.email,tm.joined_at FROM team_members tm JOIN users u ON u.id=tm.user_id WHERE tm.team_id=$1 ORDER BY tm.joined_at DESC LIMIT $2 OFFSET $3',[teamId,limit,offset]); return {rows:r.rows.map(toTeamMemberUser),totalElements:count.rows[0].total}; }
async function removeMember(teamId,userId) { const r=await pool.query('DELETE FROM team_members WHERE team_id=$1 AND user_id=$2',[teamId,userId]); return r.rowCount>0; }
module.exports={insertTeam,findTeamByIdInOrg,listTeams,updateTeamName,deleteTeam,findUserByIdInOrg,isTeamMember,addMember,listMembers,removeMember,isUniqueViolation};