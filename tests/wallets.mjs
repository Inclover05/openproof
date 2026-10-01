import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import ts from 'typescript';

mkdirSync('.test-build', { recursive: true });
writeFileSync('.test-build/browser-wallets.mjs', ts.transpileModule(
  readFileSync('lib/browser-wallets.ts', 'utf8'),
  { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } },
).outputText);
const {
  BRADBURY_WALLET_RPC, getWallets, isBradbury, prepareBradbury,
  rediscoverWallets, subscribeWallets,
} = await import('../.test-build/browser-wallets.mjs');

test('three announced wallets remain separately selectable even when window.ethereum changes', () => {
  const browser = new EventTarget();
  globalThis.window = browser;
  const providers = ['MetaMask', 'Rabby', 'OKX Wallet'].map(name => ({
    name, async request() { return name; },
  }));
  browser.ethereum = providers[0];
  browser.addEventListener('eip6963:requestProvider', () => {
    providers.forEach((provider, index) => browser.dispatchEvent(new CustomEvent(
      'eip6963:announceProvider',
      { detail: { info: { uuid: `wallet-${index}`, name: provider.name }, provider } },
    )));
  });
  let changes = 0;
  const unsubscribe = subscribeWallets(() => { changes += 1; });
  const wallets = getWallets();
  assert.deepEqual(wallets.map(wallet => wallet.name), ['MetaMask', 'Rabby', 'OKX Wallet']);
  const chosen = wallets[1].provider;
  browser.ethereum = providers[2];
  rediscoverWallets();
  assert.equal(chosen, providers[1]);
  assert.equal(getWallets().length, 3);
  assert.ok(changes >= 3);
  unsubscribe();
});

test('chain switching, adding an unknown chain and post-switch validation work for EIP-1193 providers', async () => {
  assert.equal(isBradbury('0x107D'), true);
  assert.equal(isBradbury('4221'), true);
  assert.equal(isBradbury('not a chain'), false);
  let chain = '0x1';
  const calls = [];
  const switchable = { async request({ method, params }) {
    calls.push({ method, params });
    if (method === 'eth_chainId') return chain;
    if (method === 'wallet_switchEthereumChain') { chain = '0x107d'; return null; }
    throw new Error(method);
  } };
  await prepareBradbury(switchable);
  assert.equal(calls.filter(call => call.method === 'wallet_switchEthereumChain').length, 1);

  chain = '0x1';
  const addCalls = [];
  let added = false;
  const addable = { async request({ method, params }) {
    addCalls.push({ method, params });
    if (method === 'eth_chainId') return chain;
    if (method === 'wallet_switchEthereumChain') {
      if (!added) throw { data: { originalError: { code: 4902 } } };
      chain = '0x107d'; return null;
    }
    if (method === 'wallet_addEthereumChain') { added = true; return null; }
  } };
  await prepareBradbury(addable);
  const network = addCalls.find(call => call.method === 'wallet_addEthereumChain').params[0];
  assert.equal(network.rpcUrls[0], BRADBURY_WALLET_RPC);
  assert.equal(network.chainId, '0x107d');
  assert.equal(addCalls.filter(call => call.method === 'wallet_switchEthereumChain').length, 2);

  const stuck = { async request({ method }) {
    if (method === 'eth_chainId') return '0x1';
    return null;
  } };
  await assert.rejects(prepareBradbury(stuck), /Select Bradbury/);
});
