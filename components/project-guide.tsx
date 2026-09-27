"use client";
import { useState } from "react";
import { ArrowRight, CheckCircle2, AlertCircle, Search } from "lucide-react";

const scenarios = [
  {name:"The value matches",outcome:"Supported",icon:CheckCircle2,body:"Imagine we ask whether owner() was the zero address at a particular deadline. The historical value matches. In contract state mode, that supports this exact comparison.",limit:"It does not prove that every admin role was removed, or that the contract is safe."},
  {name:"The value differs",outcome:"Contradicted",icon:AlertCircle,body:"Now imagine owner() returned a different address at that same deadline. The observable value conflicts with the expected value, so the exact comparison is contradicted.",limit:"A mismatch says nothing about anyone’s motives. It is a finding about one field at one time."},
  {name:"A fact is missing",outcome:"Insufficient evidence",icon:Search,body:"Perhaps a Medium page is blocked, a post is unrelated, or the historical RPC cannot return the required value. There is not enough evidence to resolve the question.",limit:"Missing evidence is not evidence that a promise was broken. Keep the gap visible, then improve the case."},
];
export default function ProjectGuide({onStart}:{onStart:()=>void}) {
  const [selected,setSelected]=useState(0);
  const scenario=scenarios[selected];
  const Icon=scenario.icon;
  return <section className="project-guide" id="how-it-works" aria-labelledby="guide-title">
    <div className="section-heading"><div><span className="eyebrow">LET’S WALK THROUGH IT</span><h2 id="guide-title">What can you actually prove?</h2><p>A clear question is the beginning. Evidence decides the rest.</p></div></div>
    <div className="guide-grid">
      <div className="guide-story"><h3>“Did they do what they said?”</h3><p>That is a reasonable question. But a broad promise can hide several different questions. OpenProof helps you choose one contract, one observable field, and one moment in time.</p><p>Have a dated announcement? Choose <b>Public promise</b>. Just want to inspect a historical value? Choose <b>Contract state</b>. You can explore and save a case before connecting a wallet.</p><ol><li><b>Make the question precise.</b> Pick Ethereum or Base, a contract, and a past cutoff.</li><li><b>Look at what we found.</b> Read the source excerpt, access status, and historical block.</li><li><b>Ask for independent assessment.</b> GenLayer validators fetch the evidence themselves and decide under the contract’s rules.</li><li><b>Keep the record.</b> Follow execution, the appeal window, and finality. Share or download the evidence.</li></ol><button className="text-button" onClick={onStart}>Try your own question <ArrowRight size={16}/></button></div>
      <div className="guide-simulator"><span className="eyebrow">INTERACTIVE EXAMPLE · NOT A LIVE VERDICT</span><h3>Change the evidence.</h3><div className="scenario-options" role="group" aria-label="Choose an evidence scenario">{scenarios.map((s,i)=><button key={s.name} aria-pressed={selected===i} className={selected===i?'selected':''} onClick={()=>setSelected(i)}>{s.name}</button>)}</div><div className="scenario-result" aria-live="polite"><Icon size={26}/><h3>{scenario.outcome}</h3><p>{scenario.body}</p><p className="guide-limit">{scenario.limit}</p></div></div>
    </div>
    <div className="guide-faq">
      <details><summary>Can I use a Medium article or an X post?</summary><p>Yes, as a source candidate. Public X post text is requested through X’s official embed endpoint. Medium articles must expose a readable public article body. Deleted posts, login walls, paywalls, images, videos, and whole threads are not treated as verified text. Use “Check link access” first. You can add a separately attributed corroborating source while keeping the original link.</p></details>
      <details><summary>What does GenLayer do that the website does not?</summary><p>The website collects an evidence preview. The Intelligent Contract owns the decision: validators independently retrieve reviewed sources and historical contract state, apply the bounded rubric, and agree on the required result fields. A successful page fetch alone never becomes a verdict.</p></details>
      <details><summary>Why does “readable” not mean “verified”?</summary><p>A readable article may describe a different contract, lack a date, or say nothing about the submitted promise. Public promise mode requires those facts to line up. Contract state mode answers only the exact field comparison and makes no claim that a team promised it.</p></details>
      <details><summary>What will this cost, and what becomes public?</summary><p>Exploring and saving are free. Submitting requires a Bradbury testnet wallet and test GEN for gas. You see a fresh estimate before signing. Shared cases are readable by anyone with the link; testnet submissions are public. Do not include private information. Never ignore a wallet security warning.</p></details>
    </div>
  </section>;
}
