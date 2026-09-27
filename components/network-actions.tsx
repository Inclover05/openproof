"use client";
import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Wallet, ExternalLink, LoaderCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { readyForSubmission } from "@/lib/protocol";
import type { CaseRecord } from "@/lib/domain";
type Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};
declare global {
  interface Window {
    ethereum?: Provider;
  }
}
export default function NetworkActions({
  record,
  onUpdate,
}: {
  record: CaseRecord;
  onUpdate: (r: CaseRecord) => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [review, setReview] = useState(false),
    [account, setAccount] = useState(""),
    [quote, setQuote] = useState<{
      estimatedGen: string;
      quotedAt: string;
    } | null>(null),
    [pending, setPending] = useState(""),
    [manual, setManual] = useState("");
  const key = "openproof-pending-" + record.id;
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Restore the browser-only recovery token after hydration.
      setPending(localStorage.getItem(key) || "");
    } catch {}
  }, [key]);
  const track = useCallback(
    async (txId?: string) => {
      setBusy(true);
      setError("");
      try {
        const r = await fetch("/api/cases/" + record.id + "/network", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(txId ? { txId } : {}),
        });
        const d = (await r.json()) as { error?: string; record: CaseRecord };
        if (!r.ok) throw new Error(d.error);
        onUpdate(d.record);
        if (d.record.txId) {
          try {
            localStorage.removeItem(key);
          } catch {}
          setPending("");
        }
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "Status is temporarily unavailable. Keep the transaction ID and retry tracking.",
        );
      } finally {
        setBusy(false);
      }
    },
    [record.id, key, onUpdate],
  );
  useEffect(() => {
    if (
      !record.txId ||
      ["finalized", "failed", "undetermined"].includes(record.state)
    )
      return;
    const timer = setInterval(() => void track(), 60000);
    return () => clearInterval(timer);
  }, [record.txId, record.state, track]);
  async function connect() {
    setBusy(true);
    setError("");
    try {
      const provider = window.ethereum;
      if (!provider)
        throw new Error(
          "No browser wallet was found. Use a wallet-enabled browser for signing. Read-only exploration remains available.",
        );
      const addresses = (await provider.request({
        method: "eth_requestAccounts",
      })) as string[];
      if (!addresses[0]) throw new Error("No account selected.");
      const chain = await provider.request({ method: "eth_chainId" });
      if (chain !== "0x107d") {
        try {
          await provider.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0x107d" }],
          });
        } catch (e) {
          if ((e as { code?: number }).code !== 4902) throw e;
          await provider.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: "0x107d",
                chainName: "GenLayer Bradbury Testnet",
                nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
                rpcUrls: ["https://rpc-bradbury.genlayer.com"],
                blockExplorerUrls: ["https://explorer-bradbury.genlayer.com"],
              },
            ],
          });
        }
      }
      if ((await provider.request({ method: "eth_chainId" })) !== "0x107d")
        throw new Error("Select Bradbury testnet before signing.");
      const r = await fetch("/api/cases/" + record.id + "/quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ account: addresses[0] }),
      });
      const q = (await r.json()) as {
        error?: string;
        estimatedGen: string;
        quotedAt: string;
      };
      if (!r.ok) throw new Error(q.error);
      setAccount(addresses[0]);
      setQuote(q);
      setReview(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Wallet connection was declined.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function submit() {
    setBusy(true);
    setError("");
    try {
      if (!quote || Date.now() - Date.parse(quote.quotedAt) > 120000)
        throw new Error(
          "The fee estimate expired. Close this review and request a fresh estimate.",
        );
      if (!window.ethereum) throw new Error("The wallet disconnected.");
      const accounts = (await window.ethereum.request({
        method: "eth_accounts",
      })) as string[];
      if (
        accounts[0]?.toLowerCase() !== account.toLowerCase() ||
        (await window.ethereum.request({ method: "eth_chainId" })) !== "0x107d"
      )
        throw new Error(
          "The selected account or network changed. Reconnect before signing.",
        );
      const [{ createClient }, { testnetBradbury }, { contractFor, payload }] =
        await Promise.all([
          import("genlayer-js"),
          import("genlayer-js/chains"),
          import("@/lib/network"),
        ]);
      const client = createClient({
        chain: testnetBradbury,
        account: account as `0x${string}`,
        provider: window.ethereum as NonNullable<
          Parameters<typeof createClient>[0]
        >["provider"],
      });
      const txId = await client.writeContract({
        address: contractFor(record),
        functionName: "evaluate",
        args: [payload(record)],
        value: BigInt(0),
      });
      if (typeof txId !== "string")
        throw new Error(
          "The wallet did not return a transaction ID. Inspect wallet history before retrying.",
        );
      setPending(txId);
      try {
        localStorage.setItem(key, txId);
      } catch {}
      setReview(false);
      await track(txId);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Submission could not be confirmed. Check wallet history before trying again.",
      );
    } finally {
      setBusy(false);
    }
  }
  const ready = readyForSubmission(record);
  return (
    <div className="network-actions">
      {record.txId ? (
        <>
          <a
            className="source-link"
            href={
              "https://explorer-bradbury.genlayer.com/transactions/" +
              record.txId
            }
            target="_blank"
            rel="noreferrer"
          >
            View network transaction <ExternalLink size={13} />
          </a>
          <button
            className="secondary"
            disabled={busy}
            onClick={() => void track()}
          >
            <RefreshCw size={14} />
            {busy ? "Checking…" : "Refresh network state"}
          </button>
        </>
      ) : pending ? (
        <>
          <p className="notice">
            Transaction sent. Resume tracking; do not submit again.
          </p>
          <code className="pending-id">{pending}</code>
          <button
            className="primary"
            disabled={busy}
            onClick={() => void track(pending)}
          >
            Resume tracking
          </button>
        </>
      ) : (
        <>
          <button
            className="primary"
            disabled={busy || !ready}
            onClick={connect}
          >
            {busy ? (
              <LoaderCircle className="spin" size={15} />
            ) : (
              <Wallet size={15} />
            )}
            Review testnet submission
          </button>
          <p className="network-disclaimer">
            {ready
              ? "A wallet is needed only to submit. Your wallet shows the final fee. If it displays a security warning, stop."
              : "A verified cutoff block is required. Public promise mode also needs a readable source."}
          </p>
          <details className="recover">
            <summary>Already submitted?</summary>
            <label htmlFor="transaction-id">GenLayer transaction ID</label>
            <input
              id="transaction-id"
              value={manual}
              onChange={(e) => setManual(e.target.value.trim())}
              placeholder="0x…"
            />
            <button
              className="secondary"
              disabled={busy || !/^0x[0-9a-fA-F]{64}$/.test(manual)}
              onClick={() => void track(manual)}
            >
              Attach & verify
            </button>
          </details>
        </>
      )}
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <Dialog
        open={review}
        onOpenChange={(v) => {
          if (!busy) setReview(v);
        }}
      >
        <DialogContent>
          <DialogTitle>Submit this exact case</DialogTitle>
          <DialogDescription>
            GenLayer validators independently fetch the evidence. This creates a
            public testnet record.
          </DialogDescription>
          <dl className="review-list">
            <div>
              <dt>Network</dt>
              <dd>Bradbury · 4221</dd>
            </div>
            <div>
              <dt>Estimated gas fee</dt>
              <dd>
                {quote ? Number(quote.estimatedGen).toFixed(7) : "—"} test GEN
              </dd>
            </div>
            <div>
              <dt>Transfer to contract</dt>
              <dd>0 GEN</dd>
            </div>
            <div>
              <dt>Question</dt>
              <dd>{record.input.type}</dd>
            </div>
          </dl>
          <p className="notice">
            The estimate is for network gas and can change. Successful
            submission does not guarantee execution or consensus. The decision
            may be appealed. Confirm the total fee in your wallet.
          </p>
          {error ? (
            <p role="alert" className="form-error">
              {error}
            </p>
          ) : null}
          <button className="primary" onClick={submit} disabled={busy}>
            {busy ? "Waiting for wallet…" : "Confirm in wallet"}
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
