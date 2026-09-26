import {createClient} from 'genlayer-js';
import {testnetBradbury} from 'genlayer-js/chains';
import {privateKeyToAccount} from 'viem/accounts';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
const account=privateKeyToAccount(readFileSync('.secrets/testnet-key','utf8').trim());
const client=createClient({chain:testnetBradbury,account});
const mode=process.argv[2];
const path='reports/deployment.json';
let state=existsSync(path)?JSON.parse(readFileSync(path,'utf8')):{network:'testnet-bradbury',chainId:4221,sdk:'1.1.8',deployer:account.address};
const save=()=>writeFileSync(path,JSON.stringify(state,null,2));
try{
 if(mode==='deploy'){
  if(state.txId)throw new Error('Deployment already submitted; use status.');
  const balance=await client.getBalance({address:account.address});state.balanceBefore=balance.toString();save();
  if(balance===0n)throw new Error('Fund the testnet account first.');
  const txId=await client.deployContract({code:readFileSync('contracts/openproof.py','utf8'),args:[]});
  state.txId=txId;state.submittedAt=new Date().toISOString();save();console.log(JSON.stringify(state));
 }else if(mode==='status'){
  const tx=await client.getTransaction({hash:state.txId});
  state.status=tx.statusName||tx.status;state.execution=tx.txExecutionResultName;state.contract=tx.to_address||tx.recipient||tx.txDataDecoded?.contractAddress;state.balanceAfter=(await client.getBalance({address:account.address})).toString();save();writeFileSync('reports/deployment-receipt.json',JSON.stringify(tx,(_,v)=>typeof v==='bigint'?v.toString():v,2));console.log(JSON.stringify(state));
 }else if(mode==='probe'){
  const probeId=process.argv[3]||'public-docs';const source=process.argv[4]||'https://docs.genlayer.com/developers/networks';
  const txId=await client.writeContract({address:state.contract,functionName:'probe',args:[probeId,source],value:0n});
  const p={probeId,source,txId,submittedAt:new Date().toISOString()};writeFileSync('reports/probe-'+probeId+'.json',JSON.stringify(p,null,2));console.log(p);
 }else if(mode==='probe-status'){
  const id=process.argv[3]||'public-docs';const p=JSON.parse(readFileSync('reports/probe-'+id+'.json','utf8'));const tx=await client.getTransaction({hash:p.txId});p.status=tx.statusName||tx.status;p.execution=tx.txExecutionResultName;p.votes=tx.lastRound?.validatorVotesName;p.validators=tx.lastRound?.roundValidators;
  if(p.execution==='FINISHED_WITH_RETURN')p.result=await client.readContract({address:state.contract,functionName:'get_probe',args:[id]});
  writeFileSync('reports/probe-'+id+'.json',JSON.stringify(p,null,2));console.log(p);
 }else console.log('Usage: network.mjs deploy | status | probe [id] [url] | probe-status [id]');
}catch(e){console.error(e.shortMessage||e.message);process.exitCode=1;}

