// Test infrastructure only. No hosted credentials, URLs or customer records.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

export function localContext() {
  assert.equal(process.env.GITHUB_ACTIONS, 'true', 'Disposable CI stack required');
  for (const name of ['SUPABASE_ACCESS_TOKEN', 'SUPABASE_DB_PASSWORD',
    'PGHOSTADDR', 'PGSERVICE', 'PGSERVICEFILE', 'PGOPTIONS']) {
    assert.ok(!process.env[name], `Unexpected connection override: ${name}`);
  }
  const raw = readFileSync(process.env.EFG_LOCAL_STATUS_ENV || '', 'utf8');
  const env = Object.fromEntries(raw.split(/\r?\n/).filter(x => x.includes('=')).map(x => {
    const i = x.indexOf('=');
    return [x.slice(0, i), x.slice(i + 1).trim().replace(/^['"]|['"]$/g, '')];
  }));
  const url = new URL(env.API_URL);
  assert.equal(url.protocol, 'http:');
  assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname));
  assert.equal(url.port, '54321');
  assert.ok(env.ANON_KEY || env.PUBLISHABLE_KEY, 'Local anonymous key required');
  const pg = {...process.env, PGHOST: '127.0.0.1', PGPORT: '54322',
    PGUSER: 'postgres', PGPASSWORD: 'postgres', PGDATABASE: 'postgres'};
  function sql(query) {
    const r = spawnSync('psql', ['-X', '-Atq', '-v', 'ON_ERROR_STOP=1'],
      {env: pg, input: query, encoding: 'utf8', timeout: 30000});
    assert.equal(r.status, 0, (r.stderr || 'Local PostgreSQL failure').slice(-1800));
    return r.stdout.trim();
  }
  assert.equal(sql('select current_database()'), 'postgres');
  assert.ok(sql('show server_version_num').startsWith('17'), 'PostgreSQL 17 required');
  const key = env.ANON_KEY || env.PUBLISHABLE_KEY;
  async function request(path, {method = 'GET', token = key, body, prefer} = {}) {
    const r = await fetch(url.origin + path, {
      method, headers: {apikey: key, Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json', ...(prefer ? {Prefer: prefer} : {})},
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15000)
    });
    const text = await r.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    return {ok: r.ok, status: r.status, data};
  }
  const rpc = (name, token, body = {}) => request('/rest/v1/rpc/' + name,
    {method: 'POST', token, body});
  return {sql, request, rpc};
}

export const literal = value => "'" + String(value).replaceAll("'", "''") + "'";
export function yes(result, label) {
  assert.equal(result.ok, true, `${label}: ${result.status} ${JSON.stringify(result.data).slice(0, 500)}`);
  return result.data;
}
export function denied(result, label, codes = ['42501', 'PT409', '23505', '22023', 'P0001']) {
  assert.equal(result.ok, false, `${label}: unexpectedly succeeded`);
  // A missing RPC, stale schema cache or network error is NOT an authorization pass.
  assert.ok(codes.includes(result.data?.code),
    `${label}: unexpected error ${result.status} ${JSON.stringify(result.data).slice(0, 500)}`);
}
