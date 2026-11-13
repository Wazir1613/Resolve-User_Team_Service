const { jwtVerify } = require('jose');
const { HttpError } = require('../middleware/errorHandler');
async function serviceAuth(req, res, next) {
  if (process.env.NODE_ENV === 'test' && process.env.TEST_AUTH_BYPASS === 'true') return next();
  // Only accept TLS client certs after the HTTPS server/mTLS proxy has verified them.
  if (req.socket && req.socket.authorized === true) return next();
  const match = (req.header('authorization') || '').match(/^Bearer\s+(\S+)$/i);
  const secret = process.env.INTERNAL_JWT_SECRET;
  if (match && secret) {
    try {
      const key = new TextEncoder().encode(secret);
      const options = { algorithms: ['HS256'] };
      if (process.env.INTERNAL_JWT_ISSUER) options.issuer = process.env.INTERNAL_JWT_ISSUER;
      const { payload } = await jwtVerify(match[1], key, options);
      if (typeof payload.service === 'string' && payload.service.trim()) {
        req.serviceName = payload.service;
        return next();
      }
    } catch (err) {
      // Reject without exposing verification details or accepting forwarded end-user tokens.
    }
  }
  return next(new HttpError(401, 'AUTH_MISSING_TOKEN', 'Service authentication required'));
}
module.exports = { serviceAuth };