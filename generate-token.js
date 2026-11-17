require('dotenv').config();
const { SignJWT } = require('jose');

async function main()
{
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);

    const token = await new SignJWT({
        tenantId: '11111111-1111-1111-1111-111111111111',
        type: 'access',
        permissions: ['IAM_USER_MANAGE', 'IAM_USER_VIEW', 'IAM_TEAM_MANAGE', 'IAM_TEAM_VIEW'],
    })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject('11111111-1111-1111-1111-111112222222')
        .setIssuer(process.env.JWT_ISSUER)
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(secret);

    console.log(token);
}

main();