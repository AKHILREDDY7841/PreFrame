// Local-only PostgREST authorization smoke test. Credentials arrive at runtime
// from `supabase status -o env`; no hosted or service-role key is stored here.
import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import pg from 'pg';

const apiUrl = process.env.PREFRAME_LOCAL_API_URL;
const anonKey = process.env.PREFRAME_LOCAL_ANON_KEY;
const jwtSecret = process.env.PREFRAME_LOCAL_JWT_SECRET;
if (!apiUrl?.startsWith('http://127.0.0.1:') || !anonKey || !jwtSecret) {
  throw new Error('Only the local Supabase API and runtime keys are supported');
}
const pool = new pg.Pool({ host: '127.0.0.1', port: 55122, user: 'postgres', password: 'postgres', database: 'postgres' });
const ownerId = randomUUID();
const outsiderId = randomUUID();

function jwt(userId, email) {
  const base64 = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const body = `${base64({ alg: 'HS256', typ: 'JWT' })}.${base64({
    aud: 'authenticated', role: 'authenticated', sub: userId, email,
    iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 600,
  })}`;
  return `${body}.${createHmac('sha256', jwtSecret).update(body).digest('base64url')}`;
}

async function request(path, userId, email, method = 'GET', body) {
  const response = await fetch(`${apiUrl}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${jwt(userId, email)}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: body && JSON.stringify(body),
  });
  const payload = await response.json();
  return { status: response.status, payload };
}

let projectId;
try {
  for (const [id, email] of [[ownerId, 'rest-owner@example.test'], [outsiderId, 'rest-outsider@example.test']]) {
    await pool.query(`insert into auth.users
      (id, aud, role, email, encrypted_password, email_confirmed_at,
       raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
      values ($1, 'authenticated', 'authenticated', $2, '', now(), '{}', '{}', now(), now())`, [id, email]);
  }
  const created = await request('rpc/create_project_limited', ownerId, 'rest-owner@example.test', 'POST', {
    p_title: 'REST isolation test', p_timezone: 'UTC',
  });
  assert.equal(created.status, 200, JSON.stringify(created));
  projectId = created.payload;
  const ownerRead = await request(`projects?id=eq.${projectId}&select=id,title`, ownerId, 'rest-owner@example.test');
  assert.equal(ownerRead.status, 200);
  assert.equal(ownerRead.payload.length, 1);
  const outsiderRead = await request(`projects?id=eq.${projectId}&select=id,title`, outsiderId, 'rest-outsider@example.test');
  assert.equal(outsiderRead.status, 200);
  assert.deepEqual(outsiderRead.payload, []);
  console.log('PASS REST: owner can read; outsider sees no project');

  const forgedMember = await request('project_members', outsiderId, 'rest-outsider@example.test', 'POST', {
    project_id: projectId, user_id: outsiderId, role: 'editor',
  });
  assert.ok(forgedMember.status >= 400, JSON.stringify(forgedMember));
  const members = await pool.query('select count(*)::integer as count from public.project_members where project_id = $1', [projectId]);
  assert.equal(members.rows[0].count, 1);
  const forgedShot = await request('shots', outsiderId, 'rest-outsider@example.test', 'POST', {
    project_id: projectId, ordinal: 1,
  });
  assert.ok(forgedShot.status >= 400, JSON.stringify(forgedShot));
  const shots = await pool.query('select count(*)::integer as count from public.shots where project_id = $1', [projectId]);
  assert.equal(shots.rows[0].count, 0);
  console.log('PASS REST: forged membership and cross-project shot writes denied');
} finally {
  if (projectId) await pool.query('delete from public.projects where id = $1', [projectId]);
  await pool.query('delete from auth.users where id = any($1::uuid[])', [[ownerId, outsiderId]]);
  await pool.end();
}
