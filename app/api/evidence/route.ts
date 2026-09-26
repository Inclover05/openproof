import { caseSchema } from "@/lib/domain";
import { inspectChain, inspectSource } from "@/lib/evidence";
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
      inspectSource(parsed.data),
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
