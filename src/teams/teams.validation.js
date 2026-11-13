const { z } = require('zod');
const { HttpError } = require('../middleware/errorHandler');
const uuidSchema=z.string().uuid();
const createTeamSchema=z.object({name:z.string().trim().min(1,'name is required').max(255)}).strict();
const patchTeamSchema=z.object({name:z.string().trim().min(1,'name is required').max(255)}).strict();
const addMemberSchema=z.object({userId:uuidSchema}).strict();
function errors(err){return err.issues.map((issue)=>({field:issue.path.join('.')||'body',code:issue.code==='invalid_string'&&issue.validation==='uuid'?'INVALID_FORMAT':issue.code==='too_small'?'REQUIRED':'INVALID_VALUE',message:issue.message}));}
function validate(schema,req,next){const parsed=schema.safeParse(req.body);if(!parsed.success)return next(new HttpError(400,'TEAM_VALIDATION_ERROR','Request validation failed',errors(parsed.error)));req.validatedBody=parsed.data;return next();}
function validateCreateTeam(req,res,next){return validate(createTeamSchema,req,next);}
function validatePatchTeam(req,res,next){return validate(patchTeamSchema,req,next);}
function validateAddMember(req,res,next){return validate(addMemberSchema,req,next);}
function validateTeamIdParam(req,res,next){if(!uuidSchema.safeParse(req.params.id).success)return next(new HttpError(404,'TEAM_NOT_FOUND','Team not found'));return next();}
function validateMemberUserIdParam(req,res,next){if(!uuidSchema.safeParse(req.params.userId).success)return next(new HttpError(404,'TEAM_MEMBER_NOT_FOUND','User is not a member of this team'));return next();}
module.exports={validateCreateTeam,validatePatchTeam,validateAddMember,validateTeamIdParam,validateMemberUserIdParam};