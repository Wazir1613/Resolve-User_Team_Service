const { HttpError } = require('./errorHandler');

function hasPermission(req, permission) {
  return Array.isArray(req.permissions) && req.permissions.includes(permission);
}

function authorize(...permissions) {
  return (req, res, next) => {
    if (permissions.some((permission) => hasPermission(req, permission))) return next();
    return next(new HttpError(403, 'USER_FORBIDDEN', 'Caller lacks the required permission'));
  };
}

function authorizeUserRead(req, res, next) {
  if (hasPermission(req, 'IAM_USER_VIEW') || hasPermission(req, 'IAM_USER_MANAGE') || req.userId === req.params.id) {
    return next();
  }
  return next(new HttpError(403, 'USER_FORBIDDEN', 'Caller may not view this user'));
}

function authorizeUserPatch(req, res, next) {
  if (hasPermission(req, 'IAM_USER_MANAGE')) return next();
  const fields = Object.keys(req.body || {});
  if (req.userId === req.params.id && fields.length > 0 && fields.every((field) => field === 'fullName')) {
    return next();
  }
  return next(new HttpError(403, 'USER_FORBIDDEN', 'Caller lacks permission to update this field'));
}

function authorizeTeamManage(req, res, next) {
  if (hasPermission(req, 'IAM_TEAM_MANAGE')) return next();
  return next(new HttpError(403, 'TEAM_FORBIDDEN', 'Caller lacks the required team-management permission'));
}

module.exports = { hasPermission, authorize, authorizeUserRead, authorizeUserPatch, authorizeTeamManage };