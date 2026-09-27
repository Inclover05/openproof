import type { CaseRecord } from "./domain";

export const LEGACY_CONTRACT = "0x0546Ba4582b7733DB52E3309692BCF7b5B1CAcCe" as const;
// Set only after a verified Bradbury deployment of contracts/openproof_v2.py.
export const V2_CONTRACT = "0xB74B3339695C50C6d16168708e2B22A7D6D72EAB" as string;
export function contractFor(record: CaseRecord): `0x${string}` {
  const target = record.protocolVersion === 2 ? V2_CONTRACT : LEGACY_CONTRACT;
  if (!/^0x[0-9a-fA-F]{40}$/.test(target)) throw new Error("This protocol version is awaiting its verified testnet deployment. Your saved evidence remains available.");
  if (record.contract && record.contract.toLowerCase() !== target.toLowerCase()) throw new Error("The case contract does not match its protocol version.");
  return target as `0x${string}`;
}
export function readyForSubmission(record: CaseRecord) {
  return record.evidence.some(e => e.kind === "chain" && e.block !== undefined) &&
    (record.protocolVersion === 2 && record.input.verification === "state" || record.evidence.some(e => e.kind === "source" && !!e.hash));
}
export function payload(record: CaseRecord) {
  const source = record.evidence.find(e => e.kind === "source");
  const chain = record.evidence.find(e => e.kind === "chain");
  if (!readyForSubmission(record)) throw new Error("A historical block and, for public promises, a readable source are required.");
  // Preserve the exact v1 field order: existing on-chain input hashes depend on it.
  const legacy = { case_id: record.id, claim_type: record.input.type, chain_id: Number(record.input.chain), claim: record.input.claim, address: record.input.address,
    source: record.input.source, source_hash: source?.hash, cutoff: Math.floor(Date.parse(record.input.cutoff) / 1000), block: chain!.block, field: record.input.field, expected: record.input.expected };
  if (record.protocolVersion !== 2) return JSON.stringify(legacy);
  return JSON.stringify({case_id: legacy.case_id, claim_type: legacy.claim_type, chain_id: legacy.chain_id, claim: legacy.claim, address: legacy.address,
    verification: record.input.verification || "promise", sources: record.evidence.filter(e => e.kind === "source").map(e => ({id:e.id,url:e.url,hash:e.hash || ""})),
    cutoff:legacy.cutoff,block:legacy.block,field:legacy.field,expected:legacy.expected});
}
