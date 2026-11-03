// Prepared, NOT EXECUTED. Pure HTTP-contract regression, no browser/DB/network.
import assert from 'node:assert/strict';
import {matchesRequest,assertReply,assertReadback} from './bridge-http-contract.mjs';
const initial={meals:[{slot:'TEST_ONLY',items:[{id:'TEST_ONLY',qty:10,unit:'g'}]}]};
const edited=structuredClone(initial);edited.meals[0].items[0].qty=20;
const expected={studentId:'TEST_ONLY',expectedFrame:{draft:1,health:2},expectedProjection:edited,excludedKeys:new Set(['old'])};
const body={p_student:'TEST_ONLY',p_expected:{draft:1,health:2},p_recipe:edited,p_request_key:'edited'};
const reply={request_key:'edited',recipe_projection:edited,guide:edited,publishable:false};
assert.equal(matchesRequest({...body,p_recipe:initial},expected),false,'Opening preview cannot satisfy edited request');
assert.equal(matchesRequest({...body,p_request_key:'old'},expected),false,'Late previously issued request excluded');
assert.equal(matchesRequest({...body,p_expected:{draft:0,health:2}},expected),false,'Stale revision excluded');
assert.equal(matchesRequest(body,expected),true);assertReply(body,reply,expected);
assert.throws(()=>assertReply(body,{...reply,request_key:'late'},expected));
assert.throws(()=>assertReply(body,{...reply,recipe_projection:initial},expected));
assert.throws(()=>assertReply(body,{...reply,guide:initial},expected));
assertReadback({student_id:'TEST_ONLY',draft_revision:2,guide:edited,publishable:false},{studentId:'TEST_ONLY',expectedProjection:edited,expectedRevision:2});
assert.throws(()=>assertReadback({student_id:'TEST_ONLY',draft_revision:2,guide:initial,publishable:false},{studentId:'TEST_ONLY',expectedProjection:edited,expectedRevision:2}));
console.log('PASS TEST_ONLY exact request/reply/readback and initial/late-response negatives');
