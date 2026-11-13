const crypto = require('crypto');
const { HttpError } = require('./errorHandler');
const seenKeys = new Map();
function bodyHash(body) { return crypto.createHash('sha256').update(JSON.stringify(body ?? {})).digest('hex'); }
function idempotencyMiddleware(req, res, next) {
  const key = req.get('Idempotency-Key');
  if (!key) return next(new HttpError(400, 'IDEMPOTENCY_KEY_REQUIRED', 'Idempotency-Key header is required'));
  const scopedKey = [req.organizationId || 'unknown-tenant', req.method, req.baseUrl, req.path, key].join(':');
  const hash = bodyHash(req.body);
  const previous = seenKeys.get(scopedKey);
  if (previous) {
    if (previous.hash !== hash) return next(new HttpError(409, 'IDEMPOTENCY_KEY_REUSED', 'Idempotency-Key was already used with a different request body'));
    res.status(previous.status);
    return previous.status === 204 ? res.end() : res.json(previous.body);
  }
  const json = res.json.bind(res);
  const end = res.end.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 200 && res.statusCode < 300) seenKeys.set(scopedKey, { hash, status: res.statusCode, body });
    return json(body);
  };
  res.end = (...args) => {
    if (res.statusCode === 204) seenKeys.set(scopedKey, { hash, status: 204, body: null });
    return end(...args);
  };
  return next();
}
function resetIdempotencyStore() { seenKeys.clear(); }
module.exports = { idempotencyMiddleware, resetIdempotencyStore };