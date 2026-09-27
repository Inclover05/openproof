import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const root=process.env.OPENPROOF_TEST_URL||'http://127.0.0.1:3000';
const report=[];
async function post(path,body,origin=root){const response=await fetch(root+path,{method:'POST',headers:{'content-type':'application/json',origin},body:JSON.stringify(body)});return {status:response.status,data:await response.json()};}
async function check(name,run){await run();report.push({name,result:'PASS'});console.log('PASS',name);}
const tests=JSON.parse(readFileSync('reports/live-suite-v2.json'));
const input=tests[0].record.input;
let snapshotId,record;
await check('Legacy finalized case survives database migration',async()=>{const r=await fetch(root+'/api/cases/1b9b6bcf-4a34-4e60-bd91-b025f8134c07');const d=await r.json();assert.equal(r.status,200);assert.equal(d.record.outcome,'Insufficient evidence');assert.equal(d.record.contract,'0x0546Ba4582b7733DB52E3309692BCF7b5B1CAcCe');});
await check('Cross-origin mutations rejected',async()=>{const r=await post('/api/evidence',input,'https://unrelated.example');assert.equal(r.status,400);assert.match(r.data.error,/Cross-site/);});
await check('Unknown chain rejected',async()=>{assert.equal((await post('/api/evidence',{...input,chain:'137'})).status,400);});
await check('Future cutoff rejected',async()=>{assert.equal((await post('/api/evidence',{...input,cutoff:'2099-01-01T00:00:00Z'})).status,400);});
await check('Public X post is readable through attributed endpoint',async()=>{const r=await post('/api/source-check',{url:'https://x.com/GenLayer/status/2041643224536592387'});assert.equal(r.status,200);assert.equal(r.data.evidence.status,'readable');assert.equal(r.data.evidence.contentFormat,'x-oembed-v1');assert.ok(r.data.evidence.hash);});
await check('Private-network source blocked without fetch',async()=>{const r=await post('/api/source-check',{url:'https://127.0.0.1/admin'});assert.equal(r.data.evidence.status,'blocked');assert.equal(r.data.evidence.hash,undefined);});
await check('Historical state collected without a promise source',async()=>{const r=await post('/api/evidence',input);assert.equal(r.status,200,JSON.stringify(r.data));assert.equal(r.data.evidence.length,1);assert.equal(r.data.evidence[0].status,'readable');assert.equal(r.data.evidence[0].value.toLowerCase(),input.expected.toLowerCase());snapshotId=r.data.snapshotId;});
await check('Changed input cannot reuse the evidence snapshot',async()=>{const r=await post('/api/cases',{input:{...input,expected:'0x'+'0'.repeat(40)},snapshotId});assert.equal(r.status,400);assert.match(r.data.error,/Inputs changed/);});
await check('Save creates a durable draft without a verdict',async()=>{const r=await post('/api/cases',{input,snapshotId});assert.equal(r.status,201,JSON.stringify(r.data));record=r.data.record;assert.equal(record.protocolVersion,2);assert.equal(record.state,'draft');assert.equal(record.outcome,undefined);});
await check('Save is idempotent and reload preserves exact record',async()=>{const r=await post('/api/cases',{input,snapshotId});assert.equal(r.data.record.id,record.id);const d=await (await fetch(root+'/api/cases/'+record.id)).json();assert.deepEqual(d.record,record);});
await check('Invalid transaction cannot attach to a case',async()=>{assert.equal((await post('/api/cases/'+record.id+'/network',{txId:'bad'})).status,400);});
await check('Live fee quote works for source-free state mode',async()=>{const r=await post('/api/cases/'+record.id+'/quote',{account:'0xc0CECa4Dd4c72018a506ef6AD20724Df2C36C9A8'});assert.equal(r.status,200,JSON.stringify(r.data));assert.ok(Number(r.data.estimatedGen)>0);});
writeFileSync('reports/api-verification.json',JSON.stringify({root,checkedAt:new Date().toISOString(),caseId:record.id,checks:report},null,2));
