const { z } = require('zod');
const { HttpError } = require('../middleware/errorHandler');
const uuidSchema = z.string().uuid();
const lookupQuerySchema = z.object({ organizationId: uuidSchema, email: z.string().email() });
const credentialBodySchema = z.object({ plaintextPassword: z.string().min(1) });
const passwordUpdateBodySchema = z.object({ newPlaintextPassword: z.string().min(8) });

function fieldErrorsFromZod(err) {
  return err.issues.map((issue) => ({
    field: issue.path.join('.') || 'body',
    code: issue.code === 'invalid_string' && ['email', 'uuid'].includes(issue.validation) ? 'INVALID_FORMAT' : 'INVALID_VALUE',
    message: issue.message,
  }));
}
function validate(schema, source, code, assign) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req[source]);
    if (!parsed.success) return next(new HttpError(400, code, 'Request validation failed', fieldErrorsFromZod(parsed.error)));
    req[assign] = parsed.data;
    return next();
  };
}
const validateLookupQuery = validate(lookupQuerySchema, 'query', 'USER_VALIDATION_ERROR', 'validatedQuery');
const validateCredentialBody = validate(credentialBodySchema, 'body', 'USER_VALIDATION_ERROR', 'validatedBody');
const validatePasswordUpdateBody = validate(passwordUpdateBodySchema, 'body', 'USER_VALIDATION_ERROR', 'validatedBody');
function validateUserIdParam(req, res, next) {
  if (!uuidSchema.safeParse(req.params.id).success) return next(new HttpError(404, 'USER_NOT_FOUND', 'User not found'));
  return next();
}
module.exports = { validateLookupQuery, validateUserIdParam, validateCredentialBody, validatePasswordUpdateBody };