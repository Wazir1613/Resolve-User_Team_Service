const { createJwtVerifier } = require('../security/jwt');
const { HttpError } = require('./errorHandler');
const verifier = createJwtVerifier(process.env.JWT_SECRET, process.env.JWT_ISSUER);
const DEFAULT_TEST_PERMISSIONS = ['IAM_USER_MANAGE', 'IAM_USER_VIEW', 'IAM_TEAM_MANAGE', 'IAM_TEAM_VIEW'];
async function authenticate(req, res, next) {
  if (process.env.NODE_ENV === 'test' && process.env.TEST_AUTH_BYPASS === 'true') {
    req.organizationId = req.get('x-test-organization-id') || '11111111-1111-1111-1111-111111111111';
    req.userId = req.get('x-test-user-id') || '00000000-0000-4000-8000-000000000001';
    const permissions = req.get('x-test-permissions');
    req.permissions = permissions === undefined ? DEFAULT_TEST_PERMISSIONS : permissions.split(',').map((p) => p.trim()).filter(Boolean);
    return next();
  }
  const match = (req.header('authorization') || '').match(/^Bearer\s+(\S+)$/i);
  if (!match) return next(new HttpError(401, 'AUTH_MISSING_TOKEN', 'Authentication required'));
  try {
    const auth = await verifier.verify(match[1]);
    req.organizationId = auth.tenantId;
    req.userId = auth.userId;
    req.permissions = auth.permissions;
    return next();
  } catch (err) {
    return next(new HttpError(401, 'AUTH_MISSING_TOKEN', 'Authentication token is invalid'));
  }
}
module.exports = { authenticate };