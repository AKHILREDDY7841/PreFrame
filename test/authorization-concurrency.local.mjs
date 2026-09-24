// Run only against the disposable local Supabase database, never production.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';

const pool = new pg.Pool({
  host: process.env.PREFRAME_LOCAL_DB_HOST || '127.0.0.1',
  port: Number(process.env.PREFRAME_LOCAL_DB_PORT || 55122),
  user: 'postgres',
  password: process.env.PREFRAME_LOCAL_DB_PASSWORD || 'postgres',
  database: 'postgres',
  max: 6,
  connectionTimeoutMillis: 5000,
});
const ids = Array.from({ length: 4 }, () => randomUUID());
const emails = ['race-owner@example.test', 'race-a@example.test', 'race-b@example.test', 'race-c@example.test'];

async function asUser(index, sql, params = [], holdMs = 0) {
  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query('set local role authenticated');
    await client.query('select set_config($1, $2, true)', ['request.jwt.claim.sub', ids[index]]);
    await client.query('select set_config($1, $2, true)', ['request.jwt.claim.email', emails[index]]);
    const result = await client.query(sql, params);
    if (holdMs) await new Promise((resolve) => setTimeout(resolve, holdMs));
    await client.query('commit');
    return { ok: true, rows: result.rows };
  } catch (error) {
    await client.query('rollback');
    return { ok: false, message: error.message };
  } finally {
    client.release();
  }
}

function assertOneAccepted(results, expectedError) {
  assert.equal(results.filter((result) => result.ok).length, 1, JSON.stringify(results));
  assert.equal(results.filter((result) => !result.ok).length, 1, JSON.stringify(results));
  assert.match(results.find((result) => !result.ok).message, expectedError);
}

async function main() {
  let projectId;
  try {
    for (let i = 0; i < ids.length; i++) {
      await pool.query(`insert into auth.users
        (id, aud, role, email, encrypted_password, email_confirmed_at,
         raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
        values ($1, 'authenticated', 'authenticated', $2, '', now(), '{}', '{}', now(), now())`,
        [ids[i], emails[i]]);
    }

    // One request holds its transaction open while the other reaches the lock.
    const creations = await Promise.all([
      asUser(0, "select public.create_project_limited('Race A', 'UTC') as id", [], 150),
      asUser(0, "select public.create_project_limited('Race B', 'UTC') as id"),
    ]);
    assertOneAccepted(creations, /free owned project limit reached/);
    projectId = creations.find((result) => result.ok).rows[0].id;
    console.log('PASS concurrent Free project creation: one of two accepted');

    await pool.query(`insert into public.shots(project_id, ordinal)
      select $1, ordinal from generate_series(1, 49) ordinal`, [projectId]);
    const shots = await Promise.all([
      asUser(0, 'insert into public.shots(project_id, ordinal) values ($1, 50)', [projectId], 150),
      asUser(0, 'insert into public.shots(project_id, ordinal) values ($1, 51)', [projectId]),
    ]);
    assertOneAccepted(shots, /free item limit reached/);
    const shotCount = await pool.query('select count(*)::integer as count from public.shots where project_id = $1', [projectId]);
    assert.equal(shotCount.rows[0].count, 50);
    console.log('PASS concurrent shot cap: exactly 50 persisted');

    const invitationA = await asUser(0, 'select public.invite_editor($1, $2) as id', [projectId, emails[1]]);
    assert.equal(invitationA.ok, true, JSON.stringify(invitationA));
    const acceptedA = await asUser(1, 'select public.accept_project_invitation($1)', [invitationA.rows[0].id]);
    assert.equal(acceptedA.ok, true, JSON.stringify(acceptedA));
    const invitationB = await asUser(0, 'select public.invite_editor($1, $2) as id', [projectId, emails[2]]);
    const invitationC = await asUser(0, 'select public.invite_editor($1, $2) as id', [projectId, emails[3]]);
    assert.equal(invitationB.ok && invitationC.ok, true);
    const accepts = await Promise.all([
      asUser(2, 'select public.accept_project_invitation($1)', [invitationB.rows[0].id], 150),
      asUser(3, 'select public.accept_project_invitation($1)', [invitationC.rows[0].id]),
    ]);
    assertOneAccepted(accepts, /editor seat limit reached/);
    const seats = await pool.query('select count(*)::integer as count from public.project_members where project_id = $1', [projectId]);
    assert.equal(seats.rows[0].count, 3);
    console.log('PASS concurrent editor cap: exactly 3 accepted members');
  } finally {
    if (projectId) await pool.query('delete from public.projects where id = $1', [projectId]);
    await pool.query('delete from auth.users where id = any($1::uuid[])', [ids]);
    await pool.end();
  }
}

await main();
