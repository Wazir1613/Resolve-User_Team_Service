const { Pool } = require('pg');
require('dotenv').config();
const connectionString = process.env.DATABASE_URL || 'postgres://resolve:resolve123@localhost:5432/userteamdb';
const pool = new Pool({ connectionString });
module.exports = { pool };