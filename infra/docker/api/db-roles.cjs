// Creates or updates the API's everyday database login, `lightchurch_app`.
// Runs from entrypoint.sh as the owner login, after migrations, on every start
// (so tables added by new migrations are granted too).
//
// The API then connects as lightchurch_app, which can read and write rows but
// cannot create, alter or drop tables, cannot touch Prisma's migration
// history, and cannot change or delete audit-log rows — the audit log is
// append-only in the database itself, not just in the code.
const { Client } = require('pg');

const ROLE = 'lightchurch_app';

async function main() {
  const password = process.env.POSTGRES_APP_PASSWORD;
  if (!password || password.length < 24) {
    throw new Error('POSTGRES_APP_PASSWORD must be at least 24 characters');
  }
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const db = (await client.query('SELECT current_database() AS db')).rows[0].db;
    const exists = (await client.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [ROLE]))
      .rowCount;
    const pw = client.escapeLiteral(password);
    const attrs = 'LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS';
    await client.query(`${exists ? 'ALTER' : 'CREATE'} ROLE ${ROLE} WITH ${attrs} PASSWORD ${pw}`);
    const statements = [
      `GRANT CONNECT ON DATABASE ${client.escapeIdentifier(db)} TO ${ROLE}`,
      'REVOKE CREATE ON SCHEMA public FROM PUBLIC',
      `GRANT USAGE ON SCHEMA public TO ${ROLE}`,
      `REVOKE ALL ON ALL TABLES IN SCHEMA public FROM ${ROLE}`,
      `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${ROLE}`,
      `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${ROLE}`,
      `REVOKE ALL ON TABLE "_prisma_migrations" FROM ${ROLE}`,
      `REVOKE UPDATE, DELETE, TRUNCATE ON TABLE "AuditLog" FROM ${ROLE}`,
    ];
    for (const sql of statements) await client.query(sql);
    console.log(`Database login ${ROLE} ready (rows only; audit log append-only)`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(`Could not set up ${ROLE}: ${err.message}`);
  process.exit(1);
});
