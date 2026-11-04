import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const registry=readFileSync(new URL('../migrations/20261104_qa_scope_registry_NOT_APPLIED.sql',import.meta.url),'utf8');
const consumers=readFileSync(new URL('../migrations/20261104_qa_scope_consumers_NOT_APPLIED.sql',import.meta.url),'utf8');
assert.equal((registry.match(/^begin;$/gm)||[]).length,1);
assert.equal((registry.match(/^commit;$/gm)||[]).length,1);
export const installSql='begin;\n'+registry.replace(/^begin;$/m,'').replace(/^commit;$/m,'')+'\n'+consumers+'\ncommit;\n';
