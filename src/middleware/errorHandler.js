function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  let status = err.status || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'Internal server error';
  if (err.code === '23505') {
    status = 409;
    code = 'CONFLICT';
    message = 'A resource with these fields already exists';
  }
  const path = (req.originalUrl || req.url || '').split('?')[0];
  const body = {
    timestamp: new Date().toISOString(), status, code, message, path,
    requestId: req.requestId, traceId: req.traceId,
  };
  if (status === 400 && Array.isArray(err.errors) && err.errors.length) body.errors = err.errors;
  if (status >= 500) console.error({ requestId: req.requestId, traceId: req.traceId, error: err });
  res.status(status).json(body);
}

class HttpError extends Error {
  constructor(status, code, message, errors) {
    super(message);
    this.status = status;
    this.code = code;
    this.errors = errors;
  }
}

module.exports = { HttpError, errorHandler };