import { keccak256, toBytes } from "viem";
import { eligibleSource, type CaseInput, type Evidence } from "./domain";
export const CHAINS = {
  "1": {
    rpc: "https://ethereum-rpc.publicnode.com",
    explorer: "https://etherscan.io",
  },
  "8453": { rpc: "https://mainnet.base.org", explorer: "https://basescan.org" },
};
export const IMPLEMENTATION_SLOT =
  "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
export async function rpc(
  chain: keyof typeof CHAINS,
  method: string,
  params: unknown[],
) {
  const res = await fetch(CHAINS[chain].rpc, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok)
    throw new Error(
      `The chain provider returned HTTP ${res.status} for ${method}.`,
    );
  const data = (await res.json()) as {
    result?: unknown;
    error?: { message?: string };
  };
  if (data.error || data.result === undefined || data.result === null)
    throw new Error(
      "The provider could not return the requested historical data.",
    );
  return data.result;
}
type Block = { number: string; timestamp: string; hash: string };
export async function historicalBlock(
  chain: keyof typeof CHAINS,
  cutoff: number,
) {
  if (Number(await rpc(chain, "eth_chainId", [])) !== Number(chain))
    throw new Error("Provider returned the wrong chain.");
  const getBlock = async (n: number | string) =>
    (await rpc(chain, "eth_getBlockByNumber", [
      typeof n === "number" ? "0x" + n.toString(16) : n,
      false,
    ])) as Block;
  const last = await getBlock("finalized");
  if (Number(last.timestamp) < cutoff)
    throw new Error(
      "The cutoff is newer than the provider’s finalized block. Try an earlier cutoff.",
    );
  let high = Number(last.number),
    low = high,
    span = 65536;
  // Bracket backwards from finality. Avoid requesting unrelated ancient blocks
  // on providers that retain recent history but prune pre-merge data.
  for (let i = 0; i < 32; i++) {
    low = Math.max(0, Number(last.number) - span);
    const candidate = await getBlock(low);
    if (Number(candidate.timestamp) <= cutoff) break;
    if (low === 0) throw new Error("This cutoff predates the chain.");
    high = low;
    span *= 2;
  }
  for (let i = 0; low < high && i < 32; i++) {
    const mid = Math.ceil((low + high) / 2);
    const b = await getBlock(mid);
    if (Number(b.timestamp) <= cutoff) low = mid;
    else high = mid - 1;
  }
  const [block, next] = await Promise.all([getBlock(low), getBlock(low + 1)]);
  if (!(Number(block.timestamp) <= cutoff && Number(next.timestamp) > cutoff))
    throw new Error("Could not verify the cutoff boundary.");
  return block;
}
async function boundedText(response: Response) {
  if (!response.body) throw new Error("Empty response");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 500000) {
      await reader.cancel();
      throw new Error("Source exceeds the 500 KB limit.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.length;
  }
  return {raw:new TextDecoder('utf-8',{fatal:true}).decode(bytes),bytes};
}
export async function inspectSource(input: CaseInput): Promise<Evidence> {
  const base: Evidence = {
    id: "source-1",
    kind: "source",
    title: "Public promise",
    url: input.source,
    retrievedAt: new Date().toISOString(),
    status: "unavailable",
    detail: "",
  };
  if (!eligibleSource(input.source))
    return {
      ...base,
      status: "blocked",
      detail:
        "This host is not in the approved source set. Choose a public GitHub permalink, verified explorer page, or supported official documentation. The original URL has been retained; no substitute was fetched.",
    };
  try {
    const response = await fetch(input.source, {
      redirect: "manual",
      signal: AbortSignal.timeout(10000),
      headers: { Accept: "text/plain,text/html,application/json" },
    });
    if (response.status >= 300 && response.status < 400)
      return {
        ...base,
        status: "blocked",
        detail:
          "This source redirects. Choose the final public source URL explicitly.",
      };
    if ([401, 403, 429].includes(response.status))
      return {
        ...base,
        status: "blocked",
        detail: `The source returned HTTP ${response.status}. Independent validator access has not been established.`,
      };
    if (!response.ok)
      return {
        ...base,
        detail: `The source returned HTTP ${response.status}.`,
      };
    if (
      !/text\/|application\/json/.test(
        response.headers.get("content-type") || "",
      )
    )
      return {
        ...base,
        detail: "Only public text, HTML, and JSON sources are supported.",
      };
    const {raw,bytes} = await boundedText(response);
    const text = raw
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const digest = await crypto.subtle.digest(
      "SHA-256",
      bytes,
    );
    const hash = Array.from(new Uint8Array(digest), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("");
    if (text.length < 30)
      return {
        ...base,
        detail: "The source did not contain enough readable text.",
      };
    const immutable =
      /raw\.githubusercontent\.com\/[^/]+\/[^/]+\/[0-9a-f]{40}\//.test(
        input.source,
      );
    return {
      ...base,
      status: "readable",
      hash,
      excerpt: text.slice(0, 1400),
      detail: immutable
        ? "Readable commit-pinned source. Relevance, publication date, and validator access still require independent checks."
        : "Readable at collection time. This URL is mutable; a captured hash does not prove past publication or future validator access.",
    };
  } catch {
    return {
      ...base,
      detail:
        "Source retrieval timed out or failed. Nothing has been inferred from inaccessible content.",
    };
  }
}
export async function inspectChain(input: CaseInput): Promise<Evidence> {
  const base: Evidence = {
    id: "chain-1",
    kind: "chain",
    title: "Contract state at cutoff",
    url: `${CHAINS[input.chain].explorer}/address/${input.address}`,
    chainId: Number(input.chain),
    address: input.address,
    retrievedAt: new Date().toISOString(),
    status: "unavailable",
    detail: "",
  };
  let anchor: Partial<Evidence> = {};
  try {
    const block = await historicalBlock(
      input.chain,
      Math.floor(Date.parse(input.cutoff) / 1000),
    );
    anchor = {
      block: Number(block.number),
      blockHash: block.hash,
      timestamp: new Date(Number(block.timestamp) * 1000).toISOString(),
    };
    const code = await rpc(input.chain, "eth_getCode", [
      input.address,
      block.number,
    ]);
    if (code === "0x")
      return {
        ...base,
        ...anchor,
        detail: "No contract bytecode existed at this address at the cutoff.",
      };
    const value =
      input.type === "upgrade"
        ? await rpc(input.chain, "eth_getStorageAt", [
            input.address,
            IMPLEMENTATION_SLOT,
            block.number,
          ])
        : await rpc(input.chain, "eth_call", [
            {
              to: input.address,
              data: keccak256(toBytes(input.field)).slice(0, 10),
            },
            block.number,
          ]);
    if (typeof value !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(value))
      return {
        ...base,
        ...anchor,
        detail: "The selected field did not return one valid ABI word.",
      };
    if (input.type !== "treasury" && !/^0x0{24}/i.test(value))
      return {
        ...base,
        ...anchor,
        detail: "The value could not be decoded as an address.",
      };
    return {
      ...base,
      ...anchor,
      value:
        input.type === "treasury"
          ? BigInt(value).toString()
          : "0x" + value.slice(-40),
      status: "readable",
      detail: `Observed ${input.field} at block ${Number(block.number)}. The next block is after the cutoff. This single field does not establish broader control, continuous restrictions, or absence of alternative withdrawal paths.`,
    };
  } catch (e) {
    return {
      ...base,
      ...anchor,
      detail:
        e instanceof Error ? e.message : "Historical data is unavailable.",
    };
  }
}
