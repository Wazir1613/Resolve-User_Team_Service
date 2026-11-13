require('dotenv').config();
process.env.NODE_ENV='test';
process.env.TEST_AUTH_BYPASS='true';
process.env.JWT_SECRET=process.env.JWT_SECRET||'test-only-secret-do-not-use-outside-tests';
process.env.JWT_ISSUER=process.env.JWT_ISSUER||'test-issuer';
