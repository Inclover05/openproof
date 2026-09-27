import { database, failure, limit, readBody } from "@/lib/server";
import { contractFor, client, payload, refresh } from "@/lib/network";
import type { CaseRecord } from "@/lib/domain";
import type { TransactionHash } from "genlayer-js/types";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await limit(request, "network");
    const { id } = await params;
    const row = await database()
      .prepare("SELECT record FROM cases WHERE id=?")
      .bind(id)
      .first<{ record: string }>();
    if (!row)
      return Response.json({ error: "Case not found." }, { status: 404 });
    let record: CaseRecord = JSON.parse(row.record);
    const body = await readBody(request);
    if (body.txId) {
      if (
        typeof body.txId !== "string" ||
        !/^0x[0-9a-fA-F]{64}$/.test(body.txId)
      )
        throw new Error("Enter a valid GenLayer transaction ID.");
      if (record.txId && record.txId !== body.txId)
        throw new Error(
          "A transaction is already attached. Resume it instead of submitting again.",
        );
      const tx = await client.getTransaction({
        hash: body.txId as TransactionHash,
      });
      if (
        (tx.recipient || tx.to_address || "").toLowerCase() !==
        contractFor(record).toLowerCase()
      )
        throw new Error("This transaction targets a different contract.");
      const decoded = tx.txDataDecoded as
        { callData?: Map<string, unknown> } | undefined;
      if (
        decoded?.callData?.get("method") !== "evaluate" ||
        (decoded.callData.get("args") as unknown[])?.[0] !== payload(record)
      )
        throw new Error("The transaction does not contain this exact case.");
      record = {
        ...record,
        txId: body.txId,
        contract: contractFor(record),
        state: "queued",
      };
      // Save the identifier before polling. A timeout must never cause resubmission.
      const saved = await database()
        .prepare("UPDATE cases SET record=? WHERE id=? AND record=?")
        .bind(JSON.stringify(record), id, row.record)
        .run();
      if (saved.meta.changes !== 1)
        throw new Error(
          "This case was updated elsewhere. Refresh to resume tracking.",
        );
    }
    const updated = await refresh(record);
    await database()
      .prepare("UPDATE cases SET record=? WHERE id=? AND record=?")
      .bind(JSON.stringify(updated), id, JSON.stringify(record))
      .run();
    return Response.json(
      { record: updated },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
