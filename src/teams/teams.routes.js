const express = require('express');
const { asyncHandler } = require('../utils/asyncHandler');
const { idempotencyMiddleware } = require('../middleware/idempotency');
const { authenticate } = require('../middleware/authenticate');
const { authorize, authorizeTeamManage } = require('../middleware/authorize');
const teamsController = require('./teams.controller');
const { validateCreateTeam, validatePatchTeam, validateAddMember, validateTeamIdParam, validateMemberUserIdParam } = require('./teams.validation');

const router = express.Router();

router.post('/', authenticate, authorizeTeamManage, validateCreateTeam, idempotencyMiddleware, asyncHandler(teamsController.createTeam));
router.get('/', authenticate, authorize('IAM_TEAM_MANAGE', 'IAM_TEAM_VIEW'), asyncHandler(teamsController.listTeams));
router.get('/:id', authenticate, validateTeamIdParam, authorize('IAM_TEAM_MANAGE', 'IAM_TEAM_VIEW'), asyncHandler(teamsController.getTeamById));
router.patch('/:id', authenticate, authorizeTeamManage, validateTeamIdParam, validatePatchTeam, asyncHandler(teamsController.patchTeam));
router.delete('/:id', authenticate, authorizeTeamManage, validateTeamIdParam, asyncHandler(teamsController.deleteTeam));
router.post('/:id/members', authenticate, authorizeTeamManage, validateTeamIdParam, validateAddMember, idempotencyMiddleware, asyncHandler(teamsController.addMember));
router.get('/:id/members', authenticate, validateTeamIdParam, authorize('IAM_TEAM_MANAGE', 'IAM_TEAM_VIEW'), asyncHandler(teamsController.listMembers));
router.delete('/:id/members/:userId', authenticate, authorizeTeamManage, validateTeamIdParam, validateMemberUserIdParam, asyncHandler(teamsController.deleteMember));

module.exports = router;