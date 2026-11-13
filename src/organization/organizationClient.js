const { HttpError } = require('../middleware/errorHandler');

async function assertOrganizationActive(organizationId) {
  if (process.env.NODE_ENV === 'test' && process.env.TEST_AUTH_BYPASS === 'true') return true;
  const baseUrl = process.env.ORGANIZATION_SERVICE_URL;
  if (!baseUrl) throw new HttpError(503, 'ORGANIZATION_SERVICE_UNAVAILABLE', 'Organization validation is not configured');
  const headers = { accept: 'application/json' };
  const token = process.env.ORGANIZATION_SERVICE_TOKEN;
  if (token) headers.authorization = `Bearer ${token}`;
  let response;
  try {
    response = await fetch(`${baseUrl.replace(/\/$/, '')}/internal/v1/organizations/${encodeURIComponent(organizationId)}`, {
      method: 'GET', headers, signal: AbortSignal.timeout(Number(process.env.ORGANIZATION_SERVICE_TIMEOUT_MS) || 3000),
    });
  } catch (err) {
    throw new HttpError(503, 'ORGANIZATION_SERVICE_UNAVAILABLE', 'Could not validate organization');
  }
  if (response.status === 404) throw new HttpError(404, 'ORGANIZATION_NOT_FOUND', 'Organization not found');
  if (!response.ok) throw new HttpError(503, 'ORGANIZATION_SERVICE_UNAVAILABLE', 'Could not validate organization');
  let organization;
  try { organization = await response.json(); } catch (err) { throw new HttpError(503, 'ORGANIZATION_SERVICE_UNAVAILABLE', 'Invalid organization service response'); }
  if (organization.status !== 'ACTIVE') throw new HttpError(409, 'ORGANIZATION_INACTIVE', 'Organization is not active');
  return true;
}
module.exports = { assertOrganizationActive };