const { HttpError } = require('../middleware/errorHandler');
const uuid=z=>require('zod').z.string().uuid().safeParse(z).success;
const { z }=require('zod');
function fieldErrors(err){return err.issues.map((issue)=>({field:issue.path.join('.')||'body',code:issue.code==='invalid_string'&&(issue.validation==='email'||issue.validation==='uuid')?'INVALID_FORMAT':'INVALID_VALUE',message:issue.message}));}
const lookupSchema=z.object({organizationId:z.string().uuid(),email:z.string().email()}).strict();
const credentialsSchema=z.object({plaintextPassword:z.string().min(1)}).strict();
const passwordSchema=z.object({newPlaintextPassword:z.string().min(8)}).strict();
function validate(schema,source,code,assign){return(req,res,next)=>{const parsed=schema.safeParse(req[source]);if(!parsed.success)return next(new HttpError(400,code,'Request validation failed',fieldErrors(parsed.error)));req[assign]=parsed.data;return next();};}
const validateLookupQuery=validate(lookupSchema,'query','USER_VALIDATION_ERROR','validatedQuery');
const validateCredentialBody=validate(credentialsSchema,'body','USER_VALIDATION_ERROR','validatedBody');
const validatePasswordUpdateBody=validate(passwordSchema,'body','USER_VALIDATION_ERROR','validatedBody');
function validateUserIdParam(req,res,next){if(!uuid(req.params.id))return next(new HttpError(404,'USER_NOT_FOUND','User not found'));return next();}
module.exports={validateLookupQuery,validateUserIdParam,validateCredentialBody,validatePasswordUpdateBody};