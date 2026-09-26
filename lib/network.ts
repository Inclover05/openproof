import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import {
  TransactionHashVariant,
  type TransactionHash,
} from "genlayer-js/types";
import { lifecycle, type CaseRecord } from "./domain";
export const CONTRACT = "0x0546Ba4582b7733DB52E3309692BCF7b5B1CAcCe" as const;
export const DEPLOY_TX =
  "0xae4862375dcdad10086d8c163a33b8e399e9e112713fa850fbf235beaf6d6f90";
export const client = createClient({ chain: testnetBradbury });
export function payload(record: CaseRecord) {
  const source = record.evidence.find((e) => e.kind === "source"),
    chain = record.evidence.find((e) => e.kind === "chain");
  if (!source?.hash || chain?.block === undefined)
    throw new Error(
      "A readable source and anchored historical block are required.",
    );
  return JSON.stringify({
    case_id: record.id,
    claim_type: record.input.type,
    chain_id: Number(record.input.chain),
    claim: record.input.claim,
    address: record.input.address,
    source: record.input.source,
    source_hash: source.hash,
    cutoff: Math.floor(Date.parse(record.input.cutoff) / 1000),
    block: chain.block,
    field: record.input.field,
    expected: record.input.expected,
  });
}
export async function refresh(record: CaseRecord) {
  if (!record.txId) return record;
  const tx = await client.getTransaction({
    hash: record.txId as TransactionHash,
  });
  const state = lifecycle(
    String(tx.statusName || tx.status),
    tx.txExecutionResultName,
  );
  const updated: CaseRecord = {
    ...record,
    state,
    contract: CONTRACT,
    execution: tx.txExecutionResultName,
    outcome: undefined,
    explanation: undefined,
    canAppeal: undefined,
    appealCharge: undefined,
  };
  if (["appeal window", "finalized"].includes(state)) {
    const raw = await client.readContract({
      address: CONTRACT,
      functionName: "get_case",
      args: [record.id],
      transactionHashVariant:
        state === "finalized"
          ? TransactionHashVariant.LATEST_FINAL
          : TransactionHashVariant.LATEST_NONFINAL,
    });
    if (typeof raw === "string" && raw) {
      const result = JSON.parse(raw);
      const digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(payload(record)),
      );
      const hash = Array.from(new Uint8Array(digest), (b) =>
        b.toString(16).padStart(2, "0"),
      ).join("");
      if (result.case_id !== record.id || result.input_hash !== hash)
        throw new Error("The on-chain result does not match this case.");
      if (
        ["Supported", "Contradicted", "Insufficient evidence"].includes(
          result.outcome,
        )
      ) {
        updated.outcome = result.outcome;
        updated.explanation = result.explanation;
        updated.reasonCode = result.reason_code;
        updated.decisiveRefs = result.decisive_evidence_refs;
        updated.evaluatedAt = result.evaluated_at;
      }
    }
    if (state === "appeal window") {
      try {
        updated.canAppeal = await client.canAppeal({
          txId: record.txId as `0x${string}`,
        });
        if (updated.canAppeal)
          updated.appealCharge = (
            await client.getMinAppealBond({
              txId: record.txId as `0x${string}`,
            })
          ).toString();
      } catch {
        updated.canAppeal = undefined;
      }
    }
  }
  return updated;
}
