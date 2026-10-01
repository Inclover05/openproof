export type BrowserProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  providers?: BrowserProvider[];
};

export type BrowserWallet = {
  id: string;
  name: string;
  provider: BrowserProvider;
};

declare global {
  interface Window { ethereum?: BrowserProvider; }
}

type WalletHost = EventTarget & { ethereum?: BrowserProvider };
type Announcement = {
  info?: { uuid?: unknown; name?: unknown };
  provider?: unknown;
};

const EMPTY: BrowserWallet[] = [];
export const BRADBURY_WALLET_RPC = "https://rpc.testnet-chain.genlayer.com";

export function explainWalletError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (/sequencer-leader\.testnet-genlayer|Gateway Timeout/i.test(message))
    return "Bradbury testnet is temporarily unavailable. If you approved a transaction, check your wallet history before retrying; its broadcast status is uncertain.";
  if (/eth_sendRawTransaction|cannot unmarshal string into Go struct field Request\.id|parse error as single request/i.test(message))
    return `Bradbury rejected your wallet's RPC request. In your wallet's Bradbury network settings, set the default RPC URL to ${BRADBURY_WALLET_RPC}, then reconnect and retry. Check wallet history first so you do not submit twice.`;
  return message;
}
let host: WalletHost | undefined;
const announced: BrowserWallet[] = [];
let snapshot: BrowserWallet[] = EMPTY;
const listeners = new Set<() => void>();

function validProvider(value: unknown): value is BrowserProvider {
  return !!value && typeof value === "object" &&
    typeof (value as BrowserProvider).request === "function";
}

function refresh() {
  if (!host) return snapshot;
  const next = [...announced];
  const legacy = host.ethereum;
  const candidates = Array.isArray(legacy?.providers)
    ? [...legacy.providers, legacy]
    : [legacy];
  for (const provider of candidates) {
    if (!validProvider(provider) || next.some((wallet) => wallet.provider === provider))
      continue;
    next.push({
      id: `legacy-${next.length}`,
      name: next.length ? "Other browser wallet" : "Browser wallet",
      provider,
    });
  }
  if (next.length !== snapshot.length || next.some((wallet, i) =>
    wallet.id !== snapshot[i]?.id || wallet.provider !== snapshot[i]?.provider ||
    wallet.name !== snapshot[i]?.name)) {
    snapshot = next;
    listeners.forEach((listener) => listener());
  }
  return snapshot;
}

function onAnnouncement(event: Event) {
  const detail = (event as CustomEvent<Announcement>).detail;
  if (!detail || !validProvider(detail.provider) ||
      typeof detail.info?.uuid !== "string" || !detail.info.uuid ||
      typeof detail.info?.name !== "string" || !detail.info.name.trim()) return;
  const wallet: BrowserWallet = {
    id: detail.info.uuid,
    name: detail.info.name.trim().slice(0, 80),
    provider: detail.provider,
  };
  const index = announced.findIndex((item) =>
    item.id === wallet.id || item.provider === wallet.provider);
  if (index >= 0) announced[index] = wallet;
  else announced.push(wallet);
  refresh();
}

function startDiscovery() {
  if (typeof window === "undefined") return;
  if (!host) {
    host = window;
    host.addEventListener("eip6963:announceProvider", onAnnouncement);
    host.addEventListener("ethereum#initialized", refresh);
  }
  refresh();
  host.dispatchEvent(new Event("eip6963:requestProvider"));
}

export function subscribeWallets(listener: () => void) {
  listeners.add(listener);
  startDiscovery();
  return () => { listeners.delete(listener); };
}

export function getWallets() { return snapshot; }
export function getServerWallets() { return EMPTY; }
export function rediscoverWallets() {
  startDiscovery();
  return refresh();
}

export function isBradbury(chain: unknown) {
  try { return BigInt(chain as string) === 4221n; }
  catch { return false; }
}

export function providerErrorCode(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const value = error as { code?: unknown; data?: { originalError?: unknown } };
  if (typeof value.code === "number") return value.code;
  return providerErrorCode(value.data?.originalError);
}

export async function prepareBradbury(provider: BrowserProvider) {
  if (!isBradbury(await provider.request({ method: "eth_chainId" }))) {
    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x107d" }],
      });
    } catch (error) {
      if (providerErrorCode(error) !== 4902) throw error;
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: "0x107d",
          chainName: "GenLayer Bradbury Testnet",
          nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
          rpcUrls: [BRADBURY_WALLET_RPC],
          blockExplorerUrls: ["https://explorer-bradbury.genlayer.com"],
        }],
      });
      if (!isBradbury(await provider.request({ method: "eth_chainId" })))
        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x107d" }],
        });
    }
  }
  if (!isBradbury(await provider.request({ method: "eth_chainId" })))
    throw new Error("Select Bradbury testnet before signing.");
}
