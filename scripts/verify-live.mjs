// Explicit test fixture: the supplied source does not make this contract promise.
// Uses only the locally funded Bradbury account, never a production signer.
import {readFileSync,writeFileSync} from 'node:fs';
import {createClient} from 'genlayer-js';
import {testnetBradbury} from 'genlayer-js/chains';
import {privateKeyToAccount} from 'viem/accounts';
const root=process.env.OPENPROOF_TEST_URL||'http://localhost:5173';
const file='reports/live-case.json';
const mode=process.argv[2];
async function post(path,body){const r=await fetch(root+path,{method:'POST',headers:{'content-type':'application/json',origin:root},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw new Error(JSON.stringify(d));return d;}
const save=x=>writeFileSync(file,JSON.stringify(x,null,2));
if(mode==='collect'){
 const input={claim:'Test fixture: this unrelated source does not establish a promise that this contract owner is the zero address.',type:'control',chain:'1',address:'0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',source:'https://raw.githubusercontent.com/OpenZeppelin/openzeppelin-contracts/v5.0.2/contracts/access/Ownable.sol',cutoff:'2026-09-01T00:00:00Z',field:'owner()',expected:'0x0000000000000000000000000000000000000000'};
 const evidence=await post('/api/evidence',input);console.log('Evidence',evidence.evidence);
 const {record}=await post('/api/cases',{input,snapshotId:evidence.snapshotId});save({record});console.log('Saved',record.id);
}else{
 const state=JSON.parse(readFileSync(file,'utf8'));const {record}=state;
 const account=privateKeyToAccount(readFileSync('.secrets/testnet-key','utf8').trim());const client=createClient({chain:testnetBradbury,account});
 const deployment=JSON.parse(readFileSync('reports/deployment.json','utf8'));
 if(mode==='submit'){
  if(state.txId)throw new Error('Already submitted. Use status.');
  state.quote=await post('/api/cases/'+record.id+'/quote',{account:account.address});
  const source=record.evidence.find(e=>e.kind==='source'),chain=record.evidence.find(e=>e.kind==='chain');if(!source.hash||chain.block===undefined)throw new Error('No anchored evidence');
  const payload=JSON.stringify({case_id:record.id,claim_type:record.input.type,chain_id:Number(record.input.chain),claim:record.input.claim,address:record.input.address,source:record.input.source,source_hash:source.hash,cutoff:Math.floor(Date.parse(record.input.cutoff)/1000),block:chain.block,field:record.input.field,expected:record.input.expected});
  state.balanceBefore=(await client.getBalance({address:account.address})).toString();save(state);
  state.txId=await client.writeContract({address:deployment.contract,functionName:'evaluate',args:[payload],value:0n});save(state);console.log({txId:state.txId,quote:state.quote});
 }else if(mode==='status'){
  const tx=await client.getTransaction({hash:state.txId});state.status=tx.statusName;state.execution=tx.txExecutionResultName;state.votes=tx.lastRound?.validatorVotesName;
  state.balanceAfter=(await client.getBalance({address:account.address})).toString();state.balanceDelta=(BigInt(state.balanceBefore)-BigInt(state.balanceAfter)).toString();save(state);
  console.log({status:state.status,execution:state.execution,votes:state.votes,balanceDelta:state.balanceDelta});
  const attached=await post('/api/cases/'+record.id+'/network',{txId:state.txId});state.record=attached.record;save(state);console.log('App',state.record.state,state.record.outcome,state.record.reasonCode);
 }
}
