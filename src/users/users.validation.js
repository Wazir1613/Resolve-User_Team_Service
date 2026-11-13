const { z } = require('zod');
const { HttpError } = require('../middleware/errorHandler');

const STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];
const uuid = z.string().uuid();
const email = z.string().trim().email();
const username = z.string().trim().min(1).max(100);
const createSchema = z.object({
  email,
  username,
  fullName: z.string().trim().min(1).max(255),
  status: z.enum(STATUSES).optional(),
}).strict();
const patchSchema = z.object({
  email: email.optional(),
  username: username.optional(),
  fullName: z.string().trim().min(1).max(255).optional(),
  status: z.string().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'At least one field must be provided');

function fieldErrors(err) {
  return err.issues.map((issue) => ({
    field: issue.path.join('.') || 'body',
    code: issue.code === 'invalid_string' && issue.validation === 'email' ? 'INVALID_FORMAT' : 'INVALID_VALUE',
    message: issue.message,
  }));
}
function validateCreateUser(req, res, next) {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return next(new HttpError(400, 'USER_VALIDATION_ERROR', 'Request validation failed', fieldErrors(parsed.error)));
  req.validatedBody = parsed.data;
  return next();
}
function validatePatchUser(req, res, next) {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) return next(new HttpError(400, 'USER_VALIDATION_ERROR', 'Request validation failed', fieldErrors(parsed.error)));
  if (parsed.data.status !== undefined && !STATUSES.includes(parsed.data.status)) {
    return next(new HttpError(400, 'USER_INVALID_STATUS', 'Request validation failed', [
      { field: 'status', code: 'INVALID_ENUM_VALUE', message: 'status must be one of ACTIVE, INACTIVE, SUSPENDED' },
    ]));
  }
  req.validatedBody = parsed.data;
  return next();
}
function validateUserIdParam(req, res, next) {
  if (!uuid.safeParse(req.params.id).success) return next(new HttpError(404, 'USER_NOT_FOUND', 'User not found'));
  return next();
}
module.exports = { STATUSES, validateCreateUser, validatePatchUser, validateUserIdParam };