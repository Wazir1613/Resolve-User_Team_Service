const { HttpError } = require('../middleware/errorHandler');
const { parsePagination, paginatedResponse } = require('../utils/pagination');
const usersRepository = require('./users.repository');
const { assertOrganizationActive } = require('../organization/organizationClient');
const { hasPermission } = require('../middleware/authorize');

function userUniqueError(err) {
  const constraint = String((err && err.constraint) || '').toLowerCase();
  if (constraint.includes('email')) {
    return new HttpError(409, 'USER_EMAIL_TAKEN', 'A user with this email already exists in this organization');
  }
  return new HttpError(409, 'USER_USERNAME_TAKEN', 'A user with this username already exists in this organization');
}
function notFound() { return new HttpError(404, 'USER_NOT_FOUND', 'User not found'); }
function canManage(req) { return hasPermission(req, 'IAM_USER_MANAGE'); }

async function createUser(req, res) {
  //await assertOrganizationActive(req.organizationId);
  try {
    const user = await usersRepository.insertUser({
      organizationId: req.organizationId,
      email: req.validatedBody.email,
      username: req.validatedBody.username,
      fullName: req.validatedBody.fullName,
      status: req.validatedBody.status || 'ACTIVE',
    });
    return res.status(201).json(user);
  } catch (err) {
    if (usersRepository.isUniqueViolation(err)) throw userUniqueError(err);
    throw err;
  }
}

const USER_SORT_COLUMNS = new Set(['created_at', 'updated_at', 'email', 'username', 'full_name', 'status']);
async function listUsers(req, res) {
  const pagination = parsePagination(req.query);
  const sortColumn = USER_SORT_COLUMNS.has(pagination.sortColumn) ? pagination.sortColumn : 'created_at';
  const { rows, totalElements } = await usersRepository.listUsers({
    organizationId: req.organizationId,
    email: req.query.email,
    username: req.query.username,
    status: req.query.status,
    teamId: req.query.teamId,
    limit: pagination.size,
    offset: pagination.offset,
    sortColumn,
    sortDirection: pagination.sortDirection,
  });
  return res.status(200).json(paginatedResponse({ content: rows, page: pagination.page, size: pagination.size, totalElements }));
}

async function getUserById(req, res) {
  const user = await usersRepository.findByIdInOrg(req.params.id, req.organizationId);
  if (!user) throw notFound();
  if (!canManage(req) && !hasPermission(req, 'IAM_USER_VIEW') && req.userId !== req.params.id) {
    throw new HttpError(403, 'USER_FORBIDDEN', 'Caller may not view this user');
  }
  return res.status(200).json(user);
}

async function patchUser(req, res) {
  const existing = await usersRepository.findByIdInOrg(req.params.id, req.organizationId);
  if (!existing) throw notFound();
  if (!canManage(req)) {
    const fields = Object.keys(req.validatedBody);
    if (req.userId !== req.params.id || fields.length === 0 || fields.some((field) => field !== 'fullName')) {
      throw new HttpError(403, 'USER_FORBIDDEN', 'Caller lacks permission to update this field');
    }
  }
  try {
    const user = await usersRepository.updateUser(req.params.id, req.organizationId, req.validatedBody);
    return res.status(200).json(user);
  } catch (err) {
    if (usersRepository.isUniqueViolation(err)) throw userUniqueError(err);
    throw err;
  }
}

module.exports = { createUser, listUsers, getUserById, patchUser };