// Explicitly labelled real-network test cases. No web source is claimed to promise these values.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import ts from 'typescript';
import {createClient} from 'genlayer-js';
import {testnetBradbury} from 'genlayer-js/chains';
import {TransactionHashVariant} from 'genlayer-js/types';
import {privateKeyToAccount} from 'viem/accounts';
mkdirSync('.test-build',{recursive:true});
for(const name of ['domain','evidence','source-adapters','protocol']){
 const source=readFileSync(`lib/${name}.ts`,'utf8').replace(/from ['"]\.\/domain['"]/g,"from './domain.mjs'");
 writeFileSync(`.test-build/${name}.mjs`,ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText);
}
const {inspectChain}=await import('../.test-build/evidence.mjs');
const {inspectPublicSource}=await import('../.test-build/source-adapters.mjs');
const {payload,contractFor}=await import('../.test-build/protocol.mjs');
const path='reports/live-suite-v2.json';
const mode=process.argv[2];
const zero='0x'+'0'.repeat(40);
if(mode==='collect'){
 const base={type:'control',verification:'state',chain:'8453',address:'0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',source:'',cutoff:'2026-09-27T08:00:00Z',field:'owner()',expected:'0x3abd6f64a422225e61e435bae41db12096106df7',claim:'Historical comparison test: the Base USDC owner() value equals the expected address at the cutoff.'};
 const specs=[['base-owner-match',base,'Supported'],['base-owner-mismatch',{...base,expected:zero},'Contradicted'],['base-implementation',{...base,type:'upgrade',field:'EIP-1967',address:'0x4200000000000000000000000000000000000010',expected:'0xc0d3c0d3c0d3c0d3c0d3c0d3c0d3c0d3c0d30010',claim:'Historical comparison test: the Base bridge EIP-1967 implementation equals the expected address at the cutoff.'},'Supported'],['unrelated-x',{...base,verification:'promise',source:'https://x.com/GenLayer/status/2041643224536592387',claim:'Negative test fixture: this unrelated public post does not establish a dated promise about Base USDC ownership.'},'Insufficient evidence']];
 const results=[];
 for(const [name,input,expectedOutcome] of specs){
  const evidence=await Promise.all([...(input.source?[inspectPublicSource(input.source)]:[]),inspectChain(input)]);
  const record={id:randomUUID(),input,evidence,createdAt:new Date().toISOString(),state:'draft',protocolVersion:2};
  results.push({name,expectedOutcome,record});console.log(name,evidence.map(e=>({status:e.status,block:e.block,value:e.value,detail:e.detail})));
 }
 writeFileSync(path,JSON.stringify(results,null,2));
}else{
 const results=JSON.parse(readFileSync(path));
 const account=privateKeyToAccount(readFileSync('.secrets/testnet-key','utf8').trim());
 const client=createClient({chain:testnetBradbury,account});
 const save=()=>writeFileSync(path,JSON.stringify(results,null,2));
 const item=results.find(x=>x.name===process.argv[3]);
 if(!item)throw new Error('Specify a test name.');
 if(mode==='submit'){
  if(item.txId)throw new Error('Already submitted; inspect status instead.');
  item.balanceBefore=(await client.getBalance({address:account.address})).toString();save();
  item.txId=await client.writeContract({address:contractFor(item.record),functionName:'evaluate',args:[payload(item.record)],value:0n});save();console.log({name:item.name,txId:item.txId});
 }else if(mode==='status'){
  const tx=await client.getTransaction({hash:item.txId});item.status=tx.statusName;item.execution=tx.txExecutionResultName;item.votes=tx.lastRound?.validatorVotesName;
  if(item.execution==='FINISHED_WITH_RETURN'){
   const result=JSON.parse(await client.readContract({address:contractFor(item.record),functionName:'get_case',args:[item.record.id],transactionHashVariant:item.status==='FINALIZED'?TransactionHashVariant.LATEST_FINAL:TransactionHashVariant.LATEST_NONFINAL}));
   item.result=result;
   Object.assign(item.record,{txId:item.txId,contract:contractFor(item.record),state:item.status==='FINALIZED'?'finalized':'appeal window',execution:item.execution,outcome:result.outcome,explanation:result.explanation,reasonCode:result.reason_code,decisiveRefs:result.decisive_evidence_refs,evaluatedAt:result.evaluated_at});
  }
  save();console.log({name:item.name,status:item.status,execution:item.execution,votes:item.votes,outcome:item.result?.outcome,reason:item.result?.reason_code});
 }
}
