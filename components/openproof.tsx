"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import CaseBuilder from "./case-builder";
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
          <button onClick={() => setMethod(true)}>
            How it works <ArrowUpRight size={14} />
          </button>
        </nav>
        <span className="network-label">
          <span />
          Read-only exploration
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
            From what was promised to what happened on-chain.
            <br />
            Ask a precise question. Inspect the sources. See what holds up.
          </p>
        </section>
        <section className="start-grid" aria-label="Start an investigation">
          <div className="claim-panel">
            <div className="section-kicker">
              <span>01 / START WITH A CLAIM</span>
              <span>
                No wallet needed <LockKeyhole size={13} />
              </span>
            </div>
            <label htmlFor="claim">
              <h2>What did the project promise?</h2>
            </label>
            <textarea
              id="claim"
              value={claim}
              onChange={(e) => setClaim(e.target.value)}
              maxLength={1200}
              placeholder={
                "“The team will renounce contract ownership\nby September 1, 2026.”"
              }
            />
            <div className="composer-footer">
              <button className="text-button" onClick={() => setScope(true)}>
                <Plus size={17} /> Add a source or contract
              </button>
              <button className="primary" onClick={() => setScope(true)}>
                Build a case <ArrowRight size={17} />
              </button>
            </div>
            <div className="composer-note">
              <ShieldCheck size={15} /> Start with a public, dated promise.
              We’ll help narrow the question.
            </div>
          </div>
          <aside className="scope-card">
            <div className="scope-icon">
              <FileCheck2 size={35} strokeWidth={1.2} />
            </div>
            <h3>
              A claim. A cutoff.
              <br />A clear record.
            </h3>
            <p>
              OpenProof connects public statements with observable contract
              activity.
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
            <h2>Three questions worth asking.</h2>
            <span>CHOOSE A STARTING POINT</span>
          </div>
          <div className="template-grid">
            {[
              {
                Icon: LockKeyhole,
                name: "Treasury restrictions",
                text: "Were the promised treasury restrictions in place?",
                n: "01",
              },
              {
                Icon: ShieldCheck,
                name: "Admin & owner control",
                text: "Did control change in the way the project said?",
                n: "02",
              },
              {
                Icon: GitBranch,
                name: "Contract changes",
                text: "Did the announced contract change take effect?",
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
        <section className="examples" id="examples">
          <div className="section-heading">
            <div>
              <h2>Open a case. See the whole picture.</h2>
              <p>Illustrative cases, built to show the process.</p>
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
        <section className="live-proof" aria-label="Live testnet verification">
          <div><span className="eyebrow">LIVE ON BRADBURY</span><h2>See an independently assessed case.</h2><p>A deliberately unrelated source returned insufficient evidence, with five validator votes in agreement.</p></div>
          <Link className="secondary" href="/case/1b9b6bcf-4a34-4e60-bd91-b025f8134c07">Inspect the live test <ArrowUpRight size={16}/></Link>
        </section>
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
        key={String(scope) + type}
        open={scope}
        onOpenChange={setScope}
        initialClaim={claim}
        initialType={type}
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
