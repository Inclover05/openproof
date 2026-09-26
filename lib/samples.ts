import type { CaseRecord } from "./domain";
export function sampleCase(id: string): CaseRecord | null {
  const n =
    id === "sample-control"
      ? 1
      : id === "sample-treasury"
        ? 2
        : id === "sample-upgrade"
          ? 3
          : 0;
  if (!n) return null;
  const type = n === 1 ? "control" : n === 2 ? "treasury" : "upgrade";
  return {
    id,
    sample: true,
    state: n === 2 ? "decided" : "finalized",
    outcome:
      n === 1
        ? "Supported"
        : n === 2
          ? "Insufficient evidence"
          : "Contradicted",
    createdAt: "2026-09-02T12:00:00Z",
    input: {
      type,
      chain: n === 2 ? "8453" : "1",
      claim:
        n === 1
          ? "The team will renounce contract ownership by September 1, 2026."
          : n === 2
            ? "The treasury unlock timestamp will remain after September 1, 2026."
            : "The proxy will point to the announced implementation by September 1, 2026.",
      address: "0x1111111111111111111111111111111111111111",
      source: "https://example.org/illustrative-promise",
      cutoff: "2026-09-01T00:00:00Z",
      field: n === 1 ? "owner()" : n === 2 ? "unlockTime()" : "EIP-1967",
      expected:
        n === 2 ? "1788220800" : "0x0000000000000000000000000000000000000000",
    },
    explanation:
      n === 1
        ? "Illustrative outcome: the owner() getter returned the zero address at the cutoff. This does not rule out separate privileged roles or proxy control."
        : n === 2
          ? "Illustrative outcome: the original promise could not be independently retrieved. A current balance cannot establish a historical lock."
          : "Illustrative outcome: the historical implementation address differed from the specific address in the promise.",
    evidence: [
      {
        id: "source-1",
        kind: "source",
        title: "Project announcement",
        url: "https://example.org/illustrative-promise",
        retrievedAt: "2026-09-02T12:00:00Z",
        status: n === 2 ? "blocked" : "readable",
        detail:
          "Fictional source for demonstrating the evidence layout. No live page or validator fetch is represented.",
        excerpt:
          n === 1
            ? "“Contract ownership will be renounced before September 1, 2026.”"
            : undefined,
      },
      {
        id: "chain-1",
        kind: "chain",
        title: "Historical contract observation",
        url: "https://example.org/illustrative-block",
        retrievedAt: "2026-09-02T12:00:00Z",
        status: n === 2 ? "unavailable" : "readable",
        chainId: n === 2 ? 8453 : 1,
        address: "0x1111111111111111111111111111111111111111",
        block: 12345678,
        timestamp: "2026-08-31T23:59:59Z",
        value:
          n === 1 ? "0x0000000000000000000000000000000000000000" : undefined,
        detail:
          "Illustrative block, address, and value. These are sample data, not a claim about a real project.",
      },
    ],
  };
}
