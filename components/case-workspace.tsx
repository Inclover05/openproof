"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  FileCheck2,
  Copy,
  Download,
  Layers,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { EvidenceCard } from "./evidence-card";
import NetworkActions from "./network-actions";
import CaseBuilder from "./case-builder";
import { sampleCase } from "@/lib/samples";
import { question, templates, type CaseRecord } from "@/lib/domain";

export default function CaseWorkspace({ id }: { id: string }) {
  const [record, setRecord] = useState<CaseRecord | null>(() => sampleCase(id)),
    [error, setError] = useState(""),
    [copied, setCopied] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  useEffect(() => {
    if (sampleCase(id)) return;
    const abort = new AbortController();
    fetch("/api/cases/" + id, { signal: abort.signal })
      .then(async (r) => {
        const d = (await r.json()) as { error?: string; record: CaseRecord };
        if (!r.ok) throw new Error(d.error);
        setRecord(d.record);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => abort.abort();
  }, [id]);
  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError(
        "Copy the URL from your browser to share this read-only record.",
      );
    }
  }
  function download() {
    if (!record) return;
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(record, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `openproof-${id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <a href="#main" className="skip-link">Skip to case</a>
      <header className="topbar">
        <Link className="brand" href="/">
          <span className="brand-icon">
            <FileCheck2 size={24} />
          </span>
          OpenProof<span className="beta">BETA</span>
        </Link>
        <Link href="/" className="text-button">
          <ArrowLeft size={16} />
          Back to workspace
        </Link>
        <span className="network-label">Evidence record</span>
      </header>
      <main className="case-main" id="main">
        {error ? (
          <div role="alert" className="form-error">
            {error}
          </div>
        ) : null}
        {!record && !error ? (
          <div className="case-loading">
            <Skeleton className="h-10 w-60" />
            <Skeleton className="h-40 w-full" />
            <p>Loading the evidence record…</p>
          </div>
        ) : record ? (
          <>
            <div className="case-breadcrumb">
              <Link href="/">Workspace</Link>
              <span>/</span>
              <span>{record.sample ? "Sample case" : id.slice(0, 8)}</span>
            </div>
            {record.sample ? (
              <div className="sample-banner">
                <AlertCircle size={16} />
                <span>
                  <b>Illustrative case.</b> Every source, observation, and
                  outcome below is sample data. No network transaction took
                  place.
                </span>
              </div>
            ) : null}
            <div className="case-title">
              <div>
                <span className="eyebrow">
                  {templates[record.input.type].name.toUpperCase()}
                </span>
                <h1>
                  {record.sample
                    ? record.input.type === "control"
                      ? "Ownership, on the record."
                      : record.input.type === "treasury"
                        ? "A promise to lock the treasury."
                        : "The announced upgrade."
                    : "An open evidence record."}
                </h1>
                <p className="case-title-subtitle">
                  {record.sample
                    ? "Illustrative data only. No GenLayer transaction took place."
                    : record.outcome
                      ? "GenLayer assessed this exact question. Inspect the evidence and execution below."
                      : record.txId
                        ? "Submitted to Bradbury. Follow the transaction before drawing a conclusion."
                        : "Saved draft. Review the evidence before choosing whether to submit."}
                </p>
              </div>
              <div className="case-tools">
                {!record.sample ? <button className="secondary" onClick={() => setCorrecting(true)}>Create revised case</button> : null}
                <button onClick={share} className="secondary">
                  <Copy size={15} />
                  {copied ? "Link copied" : "Copy link"}
                </button>
                <button
                  onClick={download}
                  className="secondary"
                  aria-label="Download case JSON"
                >
                  <Download size={16} />
                </button>
              </div>
            </div>
            <div className="case-columns">
              <div className="case-primary">
                <section className="claim-summary">
                  <div className="section-kicker">
                    <span>{record.input.verification === "state" ? "THE CONTRACT STATE ASSERTION" : "THE PUBLIC PROMISE"}</span>
                    <span className="badge neutral">
                      {record.sample ? "Sample" : "User-supplied claim"}
                    </span>
                  </div>
                  <blockquote>“{record.input.claim}”</blockquote>
                  <div className="claim-details">
                    <span>
                      {record.input.chain === "1" ? "Ethereum" : "Base"} · chain{" "}
                      {record.input.chain}
                    </span>
                    <span>
                      Cutoff{" "}
                      {new Date(record.input.cutoff).toLocaleDateString(
                        "en-GB",
                        {
                          timeZone: "UTC",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        },
                      )}{" "}
                      UTC
                    </span>
                  </div>
                </section>
                <div className="question-box">
                  <span className="eyebrow">THE BOUNDED QUESTION</span>
                  <p>{question(record.input)}</p>
                </div>
                <Tabs defaultValue="evidence" className="case-tabs">
                  <TabsList variant="line">
                    <TabsTrigger value="evidence">
                      Evidence{" "}
                      <span className="tab-count">
                        {record.evidence.length}
                      </span>
                    </TabsTrigger>
                    <TabsTrigger value="timeline">Timeline</TabsTrigger>
                    <TabsTrigger value="scope">Scope & limits</TabsTrigger>
                  </TabsList>
                  <TabsContent value="evidence">
                    <div className="evidence-stack">
                      {record.evidence.map((e) => (
                        <EvidenceCard
                          key={e.id}
                          evidence={e}
                          sample={record.sample}
                        />
                      ))}
                    </div>
                  </TabsContent>
                  <TabsContent value="timeline">
                    <div className="timeline">
                      <div>
                        <span className="timeline-dot" />
                        <small>PUBLICATION DATE</small>
                        <h3>Not independently established</h3>
                        <p>
                          Retrieval time does not prove when the promise was
                          first published.
                        </p>
                      </div>
                      {record.evidence
                        .filter((e) => e.timestamp)
                        .map((e) => (
                          <div key={e.id}>
                            <span className="timeline-dot" />
                            <small>{e.timestamp}</small>
                            <h3>Historical contract observation</h3>
                            <p>
                              Block {e.block?.toLocaleString()} · chain{" "}
                              {e.chainId}
                              {record.sample ? " · sample" : ""}
                            </p>
                          </div>
                        ))}
                      <div>
                        <span className="timeline-dot filled" />
                        <small>{record.input.cutoff}</small>
                        <h3>The evidence cutoff</h3>
                        <p>
                          Only observations at or before this point can support
                          the historical state.
                        </p>
                      </div>
                      <div>
                        <span className="timeline-dot" />
                        <small>{record.createdAt}</small>
                        <h3>Record created</h3>
                        <p>
                          {record.sample
                            ? "Illustrative timeline."
                            : "Source and historical chain checks captured."}
                        </p>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="scope">
                    <div className="scope-explanation">
                      <h3>{record.input.verification === "state" ? "Historical contract state" : "Public promise verification"}</h3>
                      <p>{record.input.verification === "state" ? "This case compares a single contract value with the expected value. It does not claim a team made or fulfilled a promise. Any source links are contextual." : "An accessible source must establish the exact dated promise before contract state can support or contradict it. Corroborating sources are separately attributed."}</p>
                      <h3>One field. One point in time.</h3>
                      <p>{templates[record.input.type].hint}</p>
                      <p>
                        Historical state is mapped to a finalized block at or
                        before the cutoff, with the following block after it. A
                        current balance, current owner, or current page is never
                        a substitute.
                      </p>
                      <h3>What this case does not establish</h3>
                      <p>
                        Intent, identity, legal ownership, beneficial control,
                        safety of a token, or whether any person committed
                        wrongdoing. A supported finding would apply only to the
                        specific rubric and independently accessible evidence.
                      </p>
                      <h3>Source correction</h3>
                      <p>
                        Saved drafts preserve the original inputs. Create a
                        corrected case to change the question or source, and
                        retain the prior record for comparison.
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
              <aside className="decision-column">
                <section className="decision-panel">
                  <div className="decision-heading">
                    <ScaleIcon />
                    <span>CASE ASSESSMENT</span>
                  </div>
                  <span
                    className={
                      "badge " +
                      (record.outcome === "Supported"
                        ? "green"
                        : record.outcome
                          ? "amber"
                          : "neutral")
                    }
                  >
                    {record.sample ? "Sample · " : ""}
                    {record.outcome ||
                      (record.txId ? record.state : "Not submitted")}
                  </span>
                  <h2>{record.outcome || "Evidence comes first."}</h2>
                  <p>
                    {record.explanation ||
                      (record.txId
                        ? "The network has not returned a successful decision yet. Evidence alone is not a verdict."
                        : "This draft has not been evaluated by GenLayer. The observations on this page are evidence, not a verdict.")}
                  </p>
                  <div className="decision-rule" />
                  <dl>
                    <div>
                      <dt>Lifecycle</dt>
                      <dd className="capitalize">{record.state}</dd>
                    </div>
                    <div>
                      <dt>Execution</dt>
                      <dd>
                        {record.sample
                          ? "Illustrative only"
                          : record.execution === "FINISHED_WITH_RETURN"
                            ? "Succeeded"
                            : record.execution === "FINISHED_WITH_ERROR"
                              ? "Failed"
                              : "Not executed"}
                      </dd>
                    </div>
                    <div>
                      <dt>Decision network</dt>
                      <dd>Bradbury · 4221</dd>
                    </div>
                    <div>
                      <dt>Transaction</dt>
                      <dd>{record.txId || "None"}</dd>
                    </div>
                    <div>
                      <dt>Appeal</dt>
                      <dd>
                        {record.sample
                          ? "Illustrative only"
                          : record.canAppeal === true
                            ? "Available"
                            : record.canAppeal === false
                              ? "Unavailable"
                              : record.state === "finalized"
                                ? "Closed"
                                : record.txId
                                  ? "Unknown — refresh"
                                  : "Not available"}
                      </dd>
                    </div>
                    {record.appealCharge ? (
                      <div>
                        <dt>Quoted appeal bond</dt>
                        <dd>
                          {(Number(record.appealCharge) / 1e18).toPrecision(5)}{" "}
                          test GEN
                        </dd>
                      </div>
                    ) : null}
                    {record.contract ? (
                      <div>
                        <dt>Intelligent Contract</dt>
                        <dd>
                          <a
                            href={
                              "https://explorer-bradbury.genlayer.com/address/" +
                              record.contract
                            }
                            target="_blank"
                            rel="noreferrer"
                          >
                            {record.contract}
                          </a>
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                  <div className="network-note">
                    <Layers size={16} />
                    <span>
                      {record.sample
                        ? "A sample of the decision display."
                        : record.txId
                          ? "State and execution are checked independently."
                          : "Submit the fixed question to GenLayer for independent assessment."}
                    </span>
                  </div>
                  {!record.sample ? (
                    <NetworkActions record={record} onUpdate={setRecord} />
                  ) : null}
                  {record.decisiveRefs?.length ? (
                    <p className="network-disclaimer">
                      Decisive references: {record.decisiveRefs.join(", ")}
                    </p>
                  ) : null}
                  {record.reasonCode ? (
                    <p className="network-disclaimer">
                      Reason:{" "}
                      {record.reasonCode.replaceAll("_", " ").toLowerCase()}
                    </p>
                  ) : null}
                </section>
                <section className="reading-note">
                  <h3>
                    <ShieldIcon />A transparent record
                  </h3>
                  <p>
                    Every observation keeps its source and collection time.
                    Missing evidence stays visible.
                  </p>
                  <a
                    href="https://docs.genlayer.com/understand-genlayer-protocol/core-concepts/optimistic-democracy"
                    target="_blank"
                    rel="noreferrer"
                  >
                    About validator consensus <ExternalLink size={12} />
                  </a>
                </section>
              </aside>
            </div>
            {correcting ? <CaseBuilder open={correcting} onOpenChange={setCorrecting} initialType={record.input.type} initialClaim={record.input.claim} initialInput={record.input} /> : null}
            <footer>
              <span className="footer-brand">
                <FileCheck2 size={18} />
                OpenProof <span>Evidence before conclusions.</span>
              </span>
              <span>
                {record.sample
                  ? "SAMPLE RECORD"
                  : record.txId
                    ? "TESTNET RECORD"
                    : "DRAFT RECORD"}{" "}
                · No legal determination
              </span>
            </footer>
          </>
        ) : null}
      </main>
    </>
  );
}
function ScaleIcon() {
  return <Layers size={17} />;
}
function ShieldIcon() {
  return <CheckCircle2 size={17} />;
}
