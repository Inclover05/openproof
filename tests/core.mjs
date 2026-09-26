import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import ts from 'typescript';
mkdirSync('.test-build',{recursive:true});
for(const name of ['domain','evidence']){
 const source=readFileSync(`lib/${name}.ts`,'utf8').replace(/from ['"]\.\/domain['"]/g,"from './domain.mjs'");
 writeFileSync(`.test-build/${name}.mjs`,ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText);
}
const {eligibleSource,lifecycle,caseSchema}=await import('../.test-build/domain.mjs');
const {historicalBlock,inspectSource,inspectChain}=await import('../.test-build/evidence.mjs');
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
