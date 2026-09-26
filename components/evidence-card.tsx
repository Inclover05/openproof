import {
  FileText,
  Boxes,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import type { Evidence } from "@/lib/domain";
export function EvidenceCard({
  evidence: e,
  sample = false,
}: {
  evidence: Evidence;
  sample?: boolean;
}) {
  return (
    <article className="evidence-card">
      <div className="evidence-card-top">
        <span className="evidence-type">
          {e.kind === "source" ? <FileText size={18} /> : <Boxes size={18} />}{" "}
          {e.kind === "source" ? "PUBLIC SOURCE" : "ON-CHAIN OBSERVATION"}
        </span>
        <span
          className={"badge " + (e.status === "readable" ? "green" : "amber")}
        >
          {e.status === "readable" ? (
            <CheckCircle2 size={12} />
          ) : (
            <AlertCircle size={12} />
          )}{" "}
          {sample ? "Sample · " : ""}
          {e.status}
        </span>
      </div>
      <h3>{e.title}</h3>
      <p>{e.detail}</p>
      {e.excerpt ? <blockquote>{e.excerpt}</blockquote> : null}
      {e.value ? (
        <div className="observed">
          <span>Observed value</span>
          <code>{e.value}</code>
        </div>
      ) : null}
      <dl className="evidence-meta">
        {e.chainId ? (
          <>
            <div>
              <dt>Chain ID</dt>
              <dd>{e.chainId}</dd>
            </div>
            <div>
              <dt>Address</dt>
              <dd>
                <code>{e.address}</code>
              </dd>
            </div>
          </>
        ) : null}
        {e.block !== undefined ? (
          <div>
            <dt>Block</dt>
            <dd>
              {e.block.toLocaleString()} {e.timestamp ? "· " + e.timestamp : ""}
            </dd>
          </div>
        ) : null}
        {e.blockHash ? (
          <div>
            <dt>Block hash</dt>
            <dd>
              <code>{e.blockHash}</code>
            </dd>
          </div>
        ) : null}
        {e.hash ? (
          <div>
            <dt>Content SHA-256</dt>
            <dd>
              <code>{e.hash}</code>
            </dd>
          </div>
        ) : null}
        <div>
          <dt>Collected</dt>
          <dd>{e.retrievedAt}</dd>
        </div>
      </dl>
      {sample ? (
        <span className="sample-source">
          Illustrative reference · not a live source
        </span>
      ) : (
        <a
          className="source-link"
          href={e.url}
          target="_blank"
          rel="noreferrer"
        >
          {new URL(e.url).hostname}
          <ExternalLink size={13} />
        </a>
      )}
    </article>
  );
}
