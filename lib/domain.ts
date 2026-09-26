import { z } from "zod";
export const templates = {
  treasury: {
    name: "Treasury restrictions",
    field: "Unlock timestamp getter",
    hint: "Exact public getter, e.g. unlockTime(). This checks its value, not every possible withdrawal path.",
    defaultField: "unlockTime()",
  },
  control: {
    name: "Admin & owner control",
    field: "Ownership getter",
    hint: "Checks owner() only. Other roles, proxies, and beneficial control are outside this narrow question.",
    defaultField: "owner()",
  },
  upgrade: {
    name: "Contract changes",
    field: "Implementation storage",
    hint: "Checks the EIP-1967 implementation slot at the cutoff. Other proxy standards are not supported.",
    defaultField: "EIP-1967",
  },
} as const;
export type ClaimType = keyof typeof templates;
export const addressSchema = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/, "Enter a complete 0x contract address.");
export const caseSchema = z
  .object({
    claim: z
      .string()
      .trim()
      .min(25, "Describe the promise in at least 25 characters.")
      .max(1200),
    type: z.enum(["treasury", "control", "upgrade"]),
    chain: z.enum(["1", "8453"]),
    address: addressSchema,
    source: z
      .string()
      .url("Enter a full public https:// source URL.")
      .max(1500)
      .refine((s) => s.startsWith("https://"), "Use an HTTPS source."),
    cutoff: z
      .string()
      .datetime({ offset: true })
      .refine(
        (s) => Date.parse(s) <= Date.now(),
        "The cutoff must be in the past.",
      )
      .refine(
        (s) => Date.parse(s) >= Date.UTC(2015, 6, 30),
        "The cutoff predates Ethereum.",
      ),
    field: z.string().min(1).max(80),
    expected: z.string().min(1).max(80),
  })
  .superRefine((v, ctx) => {
    if (v.type === "control" && v.field !== "owner()")
      ctx.addIssue({
        code: "custom",
        path: ["field"],
        message: "This release supports the owner() getter only.",
      });
    if (v.type === "upgrade" && v.field !== "EIP-1967")
      ctx.addIssue({
        code: "custom",
        path: ["field"],
        message: "Use the EIP-1967 implementation slot.",
      });
    if (v.type !== "treasury" && !addressSchema.safeParse(v.expected).success)
      ctx.addIssue({
        code: "custom",
        path: ["expected"],
        message: "Expected value must be a complete address.",
      });
    if (
      v.type === "treasury" &&
      (v.field !== "unlockTime()" || !/^\d{10}$/.test(v.expected))
    )
      ctx.addIssue({
        code: "custom",
        path: ["expected"],
        message:
          "This release supports unlockTime() and a 10-digit Unix timestamp.",
      });
    if (
      /\b(thief|scammer|stolen|criminal|fraudster|beneficial owner)\b/i.test(
        v.claim,
      )
    )
      ctx.addIssue({
        code: "custom",
        path: ["claim"],
        message:
          "Use a neutral statement about observable contract state. Intent and legal allegations are outside scope.",
      });
  });
export type CaseInput = z.infer<typeof caseSchema>;
export type AccessStatus =
  "readable" | "blocked" | "unstable" | "unrelated" | "unavailable";
export interface Evidence {
  id: string;
  title: string;
  kind: "source" | "chain";
  status: AccessStatus;
  url: string;
  retrievedAt: string;
  detail: string;
  hash?: string;
  chainId?: number;
  address?: string;
  block?: number;
  blockHash?: string;
  timestamp?: string;
  value?: string;
  excerpt?: string;
}
export interface CaseRecord {
  id: string;
  input: CaseInput;
  evidence: Evidence[];
  createdAt: string;
  state:
    | "draft"
    | "queued"
    | "evaluating"
    | "decided"
    | "appeal window"
    | "finalized"
    | "failed"
    | "undetermined";
  sample?: boolean;
  outcome?: "Supported" | "Contradicted" | "Insufficient evidence";
  explanation?: string;
  txId?: string;
  contract?: string;
  execution?: string;
  reasonCode?: string;
  decisiveRefs?: string[];
  evaluatedAt?: string;
  canAppeal?: boolean;
  appealCharge?: string;
}
export function question(v: CaseInput) {
  const who = `${v.address.slice(0, 8)}…${v.address.slice(-6)} on ${v.chain === "1" ? "Ethereum" : "Base"}`;
  const when =
    new Date(v.cutoff).toLocaleString("en-GB", {
      timeZone: "UTC",
      dateStyle: "medium",
      timeStyle: "short",
    }) + " UTC";
  return v.type === "treasury"
    ? `At ${when}, did ${v.field} on ${who} return a timestamp at or after ${v.expected}?`
    : v.type === "control"
      ? `At ${when}, did owner() on ${who} equal ${v.expected}?`
      : `At ${when}, did the EIP-1967 implementation of ${who} equal ${v.expected}?`;
}
export const SOURCE_HOSTS = [
  "raw.githubusercontent.com",
  "github.com",
  "docs.openzeppelin.com",
  "ethereum.org",
  "docs.base.org",
  "docs.genlayer.com",
  "etherscan.io",
  "basescan.org",
];
export function eligibleSource(raw: string) {
  try {
    const u = new URL(raw);
    return (
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      (!u.port || u.port === "443") &&
      SOURCE_HOSTS.includes(u.hostname) &&
      !u.hash
    );
  } catch {
    return false;
  }
}
export function lifecycle(status: string, execution: string | undefined) {
  const s = status.toUpperCase();
  if (["UNDETERMINED", "CANCELED", "CANCELLED"].includes(s))
    return "undetermined" as const;
  if (execution === "FINISHED_WITH_ERROR") return "failed" as const;
  if (s === "FINALIZED")
    return execution === "FINISHED_WITH_RETURN"
      ? ("finalized" as const)
      : ("undetermined" as const);
  if (s === "ACCEPTED" || s === "READY_TO_FINALIZE")
    return execution === "FINISHED_WITH_RETURN"
      ? ("appeal window" as const)
      : ("undetermined" as const);
  if (["PENDING", "QUEUED"].includes(s)) return "queued" as const;
  return "evaluating" as const;
}
