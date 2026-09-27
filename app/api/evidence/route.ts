import { caseSchema } from "@/lib/domain";
import { inspectChain } from "@/lib/evidence";
import { inspectPublicSource } from "@/lib/source-adapters";
import { readBody, limit, database, failure } from "@/lib/server";
export async function POST(request: Request) {
  try {
    const parsed = caseSchema.safeParse(await readBody(request));
    if (!parsed.success)
      return Response.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      );
    await limit(request, "evidence");
    const evidence = await Promise.all([
      ...(parsed.data.source?[inspectPublicSource(parsed.data.source)]:[]),
      ...(parsed.data.corroboratingSource?[inspectPublicSource(parsed.data.corroboratingSource,'source-2')]:[]),
      inspectChain(parsed.data),
    ]);
    const snapshotId = crypto.randomUUID();
    await database()
      .prepare(
        "INSERT INTO evidence_snapshots (id,input,evidence,created_at) VALUES (?,?,?,?)",
      )
      .bind(
        snapshotId,
        JSON.stringify(parsed.data),
        JSON.stringify(evidence),
        Date.now(),
      )
      .run();
    return Response.json(
      { evidence, snapshotId },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
