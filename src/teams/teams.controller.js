const { HttpError } = require('../middleware/errorHandler');
const { parsePagination, paginatedResponse } = require('../utils/pagination');
const teamsRepository = require('./teams.repository');
const { assertOrganizationActive } = require('../organization/organizationClient');
const { hasPermission } = require('../middleware/authorize');
function teamNameTakenError() { return new HttpError(409, 'TEAM_NAME_TAKEN', 'A team with this name already exists in this organization'); }
function teamNotFoundError() { return new HttpError(404, 'TEAM_NOT_FOUND', 'Team not found'); }
function requireTeamPermission(req, permission, message) {
  if (!hasPermission(req, permission) && !hasPermission(req, 'IAM_TEAM_MANAGE')) throw new HttpError(403, 'TEAM_FORBIDDEN', message);
}
const TEAM_SORT_COLUMNS = new Set(['created_at', 'updated_at', 'name']);
async function createTeam(req, res) {
  await assertOrganizationActive(req.organizationId);
  try { return res.status(201).json(await teamsRepository.insertTeam({ organizationId: req.organizationId, name: req.validatedBody.name })); }
  catch (err) { if (teamsRepository.isUniqueViolation(err)) throw teamNameTakenError(); throw err; }
}
async function listTeams(req, res) {
  const pagination = parsePagination(req.query);
  const sortColumn = TEAM_SORT_COLUMNS.has(pagination.sortColumn) ? pagination.sortColumn : 'created_at';
  const { rows, totalElements } = await teamsRepository.listTeams({ organizationId: req.organizationId, name: req.query.name, limit: pagination.size, offset: pagination.offset, sortColumn, sortDirection: pagination.sortDirection });
  return res.status(200).json(paginatedResponse({ content: rows, page: pagination.page, size: pagination.size, totalElements }));
}
async function getTeamById(req, res) {
  const team = await teamsRepository.findTeamByIdInOrg(req.params.id, req.organizationId);
  if (!team) throw teamNotFoundError();
  const member = await teamsRepository.isTeamMember(req.params.id, req.userId, req.organizationId);
  if (!member) requireTeamPermission(req, 'IAM_TEAM_VIEW', 'Caller may not view this team');
  return res.status(200).json(team);
}
async function patchTeam(req, res) {
  const existing = await teamsRepository.findTeamByIdInOrg(req.params.id, req.organizationId);
  if (!existing) throw teamNotFoundError();
  requireTeamPermission(req, 'IAM_TEAM_MANAGE', 'Caller lacks permission to update this team');
  try { return res.status(200).json(await teamsRepository.updateTeamName(req.params.id, req.organizationId, req.validatedBody.name)); }
  catch (err) { if (teamsRepository.isUniqueViolation(err)) throw teamNameTakenError(); throw err; }
}
async function deleteTeam(req, res) {
  const exists = await teamsRepository.findTeamByIdInOrg(req.params.id, req.organizationId);
  if (!exists) throw teamNotFoundError();
  requireTeamPermission(req, 'IAM_TEAM_MANAGE', 'Caller lacks permission to delete this team');
  await teamsRepository.deleteTeam(req.params.id, req.organizationId);
  return res.status(204).send();
}
async function addMember(req, res) {
  const team = await teamsRepository.findTeamByIdInOrg(req.params.id, req.organizationId);
  if (!team) throw teamNotFoundError();
  const user = await teamsRepository.findUserByIdInOrg(req.validatedBody.userId, req.organizationId);
  if (!user) throw new HttpError(404, 'USER_NOT_FOUND', 'User not found');
  try { return res.status(201).json(await teamsRepository.addMember(req.params.id, req.validatedBody.userId)); }
  catch (err) { if (teamsRepository.isUniqueViolation(err)) throw new HttpError(409, 'TEAM_MEMBER_ALREADY_EXISTS', 'User is already a member of this team'); throw err; }
}
async function listMembers(req, res) {
  const team = await teamsRepository.findTeamByIdInOrg(req.params.id, req.organizationId);
  if (!team) throw teamNotFoundError();
  const member = await teamsRepository.isTeamMember(req.params.id, req.userId, req.organizationId);
  if (!member) requireTeamPermission(req, 'IAM_TEAM_VIEW', "Caller may not view this team's membership");
  const pagination = parsePagination(req.query);
  const { rows, totalElements } = await teamsRepository.listMembers({ teamId: req.params.id, limit: pagination.size, offset: pagination.offset });
  return res.status(200).json(paginatedResponse({ content: rows, page: pagination.page, size: pagination.size, totalElements }));
}
async function deleteMember(req, res) {
  const team = await teamsRepository.findTeamByIdInOrg(req.params.id, req.organizationId);
  if (!team) throw teamNotFoundError();
  const user = await teamsRepository.findUserByIdInOrg(req.params.userId, req.organizationId);
  if (!user) throw new HttpError(404, 'TEAM_MEMBER_NOT_FOUND', 'User is not a member of this team');
  requireTeamPermission(req, 'IAM_TEAM_MANAGE', "Caller lacks permission to manage this team's membership");
  if (!(await teamsRepository.removeMember(req.params.id, req.params.userId))) throw new HttpError(404, 'TEAM_MEMBER_NOT_FOUND', 'User is not a member of this team');
  return res.status(204).send();
}
module.exports = { createTeam, listTeams, getTeamById, patchTeam, deleteTeam, addMember, listMembers, deleteMember };