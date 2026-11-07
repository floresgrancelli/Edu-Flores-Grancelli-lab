// New PUBLIC SYNTHETIC schema only. Never a migration or a prior suite bootstrap.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {openLocalRuntime, requireThat, MODEL} from './local-runtime.mjs';

export function setupSyntheticSchema() {
  let phase = 'inspect_runtime';
  try {
  const runtime = openLocalRuntime();
  phase = 'require_fresh_schema';
  requireThat(runtime.sql("select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p')") === '0',
    'REAL_STACK_FRESH_PUBLIC_SCHEMA_REQUIRED');
  requireThat(runtime.sql('select count(*) from auth.users') === '0', 'REAL_STACK_EMPTY_AUTH_REQUIRED');
  requireThat(runtime.sql("select count(*) from pg_namespace where nspname='ncc_synthetic'") === '0', 'REAL_STACK_SCHEMA_ALREADY_EXISTS');
  phase = 'apply_schema';
  runtime.sql(readFileSync(new URL('./schema.synthetic.sql', import.meta.url), 'utf8'));
  phase = 'verify_schema';
  requireThat(runtime.sql('select version from ncc_synthetic.model where singleton') === MODEL, 'REAL_STACK_MODEL_REQUIRED');
  return {status: 'PASS_PUBLIC_SYNTHETIC_SCHEMA_CREATED', evidence: runtime.evidence};
  } catch (error) {throw Object.assign(error, {phase});}
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {console.log(JSON.stringify(setupSyntheticSchema()));}
  catch (error) {console.log(JSON.stringify({status: 'FAILED', code: /^REAL_STACK_[A-Z_]+$/.test(error?.code || '') ? error.code : 'REAL_STACK_SETUP_FAILED',
    phase: ['inspect_runtime', 'require_fresh_schema', 'apply_schema', 'verify_schema'].includes(error?.phase) ? error.phase : 'setup',
    ...(/^[0-9A-Z]{5}$/.test(error?.sqlState || '') ? {sqlState: error.sqlState} : {})}));process.exitCode = 1;}
}
