const { HttpError } = require('./errorHandler');
function hasPermission(req, permission) { return Array.isArray(req.permissions) && req.permissions.includes(permission); }
function authorize(...permissions) {
  return (req,res,next)=>{
    if(permissions.some((permission)=>hasPermission(req,permission))) return next();
    const isTeam=permissions.some((permission)=>permission.startsWith('IAM_TEAM'));
    return next(new HttpError(403,isTeam?'TEAM_FORBIDDEN':'USER_FORBIDDEN','Caller lacks the required permission'));
  };
}
function authorizeTeamManage(req,res,next) { return hasPermission(req,'IAM_TEAM_MANAGE') ? next() : next(new HttpError(403,'TEAM_FORBIDDEN','Caller lacks the required team-management permission')); }
module.exports={hasPermission,authorize,authorizeTeamManage};