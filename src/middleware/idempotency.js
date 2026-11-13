const crypto = require('crypto');
const { HttpError } = require('./errorHandler');
// In-memory only; use a shared durable store for multi-instance production deployments.
const seenKeys = new Map();
function bodyHash(body) { return crypto.createHash('sha256').update(JSON.stringify(body ?? {})).digest('hex'); }
function idempotencyMiddleware(req, res, next) {
  const key = req.get('Idempotency-Key');
  if (!key) return next(new HttpError(400, 'IDEMPOTENCY_KEY_REQUIRED', 'Idempotency-Key header is required'));
  const scopedKey = [req.organizationId || 'internal', req.method, req.baseUrl, req.path, key].join(':');
  const hash = bodyHash(req.body);
  const existing = seenKeys.get(scopedKey);
  if (existing) {
    if (existing.hash !== hash) return next(new HttpError(409, 'IDEMPOTENCY_KEY_REUSED', 'Idempotency-Key was already used with a different request body'));
    res.status(existing.status);
    if (existing.status === 204) return res.end();
    return res.json(existing.body);
  }
  const originalJson = res.json.bind(res);
  const originalEnd = res.end.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 200 && res.statusCode < 300) seenKeys.set(scopedKey, { hash, status: res.statusCode, body });
    return originalJson(body);
  };
  res.end = (...args) => {
    if (res.statusCode === 204) seenKeys.set(scopedKey, { hash, status: 204, body: null });
    return originalEnd(...args);
  };
  return next();
}
function resetIdempotencyStore() { seenKeys.clear(); }
module.exports = { idempotencyMiddleware, resetIdempotencyStore };