require('dotenv').config();
const { SignJWT } = require('jose');

async function main()
{
    const secret = new TextEncoder().encode(process.env.INTERNAL_JWT_SECRET);

    const token = await new SignJWT({ service: 'local-swagger-test' })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuer(process.env.INTERNAL_JWT_ISSUER)
        .setIssuedAt()
        .setExpirationTime('8h')
        .sign(secret);

    console.log(token);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});