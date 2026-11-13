const express = require('express');
const { asyncHandler } = require('../utils/asyncHandler');
const { idempotencyMiddleware } = require('../middleware/idempotency');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const controller = require('./users.controller');
const { validateCreateUser, validatePatchUser, validateUserIdParam } = require('./users.validation');
const router = express.Router();
router.post('/', authenticate, authorize('IAM_USER_MANAGE'), validateCreateUser, idempotencyMiddleware, asyncHandler(controller.createUser));
router.get('/', authenticate, authorize('IAM_USER_MANAGE', 'IAM_USER_VIEW'), asyncHandler(controller.listUsers));
router.get('/:id', authenticate, validateUserIdParam, asyncHandler(controller.getUserById));
router.patch('/:id', authenticate, validateUserIdParam, validatePatchUser, asyncHandler(controller.patchUser));
// User deactivation is a status PATCH; hard-delete route intentionally omitted.
module.exports = router;