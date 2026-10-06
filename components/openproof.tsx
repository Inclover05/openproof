"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import CaseBuilder from "./case-builder";
import ProjectGuide from "./project-guide";
import type { ClaimType } from "@/lib/domain";
import {
  ArrowUpRight,
  ArrowRight,
  FileCheck2,
  LockKeyhole,
  ShieldCheck,
  GitBranch,
  Plus,
  Search,
  Scale,
  Layers,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function OpenProof() {
  const router = useRouter();
  const [claim, setClaim] = useState("");
  const [mode, setMode] = useState<"promise" | "state">("promise");
  const [scope, setScope] = useState(false);
  const [type, setType] = useState<ClaimType>("control");
  const [method, setMethod] = useState(false);
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: unknown,
            options: { signal: AbortSignal },
          ) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      void Promise.resolve(
        context.registerTool(
          {
            name: "start_case",
            title: "Start a case",
            description:
              "Open the case builder with a public promise. Does not save or submit a transaction.",
            inputSchema: {
              type: "object",
              properties: {
                claim: { type: "string", minLength: 25, maxLength: 1200 },
                template: {
                  type: "string",
                  enum: ["control", "treasury", "upgrade"],
                },
              },
              required: ["claim", "template"],
              additionalProperties: false,
            },
            annotations: { readOnlyHint: false, untrustedContentHint: false },
            execute: async (input: unknown) => {
              const value = input as { claim?: unknown; template?: unknown };
              if (
                typeof value?.claim !== "string" ||
                value.claim.trim().length < 25 ||
                value.claim.length > 1200 ||
                !["control", "treasury", "upgrade"].includes(
                  String(value.template),
                )
              )
                throw new Error(
                  "Provide a 25–1200 character promise and a supported template.",
                );
              setClaim(value.claim);
              setMode("promise");
              setType(value.template as ClaimType);
              setScope(true);
              await new Promise<void>((resolve) =>
                requestAnimationFrame(() => resolve()),
              );
              return { opened: true, saved: false, submitted: false };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => {});
    } catch {}
    return () => lifecycle.abort();
  }, []);
  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="topbar">
        <Link className="brand" href="/">
          <span className="brand-icon">
            <FileCheck2 size={24} />
          </span>
          OpenProof<span className="beta">BETA</span>
        </Link>
        <nav aria-label="Main navigation">
          <Link className="nav-active" href="/">
            Workspace
          </Link>
          <a href="#examples">Explore cases</a>
          <a href="#how-it-works">
            How it works <ArrowUpRight size={14} />
          </a>
        </nav>
        <span className="network-label">
          <span />
          Explore free · Bradbury submission optional
        </span>
      </header>
      <main id="main">
        <section className="intro">
          <div className="eyebrow">
            <span className="small-rule" />
            PUBLIC PROMISES. PUBLIC EVIDENCE.
          </div>
          <h1>Follow the evidence.</h1>
          <p>
            Check a public promise or a historical contract fact.
            <br />
            Start with a precise question. Keep the evidence and its limits in view.
          </p>
        </section>
        <section className="start-grid" aria-label="Start an investigation">
          <div className="claim-panel">
            <div className="section-kicker">
              <span>01 / CHOOSE YOUR QUESTION</span>
              <span>
                No wallet needed <LockKeyhole size={13} />
              </span>
            </div>
            <div className="entry-modes" role="group" aria-label="Choose how to start">
              <button
                type="button"
                className={mode === "promise" ? "selected" : ""}
                aria-pressed={mode === "promise"}
                onClick={() => setMode("promise")}
              >
                Public promise
              </button>
              <button
                type="button"
                className={mode === "state" ? "selected" : ""}
                aria-pressed={mode === "state"}
                onClick={() => setMode("state")}
              >
                Contract state
              </button>
            </div>
            {mode === "promise" ? (
              <>
                <label htmlFor="claim">
                  <h2>What did the project promise?</h2>
                </label>
                <textarea
                  id="claim"
                  value={claim}
                  onChange={(e) => setClaim(e.target.value)}
                  maxLength={1200}
                  placeholder="Example: The team said it would change the contract owner by a stated date."
                />
              </>
            ) : (
              <div className="state-entry">
                <h2>Check one contract fact at a past moment.</h2>
                <p>Compare an owner, unlock time, or implementation address with the value you expected. No public statement is needed.</p>
              </div>
            )}
            <div className="composer-footer">
              <button className="text-button" onClick={() => setMethod(true)}>
                <Plus size={17} /> What will I need?
              </button>
              <button className="primary" onClick={() => setScope(true)}>
                Continue to details <ArrowRight size={17} />
              </button>
            </div>
            <div className="composer-note">
              <ShieldCheck size={15} /> {mode === "promise" ? "Bring a dated public source and the contract you want to check." : "You can build and save this comparison before connecting a wallet."}
            </div>
          </div>
          <aside className="scope-card">
            <div className="scope-icon">
              <FileCheck2 size={35} strokeWidth={1.2} />
            </div>
            <h3>
              One question.
              <br />A clear record.
            </h3>
            <p>
              OpenProof shows the source, historical value, and exact limit of each answer.
            </p>
            <div className="scope-divider" />
            <div className="scope-row">
              <Search size={17} />
              <span>Every fact has a source</span>
            </div>
            <div className="scope-row">
              <Scale size={17} />
              <span>Decisions belong to GenLayer</span>
            </div>
            <button className="text-button" onClick={() => setMethod(true)}>
              Understand the process <ArrowUpRight size={15} />
            </button>
          </aside>
        </section>
        <section className="templates">
          <div className="section-heading">
            <h2>Choose the contract fact.</h2>
            <span>THREE SUPPORTED CHECKS</span>
          </div>
          <div className="template-grid">
            {[
              {
                Icon: LockKeyhole,
                name: "Treasury restrictions",
                text: "Compare the stored unlock time with your expected date.",
                n: "01",
              },
              {
                Icon: ShieldCheck,
                name: "Admin & owner control",
                text: "Compare owner() with an expected address at a cutoff.",
                n: "02",
              },
              {
                Icon: GitBranch,
                name: "Contract changes",
                text: "Compare an EIP-1967 implementation address.",
                n: "03",
              },
            ].map(({ Icon, name, text, n }) => (
              <button
                key={n}
                className="template"
                onClick={() => {
                  setType(
                    n === "01"
                      ? "treasury"
                      : n === "02"
                        ? "control"
                        : "upgrade",
                  );
                  setScope(true);
                }}
              >
                <div className="template-top">
                  <Icon size={21} />
                  <span>{n}</span>
                </div>
                <h3>
                  {name}
                  <ArrowUpRight size={17} />
                </h3>
                <p>{text}</p>
              </button>
            ))}
          </div>
        </section>
        <section className="live-proof" id="examples" aria-label="Cases assessed on Bradbury">
          <div className="live-proof-heading">
            <span className="eyebrow">REAL TESTNET RECORDS</span>
            <h2>See what an assessed case looks like.</h2>
            <p>These Bradbury records show a match, a mismatch, and a source that did not establish the question. Open each one to inspect the evidence, transaction, and limits.</p>
          </div>
          <div className="live-links">
            <Link href="/case/2735f336-d5cf-417c-a267-8f0918455293"><span>01 / SUPPORTED</span><strong>Matching owner</strong><small>The historical value matched.</small><ArrowUpRight size={18}/></Link>
            <Link href="/case/d7ca8a0d-92cd-4d16-b68d-9ba999205c4d"><span>02 / CONTRADICTED</span><strong>Different owner</strong><small>The historical value differed.</small><ArrowUpRight size={18}/></Link>
            <Link href="/case/72f7f19d-e0b1-488f-9ace-a06567b0c37b"><span>03 / INSUFFICIENT</span><strong>Unrelated X source</strong><small>The source did not establish it.</small><ArrowUpRight size={18}/></Link>
          </div>
        </section>
        <section className="examples" id="sample-cases">
          <div className="section-heading">
            <div>
              <h2>Practice with sample records.</h2>
              <p>These fictional examples show how a case page is organised.</p>
            </div>
            <span className="sample-label">SAMPLE DATA</span>
          </div>
          <div className="example-row">
            <span className="case-number">OP / 001</span>
            <div className="example-icon">
              <ShieldCheck />
            </div>
            <div className="example-copy">
              <h3>Ownership renounced by the deadline</h3>
              <p>
                Admin & owner control <span>·</span> Ethereum <span>·</span> Sep
                1, 2026
              </p>
            </div>
            <span className="badge green">Sample · Supported</span>
            <button
              className="circle-button"
              aria-label="Open sample ownership case"
              onClick={() => router.push("/case/sample-control")}
            >
              <ArrowUpRight size={19} />
            </button>
          </div>
          <div className="example-row">
            <span className="case-number">OP / 002</span>
            <div className="example-icon">
              <LockKeyhole />
            </div>
            <div className="example-copy">
              <h3>Treasury locked through the announced date</h3>
              <p>
                Treasury restrictions <span>·</span> Base <span>·</span> Aug 15,
                2026
              </p>
            </div>
            <span className="badge amber">Sample · Insufficient evidence</span>
            <button
              className="circle-button"
              aria-label="Open sample treasury case"
              onClick={() => router.push("/case/sample-treasury")}
            >
              <ArrowUpRight size={19} />
            </button>
          </div>
        </section>
        <ProjectGuide onStart={() => setScope(true)} />
        <footer>
          <span className="footer-brand">
            <FileCheck2 size={18} /> OpenProof{" "}
            <span>Evidence before conclusions.</span>
          </span>
          <span>
            Independent assessment, powered by <b>GenLayer</b>
            <Layers size={15} />
          </span>
        </footer>
      </main>
      <CaseBuilder
        key={String(scope) + type + mode}
        open={scope}
        onOpenChange={setScope}
        initialClaim={mode === "promise" ? claim : ""}
        initialType={type}
        initialVerification={mode}
      />
      <Dialog open={method} onOpenChange={setMethod}>
        <DialogContent>
          <DialogTitle>Evidence before conclusions.</DialogTitle>
          <DialogDescription>
            OpenProof checks a bounded public promise, never someone’s intent.
          </DialogDescription>
          <div className="method-steps">
            <p>
              <b>01 — Scope the promise.</b> Identify the exact contract, field,
              and historical cutoff.
            </p>
            <p>
              <b>02 — Inspect the evidence.</b> Keep source access, factual
              observations, and interpretation separate.
            </p>
            <p>
              <b>03 — Independent assessment.</b> GenLayer validators
              independently assess eligible evidence. Only successful execution
              can produce a case outcome.
            </p>
            <p>
              <b>04 — Keep the record open.</b> Review cited evidence and the
              appeal and finality state.
            </p>
          </div>
          <p className="notice">
            Live testnet submission is available from a saved case with eligible
            evidence. Example outcomes are illustrative.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
