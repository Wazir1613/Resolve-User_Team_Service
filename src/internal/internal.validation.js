const { z } = require('zod');
const { HttpError } = require('../middleware/errorHandler');
const uuid = z.string().uuid();
const lookupSchema = z.object({ organizationId: uuid, email: z.string().email() }).strict();
const credentialSchema = z.object({ plaintextPassword: z.string().min(1) }).strict();
const passwordSchema = z.object({ newPlaintextPassword: z.string().min(8) }).strict();
function fieldErrors(err) {
  return err.issues.map((issue) => ({ field: issue.path.join('.') || 'body', code: issue.code === 'invalid_string' ? 'INVALID_FORMAT' : 'INVALID_VALUE', message: issue.message }));
}
function validate(schema, source, assign) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req[source]);
    if (!parsed.success) return next(new HttpError(400, 'USER_VALIDATION_ERROR', 'Request validation failed', fieldErrors(parsed.error)));
    req[assign] = parsed.data;
    return next();
  };
}
function validateUserIdParam(req, res, next) {
  if (!uuid.safeParse(req.params.id).success) return next(new HttpError(404, 'USER_NOT_FOUND', 'User not found'));
  return next();
}
module.exports = {
  validateLookupQuery: validate(lookupSchema, 'query', 'validatedQuery'),
  validateCredentialBody: validate(credentialSchema, 'body', 'validatedBody'),
  validatePasswordUpdateBody: validate(passwordSchema, 'body', 'validatedBody'),
  validateUserIdParam,
};