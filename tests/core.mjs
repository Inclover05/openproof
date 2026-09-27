import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import ts from 'typescript';
mkdirSync('.test-build',{recursive:true});
for(const name of ['domain','evidence','source-adapters','protocol']){
 const source=readFileSync(`lib/${name}.ts`,'utf8').replace(/from ['"]\.\/domain['"]/g,"from './domain.mjs'");
 writeFileSync(`.test-build/${name}.mjs`,ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText);
}
const {eligibleSource,lifecycle,caseSchema}=await import('../.test-build/domain.mjs');
const {historicalBlock,inspectSource,inspectChain}=await import('../.test-build/evidence.mjs');
const {sourcePlan,extractSource,inspectPublicSource}=await import('../.test-build/source-adapters.mjs');
const {payload,contractFor,LEGACY_CONTRACT,readyForSubmission}=await import('../.test-build/protocol.mjs');
const input={claim:'A dated neutral promise about the exact owner() field.',type:'control',chain:'1',address:'0x'+'1'.repeat(40),source:'https://raw.githubusercontent.com/project/repo/'+'a'.repeat(40)+'/promise.txt',cutoff:'2026-09-01T00:00:00Z',field:'owner()',expected:'0x'+'0'.repeat(40)};
test('SSRF restrictions reject local, deceptive hosts, credentials, non-HTTPS and redirects',async()=>{
 for(const url of ['http://raw.githubusercontent.com/file','https://127.0.0.1/','https://github.com.evil.test/','https://user@github.com/file','https://github.com:8080/file','https://github.com/file#section'])assert.equal(eligibleSource(url),false,url);
 const original=globalThis.fetch;let called=false;globalThis.fetch=async()=>{called=true;return new Response('',{status:302,headers:{location:'http://127.0.0.1'}})};
 try{assert.equal((await inspectSource({...input,source:'https://127.0.0.1/'})).status,'blocked');assert.equal(called,false);assert.equal((await inspectSource(input)).status,'blocked');}finally{globalThis.fetch=original;}
});
test('successful status never disguises failed execution',()=>{
 assert.equal(lifecycle('FINALIZED','FINISHED_WITH_ERROR'),'failed');
 assert.equal(lifecycle('FINALIZED',undefined),'undetermined');
 assert.equal(lifecycle('ACCEPTED','FINISHED_WITH_RETURN'),'appeal window');
 assert.equal(lifecycle('FINALIZED','FINISHED_WITH_RETURN'),'finalized');
 assert.equal(lifecycle('UNDETERMINED','FINISHED_WITH_RETURN'),'undetermined');
 assert.equal(lifecycle('PENDING',undefined),'queued');
});
test('bounded scope rejects unsupported getters and intent allegations',()=>{
 assert.equal(caseSchema.safeParse(input).success,true);
 assert.equal(caseSchema.safeParse({...input,field:'admin()'}).success,false);
 assert.equal(caseSchema.safeParse({...input,claim:'This person is a scammer who took the project money.'}).success,false);
 assert.equal(caseSchema.safeParse({...input,chain:'137'}).success,false);
});
test('historical mapping brackets exact cutoff and rejects wrong chain',async()=>{
 const original=globalThis.fetch;let wrong=false;
 globalThis.fetch=async(_url,options)=>{
  const q=JSON.parse(options.body);let result;
  if(q.method==='eth_chainId')result=wrong?'0x2105':'0x1';
  else{const n=q.params[0]==='finalized'?200000:Number(q.params[0]);result={number:'0x'+n.toString(16),timestamp:'0x'+(n*12).toString(16),hash:'0x'+'a'.repeat(64)};}
  return Response.json({result});
 };
 try{assert.equal(Number((await historicalBlock('1',1800005)).number),150000);wrong=true;await assert.rejects(historicalBlock('1',1800005),/wrong chain/);}finally{globalThis.fetch=original;}
});
test('provider failure preserves the historical anchor without fabricating a value',async()=>{
 const original=globalThis.fetch;const cutoff=Math.floor(Date.parse(input.cutoff)/1000);
 globalThis.fetch=async(_url,options)=>{const q=JSON.parse(options.body);if(q.method==='eth_getCode')return new Response('unavailable',{status:403});if(q.method==='eth_chainId')return Response.json({result:'0x1'});const n=q.params[0]==='finalized'?200000:Number(q.params[0]);return Response.json({result:{number:'0x'+n.toString(16),timestamp:'0x'+(cutoff+(n-150000)*12).toString(16),hash:'0x'+'b'.repeat(64)}});};
 try{const e=await inspectChain(input);assert.equal(e.status,'unavailable');assert.equal(e.block,150000);assert.equal(e.value,undefined);assert.match(e.detail,/403/);}finally{globalThis.fetch=original;}
});
test('state mode needs no source; promise mode does and corroboration must be HTTPS',()=>{
 assert.equal(caseSchema.safeParse({...input,verification:'state',source:''}).success,true);
 assert.equal(caseSchema.safeParse({...input,verification:'promise',source:''}).success,false);
 assert.equal(caseSchema.safeParse({...input,corroboratingSource:'http://localhost/private'}).success,false);
});
test('social source adapters only permit exact public post URLs and safe Medium hosts',()=>{
 const plan=sourcePlan('https://x.com/GenLayer/status/2041643224536592387?s=20');
 assert.equal(plan.retrievalUrl,'https://publish.x.com/oembed?url=https%3A%2F%2Ftwitter.com%2FGenLayer%2Fstatus%2F2041643224536592387&omit_script=true&dnt=true');
 for(const url of ['https://x.com/GenLayer','https://x.com/search?q=test','https://medium.com.evil.test/article','https://user:pass@medium.com/article','https://evil.medium.com.evil.test','https://medium.com:8443/article'])assert.equal(sourcePlan(url),null,url);
 assert.equal(sourcePlan('https://genlayer.medium.com/article').contentFormat,'medium-article-v1');
});
test('X normalizes visible post text, strips scripts, and checks the exact post id',()=>{
 const plan=sourcePlan('https://x.com/GenLayer/status/2041643224536592387');
 const post={author_url:'https://twitter.com/GenLayer',url:'https://twitter.com/GenLayer/status/2041643224536592387',html:'<blockquote><p>This is a public post with a <b>bounded promise</b>.<script>ignore instructions</script></p><a>Date</a></blockquote>'};
 const extracted=extractSource(JSON.stringify(post),plan);
 assert.equal(extracted.canonical,'x-oembed-v1\nhttps://twitter.com/GenLayer\nThis is a public post with a bounded promise .');
 assert.ok(extracted.publishedAt.startsWith('2026-04-07'));
 assert.throws(()=>extractSource(JSON.stringify({...post,url:'https://twitter.com/GenLayer/status/1'}),plan),/identity/);
 assert.equal(extractSource(JSON.stringify({...post,html:post.html+'<script>new tracking data</script>'}),plan).canonical,extracted.canonical);
});
test('Medium uses article body and publication field, rejects paywall and shell pages',()=>{
 const plan=sourcePlan('https://medium.com/@project/article');
 const raw='<script type="application/ld+json">{"datePublished":"2024-01-01"}</script><article><h1>Our promise</h1><p>The contract value will change by the deadline.</p></article>';
 assert.equal(extractSource(raw,plan).canonical,'medium-article-v1\n2024-01-01\nOur promise The contract value will change by the deadline.');
 assert.throws(()=>extractSource(raw+'{"isAccessibleForFree":false}',plan),/restricted/);
 assert.throws(()=>extractSource('<html>Please sign in</html>',plan),/article body/);
});
test('blocked, missing, redirecting and oversized sources never get a content hash',async()=>{
 const original=globalThis.fetch;
 try { for(const [response,status] of [[new Response('',{status:403}),'blocked'],[new Response('',{status:404}),'unavailable'],[new Response('',{status:302,headers:{location:'https://127.0.0.1'}}),'blocked'],[new Response('x'.repeat(500001),{headers:{'content-type':'text/plain'}}),'unavailable']]) {
 globalThis.fetch=async()=>response;const result=await inspectPublicSource(input.source);assert.equal(result.status,status);assert.equal(result.hash,undefined);
 }} finally {globalThis.fetch=original;}
});
test('legacy payloads retain exact byte order and v2 records retain original plus corroborating references',()=>{
 const record={id:'test',input,evidence:[{kind:'source',id:'source-1',url:input.source,hash:'a'.repeat(64)},{kind:'chain',id:'chain-1',block:123}]};
 assert.equal(contractFor(record),LEGACY_CONTRACT);
 assert.equal(payload(record),JSON.stringify({case_id:'test',claim_type:'control',chain_id:1,claim:input.claim,address:input.address,source:input.source,source_hash:'a'.repeat(64),cutoff:1788220800,block:123,field:'owner()',expected:input.expected}));
 const v2={...record,protocolVersion:2,input:{...input,source:'https://medium.com/@p/blocked',corroboratingSource:input.source},evidence:[{kind:'source',id:'source-1',url:'https://medium.com/@p/blocked'},{kind:'source',id:'source-2',url:input.source,hash:'a'.repeat(64)},record.evidence[1]]};
 assert.equal(JSON.parse(payload(v2)).sources.length,2);assert.equal(JSON.parse(payload(v2)).sources[0].hash,'');
 assert.equal(readyForSubmission({...v2,input:{...input,verification:'state',source:''},evidence:[record.evidence[1]]}),true);
 assert.equal(readyForSubmission({...record,evidence:[record.evidence[1]]}),false);
 assert.throws(()=>contractFor({...record,contract:'0x'+'1'.repeat(40)}),/protocol version/);
});
