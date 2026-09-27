import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import {
  TransactionHashVariant,
  type TransactionHash,
} from "genlayer-js/types";
import { lifecycle, type CaseRecord } from "./domain";
import {contractFor, payload, LEGACY_CONTRACT} from "./protocol";
export {payload, contractFor} from "./protocol";
export const CONTRACT = LEGACY_CONTRACT;
export const DEPLOY_TX =
  "0xae4862375dcdad10086d8c163a33b8e399e9e112713fa850fbf235beaf6d6f90";
export const client = createClient({ chain: testnetBradbury });
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
    contract: contractFor(record),
    execution: tx.txExecutionResultName,
    outcome: undefined,
    explanation: undefined,
    canAppeal: undefined,
    appealCharge: undefined,
  };
  if (["appeal window", "finalized"].includes(state)) {
    const raw = await client.readContract({
      address: contractFor(record),
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
