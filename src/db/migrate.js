const fs = require('fs');
const path = require('path');
const { pool } = require('./pool');
const MIGRATIONS_DIR = path.join(__dirname, '..', '..', 'migrations');
async function runMigrations(db = pool) {
  await db.query(`CREATE TABLE IF NOT EXISTS schema_migrations (filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
  const columns = await db.query(`SELECT column_name FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='schema_migrations'`);
  const names = new Set(columns.rows.map((row) => row.column_name));
  const key = names.has('filename') ? 'filename' : names.has('version') ? 'version' : null;
  if (!key) throw new Error('schema_migrations must include a filename or version column');
  for (const filename of fs.readdirSync(MIGRATIONS_DIR).filter((name) => /^\d+_.*\.sql$/.test(name)).sort()) {
    const applied = await db.query(`SELECT 1 FROM schema_migrations WHERE ${key}=$1`, [filename]);
    if (applied.rowCount) continue;
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query(fs.readFileSync(path.join(MIGRATIONS_DIR, filename), 'utf8'));
      await client.query(`INSERT INTO schema_migrations (${key}) VALUES ($1)`, [filename]);
      await client.query('COMMIT');
      console.log(`Applied migration ${filename}`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally { client.release(); }
  }
}
if (require.main === module) runMigrations().then(() => pool.end()).catch((err) => { console.error('Migration failed', err); process.exit(1); });
module.exports = { runMigrations };