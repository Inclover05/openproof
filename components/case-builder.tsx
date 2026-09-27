"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ExternalLink,
  LoaderCircle,
  Link2,
  ShieldCheck,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  caseSchema,
  templates,
  question,
  type CaseInput,
  type ClaimType,
  type Evidence,
} from "@/lib/domain";
import { EvidenceCard } from "./evidence-card";

export default function CaseBuilder({
  open,
  onOpenChange,
  initialClaim,
  initialType,
  initialInput,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialClaim: string;
  initialType: ClaimType;
  initialInput?: CaseInput;
}) {
  const router = useRouter();
  const [type, setType] = useState<ClaimType>(initialType),
    [claim, setClaim] = useState(initialClaim),
    [chain, setChain] = useState<string>(initialInput?.chain || "1"),
    [address, setAddress] = useState(initialInput?.address || ""),
    [source, setSource] = useState(initialInput?.source || ""),
    [date, setDate] = useState(initialInput?.cutoff ? new Date(initialInput.cutoff).toISOString().slice(0,16) : ""),
    [field, setField] = useState<string>(templates[initialType].defaultField),
    [expected, setExpected] = useState(
      initialInput?.expected || (initialType === "treasury"
        ? ""
        : "0x0000000000000000000000000000000000000000"),
    );
  const [snapshotId, setSnapshotId] = useState("");
  const [verification, setVerification] = useState<"promise" | "state">(initialInput?.verification || "promise");
  const [corroboratingSource, setCorroboratingSource] = useState(initialInput?.corroboratingSource || "");
  const [sourceCheck, setSourceCheck] = useState<Evidence | null>(null);
  const [checkingSource, setCheckingSource] = useState(false);
  async function checkSource() {
    setCheckingSource(true);
    setError("");
    try {
      const response = await fetch("/api/source-check", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: source }) });
      const result = await response.json() as {error?: string; evidence: Evidence};
      if (!response.ok) throw new Error(result.error);
      setSourceCheck(result.evidence);
    } catch (e) { setError(e instanceof Error ? e.message : "The source check could not complete."); }
    finally { setCheckingSource(false); }
  }
  const [step, setStep] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [evidence, setEvidence] = useState<Evidence[]>([]),
    [input, setInput] = useState<CaseInput | null>(null);
  async function collect() {
    setError("");
    const parsed = caseSchema.safeParse({
      claim,
      type,
      chain,
      address,
      source,
      verification,
      corroboratingSource,
      cutoff: date ? new Date(date + (date.endsWith("Z") ? "" : "Z")).toISOString() : "",
      field,
      expected,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/evidence", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = (await res.json()) as {
        error?: string;
        evidence: Evidence[];
        snapshotId: string;
        record: { id: string };
      };
      if (!res.ok) throw new Error(data.error);
      setInput(parsed.data);
      setSnapshotId(data.snapshotId);
      setEvidence(data.evidence);
      setStep(1);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Evidence collection failed. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (!input) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ input, snapshotId }),
      });
      const data = (await res.json()) as {
        error?: string;
        evidence: Evidence[];
        snapshotId: string;
        record: { id: string };
      };
      if (!res.ok) throw new Error(data.error);
      router.push("/case/" + data.record.id);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Saving failed. Your inputs remain here.",
      );
      setBusy(false);
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!busy) onOpenChange(v);
      }}
    >
      <DialogContent className="builder-dialog">
        <div className="builder-header">
          <span className="eyebrow">OPEN A CASE</span>
          <DialogTitle>
            {
              [
                "Define the question.",
                "Follow the sources.",
                "Review the record.",
              ][step]
            }
          </DialogTitle>
          <DialogDescription>
            {
              [
                "Check a public promise or an exact historical contract value.",
                "What we could retrieve, and what still needs to be verified.",
                "Check the scope before saving your case.",
              ][step]
            }
          </DialogDescription>
        </div>
        <ol className="steps">
          {["Scope", "Evidence", "Review"].map((s, i) => (
            <li
              key={s}
              className={i === step ? "current" : i < step ? "complete" : ""}
            >
              <span>{i < step ? <Check size={13} /> : i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
        <div className="builder-body">
          {step === 0 ? (
            <form
              id="scope-form"
              onSubmit={(e) => {
                e.preventDefault();
                void collect();
              }}
              className="scope-form"
            >
              <fieldset className="verification-choice">
                <legend>What would you like to verify?</legend>
                <label><input type="radio" name="verification" value="promise" checked={verification === "promise"} onChange={() => setVerification("promise")} /><span><b>A public promise</b><small>Connect a dated statement to observable contract state.</small></span></label>
                <label><input type="radio" name="verification" value="state" checked={verification === "state"} onChange={() => setVerification("state")} /><span><b>Contract state</b><small>Compare one historical value. No public promise required.</small></span></label>
              </fieldset>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="claim-type">Claim template</label>
                  <Select
                    value={type}
                    onValueChange={(v) => {
                      const t = v as ClaimType;
                      setType(t);
                      setField(templates[t].defaultField);
                      setExpected(
                        t === "treasury"
                          ? ""
                          : "0x0000000000000000000000000000000000000000",
                      );
                    }}
                  >
                    <SelectTrigger id="claim-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(templates).map(([key, t]) => (
                        <SelectItem key={key} value={key}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="field">
                  <label htmlFor="chain">Evidence chain</label>
                  <Select value={chain} onValueChange={setChain}>
                    <SelectTrigger id="chain">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Ethereum · chain 1</SelectItem>
                      <SelectItem value="8453">Base · chain 8453</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="field">
                <label htmlFor="promise">{verification === "state" ? "Statement to check" : "Public promise"}</label>
                <textarea
                  id="promise"
                  value={claim}
                  onChange={(e) => setClaim(e.target.value)}
                  required
                  minLength={25}
                  maxLength={1200}
                  placeholder="The team will renounce owner() control before September 1, 2026."
                />
              </div>
              <div className="field">
                <label htmlFor="source-url">
                  Original public source {verification === "state" ? "· optional" : ""} <Link2 size={14} />
                </label>
                <input
                  id="source-url"
                  type="url"
                  required={verification === "promise"}
                  value={source}
                  onChange={(e) => { setSource(e.target.value); setSourceCheck(null); }}
                  placeholder="https://x.com/project/status/… or https://medium.com/…"
                />
                <small>
                  Public X posts, accessible Medium articles, GitHub permalinks,
                  explorers, and supported official docs. Login walls, deleted
                  posts, and paywalls may prevent retrieval.
                </small>
                <button type="button" className="secondary" disabled={!source || checkingSource || busy} onClick={() => void checkSource()}>{checkingSource ? "Checking link…" : "Check link access"}</button>
              </div>
              {sourceCheck ? <EvidenceCard evidence={sourceCheck} /> : null}
              {verification === "promise" ? <div className="field">
                <label htmlFor="corroborating-source">Corroborating public source · optional</label>
                <input id="corroborating-source" type="url" value={corroboratingSource} onChange={(e) => setCorroboratingSource(e.target.value)} placeholder="https://raw.githubusercontent.com/…" />
                <small>The original link stays in the record. This source must independently establish the same dated promise; it cannot prove what an inaccessible post said.</small>
              </div> : null}
              <div className="field">
                <label htmlFor="contract-address">Contract address</label>
                <input
                  id="contract-address"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value.trim())}
                  placeholder="0x…"
                  spellCheck={false}
                  autoComplete="off"
                  pattern="0x[0-9a-fA-F]{40}"
                />
              </div>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="cutoff">Historical cutoff · UTC</label>
                  <input
                    id="cutoff"
                    type="datetime-local"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="field">{templates[type].field}</label>
                  <input
                    id="field"
                    value={field}
                    onChange={(e) => setField(e.target.value)}
                    readOnly={type !== "treasury"}
                  />
                </div>
              </div>
              <div className="field">
                <label htmlFor="expected">
                  {type === "treasury"
                    ? "Earliest promised unlock · Unix seconds"
                    : "Expected address"}
                </label>
                <input
                  id="expected"
                  required
                  value={expected}
                  onChange={(e) => setExpected(e.target.value)}
                  placeholder={
                    type === "treasury"
                      ? "1788220800"
                      : "0x0000000000000000000000000000000000000000"
                  }
                />
                <small>{templates[type].hint}</small>
              </div>
            </form>
          ) : step === 1 ? (
            <>
              <div className="question-box">
                <span className="eyebrow">THE EXACT QUESTION</span>
                <p>{input ? question(input) : ""}</p>
              </div>
              <div className="evidence-stack">
                {evidence.map((e) => (
                  <EvidenceCard key={e.id} evidence={e} />
                ))}
              </div>
              <div className="notice">
                <ShieldCheck size={17} />
                <span>
                  Access checks run on our server. Validators must independently
                  retrieve and evaluate eligible evidence later. Readability
                  does not establish relevance.
                </span>
              </div>
              {evidence.some((e) => e.status !== "readable") ? (
                <div className="alternative">
                  <h3>A source missing?</h3>
                  <p>
                    Keep the original link and add a corroborating source that
                    independently establishes the same promise. For an exact
                    historical value without a public promise, choose Contract state.
                  </p>
                  <a
                    href={
                      (chain === "1"
                        ? "https://etherscan.io"
                        : "https://basescan.org") +
                      "/address/" +
                      address
                    }
                    target="_blank"
                    rel="noreferrer"
                  >
                    Inspect the contract’s verified page{" "}
                    <ExternalLink size={14} />
                  </a>
                  <button className="text-button" onClick={() => setStep(0)}>
                    Edit the source <ArrowRight size={14} />
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <>
              <div className="question-box">
                <span className="eyebrow">FIXED QUESTION</span>
                <p>{input ? question(input) : ""}</p>
              </div>
              <dl className="review-list">
                <div><dt>Verification mode</dt><dd>{verification === "state" ? "Historical contract state" : "Public promise and contract state"}</dd></div>
                <div>
                  <dt>Evidence references</dt>
                  <dd>
                    {evidence.length} captured ·{" "}
                    {evidence.filter((e) => e.status === "readable").length}{" "}
                    readable
                  </dd>
                </div>
                <div>
                  <dt>Case status after saving</dt>
                  <dd>Draft · no verdict</dd>
                </div>
                <div>
                  <dt>Network assessment</dt>
                  <dd>GenLayer Bradbury · not submitted</dd>
                </div>
                <div>
                  <dt>Saving this record</dt>
                  <dd>Free · no wallet required</dd>
                </div>
                <div>
                  <dt>Testnet judgment cost</dt>
                  <dd>Live quote before wallet confirmation</dd>
                </div>
              </dl>
              <div className="outcomes">
                <p>
                  <b>Supported</b> — eligible evidence supports the bounded
                  statement.
                </p>
                <p>
                  <b>Contradicted</b> — eligible evidence conflicts with that
                  statement.
                </p>
                <p>
                  <b>Insufficient evidence</b> — an essential fact cannot be
                  established.
                </p>
              </div>
              <p className="notice">
                Saving preserves a read-only draft. You can request a live
                testnet gas estimate and submit from the saved record. An
                outcome appears only after successful contract execution.
                Network decisions may take time and can be appealed.
              </p>
            </>
          )}
          {error ? (
            <p role="alert" className="form-error">
              {error}
            </p>
          ) : null}
        </div>
        <div className="builder-actions">
          <button
            className="text-button"
            disabled={busy}
            onClick={() => (step > 0 ? setStep(step - 1) : onOpenChange(false))}
          >
            <ArrowLeft size={16} />
            {step > 0 ? "Back" : "Cancel"}
          </button>
          <button
            className="primary"
            disabled={busy}
            form={step === 0 ? "scope-form" : undefined}
            type={step === 0 ? "submit" : "button"}
            onClick={
              step === 0 ? undefined : step === 1 ? () => setStep(2) : save
            }
          >
            {busy ? (
              <>
                <LoaderCircle size={16} className="spin" />
                {step === 0 ? "Collecting evidence…" : "Saving record…"}
              </>
            ) : (
              <>
                {["Collect evidence", "Review case", "Save case record"][step]}
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
