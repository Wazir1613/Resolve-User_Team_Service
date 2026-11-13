const { jwtVerify }=require('jose');
const { HttpError }=require('../middleware/errorHandler');
async function serviceAuth(req,res,next){
 if(process.env.NODE_ENV==='test'&&process.env.TEST_AUTH_BYPASS==='true')return next();
 if(req.socket&&req.socket.authorized===true)return next();
 const header=req.header('authorization');const secret=process.env.INTERNAL_JWT_SECRET;
 if(header&&/^Bearer\\s+\\S+$/i.test(header)&&secret){try{const key=new TextEncoder().encode(secret);const options={algorithms:['HS256']};if(process.env.INTERNAL_JWT_ISSUER)options.issuer=process.env.INTERNAL_JWT_ISSUER;const {payload}=await jwtVerify(header.slice(7).trim(),key,options);if(typeof payload.service==='string'&&payload.service.trim()){req.serviceName=payload.service;return next();}}catch(err){/* Reject invalid credentials without forwarding end-user identity. */}}
 return next(new HttpError(401,'AUTH_MISSING_TOKEN','Service authentication required'));
}
module.exports={serviceAuth};