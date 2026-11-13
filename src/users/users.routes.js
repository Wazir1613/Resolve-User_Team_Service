const express = require('express');
const { asyncHandler } = require('../utils/asyncHandler');
const { idempotencyMiddleware } = require('../middleware/idempotency');
const { authenticate } = require('../middleware/authenticate');
const { authorize, authorizeUserRead, authorizeUserPatch } = require('../middleware/authorize');
const usersController = require('./users.controller');
const { validateCreateUser, validatePatchUser, validateUserIdParam } = require('./users.validation');

const router = express.Router();

router.post('/', authenticate, authorize('IAM_USER_MANAGE'), validateCreateUser, idempotencyMiddleware, asyncHandler(usersController.createUser));
router.get('/', authenticate, authorize('IAM_USER_MANAGE', 'IAM_USER_VIEW'), asyncHandler(usersController.listUsers));
router.get('/:id', authenticate, validateUserIdParam, authorizeUserRead, asyncHandler(usersController.getUserById));
router.patch('/:id', authenticate, validateUserIdParam, validatePatchUser, authorizeUserPatch, asyncHandler(usersController.patchUser));

module.exports = router;