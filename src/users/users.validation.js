const { z } = require('zod');
const { HttpError } = require('../middleware/errorHandler');
const STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];
const uuidSchema = z.string().uuid();
const emailSchema = z.string().trim().email();
const usernameSchema = z.string().trim().min(1).max(100);
const createUserBodySchema = z.object({ email: emailSchema, username: usernameSchema, fullName: z.string().trim().min(1).max(255), status: z.enum(STATUSES).optional() }).strict();
const patchUserBodySchema = z.object({ email: emailSchema.optional(), username: usernameSchema.optional(), fullName: z.string().trim().min(1).max(255).optional(), status: z.enum(STATUSES).optional() }).strict().refine((value) => Object.keys(value).length > 0, 'At least one field must be provided');
function fieldErrorsFromZod(err) {
  return err.issues.map((issue) => ({ field: issue.path.join('.') || 'body', code: issue.code === 'invalid_string' && issue.validation === 'email' ? 'INVALID_FORMAT' : issue.code === 'invalid_enum_value' ? 'INVALID_ENUM_VALUE' : 'INVALID_VALUE', message: issue.message }));
}
function validateBody(schema, req, next) {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return next(new HttpError(400, 'USER_VALIDATION_ERROR', 'Request validation failed', fieldErrorsFromZod(parsed.error)));
  req.validatedBody = parsed.data;
  return next();
}
function validateCreateUser(req, res, next) { return validateBody(createUserBodySchema, req, next); }
function validatePatchUser(req, res, next) {
  const parsed = patchUserBodySchema.safeParse(req.body);
  if (!parsed.success) {
    const statusIssue = parsed.error.issues.find((issue) => issue.path[0] === 'status');
    if (statusIssue && statusIssue.code === 'invalid_enum_value') return next(new HttpError(400, 'USER_INVALID_STATUS', 'Request validation failed', [{ field: 'status', code: 'INVALID_ENUM_VALUE', message: 'status must be one of ACTIVE, INACTIVE, SUSPENDED' }]));
    return next(new HttpError(400, 'USER_VALIDATION_ERROR', 'Request validation failed', fieldErrorsFromZod(parsed.error)));
  }
  req.validatedBody = parsed.data;
  return next();
}
function validateUserIdParam(req, res, next) {
  if (!uuidSchema.safeParse(req.params.id).success) return next(new HttpError(404, 'USER_NOT_FOUND', 'User not found'));
  return next();
}
module.exports = { STATUSES, validateCreateUser, validatePatchUser, validateUserIdParam };