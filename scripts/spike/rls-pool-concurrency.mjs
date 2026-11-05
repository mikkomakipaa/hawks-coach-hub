#!/usr/bin/env node
/**
 * ADR-001 spike, check 8: no identity leak across requests on a pooled Postgres connection.
 *
 * Needs the spike schema (docs/adr/ADR-001-spike-rls.sql) on a throwaway Neon branch and a
 * login for the app_runtime role. Run:
 *   DATABASE_URL="<pooled url for app_runtime on the spike branch>" node scripts/spike/rls-pool-concurrency.mjs
 *   ... --unsafe   control run: uses a session-level setting; leaks are EXPECTED and prove the test can detect them
 *
 * Never point this at a database with real data. Secrets come from the environment only.
 */
import pg from 'pg';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set');
  process.exit(2);
}
if (!/-pooler\./.test(url)) {
  console.warn('WARNING: URL host has no "-pooler"; this is not the pooled connection, so the test proves little.');
}

const unsafe = process.argv.includes('--unsafe');
const TASKS = Number(process.env.TASKS ?? 400);
const POOL_SIZE = Number(process.env.POOL_SIZE ?? 8);
const users = [
  { id: 'coach-a', team: 'Team A' },
  { id: 'coach-b', team: 'Team B' },
  { id: null, team: null },
];

const pool = new pg.Pool({ connectionString: url, max: POOL_SIZE });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const failures = [];
const connectionPids = new Set();

async function request(n) {
  const user = users[n % users.length];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const pid = (await client.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
    connectionPids.add(pid);
    if (user.id) {
      // unsafe control: is_local=false makes the setting survive the transaction on a reused connection
      await client.query("SELECT set_config('app.user_id', $1, $2)", [user.id, !unsafe]);
    }
    await sleep(Math.random() * 20);
    const { rows } = await client.query('SELECT name FROM app.teams ORDER BY name');
    const names = rows.map((r) => r.name);
    const expected = user.team ? [user.team] : [];
    if (JSON.stringify(names) !== JSON.stringify(expected)) {
      failures.push({ request: n, user: user.id, expected, got: names, pid });
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    failures.push({ request: n, user: user.id, error: String(err.message ?? err) });
  } finally {
    client.release();
  }
}

async function assertRestrictedRole() {
  const { rows } = await pool.query(
    'SELECT current_user AS who, r.rolbypassrls AS bypass, r.rolsuper AS super FROM pg_roles r WHERE r.rolname = current_user',
  );
  const { who, bypass, super: isSuper } = rows[0];
  console.log(`Connected as role "${who}" (bypassrls=${bypass}, superuser=${isSuper})`);
  if (bypass || isSuper || who !== 'app_runtime') {
    console.error('ABORT: this connection is not the restricted app_runtime role, so RLS is not enforced and the result would be meaningless. Use the app_runtime connection string.');
    await pool.end();
    process.exit(2);
  }
}

try {
  await assertRestrictedRole();
  const t0 = Date.now();
  await Promise.all(Array.from({ length: TASKS }, (_, i) => request(i)));
  const ms = Date.now() - t0;
  console.log(
    `${TASKS} requests, pool size ${POOL_SIZE}, ${connectionPids.size} distinct backend connections, ${ms} ms, mode: ${unsafe ? 'UNSAFE control' : 'SET LOCAL'}`,
  );
  if (failures.length) {
    console.log(`${failures.length} mismatches. First 3:`, failures.slice(0, 3));
  } else {
    console.log('No mismatches.');
  }
  if (unsafe) {
    console.log(failures.length ? 'Control OK: the test detects leaks.' : 'Control did NOT leak; the test may be too weak.');
    process.exit(failures.length ? 0 : 1);
  }
  process.exit(failures.length ? 1 : 0);
} finally {
  await pool.end();
}
