// Live Bradbury integration check of the browser-wallet branch in genlayer-js.
// The private key stays in the ignored local file. Never commit that file.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createClient } from 'genlayer-js';
import { testnetBradbury } from 'genlayer-js/chains';
import { privateKeyToAccount } from 'viem/accounts';
import ts from 'typescript';

const root = process.env.OPENPROOF_TEST_URL || 'https://openproof-three.vercel.app';
const chainRpc = 'https://rpc.testnet-chain.genlayer.com';
const reportPath = 'reports/wallet-rpc-verification.json';
const mode = process.argv[2];
const account = privateKeyToAccount(readFileSync('.secrets/testnet-key', 'utf8').trim());
const report = (() => {
  try { return JSON.parse(readFileSync(reportPath, 'utf8')); }
  catch { return { root, walletRpc: chainRpc, account: account.address }; }
})();
const save = () => writeFileSync(reportPath, JSON.stringify(report, null, 2));

async function post(path, body) {
  const response = await fetch(root + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: root },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`${path}: ${JSON.stringify(data)}`);
  return data;
}

async function rpc(method, params, id = 'wallet-string-id') {
  const response = await fetch(chainRpc, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
  });
  const data = await response.json();
  if (!response.ok || data.error) throw new Error(JSON.stringify(data.error || data));
  if (data.id !== id) throw new Error(`RPC response id mismatch: ${data.id}`);
  return data.result;
}

if (mode === 'collect') {
  if (report.record) throw new Error('Test case already collected; inspect report before retrying.');
  const input = {
    type: 'control', verification: 'state', chain: '8453',
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    source: '', cutoff: '2026-09-27T08:00:00Z', field: 'owner()',
    expected: '0x3abd6f64a422225e61e435bae41db12096106df7',
    claim: 'Historical comparison test: Base USDC owner() matched the expected address at the cutoff.',
  };
  const evidence = await post('/api/evidence', input);
  const { record } = await post('/api/cases', { input, snapshotId: evidence.snapshotId });
  report.record = record;
  report.caseUrl = `${root}/case/${record.id}`;
  save();
  console.log(JSON.stringify({ caseUrl: report.caseUrl, evidence: record.evidence.map(e => ({ kind: e.kind, status: e.status, block: e.block, value: e.value })) }, null, 2));
} else if (mode === 'submit') {
  if (!report.record) throw new Error('Collect a case first.');
  if (report.txId || report.evmTxHash) throw new Error('A transaction may already exist; inspect report before retrying.');
  report.quote = await post(`/api/cases/${report.record.id}/quote`, { account: account.address });
  report.stringIdChainId = await rpc('eth_chainId', []);
  save();
  if (report.stringIdChainId !== '0x107d') throw new Error('Wallet RPC is not Bradbury.');
  const provider = {
    async request({ method, params = [] }) {
      if (method === 'eth_chainId') return report.stringIdChainId;
      if (method === 'eth_accounts' || method === 'eth_requestAccounts') return [account.address];
      if (method !== 'eth_sendTransaction') throw new Error(`Unexpected wallet method: ${method}`);
      const tx = params[0];
      if (tx.from?.toLowerCase() !== account.address.toLowerCase()) throw new Error('Wrong signing account.');
      const serialized = await account.signTransaction({
        to: tx.to, data: tx.data, value: BigInt(tx.value || '0x0'),
        gas: BigInt(tx.gas), nonce: Number(BigInt(tx.nonce)),
        gasPrice: BigInt(tx.gasPrice), chainId: Number(BigInt(tx.chainId)), type: 'legacy',
      });
      const hash = await rpc('eth_sendRawTransaction', [serialized]);
      report.evmTxHash = hash;
      save();
      return hash;
    },
  };
  const client = createClient({ chain: testnetBradbury, account: account.address, provider });
  mkdirSync('.test-build', { recursive: true });
  writeFileSync('.test-build/protocol.mjs', ts.transpileModule(readFileSync('lib/protocol.ts', 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText);
  const { contractFor, payload } = await import('../.test-build/protocol.mjs');
  report.txId = await client.writeContract({
    address: contractFor(report.record),
    functionName: 'evaluate', args: [payload(report.record)], value: 0n,
  });
  save();
  console.log(JSON.stringify({ caseUrl: report.caseUrl, evmTxHash: report.evmTxHash, txId: report.txId, quote: report.quote.estimatedGen }, null, 2));
} else if (mode === 'status') {
  if (!report.txId) throw new Error('No GenLayer transaction ID in report.');
  const { record } = await post(`/api/cases/${report.record.id}/network`, { txId: report.txId });
  report.record = record;
  report.checkedAt = new Date().toISOString();
  save();
  console.log(JSON.stringify({ caseUrl: report.caseUrl, txId: report.txId, state: record.state, execution: record.execution, outcome: record.outcome, reasonCode: record.reasonCode }, null, 2));
} else {
  throw new Error('Use collect, submit, or status.');
}
