require('dotenv').config();
process.env.NODE_ENV = 'test';
process.env.TEST_AUTH_BYPASS = 'true';

const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/db/pool');
const { runMigrations } = require('../src/db/migrate');
const { resetIdempotencyStore } = require('../src/middleware/idempotency');
