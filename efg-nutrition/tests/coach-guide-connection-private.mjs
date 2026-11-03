import assert from 'node:assert/strict';
import {createCoachGuideConnection} from '../pilot/coach-guide-connection.js';
import {scope as original,fixture} from './coach-guide-intake-fixture.mjs';
let scope=structuredClone(original),listener,release,unsubscribed=false;
const providers={
 readBinding:()=>({sessionId:scope.sessionId,sourceEpoch:scope.sourceEpoch,ownerId:'must-not-override-scope'}),
 readBundle:()=>new Promise(resolve=>{release=resolve;}),
 subscribe:fn=>{listener=fn;return()=>{unsubscribed=true;};}
};
assert.equal(createCoachGuideConnection({readScope:()=>scope}),null);
const connection=createCoachGuideConnection({enabled:true,readScope:()=>scope,providers});
assert.equal(connection.workspace.available(),true);
const opening=connection.workspace.open({replaceChildren(){}});
listener();release(fixture(original));
await assert.rejects(opening,/Cambió/);
assert.equal(connection.workspace.snapshot(),null,'Revocation must discard response/editor');
scope={...scope,ownerId:'other-coach'};
assert.equal(connection.workspace.available(),false,'Provider binding cannot override authorization');
connection.dispose();assert.equal(unsubscribed,true);
console.log('PASS synthetic connection: composed existing source/workspace, late-response invalidation, immutable auth scope and unsubscribe. No hosted provider or publish.');
